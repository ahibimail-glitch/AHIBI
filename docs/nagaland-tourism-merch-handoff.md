# Nagaland Tourism × AHIBI Merch Checkout — Developer Handoff

> What the **Nagaland Tourism** website developers build, and what the **AHIBI**
> team must do first. Flow: tourism site lists merch (size/color/qty set by
> tourism) → user clicks checkout → lands on AHIBI → AHIBI shows the selected
> items + price → payment happens on AHIBI (Razorpay).
>
> This mirrors the existing Hornbill Music Festival integration. Derived from the
> AHIBI codebase.

---

## 1. How the handoff works (the model)

AHIBI does **not** receive the cart in the redirect. Instead:

1. Tourism site stores the user's cart on **its own backend**, under a unique
   `sessionId`.
2. Tourism site redirects the user to the AHIBI checkout URL, passing that
   `sessionId`.
3. AHIBI calls **back to the tourism backend** to fetch the cart for that
   `sessionId` (server-to-server, with an API key), and renders the items +
   price on AHIBI's checkout page.
4. User pays on AHIBI via Razorpay. AHIBI owns the order, payment, email, and
   webhook.

```
Tourism site (catalog + cart)         AHIBI                         Razorpay
  | user builds cart                    |                              |
  | store cart under sessionId          |                              |
  | redirect -> AHIBI checkout?sessionId |                              |
  |                        AHIBI GET cart/session/:sessionId (x-api-key)|
  |  <----------- server-to-server ------|                              |
  |                        show items+price, collect shipping           |
  |                        create Razorpay order/payment --------------> |
  |                        user pays <--------------------------------- |
  |                        webhook / verify, mark paid                   |
```

So the tourism developers must build **one API endpoint** (the cart lookup) and
**one redirect**. Everything else is AHIBI's.

---

## 2. What the TOURISM developers build

### 2.1 A cart-by-session API (AHIBI calls this)

```
GET  https://<tourism-api-host>/api/merch/cart/session/:sessionId
```
- Must accept header `x-api-key: <key AHIBI will send>` and reject requests
  without the correct key (401/403).
- Must return the cart for that `sessionId`.
- Called server-to-server by AHIBI (not the browser), with a ~10s timeout.

**Response body (exact shape AHIBI parses):**
```jsonc
{
  "data": {
    "sessionId": "tour_abc123",
    "currency": "INR",
    "notes": "optional note shown on order",
    "items": [
      {
        "id": "prod-001",            // unique line/product id (id | itemId | sku)
        "name": "Hornbill Shawl",     // product name (name | title)
        "sku": "SHAWL-RED-M",         // optional
        "variant": "Red / M",         // size/color combined (variant | option | size)
        "quantity": 2,                 // integer >= 1
        "price": 1200,                 // PER-UNIT price in rupees (NOT paise)
        "taxRate": 0,                  // fraction e.g. 0.18, optional (default 0)
        "image": "https://.../shawl.png" // optional
      }
    ]
  }
}
```
Rules (from AHIBI's `normalizeItems` / `computeTotals`):
- `price` is **per unit, in rupees (major units)**. AHIBI multiplies and
  converts to paise itself. Do not send paise.
- `variant` is how size/color reach AHIBI — combine them, e.g. `"Red / M"`.
- AHIBI computes subtotal/tax/shipping/total server-side; the tourism site
  should display its own prices but AHIBI's total is authoritative.
- Empty/missing `items` → AHIBI returns an error; don't hand off an empty cart.

### 2.2 Create + store a sessionId

- Generate a unique `sessionId` per cart (any opaque string).
- Persist the cart server-side keyed by that id, until payment completes (keep it
  readable for at least the checkout window; AHIBI may fetch it more than once).

### 2.3 Redirect to AHIBI at checkout

- Send the user to the AHIBI tourism-merch checkout URL with the `sessionId`.
  **The exact URL is owned by the AHIBI team** (see §3). It will look like:
  ```
  https://ahibi.in/<tourism-checkout-path>?sessionId=tour_abc123
  ```
- **Login:** AHIBI's order creation requires the user to be a logged-in AHIBI
  user. Unless the AHIBI team provides a silent auth handoff, the user will be
  asked to sign in / sign up on AHIBI at checkout. Confirm this UX with AHIBI
  (see §4) before building the button.

### 2.4 Return handling

- After payment, AHIBI (not the tourism site) shows the success/receipt and
  sends the confirmation email.
- If the tourism site wants users back on a tourism "thank you" page, give the
  AHIBI team that return URL — AHIBI sets it as the Razorpay callback. Without
  it, users land on an AHIBI success page.

**That is the full tourism-side build: one GET endpoint, a sessionId store, and
a redirect.**

---

## 3. What the AHIBI team must do (prerequisites — tourism is blocked until these exist)

The current code is wired to a **single** external partner (Hornbill), so
tourism cannot be added by config alone. AHIBI must:

1. **Add tourism as a second cart source.** Today the external cart fetch reads
   one global `HORNBILL_MERCH_API_BASE_URL` + one `HORNBILL_MERCH_API_KEY`
   (`services/hornbillMerchService.js`). Running tourism *alongside* Hornbill
   needs a per-source resolver (base URL + API key chosen by `source`/path).
2. **Issue an API key** for the tourism site (the `x-api-key` value AHIBI will
   send to the tourism cart API).
3. **Add the tourism site's origin to CORS** (`server/index.js` allowlist is
   hardcoded).
