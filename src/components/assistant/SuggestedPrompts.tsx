"use client";

import { ArrowUpRight } from "lucide-react";

const suggestions = [
  "¿Cuál es la pendiente máxima de una rampa de 0.60 m?",
  "¿Medidas de un estacionamiento accesible?",
  "Dotación de agua para un lote de 250 m²",
];

export function SuggestedPrompts({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="suggested-prompts">
      <div className="eyebrow">Prueba una consulta</div>
      {suggestions.map((suggestion) => (
        <button type="button" key={suggestion} onClick={() => onSelect(suggestion)}>
          <span>{suggestion}</span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
