import React, { useCallback, useState } from "react";
import { Pressable } from "react-native";
import { useRepositories } from "../../application/RepositoriesProvider";
import {
  available,
  costs,
  Inventory,
  Plan,
  Room,
  validateInventory,
} from "../../domain/models";
import { Props } from "../navigation";
import { useAction, useLoad } from "../hooks";
import {
  Badge,
  Button,
  C,
  Card,
  Choices,
  Feedback,
  Field,
  Link,
  Load,
  money,
  Page,
  Row,
  T,
  Title,
  Toggle,
} from "../components/UI";
export function RoomFormScreen({ route, navigation }: Props<"RoomForm">) {
  const { rooms } = useRepositories();
  const a = useAction();
  const [r, setR] = useState<Room>(
    route.params.room ?? {
      id: "",
      property_id: route.params.propertyId,
      name: "",
      floor_label: "Lantai 1",
      room_size_m2: 12,
      bathroom_type: "SHARED",
      description: "",
      is_active: true,
      facilities: [],
      inventory: {
        total: 0,
        occupied: 0,
        cleaning: 0,
        maintenance: 0,
        inactive: 0,
        hold: 0,
        reserved: 0,
        version: 1,
      },
    },
  );
  const set = <K extends keyof Room>(k: K, v: Room[K]) =>
    setR((s) => ({ ...s, [k]: v }));
  return (
    <Page title={r.id ? "Edit tipe kamar" : "Tipe kamar baru"}>
      <Card>
        <Title>Identitas kamar</Title>
        <Field
          label="Nama tipe kamar"
          value={r.name}
          onChange={(v) => set("name", v)}
        />
        <Field
          label="Lantai"
          value={r.floor_label}
          onChange={(v) => set("floor_label", v)}
        />
        <Field
          label="Luas kamar (m²)"
          value={String(r.room_size_m2)}
          numeric
          onChange={(v) => set("room_size_m2", Number(v))}
        />
        <Choices
          label="Kamar mandi"
          value={r.bathroom_type}
          options={[
            { value: "PRIVATE", label: "Dalam" },
            { value: "SHARED", label: "Bersama" },
          ]}
          onChange={(v) => set("bathroom_type", v)}
        />
        <Field
          label="Fasilitas kamar (pisahkan koma)"
          value={r.facilities.join(",")}
          onChange={(v) => set("facilities", v.split(","))}
        />
        <Field
          label="Deskripsi kamar"
          value={r.description}
          onChange={(v) => set("description", v)}
          multiline
        />
        {!r.id && (
          <Field
            label="Total kapasitas awal"
            value={String(r.inventory.total)}
            numeric
            onChange={(v) =>
              set("inventory", { ...r.inventory, total: Number(v) })
            }
          />
        )}
        <Toggle
          label="Tipe kamar aktif"
          value={r.is_active}
          onChange={(v) => set("is_active", v)}
        />
      </Card>
      <Feedback text={a.error} error />
      <Button
        title="Simpan tipe kamar"
        disabled={a.busy}
        onPress={() =>
          void a.run(
            () =>
              rooms.save({
                ...r,
                facilities: r.facilities.map((v) => v.trim()).filter(Boolean),
              }),
            () => navigation.goBack(),
          )
        }
      />
    </Page>
  );
}
export function InventoryScreen({ route, navigation }: Props<"Inventory">) {
  const { rooms } = useRepositories();
  const a = useAction();
  const q = useLoad(
    useCallback(
      () => rooms.list(route.params.room.property_id),
      [rooms, route.params.room.property_id],
    ),
  );
  const current = q.data?.find((r) => r.id === route.params.room.id);
  return (
    <Page title="Inventory kamar">
      <Load {...q} />
      {current && (
        <InventoryEditor
          key={`${current.id}-${current.inventory.version}`}
          room={current}
          save={(i, reason) =>
            void a.run(
              () => rooms.updateInventory(current.id, i, reason),
              () => navigation.goBack(),
            )
          }
        />
      )}
      <Feedback text={a.error} error />
    </Page>
  );
}
function InventoryEditor({
  room,
  save,
}: {
  room: Room;
  save: (i: Inventory, reason: string) => void;
}) {
  const [i, setI] = useState(room.inventory);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  return (
    <>
      <Title>{room.name}</Title>
      <Card style={{ backgroundColor: C.navy }}>
        <T style={{ color: C.white }}>Kamar tersedia</T>
        <T
          style={{
            color: C.orange,
            fontSize: 38,
            fontWeight: "800",
            lineHeight: 45,
          }}
        >
          {available(i)}
        </T>
        <T style={{ color: "#D1D2DC", fontSize: 12 }}>
          Dihitung otomatis dari kapasitas dan seluruh alokasi.
        </T>
      </Card>
      <Card>
        {(
          [
            ["total", "Total kapasitas"],
            ["occupied", "Ditempati"],
            ["cleaning", "Dibersihkan"],
            ["maintenance", "Perbaikan"],
            ["inactive", "Dinonaktifkan"],
          ] as const
        ).map(([key, label]) => (
          <Row key={key}>
            <T style={{ flex: 1 }}>{label}</T>
            <Pressable
              accessibilityLabel={`Kurangi ${label}`}
              onPress={() => setI({ ...i, [key]: Math.max(0, i[key] - 1) })}
              style={{ padding: 12, backgroundColor: C.soft, borderRadius: 10 }}
            >
              <T>−</T>
            </Pressable>
            <T style={{ minWidth: 24, textAlign: "center", fontWeight: "800" }}>
              {i[key]}
            </T>
            <Pressable
              accessibilityLabel={`Tambah ${label}`}
              onPress={() => setI({ ...i, [key]: i[key] + 1 })}
              style={{ padding: 12, backgroundColor: C.soft, borderRadius: 10 }}
            >
              <T>+</T>
            </Pressable>
          </Row>
        ))}
        <Row>
          <T muted>Ditahan checkout (sistem)</T>
          <T>{i.hold}</T>
        </Row>
        <Row>
          <T muted>Confirmed (sistem)</T>
          <T>{i.reserved}</T>
        </Row>
      </Card>
      <Field
        label="Alasan penyesuaian"
        value={reason}
        onChange={setReason}
        placeholder="Contoh: satu kamar selesai dibersihkan"
        multiline
      />
      <T muted style={{ fontSize: 12 }}>
        Penyewa dengan booking aktif harus keluar melalui checkout booking.
        Akhir periode sewa tidak mengosongkan kamar otomatis.
      </T>
      <Feedback text={error} error />
      <Button
        title="Simpan inventory"
        onPress={() => {
          try {
            validateInventory(i);
            if (reason.trim().length < 5)
              throw new Error("Catatan minimal 5 karakter.");
            save(i, reason);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
    </>
  );
}
export function PlansScreen({ route, navigation }: Props<"Plans">) {
  const { pricing } = useRepositories();
  const q = useLoad(
    useCallback(
      () => pricing.list(route.params.room.id),
      [pricing, route.params.room.id],
    ),
  );
  return (
    <Page title="Paket sewa">
      <Title>{route.params.room.name}</Title>
      <Button
        title="+ Tambah paket sewa"
        onPress={() =>
          navigation.navigate("PlanForm", { roomId: route.params.room.id })
        }
      />
      <Load {...q} />
      {q.data?.map((p) => (
        <Card key={p.id}>
          <Row>
            <Title>{p.name}</Title>
            <Badge tone={p.is_active ? "green" : "navy"}>
              {p.is_active ? "Aktif" : "Nonaktif"}
            </Badge>
          </Row>
          <T style={{ color: C.orange, fontSize: 22, fontWeight: "800" }}>
            {money(p.price)}
          </T>
          <T muted>
            {p.duration_value}{" "}
            {
              { DAY: "hari", WEEK: "minggu", MONTH: "bulan", YEAR: "tahun" }[
                p.duration_unit
              ]
            }
          </T>
          <T style={{ fontSize: 12 }}>
            DP {money(costs(p).dp)} · Deposit {money(costs(p).deposit)}
          </T>
          <Link
            title="Edit paket →"
            onPress={() =>
              navigation.navigate("PlanForm", {
                roomId: route.params.room.id,
                plan: p,
              })
            }
          />
        </Card>
      ))}
      {q.data?.length === 0 && (
        <T muted>
          Belum ada paket sewa. Tambahkan harga untuk mulai menawarkan tipe
          kamar ini.
        </T>
      )}
    </Page>
  );
}
export function PlanFormScreen({ route, navigation }: Props<"PlanForm">) {
  const { pricing } = useRepositories();
  const a = useAction();
  const [p, setP] = useState<Plan>(
    route.params.plan ?? {
      id: "",
      room_type_id: route.params.roomId,
      name: "",
      duration_unit: "MONTH",
      duration_value: 1,
      price: 0,
      down_payment_type: "NONE",
      down_payment_value: 0,
      security_deposit_type: "NONE",
      security_deposit_value: 0,
      deposit_refundable: true,
      deposit_terms: "",
      is_active: true,
    },
  );
  const set = <K extends keyof Plan>(k: K, v: Plan[K]) =>
    setP((s) => ({ ...s, [k]: v }));
  const types = [
    { value: "NONE", label: "Tidak ada" },
    { value: "FIXED", label: "Nominal" },
    { value: "PERCENTAGE", label: "Persen" },
  ] as const;
  const c = costs(p);
  return (
    <Page title="Paket sewa">
      <Card>
        <Field
          label="Nama paket"
          value={p.name}
          onChange={(v) => set("name", v)}
        />
        <Choices
          label="Periode"
          value={p.duration_unit}
          onChange={(v) => set("duration_unit", v)}
          options={[
            { value: "DAY", label: "Hari" },
            { value: "WEEK", label: "Minggu" },
            { value: "MONTH", label: "Bulan" },
            { value: "YEAR", label: "Tahun" },
          ]}
        />
        <Field
          label="Jumlah periode"
          value={String(p.duration_value)}
          numeric
          onChange={(v) => set("duration_value", Number(v))}
        />
        <Field
          label="Harga sewa (Rp)"
          value={String(p.price)}
          numeric
          onChange={(v) => set("price", Number(v))}
        />
        <Choices
          label="DP booking"
          value={p.down_payment_type}
          options={types}
          onChange={(v) =>
            setP((s) => ({ ...s, down_payment_type: v, down_payment_value: 0 }))
          }
        />
        {p.down_payment_type !== "NONE" && (
          <Field
            label={
              p.down_payment_type === "FIXED" ? "Nominal DP (Rp)" : "DP (%)"
            }
            value={String(p.down_payment_value)}
            numeric
            onChange={(v) => set("down_payment_value", Number(v))}
          />
        )}
        <T muted style={{ fontSize: 11 }}>
          Tanpa DP: seluruh harga sewa dibayar saat booking.
        </T>
        <Choices
          label="Security deposit"
          value={p.security_deposit_type}
          options={types}
          onChange={(v) =>
            setP((s) => ({
              ...s,
              security_deposit_type: v,
              security_deposit_value: 0,
            }))
          }
        />
        {p.security_deposit_type !== "NONE" && (
          <Field
            label={
              p.security_deposit_type === "FIXED"
                ? "Nominal deposit (Rp)"
                : "Deposit (%)"
            }
            value={String(p.security_deposit_value)}
            numeric
            onChange={(v) => set("security_deposit_value", Number(v))}
          />
        )}
        <Toggle
          label="Deposit dapat dikembalikan"
          value={p.deposit_refundable}
          onChange={(v) => set("deposit_refundable", v)}
        />
        <Field
          label="Ketentuan deposit"
          value={p.deposit_terms}
          onChange={(v) => set("deposit_terms", v)}
          multiline
        />
        <Toggle
          label="Paket aktif"
          value={p.is_active}
          onChange={(v) => set("is_active", v)}
        />
      </Card>
      <Card>
        <Badge>SIMULASI BIAYA</Badge>
        {[
          ["Harga sewa", p.price],
          ["DP sewa", c.dp],
          ["Deposit terpisah", c.deposit],
          ["Bayar saat booking", c.pay_now],
          ["Sisa sewa saat masuk", c.remaining],
        ].map(([label, value]) => (
          <Row key={label}>
            <T style={{ fontSize: 12 }}>{label}</T>
            <T style={{ fontWeight: "700", fontSize: 12 }}>
              {money(Number(value))}
            </T>
          </Row>
        ))}
      </Card>
      <Feedback text={a.error} error />
      <Button
        title="Simpan paket"
        disabled={a.busy}
        onPress={() =>
          void a.run(
            () => pricing.save(p),
            () => navigation.goBack(),
          )
        }
      />
    </Page>
  );
}
