import type { PocketMeasure } from "../medidas";
import type { RneCard } from "../seed-rne";

/**
 * RNE Norma A.090 "Servicios Comunales", approved by DS N° 011-2006-VIVIENDA
 * (El Peruano, 09/06/2006, p. 320669–320670). Transcribed from that publication and
 * cross-checked against the copy in docs/rne/A.090 SERVICIOS COMUNALES.pdf (same text).
 *
 * The norm sets no minimum ceiling height nor a fixed corridor width: those come from
 * A.010 and A.130 and are deliberately not attributed to A.090 here.
 */
export const A090_CODE = "A.090";
export const A090_VERIFIED_AT = "2026-11-21";
export const A090_RESOLUTION = "DS N° 011-2006-VIVIENDA (El Peruano, 09/06/2006)";
export const A090_EDITION = "RNE · Norma A.090 Servicios Comunales · DS N° 011-2006-VIVIENDA";
export const A090_LEGAL_NOTE =
  "Contrastado con la publicación oficial de la Norma A.090 en El Peruano (09/06/2006). " +
  "Verifica en el portal del MVCS que no existan modificatorias posteriores antes de usar en expedientes.";

function card(
  data: Omit<
    RneCard,
    "norm_code" | "category" | "edition" | "legal_note" | "verified_at" | "source_resolution"
  > & { legal_note?: string },
): RneCard {
  return {
    norm_code: A090_CODE,
    category: "Servicios Comunales",
    edition: A090_EDITION,
    verified_at: A090_VERIFIED_AT,
    source_resolution: A090_RESOLUTION,
    ...data,
    legal_note: data.legal_note ? data.legal_note + " " + A090_LEGAL_NOTE : A090_LEGAL_NOTE,
  };
}

const COMMUNAL_KEYWORDS = [
  "servicios comunales",
  "a.090",
  "a090",
  "municipalidad",
  "comisaría",
  "bomberos",
  "serenazgo",
  "biblioteca",
  "museo",
  "salón comunal",
  "local institucional",
];

