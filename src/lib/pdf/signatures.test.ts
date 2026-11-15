import { describe, expect, it } from "vitest";
import { DEFAULT_STUDIO_PROFILE } from "@/lib/offline/profile";
import { defaultSigner, signatureParties } from "./signatures";

const studio = {
  ...DEFAULT_STUDIO_PROFILE,
  fullName: "Ana Torres Ríos",
  capNumber: "12345",
  studioName: "B & E Arquitectura",
  ruc: "20123456789",
};

describe("signature parties", () => {
  it("takes the architect and CAP from the studio profile", () => {
    const [contractor, designer] = signatureParties(
      { clientName: "Familia Quispe", clientDocument: "10456789" },
      studio,
    );
    expect(contractor).toEqual({
      role: "EL CONTRATANTE",
      name: "Familia Quispe",
      details: ["DNI / RUC: 10456789"],
    });
    expect(designer).toEqual({
      role: "EL PROYECTISTA",
      name: "Arq. Ana Torres Ríos",
      details: ["CAP N° 12345", "B & E Arquitectura"],
    });
  });

  it("lets the form override the signer", () => {
    const [, designer] = signatureParties(
      { clientName: "X", signerName: "Ing. Luis Rojas", signerDocument: "CIP 98765" },
      studio,
    );
    expect(designer.name).toBe("Ing. Luis Rojas");
    expect(designer.details[0]).toBe("CIP 98765");
  });

  it("signs as the studio with its RUC when there is no architect name", () => {
    const signer = defaultSigner({ ...studio, fullName: "", capNumber: "" });
    expect(signer).toEqual({ name: "B & E Arquitectura", document: "RUC 20123456789" });
    const [, designer] = signatureParties(
      { clientName: "X" },
      { ...studio, fullName: "", capNumber: "" },
    );
    expect(designer.details).toEqual(["RUC 20123456789"]);
  });

  it("never fills missing data with underscores", () => {
    const parties = signatureParties({ clientName: "" }, DEFAULT_STUDIO_PROFILE);
    for (const party of parties) {
      expect(party.name).not.toMatch(/_/);
      for (const detail of party.details) expect(detail).not.toMatch(/_/);
    }
    expect(parties[0].details).toEqual([]);
  });
});
