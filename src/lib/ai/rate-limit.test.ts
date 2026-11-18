import { describe, expect, it } from "vitest";
import {
  createRateLimiter,
  dailyLimits,
  MAX_PROMPT_LENGTH,
  promptLengthError,
  quotaKey,
} from "./rate-limit";

const now = Date.parse("2026-11-17T16:00:00-05:00");

describe("límites del asistente", () => {
  it("admite seis consultas en una ventana móvil y aísla cada identidad", () => {
    const limiter = createRateLimiter();
    for (let i = 0; i < 6; i++) {
      expect(limiter.checkMinute("user:a", now + i)).toBeUndefined();
    }
    expect(limiter.checkMinute("user:b", now + 6)).toBeUndefined();
    expect(limiter.checkMinute("user:a", now + 60_000)).toBeUndefined();
  });

  it("bloquea la séptima consulta con HTTP 429 y Retry-After", async () => {
    const limiter = createRateLimiter();
    for (let i = 0; i < 6; i++) limiter.checkMinute("user:a", now);
    const response = limiter.checkMinute("user:a", now + 12_400);
    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("48");
    expect(await response?.json()).toEqual({
      error: expect.any(String),
      code: "RATE_LIMIT_EXCEEDED",
      retryAfterSeconds: 48,
      remaining: 0,
    });
  });

  it.each(["free", "pro"] as const)("aplica el cupo %s hasta medianoche en Lima", async (plan) => {
    const limiter = createRateLimiter();
    const limit = dailyLimits({})[plan];
    expect(limit).toBe(plan === "free" ? 5 : 40);
    for (let i = 0; i < limit; i++) {
      expect(limiter.consumeDaily("user:a", limit, now)).toBeUndefined();
    }
    const response = limiter.consumeDaily("user:a", limit, now);
    expect(response?.status).toBe(429);
    expect(await response?.json()).toMatchObject({
      code: "DAILY_QUOTA_EXCEEDED",
      retryAfterSeconds: 28_800,
      remaining: 0,
    });
    expect(limiter.consumeDaily("user:a", limit, now + 28_800_000)).toBeUndefined();
  });

  it("acepta límites configurados y descarta valores no válidos", () => {
    expect(dailyLimits({ AI_DAILY_LIMIT_FREE: "7", AI_DAILY_LIMIT_PRO: "80" })).toEqual({
      free: 7,
      pro: 80,
      student: 50,
    });
    expect(dailyLimits({ AI_DAILY_LIMIT_FREE: "-5", AI_DAILY_LIMIT_PRO: "1.5" })).toEqual({
      free: 5,
      pro: 40,
      student: 40,
    });
  });

  it("usa el usuario autenticado como identidad", () => {
    expect(quotaKey(new Request("https://trazzo.example/api/chat"), "test-user")).toBe(
      "user:test-user",
    );
  });

  it("rechaza preguntas por encima de 2 000 caracteres", async () => {
    expect(promptLengthError("a".repeat(MAX_PROMPT_LENGTH))).toBeUndefined();
    const response = promptLengthError("a".repeat(MAX_PROMPT_LENGTH + 1));
    expect(response?.status).toBe(400);
    expect(await response?.json()).toMatchObject({ error: expect.stringContaining("2 000") });
  });
});
