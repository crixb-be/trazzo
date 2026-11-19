"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Cloud,
  CloudOff,
  Compass,
  FolderOpen,
  Library,
  Plus,
} from "lucide-react";
import type { CSSProperties } from "react";
import { DISCIPLINE_FAMILY, tileLayout, toolVisual } from "./tool-visuals";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { GlobalSearch, Badge } from "@/components/ui";
import { RNE_CARDS, type RneCategory } from "@/data/seed-rne";
import { db, type Project } from "@/lib/offline/db";
import { useCards, useProjects, useSyncStatus } from "@/lib/offline/hooks";
import { describeSyncStatus } from "@/lib/offline/sync";
import { useLibraryActivity } from "@/lib/offline/library";
import { resolveTools } from "@/lib/onboarding/onboarding";
import { useOnboarding } from "@/lib/onboarding/use-onboarding";

const categories: Array<{ name: RneCategory; label: string }> = [
  { name: "Accesibilidad", label: "Accesibilidad" },
  { name: "Circulación", label: "Circulación" },
  { name: "Seguridad", label: "Seguridad" },
  { name: "Sanitarias", label: "Sanitarias" },
  { name: "Estacionamientos", label: "Estacionamientos" },
];

/** Frequent field searches; each chip fills the search box. */
const QUICK_SEARCHES = ["garganta", "alféizar", "cochera", "A.120"];

function projectTotal(
  project: Project,
  takeoffs: Array<{ projectId: string; subtotalPen: number }>,
) {
  return takeoffs
    .filter((takeoff) => takeoff.projectId === project.id)
    .reduce((total, takeoff) => total + takeoff.subtotalPen, 0);
}

function plural(count: number, one: string, many: string): string {
  return count + " " + (count === 1 ? one : many);
}

