import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

declare const self: {
  __SW_MANIFEST: Array<{ revision: string | null; url: string }>;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  runtimeCaching: defaultCache,
  skipWaiting: true,
  clientsClaim: true,
});

serwist.addEventListeners();
