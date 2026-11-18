import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { PLANS, usageDay, type Plan } from "@/lib/plans/plans";

export const MAX_PROMPT_LENGTH = 2_000;
export const MAX_GEMINI_OUTPUT_TOKENS = 1_536;
const MINUTE = 60_000;
const DAY = 86_400_000;
const MAX_KEYS = 10_000;

type LimitCode = "RATE_LIMIT_EXCEEDED" | "DAILY_QUOTA_EXCEEDED";

const errors: Record<LimitCode, string> = {
  RATE_LIMIT_EXCEEDED:
    "Enviaste varias consultas seguidas. Espera un momento y vuelve a intentarlo.",
  DAILY_QUOTA_EXCEEDED:
    "Agotaste tus consultas de IA de hoy. El cupo se renueva a medianoche (hora de Perú).",
};

export function limitResponse(code: LimitCode, retryAfterSeconds: number): Response {
  return Response.json(
    { error: errors[code], code, retryAfterSeconds, remaining: 0 },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export function promptLengthError(prompt: string): Response | undefined {
  if (prompt.length <= MAX_PROMPT_LENGTH) return;
  return Response.json(
    { error: "Tu pregunta supera los 2 000 caracteres. Acórtala y vuelve a enviarla." },
    { status: 400 },
  );
}

function positiveLimit(value: string | undefined, fallback: number): number {
  const count = Number(value);
  return Number.isSafeInteger(count) && count > 0 && count <= 2_147_483_647 ? count : fallback;
}

export function dailyLimits(
  env: Record<string, string | undefined> = process.env,
): Record<Plan, number> {
  const free = positiveLimit(env.AI_DAILY_LIMIT_FREE, PLANS.free.aiQueriesPerDay);
  const pro = positiveLimit(env.AI_DAILY_LIMIT_PRO, PLANS.pro.aiQueriesPerDay);
  return { free, pro, student: Math.max(free, Math.min(pro, PLANS.student.aiQueriesPerDay)) };
}

export function nextDailyReset(now: number): number {
  // America/Lima uses UTC-05:00 year-round.
  return Date.parse(usageDay(new Date(now)) + "T00:00:00-05:00") + DAY;
}

export function quotaKey(request: Request, userId?: string): string {
  if (userId) return "user:" + userId;
  // Vercel supplies this header at its own ingress. Outside Vercel, callers
  // share a conservative anonymous bucket instead of trusting spoofable IPs.
  const ip = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for") : null;
  return (
    "ip:" +
    createHash("sha256")
      .update(ip && isIP(ip) ? ip : "unknown")
      .digest("hex")
  );
}

function secondsUntil(time: number, now: number): number {
  return Math.max(1, Math.ceil((time - now) / 1000));
}

export function dailyQuotaExceeded(now = Date.now()): Response {
  return limitResponse("DAILY_QUOTA_EXCEEDED", secondsUntil(nextDailyReset(now), now));
}

export function createRateLimiter() {
  const bursts = new Map<string, number[]>();
  const days = new Map<string, { count: number; reset: number }>();
  let sweepAt = 0;

  function sweep(now: number) {
    if (now < sweepAt) return;
    sweepAt = now + MINUTE;
    for (const [key, hits] of bursts) {
      if (hits[hits.length - 1] <= now - MINUTE) bursts.delete(key);
    }
    for (const [key, day] of days) {
      if (day.reset <= now) days.delete(key);
    }
  }

  return {
    checkMinute(key: string, now = Date.now()): Response | undefined {
      sweep(now);
      const hits = (bursts.get(key) ?? []).filter((hit) => hit > now - MINUTE);
      if (hits.length >= 6) {
        return limitResponse("RATE_LIMIT_EXCEEDED", secondsUntil(hits[0] + MINUTE, now));
      }
      if (!bursts.has(key) && bursts.size >= MAX_KEYS) {
        return limitResponse("RATE_LIMIT_EXCEEDED", secondsUntil(sweepAt, now));
      }
      bursts.set(key, [...hits, now]);
    },
    consumeDaily(key: string, limit: number, now = Date.now()): Response | undefined {
      sweep(now);
      const reset = nextDailyReset(now);
      const day = days.get(key);
      const count = day?.reset === reset ? day.count : 0;
      if (count >= limit || (!day && days.size >= MAX_KEYS)) return dailyQuotaExceeded(now);
      days.set(key, { count: count + 1, reset });
    },
  };
}

export const aiRateLimiter = createRateLimiter();
