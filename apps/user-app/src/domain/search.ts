import type { Listing, Property, Room, SearchQuery } from "./models";
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const rad = (n: number) => (n * Math.PI) / 180;
  const h =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) *
      Math.cos(rad(lat2)) *
      Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function searchCatalog(
  properties: Property[],
  rooms: Room[],
  q: SearchQuery,
): Listing[] {
  const result: Listing[] = [];
  for (const p of properties) {
    if (
      (q.gender && p.gender_type !== q.gender) ||
      p.rating < q.minRating ||
      !q.propertyFacilities.every((f) => p.facilities.includes(f))
    )
      continue;
    if (
      ![p.name, p.address, p.city]
        .join(" ")
        .toLocaleLowerCase("id")
        .includes(q.text.toLocaleLowerCase("id"))
    )
      continue;
    const matched = rooms
      .filter(
        (r) =>
          r.property_id === p.id &&
          q.roomFacilities.every((f) => r.facilities.includes(f)),
      )
      .map((r) => ({
        r,
        plans: r.plans.filter(
          (x) =>
            x.duration_unit === q.durationUnit &&
            x.duration_value === q.durationValue &&
            x.price >= q.minPrice &&
            x.price <= q.maxPrice,
        ),
      }))
      .filter((x) => x.plans.length > 0);
    if (!matched.length) continue;
    const distance =
      q.reference && p.latitude !== null && p.longitude !== null
        ? haversine(
            q.reference.latitude,
            q.reference.longitude,
            p.latitude,
            p.longitude,
          )
        : null;
    if (
      q.maxDistance !== null &&
      (distance === null || distance > q.maxDistance)
    )
      continue;
    result.push({
      ...p,
      starting_price: Math.min(
        ...matched.flatMap((x) => x.plans.map((y) => y.price)),
      ),
      matching_available: matched.reduce((n, x) => n + x.r.available, 0),
      distance_km: distance,
    });
  }
  result.sort(
    (a, b) =>
      (q.sort === "price"
        ? a.starting_price - b.starting_price
        : q.sort === "nearest"
          ? (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity)
          : b.rating - a.rating) || a.id.localeCompare(b.id),
  );
  return result.slice(q.page * 20, q.page * 20 + 20);
}
