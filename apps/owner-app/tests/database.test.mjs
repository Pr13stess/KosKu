import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("Owner database: migration, authorization, inventory and communication", async (t) => {
  const db = new PGlite();
  const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
  const rpc = async (name, args = []) => {
    const v = await rows(
      `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) value`,
      args,
    );
    return v[0].value;
  };
  const as = async (who) => {
    await db.exec("reset role;set role authenticated;");
    await rows("select set_config('request.jwt.claim.sub',$1,false)", [who]);
  };
  const admin = () => db.exec("reset role;");
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select on storage.objects to anon,authenticated;`,
    );
    for (const folder of ["base", "migrations"])
      for (const file of (await readdir(`supabase/${folder}`))
        .filter((f) => f.endsWith(".sql"))
        .sort())
        await db.exec(await readFile(`supabase/${folder}/${file}`, "utf8"));
    for (let n = 1; n <= 4; n++) {
      await admin();
      await rows("insert into auth.users(id,email) values($1,$2)", [
        id(n),
        `test${n}@example.test`,
      ]);
      await as(id(n));
      await rpc("owner_bootstrap");
    }
    await t.test(
      "All exposed tables have SELECT RLS and no blanket mobile writes",
      async () => {
        await admin();
        assert.deepEqual(
          await rows(
            `select tablename from pg_tables t where schemaname='public' and (not rowsecurity or not exists(select 1 from pg_policies p where p.schemaname=t.schemaname and p.tablename=t.tablename and p.cmd in ('SELECT','ALL')))`,
          ),
          [],
        );
        await as(id(1));
        await assert.rejects(
          rows(
            "update public.owner_profiles set verification_status='APPROVED'",
          ),
          /permission denied/,
        );
        await assert.rejects(
          rows(
            "insert into public.user_roles(user_id,role) values($1,'ADMIN')",
            [id(1)],
          ),
          /permission denied/,
        );
      },
    );
    const property = {
      id: "",
      name: "Kos Alpha",
      address: "Jalan contoh nomor 12",
      city: "Yogyakarta",
      province: "DIY",
      latitude: -7.8,
      longitude: 110.4,
      gender_type: "MIXED",
      description: "Rumah uji",
      rules: "Tenang",
      publication_status: "ACTIVE",
      photos: [],
      facilities: ["Wi-Fi", "Parkir"],
    };
    await as(id(1));
    const p1 = await rpc("owner_save_property", [property]);
    await as(id(2));
    const p2 = await rpc("owner_save_property", [
      { ...property, name: "Kos Beta" },
    ]);
    const room = {
      id: "",
      property_id: p1,
      name: "Standard",
      floor_label: "1",
      room_size_m2: 12,
      bathroom_type: "PRIVATE",
      description: "Kamar",
      is_active: true,
      facilities: ["Kasur"],
      inventory: { total: 3 },
    };
    await as(id(1));
    const r1 = await rpc("owner_save_room", [room]);
    const plan = {
      id: "",
      room_type_id: r1,
      name: "Bulanan",
      duration_unit: "MONTH",
      duration_value: 1,
      price: 1500000,
      down_payment_type: "FIXED",
      down_payment_value: 500000,
      security_deposit_type: "FIXED",
      security_deposit_value: 500000,
      deposit_refundable: true,
      deposit_terms: "Dikembalikan setelah pemeriksaan",
      is_active: true,
    };
    await rpc("owner_save_plan", [plan]);
    await t.test(
      "Two owners cannot read or change each other’s property, room, or plan",
      async () => {
        assert.equal((await rpc("owner_read", ["properties"])).length, 1);
        await as(id(2));
        await assert.rejects(
          rpc("owner_save_property", [{ ...property, id: p1 }]),
          /bukan milik/,
        );
        await assert.rejects(
          rpc("owner_save_room", [{ ...room, id: r1, property_id: p2 }]),
          /bukan milik/,
        );
        await assert.rejects(rpc("owner_save_plan", [plan]), /bukan milik/);
        await assert.rejects(
          rpc("owner_inventory", [
            r1,
            {
              total: 5,
              occupied: 0,
              cleaning: 0,
              maintenance: 0,
              inactive: 0,
              version: 1,
            },
            "Perubahan test",
          ]),
          /bukan milik/,
        );
        assert.equal((await rpc("owner_read", ["rooms"])).length, 0);
      },
    );
    await as(id(1));
    await t.test(
      "Profile, consent, private evidence and submitted status are valid",
      async () => {
        await rpc("owner_profile", [
          "save",
          { full_name: "Owner Satu", phone: "081234567890", address: "Jogja" },
        ]);
        await rpc("owner_profile", ["policies"]);
        await admin();
        await rows(
          "insert into public.owner_uploads(path,owner_id,purpose) values('owner-media/evidence.jpg',$1,'verification')",
          [id(1)],
        );
        await as(id(1));
        await rpc("owner_profile", [
          "verify",
          { evidence: "owner-media/evidence.jpg" },
        ]);
        assert.equal(
          (await rpc("owner_read", ["profile"])).verification_status,
          "PENDING",
        );
        await rpc("owner_verify_property", [p1, "owner-media/evidence.jpg"]);
        assert.equal(
          (await rpc("owner_read", ["properties"]))[0].verification_status,
          "PENDING",
        );
        await as(id(2));
        await assert.rejects(
          rpc("owner_profile", [
            "verify",
            { evidence: "owner-media/evidence.jpg" },
          ]),
          /tidak valid/,
        );
      },
    );
    await as(id(1));
    await t.test(
      "Pricing rejects invalid DP and duplicate active duration",
      async () => {
        await assert.rejects(
          rpc("owner_save_plan", [{ ...plan, down_payment_value: 2000000 }]),
          /valid_dp|unique/,
        );
        await assert.rejects(rpc("owner_save_plan", [plan]), /unique/);
      },
    );
    await admin();
    const plans = await rows(
      "select id from public.pricing_plans where room_type_id=$1",
      [r1],
    );
    await rows(
      `insert into public.bookings(id,booking_code,user_id,room_type_id,pricing_plan_id,status,rent_price_snapshot,down_payment_snapshot,security_deposit_snapshot,pay_now_snapshot,remaining_rent_snapshot) values($1,'TEST-1',$2,$3,$4,'CONFIRMED',1500000,500000,500000,1000000,1000000)`,
      [id(10), id(3), r1, plans[0].id],
    );
    await rows(
      "insert into public.inventory_allocations(booking_id,room_type_id,kind) values($1,$2,'RESERVED')",
      [id(10), r1],
    );
    await t.test(
      "Atomic check-in/out is idempotent and protects occupied bookings",
      async () => {
        await as(id(1));
        await rpc("owner_booking", [
          id(10),
          "checkin",
          "Penyewa datang dan sisa sewa dicatat sebagai simulasi",
        ]);
        await rpc("owner_booking", [id(10), "checkin", "Retry sama"]);
        let r = (await rpc("owner_read", ["rooms"]))[0];
        assert.equal(r.inventory.occupied, 1);
        assert.equal(r.inventory.reserved, 0);
        await assert.rejects(
          rpc("owner_inventory", [
            r1,
            { ...r.inventory, occupied: 0 },
            "Turunkan occupied",
          ]),
          /checkout booking/,
        );
        await assert.rejects(
          rpc("owner_inventory", [
            r1,
            { ...r.inventory, total: 0 },
            "Kurangi total",
          ]),
          /check constraint|capacity/,
        );
        await rpc("owner_booking", [
          id(10),
          "checkout",
          "Penyewa sudah keluar",
        ]);
        await rpc("owner_booking", [id(10), "checkout", "Retry sama"]);
        r = (await rpc("owner_read", ["rooms"]))[0];
        assert.equal(r.inventory.occupied, 0);
        assert.equal(r.inventory.cleaning, 1);
        await assert.rejects(
          rpc("owner_inventory", [
            r1,
            { ...r.inventory, version: r.inventory.version - 1 },
            "Data lama ditolak",
          ]),
          /Data berubah/,
        );
        await rpc("owner_inventory", [
          r1,
          { ...r.inventory, cleaning: 0 },
          "Kamar selesai dibersihkan",
        ]);
      },
    );
    await admin();
    await rows(
      "insert into public.conversations(id,property_id,user_id,owner_id) values($1,$2,$3,$4)",
      [id(20), p1, id(3), id(1)],
    );
    await rows(
      "insert into public.conversation_participants(conversation_id,user_id) values($1,$2),($1,$3)",
      [id(20), id(1), id(3)],
    );
    await t.test(
      "Messages are participant-only, retry-safe and blocked by restrictions",
      async () => {
        await as(id(1));
        await rpc("communication_send", [
          id(20),
          "Halo calon penyewa",
          "",
          id(30),
        ]);
        await rpc("communication_send", [
          id(20),
          "Halo calon penyewa",
          "",
          id(30),
        ]);
        assert.equal((await rpc("communication_messages", [id(20)])).length, 1);
        await as(id(2));
        await assert.rejects(
          rpc("communication_messages", [id(20)]),
          /Bukan peserta/,
        );
        assert.deepEqual(await rows("select * from public.messages"), []);
        await as(id(1));
        await rpc("communication_restrict", [
          {
            user_id: id(3),
            block_communication: true,
            block_booking: true,
            reason: "SPAM",
            notes: "Pesan berulang",
            status: "ACTIVE",
          },
        ]);
        await as(id(3));
        await assert.rejects(
          rpc("communication_send", [id(20), "Diblokir", "", id(31)]),
          /dibatasi/,
        );
        await as(id(1));
        await rpc("communication_restrict", [
          { user_id: id(3), status: "REVOKED" },
        ]);
      },
    );
    await t.test(
      "Calls enforce receiver acceptance, busy state, metadata and expiry",
      async () => {
        await as(id(1));
        const c = await rpc("communication_start", [id(20), "VOICE"]);
        await assert.rejects(
          rpc("communication_call", [c.id, "accept"]),
          /Hanya penerima/,
        );
        await assert.rejects(
          rpc("communication_start", [id(20), "VIDEO"]),
          /sedang dalam/,
        );
        await as(id(2));
        await assert.rejects(
          rpc("communication_call", [c.id, "end"]),
          /Bukan peserta/,
        );
        await as(id(3));
        await rpc("communication_call", [c.id, "accept"]);
        await rpc("communication_call", [c.id, "ping"]);
        await as(id(1));
        await rpc("communication_call", [c.id, "end"]);
        await rpc("communication_call", [c.id, "end"]);
        assert.equal(
          (await rpc("communication_messages", [id(20)])).filter(
            (m) => m.message_type === "CALL_EVENT",
          ).length,
          1,
        );
        const c2 = await rpc("communication_start", [id(20), "VIDEO"]);
        await admin();
        await rows(
          "update public.calls set created_at=now()-interval '1 minute' where id=$1",
          [c2.id],
        );
        await as(id(1));
        const all = await rpc("owner_read", ["calls"]);
        assert.equal(all.find((c) => c.id === c2.id).status, "MISSED");
      },
    );
    await t.test(
      "Owner reporting, deletion requests, push preferences and dashboard execute",
      async () => {
        await as(id(1));
        await rpc("owner_report", [
          {
            target_type: "USER",
            target_id: id(3),
            category: "SPAM",
            description: "Pesan spam berulang dari akun ini",
            evidence_path: "",
          },
        ]);
        await rpc("owner_profile", [
          "delete",
          { reason: "Akun uji selesai dipakai" },
        ]);
        await rpc("owner_profile", ["push", { enabled: true }]);
        await rpc("owner_profile", [
          "device",
          {
            token: "ExponentPushToken[test]",
            platform: "ANDROID",
            installation: id(100),
          },
        ]);
        await rpc("owner_profile", ["logout", { installation: id(100) }]);
        assert.equal((await rpc("owner_read", ["reports"])).length, 1);
        assert.equal(
          (await rpc("owner_read", ["dashboard"])).properties.length,
          1,
        );
        await as(id(2));
        assert.equal((await rpc("owner_read", ["reports"])).length, 0);
      },
    );
    await t.test(
      "New chat entry points enforce owner booking relationship and public listing",
      async () => {
        await as(id(1));
        assert.equal((await rpc("communication_open", [p1, id(3)])).id, id(20));
        await assert.rejects(
          rpc("communication_open", [p1, id(4)]),
          /belum terkait/,
        );
        await as(id(4));
        await assert.rejects(
          rpc("communication_open", [p1, null]),
          /tidak tersedia/,
        );
        await admin();
        await rows(
          "update public.owner_profiles set verification_status='APPROVED' where user_id=$1",
          [id(1)],
        );
        await rows(
          "update public.properties set verification_status='APPROVED' where id=$1",
          [p1],
        );
        await as(id(4));
        const c = await rpc("communication_open", [p1, null]);
        assert.equal(c.user_id, id(4));
        await as(id(2));
        await assert.rejects(
          rpc("communication_messages", [c.id]),
          /Bukan peserta/,
        );
      },
    );
    await t.test(
      "Restriction stops new holds; status notifications are emitted after updates",
      async () => {
        await as(id(1));
        await rpc("communication_restrict", [
          {
            user_id: id(3),
            block_communication: false,
            block_booking: true,
            reason: "OTHER",
            notes: "Pengujian",
            status: "ACTIVE",
          },
        ]);
        await admin();
        await rows(
          "insert into public.bookings(id,booking_code,user_id,room_type_id,pricing_plan_id) values($1,'TEST-2',$2,$3,$4)",
          [id(11), id(3), r1, plans[0].id],
        );
        await assert.rejects(
          rows(
            "insert into public.inventory_allocations(booking_id,room_type_id,kind,expires_at) values($1,$2,'HOLD',now()+interval '15 minutes')",
            [id(11), r1],
          ),
          /dibatasi oleh owner/,
        );
        await rows(
          "update public.verification_submissions set status='APPROVED' where submitted_by=$1",
          [id(1)],
        );
        await rows(
          "update public.reports set status='INVESTIGATING' where reporter_id=$1",
          [id(1)],
        );
        await as(id(1));
        const notices = await rpc("owner_read", ["notices"]);
        assert(notices.some((n) => n.type === "OWNER"));
        assert(notices.some((n) => n.type === "REPORT"));
        await as(id(2));
        assert(
          !(await rpc("owner_read", ["notices"])).some(
            (n) => n.type === "OWNER",
          ),
        );
      },
    );
  } finally {
    await db.close();
  }
});
