import type { RetrievedChunk } from "./retrieve";

export const NO_RESULT_ANSWER =
  "No encontré esto en las normas indexadas del RNE. Reformula la consulta con una norma, artículo o término técnico.";

const DISCLAIMER = "Verifica la edición vigente del RNE (MVCS) antes de usarlo en expedientes.";

function referenceValue(chunk: RetrievedChunk): string {
  const card = chunk.card;
  if (card?.min_value === null || card?.min_value === undefined) return "";
  // Lengths read as in drawings ("0.90 m"); other units keep their own precision.
  const value =
    typeof card.min_value === "number" && card.unit.trim() === "m"
      ? card.min_value.toFixed(2)
      : String(card.min_value);
  return `${value} ${card.unit}`.trim();
}

/**
 * Answer without a language model: a direct opening line from the most
 * relevant card, then every other relevant card as a bullet with its value
 * and clickable citation, so "medida de puerta" shows width and height.
 */
export function buildLocalAnswer(query: string, chunks: RetrievedChunk[]): string {
  void query;
  if (chunks.length === 0) return NO_RESULT_ANSWER;

  const [first, ...rest] = chunks;
  const firstValue = referenceValue(first);
  const lines = [
    `**${first.card?.title ?? first.slug}**: ${first.card?.summary ?? first.text.trim()} ${first.citation}`,
  ];
  if (firstValue) lines.push(`Valor referencial: **${firstValue}**.`);

  if (rest.length > 0) {
    lines.push("", "**También aplica:**");
    for (const chunk of rest) {
      const value = referenceValue(chunk);
      lines.push(
        `- **${chunk.card?.title ?? chunk.slug}**${value ? ` (${value})` : ""}: ${
          chunk.card?.summary ?? chunk.text.trim()
        } ${chunk.citation}`,
      );
    }
  }

  lines.push("", DISCLAIMER);
  return lines.join("\n");
}

function contextBlock(chunk: RetrievedChunk, index: number): string {
  const card = chunk.card;
  const value = referenceValue(chunk);
  return [
    `### Ficha ${index + 1}: ${card?.title ?? chunk.slug}`,
    `Cita exacta: ${chunk.citation}`,
    card?.summary ? `Resumen: ${card.summary}` : "",
    value ? `Valor referencial: ${value}` : "",
    `Texto: ${chunk.text.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * System prompt for the synthesis models. The context is the full set of
 * retrieved cards; the model decides which ones apply and must reuse their
 * citation strings verbatim so the UI can turn them into links.
 */
export function buildSystemPrompt(chunks: RetrievedChunk[], technicalTerms: string[] = []): string {
  const context = chunks.map(contextBlock).join("\n\n");

  return [
    "Eres TRAZZO RNE, asistente técnico para arquitectura y construcción en Perú. Ayudas a arquitectos, estudiantes y maestros de obra a entender el Reglamento Nacional de Edificaciones (RNE).",
    "",
    "Cómo responder:",
    "- Empieza con una respuesta directa en español cotidiano (1-2 oraciones), con los valores concretos y sus unidades.",
    "- Luego agrega una sección **Respaldo técnico** con viñetas: cubre todos los aspectos que el usuario necesita aunque no los haya nombrado. Ejemplo: si pregunta la medida de una puerta, da el ancho libre mínimo, la altura mínima del vano y el caso accesible de la A.120 cuando esas fichas estén en el contexto.",
    "- Si una ficha del contexto no tiene relación con la pregunta, ignórala.",
    "- Cada valor normativo lleva su cita copiada exactamente del campo «Cita exacta» de su ficha, por ejemplo [A.120 Art. 9 · Ancho de puerta accesible]. No cambies el texto entre corchetes y no inventes citas.",
    "- Nunca inventes valores, artículos ni excepciones. Si el contexto no alcanza para responder, dilo en una oración y sugiere qué dato o término precisar.",
    "- Usa Markdown simple: **negritas** para valores clave, viñetas con «- » y párrafos cortos. No uses tablas ni encabezados con «#».",
    "- Extensión: completa pero sin relleno, normalmente entre 80 y 220 palabras.",
    `- Cierra con una línea en cursiva: _${DISCLAIMER}_`,
    "",
    technicalTerms.length
      ? `La consulta está en lenguaje cotidiano; equivale en el RNE a: ${technicalTerms.join(", ")}.`
      : "",
    "",
    "CONTEXTO RECUPERADO:",
    context || NO_RESULT_ANSWER,
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");
}
