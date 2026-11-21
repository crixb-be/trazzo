import type { PocketMeasure } from "../medidas";
import type { RneCard } from "../seed-rne";

/**
 * Educación.
 *
 * A.040: Norma Técnica A.040 "Educación" del RNE, modificada por RM N° 068-2020-VIVIENDA
 * (17/03/2020). Transcribed from docs/rne/A.040 EDUCACIÓN - RM N° 068-2020-VIVIENDA.pdf
 * (copy of the resolution and the norm text with MVCS approval stamps); the sanitary
 * tables were checked against the page images.
 *
 * MINEDU 208: Norma Técnica NT-012-01-MINEDU "Criterios de Diseño para Locales Educativos
 * de Primaria y Secundaria", approved by RVM N° 208-2019-MINEDU (20/08/2019). Transcribed
 * from the scanned official copy docs/rne/rvm-n208-2019-minedu-nt-primaria-y-secundaria.pdf.
 * It regulates primary and secondary schools only.
 */
export const A040_CODE = "A.040";
export const MINEDU208_CODE = "MINEDU 208";
export const EDUCATION_VERIFIED_AT = "2026-11-21";

export const A040_RESOLUTION = "RM N° 068-2020-VIVIENDA (17/03/2020)";
export const A040_EDITION = "RNE · Norma A.040 Educación · modificada por RM N° 068-2020-VIVIENDA";
export const A040_LEGAL_NOTE =
  "Contrastado con el texto de la Norma A.040 aprobado por RM 068-2020-VIVIENDA. Según su Art. 2, " +
  "se complementa con las disposiciones del MINEDU; verifica en el portal del MVCS que no existan " +
  "modificatorias posteriores.";

export const MINEDU208_RESOLUTION = "RVM N° 208-2019-MINEDU (20/08/2019)";
export const MINEDU208_EDITION =
  "NT-012-01-MINEDU «Criterios de Diseño para Locales Educativos de Primaria y Secundaria» · RVM N° 208-2019-MINEDU";
export const MINEDU208_LEGAL_NOTE =
  "Contrastado con la copia oficial de la RVM 208-2019-MINEDU. Regula locales educativos de primaria y " +
  "secundaria; las áreas son estándares para infraestructura educativa pública y sus notas indican que, en " +
  "intervenciones privadas, deben observarse los índices de ocupación como mínimo. Verifica modificatorias vigentes.";

type CardInput = Omit<
  RneCard,
  "norm_code" | "category" | "edition" | "legal_note" | "verified_at" | "source_resolution"
> & { legal_note?: string };

function a040(data: CardInput): RneCard {
  return {
    norm_code: A040_CODE,
    category: "Educación",
    edition: A040_EDITION,
    verified_at: EDUCATION_VERIFIED_AT,
    source_resolution: A040_RESOLUTION,
    ...data,
    legal_note: data.legal_note ? data.legal_note + " " + A040_LEGAL_NOTE : A040_LEGAL_NOTE,
  };
}

function minedu(data: CardInput): RneCard {
  return {
    norm_code: MINEDU208_CODE,
    category: "Educación",
    edition: MINEDU208_EDITION,
    verified_at: EDUCATION_VERIFIED_AT,
    source_resolution: MINEDU208_RESOLUTION,
    ...data,
    legal_note: data.legal_note
      ? data.legal_note + " " + MINEDU208_LEGAL_NOTE
      : MINEDU208_LEGAL_NOTE,
  };
}

const EDU_KEYWORDS = [
  "educación",
  "colegio",
  "escuela",
  "institución educativa",
  "iiee",
  "local educativo",
  "minedu",
];

