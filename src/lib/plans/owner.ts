interface OwnerAccount {
  email?: string | null;
  signedIn: boolean;
}

/**
 * Owner access depends only on the signed-in account's email being listed in
 * NEXT_PUBLIC_TRAZZO_OWNER_EMAILS (or the server-only TRAZZO_OWNER_EMAILS).
 * Data the user can type themselves (studio CAP, RUC) never grants access.
 */
export type OwnerReason = "email";

export function ownerAccountReason(
  { email, signedIn }: OwnerAccount,
  serverEmails = "",
): OwnerReason | null {
  if (!signedIn) return null;
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return null;
  const emails = (process.env.NEXT_PUBLIC_TRAZZO_OWNER_EMAILS ?? "") + "," + serverEmails;
  const listed = emails.split(",").some((entry) => entry.trim().toLowerCase() === normalizedEmail);
  return listed ? "email" : null;
}

export function isOwnerAccount(account: OwnerAccount, serverEmails?: string): boolean {
  return ownerAccountReason(account, serverEmails) !== null;
}
