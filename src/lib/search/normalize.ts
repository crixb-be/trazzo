/**
 * Normalizes search text without losing the dot used in RNE codes such as A.120.
 */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s.%-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(value: string): string[] {
  return normalize(value).split(" ").filter(Boolean);
}
