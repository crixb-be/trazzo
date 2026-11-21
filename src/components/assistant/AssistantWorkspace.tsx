"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Square } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { DefaultChatTransport, safeValidateUIMessages } from "ai";
import { useChat } from "@ai-sdk/react";
import { Card, Button } from "@/components/ui";
import type { UIMessage } from "ai";
import { db } from "@/lib/offline/db";
import { useCards } from "@/lib/offline/hooks";
import { RNE_CARDS } from "@/data/seed-rne";
import { deviceAnswer } from "@/lib/rag/device";
import { useCurrentPlan } from "@/lib/plans/use-current-plan";
import { canUseProCards, type Plan } from "@/lib/plans/plans";
import { useOnlineStatus } from "@/lib/offline/hooks";
import { ChatMessage } from "./ChatMessage";
import { BrandMark } from "@/components/brand/BrandMark";
import { SuggestedPrompts } from "./SuggestedPrompts";
import { AssistantQuota } from "./AssistantQuota";

/** The API answers errors as JSON ({ error }); show that text (e.g. the daily limit). */
function chatErrorMessage(error: Error): string {
  try {
    const parsed = JSON.parse(error.message) as { error?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
  } catch {
    // Not JSON: fall through to the generic message.
  }
  return "No pudimos completar la consulta. Puedes intentarlo de nuevo.";
}

export function AssistantWorkspace({ limits }: { limits: Record<Plan, number> }) {
  const searchParams = useSearchParams();
  const online = useOnlineStatus();
  const [input, setInput] = useState(searchParams.get("q") ?? "");
  const chat = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages }) => ({ body: { messages: messages.slice(-6) } }),
    }),
  });
  const cards = useCards();
  const { plan } = useCurrentPlan();
  const [history, setHistory] = useState<"loading" | "ready" | "failed">("loading");
  const [historyNotice, setHistoryNotice] = useState("");
  const writeQueue = useRef(Promise.resolve());

  async function readHistory(isActive = () => true) {
    try {
      if (!db) throw new Error("IndexedDB");
      const row = await db.meta.get("assistant-history");
      if (row) {
        const result = await safeValidateUIMessages<UIMessage>({ messages: JSON.parse(row.value) });
        if (!result.success) throw result.error;
        if (isActive())
          chat.setMessages((temporary) => {
            const known = new Set(result.data.map((message) => message.id));
            return [...result.data, ...temporary.filter((message) => !known.has(message.id))];
          });
      }
      if (isActive()) setHistory("ready");
    } catch {
      if (isActive()) setHistory("failed");
    }
  }

  useEffect(() => {
    let active = true;
    void readHistory(() => active);
    return () => {
      active = false;
    };
  }, []);

  async function resetHistory() {
    setHistory("loading");
    try {
      if (!db) throw new Error("IndexedDB");
      await db.meta.delete("assistant-history");
      setHistoryNotice("");
      setHistory("ready");
    } catch {
      setHistory("failed");
    }
  }
  useEffect(() => {
    if (history !== "ready" || chat.status !== "ready") return;
    const value = JSON.stringify(chat.messages.slice(-100));
    const meta = db?.meta;
    writeQueue.current = writeQueue.current
      .catch(() => {})
      .then(async () => {
        await meta?.put({ key: "assistant-history", value });
      })
      .catch(() => setHistoryNotice("No se pudo guardar el historial."));
  }, [chat.messages, chat.status, history]);
  async function sendPrompt(prompt: string) {
    if (!prompt.trim() || busy || history === "loading") return;
    setInput("");
    if (online) {
      await chat.sendMessage({ text: prompt });
      return;
    }
    const accessible = (cards.length ? cards : RNE_CARDS).filter(
      (c) => !c.is_pro || canUseProCards(plan),
    );
    const text = deviceAnswer(prompt, accessible);
    chat.setMessages((previous) => [
      ...previous,
      { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: prompt }] },
      { id: crypto.randomUUID(), role: "assistant", parts: [{ type: "text", text }] },
    ]);
  }
  const busy = chat.status === "submitted" || chat.status === "streaming";

  useEffect(() => {
    const query = searchParams.get("q");
    if (query === null) return;
    setInput(query);
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [searchParams]);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const prompt = input.trim();
    await sendPrompt(prompt);
  }

  function choosePrompt(prompt: string): void {
    void sendPrompt(prompt);
  }

  return (
    <div className="assistant-page">
      <div className="eyebrow">Asistente RNE</div>
      <div className="page-heading-row">
        <div>
          <h1 className="page-title">Consulta el RNE</h1>
          <p className="lead">
            Respuestas ancladas a fichas recuperadas. Cada cita abre su fuente.
          </p>
        </div>
        <div className="assistant-status mono">{online ? "EN LÍNEA" : "SIN CONEXIÓN"}</div>
      </div>
      <div className="assistant-layout">
        <Card className="chat-card">
          {history === "failed" && (
            <div className="chat-history-notice">
              <span role="status">
                No se pudo leer el historial. Puedes continuar con un chat temporal.
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setHistory("loading");
                  void readHistory();
                }}
              >
                Reintentar
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => void resetHistory()}>
                Restablecer
              </Button>
            </div>
          )}
          {historyNotice && <p role="status">{historyNotice}</p>}
          {history === "ready" && chat.messages.length > 0 && (
            <div className="chat-history-actions">
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => chat.setMessages([])}
              >
                Borrar historial de este dispositivo
              </Button>
            </div>
          )}
          {chat.messages.length === 0 ? (
            <div className="chat-empty">
              <BrandMark size={48} className="assistant-mark" />
              <h2>Un criterio técnico a la vez.</h2>
              <p className="muted">Pregunta por una cota, una tabla o un artículo del RNE.</p>
              <SuggestedPrompts onSelect={choosePrompt} />
            </div>
          ) : (
            <div className="chat-list">
              {chat.messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {chat.error && (
                <p className="warning" role="alert">
                  {chatErrorMessage(chat.error)}
                </p>
              )}
            </div>
          )}
          <form className="chat-form chat-composer" onSubmit={(event) => void submit(event)}>
            <input
              className="input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                online
                  ? "Ej. ¿qué ancho debe tener un pasadizo?"
                  : "Pregunta sin conexión: responde la biblioteca local"
              }
              disabled={history === "loading" || busy}
              aria-label="Pregunta al asistente RNE"
            />
            {busy ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => chat.stop()}
                aria-label="Detener respuesta"
              >
                <Square size={15} />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                disabled={history === "loading" || !input.trim()}
                aria-label="Enviar consulta"
              >
                <Send size={16} />
              </Button>
            )}
          </form>
          {chat.error && (
            <button
              className="source-link regenerate-button"
              type="button"
              onClick={() => void chat.regenerate()}
            >
              Regenerar respuesta
            </button>
          )}
          <p className="legal chat-disclaimer">
            Las respuestas se limitan a las fichas del RNE cargadas en TRAZZO. Verifica siempre la
            versión vigente del MVCS.
          </p>
        </Card>
        <aside className="assistant-sidebar">
          <AssistantQuota limits={limits} />
          <Card>
            <div className="eyebrow">Cómo responde</div>
            <h3>Solo con el RNE</h3>
            <p className="muted small">
              Cada respuesta se arma con las fichas del RNE cargadas en TRAZZO y cita su fuente. Si
              el dato no está, lo dice.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
