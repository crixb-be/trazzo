import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { RNE_CARDS, type RneCard } from "@/data/seed-rne";
import { citationForCard } from "@/lib/rag/citations";
import { expandColloquialQuery } from "@/lib/search/colloquial";
import { searchCardsScored } from "@/lib/search/search";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

export interface RetrievedChunk {
  slug: string;
  normCode: string;
  article: string;
  text: string;
  citation: string;
  similarity?: number;
  card?: RneCard;
}

export interface VectorDocument {
  id: string;
  norm_code: string;
  article: string;
  chunk_text: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

/**
 * "synthesis": context for a language model (up to 6 related cards, so it can
 * cover width + height + accessibility together). "extractive": the local
 * answer without a model, kept to the few clearly relevant cards.
 */
export type RetrievalMode = "synthesis" | "extractive";

const MODE_LIMITS: Record<RetrievalMode, { limit: number; relativeScore: number }> = {
  synthesis: { limit: 6, relativeScore: 0.2 },
  extractive: { limit: 3, relativeScore: 0.45 },
};
const MIN_TOP_SCORE = 1.5;
const VECTOR_MATCH_THRESHOLD = 0.7;

function legacyCitation(normCode: string, article: string): string {
  return "[" + normCode + " " + article + "]";
}

function slugFromMetadata(
  metadata: Record<string, unknown>,
  normCode: string,
  article: string,
): string {
  const metadataSlug = metadata.slug;
  if (typeof metadataSlug === "string") return metadataSlug;
  return (
    RNE_CARDS.find(
      (card) => card.norm_code === normCode && card.article.toLowerCase() === article.toLowerCase(),
    )?.slug ?? ""
  );
}

function chunkFromCard(card: RneCard): RetrievedChunk {
  return {
    slug: card.slug,
    normCode: card.norm_code,
    article: card.article,
    text: card.body,
    citation: citationForCard(card),
    card,
  };
}

/** Embeds the query expanded to RNE terminology and asks pgvector for up to `limit` chunks. */
export async function retrieveVector(query: string, limit = 6): Promise<RetrievedChunk[]> {
  if (!process.env.OPENAI_API_KEY || !isSupabaseConfigured()) return [];

  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: expandColloquialQuery(query).expandedQuery,
  });
  const client = createClient();
  if (!client) return [];

  const { data, error } = await client.rpc("match_rne_documents", {
    query_embedding: embedding,
    match_threshold: VECTOR_MATCH_THRESHOLD,
    match_count: limit,
    filter_norm: null,
  });
  if (error || !data) throw error ?? new Error("No se pudieron recuperar documentos vectoriales.");

  return (data as VectorDocument[]).slice(0, limit).map((document) => {
    const metadata = document.metadata ?? {};
    const slug = slugFromMetadata(metadata, document.norm_code, document.article);
    const card = RNE_CARDS.find((candidate) => candidate.slug === slug);
    return {
      slug,
      normCode: document.norm_code,
      article: document.article,
      text: document.chunk_text,
      citation: card ? citationForCard(card) : legacyCitation(document.norm_code, document.article),
      similarity: document.similarity,
      card,
    };
  });
}

/** Weighted local search (with colloquial expansion) over the seed cards. */
export function retrieveLocal(query: string, mode: RetrievalMode = "extractive"): RetrievedChunk[] {
  const { limit, relativeScore } = MODE_LIMITS[mode];
  const scored = searchCardsScored(RNE_CARDS, query);
  const top = scored[0];
  if (!top || top.score < MIN_TOP_SCORE) return [];

  return scored
    .filter((entry, index) => index === 0 || entry.score >= top.score * relativeScore)
    .slice(0, limit)
    .map(({ card }) => chunkFromCard(card));
}

/**
 * Vector search when Supabase + OpenAI embeddings are configured, topped up
 * with local results so the model always gets enough related cards; falls
 * back to local search on any vector error.
 */
export async function retrieve(
  query: string,
  mode: RetrievalMode = "synthesis",
): Promise<RetrievedChunk[]> {
  const local = retrieveLocal(query, mode);
  if (!process.env.OPENAI_API_KEY || !isSupabaseConfigured()) return local;

  try {
    const { limit } = MODE_LIMITS[mode];
    const vector = await retrieveVector(query, limit);
    const seen = new Set(vector.map((chunk) => chunk.slug));
    return [...vector, ...local.filter((chunk) => !seen.has(chunk.slug))].slice(0, limit);
  } catch {
    return local;
  }
}
