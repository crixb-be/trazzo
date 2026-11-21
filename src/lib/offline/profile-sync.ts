import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudioProfile, TrazzoDB } from "./db";

/**
 * Profile and studio brand ⇄ Supabase (`public.profiles`).
 *
 * The whole profile travels as one row, images included as compressed data URLs,
 * and the newest `updatedAt` wins (last writer wins, per device clock). A local
 * edit marks the profile dirty; the mark is cleared only once Supabase confirms
 * the write, so an offline edit stays queued until the next pass.
 */

/** Meta key holding the `updatedAt` of the last local edit not yet in the cloud. */
export const PROFILE_DIRTY = "profile:dirty";
/** Decoded size limit for each synced image; bigger ones are recompressed first. */
export const MAX_SYNC_IMAGE_BYTES = 150 * 1024;
export const PROFILE_COLUMNS =
  "full_name,cap_number,studio_name,ruc,studio_address,brand_primary,brand_secondary,avatar_data_url,logo_data_url,profile_updated_at";

export interface ProfileRow {
  full_name: string | null;
  cap_number: string | null;
  studio_name: string | null;
  ruc: string | null;
  studio_address: string | null;
  brand_primary: string | null;
  brand_secondary: string | null;
  avatar_data_url: string | null;
  logo_data_url: string | null;
  profile_updated_at: string | null;
}

export type ProfilePlan =
  { action: "push" } | { action: "pull"; profile: StudioProfile } | { action: "none" };

/** Bytes of the payload a data URL encodes (what Storage or Postgres really keeps). */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return dataUrl.length;
  const payload = dataUrl.slice(comma + 1);
  if (!dataUrl.slice(0, comma).includes(";base64")) return decodeURIComponent(payload).length;
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

