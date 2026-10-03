import { handle, userClient, adminClient } from "../_shared/http.ts";
// Client recompresses images; server independently decodes and re-encodes, stripping metadata.
import { Jimp } from "npm:jimp@1.6.0";
Deno.serve((req) =>
  handle(req, async () => {
    const { client, user } = await userClient(req);
    const admin = adminClient();
    const { data: profile } = await client
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();
    if (profile?.status !== "ACTIVE") throw new Error("Akun tidak aktif.");
    const input = await req.json();
    const { base64, mime, purpose, context_id } = input;
    if (
      !["property", "verification", "chat", "report"].includes(purpose) ||
      !["image/jpeg", "image/png"].includes(mime) ||
      typeof base64 !== "string" ||
      base64.length > 7_000_000
    )
      throw new Error("Hanya JPG/PNG maksimal 5 MB yang diperbolehkan.");
    if (purpose === "chat") {
      const { data: c } = await client
        .from("conversations")
        .select("id")
        .eq("id", context_id)
        .single();
      if (!c) throw new Error("Percakapan tidak dapat diakses.");
    } else if (context_id) throw new Error("Konteks gambar tidak valid.");
    const { count } = await admin
      .from("owner_uploads")
      .select("path", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .gte("created_at", new Date(Date.now() - 60_000).toISOString());
    if ((count ?? 0) >= 10)
      throw new Error("Terlalu banyak unggahan. Coba sebentar lagi.");
    const binary = Uint8Array.from(atob(base64), (c: string) =>
      c.charCodeAt(0),
    );
    if (binary.length > 5_242_880) throw new Error("Gambar terlalu besar.");
    const png =
      binary[0] === 137 &&
      binary[1] === 80 &&
      binary[2] === 78 &&
      binary[3] === 71;
    const jpeg = binary[0] === 255 && binary[1] === 216 && binary[2] === 255;
    if ((mime === "image/png" && !png) || (mime === "image/jpeg" && !jpeg))
      throw new Error("Isi gambar tidak sesuai MIME.");
    const decoded = await Jimp.read(binary.buffer);
    if (decoded.width * decoded.height > 20_000_000)
      throw new Error("Resolusi gambar terlalu besar.");
    decoded.scaleToFit({ w: 1600, h: 1600 });
    const clean = await decoded.getBuffer("image/jpeg", { quality: 80 });
    const name = `${user.id}/${purpose}/${crypto.randomUUID()}.jpg`;
    const path = `owner-media/${name}`;
    const { error: uploadError } = await admin.storage
      .from("owner-media")
      .upload(name, clean, { contentType: "image/jpeg", upsert: false });
    if (uploadError) throw new Error("Unggahan gagal. Silakan coba lagi.");
    const { error } = await admin
      .from("owner_uploads")
      .insert({
        path,
        owner_id: user.id,
        purpose,
        context_id: purpose === "chat" ? context_id : null,
      });
    if (error) {
      await admin.storage.from("owner-media").remove([name]);
      throw new Error("Metadata unggahan gagal disimpan.");
    }
    return { path };
  }),
);
