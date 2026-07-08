/// <reference lib="webworker" />

import type { PrecacheEntry, RouteMatchCallback, RuntimeCaching, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

import { defaultCache } from '@serwist/next/worker';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// A service worker's own fetch() is governed by the document's `connect-src` CSP, not
// `img-src`. So caching a cross-origin image (e.g. a Vercel Blob catalog photo) breaks it
// whenever the host isn't in connect-src. We keep the same-origin caching from defaultCache
// untouched (precache/shell/pages/APIs/static offline behavior is preserved) but stop the SW
// from handling cross-origin requests, letting the browser load them directly — images then
// resolve under `img-src https:`, independent of connect-src.
const IMAGE_EXTENSIONS = /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i;
const cacheNameOf = (entry: RuntimeCaching): string | undefined => (entry.handler as { cacheName?: string }).cacheName;

const sameOriginImages: RouteMatchCallback = ({ sameOrigin, url }) => sameOrigin && IMAGE_EXTENSIONS.test(url.pathname);
const sameOriginOnly: RouteMatchCallback = ({ sameOrigin }) => sameOrigin;

const runtimeCaching: RuntimeCaching[] = defaultCache
  // Drop the catch-all cross-origin route so cross-origin resources fall through to the browser.
  .filter(entry => cacheNameOf(entry) !== 'cross-origin')
  .map(entry => {
    // Only cache images that are same-origin.
    if (cacheNameOf(entry) === 'static-image-assets') {
      return { ...entry, matcher: sameOriginImages };
    }
    // defaultCache ends with a `{ matcher: /.*/i, method: 'GET', handler: NetworkOnly }` fallback
    // that would otherwise fetch() everything left over (incl. cross-origin images); scope it to same-origin.
    if (entry.matcher instanceof RegExp && entry.matcher.source === '.*') {
      return { ...entry, matcher: sameOriginOnly };
    }
    return entry;
  });

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

serwist.addEventListeners();
