import { badRequest } from "./errors.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireUuid(value, label = "id") {
  if (!UUID_RE.test(value || "")) {
    throw badRequest(`Invalid ${label}`, "INVALID_ID");
  }
  return value;
}

export function parseBoolean(value) {
  if (value === undefined) return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw badRequest("Boolean query value must be true or false", "INVALID_QUERY");
}
