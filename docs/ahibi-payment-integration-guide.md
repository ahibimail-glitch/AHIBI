# AHIBI Payment Gateway — Integration Guide for a New Partner Website

> Audience: the developer of the **new independent website** that needs to take
> payments through the existing **AHIBI** backend, reusing the same Razorpay
> gateway that the Hornbill Music Festival site uses.
>
> Everything below is derived from the AHIBI server/client source
> (`server/` + `client/`), not assumed. Where the source cannot tell us
> something, it is called out explicitly under **Open questions**.

---

## 0. TL;DR

- AHIBI's payment gateway is **Razorpay**. AHIBI never exposes Razorpay
  directly to partners — partners talk to **AHIBI REST endpoints**, and AHIBI
  creates/settles the Razorpay order server-side using its own keys.
- There are **two live checkout patterns** in the code. Pick one:
  - **Pattern A — External cart + Razorpay Payment Link** (this is literally how
    the Hornbill festival site works). AHIBI pulls the cart *from your site* and
    returns a hosted Razorpay payment link to redirect to.
  - **Pattern B — Direct items + Razorpay Checkout SDK** (how the in-app
    "artist merch" checkout works). Your site posts the line items and opens the
    Razorpay popup itself.
- All order-creation and verification endpoints require an **AHIBI user JWT**
  (`Authorization: Bearer <token>`). This is the single biggest dependency —
  see §6.
- Reusing the gateway "as-is" is possible for Pattern B if your products live in
  AHIBI's DB. A **new independent site with its own catalog will require small
  backend changes** in AHIBI (see §8).

---

## 1. System shape (as built)

- Backend: Node/Express, MongoDB (Mongoose), Razorpay SDK.
- Base URL in prod: `https://ahibi.in` (API under `/api`).
- Relevant route mounts (`server/index.js`):
  - `/api/auth`            → authentication (JWT issuer)
  - `/api/payments`        → **core ticket gateway** (`payment.routes.js`)
  - `/api/hornbill-merch`  → **merch checkout** (`merch.routes.js`) ← partner flow
- Razorpay client is created from env `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`
  (`utils/getRazorpayClient.js`, and inline in the controllers).

Data models that back the merch flow:
- `MerchOrder` (`models/ArtistMerch.js`) — the order AHIBI creates and settles.
- `MerchProduct` (`models/MerchProduct.js`) — AHIBI-hosted products (Pattern B).

---

## 2. Pattern A — External cart + Razorpay Payment Link (the Hornbill reference)

This is the exact mechanism the Hornbill Music Festival site uses.

### 2.1 Direction of calls (important)

The integration is **bidirectional**:

```
[Your site]  --(user builds cart, stored server-side under a sessionId)-->  [Your site DB]
[User]       --(redirected to AHIBI with sessionId)-->                      [AHIBI]
[AHIBI]      --GET cart by sessionId (x-api-key)-->                         [Your site API]   <-- you must build this
[AHIBI]      --create Razorpay Payment Link-->                             [Razorpay]
[User]       --redirect to payment link short_url-->                       [Razorpay hosted page]
[Razorpay]   --callback_url (GET) + webhook-->                             [AHIBI]
```

### 2.2 What YOUR site must expose (AHIBI calls this)

AHIBI's `services/hornbillMerchService.js` calls:

```
GET  {HORNBILL_MERCH_API_BASE_URL}/api/merch/cart/session/:sessionId
Headers:
  x-api-key: <HORNBILL_MERCH_API_KEY>            (sent if configured)
  Authorization: Bearer <HORNBILL_MERCH_AUTH_TOKEN>   (sent only if configured)
Timeout: HORNBILL_MERCH_TIMEOUT ms (default 10000)
```

Expected response body — AHIBI reads `data.data || data.cart || data`, then
normalizes items. Minimum shape AHIBI accepts:

