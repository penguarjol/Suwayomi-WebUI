/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect } from 'vitest';
import { computeLockedChapters, DEFAULT_TOKEN_PACKS, DEFAULT_SUBSCRIPTION_PLANS } from '@/features/billing/Billing.ts';

describe('computeLockedChapters', () => {
    // 5 chapters; newest = highest chapterNumber.
    const chapters = [
        { id: 1, chapterNumber: 1 },
        { id: 2, chapterNumber: 2 },
        { id: 3, chapterNumber: 3 },
        { id: 4, chapterNumber: 4 },
        { id: 5, chapterNumber: 5 },
    ];
    const opts = { isPremium: false, isAdmin: false, gatedCount: 3, unlockCost: 5 };

    it('gates the newest N chapters at the configured cost', () => {
        const result = computeLockedChapters(chapters, [], [], opts);
        expect(result.lockedChapterIds.sort((a, b) => a - b)).toEqual([3, 4, 5]);
        expect(result.chapterCosts[5]).toBe(5);
    });

    it('excludes chapters the user already unlocked', () => {
        const result = computeLockedChapters(chapters, [], ['5'], opts);
        expect(result.lockedChapterIds.sort((a, b) => a - b)).toEqual([3, 4]);
    });

    it('never gates everything: short series stay fully free', () => {
        const short = [
            { id: 1, chapterNumber: 1 },
            { id: 2, chapterNumber: 2 },
            { id: 3, chapterNumber: 3 },
        ];
        const result = computeLockedChapters(short, [], [], opts);
        expect(result.lockedChapterIds).toEqual([]);
    });

    it('honors a future schedule override (cost + chapter) outside the recency window', () => {
        const result = computeLockedChapters(chapters, [{ chapter_id: '1', token_cost: 12 }], [], opts);
        expect(result.lockedChapterIds.sort((a, b) => a - b)).toEqual([1, 3, 4, 5]);
        expect(result.chapterCosts[1]).toBe(12);
    });

    it('locks nothing for premium users', () => {
        expect(computeLockedChapters(chapters, [], [], { ...opts, isPremium: true }).lockedChapterIds).toEqual([]);
    });

    it('locks nothing for admins', () => {
        expect(computeLockedChapters(chapters, [], [], { ...opts, isAdmin: true }).lockedChapterIds).toEqual([]);
    });

    it('respects an admin-tuned gatedCount of 1', () => {
        const result = computeLockedChapters(chapters, [], [], { ...opts, gatedCount: 1 });
        expect(result.lockedChapterIds).toEqual([5]);
    });

    it('locks nothing when payments are disabled (soft launch)', () => {
        const result = computeLockedChapters(chapters, [{ chapter_id: '1', token_cost: 12 }], [], {
            ...opts,
            paymentsEnabled: false,
        });
        expect(result.lockedChapterIds).toEqual([]);
        expect(result.chapterCosts).toEqual({});
    });
});

describe('billing catalog', () => {
    it('exposes token packs and subscription plans', () => {
        expect(DEFAULT_TOKEN_PACKS.length).toBeGreaterThan(0);
        expect(DEFAULT_SUBSCRIPTION_PLANS.some((p) => p.period === 'month')).toBe(true);
    });
});
