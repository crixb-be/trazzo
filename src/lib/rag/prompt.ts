import type { RetrievedChunk } from "./retrieve";

export const NO_RESULT_ANSWER =
  "No encontré esto en las normas indexadas del RNE. Reformula la consulta con una norma, artículo o término técnico.";

function firstExtraSentence(body: string, summary: string): string {
  const summaryNormalized = summary.trim().toLowerCase();
  const sentence = body
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .find((part) => part && !summaryNormalized.includes(part.toLowerCase()));
  return sentence ?? "";
}

export function buildLocalAnswer(query: string, chunks: RetrievedChunk[]): string {
  void query;
  if (chunks.length === 0) return NO_RESULT_ANSWER;

  const first = chunks[0];
  const card = first.card;
  const summary = card?.summary ?? first.text.trim();
  const lines = [`**${card?.title ?? first.slug}**: ${summary} ${first.citation}`];

  if (card?.min_value !== null && card?.min_value !== undefined) {
    lines.push(`Valor referencial: ${card.min_value} ${card.unit}.`);
  }

  if (card) {
    const extra = firstExtraSentence(card.body, card.summary);
    if (extra) lines.push(extra);
  }

  const second = chunks[1];
  if (second)
    lines.push(`También aplica: ${second.card?.title ?? second.slug} ${second.citation}.`);
  lines.push("Verifica la edición vigente del RNE (MVCS) antes de usarlo en expedientes.");
  return lines.join("\n");
}

export function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  const context = chunks
    .map((chunk) => {
      const card = chunk.card;
      return [
        `Ficha: ${card?.title ?? chunk.slug}`,
        card?.summary ?? "",
        card?.min_value !== null && card?.min_value !== undefined
          ? `Valor: ${card.min_value} ${card.unit}`
          : "",
        chunk.text,
        `Cita: ${chunk.citation}`,
      ]
        .filter(Boolean)
        .join(" ");
    })
    .join("\n");

  return [
    "Eres TRAZZO RNE, asistente técnico para arquitectura y construcción en Perú.",
    "Habla de forma conversacional y directa, como en obra: usa contrapaso, huella y ancho libre.",
    "Responde la pregunta en la primera oración con el valor concreto y su unidad cuando el contexto lo permita.",
    "Usa solo las fichas relevantes del contexto; ignora las demás y nunca inventes valores.",
    "Responde en español peruano y en unas 120 palabras como máximo, salvo que pidan detalle.",
    "Cada afirmación normativa debe incluir una cita exacta como [A.120 Art. 9].",
    "Si el contexto no responde, dilo en una oración y sugiere una forma más precisa de reformular.",
    'Termina con una línea "Normas aplicables: [..] [..]" citando solo las normas usadas.',
    "CONTEXTO:",
    context || NO_RESULT_ANSWER,
  ].join("\n");
}