```jsonc
{
  "data": {
    "sessionId": "abc123",
    "currency": "INR",
    "notes": "optional free text",
    "items": [
      {
        "id": "sku-or-product-id",     // id | itemId | sku  (falls back to "line-<index>")
        "name": "Festival Tee",         // name | title
        "sku": "TEE-BLK-L",             // optional
        "variant": "Black / L",         // variant | option | size (optional)
        "quantity": 2,                   // coerced to Number, default 1
        "price": 799,                    // price | unitPrice | amount (per unit, major units INR)
        "taxRate": 0.0,                  // taxRate | tax_rate (fraction, e.g. 0.18) optional
        "image": "https://.../tee.png"  // image | thumbnail | thumbnail_url optional
      }
    ]
  }
}
```

Notes derived from `normalizeItems()`:
- `price` is **per-unit, in rupees (major units)** — NOT paise.
- `quantity` and `price` are coerced with `Number(...)`; non-numeric → 1 / 0.
- `items` may be under `items` or `cartItems`.
- An empty/missing payload makes AHIBI throw and return `502`.

### 2.3 AHIBI endpoints your site/user hits

**(a) Preview the cart (optional, for a review screen)**
```
GET /api/hornbill-merch/cart/session/:sessionId
Auth: none
200 → { success, data: { sessionId, currency, items[], notes, totals, fetchedAt } }
```
`totals` are computed by AHIBI (see §5).

**(b) Create the order + payment link** ← the checkout trigger
```
POST /api/hornbill-merch/orders
Auth: REQUIRED — Authorization: Bearer <AHIBI user JWT>
Content-Type: application/json
Body:
{
  "sessionId":  "abc123",              // string, REQUIRED
  "shippingAddress": { ...see §4... }, // object, REQUIRED, validated
  "source":     "newsite-merch",       // string, optional (default "hornbill-merch")
  "metadata":   { "any": "json" }      // object, optional
}
```
On success AHIBI:
1. re-fetches your cart by `sessionId`,
2. computes totals,
3. creates a Razorpay **Payment Link** (`razorpay.paymentLink.create`) with
   `amount = round(total * 100)` paise, the customer block, and `notes`
   (`merchOrderId`, `sessionId`, `source`, `userId`),
4. sets `callback_url` (see §2.4) with `callback_method: "get"`.

Response:
```jsonc
201 {
  "success": true,
  "message": "Merch order created",
  "data": {
    "orderId": "<MerchOrder _id>",
    "paymentLink": "https://rzp.io/i/xxxx",   // short_url — REDIRECT the user here
    "paymentLinkId": "plink_xxx",
    "paymentStatus": "created",
    "totals": { "subtotal", "tax", "shipping", "total" },
    "accessToken": "<hex>"                     // keep this to read the order as a guest
  }
}
```
→ **Redirect the browser to `data.paymentLink`.**

### 2.4 Return / callback handling

- The Razorpay payment link `callback_url` is, in order of precedence:
  1. `process.env.HORNBILL_MERCH_PAYMENT_CALLBACK_URL` (single global value), else
  2. `${FRONTEND_URL || 'https://ahibi.in'}/HornbillFestival2025/merch/success?orderId=<id>&accessToken=<token>`
- Razorpay calls it with **GET**, appending `razorpay_payment_id`,
  `razorpay_payment_link_id`, `razorpay_payment_link_status`,
  `razorpay_signature`, etc.
- Your success page should then confirm status by calling:

```
POST /api/hornbill-merch/orders/:orderId/sync-payment
Auth: none
Body (all optional — AHIBI prefers live Razorpay status over these):
{ "paymentLinkId": "plink_xxx", "paymentId": "pay_xxx", "paymentStatus": "paid" }
200 → { success, data: <order> }   // order.status becomes "paid" once Razorpay confirms
```
`sync-payment` re-fetches the link/payment from Razorpay and only marks the
order `paid` when Razorpay itself reports `paid`/`captured` — so it is safe to
call from an unauthenticated return page.

- **Failure:** the payment link simply isn't paid; the order stays `pending`.
  There is no separate failure redirect in this flow — treat "not paid" as the
  failure state and let the user retry via the same link.

### 2.5 Reading an order back (guest-safe)
```
GET /api/hornbill-merch/orders/:orderId?accessToken=<token>
   (or header  x-merch-access-token: <token>)
Auth: optional (JWT owner/admin also allowed)
```

### 2.6 Webhook (server-to-server source of truth)
See §7 — same for both patterns.

---

