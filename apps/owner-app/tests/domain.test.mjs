import { test } from "node:test";
import assert from "node:assert/strict";
import { MockStore } from "../src/data/mock/MockStore.ts";
import {
  MockBookingRepository,
  MockRoomRepository,
  MockCommunicationRepository,
} from "../src/data/mock/Repositories.ts";
import { costs, validatePlan, available } from "../src/domain/models.ts";
import { seed } from "../src/data/mock/seed.ts";
test("Demo call expiry and repeated end produce one terminal event", async () => {
  let saved = null;
  const store = new MockStore({
    getItem: async () => saved,
    setItem: async (_k, v) => {
      saved = v;
    },
  });
  const c = new MockCommunicationRepository(store);
  const call = await c.startCall("c1", "VIDEO");
  await store.write((s) => {
    s.calls[0].created_at = new Date(Date.now() - 60000).toISOString();
  });
  assert.equal((await c.calls())[0].status, "MISSED");
  await c.updateCall(call.id, "end");
  assert.equal(
    (await c.messages("c1")).filter((m) => m.message_type === "CALL_EVENT")
      .length,
    1,
  );
});
test("DP is part of rent; deposit remains separate", () => {
  const plan = seed().plans[0];
  assert.deepEqual(costs(plan), {
    dp: 625000,
    deposit: 500000,
    pay_now: 1125000,
    remaining: 625000,
  });
  assert.equal(
    costs({ ...plan, down_payment_type: "NONE", down_payment_value: 0 })
      .remaining,
    0,
  );
  assert.throws(() =>
    validatePlan({
      ...plan,
      down_payment_type: "FIXED",
      down_payment_value: 2000000,
    }),
  );
});
test("Mock persists atomic transitions and rejects stale inventory without damaging saved state", async () => {
  let saved = null;
  const storage = {
    getItem: async () => saved,
    setItem: async (_k, v) => {
      saved = v;
    },
  };
  const store = new MockStore(storage);
  const b = new MockBookingRepository(store);
  const r = new MockRoomRepository(store);
  const before = (await r.list("p1"))[0];
  await b.transition("b1", "checkin", "Sudah masuk");
  await b.transition("b1", "checkin", "Retry");
  const after = (await r.list("p1"))[0];
  assert.equal(available(after.inventory), available(before.inventory));
  await assert.rejects(r.updateInventory("r1", before.inventory, "Data lama"));
  await b.transition("b1", "checkout", "Sudah keluar");
  const reloaded = new MockStore(storage);
  assert.equal((await reloaded.read()).bookings[0].status, "COMPLETED");
});
test("Message retry is deduplicated and blocked sends remain unsent", async () => {
  let saved = null;
  const store = new MockStore({
    getItem: async () => saved,
    setItem: async (_k, v) => {
      saved = v;
    },
  });
  const c = new MockCommunicationRepository(store);
  await c.send("c1", "Halo", "", "unique");
  await c.send("c1", "Halo", "", "unique");
  assert.equal((await c.messages("c1")).length, 2);
  await c.restrict({
    id: "x",
    user_id: "tenant1",
    block_communication: true,
    block_booking: false,
    reason: "SPAM",
    notes: "test",
    status: "ACTIVE",
  });
  await assert.rejects(c.send("c1", "blocked", "", "unique2"));
  assert.equal((await c.messages("c1")).length, 2);
});
