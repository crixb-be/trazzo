"use client";

import { useProjects } from "@/lib/offline/hooks";
import { linkQuoteToProject, useQuoteProjectId } from "@/lib/offline/project-hub";

/** Chooses which project a saved quote belongs to. */
export function QuoteProjectLink({ quoteId }: { quoteId: string }) {
  const projects = useProjects();
  const linked = useQuoteProjectId(quoteId);
  if (!projects?.length) return null;

  return (
    <label className="quote-project-link">
      <span>Proyecto de esta cotización</span>
      <select
        className="select"
        value={linked ?? ""}
        onChange={(event) => void linkQuoteToProject(quoteId, event.target.value || null)}
      >
        <option value="">Sin proyecto</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </label>
  );
}
