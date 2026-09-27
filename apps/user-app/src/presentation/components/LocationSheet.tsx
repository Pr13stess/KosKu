import { useState } from "react";
import { Text, TextInput, StyleSheet } from "react-native";
import type { ReferenceLocation } from "../../domain/models";
import { Sheet } from "./Sheet";
import { Button, Chip } from "./Primitives";
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
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (p: ReferenceLocation | null) => void;
}) {
  const [label, setLabel] = useState(""),
    [lat, setLat] = useState(""),
    [lon, setLon] = useState(""),
    [error, setError] = useState("");
  function apply() {
    const a = Number(lat),
      b = Number(lon);
    if (
      !label.trim() ||
      !lat.trim() ||
      !lon.trim() ||
      !Number.isFinite(a) ||
      !Number.isFinite(b) ||
      Math.abs(a) > 90 ||
      Math.abs(b) > 180
    ) {
      setError("Isi nama lokasi dan koordinat yang valid.");
      return;
    }
    onSelect({ label: label.trim(), latitude: a, longitude: b });
  }
  return (
    <Sheet visible title="Lokasi acuan" onClose={onClose}>
      <Text style={styles.help}>
        Pilih titik acuan atau masukkan koordinat tempatmu. Jarak dihitung
        sebagai garis lurus.
      </Text>
      {places.map((p) => (
        <Chip key={p.label} label={p.label} onPress={() => onSelect(p)} />
      ))}
      <Text style={styles.help}>Lokasi lain</Text>
      <TextInput
        accessibilityLabel="Nama lokasi"
        style={styles.input}
        placeholder="Nama lokasi"
        value={label}
        onChangeText={setLabel}
      />
      <TextInput
        accessibilityLabel="Latitude"
        style={styles.input}
        placeholder="Latitude, contoh -7.77"
        value={lat}
        onChangeText={setLat}
        keyboardType="numbers-and-punctuation"
      />
      <TextInput
        accessibilityLabel="Longitude"
        style={styles.input}
        placeholder="Longitude, contoh 110.37"
        value={lon}
        onChangeText={setLon}
        keyboardType="numbers-and-punctuation"
      />
      {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
      <Button title="Gunakan lokasi" onPress={apply} />
      <Button
        secondary
        title="Hapus lokasi acuan"
        onPress={() => onSelect(null)}
      />
    </Sheet>
  );
}
const styles = StyleSheet.create({
  help: { fontSize: 13, lineHeight: 20, color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 13,
    color: colors.ink,
  },
});
