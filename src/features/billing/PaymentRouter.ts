/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Pure channel-routing policy (ADR-0008). Given the delivery platform, the
 * user's region, and the server-owned purchase policy, decide which purchase
 * channel is primary and whether a native app may surface a "save on web"
 * external link. No DOM/Capacitor access lives here so it stays unit-testable;
 * platform/region detection is in `Platform.ts`.
 */

export type Platform = 'web' | 'pwa' | 'ios' | 'android';
export type PurchaseChannel = 'web' | 'iap';

export interface PurchasePolicy {
    /** Percent off the store (IAP) price when buying via web/PWA. */
    webDiscountPercent: number;
    /** ISO country codes where a native app may show a web-checkout link. */
    externalLinkRegions: string[];
}

export interface PurchaseOptions {
    primaryChannel: PurchaseChannel;
    /** Native only: show a system-browser link to the discounted web checkout. */
    showWebLink: boolean;
    webDiscountPercent: number;
}

/** Conservative fallback used before the server policy has loaded. */
export const DEFAULT_PURCHASE_POLICY: PurchasePolicy = {
    webDiscountPercent: 0,
    externalLinkRegions: ['US'],
};

export function isNativePlatform(platform: Platform): boolean {
    return platform === 'ios' || platform === 'android';
}

function clampPercent(raw: number): number {
    if (!Number.isFinite(raw)) return 0;
    return Math.min(90, Math.max(0, raw));
}

/** Mirror of the Gatekeeper's `applyWebDiscount` for display (whole cents). */
export function webDiscountedPrice(priceUsd: number, percent: number): number {
    return Math.round(priceUsd * (1 - clampPercent(percent) / 100) * 100) / 100;
}

export function resolvePurchaseOptions(
    platform: Platform,
    region: string | null | undefined,
    policy: PurchasePolicy,
): PurchaseOptions {
    const webDiscountPercent = clampPercent(policy.webDiscountPercent);

    if (!isNativePlatform(platform)) {
        return { primaryChannel: 'web', showWebLink: false, webDiscountPercent };
    }

    const allowed = (policy.externalLinkRegions ?? []).map((r) => r.toUpperCase());
    const normalized = (region ?? '').toUpperCase();
    // Fail closed: only show the external link when the region is known AND allowed.
    const showWebLink = normalized.length > 0 && allowed.includes(normalized);
    return { primaryChannel: 'iap', showWebLink, webDiscountPercent };
}
