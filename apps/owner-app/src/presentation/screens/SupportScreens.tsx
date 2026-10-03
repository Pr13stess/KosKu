import React, { useCallback, useState } from "react";
import { Platform, Pressable } from "react-native";
import { useRepositories } from "../../application/RepositoriesProvider";
import { Props, useNav } from "../navigation";
import { useAction, useLoad } from "../hooks";
import { chooseImage } from "../media";
import {
  Badge,
  Button,
  Card,
  Choices,
  date,
  Empty,
  Feedback,
  Field,
  Load,
  Page,
  Photo,
  Row,
  T,
  Title,
  Toggle,
} from "../components/UI";
export function NotificationsScreen() {
  const { support, communication } = useRepositories();
  const nav = useNav();
  const a = useAction();
  const q = useLoad(
    useCallback(() => support.notifications(), [support]),
    15000,
  );
  return (
    <Page title="Notifikasi">
      <Load {...q} />
      {q.data?.map((n) => (
        <Pressable
          key={n.id}
          onPress={() =>
            void a.run(
              async () => {
                await support.markRead(n.id);
                if (n.target_type === "BOOKING")
                  nav.navigate("Booking", { id: n.target_id });
                else if (n.target_type === "CALL")
                  nav.navigate("Call", { id: n.target_id });
                else if (n.target_type === "CHAT") {
                  const c = (await communication.conversations()).find(
                    (c) => c.id === n.target_id,
                  );
                  if (c) nav.navigate("Chat", { conversation: c });
                } else if (n.target_type === "PROPERTY")
                  nav.navigate("Property", { id: n.target_id });
                else if (n.target_type === "OWNER") nav.navigate("Profile");
                else nav.navigate("Reports");
              },
              undefined,
              "",
            )
          }
        >
          <Card>
            <Row>
              <T style={{ fontWeight: "800", flex: 1 }}>{n.title}</T>
              {!n.read_at && <Badge>BARU</Badge>}
            </Row>
            <T muted>{n.body}</T>
            <T muted style={{ fontSize: 10 }}>
              {date(n.created_at)}
            </T>
          </Card>
        </Pressable>
      ))}
      {q.data?.length === 0 && (
        <Empty
          title="Belum ada notifikasi"
          body="Pembaruan aktivitas kos akan muncul di sini."
        />
      )}
      <Feedback text={a.error} error />
    </Page>
  );
}
export function ReportsScreen() {
  const { support } = useRepositories();
  const q = useLoad(useCallback(() => support.reports(), [support]));
  return (
    <Page title="Laporan & permintaan">
      <Load {...q} />
      {q.data?.map((r) => (
        <Card key={r.id}>
          <Row>
            <T style={{ fontWeight: "800", flex: 1 }}>
              {r.category.replaceAll("_", " ")}
            </T>
            <Badge>{r.status}</Badge>
          </Row>
          <T>{r.description}</T>
          <T muted>{r.resolution_note || "Menunggu penanganan admin."}</T>
          <T muted style={{ fontSize: 11 }}>
            {date(r.created_at)}
          </T>
        </Card>
      ))}
      {q.data?.length === 0 && (
        <Empty
          title="Belum ada laporan"
          body="Laporan pengguna dari chat dan permintaan khusus booking dapat dipantau di sini."
        />
      )}
    </Page>
  );
}
export function ReportScreen({ route, navigation }: Props<"Report">) {
  const { support } = useRepositories();
  const a = useAction();
  const [category, setCategory] = useState("SPAM");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState("");
  return (
    <Page title="Kirim laporan">
      <Card>
        <Choices
          label="Kategori laporan"
          value={category}
          onChange={setCategory}
          options={[
            { value: "SPAM", label: "Spam" },
            { value: "HARASSMENT", label: "Mengganggu" },
            { value: "FRAUD", label: "Penipuan" },
            { value: "FALSE_INFORMATION", label: "Informasi palsu" },
            { value: "OTHER", label: "Lainnya" },
          ]}
        />
        <Field
          label="Uraian kejadian"
          value={description}
          onChange={setDescription}
          multiline
        />
        {evidence && <Photo path={evidence} />}
        <Button
          title="Tambah bukti gambar (opsional)"
          secondary
          disabled={a.busy}
          onPress={() =>
            void a.run(
              async () => {
                const image = await chooseImage();
                if (image)
                  setEvidence(
                    await support.upload({ ...image, purpose: "report" }),
                  );
              },
              undefined,
              "Bukti siap.",
            )
          }
        />
        <T muted style={{ fontSize: 11 }}>
          Bukti hanya digunakan untuk penanganan laporan. Jelaskan kejadian
          secara faktual.
        </T>
        <Feedback text={a.error} error />
        <Button
          title="Kirim laporan"
          disabled={a.busy}
          onPress={() =>
            void a.run(
              () =>
                support.report({
                  target_type: route.params.targetType,
                  target_id: route.params.targetId,
                  category,
                  description,
                  evidence_path: evidence,
                }),
              () => navigation.replace("Reports"),
            )
          }
        />
      </Card>
    </Page>
  );
}
export function SettingsScreen() {
  const { profile, support, mode, installation } = useRepositories();
  const a = useAction();
  const q = useLoad(useCallback(() => profile.get(), [profile]));
  const [permission, setPermission] = useState("Belum diperiksa");
  return (
    <Page title="Pengaturan notifikasi">
      <Load {...q} />
      {q.data && (
        <Card>
          <Title>Notifikasi aktivitas</Title>
          <T muted>
            Pesan, booking, panggilan, dan hasil verifikasi tetap tersedia di
            kotak notifikasi aplikasi.
          </T>
          <Toggle
            label="Izinkan push dari aplikasi"
            value={q.data.push_enabled}
            onChange={(enabled) =>
              void a.run(async () => {
                if (enabled && mode === "supabase") {
                  if (Platform.OS === "web")
                    throw new Error(
                      "Push tersedia pada development build Android/iOS.",
                    );
                  const Notifications = await import("expo-notifications");
                  if (Platform.OS === "android")
                    await Notifications.setNotificationChannelAsync("default", {
                      name: "Aktivitas KosKu",
                      importance: Notifications.AndroidImportance.HIGH,
                    });
                  const p = await Notifications.requestPermissionsAsync();
                  setPermission(p.status);
                  if (!p.granted)
                    throw new Error(
                      "Izin OS ditolak. Aktifkan di pengaturan perangkat.",
                    );
                  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
                  if (!projectId)
                    throw new Error("EAS project ID belum dikonfigurasi.");
                  const token = await Notifications.getExpoPushTokenAsync({
                    projectId,
                  });
                  await support.registerPush(
                    token.data,
                    Platform.OS === "ios" ? "IOS" : "ANDROID",
                    installation,
                  );
                }
                await support.setPushEnabled(enabled);
              })
            }
          />
          <T muted style={{ fontSize: 12 }}>
            Izin sistem operasi:{" "}
            {mode === "demo" ? "Simulasi, tidak meminta izin" : permission}
          </T>
          <T muted style={{ fontSize: 11 }}>
            Push biasa tidak menjamin layar panggilan muncul saat aplikasi
            ditutup. Panggilan yang terlewat dicatat pada riwayat.
          </T>
          <Feedback text={a.error} error />
          <Feedback text={a.message} />
        </Card>
      )}
    </Page>
  );
}
