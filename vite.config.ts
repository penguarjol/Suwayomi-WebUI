/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable import/no-extraneous-dependencies */

import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import legacy from '@vitejs/plugin-legacy';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { VitePWA } from 'vite-plugin-pwa';
import 'dotenv/config';

// eslint-disable-next-line import/no-default-export
export default defineConfig(({ command }) => ({
    base: command === 'serve' ? process.env.VITE_SUBPATH || '/' : '/',
    build: {
        outDir: 'build',
        chunkSizeWarningLimit: 1500,
        // NOTE: do not add custom rollupOptions.output.manualChunks here. Manual
        // vendor splitting caused a cross-chunk init-order crash ("v is not a
        // function" in the apollo chunk) that blanked the whole app. Vite's
        // default chunking orders module init correctly; the PWA app-shell
        // precache already provides the cross-session caching win.
    },
    server: {
        port: Number(process.env.PORT),
        allowedHosts: process.env.ALLOWED_HOSTS.split(',').map((s) => s.trim()),
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src'),
        },
    },
    optimizeDeps: {
        include: ['@mui/material/Tooltip'],
    },
    plugins: [
        react(),
        viteTsconfigPaths(),
        legacy({
            modernPolyfills: [
                'es/array/to-spliced',
                'es/array/to-sorted',
                'es/array/find-last',
                'es/array/find-last-index',
                'es/object/group-by',
            ],
        }),
        nodePolyfills({
            include: ['assert'],
        }),
        // Only setup image runtime caching
        VitePWA({
            registerType: 'autoUpdate',
            manifest: false, // Use existing manifest
            devOptions: {
                enabled: true,
            },
            workbox: {
                // Precache the app shell (JS/CSS/HTML/fonts) so repeat loads boot
                // instantly and work offline. autoUpdate swaps it on each deploy.
                globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
                navigateFallback: 'index.html',
                navigateFallbackDenylist: [/^\/api\//],
                cleanupOutdatedCaches: true,
                maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
                runtimeCaching: [
                    {
                        urlPattern: ({ request, url }) => {
                            if (request.destination === 'image') {
                                return true;
                            }

                            const { pathname } = url;
                            return (
                                pathname.match(/\/chapter\/[0-9]+\/page\/[0-9]+/g) ||
                                pathname.match(/\/manga\/[0-9]+\/thumbnail/g) ||
                                pathname.includes('/extension/icon/')
                            );
                        },
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'image-cache',
                            expiration: {
                                maxEntries: 10000,
                                purgeOnQuotaError: true,
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        // Public SaaS config (tiers/sources/payments flag): serve from
                        // cache instantly, refresh in the background.
                        urlPattern: ({ url }) => url.pathname === '/api/saas/config',
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'saas-config-cache',
                            expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                ],
            },
        }),
    ],
}));
