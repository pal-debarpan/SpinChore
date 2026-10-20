export function errorHandler(err, _req, res, _next) {
  const status = Number(err.status || err.statusCode || 500);
  const expose = status < 500;
  const payload = {
    data: null,
    error: {
      code: err.code || (status === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR"),
      message: expose ? err.message : "Something went wrong",
    },
  };
  if (expose && err.details) {
    payload.error.details = err.details;
  }
  res.status(status).json(payload);
}

export function notFoundHandler(_req, res) {
  res.status(404).json({
    data: null,
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
}
