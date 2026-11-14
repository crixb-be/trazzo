import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { RNE_CARDS, type RneCard } from "@/data/seed-rne";
import { searchCards } from "@/lib/search/search";
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

function citationFor(normCode: string, article: string): string {
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

/** Retrieves up to six pgvector chunks using text-embedding-3-small and a 0.75 threshold. */
export async function retrieveVector(query: string): Promise<RetrievedChunk[]> {
  if (!process.env.OPENAI_API_KEY || !isSupabaseConfigured()) return [];

  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: query,
  });
  const client = createClient();
  if (!client) return [];

  const { data, error } = await client.rpc("match_rne_documents", {
    query_embedding: embedding,
    match_threshold: 0.75,
    match_count: 6,
    filter_norm: null,
  });
  if (error || !data) throw error ?? new Error("No se pudieron recuperar documentos vectoriales.");

  return (data as VectorDocument[]).map((document) => {
    const metadata = document.metadata ?? {};
    return {
      slug: slugFromMetadata(metadata, document.norm_code, document.article),
      normCode: document.norm_code,
      article: document.article,
      text: document.chunk_text,
      citation: citationFor(document.norm_code, document.article),
      similarity: document.similarity,
    };
  });
}

/** Retrieves local seed chunks through the same weighted, typo-tolerant search used by the UI. */
export function retrieveLocal(query: string): RetrievedChunk[] {
  return searchCards(RNE_CARDS, query)
    .slice(0, 6)
    .map((card) => ({
      slug: card.slug,
      normCode: card.norm_code,
      article: card.article,
      text: card.body,
      citation: citationFor(card.norm_code, card.article),
      card,
    }));
}

/** Uses pgvector when configured and safely falls back to local extractive retrieval on errors. */
export async function retrieve(query: string): Promise<RetrievedChunk[]> {
  if (!process.env.OPENAI_API_KEY || !isSupabaseConfigured()) return retrieveLocal(query);

  try {
    return await retrieveVector(query);
  } catch {
    return retrieveLocal(query);
  }
}
