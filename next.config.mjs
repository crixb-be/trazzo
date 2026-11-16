import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import withSerwistInit from "@serwist/next";

// Pages stored on the device when the app is installed, so every screen opens
// without signal. Add new routes here.
const APP_ROUTES = [
  "/",
  "/normativa",
  "/calculadoras",
  "/matriz",
  "/metrados",
  "/honorarios",
  "/asistente",
  "/cuenta",
  "/login",
  "/register",
  "/~offline",
];

// One page per RNE card; the slugs are read from the seed so the list cannot drift.
const seed = readFileSync(new URL("./src/data/seed-rne.ts", import.meta.url), "utf8");
const cardRoutes = [...seed.matchAll(/^\s+slug: "([a-z0-9-]+)",$/gm)].map(
  (match) => "/normativa/" + match[1],
);

const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  // Reloading on reconnect would discard a half-filled form on site.
  reloadOnOnline: false,
  additionalPrecacheEntries: [...APP_ROUTES, ...cardRoutes].map((url) => ({ url, revision })),
});

/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
export default withSerwist(nextConfig);
