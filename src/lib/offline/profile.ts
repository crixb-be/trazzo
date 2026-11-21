import { db, type StudioProfile } from "./db";
import { PROFILE_DIRTY } from "./profile-sync";

export interface ProfessionalProfile {
  fullName: string;
  capNumber: string;
}

export const DEFAULT_STUDIO_PROFILE: StudioProfile = {
  id: "default",
  fullName: "",
  capNumber: "",
  studioName: "",
  ruc: "",
  address: "",
  brandPrimary: "#13294B",
  brandSecondary: "#C59B27",
  logoDataUrl: null,
  avatarDataUrl: null,
  updatedAt: "",
};

async function readStudioProfile(local: NonNullable<typeof db>): Promise<StudioProfile> {
  const stored = await local.studio_profile.get("default");
  if (stored) return { ...DEFAULT_STUDIO_PROFILE, ...stored };

  const [fullName, capNumber] = await Promise.all([
    local.meta.get("professional:fullName"),
    local.meta.get("professional:capNumber"),
  ]);
  return {
    ...DEFAULT_STUDIO_PROFILE,
    fullName: fullName?.value ?? "",
    capNumber: capNumber?.value ?? "",
  };
}

export async function getStudioProfile(): Promise<StudioProfile> {
  const local = db;
  if (!local) return DEFAULT_STUDIO_PROFILE;
  return local.transaction("r", local.studio_profile, local.meta, () => readStudioProfile(local));
}

export async function saveStudioProfile(patch: Partial<StudioProfile>): Promise<StudioProfile> {
  const local = db;
  if (!local) return { ...DEFAULT_STUDIO_PROFILE, ...patch };
  const next = await local.transaction("rw", local.studio_profile, local.meta, async () => {
    const current = await readStudioProfile(local);
    const next: StudioProfile = {
      ...current,
      ...patch,
      id: "default",
      updatedAt: new Date().toISOString(),
    };
    await local.studio_profile.put(next);
    await local.meta.bulkPut([
      { key: "professional:fullName", value: next.fullName.trim() },
      { key: "professional:capNumber", value: next.capNumber.trim() },
      // Queued for the cloud until a sync confirms this exact version.
      { key: PROFILE_DIRTY, value: next.updatedAt },
    ]);
    return next;
  });
  // Signed in and online: back it up right away. Offline or signed out, the mark
  // stays and the next pass (reconnect, sign-in, "Sincronizar ahora") sends it.
  void import("./sync").then(({ scheduleSync }) => scheduleSync(800)).catch(() => undefined);
  return next;
}

export async function getProfessionalProfile(): Promise<ProfessionalProfile> {
  const profile = await getStudioProfile();
  return { fullName: profile.fullName, capNumber: profile.capNumber };
}

export async function saveProfessionalProfile(profile: ProfessionalProfile): Promise<void> {
  await saveStudioProfile(profile);
}
