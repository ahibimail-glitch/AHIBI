const mongoose = require('mongoose');

/**
 * One-time maintenance endpoint: rewrite an old Vercel Blob storage host to a
 * new one across EVERY collection in the database.
 *
 * Why this exists: when a Vercel Blob store is replaced/migrated, the files move
 * but the URLs saved in MongoDB still point at the old host, so images/videos 404.
 * This walks every document in every collection and replaces the old host
 * substring with the new host wherever it appears in a string value (including
 * nested objects and arrays like galleries), preserving all other field types.
 *
 * Admin-gated. Supports a dry run that only counts what WOULD change.
 *
 * POST /api/maintenance/blob-host
 *   body: { oldHost?, newHost?, dryRun?: boolean, collections?: string[] }
 */

const DEFAULT_OLD_HOST = 'ld9yt1pcwrcddoux.public.blob.vercel-storage.com';
const DEFAULT_NEW_HOST = 'mh0bzq7bd8ixudgn.public.blob.vercel-storage.com';

// Recursively replace `oldHost` with `newHost` in every string leaf.
// Mutates plain objects/arrays in place; leaves ObjectId, Date, Buffer,
// Decimal128, numbers, booleans, null untouched. Returns number of string
// values changed.
function deepReplace(value, oldHost, newHost, counter) {
  if (typeof value === 'string') {
    return value; // strings handled by their container (so we can reassign)
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const v = value[i];
      if (typeof v === 'string') {
        if (v.includes(oldHost)) {
          value[i] = v.split(oldHost).join(newHost);
          counter.n += 1;
        }
      } else {
        deepReplace(v, oldHost, newHost, counter);
      }
    }
    return value;
  }
  // Only recurse into plain objects — skip BSON/special types.
  if (value && typeof value === 'object' && (value.constructor === Object || Object.getPrototypeOf(value) === Object.prototype)) {
    for (const key of Object.keys(value)) {
      const v = value[key];
      if (typeof v === 'string') {
        if (v.includes(oldHost)) {
          value[key] = v.split(oldHost).join(newHost);
          counter.n += 1;
        }
      } else {
        deepReplace(v, oldHost, newHost, counter);
      }
    }
  }
  return value;
}

exports.migrateBlobHost = async (req, res) => {
  const oldHost = (req.body && req.body.oldHost) || DEFAULT_OLD_HOST;
  const newHost = (req.body && req.body.newHost) || DEFAULT_NEW_HOST;
  const dryRun = !!(req.body && req.body.dryRun);
  const only = Array.isArray(req.body && req.body.collections) ? req.body.collections : null;

  if (!oldHost || !newHost) {
    return res.status(400).json({ success: false, message: 'oldHost and newHost are required.' });
  }
  if (oldHost === newHost) {
    return res.status(400).json({ success: false, message: 'oldHost and newHost are identical; nothing to do.' });
  }

  try {
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ success: false, message: 'Database connection not ready.' });
    }

    const allCollections = await db.listCollections().toArray();
    const names = allCollections
      .map((c) => c.name)
      .filter((n) => !n.startsWith('system.'))
      .filter((n) => (only ? only.includes(n) : true));

    const report = [];
    let totalDocsChanged = 0;
    let totalStringsChanged = 0;

    for (const name of names) {
      const coll = db.collection(name);
      const cursor = coll.find({});
      let docsChanged = 0;
      let stringsChanged = 0;
      let bulk = [];

      // iterate
      // eslint-disable-next-line no-await-in-loop
      while (await cursor.hasNext()) {
        // eslint-disable-next-line no-await-in-loop
        const doc = await cursor.next();
        const counter = { n: 0 };
        deepReplace(doc, oldHost, newHost, counter);
        if (counter.n > 0) {
          docsChanged += 1;
          stringsChanged += counter.n;
          if (!dryRun) {
            bulk.push({ replaceOne: { filter: { _id: doc._id }, replacement: doc } });
            if (bulk.length >= 500) {
              // eslint-disable-next-line no-await-in-loop
              await coll.bulkWrite(bulk, { ordered: false });
              bulk = [];
            }
          }
        }
      }
      if (!dryRun && bulk.length) {
        // eslint-disable-next-line no-await-in-loop
        await coll.bulkWrite(bulk, { ordered: false });
      }

      if (docsChanged > 0) {
        report.push({ collection: name, docsChanged, stringsChanged });
        totalDocsChanged += docsChanged;
        totalStringsChanged += stringsChanged;
      }
    }

    return res.json({
      success: true,
      dryRun,
      oldHost,
      newHost,
      collectionsScanned: names.length,
      totalDocsChanged,
      totalStringsChanged,
      changed: report.sort((a, b) => b.docsChanged - a.docsChanged),
      message: dryRun
        ? `Dry run: ${totalDocsChanged} document(s) across ${report.length} collection(s) would be updated.`
        : `Done: ${totalDocsChanged} document(s) across ${report.length} collection(s) updated.`,
    });
  } catch (err) {
    console.error('blob-host migration failed:', err);
    return res.status(500).json({ success: false, message: err.message || 'Migration failed.' });
  }
};
