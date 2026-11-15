import Anthropic from "@anthropic-ai/sdk";

/** Claude model used for RNE answers. */
export const CLAUDE_MODEL = "claude-opus-5-5";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface ClaudeStreamResult {
  stopReason: Anthropic.Beta.BetaStopReason | null;
}

/** The API requires the conversation to start (and here, end) with a user turn. */
function toMessages(turns: ChatTurn[]): Anthropic.Beta.BetaMessageParam[] {
  const firstUser = turns.findIndex((turn) => turn.role === "user");
  const trimmed = firstUser === -1 ? [] : turns.slice(firstUser);
  while (trimmed.length > 0 && trimmed[trimmed.length - 1].role !== "user") trimmed.pop();
  return trimmed
    .filter((turn) => turn.text.trim().length > 0)
    .map((turn) => ({ role: turn.role, content: turn.text }));
}

/**
 * Streams a Claude answer, calling `onText` for each text delta. Server-side
 * fallbacks are enabled ("default" routing) so a safety decline is retried on
 * a fallback model inside the same request instead of ending the answer.
 */
export async function streamClaudeAnswer(
  system: string,
  turns: ChatTurn[],
  onText: (delta: string) => void,
): Promise<ClaudeStreamResult> {
  const messages = toMessages(turns);
  if (messages.length === 0) return { stopReason: null };

  // Reads ANTHROPIC_API_KEY from the environment.
  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 64000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    messages,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      onText(event.delta.text);
    }
  }

  const finalMessage = await stream.finalMessage();
  return { stopReason: finalMessage.stop_reason };
}
