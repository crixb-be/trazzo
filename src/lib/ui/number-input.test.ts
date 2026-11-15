import { describe, expect, it } from "vitest";
import { formatNumberRaw, parseNumberRaw, sanitizeNumberRaw } from "./number-input";

describe("number input helpers", () => {
  it("sanitizes leading zeros and separators while typing", () => {
    expect(sanitizeNumberRaw("01")).toBe("1");
    expect(sanitizeNumberRaw("007.5")).toBe("7.5");
    expect(sanitizeNumberRaw("0.5")).toBe("0.5");
    expect(sanitizeNumberRaw("0.")).toBe("0.");
    expect(sanitizeNumberRaw(".")).toBe(".");
    expect(sanitizeNumberRaw("1,25")).toBe("1.25");
  });

  it("parses incomplete values as null", () => {
    expect(parseNumberRaw("")).toBeNull();
    expect(parseNumberRaw(".")).toBeNull();
    expect(parseNumberRaw("-")).toBeNull();
    expect(parseNumberRaw("1.5")).toBe(1.5);
  });

  it("formats values without a trailing decimal", () => {
    expect(formatNumberRaw(null)).toBe("");
    expect(formatNumberRaw(Number.NaN)).toBe("");
    expect(formatNumberRaw(1)).toBe("1");
  });
});
