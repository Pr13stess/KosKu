export interface AddressParts {
  name?: string | null;
  street?: string | null;
  district?: string | null;
  subregion?: string | null;
  city?: string | null;
}
/** Short label such as "Jl. Kaliurang · Sleman"; never returns an empty string. */
export function formatPlaceLabel(
  address: AddressParts | null | undefined,
  fallback: string,
): string {
  if (!address) return fallback;
  const first = address.name || address.street || address.district;
  const second = address.city || address.subregion;
  const parts = [first, second]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part);
  return [...new Set(parts)].join(" · ") || fallback;
}
