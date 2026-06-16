/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect } from 'vitest';
import { resolvePurchaseOptions, webDiscountedPrice, type PurchasePolicy } from '@/features/billing/PaymentRouter.ts';

const policy = (over: Partial<PurchasePolicy> = {}): PurchasePolicy => ({
    webDiscountPercent: 15,
    externalLinkRegions: ['US'],
    ...over,
});

describe('resolvePurchaseOptions', () => {
    it('web → Stripe web checkout, no external link', () => {
        const opts = resolvePurchaseOptions('web', 'US', policy());
        expect(opts.primaryChannel).toBe('web');
        expect(opts.showWebLink).toBe(false);
        expect(opts.webDiscountPercent).toBe(15);
    });

    it('installed PWA behaves like web', () => {
        expect(resolvePurchaseOptions('pwa', 'DE', policy()).primaryChannel).toBe('web');
        expect(resolvePurchaseOptions('pwa', 'DE', policy()).showWebLink).toBe(false);
    });

    it('iOS in an allowed region → IAP primary + save-on-web link', () => {
        const opts = resolvePurchaseOptions('ios', 'US', policy());
        expect(opts.primaryChannel).toBe('iap');
        expect(opts.showWebLink).toBe(true);
    });

    it('iOS in a non-allowed region → IAP only, fail-closed', () => {
        expect(resolvePurchaseOptions('ios', 'DE', policy()).showWebLink).toBe(false);
    });

    it('unknown region fails closed (no external link)', () => {
        expect(resolvePurchaseOptions('ios', null, policy()).showWebLink).toBe(false);
        expect(resolvePurchaseOptions('android', undefined, policy()).showWebLink).toBe(false);
    });

    it('region matching is case-insensitive', () => {
        expect(resolvePurchaseOptions('ios', 'us', policy()).showWebLink).toBe(true);
        expect(resolvePurchaseOptions('android', 'us', policy({ externalLinkRegions: ['us'] })).showWebLink).toBe(true);
    });

    it('clamps an out-of-range discount', () => {
        expect(resolvePurchaseOptions('web', 'US', policy({ webDiscountPercent: 200 })).webDiscountPercent).toBe(90);
        expect(resolvePurchaseOptions('web', 'US', policy({ webDiscountPercent: -5 })).webDiscountPercent).toBe(0);
    });
});

describe('webDiscountedPrice', () => {
    it('matches the server rounding (whole cents)', () => {
        expect(webDiscountedPrice(9.99, 15)).toBe(8.49);
        expect(webDiscountedPrice(49.99, 15)).toBe(42.49);
        expect(webDiscountedPrice(10, 0)).toBe(10);
    });
});
