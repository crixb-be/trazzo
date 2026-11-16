export interface PocketMeasure {
  id: string;
  title: string;
  category: "Antropometría" | "Mobiliario" | "Ambientes" | "Montaje";
  width: number;
  depth: number;
  note: string;
  diagram: "persona" | "mueble" | "ambiente";
}
/** Criterios de anteproyecto, pendientes de contraste con bibliografía del usuario. Metros. */
export const MEASURES: PocketMeasure[] = [
  {
    id: "persona",
    title: "Persona de pie",
    category: "Antropometría",
    width: 0.6,
    depth: 1.7,
    diagram: "persona",
    note: "Envolvente ilustrativa; las dimensiones humanas varían. No representa percentiles ni accesibilidad.",
  },
  {
    id: "bano",
    title: "Baño: módulo de estudio",
    category: "Ambientes",
    width: 1.5,
    depth: 2.2,
    diagram: "ambiente",
    note: "Ensaya ducha, inodoro y lavatorio. Verifica giros, apertura de puertas y accesibilidad; no es un mínimo legal.",
  },
  {
    id: "cocina",
    title: "Cocina: módulo de trabajo",
    category: "Ambientes",
    width: 2.4,
    depth: 3,
    diagram: "ambiente",
    note: "Reserva frentes de trabajo y paso independiente. Ajusta a equipos y conexiones.",
  },
  {
    id: "dormitorio",
    title: "Dormitorio: módulo de estudio",
    category: "Ambientes",
    width: 3,
    depth: 3.2,
    diagram: "ambiente",
    note: "Comprueba cama, clóset, ventanas y circulaciones con el mobiliario real.",
  },
  {
    id: "closet",
    title: "Clóset: fondo de colgado",
    category: "Mobiliario",
    width: 1.2,
    depth: 0.6,
    diagram: "mueble",
    note: "Fondo orientativo para prendas; añade espacio frontal para puertas y uso.",
  },
  {
    id: "comedor",
    title: "Mesa de comedor: cuatro personas",
    category: "Mobiliario",
    width: 1.2,
    depth: 0.8,
    diagram: "mueble",
    note: "Dimensión de la mesa, sin sillas ni circulación perimetral.",
  },
  {
    id: "escritorio",
    title: "Escritorio de trabajo",
    category: "Mobiliario",
    width: 1.2,
    depth: 0.6,
    diagram: "mueble",
    note: "Añade espacio para silla, piernas y alcance según la persona.",
  },
  {
    id: "cama",
    title: "Cama doble",
    category: "Mobiliario",
    width: 1.4,
    depth: 1.9,
    diagram: "mueble",
    note: "Huella orientativa del colchón; confirma bastidor y medidas del proveedor.",
  },
  {
    id: "paso",
    title: "Circulación: franja de estudio",
    category: "Ambientes",
    width: 1.2,
    depth: 2,
    diagram: "ambiente",
    note: "No sustituye anchos exigidos por uso, aforo o accesibilidad del RNE.",
  },
  {
    id: "interruptor",
    title: "Interruptor: altura de estudio",
    category: "Montaje",
    width: 0.1,
    depth: 1.1,
    diagram: "mueble",
    note: "Altura al eje desde piso terminado. Comprueba alcance accesible y especialidad eléctrica.",
  },
  {
    id: "lavatorio",
    title: "Lavatorio: altura de estudio",
    category: "Montaje",
    width: 0.6,
    depth: 0.85,
    diagram: "mueble",
    note: "Altura superior desde piso terminado; verifica equipo, usuario y espacio libre inferior.",
  },
];
