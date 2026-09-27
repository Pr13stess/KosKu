import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { DurationUnit, SearchQuery } from "../../domain/models";
import { defaultQuery } from "../../domain/models";
import { colors } from "../theme";
import { Chip, Button, Section } from "./Primitives";
import { Sheet } from "./Sheet";
const periods: { label: string; unit: DurationUnit; value: number }[] = [
  { label: "Harian", unit: "DAY", value: 1 },
  { label: "Mingguan", unit: "WEEK", value: 1 },
  { label: "Bulanan", unit: "MONTH", value: 1 },
  { label: "3 bulan", unit: "MONTH", value: 3 },
  { label: "6 bulan", unit: "MONTH", value: 6 },
  { label: "Tahunan", unit: "YEAR", value: 1 },
];
export function FilterSheet({
  query,
  onClose,
  onApply,
}: {
  query: SearchQuery;
  onClose: () => void;
  onApply: (q: SearchQuery) => void;
}) {
  const [draft, setDraft] = useState(query),
    [min, setMin] = useState(query.minPrice ? String(query.minPrice) : ""),
    [max, setMax] = useState(
      query.maxPrice < 1e9 ? String(query.maxPrice) : "",
    ),
    [distance, setDistance] = useState(
      query.maxDistance ? String(query.maxDistance) : "",
    ),
    [error, setError] = useState("");
  const toggle = (key: "roomFacilities" | "propertyFacilities", name: string) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(name)
        ? d[key].filter((x) => x !== name)
        : [...d[key], name],
    }));
  function apply() {
    const lo = Number(min || 0),
      hi = Number(max || 1e9),
      dist = distance ? Number(distance) : null;
    if (
      !Number.isFinite(lo) ||
      !Number.isFinite(hi) ||
      lo < 0 ||
      hi < lo ||
      (dist !== null && (!Number.isFinite(dist) || dist <= 0))
    ) {
      setError("Periksa rentang harga dan jarak.");
      return;
    }
    onApply({
      ...draft,
      minPrice: lo,
      maxPrice: hi,
      maxDistance: draft.reference ? dist : null,
      page: 0,
    });
  }
  return (
    <Sheet visible title="Filter & urutkan" onClose={onClose}>
      <Section title="Filter">
        <Text style={styles.label}>Paket sewa</Text>
        <View style={styles.wrap}>
          {periods.map((p) => (
            <Chip
              key={p.label}
              label={p.label}
              selected={
                draft.durationUnit === p.unit && draft.durationValue === p.value
              }
              onPress={() =>
                setDraft({
                  ...draft,
                  durationUnit: p.unit,
                  durationValue: p.value,
                })
              }
            />
          ))}
        </View>
        <Text style={styles.label}>Harga per paket (Rp)</Text>
        <View style={styles.wrap}>
          <TextInput
            accessibilityLabel="Harga minimum"
            style={styles.input}
            keyboardType="numeric"
            placeholder="Minimum"
            value={min}
            onChangeText={setMin}
          />
          <TextInput
            accessibilityLabel="Harga maksimum"
            style={styles.input}
            keyboardType="numeric"
            placeholder="Maksimum"
            value={max}
            onChangeText={setMax}
          />
        </View>
        <Text style={styles.label}>Tipe kos</Text>
        <View style={styles.wrap}>
          {(
            [
              { id: null, label: "Semua" },
              { id: "MALE", label: "Putra" },
              { id: "FEMALE", label: "Putri" },
              { id: "MIXED", label: "Campur" },
            ] as const
          ).map((g) => (
            <Chip
              key={g.label}
              label={g.label}
              selected={draft.gender === g.id}
              onPress={() => setDraft({ ...draft, gender: g.id })}
            />
          ))}
        </View>
        <Text style={styles.label}>Fasilitas kamar</Text>
        <View style={styles.wrap}>
          {["AC", "Kamar mandi dalam", "Kasur", "Meja belajar"].map((x) => (
            <Chip
              key={x}
              label={x}
              selected={draft.roomFacilities.includes(x)}
              onPress={() => toggle("roomFacilities", x)}
            />
          ))}
        </View>
        <Text style={styles.label}>Fasilitas umum</Text>
        <View style={styles.wrap}>
          {["Wi-Fi", "Dapur bersama", "Parkir motor", "CCTV"].map((x) => (
            <Chip
              key={x}
              label={x}
              selected={draft.propertyFacilities.includes(x)}
              onPress={() => toggle("propertyFacilities", x)}
            />
          ))}
        </View>
        <Text style={styles.label}>Rating minimal</Text>
        <View style={styles.wrap}>
          {[0, 3, 4, 4.5].map((v) => (
            <Chip
              key={v}
              label={v === 0 ? "Semua" : `★ ${v}+`}
              selected={draft.minRating === v}
              onPress={() => setDraft({ ...draft, minRating: v })}
            />
          ))}
        </View>
        <Text style={styles.label}>Jarak maksimum (km, garis lurus)</Text>
        <TextInput
          accessibilityLabel="Jarak maksimum"
          editable={!!draft.reference}
          style={[styles.input, !draft.reference && { opacity: 0.4 }]}
          keyboardType="decimal-pad"
          value={distance}
          onChangeText={setDistance}
          placeholder={
            draft.reference ? "Tanpa batas" : "Pilih lokasi acuan dahulu"
          }
        />
      </Section>
      <Section title="Urutkan">
        <View style={styles.wrap}>
          {(
            [
              { id: "recommended", label: "Rekomendasi" },
              { id: "price", label: "Harga terendah" },
              { id: "rating", label: "Rating tertinggi" },
              { id: "nearest", label: "Terdekat" },
            ] as const
          ).map((v) => (
            <Chip
              key={v.id}
              label={v.label}
              selected={draft.sort === v.id}
              onPress={() => {
                if (v.id === "nearest" && !draft.reference) {
                  setError("Pilih lokasi acuan untuk urutan terdekat.");
                  return;
                }
                setError("");
                setDraft({ ...draft, sort: v.id });
              }}
            />
          ))}
        </View>
      </Section>
      {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
      <Button title="Terapkan" onPress={apply} />
      <Button
        title="Reset filter"
        secondary
        onPress={() => {
          setDraft({
            ...defaultQuery,
            text: query.text,
            reference: query.reference,
          });
          setMin("");
          setMax("");
          setDistance("");
          setError("");
        }}
      />
    </Sheet>
  );
}
const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  label: { fontSize: 13, color: colors.muted, marginTop: 6 },
  input: {
    flex: 1,
    minWidth: 100,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    color: colors.ink,
  },
});