export function HomeDashboard() {
  const cards = useCards();
  const projects = useProjects();
  const takeoffs = useLiveQuery(async () => (db ? db.takeoffs.toArray() : []), [], []) ?? [];
  const sync = useSyncStatus();
  const onboarding = useOnboarding();
  const calculators = resolveTools(onboarding.state?.tools ?? []);
  const personalised = (onboarding.state?.tools.length ?? 0) > 0;
  const [quickQuery, setQuickQuery] = useState("");

  const library = cards.length ? cards : RNE_CARDS;
  const categoryCounts = new Map<RneCategory, number>();
  for (const category of categories) categoryCounts.set(category.name, 0);
  for (const card of library)
    categoryCounts.set(card.category, (categoryCounts.get(card.category) ?? 0) + 1);

  const activity = useLibraryActivity();
  const recentCards = activity
    .filter((a) => a.visitedAt)
    .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))
    .map((a) => library.find((c) => c.slug === a.slug))
    .filter((c): c is (typeof RNE_CARDS)[number] => !!c)
    .slice(0, 4);
  const allActive = projects.filter((project) => project.status === "activo");
  const activeProjects = allActive.slice(0, 3);
  const backedUp = Boolean(sync.signedIn && sync.lastSync && !sync.pending && !sync.error);
  // Phones show the three states side by side: each needs a one-word value.
  const syncShort = sync.syncing
    ? "Sincronizando"
    : sync.pending || sync.error
      ? "Pendiente"
      : backedUp
        ? "En la nube"
        : "Local";
  const tiles = tileLayout(calculators.length);
  const nothingYet = activeProjects.length === 0 && recentCards.length === 0;

  return (
    <div className="home-dashboard">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <div className="eyebrow">Espacio de trabajo</div>
          <h1 className="page-title" id="home-title">
            Herramientas de obra
          </h1>
          <p className="lead">Normativa RNE, cálculos y metrados a mano, con o sin señal.</p>
        </div>
        <div className="hero-search">
          <GlobalSearch
            key={quickQuery}
            variant="inline"
            initialQuery={quickQuery}
            autoFocus={Boolean(quickQuery)}
          />
          <div className="quick-chips" role="group" aria-label="Búsquedas rápidas">
            {QUICK_SEARCHES.map((term) => (
              <button
                type="button"
                className="quick-chip"
                key={term}
                aria-pressed={quickQuery === term}
                onClick={() => setQuickQuery(term)}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
        <div className="status-cards">
          <Link className="status-card" href="/metrados">
            <span className="status-card-icon" aria-hidden="true">
              <FolderOpen size={17} />
            </span>
            <span className="status-card-body">
              <small>
                <span className="status-full">Proyectos activos</span>
                <span className="status-short">Proyectos</span>
              </small>
              <strong className="mono">{allActive.length}</strong>
            </span>
          </Link>
          <Link className="status-card" href="/cuenta">
            <span
              className={"status-card-icon " + (backedUp ? "is-ok" : "is-pending")}
              aria-hidden="true"
            >
              {sync.online ? <Cloud size={17} /> : <CloudOff size={17} />}
            </span>
            <span className="status-card-body">
              <small>Respaldo</small>
              <strong>
                <span className="status-full">{describeSyncStatus(sync)}</span>
                <span className="status-short">{syncShort}</span>
              </strong>
            </span>
          </Link>
          <Link className="status-card" href="/normativa">
            <span className="status-card-icon" aria-hidden="true">
              <Library size={17} />
            </span>
            <span className="status-card-body">
              <small>
                <span className="status-full">Biblioteca offline</span>
                <span className="status-short">Biblioteca</span>
              </small>
              <strong>
                <span className="status-full">{plural(library.length, "ficha", "fichas")}</span>
                <span className="status-short mono">{library.length}</span>
              </strong>
            </span>
          </Link>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Acceso rápido</div>
            <h2>{personalised ? "Tus herramientas" : "Herramientas de proyecto"}</h2>
          </div>
          <Link className="source-link" href="/calculadoras">
            Ver todas
          </Link>
        </div>
        <div
          className="calculator-tiles home-tiles"
          style={{ "--tile-columns": tiles.columns } as CSSProperties}
        >
          {calculators.map((calculator, index) => {
            const { icon: Icon, family } = toolVisual(calculator.id);
            return (
              <Link
                className="calculator-tile"
                href={calculator.href}
                key={calculator.id}
                data-family={family}
                data-wide={index < tiles.wide ? "" : undefined}
                data-wide-mobile={index < tiles.wideMobile ? "" : undefined}
              >
                <span className="tile-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span className="tile-copy">
                  <strong>{calculator.title}</strong>
                  <small className="mono">{calculator.detail}</small>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Biblioteca local</div>
            <h2>Normas por disciplina</h2>
          </div>
          <Link className="source-link" href="/normativa">
            Ver normativa
          </Link>
        </div>
        <div className="category-grid">
          {categories.map((category) => {
            const count = categoryCounts.get(category.name) ?? 0;
            return (
              <Link
                className="discipline-card"
                href={"/normativa?cat=" + encodeURIComponent(category.name)}
                key={category.name}
                data-family={DISCIPLINE_FAMILY[category.name] ?? "piedra"}
              >
                <span className="discipline-name">{category.label}</span>
                <span className="count-pill mono">{plural(count, "ficha", "fichas")}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {nothingYet ? (
        <section className="dashboard-section home-start-strip" aria-labelledby="home-start-title">
          <span className="home-start-icon" aria-hidden="true">
            <Compass size={20} />
          </span>
          <div className="home-start-copy">
            <h2 id="home-start-title">Empieza por un proyecto o una ficha</h2>
            <p className="muted">
              Tus proyectos activos y las fichas que abras aparecerán aquí para retomarlos rápido.
            </p>
          </div>
          <div className="home-start-actions">
            <Link className="btn btn-primary" href="/metrados">
              <Plus size={15} aria-hidden="true" /> Nuevo proyecto
            </Link>
            <Link className="btn" href="/normativa">
              <BookOpen size={15} aria-hidden="true" /> Explorar normativa
            </Link>
          </div>
        </section>
      ) : (
        <div className="dashboard-columns">
          <section className="dashboard-section dashboard-panel">
            <div className="section-heading">
              <div>
                <div className="eyebrow">Proyectos activos</div>
                <h2>Tu trabajo local</h2>
              </div>
              <Link className="icon-btn" href="/metrados" aria-label="Abrir metrados">
                <ArrowUpRight size={17} />
              </Link>
            </div>
            {activeProjects.length === 0 ? (
              <div className="panel-empty panel-empty-action">
                <span className="muted small">
                  Aún no hay proyectos. Se guardan primero en este dispositivo.
                </span>
                <Link className="btn btn-sm" href="/metrados">
                  <Plus size={14} aria-hidden="true" /> Nuevo proyecto
                </Link>
              </div>
            ) : (
              <div className="project-list">
                {activeProjects.map((project) => (
                  <Link
                    href={`/metrados?project=${project.id}`}
                    key={project.id}
                    className="project-row"
                  >
                    <FolderOpen size={18} className="text-accent" aria-hidden="true" />
                    <span>
                      <strong>{project.name}</strong>
                      <small>
                        {project.location || "Sin ubicación"} ·{" "}
                        {project.typology || "Sin tipología"}
                      </small>
                    </span>
                    <span className="mono">S/ {projectTotal(project, takeoffs).toFixed(2)}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-section dashboard-panel">
            <div className="section-heading">
              <div>
                <div className="eyebrow">Fichas recientes</div>
                <h2>Para revisar hoy</h2>
              </div>
              <Link className="icon-btn" href="/normativa" aria-label="Abrir normativa">
                <BookOpen size={17} aria-hidden="true" />
              </Link>
            </div>
            {recentCards.length === 0 ? (
              <p className="panel-empty muted small">
                Las fichas que abras aparecerán aquí para retomarlas rápido.
              </p>
            ) : (
              <div className="featured-list">
                {recentCards.map((card) => (
                  <Link href={"/normativa/" + card.slug} key={card.slug} className="featured-row">
                    <span className="mono norm-code">{card.norm_code}</span>
                    <span>
                      <strong>{card.title}</strong>
                      <small>{card.article}</small>
                    </span>
                    {card.is_pro && <Badge variant="pro">PRO</Badge>}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
