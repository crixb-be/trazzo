"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useProjectNotes, useProjectPhotos, useProjectQuotes } from "@/lib/offline/project-hub";
import { useSiteLogs } from "@/lib/offline/site-logs";
import { projectStages } from "@/lib/projects/stages";

export function ProjectStageStepper({
  projectId,
  takeoffsCount,
}: {
  projectId: string;
  takeoffsCount: number;
}) {
  const notes = useProjectNotes(projectId);
  const photos = useProjectPhotos(projectId);
  const quotes = useProjectQuotes(projectId);
  const logs = useSiteLogs(projectId);
  const stages = projectStages({
    projectId,
    notes,
    takeoffsCount,
    quotesCount: quotes.length,
    siteLogsCount: logs.length,
    photosCount: photos.length,
  });
  return (
    <ol className="project-stage-list" role="list" aria-label="Etapas del proyecto">
      {stages.map((stage, index) => (
        <li key={stage.id} data-status={stage.status}>
          <Link href={stage.href} aria-current={stage.status === "current" ? "step" : undefined}>
            <span className="project-stage-marker" aria-hidden="true">
              {stage.status === "done" ? <Check size={16} /> : index + 1}
            </span>
            <strong>{stage.label}</strong>
            {stage.status === "done" && <span className="sr-only">Completada</span>}
          </Link>
          <p className="muted small">{stage.hint}</p>
          {stage.secondaryHref && (
            <Link className="small" href={stage.secondaryHref}>
              {stage.secondaryLabel}
            </Link>
          )}
        </li>
      ))}
    </ol>
  );
}
