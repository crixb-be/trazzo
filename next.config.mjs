import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import withSerwistInit from "@serwist/next";

// Pages stored on the device when the app is installed, so every screen opens
// without signal. Add new routes here.
// /medidas is a redirect. Cache its destination shell instead.
const APP_ROUTES = [
  "/",
  "/normativa",
  "/calculadoras",
  "/matriz",
  "/estudio",
  "/metrados",
  "/bitacora",
  "/honorarios",
  "/asistente",
  "/cuenta",
  "/login",
  "/register",
  "/~offline",
];

// Read the slugs directly from the seed and the verified norm tables.
const cardRoutes = [
  "seed-rne.ts",
  "norms/nts113.ts",
  "norms/a090.ts",
  "norms/education.ts",
].flatMap((path) => {
  const source = readFileSync(new URL("./src/data/" + path, import.meta.url), "utf8");
  return [...source.matchAll(/^\s+slug: "([a-z0-9-]+)",$/gm)].map(
    (match) => "/normativa/" + match[1],
  );
});

const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? randomUUID();

// Vercel runs `next build` with NODE_ENV=production. Keeping Serwist disabled
// in development avoids replacing the service worker while using `next dev`.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  // Reloading on reconnect would discard a half-filled form on site.
  reloadOnOnline: false,
  additionalPrecacheEntries: [
    ...APP_ROUTES,
    ...cardRoutes,
    ...[
      "vivienda-programa-a020",
      "comercio-aforo-a070",
      "oficinas-aforo-a080",
      "seguridad-rutas-a130",
      "sanitarios-dotacion-is010",
      "estructuras-cargas-e020",
      "estructuras-concreto-e060",
    ].map((slug) => "/normativa/" + slug),
  ].map((url) => ({ url, revision })),
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // TRAZZO has API routes and a remote Capacitor shell; it must remain a
  // server-rendered Next application, not a static export.
  output: "standalone",
};
export default withSerwist(nextConfig);
