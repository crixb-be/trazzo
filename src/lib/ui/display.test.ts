import { describe, expect, it } from "vitest";
import { nextTheme, parseTextSize, parseTheme, TEXT_SIZE_OPTIONS, themeLabel } from "./display";

describe("display preferences", () => {
  it("falls back to the dark theme and normal text for unknown values", () => {
    expect(parseTheme(null)).toBe("dark");
    expect(parseTheme("sepia")).toBe("dark");
    expect(parseTheme("obra")).toBe("obra");
    expect(parseTextSize(undefined)).toBe("normal");
    expect(parseTextSize("enorme")).toBe("normal");
    expect(parseTextSize("muy-grande")).toBe("muy-grande");
  });

  it("cycles dark, light and site mode", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("obra");
    expect(nextTheme("obra")).toBe("dark");
    expect(themeLabel("obra")).toBe("Obra");
  });

  it("only grows the text", () => {
    expect(TEXT_SIZE_OPTIONS.map((option) => option.scale)).toEqual([1, 1.15, 1.3]);
  });
});
