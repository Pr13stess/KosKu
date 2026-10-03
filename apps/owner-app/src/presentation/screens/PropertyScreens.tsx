import React, { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { useRepositories } from "../../application/RepositoriesProvider";
import { available, Property } from "../../domain/models";
import { Props, useNav } from "../navigation";
import { useLoad } from "../hooks";
import {
  Badge,
  Button,
  C,
  Card,
  Choices,
  date,
  Empty,
  Link,
  Load,
  money,
  Page,
  Photo,
  Row,
  T,
  Title,
} from "../components/UI";
export function PropertyCard({
  property,
  capacity,
}: {
  property: Property;
  capacity?: string;
}) {
  const nav = useNav();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Kelola ${property.name}`}
      onPress={() => nav.navigate("Property", { id: property.id })}
    >
      <Card>
        <Row style={{ alignItems: "flex-start" }}>
          <View style={{ width: 86 }}>
            <Photo path={property.photos[0]} height={88} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <T style={{ fontWeight: "800" }}>{property.name}</T>
            <T muted style={{ fontSize: 11 }}>
              {property.city} · {capacity ?? property.publication_status}
            </T>
            <Badge
              tone={
                property.verification_status === "APPROVED" ? "green" : "orange"
              }
            >
              {property.verification_status === "APPROVED"
                ? "Terverifikasi"
                : property.verification_status}
            </Badge>
            <T style={{ fontSize: 11, color: C.orange, fontWeight: "700" }}>
              Kelola properti →
            </T>
          </View>
        </Row>
      </Card>
    </Pressable>
  );
}
export function HomeScreen() {
  const { properties, profile, mode } = useRepositories();
  const nav = useNav();
  const q = useLoad(
    useCallback(async () => {
      const p = await profile.get();
      const d = await properties.dashboard();
      return { p, d };
    }, [properties, profile]),
  );
  return (
    <Page
      title="KosKu."
      tab="Home"
      back={false}
      action={
        <Pressable
          accessibilityLabel="Notifikasi"
          onPress={() => nav.navigate("Notifications")}
        >
          <T style={{ fontSize: 21 }}>♧</T>
        </Pressable>
      }
    >
      <Row>
        <View>
          <T muted style={{ fontSize: 11, letterSpacing: 1.6 }}>
            RUANG UNTUK BERTUMBUH
          </T>
          <Title>
            Halo, {q.data?.p.full_name.split(" ")[0] ?? "Pemilik"}{" "}
            <T style={{ color: C.orange }}>☀</T>
          </Title>
        </View>
        <Badge tone="navy">OWNER</Badge>
      </Row>
      <Load {...q} />
      {q.data && (
        <>
          <View
            style={{
              backgroundColor: C.navy,
              borderRadius: 22,
              padding: 22,
              gap: 8,
            }}
          >
            <T style={{ color: "#DDDDE6", fontSize: 12 }}>
              Ringkasan properti Anda
            </T>
            <T
              style={{
                color: C.white,
                fontSize: 25,
                fontWeight: "800",
                lineHeight: 32,
              }}
            >
              Kelola kos, lebih mudah.
            </T>
            <T style={{ color: "#C9CAD6", fontSize: 12 }}>
              Semua aktivitas kos dalam satu tempat.
            </T>
            <Row style={{ marginTop: 13 }}>
              <View>
                <T
                  style={{
                    color: C.orange,
                    fontSize: 30,
                    fontWeight: "800",
                    lineHeight: 36,
                  }}
                >
                  {q.data.d.rooms.reduce(
                    (s, r) => s + available(r.inventory),
                    0,
                  )}
                </T>
                <T style={{ color: C.white, fontSize: 11 }}>kamar tersedia</T>
              </View>
              <View
                style={{ height: 38, width: 1, backgroundColor: "#515367" }}
              />
              <View>
                <T
                  style={{
                    color: C.white,
                    fontSize: 24,
                    fontWeight: "800",
                    lineHeight: 32,
                  }}
                >
                  {q.data.d.properties.length}
                </T>
                <T style={{ color: C.white, fontSize: 11 }}>
                  properti dikelola
                </T>
              </View>
            </Row>
          </View>
          <Row>
            <Metric
              title="Booking baru"
              value={String(
                q.data.d.bookings.filter((b) => b.status === "CONFIRMED")
                  .length,
              )}
              icon="▦"
              onPress={() => nav.navigate("Bookings")}
            />
            <Metric
              title="Penerimaan sewa demo"
              value={money(q.data.d.finance.rent_received)}
              icon="↗"
              onPress={() => nav.navigate("Finance")}
            />
          </Row>
          {q.data.p.verification_status !== "APPROVED" && (
            <Card>
              <Badge>{q.data.p.verification_status}</Badge>
              <T>
                Selesaikan verifikasi owner agar kos dapat ditayangkan setelah
                disetujui.
              </T>
              <Button
                title="Lengkapi data owner"
                onPress={() => nav.navigate("Onboarding")}
              />
            </Card>
          )}
          <Row>
            <Title>Properti saya</Title>
            <Link
              title="Lihat semua →"
              onPress={() => nav.navigate("Properties")}
            />
          </Row>
          {q.data.d.properties.length ? (
            q.data.d.properties
              .slice(0, 3)
              .map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  capacity={`${q.data!.d.rooms.filter((r) => r.property_id === p.id).reduce((s, r) => s + available(r.inventory), 0)} kamar tersedia`}
                />
              ))
          ) : (
            <Empty
              title="Kos pertama Anda"
              body="Tambahkan informasi kos, tipe kamar, dan paket sewa untuk mulai mengelola properti."
              action={
                <Button
                  title="Tambahkan kos"
                  onPress={() => nav.navigate("PropertyForm", {})}
                />
              }
            />
          )}
          <Row>
            <Title>Aktivitas terbaru</Title>
            <Badge>{mode === "demo" ? "DATA DEMO" : "TERKINI"}</Badge>
          </Row>
          {q.data.d.activities.length ? (
            q.data.d.activities.slice(0, 4).map((a) => (
              <Card key={a.id}>
                <T style={{ fontWeight: "700", fontSize: 13 }}>{a.title}</T>
                <Row>
                  <T muted style={{ fontSize: 11, flex: 1 }}>
                    {a.body}
                  </T>
                  <T muted style={{ fontSize: 10 }}>
                    {date(a.created_at)}
                  </T>
                </Row>
              </Card>
            ))
          ) : (
            <T muted>Aktivitas akan muncul setelah ada pembaruan.</T>
          )}
        </>
      )}
    </Page>
  );
}
export function Metric({
  title,
  value,
  icon,
  onPress,
}: {
  title: string;
  value: string;
  icon: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flex: 1 }}>
      <Card
        style={{ borderWidth: 1, borderColor: C.line, minHeight: 102, gap: 5 }}
      >
        <T>{icon}</T>
        <T
          style={{
            color: C.orange,
            fontSize: value.length > 8 ? 14 : 20,
            fontWeight: "800",
          }}
        >
          {value}
        </T>
        <T style={{ fontSize: 10 }}>{title}</T>
      </Card>
    </Pressable>
  );
}
export function PropertiesScreen() {
  const { properties } = useRepositories();
  const nav = useNav();
  const q = useLoad(useCallback(() => properties.list(), [properties]));
  return (
    <Page title="Properti saya">
      <Button
        title="+ Tambahkan kos"
        onPress={() => nav.navigate("PropertyForm", {})}
      />
      <Load {...q} />
      {q.data?.map((p) => (
        <PropertyCard key={p.id} property={p} />
      ))}
      {q.data?.length === 0 && (
        <Empty
          title="Belum ada properti"
          body="Mulai dengan menambahkan kos pertama Anda."
        />
      )}
    </Page>
  );
}
export function PropertyScreen({ route }: Props<"Property">) {
  const { properties } = useRepositories();
  const nav = useNav();
  const [tab, setTab] = useState("summary");
  const q = useLoad(useCallback(() => properties.dashboard(), [properties]));
  const p = q.data?.properties.find((p) => p.id === route.params.id);
  const rooms = q.data?.rooms.filter((r) => r.property_id === p?.id) ?? [];
  return (
    <Page title="Kelola properti">
      <Load {...q} />
      {p && (
        <>
          <Photo path={p.photos[0]} height={220} />
          <View style={{ gap: 8 }}>
            <Title>{p.name}</Title>
            <T muted style={{ fontSize: 12 }}>
              {p.address}, {p.city}
            </T>
            <Row style={{ justifyContent: "flex-start" }}>
              <Badge
                tone={p.verification_status === "APPROVED" ? "green" : "orange"}
              >
                {p.verification_status}
              </Badge>
              <Badge tone="navy">{p.publication_status}</Badge>
            </Row>
          </View>
          <Choices
            label="Properti"
            value={tab}
            onChange={setTab}
            options={[
              { value: "summary", label: "Ringkasan" },
              { value: "rooms", label: "Kamar" },
              { value: "bookings", label: "Booking" },
              { value: "reviews", label: "Ulasan" },
            ]}
          />
          {tab === "summary" && (
            <>
              <Row>
                <Metric
                  title="Kamar tersedia"
                  value={String(
                    rooms.reduce((n, r) => n + available(r.inventory), 0),
                  )}
                  icon="▦"
                />
                <Metric
                  title="Tipe kamar"
                  value={String(rooms.length)}
                  icon="⌂"
                />
              </Row>
              <Card>
                <T style={{ fontWeight: "800" }}>Tentang kos</T>
                <T muted>{p.description}</T>
                <T style={{ fontWeight: "700", fontSize: 12 }}>
                  Fasilitas umum
                </T>
                <T>{p.facilities.join(" · ") || "Belum ditambahkan"}</T>
                <T style={{ fontWeight: "700", fontSize: 12 }}>Peraturan</T>
                <T muted>{p.rules}</T>
              </Card>
              <Button
                title="Edit informasi properti"
                onPress={() => nav.navigate("PropertyForm", { property: p })}
              />
              <Button
                title="Kelola tipe kamar"
                secondary
                onPress={() => setTab("rooms")}
              />
            </>
          )}
          {tab === "rooms" && (
            <>
              <Button
                title="+ Tambahkan tipe kamar"
                onPress={() => nav.navigate("RoomForm", { propertyId: p.id })}
              />
              {rooms.map((r) => (
                <Card key={r.id}>
                  <Row>
                    <Title>{r.name}</Title>
                    <Badge>{available(r.inventory)} tersedia</Badge>
                  </Row>
                  <T muted>
                    {r.floor_label} · {r.room_size_m2} m² · KM{" "}
                    {r.bathroom_type === "PRIVATE" ? "dalam" : "bersama"}
                  </T>
                  <T style={{ fontSize: 12 }}>{r.facilities.join(" · ")}</T>
                  <Row>
                    <Link
                      title="Edit tipe"
                      onPress={() =>
                        nav.navigate("RoomForm", { propertyId: p.id, room: r })
                      }
                    />
                    <Link
                      title="Inventory"
                      onPress={() => nav.navigate("Inventory", { room: r })}
                    />
                    <Link
                      title="Paket sewa →"
                      onPress={() => nav.navigate("Plans", { room: r })}
                    />
                  </Row>
                </Card>
              ))}
            </>
          )}
          {tab === "bookings" && (
            <>
              {q.data?.bookings
                .filter((b) => b.property_id === p.id)
                .map((b) => (
                  <Pressable
                    key={b.id}
                    onPress={() => nav.navigate("Booking", { id: b.id })}
                  >
                    <Card>
                      <Row>
                        <T style={{ fontWeight: "700" }}>{b.tenant}</T>
                        <Badge>{b.status}</Badge>
                      </Row>
                      <T muted>
                        {b.booking_code} · {b.room_type_name_snapshot}
                      </T>
                    </Card>
                  </Pressable>
                ))}
              <Link
                title="Buka semua booking →"
                onPress={() => nav.navigate("Bookings")}
              />
            </>
          )}
          {tab === "reviews" && (
            <>
              {q.data?.reviews
                .filter((r) => r.property_id === p.id)
                .map((r) => (
                  <Card key={r.id}>
                    <Row>
                      <T style={{ fontWeight: "700" }}>{r.tenant}</T>
                      <T style={{ color: C.orange }}>★ {r.rating}/5</T>
                    </Row>
                    <Badge tone="green">Penyewa terverifikasi</Badge>
                    <T>{r.review_text}</T>
                    <Link
                      title="Laporkan ulasan"
                      onPress={() =>
                        nav.navigate("Report", {
                          targetType: "REVIEW",
                          targetId: r.id,
                        })
                      }
                    />
                  </Card>
                ))}
              {!q.data?.reviews.some((r) => r.property_id === p.id) && (
                <Empty
                  title="Belum ada ulasan"
                  body="Ulasan penyewa yang telah selesai dan disetujui akan tampil di sini."
                />
              )}
            </>
          )}
        </>
      )}
      {q.data && !p && (
        <Empty
          title="Kos tidak ditemukan"
          body="Properti mungkin sudah tidak dapat diakses."
        />
      )}
    </Page>
  );
}
