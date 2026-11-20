import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TRAZZO · Del estudio a la obra",
    short_name: "TRAZZO",
    description: "Del estudio a la obra: normativa RNE, calculadoras y metrados offline-first.",
    id: "/",
    lang: "es-PE",
    start_url: "/",
    scope: "/",
    orientation: "portrait",
    categories: ["productivity", "utilities", "business"],
    display: "standalone",
    background_color: "#0f1115",
    theme_color: "#d4a359",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
