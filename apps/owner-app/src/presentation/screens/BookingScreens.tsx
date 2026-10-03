import React, { useCallback, useState } from "react";
import { Pressable } from "react-native";
import { useRepositories } from "../../application/RepositoriesProvider";
import { Props, useNav } from "../navigation";
import { useAction, useLoad } from "../hooks";
import {
  Badge,
  Button,
  Card,
  Choices,
  date,
  Empty,
  Feedback,
  Field,
  Link,
  Load,
  money,
  Page,
  Row,
  T,
  Title,
} from "../components/UI";
export function BookingsScreen() {
  const { bookings } = useRepositories();
  const nav = useNav();
  const [filter, setFilter] = useState("ALL");
  const q = useLoad(useCallback(() => bookings.list(), [bookings]));
  const list = q.data?.filter(
    (b) =>
      filter === "ALL" ||
      (filter === "HISTORY"
        ? ["COMPLETED", "CANCELLED"].includes(b.status)
        : filter === "WAIT"
          ? ["HELD", "PENDING_PAYMENT", "DRAFT"].includes(b.status)
          : b.status === filter),
  );
  return (
    <Page title="Pemesanan" tab="Bookings" back={false}>
      <Title>Setiap kedatangan, terpantau.</Title>
      <Choices
        label="Status booking"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "ALL", label: "Semua" },
          { value: "WAIT", label: "Menunggu bayar" },
          { value: "CONFIRMED", label: "Confirmed" },
          { value: "ACTIVE", label: "Ditempati" },
          { value: "HISTORY", label: "Riwayat" },
        ]}
      />
      <Load {...q} />
      {list?.map((b) => (
        <Pressable
          key={b.id}
          onPress={() => nav.navigate("Booking", { id: b.id })}
        >
          <Card>
            <Row>
              <T style={{ fontWeight: "800" }}>{b.tenant}</T>
              <Badge>{b.status}</Badge>
            </Row>
            <T muted style={{ fontSize: 12 }}>
              {b.property_name_snapshot} · {b.room_type_name_snapshot}
            </T>
            <Row>
              <T style={{ fontSize: 11 }}>{b.booking_code}</T>
              <T style={{ fontSize: 11 }}>Pembayaran: {b.payment_status}</T>
            </Row>
          </Card>
        </Pressable>
      ))}
      {list?.length === 0 && (
        <Empty
          title="Belum ada booking"
          body="Booking sesuai status pilihan akan tampil di sini."
        />
      )}
    </Page>
  );
}
export function BookingScreen({ route }: Props<"Booking">) {
  const { bookings, communication } = useRepositories();
  const nav = useNav();
  const a = useAction();
  const [reason, setReason] = useState("");
  const q = useLoad(useCallback(() => bookings.list(), [bookings]));
  const b = q.data?.find((b) => b.id === route.params.id);
  return (
    <Page title="Detail booking">
      <Load {...q} />
      {b && (
        <>
          <Card>
            <Row>
              <Title>{b.tenant}</Title>
              <Badge>{b.status}</Badge>
            </Row>
            <T>{b.booking_code}</T>
            <T muted>
              {b.property_name_snapshot} · {b.room_type_name_snapshot}
            </T>
            <T muted>Rencana masuk: {date(b.planned_move_in_date)}</T>
            <T>Paket {b.pricing_plan_name_snapshot}</T>
            <Button
              title="Chat penyewa"
              secondary
              disabled={a.busy}
              onPress={() =>
                void a.run(async () => {
                  const conversation = await communication.open(
                    b.property_id,
                    b.user_id,
                  );
                  nav.navigate("Chat", { conversation });
                })
              }
            />
          </Card>
          <Card>
            <Badge>DEMO / SANDBOX PAYMENT</Badge>
            {[
              ["Harga sewa", b.rent_price_snapshot],
              ["DP sewa", b.down_payment_snapshot],
              ["Deposit", b.security_deposit_snapshot],
              ["Sisa sewa saat masuk", b.remaining_rent_snapshot],
            ].map(([k, v]) => (
              <Row key={k}>
                <T style={{ fontSize: 12 }}>{k}</T>
                <T style={{ fontWeight: "700", fontSize: 12 }}>
                  {money(Number(v))}
                </T>
              </Row>
            ))}
            <T>Pembayaran: {b.payment_status}</T>
            <T>Refund: {b.refund_status}</T>
            {b.cancel_note && <Feedback text={b.cancel_note} />}
          </Card>
          {["CONFIRMED", "ACTIVE"].includes(b.status) && (
            <Card>
              <Title>
                {b.status === "CONFIRMED"
                  ? "Konfirmasi kedatangan"
                  : "Selesaikan masa tinggal"}
              </Title>
              <T muted>
                {b.status === "CONFIRMED"
                  ? "Pastikan penyewa sudah datang. Catat penyelesaian sisa sewa dengan owner dalam simulasi."
                  : "Pastikan penyewa benar-benar keluar. Kamar akan dipindahkan ke kondisi dibersihkan."}
              </T>
              <Field
                label="Catatan tindakan"
                value={reason}
                onChange={setReason}
                multiline
              />
              <Button
                title={
                  b.status === "CONFIRMED"
                    ? "Tandai check-in"
                    : "Tandai checkout"
                }
                disabled={a.busy}
                onPress={() =>
                  void a.run(() =>
                    bookings.transition(
                      b.id,
                      b.status === "CONFIRMED" ? "checkin" : "checkout",
                      reason,
                    ),
                  )
                }
              />
              <Button
                title="Ajukan pembatalan khusus ke admin"
                secondary
                disabled={a.busy}
                onPress={() =>
                  void a.run(
                    () => bookings.requestCancellation(b.id, reason),
                    undefined,
                    "Permintaan dikirim. Booking tetap berlaku sampai ditangani admin.",
                  )
                }
              />
              <T muted style={{ fontSize: 11 }}>
                Booking terkonfirmasi tidak memerlukan persetujuan owner.
                Permintaan khusus tidak membatalkan booking otomatis.
              </T>
            </Card>
          )}
          <Feedback text={a.error} error />
          <Feedback text={a.message} />
          <Title>Riwayat status</Title>
          {b.events.map((e, i) => (
            <Card key={i}>
              <Row>
                <Badge tone="navy">{e.to_status}</Badge>
                <T muted style={{ fontSize: 11 }}>
                  {date(e.created_at)}
                </T>
              </Row>
              <T>{e.reason}</T>
            </Card>
          ))}
          <Link
            title="Lihat status permintaan →"
            onPress={() => nav.navigate("Reports")}
          />
        </>
      )}
    </Page>
  );
}
export function FinanceScreen() {
  const { bookings } = useRepositories();
  const q = useLoad(useCallback(() => bookings.finance(), [bookings]));
  return (
    <Page title="Ringkasan keuangan">
      <Badge>DEMO / SANDBOX PAYMENT</Badge>
      <T muted>
        Seluruh nominal adalah simulasi. Tidak ada dana nyata yang dipindahkan.
      </T>
      <Load {...q} />
      {q.data && (
        <>
          <Card>
            {[
              ["Penerimaan sewa (DP/gross sewa)", q.data.rent_received],
              ["Deposit diterima, terpisah", q.data.deposit_held],
              ["Refund berhasil", q.data.refund_amount],
              ["Payout simulasi", q.data.payout_amount],
            ].map(([k, v]) => (
              <Row key={k}>
                <T style={{ flex: 1, fontSize: 12 }}>{k}</T>
                <T style={{ fontWeight: "800" }}>{money(Number(v))}</T>
              </Row>
            ))}
          </Card>
          <T muted style={{ fontSize: 11 }}>
            Penerimaan ditampilkan sebelum refund. Deposit bukan pendapatan.
            Sisa sewa yang dicatat saat check-in tidak dianggap pembayaran
            gateway.
          </T>
          <Title>Transaksi & payout</Title>
          {q.data.items.map((i) => (
            <Card key={i.id}>
              <T>{i.label}</T>
              <Row>
                <T style={{ fontWeight: "800" }}>{money(i.amount)}</T>
                <Badge>{i.status}</Badge>
              </Row>
            </Card>
          ))}
        </>
      )}
    </Page>
  );
}
