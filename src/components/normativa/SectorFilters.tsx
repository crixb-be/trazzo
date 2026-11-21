"use client";

import { useEffect, useRef } from "react";
import { Chip } from "@/components/ui/Chip";

export function SectorFilters<Id extends string>({
  options,
  sector,
  onSectorChange,
  codes,
  normCode,
  onNormChange,
}: {
  options: readonly { id: Id; label: string }[];
  sector: Id;
  onSectorChange: (id: Id) => void;
  codes: readonly string[];
  normCode: string;
  onNormChange: (code: string) => void;
}) {
  const row = useRef<HTMLDivElement>(null);

  // Keep the active sector visible in the horizontally scrolling row (deep links, back navigation).
  useEffect(() => {
    const container = row.current;
    const active = container?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!container || !active || container.scrollWidth <= container.clientWidth) return;
    const box = container.getBoundingClientRect();
    const pill = active.getBoundingClientRect();
    container.scrollLeft += pill.left - box.left - (box.width - pill.width) / 2;
  }, [sector]);

  return (
    <div className="sector-filters">
      <div className="filter-row sector-filter-row" role="group" aria-label="Sector" ref={row}>
        {options.map(({ id, label }) => (
          <Chip
            key={id}
            active={sector === id}
            aria-pressed={sector === id}
            onClick={() => onSectorChange(id)}
          >
            {label}
          </Chip>
        ))}
      </div>
      {codes.length > 1 && (
        <div className="norm-code-row" role="group" aria-label="Código de norma">
          {["Todos", ...codes].map((code) => (
            <button
              type="button"
              key={code}
              className={"norm-code-chip " + (normCode === code ? "active" : "")}
              aria-pressed={normCode === code}
              onClick={() => onNormChange(code)}
            >
              {code}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
