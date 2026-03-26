import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const featureOfflineQueue = process.env.NEXT_PUBLIC_FEATURE_OFFLINE_QUEUE !== "false";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_PWA_DEV !== "true",
  // KLUCZOWA ZMIANA: runtimeCaching ląduje w workboxOptions
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts-webfonts",
          expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "google-fonts-stylesheets",
          expiration: { maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-font-assets",
          expiration: { maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-image-assets",
          expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\/_next\/image\?url=.+$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-image",
          expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\.(?:mp3|wav|ogg)$/i,
        handler: "CacheFirst",
        options: { rangeRequests: true, cacheName: "static-audio-assets", expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 } },
      },
      {
        urlPattern: /\.(?:mp4)$/i,
        handler: "CacheFirst",
        options: { rangeRequests: true, cacheName: "static-video-assets", expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 } },
      },
      {
        urlPattern: /\.(?:js)$/i,
        handler: "StaleWhileRevalidate",
        options: { cacheName: "static-js-assets", expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 } },
      },
      {
        urlPattern: /\.(?:css|less)$/i,
        handler: "StaleWhileRevalidate",
        options: { cacheName: "static-style-assets", expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 } },
      },
      {
        urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
        handler: "StaleWhileRevalidate",
        options: { cacheName: "next-data", expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 } },
      },
      ...(featureOfflineQueue
        ? [
            {
              urlPattern: /\/api\/.*$/i,
              method: "POST" as const,
              handler: "NetworkOnly" as const,
              options: {
                cacheName: "api-post-offline-queue",
                backgroundSync: {
                  name: "api-post-offline-queue",
                  options: { maxRetentionTime: 24 * 60 },
                },
              },
            },
          ]
        : []),
      {
        urlPattern: /\/api\/.*$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "apis",
          expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
          networkTimeoutSeconds: 10,
        },
      },
      {
        urlPattern: /.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "others",
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
  fallbacks: {
    document: "/offline",
  },
});

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default withPWA(nextConfig);