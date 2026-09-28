import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { MockAuthRepository } from "../apps/user-app/src/data/mock/MockAuthRepository.ts";
import { SupabaseAuthRepository } from "../apps/user-app/src/data/supabase/SupabaseAuthRepository.ts";

test("Mock auth: signup opens a session, wrong password is rejected, signout clears it", async () => {
  const auth = new MockAuthRepository();
  const seen = [];
  const off = auth.onChange((s) => seen.push(s?.user.email ?? null));
  await assert.rejects(auth.signUp("a@b.co", "123"), /minimal 6/);
  await auth.signUp("A@b.co", "secret1");
  assert.equal((await auth.getSession()).user.email, "a@b.co");
  await assert.rejects(auth.signUp("a@b.co", "secret1"), /sudah terdaftar/);
  await auth.signOut();
  assert.equal(await auth.getSession(), null);
  await assert.rejects(auth.signIn("a@b.co", "salah"), /salah/);
  await auth.signIn("a@b.co", "secret1");
  assert.equal((await auth.getSession()).user.email, "a@b.co");
  off();
  assert.deepEqual(seen, [null, "a@b.co", null, "a@b.co"]);
});

test("Supabase auth adapter uses real SDK requests and maps errors", async () => {
  const calls = [];
  const fetch = async (input, options) => {
    const url = new URL(String(input));
    calls.push({ url, body: options?.body ? JSON.parse(options.body) : null });
    if (url.pathname.endsWith("/token")) {
      const body = JSON.parse(options.body);
      if (body.password !== "benar123")
        return new Response(
          JSON.stringify({ error_description: "Invalid login credentials", error: "invalid_grant" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      return new Response(
        JSON.stringify({
          access_token: "a", token_type: "bearer", expires_in: 3600, refresh_token: "r",
          user: { id: "00000000-0000-4000-8000-000000000009", email: "u@kosku.invalid", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    throw new Error("Unexpected API request");
  };
  const client = createClient("https://fixture.invalid", "test-public-key", {
    global: { fetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const auth = new SupabaseAuthRepository(client);
  await assert.rejects(auth.signIn("u@kosku.invalid", "salah"), /Invalid login credentials/);
  await auth.signIn("u@kosku.invalid", "benar123");
  assert.equal(calls.at(-1).url.searchParams.get("grant_type"), "password");
  assert.equal((await auth.getSession()).user.email, "u@kosku.invalid");
  await auth.signOut().catch(() => {});
});
