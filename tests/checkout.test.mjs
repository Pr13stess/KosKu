import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { verifyCallbackToken } from "../supabase/functions/_shared/xendit.ts";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ROOM = id(200);

test("Xendit callback token check", () => {
  assert.equal(verifyCallbackToken("secret-token", "secret-token"), true);
  assert.equal(verifyCallbackToken("wrong-token", "secret-token"), false);
  assert.equal(verifyCallbackToken(null, "secret-token"), false);
  assert.equal(verifyCallbackToken("secret-token", ""), false);
  assert.equal(verifyCallbackToken("short", "secret-token"), false);
});

test("Checkout: hold, payment, webhook, expiry, late payment and permissions", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
   create table auth.users(id uuid primary key,email text);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated;`);
    for (const f of (await readdir("supabase/migrations")).sort())
      await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
    await db.exec(await readFile("supabase/seed.sql", "utf8"));
    const as = async (role, who = "") =>
      db.exec(`reset role;set role ${role};select set_config('request.jwt.claim.sub','${who}',false);`);
    const rows = async (sql) => (await db.query(sql)).rows;
    for (const n of [7101, 7102, 7103, 7104])
      await db.exec(`insert into auth.users(id,email) values ('${id(n)}','u${n}@kosku.invalid')`);
    const plans = await rows(`select id,
      case down_payment_type when 'NONE' then 0 when 'FIXED' then down_payment_value else round(price*down_payment_value/100.0) end
      + case security_deposit_type when 'NONE' then 0 when 'FIXED' then security_deposit_value else round(price*security_deposit_value/100.0) end as pay_now
      from public.pricing_plans where room_type_id='${ROOM}' and is_active order by id`);
    const paying = plans.filter((p) => Number(p.pay_now) > 0);
    assert.ok(paying.length >= 2, "seed needs two paying plans on the test room");
    const [planA, planB] = paying;
    const checkout = async (user, plan) => {
      await as("authenticated", id(user));
      return (await rows(`select public.create_checkout('${plan}') b`))[0].b;
    };
    const status = async (bid) => {
      await as("postgres");
      return (await rows(`select status,cancel_reason from public.bookings where id='${bid}'`))[0];
    };
    // Mirrors what the xendit-webhook Edge Function passes to apply_payment_event
    // after it has already verified the x-callback-token header.
    const event = async (order, webhookId, xenditStatus, amount, xenditInvoiceId = "inv-x") => {
      await as("service_role");
      return (
        await rows(
          `select public.apply_payment_event('${order}','${webhookId}','${xenditStatus}','bank_transfer','${amount}','${xenditInvoiceId}','{}'::jsonb) r`,
        )
      )[0].r;
    };
    const attach = async (bid, order, invoiceId = `inv-${order}`) => {
      await as("service_role");
      return db.exec(
        `select public.attach_payment('${bid}','${order}','https://checkout.xendit.co/web/${order}','${invoiceId}')`,
      );
    };
    const setAvailable = async (n) => {
      await as("postgres");
      await db.exec(`update public.room_type_inventory set total=occupied+cleaning+maintenance+inactive+${n} where room_type_id='${ROOM}'`);
    };

    await t.test("Hold is created with server-side snapshot, idempotent for same plan, blocked for another", async () => {
      await setAvailable(3);
      const b1 = await checkout(7101, planA.id);
      assert.equal(await checkout(7101, planA.id), b1);
      await assert.rejects(checkout(7101, planB.id), /ACTIVE_CHECKOUT_EXISTS/);
      await as("authenticated", id(7101));
      const info = (await rows(`select public.get_checkout('${b1}') j`))[0].j;
      assert.equal(info.status, "HELD");
      assert.equal(Number(info.pay_now), Number(planA.pay_now));
      const secs = (new Date(info.hold_expires_at) - new Date(info.server_now)) / 1000;
      assert.ok(secs > 14 * 60 && secs <= 15 * 60, `hold seconds ${secs}`);
      await as("authenticated", id(7102));
      await assert.rejects(db.query(`select public.get_checkout('${b1}')`), /BOOKING_NOT_FOUND/);
      await as("authenticated", id(7101));
      await db.exec(`select public.cancel_checkout('${b1}')`);
    });

    await t.test("Last unit: exactly one of two users gets the hold", async () => {
      await setAvailable(1);
      const winner = await checkout(7101, planA.id);
      await assert.rejects(checkout(7102, planA.id), /SOLD_OUT/);
      assert.equal((await status(winner)).status, "HELD");
      await as("authenticated", id(7101));
      await db.exec(`select public.cancel_checkout('${winner}')`);
      const next = await checkout(7102, planA.id);
      assert.equal((await status(next)).status, "HELD");
      await as("authenticated", id(7102));
      await db.exec(`select public.cancel_checkout('${next}')`);
      assert.equal((await status(next)).cancel_reason, "USER_CANCELLED");
    });

    await t.test("Clients cannot call payment or webhook functions", async () => {
      const b = await checkout(7101, planA.id);
      await as("authenticated", id(7101));
      await assert.rejects(db.query(`select public.attach_payment('${b}','X-1','https://x')`), /permission denied/);
      await assert.rejects(
        db.query(`select public.apply_payment_event('X-1','k','PAID',null,'1','t','{}'::jsonb)`),
        /permission denied/,
      );
      await assert.rejects(db.query(`select public.expire_holds()`), /permission denied/);
      await as("authenticated", id(7101));
      await db.exec(`select public.cancel_checkout('${b}')`);
    });

    await t.test("Paid confirms once; duplicates, pending and wrong amounts change nothing", async () => {
      const b = await checkout(7101, planA.id);
      await attach(b, "ORD-A");
      await attach(b, "ORD-A");
      assert.equal((await status(b)).status, "PENDING_PAYMENT");
      const amount = String(planA.pay_now);
      assert.equal(await event("ORD-A", "wh-0", "PAID", "1"), "AMOUNT_MISMATCH");
      assert.equal((await status(b)).status, "PENDING_PAYMENT");
      assert.equal(await event("ORD-A", "wh-1", "PENDING", amount), "PENDING");
      assert.equal(await event("ORD-A", "wh-2", "PAID", amount), "CONFIRMED");
      assert.equal(await event("ORD-A", "wh-2", "PAID", amount), "DUPLICATE");
      assert.equal(await event("ORD-A", "wh-3", "PENDING", amount), "IGNORED_FINAL");
      assert.equal(await event("ORD-A", "wh-4", "EXPIRED", amount), "IGNORED_FINAL");
      await as("postgres");
      assert.equal((await status(b)).status, "CONFIRMED");
      const alloc = (await rows(`select kind,expires_at from public.inventory_allocations where booking_id='${b}'`))[0];
      assert.equal(alloc.kind, "RESERVED");
      assert.equal(alloc.expires_at, null);
      assert.equal((await rows(`select status,provider_transaction_id from public.payments where order_id='ORD-A'`))[0].status, "SUCCESS");
      await as("authenticated", id(7101));
      await assert.rejects(db.query(`select public.cancel_checkout('${b}')`), /CANNOT_CANCEL_HERE/);
      await as("service_role");
      assert.equal(await event("NOPE", "wh-5", "PAID", "1"), "UNKNOWN_ORDER");
    });

    await t.test("Unrecognized status is reported rather than silently applied", async () => {
      await setAvailable(2);
      const b = await checkout(7103, planA.id);
      await attach(b, "ORD-U");
      assert.equal(await event("ORD-U", "wh-u1", "SOMETHING_NEW", String(planA.pay_now)), "UNKNOWN_STATUS");
      assert.equal((await status(b)).status, "PENDING_PAYMENT");
      await as("authenticated", id(7103));
      await db.exec(`select public.cancel_checkout('${b}')`);
    });

    await t.test("Expired hold cancels booking; late success is refunded and never takes the unit", async () => {
      await setAvailable(3);
      const b = await checkout(7104, planA.id);
      await attach(b, "ORD-L");
      await as("postgres");
      await db.exec(`update public.inventory_allocations set expires_at=now()-interval '1 minute' where booking_id='${b}'`);
      await as("authenticated", id(7104));
      const info = (await rows(`select public.get_checkout('${b}') j`))[0].j;
      assert.equal(info.status, "CANCELLED");
      assert.equal(info.cancel_reason, "HOLD_EXPIRED");
      assert.equal(info.payment_status, "EXPIRED");
      assert.equal(info.hold_expires_at, null);
      assert.equal(await event("ORD-L", "wh-l1", "PAID", String(planA.pay_now)), "LATE_PAYMENT_REFUND_PENDING");
      await as("postgres");
      assert.equal((await status(b)).status, "CANCELLED");
      assert.equal((await rows(`select status from public.payments where order_id='ORD-L'`))[0].status, "REFUND_PENDING");
      const refund = (await rows(`select r.amount,r.status from public.refunds r join public.payments p on p.id=r.payment_id where p.order_id='ORD-L'`))[0];
      assert.equal(Number(refund.amount), Number(planA.pay_now));
      assert.equal(refund.status, "PENDING");
    });

    await t.test("Restricted users, zero upfront plans and unavailable plans are rejected", async () => {
      await as("postgres");
      const owner = (await rows(`select p.owner_id from public.properties p join public.room_types r on r.property_id=p.id where r.id='${ROOM}'`))[0].owner_id;
      await db.exec(`insert into public.user_restrictions(owner_id,user_id,block_booking,reason) values ('${owner}','${id(7102)}',true,'SPAM')`);
      await assert.rejects(checkout(7102, planA.id), /BOOKING_RESTRICTED/);
      const free = plans.find((p) => Number(p.pay_now) > 0);
      await as("postgres");
      await db.exec(`update public.pricing_plans set down_payment_type='NONE',down_payment_value=0,security_deposit_type='NONE',security_deposit_value=0 where id='${free.id}'`);
      await assert.rejects(checkout(7103, free.id), /NO_UPFRONT_PAYMENT/);
      await assert.rejects(checkout(7103, id(999999)), /PLAN_UNAVAILABLE/);
      await as("anon");
      await assert.rejects(db.query(`select public.create_checkout('${planB.id}')`), /permission denied/);
    });
  } finally {
    await db.close();
  }
});
