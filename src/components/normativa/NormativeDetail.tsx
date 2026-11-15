"use client";

import Link from "next/link";
import { ChevronDown, Lock, MessageSquare, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Chip, NumberField, PaywallModal } from "@/components/ui";
import { RneDiagram, type DiagramOverrides } from "@/components/svg-diagrams";
import { RNE_CARDS, type RneCard } from "@/data/seed-rne";
import { useCard, useCards } from "@/lib/offline/hooks";
import { createClient } from "@/lib/supabase/client";
import { canUseProCards, type Plan } from "@/lib/plans/plans";

const legalDisclaimer =
  "Valores referenciales según la edición indicada del RNE. Verifica la versión vigente publicada por el MVCS antes de usar en expedientes.";

export function NormativeDetail({ slug }: { slug: string }) {
  const localCard = useCard(slug);
  const allCards = useCards();
  const card = localCard ?? RNE_CARDS.find((candidate) => candidate.slug === slug);
  const [overrides, setOverrides] = useState<DiagramOverrides>({});
  const [showParameters, setShowParameters] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [plan, setPlan] = useState<Plan>("free");
  const [paywall, setPaywall] = useState(false);

  useEffect(() => {
    const client = createClient();
    if (!client) return;
    void client.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const profile = await client
        .from("profiles")
        .select("plan,student_verified")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile.data?.plan === "student" && profile.data.student_verified) setPlan("student");
      if (profile.data?.plan === "pro") setPlan("pro");
    });
  }, []);

  if (!card) return <DetailState message="No encontramos esta ficha normativa." />;

  const hasAccess = canUseProCards(plan, plan === "student");
  const locked = card.is_pro && !hasAccess;
  const related = (allCards.length ? allCards : RNE_CARDS)
    .filter((candidate) => candidate.category === card.category && candidate.slug !== card.slug)
    .slice(0, 3);
  const numericParams = Object.entries(card.params).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number",
  );

  function updateParameter(name: string, value: number): void {
    setOverrides((current) => ({ ...current, [name]: value }));
  }

  return (
    <div className="detail-page">
      <Link href="/normativa" className="back-link">
        ← Volver a normativa
      </Link>

      <div className="detail-layout">
        <section className="detail-visual">
          <div className="diagram-plate">
            <RneDiagram card={card} overrides={overrides} />
          </div>
          <Card className="parameter-card">
            <button
              className="parameter-toggle"
              type="button"
              onClick={() => setShowParameters((visible) => !visible)}
              aria-expanded={showParameters}
            >
              <span>
                <SlidersHorizontal size={15} /> Parámetros de lámina
              </span>
              <ChevronDown size={16} className={showParameters ? "rotate" : ""} />
            </button>
            {showParameters && (
              <div className="parameter-grid">
                {numericParams.length === 0 ? (
                  <p className="muted small">Esta lámina no tiene parámetros editables.</p>
                ) : (
                  numericParams.map(([name, value]) => (
                    <NumberField
                      key={name}
                      label={name.replaceAll("_", " ")}
                      unit="m"
                      value={Number(overrides[name] ?? value)}
                      step={0.01}
                      onValueChange={(next) => updateParameter(name, next ?? 0)}
                    />
                  ))
                )}
              </div>
            )}
          </Card>
        </section>

        <section className={"detail-copy " + (locked ? "detail-locked" : "")}>
          <div className="eyebrow">{card.category}</div>
          <div className="detail-reference mono">
            <span>{card.norm_code}</span>
            <span>{card.article}</span>
            <span>{card.edition}</span>
          </div>
          <h1 className="page-title">{card.title}</h1>
          <div className="card-badges">
            {card.is_pro && (
              <Badge variant="pro">
                <Lock size={12} /> Contenido Pro
              </Badge>
            )}
            {!card.verified_at && <Badge variant="por-verificar">Por verificar</Badge>}
          </div>

          <Card className="highlight-value">
            <span className="eyebrow">VALOR MÍNIMO REFERENCIAL</span>
            <strong className="mono">
              {card.min_value ?? "—"} <small>{card.unit}</small>
            </strong>
          </Card>

          <p className="detail-summary">{card.summary}</p>
          <div className="detail-body">
            <p>{card.body}</p>
          </div>

          <div className="legal-disclosure">
            <button type="button" onClick={() => setShowLegal((visible) => !visible)}>
              <span>
                <ChevronDown size={16} className={showLegal ? "rotate" : ""} /> Letra chica
              </span>
              <span className="mono small">RNE / revisión</span>
            </button>
            {showLegal && (
              <div>
                <p>{card.legal_note}</p>
                <p className="legal">{legalDisclaimer}</p>
              </div>
            )}
          </div>

          <div className="keyword-list">
            {card.keywords.map((keyword) => (
              <Link href={"/normativa?q=" + encodeURIComponent(keyword)} key={keyword}>
                <Chip>{keyword}</Chip>
              </Link>
            ))}
          </div>

          <div className="detail-actions">
            <Button
              variant="primary"
              onClick={() =>
                window.location.assign(
                  "/asistente?q=" +
                    encodeURIComponent("Explícame " + card.title + " según " + card.norm_code),
                )
              }
            >
              <MessageSquare size={16} /> Preguntar al asistente
            </Button>
          </div>

          <section className="related-section">
            <div className="eyebrow">MISMA DISCIPLINA</div>
            <div className="related-grid">
              {related.map((relatedCard) => (
                <Link
                  href={"/normativa/" + relatedCard.slug}
                  className="related-card"
                  key={relatedCard.slug}
                >
                  <span className="mono">{relatedCard.norm_code}</span>
                  <strong>{relatedCard.title}</strong>
                </Link>
              ))}
            </div>
          </section>
        </section>
      </div>

      {locked && (
        <div className="pro-overlay">
          <div className="pro-overlay-card">
            <Lock size={20} className="text-accent" />
            <strong>Esta ficha es parte de TRAZZO Pro</strong>
            <p>Activa Estudiante o Pro para consultar el criterio completo.</p>
            <Button variant="primary" onClick={() => setPaywall(true)}>
              Ver planes
            </Button>
          </div>
        </div>
      )}
      {paywall && <PaywallModal onClose={() => setPaywall(false)} />}
    </div>
  );
}

function DetailState({ message }: { message: string }) {
  return (
    <div className="state-panel">
      <p>{message}</p>
      <Link className="btn" href="/normativa">
        Volver a normativa
      </Link>
    </div>
  );
}