export const A040_CARDS: RneCard[] = [
  a040({
    slug: "a040-alcance",
    title: "Educación: objeto, alcance e independencia de uso",
    article: "Art. 1, 2, 3 y 5",
    keywords: [
      ...EDU_KEYWORDS,
      "a.040",
      "alcance",
      "ebr",
      "eba",
      "ebe",
      "universidad",
      "instituto",
      "cetpro",
    ],
    min_value: null,
    unit: "",
    summary:
      "Aplica a edificaciones de uso educativo y se complementa con las disposiciones del MINEDU. Los locales de Educación Básica deben tener accesos independientes.",
    body:
      "Art. 1: se denomina edificación de uso educativo a toda edificación destinada a prestar servicios de capacitación, educación y sus actividades complementarias.\n" +
      "Art. 2: la norma es aplicable a las edificaciones de uso educativo y se complementa con las disposiciones que regulan las actividades educativas y de infraestructura emitidas por el MINEDU u otras entidades competentes.\n" +
      "Art. 3 (Cuadro N° 1): Educación Básica (EBR, EBA, EBE); Educación Superior (universidades, institutos, escuelas de educación superior, escuelas de postgrado); otras formas de atención educativa (institutos o centros de idiomas, CETPRO, centros de educación comunitaria, centros preuniversitarios y otros semejantes).\n" +
      "Art. 5: los locales de uso educativo deben ser exclusivos para sus actividades educativas; sus accesos deben ser independientes de cualquier otro local con actividades distintas, y el ingreso directo no debe compartirse.",
    svg_type: "reference",
    params: {},
    is_pro: false,
  }),
  a040({
    slug: "a040-altura-libre",
    title: "Altura libre mínima en locales educativos",
    article: "Art. 9",
    keywords: [...EDU_KEYWORDS, "altura libre", "altura", "cielo raso", "viga", "dintel", "aula"],
    min_value: 2.5,
    unit: "m",
    summary:
      "La altura libre mínima de los ambientes no debe ser menor a 2.50 m; hasta fondo de viga y dintel, no menor a 2.10 m.",
    body:
      "9.1 La altura libre mínima de los ambientes no debe ser menor a 2.50 m, medida desde el nivel del piso terminado hasta la parte inferior del techo (cielo raso, falso cielo, cobertura o similar).\n" +
      "9.2 La altura libre mínima desde el nivel de piso terminado hasta el fondo de viga y dintel no debe ser menor a 2.10 m.",
    svg_type: "reference",
    params: { altura_libre: 2.5, fondo_viga_dintel: 2.1 },
    is_pro: false,
  }),
  a040({
    slug: "a040-ocupantes",
    title: "Número de ocupantes en locales educativos",
    article: "Art. 13",
    keywords: [
      ...EDU_KEYWORDS,
      "aforo",
      "ocupantes",
      "evacuación",
      "aula",
      "sum",
      "taller",
      "laboratorio",
      "biblioteca",
      "índice de ocupación",
    ],
    min_value: 1.5,
    unit: "m²/persona",
    summary:
      "Para salidas de emergencia y pasajes: aulas 1.5 m²/persona, SUM 1.0, talleres y laboratorios 3.0, bibliotecas 2.0 y oficinas 9.5 m²/persona.",
    body:
      "13.1 Para fines de diseño de ambientes se consideran los índices de ocupación de la normativa específica del MINEDU según el tipo de servicio educativo.\n" +
      "13.2 El número de ocupantes para el diseño de las salidas de emergencia, pasajes de circulación, entre otros, se calcula con el Cuadro N° 3:\n" +
      "· Auditorios: según el número de asientos.\n" +
      "· Salas de Usos Múltiples: 1.0 m² por persona.\n" +
      "· Aulas: 1.5 m² por persona.\n" +
      "· Talleres y Laboratorios: 3.0 m² por persona.\n" +
      "· Bibliotecas: 2.0 m² por persona.\n" +
      "· Oficinas: 9.5 m² por persona.",
    svg_type: "reference",
    params: { sum: 1, aulas: 1.5, talleres_laboratorios: 3, bibliotecas: 2, oficinas: 9.5 },
    is_pro: false,
  }),
  a040({
    slug: "a040-puertas",
    title: "Puertas de aulas y ambientes educativos",
    article: "Art. 16",
    keywords: [...EDU_KEYWORDS, "puerta", "vano", "aula", "evacuación", "180", "dos puertas"],
    min_value: 1.0,
    unit: "m",
    summary:
      "Puertas de aulas: vano mínimo de 1.00 m, apertura en el sentido de la evacuación con giro de 180°. Con aforo mayor a 50 personas, al menos dos puertas.",
    body:
      "16.1 Las puertas de las aulas y otros ambientes de aprendizaje y enseñanza deben: a) tener un ancho mínimo de vano de 1.00 m; b) abrirse en el sentido de la evacuación, con un giro de 180°; c) contar con un elemento que permita visualizar el interior; d) sus marcos deben ocupar como máximo el 10% del ancho del vano.\n" +
      "16.2 Los ambientes con aforo mayor a cincuenta (50) personas deben contar por lo menos con dos (2) puertas distanciadas entre sí; la distancia entre puertas no debe ser menor de 1/3 de la diagonal mayor del ambiente.\n" +
      "16.3 La apertura de las puertas de ingreso al local educativo no debe invadir la vía pública ni las áreas que no forman parte del predio.",
    svg_type: "reference",
    params: { vano: 1, aforo_dos_puertas: 50 },
    is_pro: false,
  }),
  a040({
    slug: "a040-escaleras",
    title: "Escaleras en locales educativos",
    article: "Art. 17 y 18",
    keywords: [
      ...EDU_KEYWORDS,
      "escalera",
      "pasamano",
      "espacio previo",
      "evacuación",
      "rociadores",
      "dos escaleras",
    ],
    min_value: 1.2,
    unit: "m",
    summary:
      "Pasamano adicional entre 0.45 y 0.60 m. Espacio previo de profundidad igual al ancho del tramo y no menor a 1.20 m. Con más de un piso, mínimo dos escaleras.",
    body:
      "Art. 17: a) pasamano adicional continuo entre 0.45 m y 0.60 m de altura; b) las escaleras integradas contemplan un espacio previo que las separe de la circulación horizontal, con profundidad igual al ancho mínimo del tramo y no menor a 1.20 m.\n" +
      "Art. 18: las edificaciones de más de un piso deben tener como mínimo dos escaleras de evacuación. Excepcionalmente, una sola escalera si se cumplen a la vez: no más de tres pisos con actividades comunes; carga de evacuantes no mayor a 100 usuarios por piso; cada ambiente educativo con una salida directa al exterior para rescate (abre desde el interior sin herramientas, hacia un área con acceso a vía pública, apertura de al menos 90°, ancho libre mínimo 0.60 m, alto mínimo 0.90 m, alféizar de máximo 1.10 m); y distancia total de viaje desde la puerta del aula más alejada hasta la zona segura de 45.00 m sin rociadores o 60.00 m con rociadores.",
    svg_type: "reference",
    params: {
      pasamano_min: 0.45,
      pasamano_max: 0.6,
      espacio_previo: 1.2,
      viaje_sin_rociadores: 45,
      viaje_con_rociadores: 60,
    },
    is_pro: false,
  }),
  a040({
    slug: "a040-sshh-ebr",
    title: "Aparatos sanitarios en Educación Básica Regular",
    article: "Art. 20 · Cuadro N° 4",
    keywords: [
      ...EDU_KEYWORDS,
      "servicios higiénicos",
      "baño",
      "inodoro",
      "lavatorio",
      "urinario",
      "inicial",
      "primaria",
      "secundaria",
      "dotación",
    ],
    min_value: null,
    unit: "",
    summary:
      "Inicial: 1 aparato cada 25 niños o niñas. Primaria y secundaria: hombres 1 inodoro c/60, 1 lavatorio c/30, 1 urinario c/60; mujeres 1 inodoro c/30, 1 lavatorio c/30.",
    body:
      "20.1 Los SS.HH. se diferencian por sexo; para el cálculo se considera una proporción igual de estudiantes hombres y mujeres (puede variar si se sustenta).\n" +
      "20.2 En cada piso, al menos un lavatorio, un inodoro y un urinario para personas con discapacidad y adultos mayores, pudiendo ser de uso mixto.\n" +
      "20.3 La dotación se calcula sobre la totalidad de estudiantes del turno de mayor concurrencia.\n" +
      "Cuadro N° 4 (EBR):\n" +
      "· Inicial: niños 1 inodoro c/25, 1 lavatorio c/25, 1 urinario c/25; niñas 1 inodoro c/25, 1 lavatorio c/25.\n" +
      "· Primaria / Secundaria: hombres 1 inodoro c/60, 1 lavatorio c/30, 1 urinario c/60; mujeres 1 inodoro c/30, 1 lavatorio c/30.\n" +
      "Para el Ciclo I (Cuna) no se requiere diferenciar SS.HH. por sexo ni es obligatorio incluir urinarios; en el Ciclo II (Jardín) se diferencia por sexo. Lavatorios y urinarios pueden sustituirse por aparatos corridos de mampostería a razón de 0.60 m por posición.",
    svg_type: "reference",
    params: {},
    is_pro: false,
  }),
  a040({
    slug: "a040-sshh-eba-ebe-superior",
    title: "Aparatos sanitarios en EBA, EBE, Superior y otras formas",
    article: "Art. 20 · Cuadros N° 5 a 8",
    keywords: [
      ...EDU_KEYWORDS,
      "servicios higiénicos",
      "baño",
      "superior",
      "universidad",
      "instituto",
      "cetpro",
      "eba",
      "ebe",
      "docentes",
      "personal",
    ],
    min_value: null,
    unit: "",
    summary:
      "EBA, EBE, Educación Superior y otras formas: hombres 1 inodoro c/60, 1 lavatorio c/30, 1 urinario c/60; mujeres 1 inodoro c/30, 1 lavatorio c/30.",
    body:
      "Los Cuadros N° 5 (EBA), N° 6 (EBE), N° 7 (Educación Superior) y N° 8 (institutos o centros de idiomas, CETPRO, centros de educación comunitaria, preuniversitarios y similares) fijan la misma dotación: hombres 1 inodoro cada 60, 1 lavatorio cada 30 y 1 urinario cada 60; mujeres 1 inodoro cada 30 y 1 lavatorio cada 30.\n" +
      "Para los SS.HH. anexos al aula en EBE se consideran las disposiciones del MINEDU.\n" +
      "20.9 La dotación para oficinas del personal docente, administrativo, de servicio y otros usos considera lo establecido en las normas del RNE (la RVM 208-2019-MINEDU remite a la Norma A.080 para personal administrativo y docentes).\n" +
      "20.10 Los SS.HH. del personal deben estar separados de los de estudiantes, excepto en Educación Superior.",
    svg_type: "reference",
    params: {},
    is_pro: false,
  }),
];

