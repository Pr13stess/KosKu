import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { MockPropertyRepository } from "../apps/user-app/src/data/mock/MockPropertyRepository.ts";
import { defaultQuery } from "../apps/user-app/src/domain/models.ts";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("Migrations, seed, RLS isolation, aggregates and integrity", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;
   create table auth.users(id uuid primary key,email text);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
    for (const f of (await readdir("supabase/migrations")).sort())
      await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
    await db.exec(await readFile("supabase/seed.sql", "utf8"));
    const as = async (role, who = "") => {
      await db.exec(
        `reset role;set role ${role};select set_config('request.jwt.claim.sub','${who}',false);`,
      );
    };
    const rows = async (sql) => (await db.query(sql)).rows;
    await t.test(
      "Every one of 36 tables has RLS and SELECT policy",
      async () => {
        assert.equal(
          (
            await rows(
              "select count(*)::int n from pg_tables where schemaname='public'",
            )
          )[0].n,
          36,
        );
        assert.deepEqual(
          await rows(await readFile("supabase/tests/rls_coverage.sql", "utf8")),
          [],
        );
      },
    );
    await t.test(
      "Anonymous catalog excludes unverified owners, unverified properties, suspended and deleted listings",
      async () => {
        await as("anon");
        const result = await rows("select * from public.property_catalog");
        assert.equal(result.length, 6);
        assert.equal(
          (await rows("select * from public.search_properties()")).length,
          6,
        );
        for (const table of [
          "profiles",
          "owner_profiles",
          "notes",
          "bookings",
          "inventory_allocations",
          "room_type_inventory",
          "messages",
          "audit_logs",
        ])
          assert.deepEqual(
            await rows(`select * from public.${table}`),
            [],
            table,
          );
      },
    );
    await t.test(
      "Notes private even from owner and admin; conversation policies do not recurse",
      async () => {
        await as("authenticated", id(3));
        assert.equal((await rows("select * from public.notes")).length, 1);
        assert.equal((await rows("select * from public.messages")).length, 1);
        assert.equal(
          (await rows("select * from public.conversation_participants")).length,
          2,
        );
        await as("authenticated", id(4));
        assert.equal((await rows("select * from public.notes")).length, 1);
        assert.equal((await rows("select * from public.messages")).length, 0);
        await as("authenticated", id(1));
        assert.equal((await rows("select * from public.notes")).length, 0);
        assert.equal((await rows("select * from public.messages")).length, 1);
        await as("authenticated", id(2));
        assert.equal((await rows("select * from public.bookings")).length, 0);
        await as("authenticated", id(5));
        assert.equal((await rows("select * from public.notes")).length, 0);
        assert.equal((await rows("select * from public.messages")).length, 0);
      },
    );
    await t.test(
      "start_conversation creates a conversation and participants; messages_insert requires participation and correct sender",
      async () => {
        await as("authenticated", id(4));
        const newId = (
          await rows(
            `select public.start_conversation('00000000-0000-4000-8000-000000000101') as id`,
          )
        )[0].id;
        assert.equal(
          (
            await rows(
              `select * from public.conversation_participants where conversation_id='${newId}'`,
            )
          ).length,
          2,
        );
        await rows(`insert into public.messages
          (conversation_id, sender_id, message_type, text_content, client_message_id)
          values ('${newId}', '${id(4)}', 'TEXT', 'Halo, kamarnya masih ada?', gen_random_uuid())`);
        assert.equal(
          (
            await rows(`select * from public.messages where conversation_id='${newId}'`)
          ).length,
          1,
        );
        // id(3) is a participant of a different conversation, not this one.
        await as("authenticated", id(3));
        await assert.rejects(() =>
          rows(`insert into public.messages
            (conversation_id, sender_id, message_type, text_content, client_message_id)
            values ('${newId}', '${id(3)}', 'TEXT', 'Menyusup', gen_random_uuid())`),
        );
        // Cannot spoof another participant's sender_id.
        await as("authenticated", id(4));
        await assert.rejects(() =>
          rows(`insert into public.messages
            (conversation_id, sender_id, message_type, text_content, client_message_id)
            values ('${newId}', '${id(1)}', 'TEXT', 'Menyamar', gen_random_uuid())`),
        );
        // Owner blocks communication (written by backend/admin, not the
        // client, so this row is inserted with RLS bypassed like a
        // service-role write would be).
        await db.exec("reset role");
        await db.exec(`insert into public.user_restrictions
          (owner_id, user_id, block_communication, block_booking, reason, status)
          values ('${id(1)}', '${id(4)}', true, false, 'SPAM', 'ACTIVE')`);
        await as("authenticated", id(4));
        await assert.rejects(() =>
          rows(
            `select public.start_conversation('00000000-0000-4000-8000-000000000102')`,
          ),
        );
      },
    );
    await t.test(
      "Clients cannot write roles, verification, inventory, bookings, payments or notes",
      async () => {
        await as("authenticated", id(3));
        for (const table of [
          "profiles",
          "user_roles",
          "owner_profiles",
          "properties",
          "bookings",
          "inventory_allocations",
          "payments",
          "room_type_inventory",
          "notes",
        ])
          await assert.rejects(
            db.exec(`delete from public.${table}`),
            /permission denied/,
          );
      },
    );
    await t.test(
      "Mock and SQL search agree on price period, matching room, filters, Haversine and stable order",
      async () => {
        await as("anon");
        const mock = new MockPropertyRepository();
        const cases = [
          { q: defaultQuery, sql: "select * from public.search_properties()" },
          {
            q: { ...defaultQuery, roomFacilities: ["AC"], sort: "price" },
            sql: "select * from public.search_properties(room_facilities=>array['AC'],sort_by=>'price')",
          },
          {
            q: { ...defaultQuery, durationUnit: "DAY", maxPrice: 100000 },
            sql: "select * from public.search_properties(period_unit=>'DAY',max_price=>100000)",
          },
          {
            q: {
              ...defaultQuery,
              reference: {
                label: "UGM",
                latitude: -7.7714,
                longitude: 110.3775,
              },
              maxDistance: 10,
              sort: "nearest",
            },
            sql: "select * from public.search_properties(ref_lat=>-7.7714,ref_lon=>110.3775,max_distance=>10,sort_by=>'nearest')",
          },
          {
            q: {
              ...defaultQuery,
              gender: "FEMALE",
              propertyFacilities: ["Wi-Fi"],
            },
            sql: "select * from public.search_properties(gender=>'FEMALE',property_facilities=>array['Wi-Fi'])",
          },
          {
            q: { ...defaultQuery, text: "tidak ditemukan" },
            sql: "select * from public.search_properties(q=>'tidak ditemukan')",
          },
        ];
        for (const c of cases) {
          const actual = (await rows(c.sql)).map((r) => r.data),
            expected = await mock.search(c.q);
          assert.deepEqual(
            actual.map((p) => [p.id, p.starting_price, p.matching_available]),
            expected.map((p) => [p.id, p.starting_price, p.matching_available]),
          );
          for (let i = 0; i < actual.length; i++)
            if (expected[i].distance_km !== null)
              assert.ok(
                Math.abs(actual[i].distance_km - expected[i].distance_km) <
                  1e-8,
              );
        }
      },
    );
    await t.test(
      "Availability includes every private hold/reservation without exposing identities",
      async () => {
        await as("postgres");
        for (const [n, status, kind, expiry] of [
          [6000, "HELD", "HOLD", "now()+interval '1 hour'"],
          [6001, "CONFIRMED", "RESERVED", "null"],
          [6002, "CANCELLED", "HOLD", "now()-interval '1 hour'"],
        ]) {
          await db.exec(`insert into public.bookings(id,booking_code,user_id,room_type_id,pricing_plan_id,status) values('${id(n)}','TEST-${n}','${id(4)}','${id(200)}','${id(1001)}','${status}');
     insert into public.inventory_allocations(booking_id,room_type_id,kind,expires_at) values('${id(n)}','${id(200)}','${kind}',${expiry});`);
        }
        await as("anon");
        assert.equal(
          (
            await rows(
              `select available from public.room_catalog where id='${id(200)}'`,
            )
          )[0].available,
          2,
        );
        assert.deepEqual(
          await rows("select * from public.inventory_allocations"),
          [],
        );
        await as("authenticated", id(3));
        assert.equal(
          (
            await rows(
              `select available from public.room_catalog where id='${id(200)}'`,
            )
          )[0].available,
          2,
        );
      },
    );
    await t.test(
      "Database rejects invalid capacity, price, mismatched room plan and invalid review",
      async () => {
        await as("postgres");
        await assert.rejects(
          db.exec(
            `update public.room_type_inventory set total=4 where room_type_id='${id(200)}'`,
          ),
          /capacity exceeded/,
        );
        await assert.rejects(
          db.exec(
            `update public.pricing_plans set down_payment_value=2000000 where id='${id(1001)}'`,
          ),
          /valid_dp/,
        );
        await assert.rejects(
          db.exec(
            `insert into public.bookings(booking_code,user_id,room_type_id,pricing_plan_id) values('BAD-PLAN','${id(3)}','${id(201)}','${id(1001)}')`,
          ),
          /matching_plan_room/,
        );
        await assert.rejects(
          db.exec(
            `insert into public.reviews(booking_id,user_id,property_id,rating) values('${id(6000)}','${id(4)}','${id(100)}',4)`,
          ),
          /completed booking/,
        );
      },
    );
    await t.test(
      "Auth deletion preserves transaction and review history while removing private notes",
      async () => {
        await as("postgres");
        await db.exec(`delete from auth.users where id='${id(3)}'`);
        assert.equal(
          (
            await rows(
              `select user_id from public.bookings where id='${id(4000)}'`,
            )
          )[0].user_id,
          null,
        );
        assert.equal(
          (
            await rows(
              `select user_id from public.reviews where id='${id(4001)}'`,
            )
          )[0].user_id,
          null,
        );
        assert.equal(
          (await rows(`select * from public.notes where user_id='${id(3)}'`))
            .length,
          0,
        );
      },
    );
    await t.test(
      "Signing up provisions a profile and USER role without a client write, and a user can only edit their own profile via RPC",
      async () => {
        await as("postgres");
        await db.exec(
          `insert into auth.users(id,email) values ('${id(7000)}','newuser@kosku.invalid')`,
        );
        assert.deepEqual(
          (
            await rows(
              `select full_name,phone from public.profiles where id='${id(7000)}'`,
            )
          )[0],
          { full_name: null, phone: null },
        );
        assert.equal(
          (
            await rows(
              `select role from public.user_roles where user_id='${id(7000)}'`,
            )
          )[0].role,
          "USER",
        );
        // Re-inserting the same auth.users row's downstream effects must stay
        // idempotent (mirrors what seed.sql now relies on).
        await db.exec(
          `insert into public.profiles(id) values ('${id(7000)}') on conflict (id) do nothing;
           insert into public.user_roles(user_id,role) values ('${id(7000)}','USER') on conflict (user_id, role) do nothing;`,
        );
        await as("anon");
        await assert.rejects(
          db.exec(`select public.update_own_profile('Should Fail')`),
          /Not authenticated/,
        );
        await as("authenticated", id(7000));
        await db.exec(
          `select public.update_own_profile('New User','0800-DEMO')`,
        );
        assert.deepEqual(
          (
            await rows(
              `select full_name,phone from public.profiles where id='${id(7000)}'`,
            )
          )[0],
          { full_name: "New User", phone: "0800-DEMO" },
        );
        await as("authenticated", id(3));
        await db.exec(`select public.update_own_profile('Attacker')`);
        await as("postgres");
        assert.equal(
          (
            await rows(
              `select full_name from public.profiles where id='${id(7000)}'`,
            )
          )[0].full_name,
          "New User",
        );
      },
    );
  } finally {
    await db.close();
  }
});