## 3. Pattern B — Direct items + Razorpay Checkout SDK (artist-merch reference)

Use this if your products are registered inside AHIBI (`MerchProduct`) and you
want the inline Razorpay popup instead of a redirect. The in-repo reference is
`client/app/artist/profile/[artistId]/merch/cart/checkout/page.tsx`.

**(a) Create the order**
```
POST /api/hornbill-merch/orders/checkout
Auth: REQUIRED — Authorization: Bearer <AHIBI user JWT>
Body:
{
  "items": [
    { "productId": "<AHIBI MerchProduct _id>",  // REQUIRED, must exist & be active
      "quantity": 2,                              // REQUIRED, > 0
      "size": "L",                                // optional → folded into variant
      "color": "Black",                           // optional → folded into variant
      "sku": "TEE-BLK-L" }                         // optional
  ],
  "shippingAddress": { ...see §4... },            // REQUIRED, validated
  "source": "newsite-merch",                       // optional (default "artist-merch")
  "metadata": { "any": "json" }                    // optional
}
```
AHIBI looks up each `productId` in `MerchProduct` (must be `isActive:true`,
`isDraft:false`), **prices from the DB (ignores any client price)**, computes
totals, and creates a Razorpay **Order** (`razorpay.orders.create`).

Response:
```jsonc
201 {
  "success": true,
  "data": {
    "merchOrderId": "<MerchOrder _id>",
    "razorpayOrder": { "id": "order_xxx", "amount": 159800, "currency": "INR" }, // amount in paise
    "totals": { "subtotal", "tax", "shipping", "total" }
  }
}
```

**(b) Open Razorpay Checkout** (browser)
```js
const options = {
  key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,   // Razorpay KEY ID (public)
  amount: data.razorpayOrder.amount,              // paise
  currency: data.razorpayOrder.currency,
  name: "Ahibi Merch",
  description: "Merchandise Checkout",
  order_id: data.razorpayOrder.id,
  prefill: { name, email, contact },
  handler: (response) => { /* verify, see (c) */ },
};
new window.Razorpay(options).open();
// script: https://checkout.razorpay.com/v1/checkout.js
```

**(c) Verify the payment**
```
POST /api/hornbill-merch/orders/verify-payment
Auth: REQUIRED — same Bearer JWT used in (a)
Body:
{
  "merchOrderId":       "<from step a>",
  "razorpay_order_id":  response.razorpay_order_id,
  "razorpay_payment_id":response.razorpay_payment_id,
  "razorpay_signature": response.razorpay_signature
}
200 → { success, message, data: <order> }   // order.status → "paid"
```
AHIBI verifies `HMAC_SHA256("{order_id}|{payment_id}", RAZORPAY_KEY_SECRET)`
equals `razorpay_signature`, checks the order belongs to the caller
(`order.user === req.user`), fetches the payment from Razorpay, and marks the
order paid when `status` is `captured` or `authorized`.

---

## 4. Shipping address contract (both patterns)

Validated by `validateShippingAddress()` and stored on `MerchOrder`:

| Field        | Type   | Required | Rule / notes                                  |
|--------------|--------|----------|-----------------------------------------------|
| fullName     | string | yes      | non-empty                                     |
| phone        | string | yes      | matches `^\+?[0-9]{10,15}$`                    |
| addressLine1 | string | yes      | non-empty                                     |
| addressLine2 | string | no       | —                                             |
| city         | string | yes      | non-empty                                     |
| state        | string | yes      | non-empty                                     |
| postalCode   | string | yes      | non-empty                                     |
| country      | string | yes      | non-empty                                     |
| email        | string | no       | not validated here; used for prefill/receipt  |

Invalid address → `400 { success:false, message:"Invalid shipping address", errors:{...} }`.

---

## 5. How AHIBI computes the amount (do not compute it yourself)

From `computeTotals()` (`merchController.js`):

```
subtotal = Σ (price × quantity)                         // major units (INR)
tax      = Σ (price × quantity × taxRate)               // taxRate per item, else HORNBILL_MERCH_TAX_RATE (default 0)
shipping = (subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD) ? 0 : STANDARD_SHIPPING_FEE
total    = subtotal + tax + shipping
amountToRazorpay (paise) = round(total × 100)
```
- `HORNBILL_MERCH_FREE_SHIPPING` default **3000**, `HORNBILL_MERCH_SHIPPING_FEE`
  default **0** → effectively free shipping today.