export const MINEDU208_CARDS: RneCard[] = [
  minedu({
    slug: "minedu208-aula",
    title: "Aula de primaria y secundaria",
    article: "Cuadro N° 12 y num. 11.1.1",
    keywords: [
      ...EDU_KEYWORDS,
      "aula",
      "salón",
      "índice de ocupación",
      "60 m2",
      "estudiantes",
      "sección",
      "primaria",
      "secundaria",
    ],
    min_value: 60,
    unit: "m²",
    summary:
      "Aula para 30 estudiantes: índice de ocupación 2.00 m² por estudiante y área de 60.00 m². Excepcionalmente, no menos de 1.67 m² por estudiante.",
    body:
      "Cuadro N° 12 (Tipo A · Aula): capacidad 30 estudiantes; I.O. 2.00 m²; área 60.00 m². El I.O. de 2.00 m² y el área de 60.00 m² consideran la flexibilidad del ambiente para 30 estudiantes y el mobiliario perimetral en dos lados del ambiente.\n" +
      "11.1.1 d) De manera excepcional, en IIEE que consideren mobiliario perimetral en uno de los lados o no lo consideren, se puede considerar un índice de ocupación no menor a 1.67 m² por estudiante, siempre que exista un espacio próximo al aula o mobiliario que garantice el acceso a los recursos educativos. Debe garantizarse el ancho de circulación libre interior para evacuación.",
    svg_type: "reference",
    params: { io: 2, area: 60, capacidad: 30, io_excepcional: 1.67 },
    is_pro: false,
  }),
  minedu({
    slug: "minedu208-biblioteca",
    title: "Biblioteca escolar tipos I, II y III",
    article: "Cuadro N° 13 y num. 11.2.1",
    keywords: [...EDU_KEYWORDS, "biblioteca", "biblioteca escolar", "depósito", "secciones"],
    min_value: 75,
    unit: "m²",
    summary:
      "Tipo I: 75 m² (30 estudiantes); Tipo II: 90 m² (45 estudiantes); Tipo III: 120 m² (60 estudiantes); en todos, más aprox. 25% de depósito.",
    body:
      "Cuadro N° 13 (Tipo B · Biblioteca escolar):\n" +
      "· Tipo I: capacidad 30 estudiantes, I.O. 2.50 m², área 75 m² + aprox. 25% de depósito.\n" +
      "· Tipo II: capacidad 45 estudiantes, I.O. 2.00 m², área 90 m² + aprox. 25% de depósito.\n" +
      "· Tipo III: capacidad 60 estudiantes, I.O. 2.00 m², área 120 m² + aprox. 25% de depósito.\n" +
      "11.2.1 g) Tipo I para IIEE de 06 secciones (primaria) o 05 secciones (secundaria) hasta 30 secciones; Tipo II para IIEE de 31 a 48 secciones; Tipo III para IIEE con más de 49 secciones en total. Con menos de 06 secciones (primaria) o 05 (secundaria) se aplican las «Normas para bibliotecas escolares».",
    svg_type: "reference",
    params: { tipo_i: 75, tipo_ii: 90, tipo_iii: 120, deposito_pct: 25 },
    is_pro: true,
  }),
  minedu({
    slug: "minedu208-aip",
    title: "Aula de Innovación Pedagógica (AIP)",
    article: "Cuadro N° 15",
    keywords: [
      ...EDU_KEYWORDS,
      "aip",
      "aula de innovación",
      "cómputo",
      "computadoras",
      "tic",
      "conectividad",
    ],
    min_value: 90,
    unit: "m²",
    summary:
      "AIP para 30 estudiantes: I.O. 3.00 m² y área de 90.00 m² (incluye depósito, aprox. 15%). Cuarto de carga o módulo de conectividad: 25.80 m².",
    body:
      "Cuadro N° 15 (Tipo B): Aula de Innovación Pedagógica con capacidad para 30 estudiantes, I.O. 3.00 m² y área de 90.00 m² (incluye depósito, aprox. 15%). Cuarto de carga o módulo de conectividad: de 01 a 03 usuarios, I.O. variable, área 25.80 m².\n" +
      "El AIP es un ambiente multifuncional para actividades que requieren recursos TIC especializados; no debe entenderse como un aula de computación sino como escenario de integración educativa de esos recursos (num. 11.2.2).",
    svg_type: "reference",
    params: { io: 3, area: 90, conectividad: 25.8 },
    is_pro: false,
  }),
  minedu({
    slug: "minedu208-laboratorio-talleres",
    title: "Laboratorio, taller creativo o de arte y taller de EpT",
    article: "Cuadros N° 17, 20 y 21",
    keywords: [
      ...EDU_KEYWORDS,
      "laboratorio",
      "ciencia y tecnología",
      "taller",
      "taller de arte",
      "taller creativo",
      "ept",
      "educación para el trabajo",
    ],
    min_value: 90,
    unit: "m²",
    summary:
      "Laboratorio: 90.00 m² (3.00 m²/est.). Taller creativo o de arte: 90.00 m² (3.00 m²/est.). Taller de EpT: 105.00 m² (3.50 m²/est.). Todos para 30 estudiantes.",
    body:
      "· Cuadro N° 17 · Laboratorio (Tipo C): 30 estudiantes, I.O. 3.00 m², área 90.00 m² (incluye depósito, aprox. 15%). En el Cuadro N° 40 se asigna a secundaria.\n" +
      "· Cuadro N° 20 · Taller creativo / Taller de arte (Tipo C): 30 estudiantes, I.O. 3.00 m², área 90.00 m² (incluye depósito de aprox. 15% del área). Taller creativo en primaria y taller de arte en secundaria (Cuadro N° 40).\n" +
      "· Cuadro N° 21 · Taller de EpT (Tipo C): 30 estudiantes, I.O. 3.50 m², área 105.00 m² (incluye el área de almacenamiento de aproximadamente 15% del área del taller). En secundaria (Cuadro N° 40).",
    svg_type: "reference",
    params: { laboratorio: 90, taller_arte: 90, ept: 105, io_lab: 3, io_ept: 3.5 },
    is_pro: true,
  }),
  minedu({
    slug: "minedu208-sum",
    title: "Sala de Usos Múltiples (SUM) escolar",
    article: "Cuadro N° 22 y num. 11.4.1",
    keywords: [
      ...EDU_KEYWORDS,
      "sum",
      "sala de usos múltiples",
      "auditorio",
      "comedor",
      "secciones",
    ],
    min_value: 1,
    unit: "m²/estudiante",
    summary:
      "I.O. de 1.00 m² por estudiante del turno de mayor demanda. Desde 05 secciones, el área no debe ser mayor a 300 m²; con menos, no menor que la de un taller o laboratorio.",
    body:
      "Cuadro N° 22 (Tipo D · SUM): capacidad variable e I.O. de 1.00 m².\n" +
      "· Menos de 05 secciones: el área no debe ser menor que el área de taller o laboratorio.\n" +
      "· A partir de 05 secciones: el área no debe ser mayor a 300 m².\n" +
      "11.4.1 h) Se considera el I.O. de 1.00 m² por la cantidad total de estudiantes del turno de mayor demanda (el texto del numeral menciona «más de 05 secciones» para el tope de 300 m²; el cuadro dice «a partir de 05 secciones»).",
    svg_type: "reference",
    params: { io: 1, tope: 300 },
    is_pro: false,
  }),
  minedu({
    slug: "minedu208-losas",
    title: "Losas multiuso tipo I y tipo II",
    article: "Cuadros N° 23 y 24",
    keywords: [
      ...EDU_KEYWORDS,
      "losa",
      "losa deportiva",
      "losa multiuso",
      "educación física",
      "básquet",
      "vóley",
      "futsal",
      "balonmano",
    ],
    min_value: 420,
    unit: "m²",
    summary:
      "Losa tipo I: 15 × 28 m = 420 m² (1 básquet, 1 vóley; 01 sección a la vez). Tipo II: 20 × 40 m = 800 m² (futsal, básquet, vóley y balonmano; 02 secciones).",
    body:
      "Cuadro N° 23: Tipo I de 15 m × 28 m (420 m²), combinación longitudinal 1 básquet y 1 vóley. Tipo II de 20 m × 40 m (800 m²), combinación 1 futsal, 1 básquet, 1 vóley y 1 balonmano. Las medidas son referenciales y pueden variar según la priorización de deportes y la normativa del IPD; si se prioriza balonmano, la losa no debe ser menor a la reglamentaria.\n" +
      "Las dimensiones no incluyen la zona de seguridad alrededor de cada losa; se recomienda además un ancho mínimo de 1.00 m (recomendado 1.50 m) para la zona técnica (banco de suplentes y mesa de anotación).\n" +
      "Cuadro N° 24: Tipo I para 01 sección o grupo en simultáneo; Tipo II para 02, considerando separadores móviles.",
    svg_type: "reference",
    params: { tipo_i_ancho: 15, tipo_i_largo: 28, tipo_ii_ancho: 20, tipo_ii_largo: 40 },
    is_pro: false,
  }),
  minedu({
    slug: "minedu208-pisos-area-libre",
    title: "Número de pisos, área libre y estacionamientos",
    article: "Num. 9.1 · Cuadros N° 6 y 7",
    keywords: [
      ...EDU_KEYWORDS,
      "pisos",
      "niveles",
      "área libre",
      "terreno",
      "estacionamiento",
      "tipo de terreno",
    ],
    min_value: 30,
    unit: "%",
    summary:
      "IIEE públicas: máximo 4 pisos. Área libre: terreno tipo I 30%, tipo II 40%, tipo III 60%; intervenciones privadas 40%.",
    body:
      "9.1.1 En la infraestructura de las IIEE públicas, la edificación no excederá de cuatro (4) pisos (Cuadro N° 6: primaria 04, secundaria 04). Se priorizan los ambientes básicos de los grupos etarios menores en los primeros pisos.\n" +
      "9.1.2 Si las normas del gobierno local o regional no lo precisan, el área libre se determina con el Cuadro N° 7: intervenciones en IIEE públicas, terreno tipo I 30%, tipo II 40%, tipo III 60%; intervenciones en IIEE privadas, 40%. El porcentaje no debe ser menor al del cuadro y se aplica sobre el área destinada a la intervención.\n" +
      "9.1.3 Si la norma local no lo precisa, como referencia: 01 plaza cada 05 secciones (turno con mayor número de matriculados) para padres o transporte escolar, y 01 plaza cada 50.00 m² de área de ambientes de gestión administrativa y pedagógica para personal.",
    svg_type: "reference",
    params: { max_pisos: 4, tipo_i: 30, tipo_ii: 40, tipo_iii: 60, privada: 40 },
    is_pro: false,
  }),
  minedu({
    slug: "minedu208-sshh",
    title: "Dotación de aparatos sanitarios en IIEE",
    article: "Num. 12.4.2 · Cuadro N° 35",
    keywords: [
      ...EDU_KEYWORDS,
      "servicios higiénicos",
      "baño",
      "aparatos sanitarios",
      "docentes",
      "personal",
      "público",
    ],
    min_value: null,
    unit: "",
    summary:
      "Estudiantes: según la Norma A.040. Personal administrativo y docentes: según la Norma A.080. Personal de servicio: según el RNE. Público: según la Norma A.100, entre otras.",
    body:
      "Cuadro N° 35: estudiantes según la Norma A.040 (proporción igual de hombres y mujeres; se recomienda diferenciar por nivel educativo); personal administrativo y docentes según la Norma A.080; personal de servicio según el RNE y el ambiente al que sirven; asistencia de público según la Norma A.100, entre otras, según los ambientes que abastecen.\n" +
      "Los SS.HH. para personas con discapacidad cumplen la Norma A.120 del RNE.",
    svg_type: "reference",
    params: {},
    is_pro: false,
  }),
];

