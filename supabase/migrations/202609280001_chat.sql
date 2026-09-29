-- ============================================================
-- CHAT: percakapan teks dan gambar (Bagian 9 spesifikasi)
-- Voice/video call tetap di luar cakupan migrasi ini karena
-- memerlukan integrasi Agora di backend (Edge Function terpisah).
-- ============================================================

-- Percakapan dibuat lewat RPC, bukan INSERT langsung dari client,
-- supaya owner_id diambil dari server (tidak dipercayakan ke client)
-- dan pembatasan komunikasi owner terhadap user diperiksa sekali di
-- satu tempat.
create function private.is_communication_blocked(p_owner_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.user_restrictions
    where owner_id = p_owner_id
      and user_id = p_user_id
      and status = 'ACTIVE'
      and block_communication = true
  );
$$;

create function public.start_conversation(p_property_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_conversation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Masuk terlebih dahulu untuk memulai chat.';
  end if;

  select owner_id into v_owner_id
  from public.properties
  where id = p_property_id and deleted_at is null;

  if v_owner_id is null then
    raise exception 'Kos tidak ditemukan atau belum memiliki pemilik.';
  end if;

  if v_owner_id = auth.uid() then
    raise exception 'Tidak dapat memulai chat dengan kos milik sendiri.';
  end if;

  if private.is_communication_blocked(v_owner_id, auth.uid()) then
    raise exception 'Komunikasi dengan pemilik kos ini sedang dibatasi.';
  end if;

  insert into public.conversations (property_id, user_id, owner_id)
  values (p_property_id, auth.uid(), v_owner_id)
  on conflict (property_id, user_id, owner_id)
  do update set updated_at = public.conversations.updated_at
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conversation_id, auth.uid()), (v_conversation_id, v_owner_id)
  on conflict do nothing;

  return v_conversation_id;
end;
$$;

revoke all on function public.start_conversation(uuid) from public;
grant execute on function public.start_conversation(uuid) to authenticated;

-- Kirim pesan tetap lewat INSERT langsung (bukan RPC), diamankan RLS:
-- pengirim wajib peserta percakapan dan sender_id wajib dirinya sendiri.
grant insert on public.messages to authenticated;
create policy messages_insert on public.messages
for insert to authenticated
with check (
  sender_id = auth.uid()
  and private.in_conversation(conversation_id)
);

-- Perbarui waktu aktivitas percakapan setiap ada pesan baru, supaya
-- daftar chat bisa diurutkan tanpa client menulis langsung ke conversations.
create function private.touch_conversation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

create trigger trg_messages_touch_conversation
after insert on public.messages
for each row execute function private.touch_conversation();

-- Bucket privat untuk gambar chat dan publikasi Realtime hanya ada di
-- proyek Supabase asli (schema storage, publication supabase_realtime),
-- tidak di Postgres polos yang dipakai tests/database.test.mjs (PGlite).
-- Keduanya dijalankan lewat blok bersyarat agar migrasi ini tetap valid
-- di kedua lingkungan tanpa mem-fork file migrasi.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    execute $sql$
      insert into storage.buckets (id, name, public)
      values ('chat-images', 'chat-images', false)
      on conflict (id) do nothing
    $sql$;
    -- Path memakai konvensi {conversation_id}/{nama_file}, sehingga
    -- kepemilikan diperiksa dari folder pertama tanpa kolom tambahan.
    execute $sql$
      create policy chat_images_select on storage.objects
      for select to authenticated
      using (
        bucket_id = 'chat-images'
        and private.in_conversation(((storage.foldername(name))[1])::uuid)
      )
    $sql$;
    execute $sql$
      create policy chat_images_insert on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'chat-images'
        and private.in_conversation(((storage.foldername(name))[1])::uuid)
        and owner = auth.uid()
      )
    $sql$;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- Kirim perubahan messages ke peserta yang berhak (disaring lebih
    -- lanjut oleh RLS select messages pada koneksi Realtime).
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
end $$;
