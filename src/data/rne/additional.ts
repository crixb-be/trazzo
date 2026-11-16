import type { RneCard } from "../seed-rne";
const topics = [
  [
    "vivienda-programa-a020",
    "Vivienda: programa y habitabilidad",
    "A.020",
    "Circulación",
    "Revisa dimensiones, iluminación y ventilación de cada ambiente según tipología; no extrapoles un mínimo a todos los usos.",
  ],
  [
    "comercio-aforo-a070",
    "Comercio: aforo por actividad",
    "A.070",
    "Seguridad",
    "Separa áreas de venta, depósitos y personal al determinar la ocupación; comprueba la tabla correspondiente a la actividad concreta.",
  ],
  [
    "oficinas-aforo-a080",
    "Oficinas: ocupación y servicios",
    "A.080",
    "Sanitarias",
    "Relaciona área útil, ocupación y dotación sanitaria; comprueba servicios para personal, público y accesibilidad.",
  ],
  [
    "seguridad-rutas-a130",
    "Seguridad: rutas y protección contra incendio",
    "A.130",
    "Seguridad",
    "Evalúa en conjunto aforo, número y ancho de salidas, recorridos, resistencia al fuego, señalización, detección y extinción. Esta ficha es una guía de revisión; no reproduce la norma completa.",
  ],
  [
    "sanitarios-dotacion-is010",
    "Sanitarias: dotación de aparatos",
    "IS.010",
    "Sanitarias",
    "Distingue uso, población, grupos de usuarios y servicios independientes. Revisa dotación de aparatos además de almacenamiento y abastecimiento de agua.",
  ],
  [
    "estructuras-cargas-e020",
    "Estructuras: cargas de diseño",
    "E.020",
    "Seguridad",
    "Identifica cargas permanentes y sobrecargas según uso. El predimensionamiento no sustituye el análisis estructural ni la revisión profesional.",
  ],
  [
    "estructuras-concreto-e060",
    "Estructuras: concreto armado",
    "E.060",
    "Seguridad",
    "Coordina especificación de resistencia, durabilidad, recubrimientos, refuerzo y control de calidad con el proyecto estructural y el diseño de mezcla.",
  ],
] as const;
export const ADDITIONAL_CARDS: RneCard[] = topics.map(
  ([slug, title, norm_code, category, body]) => ({
    slug,
    title,
    norm_code,
    category,
    article: "Artículo pendiente de contraste",
    keywords: [title, norm_code],
    min_value: null,
    unit: "",
    summary: body,
    body,
    legal_note:
      "Guía de revisión por verificar. Artículo, resolución y texto oficial pendientes; no usar como exigencia normativa comprobada.",
    edition: "Pendiente de contraste documental",
    svg_type: "reference",
    params: {},
    is_pro: false,
    verified_at: null,
    source_resolution: null,
  }),
);
