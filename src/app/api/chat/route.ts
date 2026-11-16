import { createHash } from "node:crypto";
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
import { retrieve } from "@/lib/rag/retrieve";
import { expandColloquialQuery } from "@/lib/search/colloquial";
import { buildLocalAnswer, buildSystemPrompt, NO_RESULT_ANSWER } from "@/lib/rag/prompt";
import {
  ANONYMOUS_AI_QUERIES_PER_DAY,
  canUseAiQueries,
  queriesUsedToday,
  resolveEffectivePlan,
  usageDay,
  type Plan,
} from "@/lib/plans/plans";

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

// Fallback when the database counter is unavailable: per server instance only.
const anonymousUsage = new Map<string, { day: string; count: number }>();

function getMessageText(message: z.infer<typeof messageSchema>): string {
  if (message.content) {
    return message.content.trim();
  }

  return (message.parts ?? [])
    .map((part) => part.text ?? "")
    .join(" ")
    .trim();
}

function getClientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** Counts one model query for a visitor without an account; false when today's limit is used up. */
async function consumeAnonymousQuota(request: Request): Promise<boolean> {
  const key = createHash("sha256").update(getClientKey(request)).digest("hex");
  const admin = createAdminClient();
  if (admin) {
    const { data, error } = await admin.rpc("consume_anonymous_ai_query", {
      p_key: key,
      p_limit: ANONYMOUS_AI_QUERIES_PER_DAY,
    });
    if (!error) return data === true;
  }

  const day = usageDay();
  const current = anonymousUsage.get(key);
  if (!current || current.day !== day) {
    anonymousUsage.set(key, { day, count: 1 });
    return true;
  }
  if (current.count >= ANONYMOUS_AI_QUERIES_PER_DAY) return false;
  current.count += 1;
  return true;
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

  const supabase = await createClient();
  let plan: Plan = "free";
  // Counts one model query; resolves to false when today's limit is used up.
  let consume: () => Promise<boolean> = () => consumeAnonymousQuota(request);
  let limitMessage =
    "Alcanzaste el límite diario de consultas sin cuenta. Crea una cuenta gratis para tener más.";

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const columns = "plan, student_verified, subscription_expires_at, ai_queries_used";
      let { data: profile, error } = await supabase
        .from("profiles")
        .select(columns + ", ai_queries_day")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        // Database without the daily-quota migration: keep the plan, skip the count.
        ({ data: profile, error } = await supabase
          .from("profiles")
          .select(columns)
          .eq("id", user.id)
          .maybeSingle());
      }
      const row = profile as Record<string, unknown> | null;
      plan = resolveEffectivePlan(row);

      if (!canUseAiQueries(plan, queriesUsedToday(row))) {
        return Response.json(
          { error: "Alcanzaste el límite diario de consultas de tu plan. Se renueva mañana." },
          { status: 429 },
        );
      }

      limitMessage = "Alcanzaste el límite diario de consultas de tu plan. Se renueva mañana.";
      consume = async () => {
        const { error: usageError } = await supabase.rpc("increment_ai_queries");
        if (usageError) throw new Error("No se pudo registrar el uso del asistente.");
        return true;
      };
    }
  }

  try {
    const provider = selectProvider();
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
    if (!(await consume())) {
      return Response.json({ error: limitMessage }, { status: 429 });
    }

    const system = buildSystemPrompt(chunks, expandColloquialQuery(query).technicalTerms);
    const turns: ChatTurn[] = parsed.messages
      .slice(-6)
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role as "user" | "assistant",
        text: getMessageText(message),
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