export const EDUCATION_CARDS: RneCard[] = [...A040_CARDS, ...MINEDU208_CARDS];

/** A.040 Art. 13.2, Cuadro N° 3 (m² per person; auditoriums go by seats). */
export const A040_OCCUPANCY = [
  { id: "sum", label: "Salas de Usos Múltiples", factor: 1 },
  { id: "aulas", label: "Aulas", factor: 1.5 },
  { id: "talleres", label: "Talleres y Laboratorios", factor: 3 },
  { id: "bibliotecas", label: "Bibliotecas", factor: 2 },
  { id: "oficinas", label: "Oficinas", factor: 9.5 },
] as const;
export type A040OccupancyUse = (typeof A040_OCCUPANCY)[number]["id"];

/** A.040 Art. 20, Cuadros N° 4 to 8: one fixture per N students. */
export const A040_FIXTURE_RATIOS = {
  inicial: {
    boys: { toilets: 25, lavatories: 25, urinals: 25 },
    girls: { toilets: 25, lavatories: 25 },
  },
  general: {
    men: { toilets: 60, lavatories: 30, urinals: 60 },
    women: { toilets: 30, lavatories: 30 },
  },
} as const;

/** MINEDU 208 standards for 30-student environments. */
export const MINEDU208_ROOMS = [
  {
    id: "aula",
    name: "Aula",
    area: 60,
    io: 2,
    capacity: 30,
    ref: "MINEDU 208 · Cuadro N° 12",
    levels: ["primaria", "secundaria"],
  },
  {
    id: "aip",
    name: "Aula de Innovación Pedagógica (AIP)",
    area: 90,
    io: 3,
    capacity: 30,
    ref: "MINEDU 208 · Cuadro N° 15",
    levels: ["primaria", "secundaria"],
  },
  {
    id: "laboratorio",
    name: "Laboratorio de ciencia y tecnología",
    area: 90,
    io: 3,
    capacity: 30,
    ref: "MINEDU 208 · Cuadro N° 17",
    levels: ["secundaria"],
  },
  {
    id: "taller-creativo",
    name: "Taller creativo",
    area: 90,
    io: 3,
    capacity: 30,
    ref: "MINEDU 208 · Cuadro N° 20",
    levels: ["primaria"],
  },
  {
    id: "taller-arte",
    name: "Taller de arte",
    area: 90,
    io: 3,
    capacity: 30,
    ref: "MINEDU 208 · Cuadro N° 20",
    levels: ["secundaria"],
  },
  {
    id: "ept",
    name: "Taller de educación para el trabajo (EpT)",
    area: 105,
    io: 3.5,
    capacity: 30,
    ref: "MINEDU 208 · Cuadro N° 21",
    levels: ["secundaria"],
  },
] as const;

