export { EXPEDIENTE_CHECKLIST_KEY } from "@/lib/offline/workspace-storage";

export const CHECKLIST_GROUPS = [
  {
    name: "Arquitectura",
    code: "A.010 · A.120",
    items: [
      { id: "ubicacion", label: "Planos de ubicación y localización con cuadro normativo (A.010)" },
      { id: "planos-arquitectura", label: "Plantas, cortes y elevaciones a escala (A.010)" },
      { id: "parametros", label: "Retiros y alturas según los parámetros del predio (A.010)" },
      {
        id: "ruta-accesible",
        label:
          "Anchos libres de puertas y circulaciones, y pendientes de rampas según su desnivel (A.120)",
      },
      {
        id: "bano-accesible",
        label:
          "Servicios higiénicos accesibles con espacio de giro y transferencia donde corresponda (A.120)",
      },
    ],
  },
  {
    name: "Seguridad",
    code: "A.130",
    items: [
      { id: "aforo", label: "Cálculo de aforo según el uso de cada ambiente" },
      {
        id: "salidas",
        label: "Anchos de salida y distancias de recorrido verificados según el aforo y el uso",
      },
      { id: "evacuacion", label: "Plano de evacuación con rutas, salidas y señalización" },
      {
        id: "equipos-seguridad",
        label: "Ubicación de luces de emergencia y extintores según el riesgo y el uso",
      },
    ],
  },
  {
    name: "Instalaciones Sanitarias",
    code: "IS.010",
    items: [
      {
        id: "dotacion",
        label: "Dotación de agua según el uso y cálculo de cisterna y tanque, cuando correspondan",
      },
      { id: "redes", label: "Isométricos de agua y desagüe con diámetros y pendientes de desagüe" },
      {
        id: "ventilacion",
        label: "Ventilación de las montantes de desagüe indicada en los planos",
      },
    ],
  },
  {
    name: "Estructuras",
    code: "E.020 · E.060",
    items: [
      { id: "cargas", label: "Cargas vivas por uso y cargas permanentes identificadas (E.020)" },
      {
        id: "memoria",
        label:
          "Memoria de cálculo con combinaciones de carga y verificaciones de concreto armado (E.060)",
      },
      {
        id: "planos-estructuras",
        label: "Planos de cimentación, losas y columnas con detalles de refuerzo (E.060)",
      },
      {
        id: "materiales-estructuras",
        label: "Resistencia del concreto y grado del acero indicados en los planos (E.060)",
      },
    ],
  },
] as const;

type ChecklistItemId = (typeof CHECKLIST_GROUPS)[number]["items"][number]["id"];
export type CheckedItems = ReadonlySet<ChecklistItemId>;

const allItems = CHECKLIST_GROUPS.flatMap(({ items }) => [...items]);

export function parseChecklist(raw: string | null): CheckedItems {
  if (raw === null) return new Set();
  try {
    const saved: unknown = JSON.parse(raw);
    if (Array.isArray(saved)) {
      return new Set(allItems.map(({ id }) => id).filter((id) => saved.includes(id)));
    }
  } catch {
    // Una lista dañada empieza vacía.
  }
  return new Set();
}

export function serializeChecklist(checked: CheckedItems): string {
  return JSON.stringify([...checked]);
}

export function checklistProgress(
  checked: CheckedItems,
  items: ReadonlyArray<{ id: ChecklistItemId }> = allItems,
): { completed: number; total: number } {
  return {
    completed: items.filter(({ id }) => checked.has(id)).length,
    total: items.length,
  };
}
