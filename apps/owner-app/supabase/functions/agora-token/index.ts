import { RtcTokenBuilder, RtcRole } from "npm:agora-token@2.0.4";
import { handle, userClient } from "../_shared/http.ts";
Deno.serve((req) =>
  handle(req, async () => {
    const { client, user } = await userClient(req);
    const { call_id } = await req.json();
    if (typeof call_id !== "string") throw new Error("Call ID tidak valid.");
    const { data: call, error } = await client
      .from("calls")
      .select("*")
      .eq("id", call_id)
      .single();
    if (error || !call || ![call.caller_id, call.receiver_id].includes(user.id))
      throw new Error("Bukan peserta panggilan.");
    if (call.status !== "CONNECTED")
      throw new Error("Panggilan belum terhubung atau sudah berakhir.");
    const { error: heartbeatError } = await client.rpc("communication_call", {
      call_id,
      action: "ping",
    });
    if (heartbeatError) throw new Error(heartbeatError.message);
    const { data: current } = await client
      .from("calls")
      .select("status")
      .eq("id", call_id)
      .single();
    if (current?.status !== "CONNECTED")
      throw new Error("Panggilan kedaluwarsa.");
    const appId = Deno.env.get("AGORA_APP_ID"),
      certificate = Deno.env.get("AGORA_APP_CERTIFICATE");
    if (!appId || !certificate)
      throw new Error("Agora belum dikonfigurasi di backend.");
    const uid = call.caller_id === user.id ? 1 : 2;
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      certificate,
      call.agora_channel_id,
      uid,
      RtcRole.PUBLISHER,
      300,
      300,
    );
    return { appId, token, channel: call.agora_channel_id, uid };
  }),
);
