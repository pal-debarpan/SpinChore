export class HttpError extends Error {
  constructor(status, message, code = "REQUEST_ERROR", details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFound(entity = "Resource") {
  return new HttpError(404, `${entity} not found`, "NOT_FOUND");
}

export function badRequest(message, code = "BAD_REQUEST", details) {
  return new HttpError(400, message, code, details);
}

export function conflict(message, code = "CONFLICT") {
  return new HttpError(409, message, code);
}
