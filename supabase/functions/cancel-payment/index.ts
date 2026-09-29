// POST { booking_id } with the user's JWT. Expires the open Xendit
// invoice when possible, then releases the hold. Closing the payment
// page alone never cancels anything.
import { createClient } from "npm:@supabase/supabase-js@2";
import { basicAuth } from "../_shared/xendit.ts";
import { businessError, cors, env, json } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const url = env("SUPABASE_URL");
    const user = createClient(url, env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const admin = createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"));
    const body = await req.json().catch(() => ({}));
    if (typeof body.booking_id !== "string") return json({ error: "BAD_REQUEST" }, 400);
    // Ownership check: get_checkout only returns the caller's own booking.
    const check = await user.rpc("get_checkout", { p_booking_id: body.booking_id });
    if (check.error) return businessError(check.error.message) ?? json({ error: "FAILED" }, 500);
    if (check.data.payment_status === "SUCCESS") return json({ error: "CANNOT_CANCEL_HERE" }, 409);
    const { data: open } = await admin.from("payments").select("provider_transaction_id")
      .eq("booking_id", body.booking_id).eq("status", "PENDING");
    const base = Deno.env.get("XENDIT_API_URL") ?? "https://api.xendit.co";
    for (const p of open ?? []) {
      if (!p.provider_transaction_id) continue;
      await fetch(`${base}/v2/invoices/${encodeURIComponent(p.provider_transaction_id)}/expire!`, {
        method: "POST",
        headers: { Authorization: basicAuth(env("XENDIT_SECRET_KEY")) },
      }).catch(() => undefined); // best effort; a later webhook reconciles anything missed
    }
    const { error } = await user.rpc("cancel_checkout", { p_booking_id: body.booking_id });
    if (error) return businessError(error.message) ?? json({ error: "FAILED" }, 500);
    return json({ ok: true });
  } catch (e) {
    console.error("cancel-payment failed", e instanceof Error ? e.message : "unknown");
    return json({ error: "INTERNAL" }, 500);
  }
});
