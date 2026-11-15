import { describe, expect, it } from "vitest";
import { providerKey, selectProvider } from "./provider";

describe("AI provider selection", () => {
  it("uses Gemini with GEMINI_API_KEY even when an OpenAI key exists for embeddings", () => {
    expect(selectProvider({ GEMINI_API_KEY: "g", OPENAI_API_KEY: "o" })).toBe("google");
  });

  it("still accepts the legacy GOOGLE_GENERATIVE_AI_API_KEY", () => {
    expect(providerKey("google", { GOOGLE_GENERATIVE_AI_API_KEY: "legacy" })).toBe("legacy");
    expect(
      providerKey("google", { GEMINI_API_KEY: "new", GOOGLE_GENERATIVE_AI_API_KEY: "x" }),
    ).toBe("new");
  });

  it("honours AI_PROVIDER only when that provider has a key", () => {
    expect(
      selectProvider({ AI_PROVIDER: "openai", GEMINI_API_KEY: "g", OPENAI_API_KEY: "o" }),
    ).toBe("openai");
    expect(selectProvider({ AI_PROVIDER: "anthropic", GEMINI_API_KEY: "g" })).toBe("google");
  });

  it("falls back to local mode without keys and ignores blank values", () => {
    expect(selectProvider({})).toBe("local");
    expect(selectProvider({ GEMINI_API_KEY: "   " })).toBe("local");
  });
});
