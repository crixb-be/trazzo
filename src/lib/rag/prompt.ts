import type { RetrievedChunk } from "./retrieve";

export const NO_RESULT_ANSWER =
  "No encontré esto en las normas indexadas del RNE. Reformula la consulta con una norma, artículo o término técnico.";

export function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  const context = chunks.map((chunk) => chunk.text + " " + chunk.citation).join("\n\n");

  return [
    "Eres TRAZZO RNE, un asistente técnico para arquitectura y obra en Perú.",
    "Responde únicamente con el contexto recuperado que aparece abajo.",
    "Cada afirmación normativa debe terminar con una cita en formato [A.120 Art. 9].",
    "Si el contexto no alcanza, dilo explícitamente y no inventes valores, artículos ni excepciones.",
    "Responde en español peruano técnico, con unidades claras y sin presentar una recomendación como aprobación de expediente.",
    "Recuerda: Valores referenciales según la edición indicada del RNE. Verifica la versión vigente publicada por el MVCS antes de usar en expedientes.",
    "",
    "CONTEXTO RECUPERADO:",
    context || NO_RESULT_ANSWER,
  ].join("\n");
}

export function buildExtractiveAnswer(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return NO_RESULT_ANSWER;

  const answer = chunks.map((chunk) => chunk.text.trim() + " " + chunk.citation).join("\n\n");

  return (
    answer +
    "\n\nValores referenciales según la edición indicada del RNE. Verifica la versión vigente publicada por el MVCS antes de usar en expedientes."
  );
}
