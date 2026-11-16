"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, Briefcase, Calculator, FolderOpen, Plus } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { Card, GlobalSearch, Badge, EmptyState } from "@/components/ui";
import { RNE_CARDS, type RneCategory } from "@/data/seed-rne";
import { db, type Project } from "@/lib/offline/db";
import { useCards, useProjects, useSyncStatus } from "@/lib/offline/hooks";

const categories: Array<{ name: RneCategory; label: string }> = [
  { name: "Accesibilidad", label: "Accesibilidad" },
  { name: "Circulación", label: "Circulación" },
  { name: "Seguridad", label: "Seguridad" },
  { name: "Sanitarias", label: "Sanitarias" },
  { name: "Estacionamientos", label: "Estacionamientos" },
];

const calculators = [
  { title: "Escaleras", detail: "2cp + p", href: "/calculadoras?tab=escaleras" },
  { title: "Rampas", detail: "Pendientes A.120", href: "/calculadoras?tab=rampas" },
  { title: "Agua", detail: "IS.010", href: "/calculadoras?tab=agua" },
  { title: "Pozos de luz", detail: "H/3 · H/4", href: "/calculadoras?tab=pozos" },
  { title: "Evacuación", detail: "Aforo y salidas", href: "/calculadoras?tab=evacuacion" },
  { title: "Honorarios", detail: "Cotiza y exporta PDF", href: "/honorarios" },
];

function projectTotal(
  project: Project,
  takeoffs: Array<{ projectId: string; subtotalPen: number }>,
) {
  return takeoffs
    .filter((takeoff) => takeoff.projectId === project.id)
    .reduce((total, takeoff) => total + takeoff.subtotalPen, 0);
}

export function HomeDashboard() {
  const cards = useCards();
  const projects = useProjects();
  const takeoffs = useLiveQuery(async () => (db ? db.takeoffs.toArray() : []), [], []) ?? [];
  const sync = useSyncStatus();

  const categoryCounts = new Map<RneCategory, number>();
  for (const category of categories) categoryCounts.set(category.name, 0);
  for (const card of cards)
    categoryCounts.set(card.category, (categoryCounts.get(card.category) ?? 0) + 1);

  const recentCards = cards.length > 0 ? cards.slice(0, 4) : RNE_CARDS.slice(0, 4);
  const activeProjects = projects.filter((project) => project.status === "activo").slice(0, 3);

  return (
    <div className="home-dashboard">
      <section className="home-hero">
        <div className="eyebrow">TRAZZO / ESPACIO DE TRABAJO</div>
        <h1 className="page-title">Herramientas de obra</h1>
        <div className="hero-search">
          <GlobalSearch variant="inline" />
          <p className="search-hint mono">Prueba: garganta · alféizar · cochera · A.120</p>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">ACCESO RÁPIDO</div>
            <h2>Herramientas de proyecto</h2>
          </div>
          <Link className="source-link" href="/calculadoras">
            Ver todas
          </Link>
        </div>
        <div className="calculator-tiles">
          {calculators.map((calculator) => (
            <Link className="calculator-tile" href={calculator.href} key={calculator.title}>
              <span className="tile-icon">
                {calculator.href === "/honorarios" ? (
                  <Briefcase size={18} aria-hidden="true" />
                ) : (
                  <Calculator size={18} aria-hidden="true" />
                )}
              </span>
              <span>
                <strong>{calculator.title}</strong>
                <small className="mono">{calculator.detail}</small>
              </span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">BIBLIOTECA LOCAL</div>
            <h2>Normas por disciplina</h2>
          </div>
          <span className="mono muted small">{cards.length || RNE_CARDS.length} fichas</span>
        </div>
        <div className="category-grid">
          {categories.map((category) => (
            <Link href={"/normativa?cat=" + encodeURIComponent(category.name)} key={category.name}>
              <span className="category-count">{categoryCounts.get(category.name) ?? 0}</span>
              <span>{category.label}</span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <div className="dashboard-columns">
        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">PROYECTOS ACTIVOS</div>
              <h2>Tu trabajo local</h2>
            </div>
            <Link className="icon-btn" href="/metrados" aria-label="Abrir metrados">
              <ArrowUpRight size={17} />
            </Link>
          </div>
          {activeProjects.length === 0 ? (
            <EmptyState
              title="Aún no hay proyectos"
              description="Crea un proyecto de metrados. Se guarda primero en este dispositivo."
              action={
                <Link className="btn btn-primary" href="/metrados">
                  <Plus size={15} /> Nuevo proyecto
                </Link>
              }
            />
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
                      {project.location || "Sin ubicación"} · {project.typology || "Sin tipología"}
                    </small>
                  </span>
                  <span className="mono">S/ {projectTotal(project, takeoffs).toFixed(2)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">FICHAS RECIENTES</div>
              <h2>Para revisar hoy</h2>
            </div>
            <Link className="icon-btn" href="/normativa" aria-label="Abrir normativa">
              <BookOpen size={17} aria-hidden="true" />
            </Link>
          </div>
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
        </section>
      </div>

      <div className="sync-strip">
        <span className={sync.online ? "dot" : "dot offline"} />
        <span>
          {sync.online ? "Conectado" : "Modo sin conexión"} · {sync.pending} cambios pendientes
        </span>
        <span className="mono muted">
          {sync.lastSync
            ? "Última sync " + new Date(sync.lastSync).toLocaleString("es-PE")
            : "Catálogo guardado en el dispositivo"}
        </span>
        <Link href="/cuenta">Ver estado</Link>
      </div>
    </div>
  );
}
