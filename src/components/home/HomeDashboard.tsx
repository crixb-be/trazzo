"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, Compass, FolderOpen, Library, Sparkles, Plus } from "lucide-react";
import { disciplineVisual, HOME_SHORTCUTS } from "./tool-visuals";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { GlobalSearch, Badge } from "@/components/ui";
import { RNE_CARDS, type RneCategory } from "@/data/seed-rne";
import { db } from "@/lib/offline/db";
import { LoadingState } from "@/components/ui/LoadingState";
import { useCards, useProjects, useSyncStatus } from "@/lib/offline/hooks";
import { syncPresentation } from "@/lib/offline/sync-presentation";
import { useLibraryActivity } from "@/lib/offline/library";
const categories: Array<{ name: RneCategory; label: string }> = [
  { name: "Accesibilidad", label: "Accesibilidad" },
  { name: "Circulación", label: "Circulación" },
  { name: "Seguridad", label: "Seguridad" },
  { name: "Sanitarias", label: "Sanitarias" },
  { name: "Estacionamientos", label: "Estacionamientos" },
  { name: "Salud", label: "Salud" },
  { name: "Educación", label: "Educación" },
  { name: "Servicios Comunales", label: "Servicios Comunales" },
];

/** Frequent field searches; each chip fills the search box. */
const QUICK_SEARCHES = ["garganta", "alféizar", "cochera", "A.120"];

function plural(count: number, one: string, many: string): string {
  return count + " " + (count === 1 ? one : many);
}

export function HomeDashboard() {
  const cards = useCards();
  const projects = useProjects();
  const sync = useSyncStatus();
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
  const allActive = useMemo(
    () => projects?.filter((project) => project.status === "activo") ?? [],
    [projects],
  );
  const activeProjects = useMemo(() => allActive.slice(0, 3), [allActive]);
  const totals = useLiveQuery(async () => {
    const ids = activeProjects.map(({ id }) => id);
    const totals = new Map<string, number>();
    if (!db || !ids.length) return totals;
    const takeoffs = await db.takeoffs.where("projectId").anyOf(ids).toArray();
    for (const { projectId, subtotalPen } of takeoffs) {
      totals.set(projectId, (totals.get(projectId) ?? 0) + subtotalPen);
    }
    return totals;
  }, [activeProjects]);
  const { long, short, icon: SyncIcon, backedUp } = syncPresentation(sync);
  const nothingYet =
    projects !== undefined && activeProjects.length === 0 && recentCards.length === 0;

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
      </section>

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
            <SyncIcon size={17} />
          </span>
          <span className="status-card-body">
            <small>Respaldo</small>
            <strong>
              <span className="status-full">{long}</span>
              <span className="status-short">{short}</span>
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

      <section className="surface-card home-assistant" aria-labelledby="home-assistant-title">
        <div className="home-assistant-heading">
          <span className="tile-icon">
            <Sparkles size={22} aria-hidden="true" />
          </span>
          <div>
            <h2 id="home-assistant-title">Pregunta al Asistente RNE</h2>
            <p className="muted">
              Respuestas con citas del RNE, también sin señal con las fichas locales.
            </p>
          </div>
          <Link href="/asistente" className="btn btn-primary">
            Abrir chat
          </Link>
        </div>
        <div className="quick-chips" aria-label="Preguntas de ejemplo">
          {[
            "¿Cuál es el ancho mínimo de una rampa?",
            "¿Cuántos contrapasos admite un tramo?",
            "¿Cómo se calcula la dotación de agua?",
          ].map((question) => (
            <Link
              className="quick-chip"
              key={question}
              href={"/asistente?q=" + encodeURIComponent(question)}
            >
              {question}
            </Link>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <h2>Acceso rápido</h2>
        </div>
        <div className="calculator-tiles home-tiles">
          {HOME_SHORTCUTS.map(({ href, title, detail, icon: Icon, family }) => (
            <Link className="calculator-tile" href={href} key={href} data-family={family}>
              <span className="tile-icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="tile-copy">
                <strong>{title}</strong>
                <small className="mono">{detail}</small>
              </span>
            </Link>
          ))}
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
            const { icon: Icon, family } = disciplineVisual(category.name);
            return (
              <Link
                className="discipline-card"
                href={
                  category.name === "Educación"
                    ? "/normativa?sector=educacion"
                    : "/normativa?cat=" + encodeURIComponent(category.name)
                }
                key={category.name}
                data-family={family}
              >
                <span className="discipline-icon" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <span className="discipline-copy">
                  <span className="discipline-name">{category.label}</span>
                  <span className="count-pill">{plural(count, "ficha", "fichas")}</span>
                </span>
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
              <Link className="icon-btn" href="/metrados" aria-label="Abrir proyectos de obra">
                <ArrowUpRight size={17} />
              </Link>
            </div>
            {projects === undefined ? (
              <LoadingState label="Cargando proyectos…" />
            ) : activeProjects.length === 0 ? (
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
                    <span className="mono">
                      {totals ? "S/ " + (totals.get(project.id) ?? 0).toFixed(2) : "…"}
                    </span>
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
