import * as Location from "expo-location";
import type { ReferenceLocation } from "../../domain/models";
import { formatPlaceLabel } from "../../domain/placeLabel";
export type Coordinates = Pick<ReferenceLocation, "latitude" | "longitude">;
/**
 * Foreground-only permission, requested when the user taps the button.
 * Coordinates are used for distance search and are never persisted.
 */
export async function getCurrentCoordinates(): Promise<Coordinates> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Izin lokasi ditolak. Aktifkan di pengaturan, atau pilih titik di peta.",
    );
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}
/** Human-readable label; falls back to a neutral name if geocoding fails. */
export async function describeCoordinates(
  point: Coordinates,
  fallback: string,
): Promise<string> {
  try {
    const [address] = await Location.reverseGeocodeAsync(point);
    return formatPlaceLabel(address, fallback);
  } catch {
    return fallback;
  }
}
