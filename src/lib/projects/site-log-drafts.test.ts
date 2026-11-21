import { expect, it, vi } from "vitest";
import {
  clearSiteLogDraft,
  readSiteLogDraft,
  siteLogDraftKey,
  storeSiteLogDraft,
} from "./site-log-drafts";

const edit = {
  version: "2026-11-20T00:00:00Z",
  draft: {
    projectId: "project",
    visitType: "visita" as const,
    visitDate: "",
    attendees: "",
    workStatus: "",
    findings: "Se revisó el replanteo",
    orders: "",
    followUp: "",
    topics: [],
    photos: [],
  },
};

function memoryStorage() {
  const rows = new Map<string, string>();
  return {
    getItem: (key: string) => rows.get(key) ?? null,
    setItem: (key: string, value: string) => rows.set(key, value),
    removeItem: (key: string) => rows.delete(key),
  };
}

it("recovers incomplete drafts by log id or new-entry project and clears only that draft", () => {
  const storage = memoryStorage();
  const entry = siteLogDraftKey("log", "project");
  const fresh = siteLogDraftKey(undefined, "project");
  storeSiteLogDraft(entry, edit, storage);
  storeSiteLogDraft(fresh, edit, storage);
  expect(readSiteLogDraft(siteLogDraftKey("log", null), storage)).toEqual(edit);
  expect(readSiteLogDraft(siteLogDraftKey(undefined, null), storage)).toBeNull();
  clearSiteLogDraft(entry, storage);
  expect(readSiteLogDraft(entry, storage)).toBeNull();
  expect(readSiteLogDraft(fresh, storage)).toEqual(edit);
});

it("handles corrupt or unavailable storage", () => {
  const storage = memoryStorage();
  storage.setItem("invalid", "{");
  expect(readSiteLogDraft("invalid", storage)).toBeNull();
  storage.setItem("invalid", JSON.stringify({ draft: { visitType: "otro" } }));
  expect(readSiteLogDraft("invalid", storage)).toBeNull();
  const fail = vi.fn(() => {
    throw new Error("storage unavailable");
  });
  const blocked = { getItem: fail, setItem: fail, removeItem: fail };
  expect(readSiteLogDraft("key", blocked)).toBeNull();
  expect(() => storeSiteLogDraft("key", edit, blocked)).not.toThrow();
  expect(() => clearSiteLogDraft("key", blocked)).not.toThrow();
});
