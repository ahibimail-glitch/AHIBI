/**
 * Lightweight per-IP / per-user rate limiter for analytics endpoints.
 */
const buckets = new Map();

function analyticsRateLimit(options = {}) {
  const windowMs = options.windowMs || 60 * 1000;
  const max = options.max || 30;

  return (req, res, next) => {
    const identity =
      (req.user && (req.user.id || req.user._id)) ||
      (req.admin && (req.admin.id || req.admin._id)) ||
      req.ip ||
      'anonymous';
    const key = `${identity}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({
        success: false,
        message: 'Too many analytics requests. Please try again shortly.',
        retryAfterMs: Math.max(0, bucket.resetAt - now),
      });
    }

    next();
  };
}

module.exports = { analyticsRateLimit };
