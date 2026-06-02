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
    const schedules = [
        { chapter_id: '100', token_cost: 5 },
        { chapter_id: '200', token_cost: 7 },
    ];

    it('locks gated chapters the user has not unlocked, with cost', () => {
        const result = computeLockedChapters(schedules, [], { isPremium: false, isAdmin: false });
        expect(result.lockedChapterIds.sort()).toEqual([100, 200]);
        expect(result.chapterCosts[100]).toBe(5);
        expect(result.chapterCosts[200]).toBe(7);
    });

    it('excludes chapters the user already unlocked', () => {
        const result = computeLockedChapters(schedules, ['100'], { isPremium: false, isAdmin: false });
        expect(result.lockedChapterIds).toEqual([200]);
    });

    it('locks nothing for premium users', () => {
        const result = computeLockedChapters(schedules, [], { isPremium: true, isAdmin: false });
        expect(result.lockedChapterIds).toEqual([]);
    });

    it('locks nothing for admins', () => {
        const result = computeLockedChapters(schedules, [], { isPremium: false, isAdmin: true });
        expect(result.lockedChapterIds).toEqual([]);
    });

    it('defaults a missing cost to 5', () => {
        const result = computeLockedChapters([{ chapter_id: 9, token_cost: null }], [], {
            isPremium: false,
            isAdmin: false,
        });
        expect(result.chapterCosts[9]).toBe(5);
    });
});

describe('billing catalog', () => {
    it('exposes token packs and subscription plans', () => {
        expect(DEFAULT_TOKEN_PACKS.length).toBeGreaterThan(0);
        expect(DEFAULT_SUBSCRIPTION_PLANS.some((p) => p.period === 'month')).toBe(true);
    });
});
