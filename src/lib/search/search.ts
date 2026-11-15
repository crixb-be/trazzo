import type { RneCard } from "@/data/seed-rne";
import { normalize, tokenize } from "./normalize";
import { weightedTokens, type WeightedToken } from "./synonyms";

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

function phraseMatch(fieldTokens: string[], token: string): boolean {
  const phraseTokens = tokenize(token);
  if (phraseTokens.length === 1) return fieldTokens.includes(phraseTokens[0]);
  return fieldTokens.some((_, index) =>
    phraseTokens.every(
      (phraseToken, phraseIndex) => fieldTokens[index + phraseIndex] === phraseToken,
    ),
  );
}

function prefixMatch(fieldTokens: string[], token: string): boolean {
  const phraseTokens = tokenize(token);
  if (phraseTokens.length !== 1) return false;
  return fieldTokens.some((fieldToken) => fieldToken.startsWith(phraseTokens[0]));
}

function typoMatch(fieldTokens: string[], token: string): boolean {
  const normalized = tokenize(token)[0] ?? token;
  return fieldTokens.some(
    (fieldToken) =>
      editDistance(fieldToken, normalized) <= 1 || transposedOnce(fieldToken, normalized),
  );
}

function scoreToken(token: WeightedToken, fields: Array<[string, number, boolean]>): number {
  let score = 0;
  let hadExactOrPrefix = false;
  for (const [field, weight, exactOnly] of fields) {
    const fieldTokens = tokenize(field);
    if (phraseMatch(fieldTokens, token.token)) {
      score += token.weight * weight;
      hadExactOrPrefix = true;
    } else if (
      !exactOnly &&
      token.original &&
      token.token.length >= 4 &&
      prefixMatch(fieldTokens, token.token)
    ) {
      score += token.weight * weight * 0.8;
      hadExactOrPrefix = true;
    }
  }

  if (!hadExactOrPrefix && token.original && token.token.length >= 7) {
    for (const [field, weight] of fields) {
      const fieldTokens = tokenize(field);
      if (typoMatch(fieldTokens, token.token)) {
        score += 0.3 * weight;
        break;
      }
    }
  }
  return score;
}

export function searchCardsScored(
  cards: RneCard[],
  query: string,
): Array<{ card: RneCard; score: number }> {
  const tokens = weightedTokens(query);
  if (tokens.length === 0) return cards.map((card) => ({ card, score: 0 }));

  return cards
    .map((card, originalIndex) => {
      const fields: Array<[string, number, boolean]> = [
        [card.title, 4, false],
        [card.keywords.join(" "), 3, false],
        [card.norm_code + " " + card.article, 5, true],
        [card.summary, 1, false],
        [card.body, 0.5, false],
      ];
      const score = tokens.reduce((total, token) => total + scoreToken(token, fields), 0);
      return { card, score, originalIndex };
    })
    .filter((result) => result.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.card.title.localeCompare(right.card.title, "es") ||
        left.originalIndex - right.originalIndex,
    )
    .map(({ card, score }) => ({ card, score }));
}

export function searchCards(cards: RneCard[], query: string): RneCard[] {
  return searchCardsScored(cards, query).map(({ card }) => card);
}