- Only **INR** is supported in practice.
- The server is the source of truth for the amount; your site should display
  `totals` from the response, not its own total.

---

## 6. Authentication (the critical dependency)

- `POST /orders`, `POST /orders/checkout`, and `POST /orders/verify-payment` are
  behind `protect` (`middlewares/auth.js`): they require
  `Authorization: Bearer <JWT>` where the JWT is signed with AHIBI's
  `JWT_SECRET` and resolves to an AHIBI account (default model `User`).
- `verify-payment` additionally enforces **ownership**: the order's `user` must
  equal the caller — so the *same* JWT used to create the order must verify it.
- `GET /cart/session/:id`, `sync-payment`, and the webhook are **not** behind
  `protect`. `GET /orders/:id` uses `optionalAuth` + `accessToken`.

Implication for a new site: your users must become AHIBI users and obtain an
AHIBI JWT (via `/api/auth`). How the Hornbill site performs that login handoff
is **not in this repo** (the Hornbill frontend is a separate codebase) — confirm
with the AHIBI team. Options are typically: (a) redirect to AHIBI's `/auth`
and come back, or (b) a dedicated partner-auth/token issuance. Do not invent a
scheme; ask.

---

## 7. Razorpay webhook (authoritative settlement)

- Signature header: `x-razorpay-signature` = `HMAC_SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)`.
- The webhook that actually works for merch is registered with a **raw-body**
  parser in `server/index.js`:
  ```
  POST /api/merch/payments/webhook/razorpay
  ```
  (It must receive the raw body; the JSON-parsed route
  `POST /api/hornbill-merch/webhook/razorpay` will fail signature verification —
  see §8 gotchas.)
- Handled events / states: `payment_link.paid`, `payment.captured`, or a payment
  entity status of `paid`/`captured` → order marked `paid`; a confirmation email
  is sent once.
- Order lookup is by `payment.paymentLinkId`, `payment.gatewayOrderId`, or
  `notes.merchOrderId` — all of which AHIBI sets at creation, so no action
  needed from your side beyond configuring the webhook in the Razorpay dashboard.

---

## 8. Already-supported vs. needs-backend-change

### Already works today (no AHIBI change)
- The entire Razorpay create → pay → verify/sync → webhook machinery.
- **Pattern B** for any product that exists in AHIBI's `MerchProduct` collection,
  from any authenticated AHIBI user. `source`/`metadata` are free-form, so you
  can tag your site's orders (e.g. `source: "newsite-merch"`).

### Will require AHIBI backend changes for a new independent site
1. **External cart fetch is hardcoded to Hornbill.**
   `hornbillMerchService.js` reads a single `HORNBILL_MERCH_API_BASE_URL` +
   single `HORNBILL_MERCH_API_KEY`. Pattern A for a *second* source needs either
   a new per-partner service/config or a generalized "source → cart provider"
   resolver.
2. **CORS allowlist is hardcoded** (`index.js`: `ahibi.in`, `www.ahibi.in`,
   `localhost:3000`, the Vercel hosts, plus `FRONTEND_URL`). Browser calls from
   the new site's origin will be blocked until its origin is added.
3. **Payment-link `callback_url` default is hardcoded** to
   `/HornbillFestival2025/merch/success`. There is one global override
   (`HORNBILL_MERCH_PAYMENT_CALLBACK_URL`) — not per-site. A per-site return URL
   needs a code change (e.g. derive from `source` or accept a whitelisted
   `returnUrl` in the request).
