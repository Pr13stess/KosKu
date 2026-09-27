import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { SupabasePropertyRepository } from "../apps/user-app/src/data/supabase/SupabasePropertyRepository.ts";
import { SupabaseRoomRepository } from "../apps/user-app/src/data/supabase/SupabaseRoomRepository.ts";
import { SupabasePricingRepository } from "../apps/user-app/src/data/supabase/SupabasePricingRepository.ts";
import {
  mockProperties,
  mockRooms,
} from "../apps/user-app/src/data/mock/fixtures.ts";
import { defaultQuery } from "../apps/user-app/src/domain/models.ts";

test("Supabase adapters use real SDK request encoding and validate response contracts", async () => {
  const calls = [];
  const fetch = async (input, options) => {
    const url = new URL(String(input));
    calls.push({ url, options });
    let value;
    if (url.pathname.endsWith("/rpc/search_properties"))
      value = [
        {
          data: {
            ...mockProperties[0],
            starting_price: 2200000,
            matching_available: 1,
            distance_km: null,
          },
        },
      ];
    else if (url.pathname.endsWith("/property_catalog"))
      value = [mockProperties[0]];
    else if (url.pathname.endsWith("/room_catalog")) value = [mockRooms[0]];
    else if (url.pathname.endsWith("/plan_catalog")) value = mockRooms[0].plans;
    else throw new Error("Unexpected API request");
    return new Response(JSON.stringify(value), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const client = createClient("https://fixture.invalid", "test-public-key", {
    global: { fetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const properties = new SupabasePropertyRepository(client);
  const results = await properties.search({
    ...defaultQuery,
    roomFacilities: ["AC"],
    sort: "price",
  });
  assert.equal(results[0].starting_price, 2200000);
  const params = JSON.parse(calls[0].options.body);
  assert.deepEqual(params.room_facilities, ["AC"]);
  assert.equal(params.period_unit, "MONTH");
  assert.equal(params.sort_by, "price");
  assert.equal(
    (await properties.get(mockProperties[0].id)).name,
    mockProperties[0].name,
  );
  assert.equal(
    calls[1].url.searchParams.get("id"),
    `eq.${mockProperties[0].id}`,
  );
  assert.equal(
    (
      await new SupabaseRoomRepository(client).listByProperty(
        mockProperties[0].id,
      )
    )[0].id,
    mockRooms[0].id,
  );
  assert.equal(
    calls[2].url.searchParams.get("property_id"),
    `eq.${mockProperties[0].id}`,
  );
  assert.equal(
    (await new SupabasePricingRepository(client).listByRoom(mockRooms[0].id))
      .length,
    4,
  );
  assert.equal(
    calls[3].url.searchParams.get("room_type_id"),
    `eq.${mockRooms[0].id}`,
  );
});
test("Supabase failure is surfaced instead of silently showing mock data", async () => {
  const client = createClient("https://fixture.invalid", "test-public-key", {
    global: {
      fetch: async () =>
        new Response(
          JSON.stringify({ message: "RLS fixture error", code: "42501" }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        ),
    },
    auth: { persistSession: false },
  });
  await assert.rejects(
    new SupabasePropertyRepository(client).search(defaultQuery),
    /RLS fixture error/,
  );
});
