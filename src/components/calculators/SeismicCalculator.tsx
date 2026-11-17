"use client";
import { useState } from "react";
import { NumberField, Select } from "@/components/ui";
import { seismic2026 } from "@/lib/calculators/seismic";
import { CalculatorResult } from "./CalculatorResult";
export function SeismicCalculator() {
  const [p, setP] = useState({
    zone: 4 as 1 | 2 | 3 | 4,
    soil: "S1" as "S0" | "S1" | "S2" | "S3" | "S4",
    period: 0.5,
    U: 1,
    R0: 8,
    Ia: 1,
    Ip: 1,
    weight: 1000,
  });
  let r: ReturnType<typeof seismic2026> | undefined,
    error = "";
  try {
    r = seismic2026(p);
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <section>
      <h2>Parámetros sísmicos E.030-2026</h2>
      <p>
        RM 183-2026-VIVIENDA, publicada 03/05/2026. Usa zona del Anexo II y perfil de EMS; no
        determina el suelo a partir de la ciudad. S2/S3: caso SIN Vs30 según nota de tablas4/5
        (extremo superior). Si hay Vs30, debe interpolarse y revisarse por el especialista. La app
        no aplica ese caso.
      </p>
      <Select
        label="Zona sísmica"
        value={String(p.zone)}
        onChange={(e) => setP({ ...p, zone: +e.target.value as typeof p.zone })}
        options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
      />
      <Select
        label="Perfil del suelo (caso sin Vs30)"
        value={p.soil}
        onChange={(e) => setP({ ...p, soil: e.target.value as typeof p.soil })}
        options={["S0", "S1", "S2", "S3", "S4"].map((value) => ({ value, label: value }))}
      />
      <div className="field-grid">
        {(
          [
            ["period", "T (s)"],
            ["U", "Factor U (tabla7)"],
            ["R0", "R0 (tabla10)"],
            ["Ia", "Irregularidad en altura Ia"],
            ["Ip", "Irregularidad en planta Ip"],
            ["weight", "Peso sísmico P (kN)"],
          ] as const
        ).map(([k, label]) => (
          <NumberField
            key={k}
            label={label}
            value={p[k]}
            onValueChange={(v) => setP({ ...p, [k]: v ?? NaN })}
          />
        ))}
      </div>
      <p>
        R0, U y regularidad deben ser sustentados; A1 puede requerir aislamiento. Art.33 limita el
        análisis estático; verificar también 100%+30% ortogonal, restricciones de sistemas,
        irregularidad y derivas. No es un diseño estructural completo.
      </p>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        r && (
          <CalculatorResult
            eyebrow="E.030-2026 · arts.17,18,26,34"
            main={`V estático = ${r.V.toFixed(2)} kN`}
            details={`Z=${r.Z} · S=${r.S} · TP=${r.TP}s · TL=${r.TL}s · C espectral=${r.C.toFixed(3)} · C estático=${r.Cstatic.toFixed(3)} · R=${r.R}. Se aplica C/R ≥ 0.11.`}
            checks={[]}
            warnings={[
              "El espectro usa C=1+7.5T/TP para T<0.2TP; el método estático usa C=2.5 en todo T≤TP. Verifica régimen transitorio de la RM antes de aplicar a proyectos previos.",
            ]}
            copyText={`E.030-2026 V=${r.V.toFixed(2)} kN; Z=${r.Z}; S=${r.S}; C=${r.Cstatic}; R=${r.R}`}
          />
        )
      )}
    </section>
  );
}
