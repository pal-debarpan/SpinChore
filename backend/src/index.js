import { loadEnv } from "./config/env.js";
import { createSupabaseAdmin } from "./db/supabase.js";
import { createApp } from "./app.js";

const env = loadEnv();
const db = createSupabaseAdmin(env);
const app = createApp({ db, corsOrigin: env.corsOrigin });

app.listen(env.port, () => {
  console.log(`SpinChore API listening on http://localhost:${env.port}`);
});
