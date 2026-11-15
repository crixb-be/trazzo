import { defaultCache } from "@serwist/next/worker";
import { NetworkFirst, Serwist, type RouteHandlerCallbackOptions } from "serwist";

declare const self: {
  __SW_MANIFEST: Array<{ revision: string | null; url: string }>;
};

const OFFLINE_URL = "/~offline";

// Page loads with a query string (e.g. /calculadoras?tab=rampas) are not exact
// precache hits. Try the network, then the last cached copy, then the precached
// page for the same path, and only then the offline screen.
const pages = new NetworkFirst({ cacheName: "pages", networkTimeoutSeconds: 4 });

async function handleNavigation(options: RouteHandlerCallbackOptions): Promise<Response> {
  try {
    const response = await pages.handle(options);
    if (response) return response;
  } catch {
    // Offline and never cached: fall through to the precached copies.
  }
  const { pathname } = new URL(options.request.url);
  const page = await serwist.matchPrecache(pathname);
  if (page) return page;
  return (await serwist.matchPrecache(OFFLINE_URL)) ?? Response.error();
}

// Every route is listed in next.config.mjs (additionalPrecacheEntries), so the
// whole app is stored on install and opens with no signal even if a screen was
// never visited.
const serwist: Serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  runtimeCaching: [
    {
      matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
      handler: handleNavigation,
    },
    ...defaultCache,
  ],
  skipWaiting: true,
  clientsClaim: true,
  fallbacks: {
    entries: [
      { url: OFFLINE_URL, matcher: ({ request }) => request.destination === "document" },
    ],
  },
});

serwist.addEventListeners();