4. **Provide the tourism checkout route/page** on AHIBI that reads
   `GET /api/hornbill-merch/cart/session/:sessionId`, shows items + price,
   collects shipping, and creates the order.
5. **Set the return/callback URL** for tourism (per-site; currently a single
   global `HORNBILL_MERCH_PAYMENT_CALLBACK_URL`).
6. **Decide the auth handoff** (see §4).
7. Point the Razorpay webhook at the working endpoint
   `POST /api/merch/payments/webhook/razorpay`.

Until #1–#6 are done, the tourism endpoint + redirect have nothing to talk to.

---

## 4. The one thing to resolve first: user login

Every AHIBI order-creation call requires an AHIBI user token
(`Authorization: Bearer <JWT>`), and the code is not in this repo for how a
partner site's user obtains that token. Two viable UX choices — **AHIBI team to
decide**:
- **(a) Login on AHIBI:** user is sent to AHIBI, signs in / registers there, and
  the cart (via `sessionId`) is waiting. Simplest; no tourism auth work.
- **(b) Auth handoff:** AHIBI issues a token/SSO so the user isn't re-prompted.
  More work on AHIBI; nothing for tourism beyond the redirect.

Pick this before the tourism devs wire the checkout button, because it changes
what the redirect looks like.

---

## 5. Alternative (avoids a tourism-hosted API)

If instead the merch catalog is **created inside AHIBI** (AHIBI admin adds the
products, sizes, colors), the tourism site can skip the cart API entirely and
use AHIBI product IDs + the Razorpay Checkout SDK flow
(`POST /api/hornbill-merch/orders/checkout`). Trade-off: tourism no longer owns
the catalog — AHIBI does. Only worth it if tourism is fine managing merch from
AHIBI's side. Given the brief ("as set by the tourism developers"), the §1–§2
external-cart model is the better fit.

---

## 6. Checklist

Tourism devs:
- [ ] `GET /api/merch/cart/session/:sessionId` returning the §2.1 shape, guarded by `x-api-key`
- [ ] sessionId generation + server-side cart store
- [ ] checkout redirect to the AHIBI URL with `?sessionId=...`
- [ ] (optional) a tourism "thank you" return URL to give AHIBI

AHIBI team:
- [ ] per-source cart resolver (tourism base URL + API key) alongside Hornbill
- [ ] issue tourism `x-api-key`
- [ ] CORS origin for the tourism domain
- [ ] tourism checkout page/route on AHIBI
- [ ] tourism callback/return URL
- [ ] auth handoff decision (§4)
- [ ] Razorpay webhook → `/api/merch/payments/webhook/razorpay`

See `docs/ahibi-payment-integration-guide.md` for the full endpoint reference,
payloads, signature verification, and totals math.
