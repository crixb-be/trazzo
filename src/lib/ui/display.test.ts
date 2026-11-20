import { describe, expect, it, vi } from "vitest";
import {
  nextTheme,
  parseTextSize,
  parseTheme,
  readDisplay,
  THEME_KEY,
  TEXT_SIZE_OPTIONS,
  themeLabel,
} from "./display";

describe("display preferences", () => {
  it("falls back to the dark theme and normal text for unknown values", () => {
    expect(parseTheme(null)).toBe("dark");
    expect(parseTheme("sepia")).toBe("dark");
    expect(parseTextSize(undefined)).toBe("normal");
    expect(parseTextSize("enorme")).toBe("normal");
    expect(parseTextSize("muy-grande")).toBe("muy-grande");
  });

  it("alterna entre Oscuro y Claro", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(themeLabel("light")).toBe("Claro");
  });

  it("migra el tema heredado a Claro aunque la escritura esté bloqueada", () => {
    const getItem = vi.fn((key: string) => (key === THEME_KEY ? "obra" : "grande"));
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem, setItem });
    try {
      expect(parseTheme("obra")).toBe("light");
      expect(readDisplay()).toEqual({ theme: "light", textSize: "grande" });
      expect(setItem).toHaveBeenCalledWith(THEME_KEY, "light");
      setItem.mockImplementationOnce(() => {
        throw new Error("Almacenamiento bloqueado");
      });
      expect(readDisplay()).toEqual({ theme: "light", textSize: "grande" });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("only grows the text", () => {
    expect(TEXT_SIZE_OPTIONS.map((option) => option.scale)).toEqual([1, 1.15, 1.3]);
  });
});
