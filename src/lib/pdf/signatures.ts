import type { FeeQuote, StudioProfile } from "@/lib/offline/db";

export interface SignatureParty {
  /** "EL CONTRATANTE" / "EL PROYECTISTA" */
  role: string;
  /** Full name; empty when unknown (the signing space is left clean, no "____"). */
  name: string;
  /** Identity lines under the name: DNI/RUC, CAP, studio. */
  details: string[];
}

/** Signer suggested by the studio profile: the architect, or the studio if no name is set. */
export function defaultSigner(studio: StudioProfile): { name: string; document: string } {
  const name = studio.fullName.trim() ? "Arq. " + studio.fullName.trim() : studio.studioName.trim();
  const document = studio.capNumber.trim()
    ? "CAP N° " + studio.capNumber.trim()
    : studio.ruc.trim()
      ? "RUC " + studio.ruc.trim()
      : "";
  return { name, document };
}

/**
 * Parties of the signature block, shared by the PDF and the on-screen preview.
 * Form overrides win; otherwise names and IDs come from the studio profile.
 */
export function signatureParties(
  quote: Pick<FeeQuote, "clientName" | "clientDocument" | "signerName" | "signerDocument">,
  studio: StudioProfile,
): [SignatureParty, SignatureParty] {
  const clientDocument = quote.clientDocument?.trim() ?? "";
  const contractor: SignatureParty = {
    role: "EL CONTRATANTE",
    name: quote.clientName.trim(),
    details: clientDocument ? ["DNI / RUC: " + clientDocument] : [],
  };

  const fallback = defaultSigner(studio);
  const name = quote.signerName?.trim() || fallback.name;
  const document = quote.signerDocument?.trim() || fallback.document;
  const studioName = studio.studioName.trim();
  const details = [document];
  // Show the studio under an architect's name, but not twice when the studio signs.
  if (studioName && studioName !== name) details.push(studioName);

  return [contractor, { role: "EL PROYECTISTA", name, details: details.filter(Boolean) }];
}
