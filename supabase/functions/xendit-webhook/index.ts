// Xendit Invoice callback endpoint. Deploy WITHOUT JWT verification:
//   supabase functions deploy xendit-webhook --no-verify-jwt
// Authenticity comes from the x-callback-token header, not a user session.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyCallbackToken } from "../_shared/xendit.ts";
import { env, json } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    if (!verifyCallbackToken(req.headers.get("x-callback-token"), env("XENDIT_CALLBACK_TOKEN"))) {
      console.warn("Rejected notification: invalid callback token");
      return json({ error: "INVALID_TOKEN" }, 401);
    }
    // Xendit's own delivery id: identical on a retried delivery, so it
    // doubles as our idempotency key with no extra bookkeeping.
    const webhookId = req.headers.get("webhook-id");
    const n = await req.json().catch(() => null);
    if (!n || typeof n.external_id !== "string" || typeof n.status !== "string")
      return json({ error: "BAD_PAYLOAD" }, 400);
    const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: result, error } = await admin.rpc("apply_payment_event", {
      p_order_id: n.external_id,
      p_event_key: webhookId ?? `${n.id}:${n.status}:${n.updated ?? ""}`,
      p_status: n.status,
      p_payment_method: n.payment_method ?? n.payment_channel ?? null,
      p_amount: String(n.amount ?? n.paid_amount ?? ""),
      p_provider_transaction_id: n.id ?? null,
      p_payload: n,
    });
    if (error) {
      console.error("apply_payment_event failed");
      return json({ error: "RETRY" }, 500);
    }
    return json({ result });
  } catch (e) {
    console.error("xendit-webhook failed", e instanceof Error ? e.message : "unknown");
    return json({ error: "RETRY" }, 500);
  }
});
