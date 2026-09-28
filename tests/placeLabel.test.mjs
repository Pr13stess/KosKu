import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPlaceLabel } from "../apps/user-app/src/domain/placeLabel.ts";
test("Place label is short, deduplicated and never empty", () => {
  assert.equal(
    formatPlaceLabel({ street: "Jl. Kaliurang", city: "Sleman" }, "x"),
    "Jl. Kaliurang · Sleman",
  );
  assert.equal(formatPlaceLabel({ name: "Sleman", city: "Sleman" }, "x"), "Sleman");
  assert.equal(formatPlaceLabel({}, "Titik di peta"), "Titik di peta");
  assert.equal(formatPlaceLabel(null, "Lokasi saya"), "Lokasi saya");
});
