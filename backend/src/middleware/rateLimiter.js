/**
 * Lightweight sliding-window in-memory rate limiter
 * Protects endpoints without external Redis dependency.
 */
export function createRateLimiter({ windowMs = 60 * 1000, max = 60, message = "Too many requests. Please try again later." }) {
  const requests = new Map();

  // Periodic cleanup of stale timestamps
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of requests.entries()) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, valid);
      }
    }
  }, windowMs);

  return (req, res, next) => {
    const key = req.clientInfo?.ipHash || req.ip || "unknown_client";
    const now = Date.now();
    const timestamps = requests.get(key) || [];

    const recent = timestamps.filter((t) => now - t < windowMs);

    if (recent.length >= max) {
      return res.status(429).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message,
          retryAfterSeconds: Math.ceil((recent[0] + windowMs - now) / 1000),
        },
      });
    }

    recent.push(now);
    requests.set(key, recent);
    next();
  };
}

