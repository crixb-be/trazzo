import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LOCAL_SNAPSHOT,
  setOwnerPreviewFree,
  SIGNED_OUT_SNAPSHOT,
  snapshotFromProfile,
  type CachedPlanProfile,
} from "./plan-store";

const profile: CachedPlanProfile = {
  userId: "test-user",
  email: "owner@example.test",
  plan: "free",
  studentVerified: false,
  expiresAt: null,
  fetchedAt: "",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("snapshotFromProfile", () => {
  it("forces Pro for an owner even with an expired subscription", () => {
    vi.stubEnv("NEXT_PUBLIC_TRAZZO_OWNER_EMAILS", "OWNER@example.test");
    expect(
      snapshotFromProfile(
        { ...profile, plan: "pro", expiresAt: "2020-01-01T00:00:00Z" },
        "cache",
        new Date("2026-01-01"),
      ),
    ).toMatchObject({ plan: "pro", owner: true, ownerReason: "email", ownerPreviewFree: false });
  });

  it("grants Pro to a profile with plan 'pro' in Supabase without owner access", () => {
    vi.stubEnv("NEXT_PUBLIC_TRAZZO_OWNER_EMAILS", "");
    expect(snapshotFromProfile({ ...profile, plan: "pro" }, "network")).toMatchObject({
      plan: "pro",
      owner: false,
    });
  });

  it("is not an owner without a listed email and never marks guests as owners", () => {
    vi.stubEnv("NEXT_PUBLIC_TRAZZO_OWNER_EMAILS", "");
    expect(snapshotFromProfile(profile, "none")).toMatchObject({
      plan: "free",
      owner: false,
      ownerReason: null,
    });
    expect(LOCAL_SNAPSHOT.owner).toBe(false);
    expect(SIGNED_OUT_SNAPSHOT.owner).toBe(false);
  });

  it("persists the preview and applies it only to the owner", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        setItem: (key: string, value: string) => storage.set(key, value),
        getItem: (key: string) => storage.get(key),
      },
    });
    vi.stubEnv("NEXT_PUBLIC_TRAZZO_OWNER_EMAILS", "owner@example.test");
    setOwnerPreviewFree(true);
    expect(storage.get("trazzo:owner-preview-free")).toBe("true");
    expect(snapshotFromProfile({ ...profile, plan: "pro" }, "network")).toMatchObject({
      plan: "free",
      owner: true,
      ownerPreviewFree: true,
    });
    expect(snapshotFromProfile({ ...profile, email: null }, "network")).toMatchObject({
      plan: "free",
      owner: false,
      ownerPreviewFree: false,
    });
    expect(
      snapshotFromProfile(
        { ...profile, email: null, plan: "student", studentVerified: true },
        "network",
      ),
    ).toMatchObject({ plan: "student", owner: false, ownerPreviewFree: false });
    setOwnerPreviewFree(false);
    expect(snapshotFromProfile(profile, "network").plan).toBe("pro");
  });
});