export const MINEDU208_LIBRARIES = [
  { type: "I", area: 75, capacity: 30, io: 2.5 },
  { type: "II", area: 90, capacity: 45, io: 2 },
  { type: "III", area: 120, capacity: 60, io: 2 },
] as const;

/** Cuadro N° 7, minimum free area. */
export const MINEDU208_FREE_AREA = { I: 0.3, II: 0.4, III: 0.6, privada: 0.4 } as const;
export type TerrainType = keyof typeof MINEDU208_FREE_AREA;
export const MINEDU208_MAX_FLOORS = 4;

const A040_MEASURE = {
  category: "Educación" as const,
  norm_code: A040_CODE,
  source_resolution: A040_RESOLUTION,
  verified_at: EDUCATION_VERIFIED_AT,
};
const MINEDU_MEASURE = {
  category: "Educación" as const,
  norm_code: MINEDU208_CODE,
  source_resolution: MINEDU208_RESOLUTION,
  verified_at: EDUCATION_VERIFIED_AT,
};

export const EDUCATION_MEASURES: PocketMeasure[] = [
  {
    ...A040_MEASURE,
    id: "a040-puerta-aula",
    title: "Puerta de aula",
    width: 1,
    depth: null,
    diagram: "cota",
    valueLabel: "Ancho mínimo de vano",
    article: "Art. 16",
    note: "Abre en el sentido de la evacuación con giro de 180°. Con aforo mayor a 50 personas, dos puertas.",
  },
  {
    ...A040_MEASURE,
    id: "a040-altura-libre",
    title: "Altura libre en local educativo",
    width: 2.5,
    depth: null,
    diagram: "cota",
    valueLabel: "Altura libre mínima",
    article: "Art. 9",
    note: "Hasta fondo de viga y dintel: no menor a 2.10 m.",
  },
  {
    ...A040_MEASURE,
    id: "a040-espacio-previo-escalera",
    title: "Espacio previo de escalera integrada",
    width: 1.2,
    depth: null,
    diagram: "cota",
    valueLabel: "Profundidad mínima",
    article: "Art. 17",
    note: "Igual al ancho mínimo del tramo y no menor a 1.20 m.",
  },
  {
    ...MINEDU_MEASURE,
    id: "minedu208-aula",
    title: "Aula (30 estudiantes = 60.00 m²)",
    width: 2,
    depth: null,
    unit: "m²/persona",
    diagram: "ratio",
    valueLabel: "Área por estudiante",
    article: "Cuadro N° 12",
    note: "Excepcionalmente no menos de 1.67 m² por estudiante (num. 11.1.1 d).",
  },
  {
    ...MINEDU_MEASURE,
    id: "minedu208-aip",
    title: "AIP (30 estudiantes = 90.00 m²)",
    width: 3,
    depth: null,
    unit: "m²/persona",
    diagram: "ratio",
    valueLabel: "Área por estudiante",
    article: "Cuadro N° 15",
    note: "Incluye depósito de aprox. 15%.",
  },
  {
    ...MINEDU_MEASURE,
    id: "minedu208-laboratorio",
    title: "Laboratorio (30 estudiantes = 90.00 m²)",
    width: 3,
    depth: null,
    unit: "m²/persona",
    diagram: "ratio",
    valueLabel: "Área por estudiante",
    article: "Cuadro N° 17",
    note: "Incluye depósito de aprox. 15%. Taller creativo o de arte: mismo índice (Cuadro N° 20).",
  },
  {
    ...MINEDU_MEASURE,
    id: "minedu208-ept",
    title: "Taller de EpT (30 estudiantes = 105.00 m²)",
    width: 3.5,
    depth: null,
    unit: "m²/persona",
    diagram: "ratio",
    valueLabel: "Área por estudiante",
    article: "Cuadro N° 21",
    note: "Incluye almacenamiento de aprox. 15% del área del taller.",
  },
  {
    ...MINEDU_MEASURE,
    id: "minedu208-sum",
    title: "SUM escolar",
    width: 1,
    depth: null,
    unit: "m²/persona",
    diagram: "ratio",
    valueLabel: "Área por estudiante",
    article: "Cuadro N° 22",
    note: "Desde 05 secciones, no mayor a 300 m².",
  },
  {
    ...MINEDU_MEASURE,
    id: "minedu208-losa-i",
    title: "Losa multiuso tipo I",
    width: 15,
    depth: 28,
    diagram: "ambiente",
    article: "Cuadro N° 23",
    note: "420 m², sin incluir la zona de seguridad. Una sección a la vez.",
  },
  {
    ...MINEDU_MEASURE,
    id: "minedu208-losa-ii",
    title: "Losa multiuso tipo II",
    width: 20,
    depth: 40,
    diagram: "ambiente",
    article: "Cuadro N° 23",
    note: "800 m², sin incluir la zona de seguridad. Dos secciones con separadores móviles.",
  },
];
