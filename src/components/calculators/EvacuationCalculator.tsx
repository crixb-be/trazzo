"use client";
import { useState } from "react";
import { NumberField, Select } from "@/components/ui";
import { computeEvacuationWidth } from "@/lib/calculators/evacuation";
import { CalculatorResult } from "./CalculatorResult";
export function EvacuationCalculator() {
  const [toStair, setToStair] = useState(true);
  const [n, setN] = useState(100),
    [element, setElement] = useState<"puerta" | "pasadizo" | "escalera">("puerta"),
    [health, setHealth] = useState(false),
    [office, setOffice] = useState(false),
    [sprinklers, setSprinklers] = useState(false),
    [distance, setDistance] = useState(30);
  const r = computeEvacuationWidth({
    occupants: n,
    element,
    healthWithoutSprinklers: health && !sprinklers,
    officePassage: office,
    toEvacuationStair: toStair,
  });
  return (
    <section>
      <h2>Ancho y recorrido de evacuación</h2>
      <p>
        RNE obligatorio · A.130 arts. 22–27. El cálculo no sustituye número de salidas, protección,
        compartimentación ni exigencias particulares por uso.
      </p>
      <NumberField
        label="Ocupantes del piso o área servida"
        value={n}
        onValueChange={(v) => setN(v ?? 0)}
      />
      <Select
        label="Componente"
        value={element}
        onChange={(e) => setElement(e.target.value as typeof element)}
        options={[
          { value: "puerta", label: "Puerta" },
          { value: "pasadizo", label: "Pasaje" },
          { value: "escalera", label: "Escalera" },
        ]}
      />
      {element === "puerta" && (
        <label>
          <input type="checkbox" checked={toStair} onChange={(e) => setToStair(e.target.checked)} />{" "}
          Puerta que entrega a escalera de evacuación (mínimo1.00 m). En otra puerta se verifica
          solo flujo; aplicar además el mínimo por uso.
        </label>
      )}
      <label>
        <input type="checkbox" checked={health} onChange={(e) => setHealth(e.target.checked)} />{" "}
        Centro de salud o asilo (art. 24)
      </label>
      <label>
        <input type="checkbox" checked={office} onChange={(e) => setOffice(e.target.checked)} />{" "}
        Pasaje de oficina que aporta a escape interior (excepción menor de 50 personas)
      </label>
      <label>
        <input
          type="checkbox"
          checked={sprinklers}
          onChange={(e) => setSprinklers(e.target.checked)}
        />{" "}
        Edificación con rociadores
      </label>
      <NumberField
        label="Recorrido horizontal real hasta medio seguro"
        unit="m"
        value={distance}
        onValueChange={(v) => setDistance(v ?? 0)}
      />
      <p>
        Art. 26–27: límite general {sprinklers ? 60 : 45} m ·{" "}
        {distance < 0 || !Number.isFinite(distance)
          ? "Entrada inválida"
          : distance <= (sprinklers ? 60 : 45)
            ? "Dentro del límite general"
            : "Supera el límite general"}
        . Riesgos especiales requieren sustento específico NFPA 101.
      </p>
      <CalculatorResult
        eyebrow="A.130 · arts. 22–24"
        main={r.ok ? r.values.width.toFixed(2) + " m" : "Entrada inválida"}
        details={`Factor ${r.values.factor} m/persona · mínimo ${r.values.minimumWidth} m. Puertas/pasajes se redondean hacia arriba en módulos de 0.60 m; escaleras no usan ese redondeo.`}
        checks={r.checks}
        warnings={r.warnings}
        copyText={`Ancho de ${element}: ${r.values.width} m · A.130 arts.22–24`}
      />
    </section>
  );
}
