import { describe, expect, it } from "vitest";
import { isValidRuc } from "./validation";

describe("isValidRuc", () => {
  it("allows empty RUC and valid Peru prefixes", () => {
    expect(isValidRuc("")).toBe(true);
    expect(isValidRuc("20123456789")).toBe(true);
    expect(isValidRuc("10123456789")).toBe(true);
  });

  it("rejects invalid RUC values", () => {
    expect(isValidRuc("12123456789")).toBe(false);
    expect(isValidRuc("2012345678")).toBe(false);
  });
});
