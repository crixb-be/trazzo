import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { retrieve } from "@/lib/rag/retrieve";
import { buildLocalAnswer, buildSystemPrompt, NO_RESULT_ANSWER } from "@/lib/rag/prompt";
import { canUseAiQueries, isPlan, type Plan } from "@/lib/plans/plans";

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

type AnonymousQuota = {
  count: number;
  resetAt: number;
};

const anonymousQuotas = new Map<string, AnonymousQuota>();
const ANONYMOUS_LIMIT = 5;
const QUOTA_WINDOW = 30 * 24 * 60 * 60 * 1000;

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

function consumeAnonymousQuota(request: Request): boolean {
  const key = getClientKey(request);
  const now = Date.now();
  const current = anonymousQuotas.get(key);

  if (!current || current.resetAt <= now) {
    anonymousQuotas.set(key, { count: 1, resetAt: now + QUOTA_WINDOW });
    return true;
  }

  if (current.count >= ANONYMOUS_LIMIT) {
    return false;
  }

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
  let increment: (() => Promise<void>) | null = null;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, student_verified, ai_queries_used")
        .eq("id", user.id)
        .maybeSingle();
      const profilePlan = profile?.plan;
      plan =
        profilePlan === "student" && profile?.student_verified
          ? "student"
          : isPlan(profilePlan ?? "")
            ? profilePlan
            : "free";
      const usedQueries =
        typeof profile?.ai_queries_used === "number" && Number.isFinite(profile.ai_queries_used)
          ? profile.ai_queries_used
          : 0;

      if (!canUseAiQueries(plan, usedQueries)) {
        return Response.json(
          { error: "Alcanzaste el límite mensual de consultas de tu plan." },
          { status: 429 },
        );
      }

      increment = async () => {
        const { error } = await supabase.rpc("increment_ai_queries");
        if (error) throw new Error("No se pudo registrar el uso del asistente.");
      };
    } else if (!consumeAnonymousQuota(request)) {
      return Response.json(
        { error: "Límite mensual de consultas anónimas alcanzado." },
        { status: 429 },
      );
    }
  } else if (!consumeAnonymousQuota(request)) {
    return Response.json(
      { error: "Límite mensual de consultas anónimas alcanzado." },
      { status: 429 },
    );
  }

  try {
    if (increment) {
      await increment();
    }

    const chunks = await retrieve(query);
    const sources = chunks.map((chunk) => ({ slug: chunk.slug, citation: chunk.citation }));

    if (!chunks.length) {
      return streamPlainText(NO_RESULT_ANSWER, []);
    }

    const model = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      ? google("gemini-2.0-flash")
      : process.env.OPENAI_API_KEY
        ? openai("gpt-4o-mini")
        : null;

    if (!model) {
      return streamPlainText(buildLocalAnswer(query, chunks), sources);
    }

    const result = streamText({
      model,
      system: buildSystemPrompt(chunks),
      messages: parsed.messages
        .slice(-6)
        .filter((message) => message.role !== "system")
        .map((message) => ({
          role: message.role as "user" | "assistant",
          content: getMessageText(message),
        })),
      temperature: 0.1,
    });

    const stream = createUIMessageStream<ServerChatMessage>({
      execute: ({ writer }) => {
        writer.write({ type: "data-sources", data: sources });
        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("Error en /api/chat", error);
    return Response.json({ error: "No pudimos procesar la consulta." }, { status: 500 });
  }
}
