/**
 * Simple in-memory TTL cache for analytics responses.
 * Not shared across instances — acceptable for Render single-instance / short TTLs.
 */
class AnalyticsCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear() {
    this.store.clear();
  }
}

module.exports = new AnalyticsCache();
