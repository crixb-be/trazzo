import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { streamClaudeAnswer, type ChatTurn } from "@/lib/ai/anthropic";
import { GEMINI_MODEL, providerKey, selectProvider } from "@/lib/ai/provider";
import {
  aiRateLimiter,
  dailyLimits,
  dailyQuotaExceeded,
  MAX_GEMINI_OUTPUT_TOKENS,
  MAX_PROMPT_LENGTH,
  promptLengthError,
  quotaKey,
} from "@/lib/ai/rate-limit";
import { retrieve } from "@/lib/rag/retrieve";
import { expandColloquialQuery } from "@/lib/search/colloquial";
import { buildLocalAnswer, buildSystemPrompt, NO_RESULT_ANSWER } from "@/lib/rag/prompt";
import { queriesUsedToday, resolveEffectivePlan, usageDay } from "@/lib/plans/plans";

export const runtime = "nodejs";

const messageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().optional(),
  parts: z
    .array(
      z.object({
        type: z.string(),
        text: z.string().optional(),
      }),
    )
    .optional(),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
});

type SourceData = {
  slug: string;
  citation: string;
};

type ChatDataTypes = {
  sources: SourceData[];
};

type ServerChatMessage = UIMessage<unknown, ChatDataTypes>;

function getMessageText(message: z.infer<typeof messageSchema>): string {
  if (message.content) {
    return message.content.trim();
  }

  return (message.parts ?? [])
    .map((part) => part.text ?? "")
    .join(" ")
    .trim();
}

/** Reserve against the same profile fields used by the existing daily counter.
 * A conditional update prevents concurrent instances from spending the same slot. */
async function reserveAccountQuota(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
): Promise<Response | undefined> {
  const limits = dailyLimits();
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: profile, error } = await admin
      .from("profiles")
      .select("plan, student_verified, subscription_expires_at, ai_queries_used, ai_queries_day")
      .eq("id", userId)
      .single();
    if (error) throw error;

    const now = new Date();
    const count = queriesUsedToday(profile, now);
    if (count >= limits[resolveEffectivePlan(profile, now)]) {
      return dailyQuotaExceeded(now.getTime());
    }

    const update = admin
      .from("profiles")
      .update({ ai_queries_used: count + 1, ai_queries_day: usageDay(now) })
      .eq("id", userId)
      .eq("ai_queries_used", profile.ai_queries_used);
    const { data, error: updateError } = await (
      profile.ai_queries_day === null
        ? update.is("ai_queries_day", null)
        : update.eq("ai_queries_day", profile.ai_queries_day)
    ).select("id");
    if (updateError) throw updateError;
    if (data.length > 0) return;
  }
  throw new Error("El contador de consultas se modificó en paralelo.");
}

