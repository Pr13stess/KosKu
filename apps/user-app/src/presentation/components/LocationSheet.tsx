import { useState } from "react";
import { Text, StyleSheet } from "react-native";
import type { ReferenceLocation } from "../../domain/models";
import { Sheet } from "./Sheet";
import { Button, Chip } from "./Primitives";
import { MapPickerModal } from "./MapPickerModal";
import {
  describeCoordinates,
  getCurrentCoordinates,
} from "../../data/device/DeviceLocation";
import { colors } from "../theme";
const places: ReferenceLocation[] = [
  { label: "UGM · Sleman", latitude: -7.7714, longitude: 110.3775 },
  {
    label: "Stasiun Tugu · Yogyakarta",
    latitude: -7.7894,
    longitude: 110.3632,
  },
  { label: "Gedung Sate · Bandung", latitude: -6.9025, longitude: 107.6188 },
  { label: "UNDIP · Semarang", latitude: -7.0518, longitude: 110.4406 },
];
export function LocationSheet({
  current,
  onClose,
  onSelect,
}: {
  current: ReferenceLocation | null;
  onClose: () => void;
  onSelect: (p: ReferenceLocation | null) => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [mapOpen, setMapOpen] = useState(false);
  async function useMyLocation() {
    setError("");
    setBusy(true);
    try {
      const point = await getCurrentCoordinates();
      const label = await describeCoordinates(point, "Lokasi saya");
      onSelect({ label, ...point });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lokasi belum bisa diambil.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Sheet visible={!mapOpen} title="Lokasi acuan" onClose={onClose}>
        <Text style={styles.help}>
          Pilih titik acuan untuk menghitung jarak (garis lurus) ke kos.
        </Text>
        <Button
          title={busy ? "Mencari lokasimu…" : "Gunakan lokasi saya"}
          disabled={busy}
          onPress={useMyLocation}
        />
        <Button
          secondary
          title="Pilih di peta"
          onPress={() => setMapOpen(true)}
        />
        {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
        <Text style={styles.help}>Atau pilih titik populer</Text>
        {places.map((p) => (
          <Chip key={p.label} label={p.label} onPress={() => onSelect(p)} />
        ))}
        <Button
          secondary
          title="Hapus lokasi acuan"
          onPress={() => onSelect(null)}
        />
      </Sheet>
      {mapOpen && (
        <MapPickerModal
          initial={current}
          onClose={() => setMapOpen(false)}
          onConfirm={onSelect}
        />
      )}
    </>
  );
}
const styles = StyleSheet.create({
  help: { fontSize: 13, lineHeight: 20, color: colors.muted },
});
