# NUSC vs Chanmari FC reschedule

The fixture moves from 6 February 2027 to 7 December 2026 at 6:30 PM IST. The server fixture array deliberately keeps its existing position so season-pass ticket indexes and stored event-ID mappings remain stable. The public schedule sorts a separate copy by date.

Before releasing the new schedule, migrate the existing Chanmari Event in place. Do not create a second Event: bookings refer to its MongoDB ID. The migration also updates booking snapshots, NUSC order snapshots and date lists, and date-keyed inventory including general-zone sales and capacity overrides.

1. Pause NUSC ticket sales and take the normal database backup/snapshot.
2. From `server`, run `node scripts/rescheduleNuscChanmariDate.js` and review the dry-run counts and target event details.
3. Apply the migration only in the approved database window. The `ahibi` database requires the explicit `--allow-production` flag.
4. Deploy the matching server and client schedule, confirm the Chanmari listing and ticket availability, then reopen sales.

The migration script is read-only by default. It uses a MongoDB transaction when run with `--apply`; it does not change payment amounts, payment statuses, booking IDs, event ticket sold counts, or season-pass match indexes. Existing emailed or downloaded ticket copies cannot be changed by this migration, so notify affected ticket holders if tickets were already sent.