export const A090_CARDS: RneCard[] = [
  card({
    slug: "a090-alcance",
    title: "Servicios comunales: alcance y tipos",
    article: "Art. 1 y 2",
    keywords: [
      ...COMMUNAL_KEYWORDS,
      "alcance",
      "templo",
      "cementerio",
      "asilo",
      "orfanato",
      "juzgado",
      "galería de arte",
    ],
    min_value: null,
    unit: "",
    summary:
      "Edificaciones de servicios públicos complementarios a la vivienda: seguridad y vigilancia, protección social, culto, servicios culturales y gobierno.",
    body:
      "Art. 1: Se denomina edificaciones para servicios comunales a aquellas destinadas a desarrollar actividades de servicios públicos complementarios a las viviendas, en permanente relación funcional con la comunidad.\n" +
      "Art. 2: Comprende los siguientes tipos de edificaciones:\n" +
      "· Servicios de Seguridad y Vigilancia: compañías de bomberos, comisarías policiales, estaciones para serenazgo.\n" +
      "· Protección Social: asilos, orfanatos, juzgados.\n" +
      "· Servicios de Culto: templos, cementerios.\n" +
      "· Servicios culturales: museos, galerías de arte, bibliotecas, salones comunales.\n" +
      "· Gobierno: municipalidades, locales institucionales.\n" +
      "Art. 4: los proyectos que supongan una concentración de público de más de 500 personas deben contar con un estudio de impacto vial. Art. 5: deben considerar una propuesta que posibilite futuras ampliaciones. Art. 6: cumplen la Norma A.120 de accesibilidad.",
    svg_type: "reference",
    params: { impacto_vial_personas: 500 },
    is_pro: false,
  }),
  card({
    slug: "a090-aforo",
    title: "Aforo por uso en servicios comunales",
    article: "Art. 11",
    keywords: [
      ...COMMUNAL_KEYWORDS,
      "aforo",
      "ocupantes",
      "oficinas administrativas",
      "sala de lectura",
      "ambientes de reunión",
      "auditorio",
      "sum",
      "sala de exposición",
      "m2 por persona",
    ],
    min_value: 10,
    unit: "m²/persona",
    summary:
      "Oficinas administrativas 10.0 m²/persona; bibliotecas: salas de lectura 4.5 y área de libros 10.0 m²/persona; ambientes de reunión 1.0 m²/persona.",
    body:
      "El cálculo de las salidas de emergencia, pasajes de circulación de personas, ascensores y ancho y número de escaleras se hará según la siguiente tabla de ocupación:\n" +
      "· Ambientes para oficinas administrativas: 10.0 m² por persona.\n" +
      "· Asilos y orfanatos: 6.0 m² por persona.\n" +
      "· Ambientes de reunión: 1.0 m² por persona.\n" +
      "· Área de espectadores de pie: 0.25 m² por persona.\n" +
      "· Recintos para culto: 1.0 m² por persona.\n" +
      "· Salas de exposición: 3.0 m² por persona.\n" +
      "· Bibliotecas, área de libros: 10.0 m² por persona.\n" +
      "· Bibliotecas, salas de lectura: 4.5 m² por persona.\n" +
      "· Estacionamientos de uso general: 16.0 m² por persona.\n" +
      "Los casos no expresamente mencionados considerarán el uso más parecido.",
    svg_type: "reference",
    params: {
      oficinas: 10,
      asilos: 6,
      reunion: 1,
      espectadores_pie: 0.25,
      culto: 1,
      exposicion: 3,
      libros: 10,
      lectura: 4.5,
      estacionamientos: 16,
    },
    is_pro: false,
  }),
  card({
    slug: "a090-sshh-empleados",
    title: "Servicios higiénicos para empleados",
    article: "Art. 15",
    keywords: [
      ...COMMUNAL_KEYWORDS,
      "servicios higiénicos",
      "baño",
      "empleados",
      "personal",
      "inodoro",
      "lavatorio",
      "urinario",
      "dotación",
    ],
    min_value: null,
    unit: "",
    summary:
      "De 1 a 6 empleados: 1L, 1u, 1I. De 7 a 25: hombres 1L, 1u, 1I y mujeres 1L, 1I. Hasta 200 empleados la dotación crece por tramos; luego, por cada 100 adicionales.",
    body:
      "Las edificaciones para servicios comunales estarán provistas de servicios sanitarios para empleados, según el número requerido de acuerdo al uso (L = lavatorio, u = urinario, I = inodoro):\n" +
      "· De 1 a 6 empleados: 1L, 1u, 1I (la tabla publicada lo consigna como un solo grupo de aparatos).\n" +
      "· De 7 a 25 empleados: hombres 1L, 1u, 1I · mujeres 1L, 1I.\n" +
      "· De 26 a 75 empleados: hombres 2L, 2u, 2I · mujeres 2L, 2I.\n" +
      "· De 76 a 200 empleados: hombres 3L, 3u, 3I · mujeres 3L, 3I.\n" +
      "· Por cada 100 empleados adicionales: hombres 1L, 1u, 1I · mujeres 1L, 1I.",
    svg_type: "reference",
    params: {},
    is_pro: false,
  }),
  card({
    slug: "a090-sshh-publico",
    title: "Servicios higiénicos para público",
    article: "Art. 15",
    keywords: [
      ...COMMUNAL_KEYWORDS,
      "servicios higiénicos",
      "baño",
      "público",
      "visitantes",
      "inodoro",
      "lavatorio",
      "urinario",
      "dotación",
    ],
    min_value: null,
    unit: "",
    summary:
      "De 0 a 100 personas: hombres 1L, 1u, 1I y mujeres 1L, 1I. De 101 a 200: hombres 2L, 2u, 2I y mujeres 2L, 2I. Por cada 100 personas adicionales: un juego más.",
    body:
      "En los casos que existan ambientes de uso por el público, se proveerán servicios higiénicos para público de acuerdo con lo siguiente:\n" +
      "· De 0 a 100 personas: hombres 1L, 1u, 1I · mujeres 1L, 1I.\n" +
      "· De 101 a 200 personas: hombres 2L, 2u, 2I · mujeres 2L, 2I.\n" +
      "· Por cada 100 personas adicionales: hombres 1L, 1u, 1I · mujeres 1L, 1I.",
    svg_type: "reference",
    params: {},
    is_pro: false,
  }),
  card({
    slug: "a090-sshh-distancia-accesibles",
    title: "Distancia a servicios higiénicos y aparatos accesibles",
    article: "Art. 14 y 16",
    keywords: [
      ...COMMUNAL_KEYWORDS,
      "servicios higiénicos",
      "distancia",
      "30 m",
      "discapacidad",
      "accesible",
      "sumidero",
      "a.120",
    ],
    min_value: 30,
    unit: "m",
    summary:
      "La distancia a los servicios higiénicos no puede superar 30 m en horizontal ni más de un piso en vertical. Desde 3 aparatos por servicio, uno debe ser accesible.",
    body:
      "Art. 14: los ambientes para servicios higiénicos deben contar con sumideros suficientes para evacuar el agua en caso de aniegos accidentales. La distancia entre los servicios higiénicos y el espacio más lejano donde pueda existir una persona no puede ser mayor de 30 m medidos horizontalmente, ni puede haber más de un piso entre ellos en sentido vertical.\n" +
      "Art. 16: los servicios higiénicos para personas con discapacidad son obligatorios a partir de la exigencia de contar con tres artefactos por servicio, siendo uno de ellos accesible. Si se proponen servicios exclusivos para personas con discapacidad sin diferenciación de sexo, estos son adicionales al número de aparatos exigible por las tablas del Art. 15.",
    svg_type: "reference",
    params: { distancia_max: 30, artefactos_para_accesible: 3 },
    is_pro: false,
  }),
  card({
    slug: "a090-escaleras-ascensores",
    title: "Escaleras de emergencia y ascensores",
    article: "Art. 7, 10 y 12",
    keywords: [
      ...COMMUNAL_KEYWORDS,
      "escalera",
      "escalera de emergencia",
      "ascensor",
      "evacuación",
      "pisos",
      "vanos",
      "a.130",
    ],
    min_value: 4,
    unit: "pisos",
    summary:
      "Con tres pisos o más y plantas mayores a 500 m², escalera de emergencia adicional. Con cuatro pisos o más, ascensores de pasajeros.",
    body:
      "Art. 7: el ancho y número de escaleras se calcula en función del número de ocupantes. Las edificaciones de tres pisos o más y con plantas superiores a 500.00 m² deben contar con una escalera de emergencia adicional a la de uso general, ubicada para permitir una salida de evacuación alternativa. Las edificaciones de cuatro o más pisos deben contar con ascensores de pasajeros.\n" +
      "Art. 10: cumplen las condiciones de seguridad de la Norma A.130.\n" +
      "Art. 12: el ancho de los vanos de acceso a ambientes de uso del público se calcula para permitir su evacuación hasta una zona exterior segura.",
    svg_type: "reference",
    params: { pisos_escalera_emergencia: 3, planta_m2: 500, pisos_ascensor: 4 },
    is_pro: false,
  }),
  card({
    slug: "a090-iluminacion-ventilacion",
    title: "Iluminación y ventilación en servicios comunales",
    article: "Art. 8 y 9",
    keywords: [...COMMUNAL_KEYWORDS, "ventilación", "iluminación", "vanos", "ventana"],
    min_value: 10,
    unit: "%",
    summary:
      "Ventilación natural o artificial; el área mínima de los vanos que abren debe ser superior al 10% del área del ambiente que ventilan.",
    body:
      "Art. 8: las edificaciones para servicios comunales deben contar con iluminación natural o artificial suficiente para garantizar la visibilidad de los bienes y la prestación de los servicios.\n" +
      "Art. 9: deben contar con ventilación natural o artificial. El área mínima de los vanos que abren debe ser superior al 10% del área del ambiente que ventilan.",
    svg_type: "reference",
    params: { vanos_que_abren: 10 },
    is_pro: false,
  }),
  card({
    slug: "a090-estacionamientos",
    title: "Estacionamientos en servicios comunales",
    article: "Art. 17",
    keywords: [
      ...COMMUNAL_KEYWORDS,
      "estacionamiento",
      "cochera",
      "parqueo",
      "accesible",
      "discapacidad",
      "asientos fijos",
    ],
    min_value: 3.8,
    unit: "m",
    summary:
      "Uso general: 1 estacionamiento cada 6 personas (personal) y cada 10 personas (público). Accesibles de 3.80 × 5.00 m, 1 cada 50 estacionamientos requeridos.",
    body:
      "Las edificaciones de servicios comunales deben proveer estacionamientos dentro del predio. Número mínimo:\n" +
      "· Uso general: para personal, 1 estacionamiento cada 6 personas; para público, 1 estacionamiento cada 10 personas.\n" +
      "· Locales de asientos fijos: 1 estacionamiento cada 15 asientos.\n" +
      "Cuando no sea posible tenerlos dentro del predio (remodelaciones de edificios construidos con normas que perdieron vigencia o zonas monumentales), pueden proveerse en predios cercanos según el Plan Urbano, que también puede fijar requerimientos distintos.\n" +
      "Estacionamientos accesibles: dimensiones mínimas de 3.80 m de ancho × 5.00 m de profundidad, a razón de 1 cada 50 estacionamientos requeridos.",
    svg_type: "reference",
    params: {
      personal: 6,
      publico: 10,
      asientos_fijos: 15,
      accesible_ancho: 3.8,
      accesible_fondo: 5,
      accesible_cada: 50,
    },
    is_pro: true,
  }),
];

