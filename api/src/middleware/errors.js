export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err, req, res, _next) {
  if (res.headersSent) return;

  if (err.code === "P2002") {
    return res.status(409).json({ error: "That slot is no longer available" });
  }

  if (err.code === "P2025") {
    return res.status(404).json({ error: "Not found" });
  }

  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";

  if (statusCode === 500) {
    console.error("Unhandled error:", err);
  }

  res.status(statusCode).json({
    error: isProd && statusCode === 500 ? "Internal server error" : err.message || "An error occurred",
  });
}

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: "Endpoint not found" });
}
