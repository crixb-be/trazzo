interface OwnerAccount {
  email?: string | null;
  capNumber?: string | null;
  ruc?: string | null;
  signedIn: boolean;
}

export type OwnerReason = "email" | "cap" | "ruc";

export function ownerAccountReason(
  { email, capNumber, ruc, signedIn }: OwnerAccount,
  serverEmails = "",
): OwnerReason | null {
  const normalizedEmail = email?.trim().toLowerCase();
  const emails = (process.env.NEXT_PUBLIC_TRAZZO_OWNER_EMAILS ?? "") + "," + serverEmails;
  if (
    normalizedEmail &&
    emails.split(",").some((entry) => entry.trim().toLowerCase() === normalizedEmail)
  ) {
    return "email";
  }
  if (!signedIn) return null;
  if (capNumber?.replace(/\D/g, "") === "38255") return "cap";
  if (ruc?.replace(/\D/g, "") === "20614918773") return "ruc";
  return null;
}

export function isOwnerAccount(account: OwnerAccount, serverEmails?: string): boolean {
  return ownerAccountReason(account, serverEmails) !== null;
}
