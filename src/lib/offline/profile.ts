import { db } from "./db";

export interface ProfessionalProfile {
  fullName: string;
  capNumber: string;
}

export async function getProfessionalProfile(): Promise<ProfessionalProfile> {
  if (!db) return { fullName: "", capNumber: "" };
  const [fullName, capNumber] = await Promise.all([
    db.meta.get("professional:fullName"),
    db.meta.get("professional:capNumber"),
  ]);
  return { fullName: fullName?.value ?? "", capNumber: capNumber?.value ?? "" };
}

export async function saveProfessionalProfile(profile: ProfessionalProfile): Promise<void> {
  if (!db) return;
  await db.meta.bulkPut([
    { key: "professional:fullName", value: profile.fullName.trim() },
    { key: "professional:capNumber", value: profile.capNumber.trim() },
  ]);
}
