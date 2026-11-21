"use client";

import { useId } from "react";
import { NumberField } from "@/components/ui";
import { SLAB_THICKNESS_PRESETS } from "@/lib/calculators/room";

/**
 * Falso piso / contrapiso thickness in centimetres, with quick picks.
 * Shared by the quick room generator and the manual contrapiso recipe.
 */
export function SlabThicknessField({
  value,
  onChange,
}: {
  value: number;
  onChange: (cm: number) => void;
}) {
  // Both forms can be on the Metrados page at once: each field needs its own id.
  const id = useId();
  return (
    <>
      <NumberField
        id={id}
        label="Espesor falso piso / contrapiso"
        unit="cm"
        value={value}
        onValueChange={(next) => onChange(next ?? NaN)}
      />
      <div className="site-log-chips" role="group" aria-label="Espesores frecuentes">
        {SLAB_THICKNESS_PRESETS.map(({ cm, label }) => (
          <button
            type="button"
            className="btn btn-sm"
            key={cm}
            aria-pressed={value === cm}
            onClick={() => onChange(cm)}
          >
            {cm} cm {label.toLowerCase()}
          </button>
        ))}
      </div>
    </>
  );
}
