import type { RneCard } from "@/data/seed-rne";
import { normalize, tokenize } from "./normalize";
import { expandedTokens } from "./synonyms";

export function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution =
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        substitution,
      );
    }
    for (let index = 0; index < current.length; index += 1) previous[index] = current[index];
  }

  return previous[right.length];
}

function transposedOnce(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length - 1; index += 1) {
    if (
      left[index] !== right[index] &&
      left[index] === right[index + 1] &&
      left[index + 1] === right[index]
    ) {
      return left.slice(0, index) + left[index + 1] + left[index] + left.slice(index + 2) === right;
    }
  }
  return false;
}

function tokenMatches(fieldTokens: string[], queryToken: string): boolean {
  return fieldTokens.some(
    (fieldToken) =>
      fieldToken === queryToken ||
      fieldToken.startsWith(queryToken) ||
      (queryToken.length >= 5 &&
        fieldToken.length >= 5 &&
        (editDistance(fieldToken, queryToken) <= 1 || transposedOnce(fieldToken, queryToken))),
  );
}

function fieldScore(field: string, queryTokens: string[]): number {
  const fieldTokens = tokenize(field);
  return queryTokens.reduce(
    (score, queryToken) => score + (tokenMatches(fieldTokens, queryToken) ? 1 : 0),
    0,
  );
}

/**
 * Searches RNE cards with weighted fields, prefix matches and one typo for long tokens.
 * Weights follow ARCHITECTURE.md section 7: title ×4, keywords ×3, code/article ×5,
 * and summary ×1.
 */
export function searchCards(cards: RneCard[], query: string): RneCard[] {
  const tokens = expandedTokens(query);
  if (tokens.length === 0) return [...cards];

  return cards
    .map((card, originalIndex) => {
      const normalizedCode = normalize(card.norm_code + " " + card.article);
      const exactCodeTokens = tokenize(normalizedCode);
      const codeExactMatches = tokens.reduce(
        (score, token) => score + (exactCodeTokens.includes(token) ? 1 : 0),
        0,
      );
      const score =
        fieldScore(card.title, tokens) * 4 +
        fieldScore(card.keywords.join(" "), tokens) * 3 +
        codeExactMatches * 5 +
        fieldScore(card.summary, tokens);

      return { card, score, originalIndex };
    })
    .filter((result) => result.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.card.title.localeCompare(right.card.title, "es") ||
        left.originalIndex - right.originalIndex,
    )
    .map((result) => result.card);
}