async function reserveDailyQuota(
  key: string,
  userId: string | undefined,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Response | undefined> {
  const admin = createAdminClient();
  const limits = dailyLimits();
  if (admin && userId) return reserveAccountQuota(admin, userId);
  if (admin) {
    const { data, error } = await admin.rpc("consume_anonymous_ai_query", {
      p_key: key.slice(3), // Keep using the existing anonymous hash format.
      p_limit: limits.free,
    });
    if (error) throw error;
    return data === true ? undefined : dailyQuotaExceeded();
  }
  if (supabase && userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("plan, student_verified, subscription_expires_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return aiRateLimiter.consumeDaily(key, limits[resolveEffectivePlan(data)]);
  }
  return aiRateLimiter.consumeDaily(key, limits.free);
}

function streamPlainText(text: string, sources: SourceData[]): Response {
  const stream = createUIMessageStream<ServerChatMessage>({
    execute: ({ writer }) => {
      writer.write({ type: "data-sources", data: sources });
      writer.write({ type: "text-start", id: "trazzo-answer" });
      writer.write({ type: "text-delta", id: "trazzo-answer", delta: text });
      writer.write({ type: "text-end", id: "trazzo-answer" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

const REFUSAL_ANSWER =
  "No puedo responder esa consulta. Reformúlala como una pregunta técnica sobre el RNE.";

function streamClaude(system: string, turns: ChatTurn[], sources: SourceData[]): Response {
  const stream = createUIMessageStream<ServerChatMessage>({
    execute: async ({ writer }) => {
      writer.write({ type: "data-sources", data: sources });
      writer.write({ type: "text-start", id: "trazzo-answer" });
      let wroteText = false;
      const { stopReason } = await streamClaudeAnswer(system, turns, (delta) => {
        wroteText = true;
        writer.write({ type: "text-delta", id: "trazzo-answer", delta });
      });
      if (stopReason === "refusal") {
        writer.write({
          type: "text-delta",
          id: "trazzo-answer",
          delta: (wroteText ? "\n\n" : "") + REFUSAL_ANSWER,
        });
      }
      writer.write({ type: "text-end", id: "trazzo-answer" });
    },
    onError: (error) => {
      console.error("Error de Claude en /api/chat", error);
      return "No pudimos completar la respuesta del asistente.";
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export async function POST(request: Request): Promise<Response> {
  let parsed: z.infer<typeof requestSchema>;

  try {
    parsed = requestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const lastMessage = parsed.messages.at(-1);
  const query = lastMessage ? getMessageText(lastMessage) : "";

  if (!query) {
    return Response.json({ error: "Escribe una pregunta antes de consultar." }, { status: 400 });
  }

  const lengthError = promptLengthError(query);
  if (lengthError) return lengthError;

  try {
    const provider = selectProvider();
    const supabase = provider === "local" ? null : await createClient();
    const userId = supabase ? (await supabase.auth.getUser()).data.user?.id : undefined;
    const key = quotaKey(request, userId);
    if (provider !== "local") {
      const blocked = aiRateLimiter.checkMinute(key);
      if (blocked) return blocked;
    }
    // With a model we hand it up to 6 related cards to synthesise; without one,
    // the local answer keeps to the few clearly relevant cards.
    const chunks = await retrieve(query, provider === "local" ? "extractive" : "synthesis");
    const sources = chunks.map((chunk) => ({ slug: chunk.slug, citation: chunk.citation }));

    if (!chunks.length) {
      return streamPlainText(NO_RESULT_ANSWER, []);
    }

    if (provider === "local") {
      return streamPlainText(buildLocalAnswer(query, chunks), sources);
    }

    // Only answers written by a model count against the daily quota.
    const blocked = await reserveDailyQuota(key, userId, supabase);
    if (blocked) return blocked;

    const system = buildSystemPrompt(chunks, expandColloquialQuery(query).technicalTerms);
    const turns: ChatTurn[] = parsed.messages
      .slice(-6)
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role as "user" | "assistant",
        text: getMessageText(message).slice(0, MAX_PROMPT_LENGTH),
      }));

    if (provider === "anthropic") {
      return streamClaude(system, turns, sources);
    }

    const modelLabel = provider === "openai" ? "OpenAI gpt-4o-mini" : `Gemini ${GEMINI_MODEL}`;
    const result = streamText({
      model:
        provider === "openai"
          ? openai("gpt-4o-mini")
          : createGoogleGenerativeAI({ apiKey: providerKey("google") })(GEMINI_MODEL),
      system,
      messages: turns.map((turn) => ({ role: turn.role, content: turn.text })),
      temperature: 0.1,
      ...(provider === "google"
        ? { maxOutputTokens: MAX_GEMINI_OUTPUT_TOKENS, maxRetries: 0 }
        : {}),
      abortSignal: request.signal,
      // Provider failures (bad key, quota, model not found) are logged instead of
      // disappearing inside the stream.
      onError: ({ error }) => {
        console.error(`Error de ${modelLabel} en /api/chat`, error);
      },
    });

    const stream = createUIMessageStream<ServerChatMessage>({
      execute: ({ writer }) => {
        writer.write({ type: "data-sources", data: sources });
        writer.merge(
          result.toUIMessageStream({
            onError: (error) => {
              console.error(`Error de ${modelLabel} al transmitir la respuesta`, error);
              return "No pudimos completar la respuesta del asistente. Revisa la configuración de la IA e inténtalo de nuevo.";
            },
          }),
        );
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("Error en /api/chat", error);
    return Response.json({ error: "No pudimos procesar la consulta." }, { status: 500 });
  }
}
