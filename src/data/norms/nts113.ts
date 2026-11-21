import type { PocketMeasure } from "../medidas";
import type { RneCard } from "../seed-rne";

/**
 * NTS N° 113-MINSA/DGIEM-V.01 "Infraestructura y Equipamiento de los
 * Establecimientos de Salud del Primer Nivel de Atención" (categorías I-1 a I-4).
 *
 * Every value below was transcribed from the official text approved by
 * RM N° 045-2015/MINSA (scanned copy in docs/rne/) and from RM N° 999-2016/MINSA
 * (El Peruano, 28/12/2016), which changed the area of the Odontología general
 * consultorio. Page numbers refer to the norm's own pagination.
 */
export const NTS113_CODE = "NTS 113";
export const NTS113_VERIFIED_AT = "2026-11-21";
export const NTS113_RESOLUTION =
  "RM N° 045-2015/MINSA (27/01/2015), modificada por RM N° 999-2016/MINSA (27/12/2016)";
export const NTS113_EDITION =
  "NTS N° 113-MINSA/DGIEM-V.01 · RM N° 045-2015/MINSA, mod. RM N° 999-2016/MINSA";
export const NTS113_LEGAL_NOTE =
  "Contrastado con el texto oficial de la NTS 113 (RM 045-2015/MINSA) y la RM 999-2016/MINSA. " +
  "El anexo de la RM 094-2017/MINSA no fue contrastado; la RM 637-2024/MINSA modifica solo la base legal, " +
  "las definiciones operativas y el numeral 6.1 (terreno). Según el numeral 5.11 (RM 999-2016), la norma se " +
  "aplica a proyectos de inversión de establecimientos nuevos o que amplían o mejoran su infraestructura.";

export type HealthCategory = "I-1" | "I-2" | "I-3" | "I-4";
export const HEALTH_CATEGORIES: HealthCategory[] = ["I-1", "I-2", "I-3", "I-4"];

function card(
  data: Omit<
    RneCard,
    "norm_code" | "category" | "edition" | "legal_note" | "verified_at" | "source_resolution"
  > & { legal_note?: string },
): RneCard {
  return {
    norm_code: NTS113_CODE,
    category: "Salud",
    edition: NTS113_EDITION,
    verified_at: NTS113_VERIFIED_AT,
    source_resolution: NTS113_RESOLUTION,
    ...data,
    legal_note: data.legal_note ? data.legal_note + " " + NTS113_LEGAL_NOTE : NTS113_LEGAL_NOTE,
  };
}

const HEALTH_KEYWORDS = [
  "salud",
  "minsa",
  "nts 113",
  "primer nivel",
  "posta",
  "puesto de salud",
  "centro de salud",
  "establecimiento de salud",
];

