import React, { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRepositories } from "../../application/RepositoriesProvider";
import { Profile } from "../../domain/models";
import { Props, useNav } from "../navigation";
import { useAction, useLoad } from "../hooks";
import { chooseImage } from "../media";
import {
  Badge,
  Button,
  C,
  Card,
  Feedback,
  Field,
  Link,
  Load,
  Page,
  Photo,
  Row,
  T,
  Title,
  Toggle,
} from "../components/UI";
export function AuthScreen() {
  const { auth, mode } = useRepositories();
  const a = useAction();
  const [stage, setStage] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 28, gap: 20, paddingTop: 70 }}
      >
        <T style={{ fontSize: 35, fontWeight: "900", lineHeight: 42 }}>
          KosKu<T style={{ color: C.orange, fontSize: 35 }}>.</T>
        </T>
        <Badge>OWNER APP</Badge>
        <Title>
          {stage === "login"
            ? "Selamat datang kembali."
            : stage === "register"
              ? "Mulai perjalanan Anda."
              : "Pulihkan akses akun."}
        </Title>
        <T muted>Kelola properti dan terhubung dengan calon penghuni.</T>
        <Card>
          {stage === "register" && (
            <>
              <Field label="Nama lengkap" value={name} onChange={setName} />
              <Field label="Nomor HP" value={phone} onChange={setPhone} />
            </>
          )}
          <Field label="Email" value={email} onChange={setEmail} />
          {stage !== "reset" && (
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              secure
            />
          )}
          {stage === "register" && (
            <>
              <T style={{ fontSize: 12 }}>
                Demo akademik: gunakan data dan dokumen uji. Informasi profil,
                kos, chat, dan transaksi simulasi disimpan untuk menjalankan
                layanan. Tidak ada perekaman panggilan. Penghapusan akun dapat
                diminta dari Profil.
              </T>
              <Toggle
                label="Saya setuju Privacy Policy & Terms demo"
                value={agree}
                onChange={setAgree}
              />
            </>
          )}
          <Feedback text={a.error} error />
          <Feedback text={a.message} />
          <Button
            title={
              stage === "login"
                ? "Masuk"
                : stage === "register"
                  ? "Daftar"
                  : "Kirim tautan pemulihan"
            }
            disabled={a.busy}
            onPress={() =>
              void a.run(
                async () => {
                  if (!email.includes("@"))
                    throw new Error("Isi email yang valid.");
                  if (stage === "reset") {
                    await auth.resetPassword(email);
                    return;
                  }
                  if (password.length < 8)
                    throw new Error("Password minimal 8 karakter.");
                  if (stage === "register") {
                    if (!agree || !name.trim() || !phone.trim())
                      throw new Error(
                        "Lengkapi data dan persetujuan kebijakan.",
                      );
                    await auth.signUp(name, phone, email, password);
                  } else await auth.signIn(email, password);
                },
                undefined,
                stage === "reset"
                  ? "Jika akun terdaftar, tautan pemulihan akan dikirim."
                  : stage === "register"
                    ? "Periksa email untuk verifikasi, lalu masuk."
                    : "Berhasil masuk.",
              )
            }
          />
          {stage === "login" && (
            <Link title="Lupa password?" onPress={() => setStage("reset")} />
          )}
          <Link
            title={
              stage === "login"
                ? "Belum punya akun? Daftar"
                : "Kembali ke masuk"
            }
            onPress={() => setStage(stage === "login" ? "register" : "login")}
          />
        </Card>
        {mode === "demo" && (
          <Feedback text="Mode demo: email dan password apa pun yang valid dapat digunakan. Tidak ada email yang dikirim." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
export function ProfileScreen() {
  const { profile, auth, mode } = useRepositories();
  const nav = useNav();
  const a = useAction();
  const q = useLoad(useCallback(() => profile.get(), [profile]));
  return (
    <Page title="Profil" tab="Profile" back={false}>
      <Load {...q} />
      {q.data && (
        <>
          <Row style={{ justifyContent: "flex-start", gap: 16 }}>
            <View
              style={{
                width: 65,
                height: 65,
                borderRadius: 40,
                backgroundColor: C.navy,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <T style={{ fontSize: 25, fontWeight: "800", color: C.white }}>
                {q.data.full_name.slice(0, 1)}
              </T>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Title>{q.data.full_name}</Title>
              <T muted style={{ fontSize: 11 }}>
                {q.data.email}
              </T>
              <Row style={{ justifyContent: "flex-start" }}>
                <Badge>OWNER</Badge>
                <Badge
                  tone={
                    q.data.verification_status === "APPROVED" ? "green" : "navy"
                  }
                >
                  {q.data.verification_status}
                </Badge>
              </Row>
            </View>
          </Row>
          {q.data.verification_status !== "APPROVED" && (
            <Card>
              <Title>Lengkapi data diri</Title>
              <T muted>
                {q.data.review_reason ||
                  "Verifikasi administratif membantu penyewa mengenali pengelola kos."}
              </T>
              <Button
                title="Daftar / ajukan ulang verifikasi"
                onPress={() => nav.navigate("Onboarding")}
              />
            </Card>
          )}
          <T muted style={{ fontSize: 11, letterSpacing: 1 }}>
            AKUN & PENGELOLAAN
          </T>
          <Card>
            {[
              ["Ubah profil", "EditProfile"],
              ["Ubah password", "Password"],
              ["Ringkasan keuangan", "Finance"],
              ["Notifikasi", "Notifications"],
              ["Laporan & permintaan", "Reports"],
              ["Pengaturan notifikasi", "Settings"],
              ["Hapus akun", "DeleteAccount"],
            ].map(([label, route]) => (
              <Link
                key={route}
                title={`${label}  →`}
                onPress={() => nav.navigate(route as "EditProfile")}
              />
            ))}
          </Card>
          <Card>
            <Link
              title="Bantuan & tentang aplikasi →"
              onPress={() => nav.navigate("Policy", { kind: "help" })}
            />
            <Link
              title="Privacy Policy →"
              onPress={() => nav.navigate("Policy", { kind: "privacy" })}
            />
            <Link
              title="Terms →"
              onPress={() => nav.navigate("Policy", { kind: "terms" })}
            />
            <Button
              title="Keluar"
              secondary
              disabled={a.busy}
              onPress={() => void a.run(() => auth.signOut())}
            />
          </Card>
          {mode === "demo" && (
            <Card>
              <Badge>DEMO</Badge>
              <T muted>
                Uji alur owner baru. Aksi ini mengosongkan data demo lokal dan
                tidak memengaruhi Supabase.
              </T>
              <Button
                title="Mulai demo owner baru"
                secondary
                onPress={() =>
                  void a.run(
                    () => profile.resetDemo!(),
                    () => nav.navigate("Onboarding"),
                  )
                }
              />
            </Card>
          )}
        </>
      )}
      <Feedback text={a.error} error />
    </Page>
  );
}
export function EditProfileScreen({ navigation }: Props<"EditProfile">) {
  const { profile } = useRepositories();
  const q = useLoad(useCallback(() => profile.get(), [profile]));
  return (
    <Page title="Ubah profil">
      <Load {...q} />
      {q.data && (
        <ProfileEditor value={q.data} done={() => navigation.goBack()} />
      )}
    </Page>
  );
}
function ProfileEditor({ value, done }: { value: Profile; done: () => void }) {
  const { profile } = useRepositories();
  const a = useAction();
  const [name, setName] = useState(value.full_name);
  const [phone, setPhone] = useState(value.phone);
  const [address, setAddress] = useState(value.address);
  return (
    <Card>
      <Field label="Nama lengkap" value={name} onChange={setName} />
      <Field label="Alamat" value={address} onChange={setAddress} multiline />
      <Field label="Nomor telepon" value={phone} onChange={setPhone} />
      <Feedback text={a.error} error />
      <Button
        title="Simpan identitas"
        disabled={a.busy}
        onPress={() =>
          void a.run(
            () => profile.save({ full_name: name, phone, address }),
            done,
          )
        }
      />
    </Card>
  );
}
export function OnboardingScreen({ navigation }: Props<"Onboarding">) {
  const { profile, support } = useRepositories();
  const q = useLoad(useCallback(() => profile.get(), [profile]));
  const a = useAction();
  const [step, setStep] = useState(0);
  const [evidence, setEvidence] = useState("");
  const pick = (camera: boolean) =>
    void a.run(
      async () => {
        const image = await chooseImage(camera);
        if (image)
          setEvidence(
            await support.upload({ ...image, purpose: "verification" }),
          );
      },
      undefined,
      "Bukti dummy siap.",
    );
  return (
    <Page title="Data diri">
      <Row>
        {["Scan KTP", "Identitas", "Data kos"].map((label, i) => (
          <View key={label} style={{ alignItems: "center", gap: 7, flex: 1 }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 20,
                backgroundColor: i <= step ? C.orange : C.navy,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <T style={{ color: C.white, fontWeight: "800" }}>{i + 1}</T>
            </View>
            <T style={{ fontSize: 11 }}>{label}</T>
          </View>
        ))}
      </Row>
      {step === 0 && (
        <Card>
          <Title>Bukti verifikasi dummy</Title>
          <T muted>
            Gunakan contoh dokumen uji. Foto ini ditinjau admin; aplikasi tidak
            melakukan OCR atau verifikasi KTP otomatis.
          </T>
          {evidence ? (
            <Photo path={evidence} height={240} />
          ) : (
            <View
              style={{
                height: 210,
                backgroundColor: C.soft,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <T muted>Tempatkan dokumen uji di sini</T>
            </View>
          )}
          <Row>
            <Button
              title="Galeri"
              secondary
              disabled={a.busy}
              onPress={() => pick(false)}
            />
            <Button
              title="Kamera"
              secondary
              disabled={a.busy}
              onPress={() => pick(true)}
            />
          </Row>
          <Button
            title="Lanjut"
            disabled={!evidence || a.busy}
            onPress={() => setStep(1)}
          />
        </Card>
      )}
      {step === 1 && (
        <>
          <Load {...q} />
          {q.data && (
            <ProfileEditor
              value={q.data}
              done={() =>
                void a.run(
                  async () => {
                    await profile.acceptPolicies();
                    await profile.submitVerification(evidence);
                  },
                  () => setStep(2),
                  "Verifikasi diajukan.",
                )
              }
            />
          )}
          <T muted style={{ fontSize: 11 }}>
            Dengan mengirim, Anda menyetujui Privacy Policy dan Terms demo.
            Tidak diperlukan rekening submerchant; payout hanya simulasi.
          </T>
          <Link
            title="Baca kebijakan"
            onPress={() => navigation.navigate("Policy", { kind: "privacy" })}
          />
        </>
      )}
      {step === 2 && (
        <Card>
          <Badge>MENUNGGU VERIFIKASI</Badge>
          <Title>Siap menambahkan kos.</Title>
          <T muted>
            Profil dikirim ke admin. Sambil menunggu, isi data kos, tipe kamar,
            kapasitas, dan paket sewanya.
          </T>
          <Button
            title="Isi data kos"
            onPress={() => navigation.navigate("PropertyForm", {})}
          />
        </Card>
      )}
      <Feedback text={a.error} error />
      <Feedback text={a.message} />
    </Page>
  );
}
export function PasswordScreen() {
  const { auth } = useRepositories();
  const a = useAction();
  const [p, setP] = useState("");
  const [confirm, setConfirm] = useState("");
  return (
    <Page title="Ubah password">
      <Card>
        <Field label="Password baru" value={p} onChange={setP} secure />
        <Field
          label="Ulangi password baru"
          value={confirm}
          onChange={setConfirm}
          secure
        />
        <Feedback text={a.error} error />
        <Feedback text={a.message} />
        <Button
          title="Perbarui password"
          disabled={a.busy}
          onPress={() =>
            void a.run(async () => {
              if (p.length < 8 || p !== confirm)
                throw new Error(
                  "Minimal 8 karakter dan kedua password harus sama.",
                );
              await auth.changePassword(p);
              setP("");
              setConfirm("");
            })
          }
        />
      </Card>
    </Page>
  );
}
export function DeleteAccountScreen() {
  const { profile } = useRepositories();
  const a = useAction();
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  return (
    <Page title="Penghapusan akun">
      <Card>
        <Title>Ajukan penghapusan akun</Title>
        <T>
          Admin akan memeriksa booking, refund, dan kewajiban yang masih
          berjalan sebelum memproses penghapusan serta anonimisasi data.
        </T>
        <T muted>
          Permintaan ini berlaku untuk identitas bersama di aplikasi pencari kos
          dan owner. Riwayat transaksi yang wajib dipertahankan akan ditangani
          sesuai kebijakan demo.
        </T>
        <Field
          label="Alasan penghapusan"
          value={reason}
          onChange={setReason}
          multiline
        />
        <Toggle
          label="Saya memahami dampaknya"
          value={confirmed}
          onChange={setConfirmed}
        />
        <Button
          title="Kirim permintaan penghapusan"
          danger
          disabled={!confirmed || a.busy}
          onPress={() =>
            void a.run(
              () => profile.requestDeletion(reason),
              undefined,
              "Permintaan penghapusan dikirim untuk ditinjau admin.",
            )
          }
        />
        <Feedback text={a.error} error />
        <Feedback text={a.message} />
      </Card>
    </Page>
  );
}
export function PolicyScreen({ route }: Props<"Policy">) {
  const kind = route.params.kind;
  return (
    <Page
      title={
        kind === "privacy"
          ? "Privacy Policy"
          : kind === "terms"
            ? "Terms"
            : "Bantuan & tentang"
      }
    >
      <Badge>DEMO AKADEMIK • V2.0</Badge>
      {(kind === "privacy"
        ? [
            [
              "Data yang disimpan",
              "Profil, kos, bukti dummy, komunikasi, metadata panggilan, notifikasi, serta transaksi simulasi digunakan untuk menjalankan layanan. Gambar privat menggunakan akses terbatas dan URL sementara.",
            ],
            [
              "Privasi komunikasi",
              "Percakapan hanya dapat diakses peserta. Admin menangani bukti laporan terbatas. Tidak ada perekaman audio/video atau transkrip. Catatan pribadi pencari kos tidak dapat dibaca owner.",
            ],
            [
              "Hak Anda",
              "Ubah profil dari menu akun. Penghapusan dapat diminta dari Profil; kewajiban booking dan transaksi perlu diselesaikan terlebih dahulu. Hubungi pengelola proyek untuk koreksi atau pertanyaan data.",
            ],
          ]
        : kind === "terms"
          ? [
              [
                "Penggunaan demo",
                "Gunakan akun dan dokumen uji. Badge terverifikasi adalah pemeriksaan administratif proyek kuliah, bukan jaminan identitas atau kualitas kos di dunia nyata.",
              ],
              [
                "Pembayaran simulasi",
                "Semua pembayaran dan payout berlabel DEMO / SANDBOX PAYMENT. Jangan membayar virtual account/QR sandbox menggunakan uang nyata. Deposit terpisah dari pendapatan sewa.",
              ],
              [
                "Booking & perilaku",
                "Booking confirmed tidak memerlukan persetujuan owner. Pembatalan luar biasa diajukan kepada admin. Jangan menyalahgunakan laporan atau pembatasan. Akhir periode sewa tidak otomatis mengosongkan kamar.",
              ],
            ]
          : [
              [
                "Tentang KosKu Owner",
                "Aplikasi pengelolaan kos untuk proyek kuliah. Pemilik dapat mengelola kos, kamar, harga, booking, chat, dan survei melalui panggilan.",
              ],
              [
                "Kos belum muncul di pencarian",
                "Pastikan profil owner dan properti telah disetujui admin, akun aktif, serta status tayang kos aktif.",
              ],
              [
                "Ketersediaan tidak sesuai",
                "Periksa semua kondisi kamar, hold, dan booking confirmed. Setelah checkout, tandai kamar selesai dibersihkan melalui Inventory.",
              ],
              [
                "Panggilan dan bantuan",
                "Panggilan asli membutuhkan development build, Agora, dan izin kamera/mikrofon. Gunakan voice jika video tidak tersedia. Untuk kasus booking, gunakan permintaan khusus pada detail booking atau hubungi pengelola demo.",
              ],
            ]
      ).map(([title, body]) => (
        <Card key={title}>
          <Title>{title}</Title>
          <T>{body}</T>
        </Card>
      ))}
    </Page>
  );
}
