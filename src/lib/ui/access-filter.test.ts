import { describe, expect, it } from "vitest";
import {
  accessFilterLabel,
  matchesAccessFilter,
  measureFavoriteKey,
  parseAccessFilter,
} from "./access-filter";

const params = (entries: Record<string, string>) => new URLSearchParams(entries);

describe("parseAccessFilter", () => {
  it("defaults to Todas and accepts the known values", () => {
    expect(parseAccessFilter(params({}))).toBe("todas");
    expect(parseAccessFilter(params({ acceso: "pro" }))).toBe("pro");
    expect(parseAccessFilter(params({ acceso: "favoritas" }))).toBe("favoritas");
  });

  it("keeps old free=1 links and ignores unknown values", () => {
    expect(parseAccessFilter(params({ free: "1" }))).toBe("gratuitas");
    expect(parseAccessFilter(params({ acceso: "otro" }))).toBe("todas");
  });
});

describe("matchesAccessFilter", () => {
  const free = { isPro: false, favorite: false };
  const pro = { isPro: true, favorite: false };
  const favorite = { isPro: false, favorite: true };

  it("PRO shows only PRO content and Gratuitas hides it", () => {
    expect(matchesAccessFilter("pro", pro)).toBe(true);
    expect(matchesAccessFilter("pro", free)).toBe(false);
    expect(matchesAccessFilter("gratuitas", pro)).toBe(false);
    expect(matchesAccessFilter("gratuitas", free)).toBe(true);
  });

  it("Favoritas shows only favourites and Todas shows everything", () => {
    expect(matchesAccessFilter("favoritas", favorite)).toBe(true);
    expect(matchesAccessFilter("favoritas", free)).toBe(false);
    for (const item of [free, pro, favorite]) expect(matchesAccessFilter("todas", item)).toBe(true);
  });
});

describe("labels and keys", () => {
  it("names each option and namespaces measure favourites", () => {
    expect(accessFilterLabel("pro")).toBe("PRO");
    expect(accessFilterLabel("todas")).toBe("Todas");
    expect(measureFavoriteKey("bano")).toBe("medida:bano");
  });
});
