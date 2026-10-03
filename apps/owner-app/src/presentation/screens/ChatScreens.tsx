import React, { useCallback, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import * as Crypto from "expo-crypto";
import { useRepositories } from "../../application/RepositoriesProvider";
import { Restriction } from "../../domain/models";
import { Props, useNav } from "../navigation";
import { useAction, useLoad } from "../hooks";
import { chooseImage } from "../media";
import {
  Badge,
  Button,
  C,
  Card,
  Choices,
  date,
  Empty,
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
export function ChatListScreen() {
  const { communication } = useRepositories();
  const nav = useNav();
  const q = useLoad(
    useCallback(
      async () => ({
        chats: await communication.conversations(),
        calls: await communication.calls(),
      }),
      [communication],
    ),
    10000,
  );
  return (
    <Page title="Percakapan" tab="ChatList" back={false}>
      <Title>Terhubung dengan penghuni.</Title>
      <Load {...q} />
      {q.data?.chats.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => nav.navigate("Chat", { conversation: c })}
        >
          <Card>
            <Row>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 23,
                  backgroundColor: C.soft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <T style={{ fontWeight: "800", fontSize: 20 }}>
                  {c.tenant.slice(0, 1)}
                </T>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <T style={{ fontWeight: "800" }}>{c.tenant}</T>
                <T muted style={{ fontSize: 11 }}>
                  {c.property_name}
                </T>
              </View>
              {c.unread > 0 && <Badge>{c.unread}</Badge>}
            </Row>
            <T muted style={{ fontSize: 12 }}>
              {c.last_message || "Mulai percakapan"}
            </T>
          </Card>
        </Pressable>
      ))}
      {q.data?.chats.length === 0 && (
        <Empty
          title="Belum ada percakapan"
          body="Calon penghuni dapat menghubungi Anda dari halaman kos di aplikasi pencari kos."
        />
      )}
      <Title>Riwayat panggilan</Title>
      {q.data?.calls.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => nav.navigate("Call", { id: c.id })}
        >
          <Card>
            <Row>
              <T>
                {c.call_type === "VOICE"
                  ? "Panggilan suara"
                  : "Panggilan video"}
              </T>
              <Badge tone="navy">{c.status}</Badge>
            </Row>
            <T muted style={{ fontSize: 11 }}>
              {date(c.created_at)} · {c.duration_seconds} detik
            </T>
          </Card>
        </Pressable>
      ))}
    </Page>
  );
}
export function ChatScreen({ route, navigation }: Props<"Chat">) {
  const { communication, support, session } = useRepositories();
  const c = route.params.conversation;
  const a = useAction();
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const clientId = useRef(Crypto.randomUUID());
  const q = useLoad(
    useCallback(() => communication.messages(c.id), [communication, c.id]),
    5000,
  );
  const send = () =>
    void a.run(
      async () => {
        await communication.send(c.id, text, image, clientId.current);
        clientId.current = Crypto.randomUUID();
        setText("");
        setImage("");
      },
      undefined,
      "",
    );
  const pick = (camera: boolean) =>
    void a.run(
      async () => {
        const image = await chooseImage(camera);
        if (image)
          setImage(
            await support.upload({
              ...image,
              purpose: "chat",
              context_id: c.id,
            }),
          );
      },
      undefined,
      "Foto siap dikirim.",
    );
  return (
    <Page title={c.tenant}>
      <T muted>{c.property_name}</T>
      <Row>
        <Button
          title="Suara"
          secondary
          disabled={a.busy}
          onPress={() =>
            void a.run(async () => {
              const call = await communication.startCall(c.id, "VOICE");
              navigation.navigate("Call", { id: call.id });
            })
          }
        />
        <Button
          title="Video"
          secondary
          disabled={a.busy}
          onPress={() =>
            void a.run(async () => {
              const call = await communication.startCall(c.id, "VIDEO");
              navigation.navigate("Call", { id: call.id });
            })
          }
        />
        <Link
          title="Atur"
          onPress={() =>
            navigation.navigate("Restrictions", { conversation: c })
          }
        />
      </Row>
      <Load {...q} />
      {q.data?.map((m) => (
        <View
          key={m.id}
          style={{
            alignSelf: m.sender_id === session?.id ? "flex-end" : "flex-start",
            width: m.message_type === "IMAGE" ? "82%" : undefined,
            maxWidth: "88%",
            backgroundColor: m.sender_id === session?.id ? "#FFF0DB" : C.white,
            padding: 14,
            borderRadius: 17,
            gap: 5,
          }}
        >
          {m.message_type === "IMAGE" ? (
            <Photo path={m.storage_path} height={180} />
          ) : (
            <T style={{ fontSize: 13 }}>{m.text_content}</T>
          )}
          <T muted style={{ fontSize: 9 }}>
            {new Date(m.created_at).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </T>
        </View>
      ))}
      <Card>
        {image && (
          <>
            <Photo path={image} height={150} />
            <Link title="Batal lampiran" onPress={() => setImage("")} />
          </>
        )}
        <Field
          label="Pesan"
          value={text}
          onChange={setText}
          placeholder="Tulis pesan…"
          multiline
        />
        <Row>
          <Link title="Galeri" onPress={() => pick(false)} />
          <Link title="Kamera" onPress={() => pick(true)} />
          <Button
            title={a.error ? "Coba kirim lagi" : "Kirim"}
            disabled={a.busy || (!text.trim() && !image)}
            onPress={send}
          />
        </Row>
        <Feedback text={a.error} error />
      </Card>
      <Link
        title="Laporkan pengguna"
        onPress={() =>
          navigation.navigate("Report", {
            targetType: "USER",
            targetId: c.user_id,
          })
        }
      />
    </Page>
  );
}
export function RestrictionsScreen({ route }: Props<"Restrictions">) {
  const { communication } = useRepositories();
  const q = useLoad(
    useCallback(() => communication.restrictions(), [communication]),
  );
  return (
    <Page title="Pembatasan pengguna">
      <Title>{route.params.conversation.tenant}</Title>
      <Load {...q} />
      {q.data && (
        <RestrictionForm
          key={JSON.stringify(q.data)}
          initial={
            q.data.find(
              (r) =>
                r.user_id === route.params.conversation.user_id &&
                r.status === "ACTIVE",
            ) ?? {
              id: "",
              user_id: route.params.conversation.user_id,
              block_communication: false,
              block_booking: false,
              reason: "SPAM",
              notes: "",
              status: "ACTIVE",
            }
          }
        />
      )}
    </Page>
  );
}
function RestrictionForm({ initial }: { initial: Restriction }) {
  const { communication } = useRepositories();
  const a = useAction();
  const [r, setR] = useState(initial);
  return (
    <Card>
      <Toggle
        label="Cegah komunikasi baru"
        value={r.block_communication}
        onChange={(v) => setR({ ...r, block_communication: v })}
      />
      <Toggle
        label="Cegah booking baru"
        value={r.block_booking}
        onChange={(v) => setR({ ...r, block_booking: v })}
      />
      <Choices
        label="Alasan"
        value={r.reason}
        onChange={(v) => setR({ ...r, reason: v })}
        options={[
          { value: "SPAM", label: "Spam" },
          { value: "BAD_BEHAVIOR", label: "Perilaku buruk" },
          { value: "OTHER", label: "Lainnya" },
        ]}
      />
      <Field
        label="Catatan alasan"
        value={r.notes}
        onChange={(v) => setR({ ...r, notes: v })}
        multiline
      />
      <T muted style={{ fontSize: 12 }}>
        Pembatasan berlaku untuk kos Anda. Booking confirmed/active dan riwayat
        transaksi tetap berlaku.
      </T>
      <Button
        title="Simpan pembatasan"
        disabled={a.busy}
        onPress={() => void a.run(() => communication.restrict(r))}
      />
      {initial.id && (
        <Button
          title="Cabut pembatasan"
          secondary
          disabled={a.busy}
          onPress={() =>
            void a.run(() =>
              communication.restrict({ ...r, status: "REVOKED" }),
            )
          }
        />
      )}
      <Feedback text={a.error} error />
      <Feedback text={a.message} />
    </Card>
  );
}
