"use client";

import { useEffect, useState } from "react";
import { Send, Square } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { Card, Button } from "@/components/ui";
import { useOnlineStatus } from "@/lib/offline/hooks";
import { ChatMessage } from "./ChatMessage";
import { SuggestedPrompts } from "./SuggestedPrompts";
import { AssistantQuota } from "./AssistantQuota";

export function AssistantWorkspace() {
  const searchParams = useSearchParams();
  const online = useOnlineStatus();
  const [input, setInput] = useState(searchParams.get("q") ?? "");
  const chat = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const busy = chat.status === "submitted" || chat.status === "streaming";

  useEffect(() => {
    const query = searchParams.get("q");
    if (query) setInput(query);
  }, [searchParams]);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || !online || busy) return;
    setInput("");
    await chat.sendMessage({ text: prompt });
  }

  function choosePrompt(prompt: string): void {
    setInput(prompt);
  }

  return (
    <div className="assistant-page">
      <div className="eyebrow">ASISTENTE / RAG ESTRICTO</div>
      <div className="page-heading-row">
        <div>
          <h1 className="page-title">Consulta el RNE</h1>
          <p className="lead">
            Respuestas ancladas a fichas recuperadas. Cada cita abre su fuente.
          </p>
        </div>
        <div className="assistant-status mono">{online ? "ONLINE / LOCAL" : "OFFLINE"}</div>
      </div>
      <div className="assistant-layout">
        <Card className="chat-card">
          {chat.messages.length === 0 ? (
            <div className="chat-empty">
              <div className="assistant-mark">T</div>
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
                <p className="warning">
                  No pudimos completar la consulta. Puedes intentarlo de nuevo.
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
                  : "Sin conexión: revisa tus fichas locales"
              }
              disabled={!online || busy}
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
              <Button type="submit" variant="primary" disabled={!online || !input.trim()}>
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
            Respuesta extractiva o generativa limitada al contexto recuperado. Verifica siempre la
            versión vigente del MVCS.
          </p>
        </Card>
        <aside className="assistant-sidebar">
          <AssistantQuota />
          <Card>
            <div className="eyebrow">MODO LOCAL</div>
            <h3>Siempre hay una salida</h3>
            <p className="muted small">
              Sin API keys, TRAZZO recupera el seed y arma una respuesta extractiva con citas.
            </p>
          </Card>
          <SuggestedPrompts onSelect={choosePrompt} />
        </aside>
      </div>
    </div>
  );
}
