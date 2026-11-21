import { redirect } from "next/navigation";

export default async function MeasuresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? q[0] : q;
  redirect("/normativa?tab=medidas" + (query ? "&q=" + encodeURIComponent(query) : ""));
}
