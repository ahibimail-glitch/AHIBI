# Admin manual season pass bookings

The Admin manual booking page supports AHIBI user passes and NUSC RISE member passes. Pass prices are controlled by the server and recorded as total payable amounts:

| Recipient | General | Premium |
| --- | ---: | ---: |
| AHIBI user | ₹3,825.20 | ₹13,500 |
| NUSC RISE member | ₹3,894 | ₹16,225 |

Each paid booking records an offline Cash, Card, or UPI settlement. Complimentary bookings record the Admin supplied reason. Neither path creates a Razorpay payment. Both use the ten fixture inventory and issue one ticket for each fixture.

## Required service configuration

Configure the following on AHIBI's server:

- `NUSC_RISE_INTEGRATION_BASE_URL`: the HTTPS origin for the NUSC Web app.
- `AHIBI_PARTNER_SECRET`: the shared HMAC secret used by NUSC's `verifyAhibiRequest` endpoint verifier.
- `NUSC_RISE_INTEGRATION_KEY_ID`: optional HMAC key identifier; defaults to `ahibi-admin`.
- Keep AHIBI's existing signed NUSC partner API enabled with `NUSC_PARTNER_API_ENABLED=true` and the matching `NUSC_PARTNER_LIVE_KEY_ID` / `NUSC_PARTNER_LIVE_SECRET` credentials.

Configure `AHIBI_PARTNER_SECRET` with the same value on NUSC's Web server. NUSC also needs its existing AHIBI season pass partner configuration enabled (`NUSC_AHIBI_SEASON_PASS_ENABLED`, `NUSC_AHIBI_PARTNER_MODE`, `AHIBI_PARTNER_LIVE_BASE_URL`, `NUSC_PARTNER_LIVE_KEY_ID`, and `NUSC_PARTNER_LIVE_SECRET`) so it can reserve and issue the AHIBI tickets. The live key ID and secret must match the AHIBI NUSC partner API configuration. Keep the test and live partner credentials separate.

The NUSC schema migration for manual orders and ticket ownership is NUSC/supabase/migrations/20261101120000_ahibi_manual_season_passes.sql in the NUSC repository. Apply it to the intended NUSC database before deploying the NUSC application. This implementation does not apply it.

## Release order

1. Configure matching HMAC secrets and the live partner endpoints on both services.
2. Review and apply the NUSC migration to the intended database.
3. Deploy NUSC's signed integration routes and dashboard ticket support.
4. Deploy AHIBI's protected Admin routes and manual booking interface.
5. Run an authorized end-to-end staff booking for each channel and confirm that the member dashboard or AHIBI account shows all ten tickets.

Do not enable the Admin RISE option until the shared HMAC secret, partner credentials, and NUSC migration are ready.
