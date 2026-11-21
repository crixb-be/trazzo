import packageInfo from "../../package.json";

export const APP_INFO = {
  name: "TRAZZO",
  version: packageInfo.version,
  stack: ["Next.js", "Capacitor", "Supabase", "Offline-First"],
  developer: {
    name: "Cristhian Billy Bustamante Espinoza",
    subtitle: "Arq. Cristhian Bustamante · B & E Arquitectura",
    photoSrc: null as string | null,
    githubUrl: "https://github.com/crixb-be",
  },
};
