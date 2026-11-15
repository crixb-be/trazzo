export type Provider = "google" | "anthropic" | "openai" | "local";
export type RemoteProvider = Exclude<Provider, "local">;

/** Environment variables that enable each provider (the first one set is used). */
export const PROVIDER_KEYS: Record<RemoteProvider, string[]> = {
  google: ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
  anthropic: ["ANTHROPIC_API_KEY"],
  openai: ["OPENAI_API_KEY"],
};

export const GEMINI_MODEL = "gemini-2.5-flash";

type Env = Record<string, string | undefined>;

export function providerKey(provider: RemoteProvider, env: Env = process.env): string | undefined {
  for (const name of PROVIDER_KEYS[provider]) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

/**
 * AI_PROVIDER picks a provider explicitly when its key is present; otherwise
 * the first configured one wins (Gemini, Claude, OpenAI), else local mode.
 * OPENAI_API_KEY is often set only for embeddings, so it goes last.
 */
export function selectProvider(env: Env = process.env): Provider {
  const preferred = env.AI_PROVIDER?.trim().toLowerCase();
  if (preferred && preferred in PROVIDER_KEYS) {
    const provider = preferred as RemoteProvider;
    if (providerKey(provider, env)) return provider;
  }
  for (const provider of ["google", "anthropic", "openai"] as const) {
    if (providerKey(provider, env)) return provider;
  }
  return "local";
}
