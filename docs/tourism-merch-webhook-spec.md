# AHIBI → Merchland Paid-Order Webhook — Integration Spec

> For the Merchland / Nagaland Tourism developer. This is the contract AHIBI
> will POST to your backend when a Hornbill-merch order is paid, so you can
> auto-create the order in WooCommerce and issue the GST invoice.
>
> Direction: **AHIBI → your server** (server-to-server). You build the receiver
> endpoint and give us its URL; we configure it and start sending.

---

## 1. What you build

A single HTTPS endpoint, e.g.:
```
POST https://<your-host>/wp-json/api/merch/webhook/order
```
Give us this URL — we store it as `TOURISM_MERCH_WEBHOOK_URL`.

Respond **2xx within 5 seconds** to acknowledge. Do heavy work (Woo order
creation, invoice, email) asynchronously after acking. Any non-2xx or timeout
makes us retry (see §5).

## 2. When we send

- `order.paid` — primary event, sent when payment is confirmed captured/paid.
- `order.refunded`, `order.cancelled` — optional, if/when you want them (say so).

Only orders with `source: "nagaland-tourism"` are sent to you.

## 3. Request headers

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `x-api-key` | the shared key we gave you (same one AHIBI uses on your cart API) |
| `x-ahibi-event` | e.g. `order.paid` |
| `x-ahibi-delivery` | unique delivery UUID (same across retries of one delivery) |
| `x-ahibi-signature` | `sha256=<hex>` — HMAC-SHA256 of the **raw request body** using the shared webhook secret |

## 4. Authentication & signature verification

Two layers — verify **both**:
1. `x-api-key` equals the shared key you configured.
2. `x-ahibi-signature` — recompute `HMAC_SHA256(rawBody, TOURISM_MERCH_WEBHOOK_SECRET)`
   as hex, prefix `sha256=`, and compare (constant-time) to the header.

We'll share the `TOURISM_MERCH_WEBHOOK_SECRET` with you securely (separate from
the api key). Verify against the **raw** body bytes, before any JSON parsing/
re-serialisation, or the hash won't match.

Node example (your side):
```js
const expected = 'sha256=' + crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(rawBody)                 // raw bytes, not parsed JSON
  .digest('hex');
// constant-time compare expected vs req.headers['x-ahibi-signature']
```

## 5. Retries & idempotency

- Retries on non-2xx/timeout: up to 5 attempts with backoff
  (~0s, 1m, 5m, 30m, 2h). `x-ahibi-delivery` is identical across retries of the
  same delivery.
- **You must be idempotent**: dedupe on `order.id` (and/or `payment.paymentId`).
  The same paid order may arrive more than once — create the Woo order only
  once; subsequent deliveries should be acked 2xx and ignored.

## 6. Payload

```jsonc
{
  "event": "order.paid",
  "sentAt": "2026-11-25T14:30:00.000Z",
  "order": {
    "id": "6724ab...",                      // AHIBI order id (stable, unique)
    "source": "nagaland-tourism",
    "sessionId": "8b1a937d...",             // YOUR cart/session id
    "status": "paid",
    "currency": "INR",
    "amounts": {                            // all in rupees, GST-inclusive
      "subtotal": 535,
      "tax": 0,                             // we do NOT add tax (prices incl. GST)
      "shipping": 0,
      "total": 535
    },
    "items": [
      {
        "itemId": "HBF-RNT-RHODO-WHT-M",
        "name": "Hornbill Festival - Classic Round-Neck Tee",
        "sku": "HBF-RNT-RHODO-WHT-M",
        "variant": "Rhododendron Bloom, White, M",
        "hsn": "6109",                      // passed through from your cart
        "gstRate": 0.05,                    // fraction; passed through from your cart
        "quantity": 1,
        "price": 535,                       // per unit, GST-inclusive
        "lineTotal": 535,
        "gst": {                            // computed by us from inclusive price
          "taxableValue": 509.52,
          "gstAmount": 25.48
        }
      }
    ],
    "customer": {
      "name": "...",
      "email": "...",                       // captured at checkout (now mandatory)
      "phone": "..."
    },
    "shippingAddress": {
      "fullName": "...", "phone": "...", "email": "...",
      "addressLine1": "...", "addressLine2": "...",
      "city": "...", "state": "...", "postalCode": "...", "country": "India"
    },
    "payment": {
      "gateway": "razorpay",
      "paymentId": "pay_...",               // unique Razorpay payment id
      "paymentLinkId": "plink_...",
      "gatewayOrderId": "order_...",
      "status": "paid",
      "paidAt": "2026-11-25T14:29:55.000Z"
    }
  }
}
```

Notes:
- `hsn` and `gstRate` are **passed straight through from your cart API** — so
  include them per item in your `GET /api/merch/cart/session/:id` response
  (`hsn` and `gst_rate` as a fraction, e.g. `0.05` / `0.18`). If they're absent,
  we send the item without GST fields and you classify on your side.
- `gst.taxableValue` / `gst.gstAmount` are derived from the GST-inclusive price:
  `taxableValue = lineTotal / (1 + gstRate)`, `gstAmount = lineTotal − taxableValue`.
- **CGST/SGST vs IGST split is yours to decide** at invoice time based on place
  of supply (buyer state vs Merchland's WB registration). We give you the total
  GST per line; you split it on the invoice.

## 7. Unique IDs you can rely on
- `order.id` — AHIBI order, stable and unique → use as your idempotency key / Woo order reference.
- `payment.paymentId` — Razorpay payment id, unique per successful payment.
- `order.sessionId` — your original cart id, to tie back to your cart.

## 8. What we need from you to switch it on
1. Your webhook receiver URL.
2. Confirmation you'll verify `x-api-key` + `x-ahibi-signature`.
3. Confirm you'll add `hsn` + `gst_rate` per item to your cart API response (for exact GST pass-through).
Then we set `TOURISM_MERCH_WEBHOOK_URL` + `TOURISM_MERCH_WEBHOOK_SECRET`, share the secret securely, and enable sending.
