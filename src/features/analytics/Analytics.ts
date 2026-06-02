/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Privacy-friendly, cookieless analytics (Plausible-compatible; Umami works the
 * same way). No-ops unless VITE_ANALYTICS_DOMAIN is configured, so it ships
 * disabled and is turned on by env. Use track() for funnel events
 * (signup -> first read -> unlock -> premium).
 */

const DOMAIN = import.meta.env.VITE_ANALYTICS_DOMAIN as string | undefined;
const SRC = (import.meta.env.VITE_ANALYTICS_SRC as string | undefined) || 'https://plausible.io/js/script.js';

type Plausible = (event: string, options?: { props?: Record<string, unknown> }) => void;

export function initAnalytics(): void {
    if (!DOMAIN || typeof document === 'undefined') return;
    if (document.querySelector('script[data-nexus-analytics]')) return;
    const script = document.createElement('script');
    script.defer = true;
    script.src = SRC;
    script.setAttribute('data-domain', DOMAIN);
    script.setAttribute('data-nexus-analytics', 'true');
    document.head.appendChild(script);
}

export function track(event: string, props?: Record<string, string | number | boolean>): void {
    try {
        const { plausible } = window as unknown as { plausible?: Plausible };
        plausible?.(event, props ? { props } : undefined);
    } catch {
        /* analytics must never break the app */
    }
}
