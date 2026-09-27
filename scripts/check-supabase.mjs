import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const file = "apps/user-app/.env";
if (existsSync(file)) process.loadEnvFile(file);
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key)
  throw new Error(
    "Isi URL dan publishable key di apps/user-app/.env terlebih dahulu.",
  );
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
for (const view of ["property_catalog", "room_catalog", "plan_catalog"]) {
  const { data, error } = await client.from(view).select("id").limit(1);
  if (error) throw new Error(`${view}: ${error.message}`);
  console.log(
    `${view}: OK (${data.length ? "data tersedia" : "kosong; jalankan seed demo jika diperlukan"})`,
  );
}
const { data, error } = await client.rpc("search_properties");
if (error) throw new Error(`search_properties: ${error.message}`);
console.log(`search_properties: OK (${data.length} hasil di halaman pertama)`);
