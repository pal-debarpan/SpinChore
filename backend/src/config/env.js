import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../../.env") });
dotenv.config();

export function loadEnv(source = process.env) {
  const optional = source.SKIP_DB === "true";
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = required.filter((key) => !source[key]);

  if (!optional && missing.length > 0) {
    const error = new Error(
      `Missing required environment variables: ${missing.join(", ")}. Copy .env.example to .env and fill in Supabase values.`
    );
    error.code = "ENV_MISSING";
    throw error;
  }

  return {
    port: Number(source.PORT || 3000),
    corsOrigin: source.CORS_ORIGIN
      ? source.CORS_ORIGIN === "*"
        ? true
        : source.CORS_ORIGIN
      : source.VERCEL || source.NODE_ENV === "production"
      ? true
      : "http://localhost:5173",
    supabaseUrl: source.SUPABASE_URL || "",
    supabaseServiceRoleKey: source.SUPABASE_SERVICE_ROLE_KEY || "",
    skipDb: optional,
  };
}
