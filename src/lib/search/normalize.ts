export const SPANISH_STOPWORDS = new Set([
  "de",
  "del",
  "la",
  "las",
  "el",
  "los",
  "un",
  "una",
  "unos",
  "unas",
  "y",
  "o",
  "a",
  "al",
  "en",
  "con",
  "por",
  "para",
  "que",
  "cual",
  "cuales",
  "como",
  "cuanto",
  "cuanta",
  "cuantos",
  "cuantas",
  "debe",
  "deben",
  "tener",
  "tiene",
  "es",
  "son",
  "ser",
  "se",
  "lo",
  "mi",
  "mis",
  "su",
  "sus",
  "me",
  "hay",
  "segun",
  "sobre",
  "necesito",
  "quiero",
  "saber",
]);

export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s.%-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(value: string, removeStopwords = false): string[] {
  const tokens = normalize(value).split(" ").filter(Boolean);
  return removeStopwords ? tokens.filter((token) => !SPANISH_STOPWORDS.has(token)) : tokens;
}
