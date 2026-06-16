/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Capacitor } from '@capacitor/core';
import type { Platform } from '@/features/billing/PaymentRouter.ts';

/**
 * Runtime delivery-channel + region detection (ADR-0008). Impure on purpose
 * (touches Capacitor / DOM); the routing decision itself is the pure
 * `PaymentRouter`. Keeping them apart keeps the policy unit-testable.
 */

export function isNativeShell(): boolean {
    try {
        return Capacitor.isNativePlatform();
    } catch {
        return false;
    }
}

/** True when running as an installed PWA (standalone display), not a browser tab. */
export function isStandalonePwa(): boolean {
    if (typeof window === 'undefined') return false;
    const standaloneDisplay = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
    // iOS Safari exposes navigator.standalone instead of the display-mode query.
    const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    return standaloneDisplay || iosStandalone;
}

export function detectPlatform(): Platform {
    if (isNativeShell()) {
        const native = Capacitor.getPlatform();
        if (native === 'ios') return 'ios';
        if (native === 'android') return 'android';
    }
    if (isStandalonePwa()) return 'pwa';
    return 'web';
}

/**
 * Best-effort region (ISO country) for channel routing. On the web this is
 * derived from the browser locale. On native, store-compliance requires the
 * App Store / Play storefront country instead — wire that from RevenueCat's
 * storefront when the native projects ship (tracked in MANUAL_SETUP). Until
 * then the router fails closed (no external link) when the region is unknown.
 */
export function detectRegion(): string | null {
    if (typeof navigator === 'undefined') return null;
    const locale = navigator.language || (navigator.languages && navigator.languages[0]);
    if (!locale) return null;
    const parts = locale.split('-');
    const country = parts.length > 1 ? parts[parts.length - 1] : null;
    return country && country.length === 2 ? country.toUpperCase() : null;
}