export const NTS113_CARDS: RneCard[] = [
  card({
    slug: "nts113-altura-libre",
    title: "Altura libre en establecimientos I-1 a I-4",
    article: "Num. 6.2.1.6",
    keywords: [...HEALTH_KEYWORDS, "altura libre", "cielorraso", "falso cielorraso", "altura"],
    min_value: 2.7,
    unit: "m",
    summary:
      "I-1 a I-3: altura libre interior no menor a 2.70 m. I-4 nuevo: no menor a 3.00 m, con altura total interior no menor a 3.60 m.",
    body:
      "Categorías I-1 a I-3: la altura libre interior no será menor a 2.70 m, medida desde el nivel de piso terminado al falso cielorraso o cielorraso, siempre que permita el pase horizontal de tuberías sin comprometer los elementos estructurales.\n" +
      "Establecimientos existentes proyectados a la categoría I-4: no menor a 2.70 m, a excepción de la Sala de Rayos X y la Sala de Partos, donde la altura mínima será de 3.00 m.\n" +
      "Establecimientos proyectados como nuevos a la categoría I-4: no menor a 3.00 m, siendo la altura total interior del establecimiento no menor a 3.60 m, de modo que permita el pase horizontal de tuberías.\n" +
      "En zonas cálidas o tropicales las alturas libres interiores podrán incrementarse según las características ambientales de cada región.",
    svg_type: "reference",
    params: { i1_i3: 2.7, i4_existente: 2.7, i4_rayos_x_partos: 3.0, i4_nuevo: 3.0, i4_total: 3.6 },
    is_pro: false,
  }),
  card({
    slug: "nts113-corredores-asistenciales",
    title: "Ancho de corredores de circulación interior",
    article: "Num. 6.2.1.1 b)",
    keywords: [
      ...HEALTH_KEYWORDS,
      "corredor",
      "pasadizo",
      "pasillo",
      "circulación",
      "camilla",
      "silla de ruedas",
      "espera",
    ],
    min_value: 2.4,
    unit: "m",
    summary:
      "Corredores de circulación interior: ancho mínimo de 2.40 m libre entre muros; con función de espera se suman 0.60 m (espera a un lado) o 1.20 m (a ambos lados).",
    body:
      "Los corredores de circulación interior tendrán un ancho mínimo de 2.40 m libre entre muros. Este concepto no aplica a los corredores que cumplen además la función de espera, que deben considerar 0.60 m adicionales si la espera es hacia un solo lado o 1.20 m si es a ambos lados.\n" +
      "Los corredores técnicos de circulación exterior tendrán un ancho mínimo de 1.50 m libre entre muros.\n" +
      "Los corredores o veredas de circulación externa de uso exclusivo del personal de servicio o del transporte de suministros tendrán un ancho libre mínimo de 1.00 m, protegidos del sol y de las lluvias.\n" +
      "Todos los corredores deben estar libres de elementos que obstruyan el tránsito (cabinas telefónicas, bebederos, extintores, etc.); extintores y gabinetes contra incendio solo si están empotrados o disponen de retiro. En la UPSS Consulta Externa el ancho mínimo de los corredores es de 2.40 m libres (num. 6.4.1.3).",
    svg_type: "reference",
    params: {
      interior: 2.4,
      espera_un_lado: 3.0,
      espera_ambos_lados: 3.6,
      tecnico_exterior: 1.5,
      externo_personal: 1.0,
    },
    is_pro: false,
  }),
  card({
    slug: "nts113-escaleras-rampas",
    title: "Escaleras, rampas y ascensores en salud",
    article: "Num. 6.2.1.1 b)",
    keywords: [
      ...HEALTH_KEYWORDS,
      "escalera",
      "rampa",
      "ascensor",
      "pasamanos",
      "contrapaso",
      "evacuación",
    ],
    min_value: 1.2,
    unit: "m",
    summary:
      "Escalera integrada: 1.20 m en I-1 e I-2 y 1.50 m en I-3 e I-4, con pasamanos a ambos lados a 0.90 m. Rampa: ancho libre no menor a 1.25 m.",
    body:
      "La escalera integrada tendrá un ancho mínimo de 1.20 m en las categorías I-1 e I-2 y de 1.50 m en las categorías I-3 e I-4, provista de pasamanos a ambos lados de 0.90 m de altura. Las escaleras de servicio y de evacuación tendrán un ancho mínimo de 1.20 m con pasamanos a ambos lados.\n" +
      "Las escaleras no tendrán llegada directa hacia los corredores o ascensores; el vestíbulo previo tendrá una distancia mínima de 3 m desde el inicio o entrega de la escalera hasta el paramento opuesto. En internamiento, la distancia entre la última puerta de la habitación y la escalera no debe ser mayor de 25 m. El paso tendrá entre 28 y 30 cm y el contrapaso no será menor de 16 cm ni mayor de 17 cm.\n" +
      "El ancho mínimo libre de una rampa no será menor a 1.25 m, con piso antideslizante y barandas a ambos lados. Las rampas se consideran medio de evacuación siempre que la pendiente no sea mayor a 12%.\n" +
      "El uso de ascensores es obligatorio en establecimientos de 2 niveles o más y no se consideran medio de evacuación; el vestíbulo de ascensores tendrá una distancia mínima de 3 m hasta el paramento opuesto.",
    svg_type: "reference",
    params: {
      escalera_i1_i2: 1.2,
      escalera_i3_i4: 1.5,
      escalera_servicio: 1.2,
      rampa: 1.25,
      pendiente_evacuacion: 12,
    },
    is_pro: false,
  }),
  card({
    slug: "nts113-puertas",
    title: "Ancho mínimo de puertas asistenciales",
    article: "Num. 6.2.1.10 y Anexo N° 1",
    keywords: [
      ...HEALTH_KEYWORDS,
      "puerta",
      "vano",
      "consultorio",
      "tópico",
      "sala de partos",
      "camilla",
    ],
    min_value: 1.0,
    unit: "m",
    summary:
      "Consultorios: 1.00 m. Tópico, internamiento y dilatación: 1.20 m. Sala de partos: 1.40 m. Pase entre corredores y SUM: 1.80 m. Altura de vano no menor a 2.10 m.",
    body:
      "Anchos mínimos del Anexo N° 1:\n" +
      "· Ingreso principal al establecimiento: 1.80 m (vidrio templado, madera o similar). Ingreso vehicular: 3.00 m.\n" +
      "· Pase entre corredores y Sala de Uso Múltiple: 1.80 m.\n" +
      "· Sala de Partos: 1.40 m.\n" +
      "· Tópico, salas de internamiento, sala de evaluación y dilatación, psicoprofilaxis, sala de equipos, laboratorios, lavandería y almacén de servicios generales: 1.20 m.\n" +
      "· Consultorios, admisión, archivo de historias clínicas, farmacia, ecografía, mamografía, toma de muestras, oficinas administrativas, SH para discapacitados o gestantes, entre otros: 1.00 m.\n" +
      "· Trabajo limpio o sucio, cuarto séptico, cuarto de limpieza y SH colectivos: 0.90 m. Caja y SH individuales: 0.80 m. Cubículo de inodoro o ducha: 0.70 m. Rayos X: 1.20 m (emplomada).\n" +
      "La altura del vano no será menor a 2.10 m. Las puertas con tránsito de camillas se protegen con lámina de acero inoxidable hasta una altura no menor a 1.00 m. Internamiento, recuperación y observación llevan mirilla de 20 × 60 cm como mínimo. La puerta del SH para discapacitados o gestantes abre hacia fuera, con cerradura tipo palanca.",
    svg_type: "reference",
    params: {
      consultorio: 1.0,
      topico: 1.2,
      sala_partos: 1.4,
      ingreso_principal: 1.8,
      altura_vano: 2.1,
    },
    is_pro: false,
  }),
  card({
    slug: "nts113-circulacion-porcentaje",
    title: "Porcentaje de circulación interior",
    article: "Num. 6.2.1.1 c)",
    keywords: [...HEALTH_KEYWORDS, "circulación", "porcentaje", "área útil", "programa", "metraje"],
    min_value: 25,
    unit: "%",
    summary:
      "Circulación interior estimada: 25% del área útil en I-1 e I-2, 30% en I-3 y 35% en I-4.",
    body:
      "Los porcentajes estimados de circulación interior se definen así: establecimientos I-1 y I-2, 25% del área útil; establecimientos I-3, 30% del área útil; establecimientos I-4, 35% del área útil.\n" +
      "Las circulaciones de pacientes ambulatorios e internos deben planearse para conservar la zonificación de los servicios y permitir el transporte eficaz de suministros y servicios a todo el establecimiento.",
    svg_type: "reference",
    params: { i1_i2: 25, i3: 30, i4: 35 },
    is_pro: false,
  }),
  card({
    slug: "nts113-flujos-zonificacion",
    title: "Flujos diferenciados: limpio, sucio y residuos",
    article: "Num. 6.2.1.1 c) y d)",
    keywords: [
      ...HEALTH_KEYWORDS,
      "flujo",
      "zonificación",
      "limpio",
      "sucio",
      "biocontaminado",
      "residuos sólidos",
      "ropa sucia",
      "ingreso",
    ],
    min_value: null,
    unit: "",
    summary:
      "Los flujos internos deben evitar el cruce de transporte limpio y sucio, y entre usuario permanente y temporal. La norma define siete tipos de flujo.",
    body:
      "Los flujos de circulación interna deben evitar el cruce de transporte limpio y sucio y el cruce entre el usuario permanente (interno, médico, enfermeras, técnicos) y el usuario temporal (visitante, acompañante, servidores). Los accesos deben evitar los cruces de elementos sucios y limpios, así como de pacientes internados y ambulatorios.\n" +
      "Los establecimientos deben diferenciar sus ingresos desde el exterior, como mínimo el ingreso principal y el de servicios generales; interiormente se diferencian los accesos a servicios ambulatorios, de urgencias y generales, cada uno con control de ingreso.\n" +
      "Tipos de flujo (num. 6.2.1.1 d): pacientes ambulatorios, pacientes internados, personal, visitantes, suministros, ropa sucia y residuos sólidos.\n" +
      "Residuos (num. 6.2.1.7): almacenamiento intermedio cuando el volumen supera 150 litros por día; el ambiente de disposición final se calcula a razón de 0.004 m³/m² de área techada, sin incluir estacionamientos. Se dispone un cuarto de limpieza por cada 400 m² de área techada en cada nivel.",
    svg_type: "reference",
    params: {},
    is_pro: false,
  }),
  card({
    slug: "nts113-consultorios-areas",
    title: "Áreas mínimas de consultorios (Consulta Externa)",
    article: "Num. 6.4.1 · Cuadro N° 1",
    keywords: [
      ...HEALTH_KEYWORDS,
      "consultorio",
      "consulta externa",
      "upss",
      "área mínima",
      "odontología",
      "pediatría",
      "medicina general",
      "cred",
      "tópico",
    ],
    min_value: 13.5,
    unit: "m²",
    summary:
      "Consultorio de Medicina General 13.50 m²; Gineco-Obstetricia 17.00 m² (incluye ½ SH); Odontología general 14.00 m² (RM 999-2016); Tópico de procedimientos 16.00 m².",
    body:
      "Áreas mínimas de ambientes prestacionales de la UPSS Consulta Externa (Cuadro N° 1):\n" +
      "· Medicina General 13.50 m² · Pediatría 13.50 m² · Medicina Familiar 13.50 m² · Gineco-Obstetricia 17.00 m² (1).\n" +
      "· Teleconsultorio 15.00 m² · CRED 17.00 m² · Inmunizaciones 15.00 m² · Estimulación temprana 24.00 m² (1).\n" +
      "· Consejería ITS/VIH/SIDA, Prevención y control de TBC, Adolescente, Enfermedades no transmisibles, Cáncer y Salud Mental: 13.50 m² cada uno · Adulto Mayor 17.00 m² (1).\n" +
      "· Psicología 15.00 m² · Control prenatal 17.00 m² (1) · Planificación familiar 13.50 m² · Psicoprofilaxis 36.00 m².\n" +
      "· Odontología general 14.00 m² (modificado por RM 999-2016/MINSA; el texto original indicaba 17.00 m²) · Odontología con soporte de radiología oral 23.00 m² (2).\n" +
      "· Nutrición 13.50 m² · Tópico de procedimientos de consulta externa 16.00 m².\n" +
      "(1) Incluye ½ SH (lavamanos e inodoro); estimulación temprana considera además 3 m² para cambio de pañales. (2) Incluye un área o ambiente para toma de rayos X oral de 6 m².",
    svg_type: "reference",
    params: { medicina_general: 13.5, gineco_obstetricia: 17, odontologia: 14, topico: 16 },
    is_pro: true,
  }),
  card({
    slug: "nts113-espera-sshh-consulta",
    title: "Sala de espera y servicios higiénicos de Consulta Externa",
    article: "Num. 6.4.1.3",
    keywords: [
      ...HEALTH_KEYWORDS,
      "sala de espera",
      "espera",
      "servicios higiénicos",
      "baño",
      "inodoro",
      "lavatorio",
      "urinario",
    ],
    min_value: 1.2,
    unit: "m²/persona",
    summary:
      "Sala de espera: 8 a 10 personas por consultorio físico a 1.20 m² por persona, más 0.5 personas con discapacidad por consultorio a 1.50 m² por persona.",
    body:
      "Sala de espera: área total producto de la suma de 8 a 10 personas por cada consultorio físico a 1.20 m² por persona y 0.5 personas con discapacidad por consultorio físico a 1.50 m² por persona.\n" +
      "Servicios higiénicos públicos: hasta 4 consultorios, mujeres 1 inodoro y 1 lavatorio, hombres 1 inodoro, 1 lavatorio y 1 urinario. De 4 a 14 consultorios, mujeres 2 inodoros y 3 lavatorios, hombres 2 inodoros, 3 lavatorios y 2 urinarios. Por cada 10 consultorios adicionales, 1 aparato más de cada tipo.\n" +
      "Los SH colectivos, diferenciados por género, tienen un área previa de 4 m² como mínimo. Los SH para pacientes discapacitados o gestantes siguen la Norma A.120 del RNE. La distancia máxima de recorrido para acceder a un servicio sanitario será de 50 m (num. 6.2.1.12).",
    svg_type: "reference",
    params: {
      personas_por_consultorio_min: 8,
      personas_por_consultorio_max: 10,
      m2_persona: 1.2,
      m2_discapacidad: 1.5,
    },
    is_pro: false,
  }),
  card({
    slug: "nts113-urgencias",
    title: "Tópico de urgencias y observación de emergencia",
    article: "Num. 6.5.2 · Cuadro N° 4",
    keywords: [
      ...HEALTH_KEYWORDS,
      "urgencias",
      "emergencias",
      "tópico",
      "observación",
      "camas",
      "botadero",
    ],
    min_value: 22,
    unit: "m²",
    summary:
      "Tópico de urgencias y emergencias: 22.00 m² (atención por personal no médico o médico general) y 18.00 m² (médico especialista). Observación de emergencia: 22.00 m².",
    body:
      "Áreas mínimas de la Actividad Atención de Urgencias y Emergencias (Cuadro N° 4):\n" +
      "· Atención inicial por personal de la salud no médico (EMG1): tópico de urgencias y emergencias 22.00 m² (1).\n" +
      "· Atención por médico general (EMG2): tópico 22.00 m² (1).\n" +
      "· Atención por médico especialista (EMG3): tópico 18.00 m² (2) y sala de procedimientos de enfermería 18.00 m².\n" +
      "· Observación de emergencia (EMG4): 22.00 m² (2); capacidad mínima de 2 camas, área mínima de 9 m² por cama, observación hasta por 12 horas.\n" +
      "· Botadero: 4.00 m² (3).\n" +
      "(1) Incluye ½ SS.HH. (lavamanos e inodoro) y un área para procedimientos de enfermería. (2) Incluye solo ½ SS.HH. (3) Solo para categorías I-3 e I-4. El tópico se ubica próximo a Consulta Externa y al ingreso, con acceso directo desde la calle.",
    svg_type: "reference",
    params: { topico_emg1: 22, topico_emg2: 22, topico_emg3: 18, observacion: 22, m2_por_cama: 9 },
    is_pro: true,
  }),
  card({
    slug: "nts113-atencion-parto",
    title: "Atención del parto en categoría I-4",
    article: "Num. 6.5.4 · Cuadro N° 5",
    keywords: [
      ...HEALTH_KEYWORDS,
      "parto",
      "sala de partos",
      "dilatación",
      "puerperio",
      "recién nacido",
      "obstetricia",
      "i-4",
    ],
    min_value: 30,
    unit: "m²",
    summary:
      "Solo en establecimientos I-4: sala de parto 30.00 m², sala de dilatación 30.00 m², sala multifuncional con acompañamiento familiar 36.00 m² y puerperio inmediato 18.00 m².",
    body:
      "La Atención de la gestante en período de parto se realiza en establecimientos de categoría I-4 (num. 6.5.4.1). Áreas mínimas (Cuadro N° 5):\n" +
      "· Sala de dilatación 30.00 m² (1) · Sala de parto 30.00 m² · Sala de parto vertical 30.00 m².\n" +
      "· Sala multifuncional con acompañamiento familiar 36.00 m² (1) · Sala de puerperio inmediato 18.00 m² · Atención al recién nacido 6.00 m².\n" +
      "· Complementarios: control de acceso 4.00 m², sala de espera de familiares 12.00 m², estación de obstetricia 12.00 m², cuarto séptico 5.00 m², entre otros.\n" +
      "(1) El área mínima incluye SH completo (lavamanos, inodoro y ducha). El tipo de atención de parto se determina según la demanda y los factores socioculturales.\n" +
      "Relacionados: puerta de sala de partos 1.40 m (Anexo N° 1); altura libre de 3.00 m en la Sala de Partos de establecimientos existentes proyectados a I-4 (num. 6.2.1.6).",
    svg_type: "reference",
    params: { sala_parto: 30, dilatacion: 30, multifuncional: 36, puerperio: 18, recien_nacido: 6 },
    is_pro: true,
  }),
  card({
    slug: "nts113-ventanas",
    title: "Ventanas: iluminación y ventilación en salud",
    article: "Num. 6.2.1.11",
    keywords: [
      ...HEALTH_KEYWORDS,
      "ventana",
      "iluminación",
      "ventilación",
      "vano",
      "costa",
      "sierra",
      "selva",
    ],
    min_value: 20,
    unit: "%",
    summary:
      "Iluminación: 20% del área del ambiente; ventilación: 50% del área de la ventana. Vano según región: costa 20%, sierra 15% y selva 30% del área de piso.",
    body:
      "Las ventanas deben abrir hacia áreas externas, patios interiores o ductos de ventilación; no se consideran ventanas hacia corredores y pasajes cubiertos de circulación interna.\n" +
      "El área mínima de iluminación será de 20% del área del ambiente y el área mínima de ventilación será el 50% del área de la ventana.\n" +
      "Según la región: en la costa el vano ocupará el 20% del área del piso del ambiente; en la sierra, el 15%; en la selva, el 30%, con ventilación cruzada necesariamente.",
    svg_type: "reference",
    params: { iluminacion: 20, ventilacion_de_ventana: 50, costa: 20, sierra: 15, selva: 30 },
    is_pro: false,
  }),
  card({
    slug: "nts113-ocupantes-evacuacion",
    title: "Ocupantes por zona para evacuación en salud",
    article: "Num. 6.2.1.16",
    keywords: [
      ...HEALTH_KEYWORDS,
      "aforo",
      "ocupantes",
      "evacuación",
      "a.130",
      "sala de espera",
      "refugio",
    ],
    min_value: 6,
    unit: "m²/persona",
    summary:
      "Zona de servicio ambulatorio y diagnóstico 6.00 m²/persona; sala de espera 0.80 m²/persona; zona de habitaciones 8.00 m²/persona.",
    body:
      "Para calcular el número de ocupantes por nivel y zona se emplean los coeficientes indicados en el Art. 3.1 de la Norma A.130:\n" +
      "· Zona de servicio ambulatorio y diagnóstico: 6.00 m²/persona.\n" +
      "· Zona de habitaciones (superficie total): 8.00 m²/persona.\n" +
      "· Zona de tratamiento de pacientes externos: 20.00 m²/persona.\n" +
      "· Sala de espera: 0.80 m²/persona · Servicios auxiliares: 8.00 m²/persona · Depósitos: 30.00 m²/persona.\n" +
      "· Área de refugio con pacientes en silla de ruedas: 1.40 m²/persona; en pisos que no albergan pacientes: 0.50 m²/persona.",
    svg_type: "reference",
    params: {
      ambulatorio: 6,
      habitaciones: 8,
      tratamiento_externo: 20,
      espera: 0.8,
      auxiliares: 8,
      depositos: 30,
    },
    is_pro: false,
  }),
];

