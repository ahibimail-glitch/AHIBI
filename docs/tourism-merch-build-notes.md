# Nagaland Tourism merch checkout — build notes (what was changed, what you must do)

Status: code complete in the working tree, **not committed, not deployed**.
Server files are syntax-checked (`node --check`). The two React pages are not
build-verified here — run `next build` locally before deploying (see §4).

## Design decision
AHIBI hosts the checkout page. The tourism site redirects the shopper to AHIBI
with a `sessionId`; AHIBI fetches the cart from the tourism backend, shows items
+ price, the shopper **logs into AHIBI on that page** (so there is no cross-site
auth handoff to build), fills shipping, and pays via Razorpay. Everything is
keyed by a `source` string so Hornbill is untouched and future partners are a
config entry.

## 1. Files changed / added

Server (`server/`):
- **NEW** `services/merchPartners.js` — partner registry keyed by `source`
  (`hornbill-merch`, `nagaland-tourism`), all env-driven. Unknown/empty source
  falls back to Hornbill, so existing behaviour is identical.
- `services/hornbillMerchService.js` — now builds the cart HTTP client per
  partner; `fetchCartBySession(sessionId, source)`. No-source call == old
  Hornbill behaviour.
- `controllers/merchController.js` — `getCartBySession` reads `?source=`;
  `createOrder` resolves the partner and sets the Razorpay `description` and
  `callback_url` per partner.
- `index.js` — CORS allowlist now also reads `ADDITIONAL_CORS_ORIGINS`
  (comma-separated) so partner domains are added via env, not code.

Client (`client/`):
- **NEW** `app/tourism-merch-checkout/page.tsx` — the checkout page.
- **NEW** `app/tourism-merch-checkout/success/page.tsx` — Razorpay return page;
  calls `sync-payment` to confirm.

No change to the Razorpay webhook: tourism orders are normal `MerchOrder`s and
are matched by the existing `/api/merch/payments/webhook/razorpay` handler.

## 2. Env vars to set on the AHIBI server (you supply the real values)

```
# --- Nagaland Tourism partner (new) ---
TOURISM_MERCH_API_BASE_URL=https://<tourism-api-host>      # where AHIBI fetches the cart
TOURISM_MERCH_API_KEY=<generate a strong key>              # sent as x-api-key to tourism
# TOURISM_MERCH_AUTH_TOKEN=<optional bearer, only if tourism wants it>
# TOURISM_MERCH_CART_PATH=api/merch/cart/session           # override only if their path differs
# TOURISM_MERCH_PAYMENT_CALLBACK_URL=                       # override only to force a specific return URL
# TOURISM_MERCH_SUCCESS_PATH=/tourism-merch-checkout/success

# --- allow the tourism site's browser origin through CORS ---
ADDITIONAL_CORS_ORIGINS=https://<tourism-site-domain>
```

Give `TOURISM_MERCH_API_KEY` to the tourism developers — it's the `x-api-key`
AHIBI will send them, and they must reject requests without it.

The existing `HORNBILL_MERCH_*`, `RAZORPAY_*`, `FRONTEND_URL`, `JWT_SECRET` are
unchanged and still required.

## 3. The redirect the tourism site uses

```
https://ahibi.in/tourism-merch-checkout?sessionId=<their-cart-session-id>&source=nagaland-tourism
```
(Replace host with your deployed frontend. `source` must be `nagaland-tourism`.)

## 4. Test before going live
1. Server: set the env vars, restart, confirm it boots.
2. Stub the tourism cart API (or use theirs) returning the shape in
   `docs/nagaland-tourism-merch-handoff.md` §2.1.
3. Hit `GET /api/hornbill-merch/cart/session/<id>?source=nagaland-tourism` —
   should return items + totals.
4. Client: `cd client && npm run build` (or `next build`) to confirm the two new
   pages compile. Then open
   `/tourism-merch-checkout?sessionId=<id>&source=nagaland-tourism`, log in,
   and run a Razorpay **test-mode** payment end to end.
5. Confirm the Razorpay webhook (`/api/merch/payments/webhook/razorpay`) marks
   the order `paid` and the confirmation email sends.
6. Regression: run one Hornbill merch checkout to confirm it still works
   (it uses the same code paths with the default source).

## 5. Known limitations / honest notes
- The two React pages were written to match the existing artist-merch checkout
  conventions but were not compiled in this environment — run `next build`.
- `source` values are a fixed registry in `merchPartners.js`. Adding a third
  partner = one more entry + its env vars.
- Hornbill's own checkout UI still lives on the Hornbill site; this build does
  not change it. It keeps working via the default source.
- Pre-existing quirk (not introduced here): the raw-body webhook that verifies
  signatures is `/api/merch/payments/webhook/razorpay` (in `index.js`); the
  route-level `/api/hornbill-merch/webhook/razorpay` would not verify. Point the
  Razorpay dashboard at the former.
