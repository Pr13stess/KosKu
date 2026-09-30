// POST { plan_id, planned_move_in_date? } with the user's JWT.
// Holds one unit (SQL, transactional), then opens a Xendit Invoice (Test
// Mode) for the snapshot amount. Safe to call again: it returns the
// existing pending invoice instead of creating a second one.
import { createClient } from "npm:@supabase/supabase-js@2";
import { basicAuth } from "../_shared/xendit.ts";
import { businessError, cors, env, json } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const url = env("SUPABASE_URL");
    const user = createClient(url, env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: who } = await user.auth.getUser();
    if (!who.user) return json({ error: "UNAUTHENTICATED" }, 401);
    const body = await req.json().catch(() => ({}));
    if (typeof body.plan_id !== "string") return json({ error: "BAD_REQUEST" }, 400);

    const { data: bookingId, error } = await user.rpc("create_checkout", {
      p_plan_id: body.plan_id,
      p_move_in: body.planned_move_in_date ?? null,
    });
    if (error) {
      console.error("create_checkout RPC failed:", error.message);
      return businessError(error.message) ?? json({ error: "CHECKOUT_FAILED" }, 500);
    }

    const { data: b } = await admin.from("bookings")
      .select("booking_code,pay_now_snapshot,down_payment_snapshot,security_deposit_snapshot,room_type_name_snapshot,property_name_snapshot")
      .eq("id", bookingId).single();
    const { data: alloc } = await admin.from("inventory_allocations")
      .select("expires_at").eq("booking_id", bookingId).is("released_at", null).single();
    const { data: attempts } = await admin.from("payments")
      .select("order_id,status,redirect_url").eq("booking_id", bookingId)
      .order("created_at", { ascending: false });
    const pending = attempts?.find((p) => p.status === "PENDING" && p.redirect_url);
    if (pending) {
      return json({ booking_id: bookingId, order_id: pending.order_id,
        redirect_url: pending.redirect_url, hold_expires_at: alloc?.expires_at });
    }

    const orderId = `${b!.booking_code}-${(attempts?.length ?? 0) + 1}`;
    const seconds = Math.max(60, Math.floor((new Date(alloc!.expires_at).getTime() - Date.now()) / 1000));
    const invoiceRes = await fetch(
      `${Deno.env.get("XENDIT_API_URL") ?? "https://api.xendit.co"}/v2/invoices`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json",
          Authorization: basicAuth(env("XENDIT_SECRET_KEY")) },
        body: JSON.stringify({
          external_id: orderId,
          amount: b!.pay_now_snapshot,
          currency: "IDR",
          payer_email: who.user.email,
          description: `${b!.room_type_name_snapshot} · ${b!.property_name_snapshot} (DEMO)`,
          invoice_duration: seconds,
        }),
      },
    );
    if (!invoiceRes.ok) {
      // Hold stays valid: the app can retry with the same order id until it expires.
      const detail = await invoiceRes.text().catch(() => "");
      console.error("Xendit invoice error", invoiceRes.status, detail);
      return json({ error: "PAYMENT_PROVIDER_ERROR" }, 502);
    }
    const invoice = await invoiceRes.json();
    const { error: attachError } = await admin.rpc("attach_payment", {
      p_booking_id: bookingId, p_order_id: orderId,
      p_redirect_url: invoice.invoice_url, p_provider_transaction_id: invoice.id,
    });
    if (attachError) {
      console.error("attach_payment RPC failed:", attachError.message);
      return businessError(attachError.message) ?? json({ error: "ATTACH_FAILED" }, 500);
    }
    return json({ booking_id: bookingId, order_id: orderId,
      redirect_url: invoice.invoice_url, hold_expires_at: alloc!.expires_at });
  } catch (e) {
    console.error("create-payment failed", e instanceof Error ? e.message : "unknown");
    return json({ error: "INTERNAL" }, 500);
  }
});