const time = (value: string | null | undefined): number => {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

/** True when the profile holds anything worth backing up. */
export function hasProfileContent(profile: StudioProfile): boolean {
  return Boolean(
    profile.fullName.trim() ||
    profile.capNumber.trim() ||
    profile.studioName.trim() ||
    profile.ruc.trim() ||
    profile.address.trim() ||
    profile.logoDataUrl ||
    profile.avatarDataUrl,
  );
}

function rowHasContent(row: ProfileRow): boolean {
  return Boolean(
    row.full_name?.trim() ||
    row.cap_number?.trim() ||
    row.studio_name?.trim() ||
    row.ruc?.trim() ||
    row.studio_address?.trim() ||
    row.avatar_data_url ||
    row.logo_data_url,
  );
}

export function profileToRow(
  profile: StudioProfile,
  images: { avatar: string | null | undefined; logo: string | null | undefined },
): Partial<ProfileRow> {
  const row: Partial<ProfileRow> = {
    full_name: profile.fullName.trim(),
    cap_number: profile.capNumber.trim(),
    studio_name: profile.studioName.trim(),
    ruc: profile.ruc.trim(),
    studio_address: profile.address.trim(),
    brand_primary: profile.brandPrimary,
    brand_secondary: profile.brandSecondary,
    profile_updated_at: profile.updatedAt || new Date().toISOString(),
  };
  // `undefined` leaves the cloud copy untouched (an image that could not be shrunk).
  if (images.avatar !== undefined) row.avatar_data_url = images.avatar;
  if (images.logo !== undefined) row.logo_data_url = images.logo;
  return row;
}

const isImage = (value: string | null): value is string =>
  typeof value === "string" && value.startsWith("data:image/");

export function rowToProfile(row: ProfileRow, base: StudioProfile): StudioProfile {
  return {
    ...base,
    id: "default",
    fullName: row.full_name ?? "",
    capNumber: row.cap_number ?? "",
    studioName: row.studio_name ?? "",
    ruc: row.ruc ?? "",
    address: row.studio_address ?? "",
    brandPrimary: row.brand_primary || base.brandPrimary,
    brandSecondary: row.brand_secondary || base.brandSecondary,
    avatarDataUrl: isImage(row.avatar_data_url) ? row.avatar_data_url : null,
    logoDataUrl: isImage(row.logo_data_url) ? row.logo_data_url : null,
    // Rows saved before profile_updated_at existed count as the oldest version.
    updatedAt: row.profile_updated_at ?? new Date(0).toISOString(),
  };
}

/**
 * Decides one profile pass. Newest timestamp wins; a dirty local copy is pushed when
 * it is at least as new as the cloud one; a cloud row never versioned is filled in.
 */
export function planProfileSync(
  local: StudioProfile,
  dirty: boolean,
  row: ProfileRow | null,
): ProfilePlan {
  const localTime = time(local.updatedAt);
  const remoteTime = row ? time(row.profile_updated_at) : 0;
  const remoteVersioned = Boolean(row?.profile_updated_at);

  if (dirty && (!remoteVersioned || localTime >= remoteTime)) return { action: "push" };
  if (row && remoteVersioned && remoteTime > localTime) {
    return { action: "pull", profile: rowToProfile(row, local) };
  }
  if (row && !remoteVersioned) {
    if (hasProfileContent(local)) return { action: "push" };
    if (rowHasContent(row)) return { action: "pull", profile: rowToProfile(row, local) };
  }
  return { action: "none" };
}

/** Shrinks an image data URL until it fits `maxBytes`, or returns null if it cannot. */
export type ImageCompressor = (dataUrl: string, maxBytes: number) => Promise<string | null>;

async function syncImage(
  dataUrl: string | null,
  compress: ImageCompressor,
): Promise<string | null | undefined> {
  if (!dataUrl) return null;
  if (dataUrlBytes(dataUrl) <= MAX_SYNC_IMAGE_BYTES) return dataUrl;
  const smaller = await compress(dataUrl, MAX_SYNC_IMAGE_BYTES).catch(() => null);
  return smaller && dataUrlBytes(smaller) <= MAX_SYNC_IMAGE_BYTES ? smaller : undefined;
}

/** What "Guardar perfil", the photo and the logo tell the user after saving. */
export function describeProfileSave(
  status:
    | "ok"
    | "partial"
    | "offline"
    | "not-configured"
    | "signed-out"
    | "account-mismatch"
    | "busy"
    | "error",
): string {
  switch (status) {
    case "ok":
      return "Perfil guardado y respaldado en tu cuenta.";
    case "busy":
      return "Perfil guardado. Se respaldará en tu cuenta en unos segundos.";
    case "offline":
      return "Perfil guardado en este dispositivo. Se respaldará al volver la conexión.";
    case "not-configured":
    case "signed-out":
      return "Perfil guardado en este dispositivo.";
    case "account-mismatch":
      return "Perfil guardado aquí. Vuelve a ingresar a tu cuenta para respaldarlo.";
    default:
      return "Perfil guardado en este dispositivo. No se pudo respaldar; se reintentará solo.";
  }
}

export interface ProfileSyncResult {
  action: ProfilePlan["action"];
  error: string | null;
}

const MISSING_COLUMNS =
  "Falta la migración del perfil en Supabase (20261119020000_profile_sync.sql).";

/** One reconcile pass for the signed-in owner of this device. */
export async function syncProfile(
  local: TrazzoDB,
  client: SupabaseClient,
  userId: string,
  compress: ImageCompressor,
  defaults: StudioProfile,
): Promise<ProfileSyncResult> {
  const readLocal = async () => ({
    profile: { ...defaults, ...(await local.studio_profile.get("default")) },
    dirty: (await local.meta.get(PROFILE_DIRTY))?.value ?? null,
  });

  const remote = await client
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  if (remote.error) {
    const missing = remote.error.code === "42703" || /column/i.test(remote.error.message);
    return { action: "none", error: missing ? MISSING_COLUMNS : remote.error.message };
  }
  const row = (remote.data as ProfileRow | null) ?? null;
  const before = await readLocal();
  const plan = planProfileSync(before.profile, Boolean(before.dirty), row);

  if (plan.action === "push") {
    const [avatar, logo] = await Promise.all([
      syncImage(before.profile.avatarDataUrl, compress),
      syncImage(before.profile.logoDataUrl, compress),
    ]);
    const payload = profileToRow(before.profile, { avatar, logo });
    const update = await client.from("profiles").update(payload).eq("id", userId).select("id");
    if (update.error) return { action: "push", error: update.error.message };
    if (!update.data?.length) {
      return { action: "push", error: "Tu cuenta aún no tiene perfil en la nube." };
    }
    // Clear the queue mark only if nothing was edited while the request was in flight.
    await local.transaction("rw", local.meta, async () => {
      const current = (await local.meta.get(PROFILE_DIRTY))?.value ?? null;
      if (current === before.dirty) await local.meta.delete(PROFILE_DIRTY);
    });
    return { action: "push", error: null };
  }

  if (plan.action === "pull") {
    const applied = await local.transaction("rw", local.studio_profile, local.meta, async () => {
      const current = await readLocal();
      // An edit made during the request is newer than what we read: keep it.
      if (
        current.profile.updatedAt !== before.profile.updatedAt ||
        current.dirty !== before.dirty
      ) {
        return false;
      }
      await local.studio_profile.put(plan.profile);
      await local.meta.bulkPut([
        { key: "professional:fullName", value: plan.profile.fullName },
        { key: "professional:capNumber", value: plan.profile.capNumber },
      ]);
      await local.meta.delete(PROFILE_DIRTY);
      return true;
    });
    return { action: applied ? "pull" : "none", error: null };
  }

  return { action: "none", error: null };
}
