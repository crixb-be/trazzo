import { notFound } from "next/navigation";
import { NormativeDetail } from "@/components/normativa/NormativeDetail";
import { RNE_CARDS } from "@/data/seed-rne";

export function generateStaticParams() {
  return RNE_CARDS.map((card) => ({ slug: card.slug }));
}

export default async function NormativeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!RNE_CARDS.some((card) => card.slug === slug)) notFound();
  return <NormativeDetail slug={slug} />;
}
