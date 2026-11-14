import { createAdminClient } from "@/lib/supabase/admin";
import { RNE_CARDS, MATERIALS } from "@/data/seed-rne";
const client = createAdminClient();
if (!client) {
  console.log("Supabase no configurado; seed omitido.");
} else {
  const { error: e1 } = await client.from("rne_cards").upsert(RNE_CARDS);
  const { error: e2 } = await client.from("materials_catalog").upsert(MATERIALS);
  if (e1 || e2) throw e1 ?? e2;
  console.log(`Seed cargado: ${RNE_CARDS.length} fichas, ${MATERIALS.length} materiales.`);
}
