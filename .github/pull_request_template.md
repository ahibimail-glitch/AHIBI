## Ticketing release checks

- [ ] Payment, webhook, and ticket changes pass the required CI checks.
- [ ] Full checkout passed in the isolated staging environment with Razorpay test credentials.
- [ ] A captured payment was issued with the browser closed; replaying its webhook/callback produced no extra tickets.
- [ ] The scheduled recovery path was verified for a captured payment without tickets.
- [ ] A deployment was exercised while a staging checkout was open, and the old checkout completed successfully.
- [ ] Mongo changes are additive and compatible with the currently deployed API; the payment index preflight passed if new unique indexes are added.
- [ ] Rollback target and operator are recorded in the release notes.
