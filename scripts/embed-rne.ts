import { createAdminClient } from "@/lib/supabase/admin";
import { RNE_CARDS } from "@/data/seed-rne";

interface EmbeddingResponse {
  data: { embedding: number[]; index: number }[];
}

// Wrapped in main(): tsx compiles these scripts as CommonJS, where top-level await fails.
async function main(): Promise<void> {
  const client = createAdminClient();
  const key = process.env.OPENAI_API_KEY;
  if (!client || !key) {
    console.log(
      "Supabase u OPENAI_API_KEY no configurado; embeddings omitidos. Revisa .env.local.",
    );
    return;
  }

  const chunks = RNE_CARDS.map((card) => ({
    card,
    text: `${card.title}\n${card.norm_code} ${card.article}\n${card.body}`,
  }));
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: chunks.map((x) => x.text) }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI embeddings: ${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as EmbeddingResponse;
  let saved = 0;
  for (const item of json.data) {
    const { card, text } = chunks[item.index];
    const { data, error: lookupError } = await client
      .from("rne_cards")
      .select("id")
      .eq("slug", card.slug)
      .single();
    if (lookupError || !data) {
      console.warn(`Ficha ${card.slug} no encontrada; ejecuta antes npm run seed:supabase.`);
      continue;
    }
    const { error: upsertError } = await client.from("rne_embeddings").upsert({
      rne_card_id: data.id,
      norm_code: card.norm_code,
      article: card.article,
      chunk_text: text,
      metadata: { slug: card.slug, title: card.title },
      embedding: item.embedding,
    });
    if (upsertError) throw upsertError;
    saved += 1;
  }

  console.log(`Embeddings cargados: ${saved} de ${json.data.length}.`);
}

main().catch((error: unknown) => {
  console.error("Error al generar embeddings:", error);
  process.exitCode = 1;
});
