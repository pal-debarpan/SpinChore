import { loadEnv } from "../backend/src/config/env.js";
import { createSupabaseAdmin } from "../backend/src/db/supabase.js";
import { createApp } from "../backend/src/app.js";

let app = null;

function getApp() {
  if (app) return app;
  const env = loadEnv();
  const db = env.skipDb ? null : createSupabaseAdmin(env);
  app = createApp({ db, corsOrigin: env.corsOrigin || true });
  return app;
}

export default function handler(req, res) {
  try {
    const expressApp = getApp();
    return expressApp(req, res);
  } catch (err) {
    console.error("Vercel Serverless Function error:", err);
    return res.status(500).json({
      data: null,
      error: {
        code: err.code || "CONFIG_ERROR",
        message: err.message || "Failed to initialize SpinChore backend API",
        tip: "Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your Vercel Project Environment Variables.",
      },
    });
  }
}
