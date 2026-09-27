import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeCost } from "../apps/user-app/src/domain/pricing.ts";
import {
  haversine,
  searchCatalog,
} from "../apps/user-app/src/domain/search.ts";
import { defaultQuery } from "../apps/user-app/src/domain/models.ts";
import {
  mockProperties,
  mockRooms,
} from "../apps/user-app/src/data/mock/fixtures.ts";
test("DP is part of rent; deposit is separate", () => {
  const p = mockRooms[0].plans.find((p) => p.name === "Bulanan");
  assert.deepEqual(summarizeCost(p), {
    rent: 1500000,
    downPayment: 500000,
    deposit: 500000,
    payNow: 1000000,
    remainingRent: 1000000,
    total: 2000000,
  });
});
test("Facilities and price must match the same room", () => {
  const result = searchCatalog(mockProperties, mockRooms, {
    ...defaultQuery,
    roomFacilities: ["AC"],
    maxPrice: 1600000,
  });
  assert.equal(result.length, 0);
});
test("Sold out properties remain visible", () => {
  assert.equal(
    searchCatalog(mockProperties, mockRooms, defaultQuery).find(
      (p) => p.name === "Kos Taman Sari",
    ).matching_available,
    0,
  );
});
test("Haversine handles identical and antipodal points", () => {
  assert.equal(haversine(0, 0, 0, 0), 0);
  assert.ok(Math.abs(haversine(0, 0, 0, 180) - 20015.0868) < 0.01);
});
test("Pagination is stable on price ties", () => {
  const list = Array.from({ length: 43 }, (_, i) => ({
    ...mockProperties[0],
    id: String(i).padStart(2, "0"),
  }));
  const rooms = list.map((p) => ({ ...mockRooms[0], property_id: p.id }));
  const a = searchCatalog(list, rooms, defaultQuery),
    b = searchCatalog(list, rooms, { ...defaultQuery, page: 1 });
  assert.equal(a.length, 20);
  assert.equal(b.length, 20);
  assert.equal(new Set([...a, ...b].map((x) => x.id)).size, 40);
});
