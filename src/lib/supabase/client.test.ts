import { createChunks, stringToBase64URL } from "@supabase/ssr";
import { afterEach, expect, it, vi } from "vitest";
import { readStoredWorkspaceUser } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("reads only the cached local identity from the configured project's chunked auth cookie", async () => {
  const user = {
    id: "10000000-0000-4000-a000-000000000001",
    email: "obra@example.test",
    user_metadata: { picture: "https://example.test/profile.jpg" },
  };
  const session = stringToBase64URL(
    JSON.stringify({
      user,
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
    }),
  );
  const chunks = createChunks("sb-workspace-auth-token", "base64-" + session, 80);
  expect(chunks.length).toBeGreaterThan(1);
  const cookie = chunks.map(({ name, value }) => name + "=" + value).join("; ");
  vi.stubGlobal("document", { cookie });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://workspace.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
  expect(await readStoredWorkspaceUser()).toEqual(user);

  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://another.supabase.co");
  expect(await readStoredWorkspaceUser()).toBeNull();
});
