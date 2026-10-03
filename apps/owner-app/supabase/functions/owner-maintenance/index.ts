import { adminClient, handle } from "../_shared/http.ts";
// Invoke every minute from a protected scheduler. Never put WORKER_SECRET in the mobile app.
Deno.serve((req) =>
  handle(req, async () => {
    const secret = Deno.env.get("WORKER_SECRET");
    if (!secret || req.headers.get("Authorization") !== `Bearer ${secret}`)
      throw new Error("Worker unauthorized.");
    const db = adminClient();
    const { error: expire } = await db.rpc("communication_expire");
    if (expire) throw expire;
    const { data: queue, error } = await db.rpc("owner_push_queue");
    if (error) throw error;
    for (const item of queue ?? []) {
      try {
        const r = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(Deno.env.get("EXPO_ACCESS_TOKEN")
              ? { Authorization: `Bearer ${Deno.env.get("EXPO_ACCESS_TOKEN")}` }
              : {}),
          },
          body: JSON.stringify({
            to: item.token,
            title: item.title,
            body: "Buka KosKu untuk melihat pembaruan.",
            sound: "default",
            data: { target_type: item.target_type, target_id: item.target_id },
            ttl: 60,
          }),
        });
        if (!r.ok) continue;
        const result = await r.json();
        const ticket = result.data;
        if (ticket?.status === "ok")
          await db
            .from("owner_push_deliveries")
            .update({ status: "SENT", ticket_id: ticket.id })
            .eq("notification_id", item.notification_id)
            .eq("device_token_id", item.device_token_id);
        else if (ticket?.details?.error === "DeviceNotRegistered") {
          await db
            .from("device_tokens")
            .update({ revoked_at: new Date().toISOString() })
            .eq("id", item.device_token_id);
          await db
            .from("owner_push_deliveries")
            .update({ status: "INVALID" })
            .eq("notification_id", item.notification_id)
            .eq("device_token_id", item.device_token_id);
        }
      } catch {
        /* Retry by queue after the lease expires; no sensitive payload logging. */
      }
    }
    const { data: sent } = await db
      .from("owner_push_deliveries")
      .select("*")
      .eq("status", "SENT")
      .lt("last_attempt_at", new Date(Date.now() - 15 * 60_000).toISOString())
      .limit(100);
    if (sent?.length) {
      const r = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(Deno.env.get("EXPO_ACCESS_TOKEN")
            ? { Authorization: `Bearer ${Deno.env.get("EXPO_ACCESS_TOKEN")}` }
            : {}),
        },
        body: JSON.stringify({ ids: sent.map((x) => x.ticket_id) }),
      });
      if (r.ok) {
        const { data } = await r.json();
        for (const item of sent) {
          const receipt = data?.[item.ticket_id];
          if (!receipt) continue;
          if (receipt.details?.error === "DeviceNotRegistered")
            await db
              .from("device_tokens")
              .update({ revoked_at: new Date().toISOString() })
              .eq("id", item.device_token_id);
          await db
            .from("owner_push_deliveries")
            .update({
              status: receipt.status === "ok" ? "DELIVERED" : "FAILED",
            })
            .eq("notification_id", item.notification_id)
            .eq("device_token_id", item.device_token_id);
        }
      }
    }
    return { processed: queue?.length ?? 0 };
  }),
);
