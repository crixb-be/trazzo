import type { TrazzoDB } from "@/lib/offline/db";
import {
  getActiveDatabase,
  getActiveWorkspaceId,
  GUEST_WORKSPACE,
  subscribeWorkspace,
} from "@/lib/offline/workspace";
import { createClient } from "@/lib/supabase/client";
import { ownerAccountReason, type OwnerReason } from "./owner";
import { resolveEffectivePlan, type Plan } from "./plans";

/**
 * Single source of truth for "which plan is this device on?".
 *
 * The profile is fetched from Supabase when there is a connection and cached in
 * IndexedDB, so a paying user keeps their plan on site with no signal. The
 * cached row is re-evaluated on every read: an expired subscription drops to
 * Gratis even while offline.
 */
export interface CachedPlanProfile {
  userId: string;
  email: string | null;
  plan: string;
  studentVerified: boolean;
  expiresAt: string | null;
  fetchedAt: string;
}

export interface PlanSnapshot {
  plan: Plan;
  /** "local": no backend configured. "account": accounts are available. */
  mode: "local" | "account";
  signedIn: boolean;
  owner: boolean;
  ownerReason: OwnerReason | null;
  ownerPreviewFree: boolean;
  userId: string | null;
  email: string | null;
  studentVerified: boolean;
  expiresAt: string | null;
  source: "network" | "cache" | "none";
}

const CACHE_KEY = "plan:profile";
const MEMO_MS = 30_000;
const OWNER_PREVIEW_KEY = "trazzo:owner-preview-free";
let previewOverride: boolean | undefined;

function readOwnerPreview(): boolean {
  try {
    return previewOverride ?? window.localStorage.getItem(OWNER_PREVIEW_KEY) === "true";
  } catch {
    return previewOverride ?? false;
  }
}

export function setOwnerPreviewFree(enabled: boolean): void {
  try {
    window.localStorage.setItem(OWNER_PREVIEW_KEY, String(enabled));
    previewOverride = undefined;
  } catch {
    previewOverride = enabled;
  }
  invalidatePlanSnapshot();
}

export const LOCAL_SNAPSHOT: PlanSnapshot = {
  plan: "free",
  mode: "local",
  signedIn: false,
  owner: false,
  ownerReason: null,
  ownerPreviewFree: false,
  userId: null,
  email: null,
  studentVerified: false,
  expiresAt: null,
  source: "none",
};

export const SIGNED_OUT_SNAPSHOT: PlanSnapshot = { ...LOCAL_SNAPSHOT, mode: "account" };

export function snapshotFromProfile(
  profile: CachedPlanProfile,
  source: PlanSnapshot["source"],
  now = new Date(),
): PlanSnapshot {
  const ownerReason = ownerAccountReason({ email: profile.email, signedIn: true });
  const owner = ownerReason !== null;
  const ownerPreviewFree = owner && readOwnerPreview();
  return {
    plan: owner
      ? ownerPreviewFree
        ? "free"
        : "pro"
      : resolveEffectivePlan(
          {
            plan: profile.plan,
            student_verified: profile.studentVerified,
            subscription_expires_at: profile.expiresAt,
          },
          now,
        ),
    mode: "account",
    signedIn: true,
    owner,
    ownerReason,
    ownerPreviewFree,
    userId: profile.userId,
    email: profile.email,
    studentVerified: profile.studentVerified,
    expiresAt: profile.expiresAt,
    source,
  };
}

export function parseCachedProfile(raw: string | undefined): CachedPlanProfile | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CachedPlanProfile>;
    if (typeof value.userId !== "string" || typeof value.plan !== "string") return null;
    return {
      userId: value.userId,
      email: typeof value.email === "string" ? value.email : null,
      plan: value.plan,
      studentVerified: value.studentVerified === true,
      expiresAt: typeof value.expiresAt === "string" ? value.expiresAt : null,
      fetchedAt: typeof value.fetchedAt === "string" ? value.fetchedAt : "",
    };
  } catch {
    return null;
  }
}

async function readCache(local: TrazzoDB): Promise<CachedPlanProfile | null> {
  try {
    return parseCachedProfile((await local.meta.get(CACHE_KEY))?.value);
  } catch {
    return null;
  }
}

async function writeCache(local: TrazzoDB, profile: CachedPlanProfile): Promise<void> {
  try {
    await local.meta.put({ key: CACHE_KEY, value: JSON.stringify(profile) });
  } catch {
    // The cache is best effort; the plan still resolves from the network.
  }
}

async function fetchSnapshot(workspaceId: string): Promise<PlanSnapshot> {
  const client = createClient();
  if (!client) return LOCAL_SNAPSHOT;

  if (workspaceId === GUEST_WORKSPACE) return SIGNED_OUT_SNAPSHOT;
  const local = getActiveDatabase();
  const entry = await readCache(local);
  const cached = entry?.userId === workspaceId ? entry : null;
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  let user: { id: string; email?: string } | null = null;
  let sessionFailed = false;
  try {
    // getSession reads the stored session; it only touches the network to
    // refresh an expired token, which fails (not signs out) without signal.
    const { data, error } = await client.auth.getSession();
    if (error) sessionFailed = true;
    user = data.session?.user ?? null;
  } catch {
    sessionFailed = true;
  }

  if (!user) {
    if ((sessionFailed || offline) && cached) return snapshotFromProfile(cached, "cache");
    return SIGNED_OUT_SNAPSHOT;
  }
  if (user.id !== workspaceId || local !== getActiveDatabase()) return SIGNED_OUT_SNAPSHOT;

  const fallback: CachedPlanProfile = {
    userId: user.id,
    email: user.email ?? null,
    plan: "free",
    studentVerified: false,
    expiresAt: null,
    fetchedAt: "",
  };

  try {
    const { data, error } = await client
      .from("profiles")
      .select("plan,student_verified,subscription_expires_at")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;
    const profile: CachedPlanProfile = {
      ...fallback,
      plan: typeof data?.plan === "string" ? data.plan : "free",
      studentVerified: data?.student_verified === true,
      expiresAt:
        typeof data?.subscription_expires_at === "string" ? data.subscription_expires_at : null,
      fetchedAt: new Date().toISOString(),
    };
    if (local === getActiveDatabase()) await writeCache(local, profile);
    return snapshotFromProfile(profile, "network");
  } catch {
    const profile = cached ? { ...cached, email: fallback.email } : fallback;
    return snapshotFromProfile(profile, cached ? "cache" : "none");
  }
}

let inflight: Promise<PlanSnapshot> | null = null;
let memo: { at: number; value: PlanSnapshot } | null = null;
const listeners = new Set<() => void>();

export function subscribePlanSnapshot(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function peekPlanSnapshot(): PlanSnapshot | null {
  return memo?.value ?? null;
}

/** Resolves the current plan; concurrent callers share one request. */
export function loadPlanSnapshot(force = false): Promise<PlanSnapshot> {
  if (!force && memo && Date.now() - memo.at < MEMO_MS) return Promise.resolve(memo.value);
  if (inflight) return inflight;
  const request = fetchSnapshot(getActiveWorkspaceId())
    .then((value) => {
      if (inflight === request) memo = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      if (inflight === request) inflight = null;
    });
  inflight = request;
  return request;
}

export function invalidatePlanSnapshot(): void {
  memo = null;
  inflight = null;
  for (const listener of listeners) listener();
}

subscribeWorkspace(invalidatePlanSnapshot);