/** Minimum areas (m²) per environment, Cuadros N° 1, 4 and 5. */
export interface HealthArea {
  code: string;
  name: string;
  area: number;
  group: "Consulta Externa" | "Urgencias y Emergencias" | "Atención de parto";
  categories: HealthCategory[];
  ref: string;
  note?: string;
}

const ALL: HealthCategory[] = ["I-1", "I-2", "I-3", "I-4"];
const C1 = "NTS 113 · Cuadro N° 1";
const C4 = "NTS 113 · Cuadro N° 4";
const C5 = "NTS 113 · Cuadro N° 5";

export const NTS113_AREAS: HealthArea[] = [
  {
    code: "MED1",
    name: "Consultorio de Medicina General",
    area: 13.5,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
  },
  {
    code: "MED2c",
    name: "Consultorio de Pediatría",
    area: 13.5,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
  },
  {
    code: "MED2e",
    name: "Consultorio de Gineco-Obstetricia",
    area: 17,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
    note: "Incluye ½ SH (lavamanos e inodoro).",
  },
  {
    code: "MED2f",
    name: "Consultorio de Medicina Familiar",
    area: 13.5,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
  },
  {
    code: "TEL",
    name: "Teleconsultorio",
    area: 15,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
  },
  {
    code: "ENF1a",
    name: "Consultorio CRED (Crecimiento y Desarrollo)",
    area: 17,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
  },
  {
    code: "ENF1b",
    name: "Sala de Inmunizaciones",
    area: 15,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
  },
  {
    code: "ENF1c",
    name: "Sala de Estimulación temprana",
    area: 24,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
    note: "Incluye ½ SH y además 3 m² para cambio de pañales.",
  },
  {
    code: "PRS1",
    name: "Consejería y Prevención de ITS, VIH y SIDA",
    area: 13.5,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
  },
  {
    code: "PRS2",
    name: "Prevención y Control de Tuberculosis",
    area: 13.5,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
  },
  {
    code: "PRS3",
    name: "Atención integral y consejería del adolescente",
    area: 13.5,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
  },
  {
    code: "PRS4",
    name: "Atención Integral del Adulto Mayor",
    area: 17,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
    note: "Incluye ½ SH (lavamanos e inodoro).",
  },
  {
    code: "PRS5",
    name: "Consejería y Prevención de Enfermedades No Transmisibles",
    area: 13.5,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
  },
  {
    code: "PRS6",
    name: "Consejería y Prevención del Cáncer",
    area: 13.5,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
  },
  {
    code: "PSM1",
    name: "Consejería de Salud Mental",
    area: 13.5,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
  },
  {
    code: "PSC1",
    name: "Consultorio de Psicología",
    area: 15,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
  },
  {
    code: "OBS1",
    name: "Control Prenatal (incluye control puerperal)",
    area: 17,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
    note: "Incluye ½ SH (lavamanos e inodoro).",
  },
  {
    code: "OBS2",
    name: "Planificación Familiar",
    area: 13.5,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
  },
  {
    code: "OBS3",
    name: "Psicoprofilaxis",
    area: 36,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
  },
  {
    code: "ODN1",
    name: "Consultorio de Odontología general",
    area: 14,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1 + " (mod. RM 999-2016/MINSA)",
    note: "La RM 999-2016/MINSA cambió el área de 17.00 m² a 14.00 m².",
  },
  {
    code: "ODN2",
    name: "Consultorio de odontología general con soporte de radiología oral",
    area: 23,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
    note: "Incluye un área para toma de rayos X oral de 6 m².",
  },
  {
    code: "NUT1",
    name: "Consultorio de nutrición",
    area: 13.5,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
  },
  {
    code: "TOP1",
    name: "Tópico de procedimientos de consulta externa",
    area: 16,
    group: "Consulta Externa",
    categories: ALL,
    ref: C1,
  },
  {
    code: "EMG1",
    name: "Tópico de urgencias y emergencias (personal no médico)",
    area: 22,
    group: "Urgencias y Emergencias",
    categories: ALL,
    ref: C4,
    note: "Incluye ½ SS.HH. y un área para procedimientos de enfermería.",
  },
  {
    code: "EMG2",
    name: "Tópico de urgencias y emergencias (médico general)",
    area: 22,
    group: "Urgencias y Emergencias",
    categories: ALL,
    ref: C4,
    note: "Incluye ½ SS.HH. y un área para procedimientos de enfermería.",
  },
  {
    code: "EMG3",
    name: "Tópico de urgencias y emergencias (médico especialista)",
    area: 18,
    group: "Urgencias y Emergencias",
    categories: ALL,
    ref: C4,
    note: "Incluye solo ½ SS.HH.",
  },
  {
    code: "EMG3-ENF",
    name: "Sala de procedimientos de enfermería",
    area: 18,
    group: "Urgencias y Emergencias",
    categories: ALL,
    ref: C4,
  },
  {
    code: "EMG4",
    name: "Observación de Emergencia",
    area: 22,
    group: "Urgencias y Emergencias",
    categories: ALL,
    ref: C4,
    note: "Incluye solo ½ SS.HH.; mínimo 2 camas de 9 m² por cama.",
  },
  {
    code: "BOT",
    name: "Botadero",
    area: 4,
    group: "Urgencias y Emergencias",
    categories: ["I-3", "I-4"],
    ref: C4,
    note: "Solo para categorías I-3 e I-4.",
  },
  {
    code: "ATP-GIN1",
    name: "Sala de Dilatación",
    area: 30,
    group: "Atención de parto",
    categories: ["I-4"],
    ref: C5,
    note: "Incluye SH completo (lavamanos, inodoro y ducha).",
  },
  {
    code: "ATP-GIN2a",
    name: "Sala de Parto",
    area: 30,
    group: "Atención de parto",
    categories: ["I-4"],
    ref: C5,
  },
  {
    code: "ATP-GIN2b",
    name: "Sala de Parto Vertical",
    area: 30,
    group: "Atención de parto",
    categories: ["I-4"],
    ref: C5,
  },
  {
    code: "ATP-GIN2c",
    name: "Sala Multifuncional con Acompañamiento Familiar",
    area: 36,
    group: "Atención de parto",
    categories: ["I-4"],
    ref: C5,
    note: "Incluye SH completo (lavamanos, inodoro y ducha).",
  },
  {
    code: "ATP-GIN3",
    name: "Sala de Puerperio Inmediato",
    area: 18,
    group: "Atención de parto",
    categories: ["I-4"],
    ref: C5,
  },
  {
    code: "ATP-RNP",
    name: "Atención al recién nacido",
    area: 6,
    group: "Atención de parto",
    categories: ["I-4"],
    ref: C5,
  },
];

