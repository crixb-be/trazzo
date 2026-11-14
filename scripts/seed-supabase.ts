import { createAdminClient } from "@/lib/supabase/admin";
import { RNE_CARDS, MATERIALS } from "@/data/seed-rne";

// Wrapped in main(): tsx compiles these scripts as CommonJS, where top-level await fails.
async function main(): Promise<void> {
  const client = createAdminClient();
  if (!client) {
    console.log(
      "Supabase no configurado; seed omitido. Revisa NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local.",
    );
    return;
  }

  const { error: cardsError } = await client.from("rne_cards").upsert(RNE_CARDS);
  if (cardsError) throw cardsError;
  const { error: materialsError } = await client.from("materials_catalog").upsert(MATERIALS);
  if (materialsError) throw materialsError;

  console.log(`Seed cargado: ${RNE_CARDS.length} fichas, ${MATERIALS.length} materiales.`);
}

main().catch((error: unknown) => {
  console.error("Error al cargar el seed:", error);
  process.exitCode = 1;
});
