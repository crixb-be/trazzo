import { describe, expect, it } from "vitest";
import { formatNumberRaw, parseNumberRaw, validateNumberRaw } from "./number-input";

describe("decimal input", () => {
  it("accepts either decimal separator and distinguishes zero from empty", () => {
    expect(parseNumberRaw("007,5")).toBe(7.5);
    expect(parseNumberRaw(".5")).toBe(0.5);
    expect(parseNumberRaw("0.")).toBe(0);
    expect(parseNumberRaw("")).toBeNull();
    expect(formatNumberRaw(null)).toBe("");
  });

  it.each(["1,234.50", "1.234,50", "1.2.3", "1 200", "3x"])("rejects %s", (raw) => {
    expect(validateNumberRaw(raw)).toEqual({
      value: null,
      error: "Usa un solo separador decimal, sin separadores de miles",
    });
  });

  it("reports bounds without clamping", () => {
    expect(validateNumberRaw("-1").error).toBe("Solo valores positivos");
    expect(validateNumberRaw("-1", { allowNegative: true }).value).toBe(-1);
    expect(validateNumberRaw("1", { min: 2 }).value).toBeNull();
    expect(validateNumberRaw("3", { max: 2 }).value).toBeNull();
  });
});