/** Corridor widths, num. 6.2.1.1 b). */
export const NTS113_CORRIDORS = [
  { id: "interior", name: "Corredor de circulación interior", width: 2.4 },
  {
    id: "espera-un-lado",
    name: "Corredor interior con espera a un lado (2.40 + 0.60)",
    width: 3.0,
  },
  {
    id: "espera-ambos-lados",
    name: "Corredor interior con espera a ambos lados (2.40 + 1.20)",
    width: 3.6,
  },
  { id: "tecnico-exterior", name: "Corredor técnico de circulación exterior", width: 1.5 },
  {
    id: "externo-personal",
    name: "Corredor o vereda externa de personal y suministros",
    width: 1.0,
  },
] as const;

/** Door widths, Anexo N° 1. */
export const NTS113_DOORS = [
  { id: "ingreso-principal", name: "Ingreso principal al establecimiento", width: 1.8 },
  { id: "ingreso-vehicular", name: "Ingreso vehicular", width: 3.0 },
  { id: "pase-corredores", name: "Pase entre corredores / Sala de Uso Múltiple", width: 1.8 },
  { id: "sala-partos", name: "Sala de Partos", width: 1.4 },
  {
    id: "topico",
    name: "Tópico, internamiento, evaluación y dilatación, laboratorios",
    width: 1.2,
  },
  { id: "rayos-x", name: "Rayos X (emplomada)", width: 1.2 },
  {
    id: "consultorio",
    name: "Consultorios, admisión, farmacia, oficinas, SH discapacitado o gestante",
    width: 1.0,
  },
  {
    id: "servicio",
    name: "Trabajo limpio o sucio, cuarto séptico, limpieza, SH colectivos",
    width: 0.9,
  },
  { id: "sh-individual", name: "Caja, SH público o de personal individual", width: 0.8 },
  { id: "cubiculo", name: "Cubículo individual de inodoro o ducha", width: 0.7 },
] as const;

