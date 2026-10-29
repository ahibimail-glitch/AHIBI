# Ticketing deployment safety

AHIBI's ticket API uses Express, MongoDB/Mongoose, and Razorpay. The web client is Next.js on Vercel; the API is deployed on Render. This repository does not use Supabase for ticket settlement.

## Code protections

- Standard Event and DailyEvent payment confirmation comes from Razorpay's server API or a signed webhook. Settlement is idempotent per captured payment and ticket index, and booking, inventory, and payment completion writes use one MongoDB transaction.
- Standard Event and DailyEvent captured payments without a complete booking set are reconciled every five minutes. Retries use backoff and escalate persistent failures to an administrator alert.
- The API exposes `/health/ready`. Render should route traffic only to instances that have connected to MongoDB and completed payment index creation.
- On `SIGTERM`, the API stops accepting requests, closes Socket.IO connections, stops the reconciliation timer and waits for an active reconciliation pass, waits for in-flight HTTP work, then disconnects from MongoDB.
- Payment idempotency indexes are additive. Before the first production rollout, run the duplicate-key preflight against the target database using the operator's secure environment:

  ```powershell
  cd server
  npm run preflight:payment-indexes
  ```

  The script reports only duplicate counts. A nonzero result blocks index creation until the data is reviewed and repaired. The application waits for these indexes before becoming ready.

NUSC Home Match and other specialized checkout controllers have separate settlement code. This release's shared settlement and recovery guarantee applies to standard Event and DailyEvent purchases; specialized flows need their own end-to-end acceptance before being described as covered by the same guarantee.

## Hosting settings to verify

These settings live in the hosting accounts and cannot be represented by the current repository configuration.

### Render API

1. In the AHIBI API web service settings, set the HTTP health check path to `/health/ready`.
2. Confirm the service has no attached persistent disk; Render's overlapping zero-downtime rollout is disabled when a persistent disk is attached.
3. Keep the MongoDB deployment on a replica set so Mongoose transactions work.
4. Confirm the old successful deploy remains available as the rollback target.

### Vercel web client

1. Confirm the project is on a plan that includes Skew Protection and that **Automatically expose system environment variables** is enabled.
2. In **Project Settings → Advanced → Skew Protection**, enable it and redeploy the current production build once to activate it.
3. Set the maximum age to cover the longest supported checkout session and keep Vercel deployment retention at least that long.
4. Keep the checkout API calls backward-compatible: Skew Protection pins framework-managed Next.js requests/assets to their deployment, but custom calls to the separate Render API are not pinned to an old API version.

Next.js 14.2 supports Vercel's framework-managed skew handling without a custom `deploymentId` setting. The project-level toggle and deployment retention still need verification in Vercel.

## Required staging acceptance before production

Use an isolated Vercel Preview/staging URL, a separate Render staging service, a dedicated MongoDB replica-set database, and Razorpay **test-mode** keys plus a staging webhook secret. The preview must point `NEXT_PUBLIC_API_URL` at the staging API; configure CORS for the stable preview origin. Do not point this procedure at production payment keys or customer data.

1. Confirm `/health/ready` returns HTTP 200 on the staging API and the staging database is the expected non-production database.
2. Purchase a standard event ticket and a daily-event ticket, including a quantity greater than one. Confirm the customer dashboard shows exactly the purchased number, with usable ticket IDs/QR codes.
3. Complete a test payment and close the checkout browser before the success callback. Confirm the signed webhook issues tickets and the dashboard shows them.
4. Replay the same signed webhook and retry the verification callback. Confirm the same ticket set is returned and no additional bookings or inventory increments appear.
5. With a dedicated test order, disable only the staging webhook, complete the Razorpay test payment, then leave the recovery worker enabled. Confirm tickets appear within five minutes; restore the staging webhook afterward.
6. Start a staging checkout, leave it open through a Vercel preview and Render staging deploy, complete payment from the original page, and verify the order settles once. Confirm the new Render instance only receives traffic after `/health/ready` passes.
7. Exercise the Render rollback in staging and rehearse Vercel rollback against a separate staging project/domain with an already promoted staging deployment. Verify checkout, webhook delivery, and dashboard ticket reads after rollback.

The pull request checks compile the Next.js production build and run server reliability/check-in tests. Require both CI jobs in GitHub branch protection. The staging acceptance above remains a release gate because it uses external provider and hosting environments that are not available to local CI.

## Release and rollback order

1. Run required pull request checks, the index preflight, and staging acceptance.
2. Use controlled production promotion so the backward-compatible Render API is deployed first. Wait for `/health/ready` and verify the API revision. Then promote the Vercel frontend. If either host auto-deploys production on merge, keep both directions API-compatible through the full rollout window because the hosts can deploy independently.
3. Keep old API fields and routes working until all supported frontend sessions have drained. Add database fields and indexes first; deploy code that writes them second; remove obsolete fields only in a later release after old code is retired.
4. If a release fails, roll back Vercel to the previous production deployment first, then roll back the Render API to the previous successful artifact. A code rollback does not reverse MongoDB data or index changes; keep those changes additive and safe for the old version.
5. After rollback, check webhook deliveries, pending/captured payment reconciliation, error alerts, and customer dashboards before resuming releases.