4. **Catalog location (Pattern B).** Products must be seeded into AHIBI as
   `MerchProduct` docs (each has an `artist` owner). If the new site owns its own
   catalog and you don't want to duplicate it into AHIBI, use Pattern A instead
   (and do #1).
5. **Auth handoff** (see §6) — mechanism to turn your users into AHIBI JWTs is
   not defined in this repo.

---

## 9. Recommendation for the new site

- If the new site has **its own product catalog and cart**, mirror Hornbill:
  implement **Pattern A** and ask AHIBI to (a) add a partner cart provider +
  env for your base URL/API key, (b) whitelist your origin in CORS, (c) make the
  payment-link `callback_url` point at your return page. Your build work:
  the `GET /api/merch/cart/session/:sessionId` endpoint (§2.2), a checkout button
  that calls `POST /api/hornbill-merch/orders` with the user's AHIBI JWT, and a
  return page that calls `sync-payment`.
- If the new site's products can live **inside AHIBI**, use **Pattern B** — it
  works today with only a CORS origin addition; no new cart API to build.

Either way, confirm the **auth handoff** (§6) first — it blocks both patterns.

---

## 10. Open questions / cannot be derived from this repo

1. **Auth handoff**: how a partner-site user obtains an AHIBI JWT. Not present
   (Hornbill frontend is a separate repo).
2. **Secrets/real values**: `RAZORPAY_KEY_ID`, `HORNBILL_MERCH_API_BASE_URL`,
   `HORNBILL_MERCH_API_KEY`, `HORNBILL_MERCH_PAYMENT_CALLBACK_URL`, the webhook
   secret — not in the repo (correctly). Get them from the AHIBI team.
3. **The Hornbill cart API's exact response** is only known from the *consumer*
   side (what AHIBI reads). Confirm the real producer shape with the Hornbill/
   AHIBI team if you want byte-for-byte parity.
4. **The `/HornbillFestival2025/merch/success` page** was not found in
   `client/app` — it may live on the Hornbill site or be routed elsewhere.
   Confirm where the return page is hosted.
5. **Webhook route duplication**: `/api/merch/payments/webhook/razorpay`
   (raw-body, works) vs `/api/hornbill-merch/webhook/razorpay` (JSON-parsed,
   signature will not match). Confirm which URL is set in the Razorpay dashboard.

---

## Appendix A — Environment variables referenced by the flow

| Variable                            | Used for                                         |
|-------------------------------------|--------------------------------------------------|
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | AHIBI's Razorpay credentials                |
| `RAZORPAY_WEBHOOK_SECRET`           | Verifies webhook `x-razorpay-signature`          |
| `JWT_SECRET`                        | Signs/verifies the user Bearer token             |
| `FRONTEND_URL`                      | Default callback host; also added to CORS        |
| `HORNBILL_MERCH_API_BASE_URL`       | Where AHIBI fetches the external cart            |
| `HORNBILL_MERCH_API_KEY`            | `x-api-key` sent to the external cart API        |
| `HORNBILL_MERCH_AUTH_TOKEN`         | optional `Bearer` sent to the external cart API  |
| `HORNBILL_MERCH_TIMEOUT`            | external cart fetch timeout (ms, default 10000)  |
| `HORNBILL_MERCH_TAX_RATE`           | default tax fraction (default 0)                 |
| `HORNBILL_MERCH_FREE_SHIPPING`      | free-shipping threshold (default 3000)           |
| `HORNBILL_MERCH_SHIPPING_FEE`       | flat shipping fee below threshold (default 0)    |
| `HORNBILL_MERCH_PAYMENT_CALLBACK_URL` | global payment-link return URL override        |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`       | client-side Razorpay key for the Checkout popup  |

## Appendix B — Endpoint quick reference

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET  | `/api/hornbill-merch/cart/session/:sessionId` | none | Preview normalized cart + totals (Pattern A) |
| POST | `/api/hornbill-merch/orders` | Bearer JWT | Create order + Razorpay **payment link** (Pattern A) |
| POST | `/api/hornbill-merch/orders/checkout` | Bearer JWT | Create order + Razorpay **order** for SDK (Pattern B) |
| POST | `/api/hornbill-merch/orders/verify-payment` | Bearer JWT | Verify SDK signature, mark paid (Pattern B) |
| POST | `/api/hornbill-merch/orders/:orderId/sync-payment` | none | Reconcile from return page (Pattern A) |
| GET  | `/api/hornbill-merch/orders/:orderId` | optional + accessToken | Read order |
| POST | `/api/merch/payments/webhook/razorpay` | signature | Razorpay webhook (authoritative) |
