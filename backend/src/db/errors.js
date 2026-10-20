import { HttpError } from "../http/errors.js";

export function throwIfDbError(error) {
  if (!error) return;
  const message = error.message || "Database error";
  if (error.code === "23505") {
    throw new HttpError(409, "This record already exists", "DUPLICATE");
  }
  if (error.code === "23503") {
    throw new HttpError(400, "Related record is missing", "FOREIGN_KEY");
  }
  if (error.code === "PGRST116") {
    throw new HttpError(404, "Resource not found", "NOT_FOUND");
  }
  if (/cannot regenerate/i.test(message)) {
    throw new HttpError(409, message, "WEEK_HAS_COMPLETIONS");
  }
  throw new HttpError(500, "Database request failed", "DATABASE_ERROR");
}