/** Integrated stair width by category, num. 6.2.1.1 b). */
export function integratedStairWidth(category: HealthCategory): number {
  return category === "I-3" || category === "I-4" ? 1.5 : 1.2;
}

/** Circulation share of the useful area, num. 6.2.1.1 c). */
export function circulationShare(category: HealthCategory): number {
  return category === "I-4" ? 0.35 : category === "I-3" ? 0.3 : 0.25;
}

const NTS_MEASURE = {
  category: "Salud" as const,
  norm_code: NTS113_CODE,
  source_resolution: NTS113_RESOLUTION,
  verified_at: NTS113_VERIFIED_AT,
};

export const NTS113_MEASURES: PocketMeasure[] = [
  {
    ...NTS_MEASURE,
    id: "nts113-corredor-interior",
    title: "Corredor asistencial interior",
    width: 2.4,
    depth: null,
    diagram: "cota",
    valueLabel: "Ancho libre entre muros",
    article: "Num. 6.2.1.1 b)",
    note: "Mínimo 2.40 m libre entre muros. Con espera: +0.60 m a un lado (3.00 m) o +1.20 m a ambos lados (3.60 m).",
  },
  {
    ...NTS_MEASURE,
    id: "nts113-escalera-integrada",
    title: "Escalera integrada I-1 / I-2",
    width: 1.2,
    depth: null,
    diagram: "cota",
    valueLabel: "Ancho mínimo",
    article: "Num. 6.2.1.1 b)",
    note: "En I-3 e I-4 el ancho mínimo es 1.50 m. Pasamanos a ambos lados a 0.90 m.",
  },
  {
    ...NTS_MEASURE,
    id: "nts113-rampa",
    title: "Rampa en establecimiento de salud",
    width: 1.25,
    depth: null,
    diagram: "cota",
    valueLabel: "Ancho libre mínimo",
    article: "Num. 6.2.1.1 b)",
    note: "Piso antideslizante y barandas a ambos lados. Es medio de evacuación si la pendiente no supera 12%.",
  },
  {
    ...NTS_MEASURE,
    id: "nts113-puerta-consultorio",
    title: "Puerta de consultorio",
    width: 1.0,
    depth: null,
    diagram: "cota",
    valueLabel: "Ancho mínimo",
    article: "Anexo N° 1",
    note: "Altura de vano no menor a 2.10 m (num. 6.2.1.10).",
  },
  {
    ...NTS_MEASURE,
    id: "nts113-puerta-topico",
    title: "Puerta de tópico e internamiento",
    width: 1.2,
    depth: null,
    diagram: "cota",
    valueLabel: "Ancho mínimo",
    article: "Anexo N° 1",
    note: "Incluye salas de internamiento, evaluación y dilatación. Con tránsito de camillas: lámina de acero inoxidable hasta 1.00 m.",
  },
  {
    ...NTS_MEASURE,
    id: "nts113-puerta-partos",
    title: "Puerta de sala de partos",
    width: 1.4,
    depth: null,
    diagram: "cota",
    valueLabel: "Ancho mínimo",
    article: "Anexo N° 1",
    note: "Ingreso principal al establecimiento: 1.80 m.",
  },
  {
    ...NTS_MEASURE,
    id: "nts113-altura-libre",
    title: "Altura libre I-1 a I-3",
    width: 2.7,
    depth: null,
    diagram: "cota",
    valueLabel: "Altura libre interior",
    article: "Num. 6.2.1.6",
    note: "I-4 nuevo: 3.00 m libre y 3.60 m de altura total interior.",
  },
  {
    ...NTS_MEASURE,
    id: "nts113-espera",
    title: "Sala de espera de Consulta Externa",
    width: 1.2,
    depth: null,
    unit: "m²/persona",
    diagram: "ratio",
    valueLabel: "Área por persona",
    article: "Num. 6.4.1.3",
    note: "8 a 10 personas por consultorio físico, más 0.5 personas con discapacidad a 1.50 m² por persona.",
  },
];
