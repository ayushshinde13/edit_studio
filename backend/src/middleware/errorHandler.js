/**
 * Global Error Handler Middleware
 * Conforms to PRD Section 16.5: Standard JSON error envelope { error: { code, message } }
 */
export function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.url}:`, err.message || err);

  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || (statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR");
  const message = err.message || "An unexpected server error occurred.";

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
    },
  });
}

/**
 * 404 Not Found Handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `The endpoint ${req.method} ${req.originalUrl} does not exist.`,
    },
  });
}

