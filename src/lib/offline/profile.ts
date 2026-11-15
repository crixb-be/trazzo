import { db, type StudioProfile } from "./db";

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
  updatedAt: "",
};

export async function getStudioProfile(): Promise<StudioProfile> {
  if (!db) return DEFAULT_STUDIO_PROFILE;
  const stored = await db.studio_profile.get("default");
  if (stored) return { ...DEFAULT_STUDIO_PROFILE, ...stored };

  const [fullName, capNumber] = await Promise.all([
    db.meta.get("professional:fullName"),
    db.meta.get("professional:capNumber"),
  ]);
  return {
    ...DEFAULT_STUDIO_PROFILE,
    fullName: fullName?.value ?? "",
    capNumber: capNumber?.value ?? "",
  };
}

export async function saveStudioProfile(patch: Partial<StudioProfile>): Promise<StudioProfile> {
  if (!db) return { ...DEFAULT_STUDIO_PROFILE, ...patch };
  const current = await getStudioProfile();
  const next: StudioProfile = {
    ...current,
    ...patch,
    id: "default",
    updatedAt: new Date().toISOString(),
  };
  await db.studio_profile.put(next);
  await db.meta.bulkPut([
    { key: "professional:fullName", value: next.fullName.trim() },
    { key: "professional:capNumber", value: next.capNumber.trim() },
  ]);
  return next;
}

export async function getProfessionalProfile(): Promise<ProfessionalProfile> {
  const profile = await getStudioProfile();
  return { fullName: profile.fullName, capNumber: profile.capNumber };
}

export async function saveProfessionalProfile(profile: ProfessionalProfile): Promise<void> {
  await saveStudioProfile(profile);
}
