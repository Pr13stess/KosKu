import React, { useState } from "react";
import { View } from "react-native";
import { useRepositories } from "../../application/RepositoriesProvider";
import { PropertyInput } from "../../domain/models";
import { Props } from "../navigation";
import { useAction } from "../hooks";
import { chooseImage } from "../media";
import {
  Badge,
  Button,
  Card,
  Choices,
  Feedback,
  Field,
  Link,
  Page,
  Photo,
  Row,
  T,
  Title,
} from "../components/UI";
export function PropertyFormScreen({
  route,
  navigation,
}: Props<"PropertyForm">) {
  const { properties, support } = useRepositories();
  const action = useAction();
  const old = route.params.property;
  const [value, setValue] = useState<PropertyInput>(
    old ?? {
      id: "",
      name: "",
      address: "",
      city: "",
      province: "",
      latitude: null,
      longitude: null,
      gender_type: "MIXED",
      description: "",
      rules: "",
      publication_status: "DRAFT",
      photos: [],
      facilities: [],
    },
  );
  const [lat, setLat] = useState(String(old?.latitude ?? ""));
  const [lon, setLon] = useState(String(old?.longitude ?? ""));
  const [evidence, setEvidence] = useState("");
  const set = <K extends keyof PropertyInput>(key: K, v: PropertyInput[K]) =>
    setValue((s) => ({ ...s, [key]: v }));
  const upload = (purpose: "property" | "verification", camera = false) =>
    action.run(
      async () => {
        const image = await chooseImage(camera);
        if (!image) return;
        const path = await support.upload({ ...image, purpose });
        if (purpose === "property") set("photos", [...value.photos, path]);
        else setEvidence(path);
      },
      undefined,
      "Foto siap. Simpan untuk menerapkan perubahan.",
    );
  return (
    <Page title={old ? "Edit properti" : "Tambahkan kos"}>
      <Badge>DATA KOS</Badge>
      <Title>Ruang baru, cerita baru.</Title>
      <T muted>
        Lengkapi informasi kos agar calon penyewa mendapat gambaran yang jelas.
      </T>
      <Card>
        <Title>Identitas kos</Title>
        <Field
          label="Nama kos"
          value={value.name}
          onChange={(v) => set("name", v)}
        />
        <Field
          label="Alamat lengkap"
          value={value.address}
          onChange={(v) => set("address", v)}
          multiline
        />
        <Field
          label="Kota"
          value={value.city}
          onChange={(v) => set("city", v)}
        />
        <Field
          label="Provinsi"
          value={value.province}
          onChange={(v) => set("province", v)}
        />
        <Choices
          label="Tipe kos"
          value={value.gender_type}
          onChange={(v) => set("gender_type", v)}
          options={[
            { value: "MALE", label: "Putra" },
            { value: "FEMALE", label: "Putri" },
            { value: "MIXED", label: "Campur" },
          ]}
        />
        <Field
          label="Latitude (opsional)"
          value={lat}
          onChange={setLat}
          numeric
        />
        <Field
          label="Longitude (opsional)"
          value={lon}
          onChange={setLon}
          numeric
        />
      </Card>
      <Card>
        <Title>Detail & fasilitas</Title>
        <Field
          label="Deskripsi"
          value={value.description}
          onChange={(v) => set("description", v)}
          multiline
        />
        <Field
          label="Peraturan kos"
          value={value.rules}
          onChange={(v) => set("rules", v)}
          multiline
        />
        <Field
          label="Fasilitas umum (pisahkan koma)"
          value={value.facilities.join(",")}
          onChange={(v) => set("facilities", v.split(","))}
        />
        <Choices
          label="Status tayang"
          value={value.publication_status}
          onChange={(v) => set("publication_status", v)}
          options={[
            { value: "DRAFT", label: "Draft" },
            { value: "ACTIVE", label: "Aktif" },
            { value: "INACTIVE", label: "Nonaktif" },
          ]}
        />
        <T muted style={{ fontSize: 11 }}>
          Kos tampil publik setelah owner dan properti disetujui admin. Edit
          informasi mengajukan pemeriksaan ulang.
        </T>
      </Card>
      <Card>
        <Title>Galeri kos</Title>
        {value.photos.map((p, i) => (
          <View key={p + i}>
            <Photo path={p} />
            <Row>
              <T muted style={{ fontSize: 11 }}>
                {i === 0 ? "Foto sampul" : `Foto ${i + 1}`}
              </T>
              <Link
                title="Jadikan sampul"
                onPress={() =>
                  set("photos", [p, ...value.photos.filter((_, n) => n !== i)])
                }
              />
              <Link
                title="Hapus"
                onPress={() =>
                  set(
                    "photos",
                    value.photos.filter((_, n) => n !== i),
                  )
                }
              />
            </Row>
          </View>
        ))}
        <Row>
          <Button
            title="Pilih foto"
            secondary
            disabled={action.busy}
            onPress={() => void upload("property")}
          />
          <Button
            title="Kamera"
            secondary
            disabled={action.busy}
            onPress={() => void upload("property", true)}
          />
        </Row>
      </Card>
      <Card>
        <Title>Verifikasi properti</Title>
        <T muted>
          Unggah bukti uji kepemilikan/pengelolaan untuk ditinjau admin. Gunakan
          dokumen dummy.
        </T>
        {evidence && <Photo path={evidence} />}
        <Button
          title="Pilih bukti dummy"
          secondary
          disabled={action.busy}
          onPress={() => void upload("verification")}
        />
        {old?.review_reason && <Feedback text={old.review_reason} />}
      </Card>
      <Feedback text={action.error} error />
      <Feedback text={action.message} />
      <Button
        title={action.busy ? "Menyimpan…" : "Simpan kos"}
        disabled={action.busy}
        onPress={() =>
          void action.run(async () => {
            if (Boolean(lat) !== Boolean(lon))
              throw new Error("Isi kedua koordinat atau kosongkan keduanya.");
            if (
              lat &&
              (!Number.isFinite(Number(lat)) ||
                Math.abs(Number(lat)) > 90 ||
                !Number.isFinite(Number(lon)) ||
                Math.abs(Number(lon)) > 180)
            )
              throw new Error("Koordinat tidak valid.");
            const id = await properties.save({
              ...value,
              latitude: lat ? Number(lat) : null,
              longitude: lon ? Number(lon) : null,
              facilities: value.facilities.map((v) => v.trim()).filter(Boolean),
            });
            if (evidence) await properties.submitVerification(id, evidence);
            navigation.replace("Property", { id });
          })
        }
      />
    </Page>
  );
}