/** Occupancy table, Art. 11. */
export const A090_OCCUPANCY = [
  { id: "oficinas", label: "Ambientes para oficinas administrativas", factor: 10 },
  { id: "asilos", label: "Asilos y orfanatos", factor: 6 },
  { id: "reunion", label: "Ambientes de reunión", factor: 1 },
  { id: "espectadores-pie", label: "Área de espectadores de pie", factor: 0.25 },
  { id: "culto", label: "Recintos para culto", factor: 1 },
  { id: "exposicion", label: "Salas de exposición", factor: 3 },
  { id: "libros", label: "Bibliotecas · área de libros", factor: 10 },
  { id: "lectura", label: "Bibliotecas · salas de lectura", factor: 4.5 },
  { id: "estacionamientos", label: "Estacionamientos de uso general", factor: 16 },
] as const;

export type A090OccupancyUse = (typeof A090_OCCUPANCY)[number]["id"];

const A090_MEASURE = {
  category: "Servicios Comunales" as const,
  norm_code: A090_CODE,
  source_resolution: A090_RESOLUTION,
  verified_at: A090_VERIFIED_AT,
};

export const A090_MEASURES: PocketMeasure[] = [
  {
    ...A090_MEASURE,
    id: "a090-estacionamiento-accesible",
    title: "Estacionamiento accesible",
    width: 3.8,
    depth: 5,
    diagram: "ambiente",
    article: "Art. 17",
    note: "Uno cada 50 estacionamientos requeridos.",
  },
  {
    ...A090_MEASURE,
    id: "a090-oficinas",
    title: "Oficina administrativa",
    width: 10,
    depth: null,
    unit: "m²/persona",
    diagram: "ratio",
    valueLabel: "Área por persona",
    article: "Art. 11",
    note: "Para calcular salidas, pasajes, ascensores y escaleras. Equivalencia de área, no una dimensión de ambiente.",
  },
  {
    ...A090_MEASURE,
    id: "a090-sala-lectura",
    title: "Biblioteca: sala de lectura",
    width: 4.5,
    depth: null,
    unit: "m²/persona",
    diagram: "ratio",
    valueLabel: "Área por persona",
    article: "Art. 11",
    note: "El área de libros se calcula a 10.0 m² por persona.",
  },
  {
    ...A090_MEASURE,
    id: "a090-reunion",
    title: "Ambiente de reunión",
    width: 1,
    depth: null,
    unit: "m²/persona",
    diagram: "ratio",
    valueLabel: "Área por persona",
    article: "Art. 11",
    note: "Recintos para culto: 1.0 m² por persona. Espectadores de pie: 0.25 m² por persona.",
  },
  {
    ...A090_MEASURE,
    id: "a090-exposicion",
    title: "Sala de exposición",
    width: 3,
    depth: null,
    unit: "m²/persona",
    diagram: "ratio",
    valueLabel: "Área por persona",
    article: "Art. 11",
    note: "Los casos no mencionados en la tabla consideran el uso más parecido (Art. 11).",
  },
];
