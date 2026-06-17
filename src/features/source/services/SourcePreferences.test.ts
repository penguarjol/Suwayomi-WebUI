/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isSetupComplete, useSourcePrefs } from '@/features/source/services/SourcePreferences.ts';

// The test runner's localStorage doesn't reliably persist; use a real in-memory one.
beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, String(v)),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear(),
    });
});

describe('useSourcePrefs.completeSetup', () => {
    it('hides unchosen sources and marks setup complete for that user only', () => {
        useSourcePrefs.getState().completeSetup('user1', ['a', 'c'], ['a', 'b', 'c', 'd']);

        const { hidden } = useSourcePrefs.getState();
        expect([...hidden].sort()).toEqual(['b', 'd']);
        expect(hidden.has('a')).toBe(false);
        expect(hidden.has('c')).toBe(false);
        // Setup is recorded per user — a different account is NOT marked complete.
        expect(isSetupComplete('user1')).toBe(true);
        expect(isSetupComplete('user2')).toBe(false);
    });

    it('skipping (no selection) hides all selectable sources but still completes setup', () => {
        useSourcePrefs.getState().completeSetup('user3', [], ['x', 'y']);

        const { hidden } = useSourcePrefs.getState();
        expect([...hidden].sort()).toEqual(['x', 'y']);
        expect(isSetupComplete('user3')).toBe(true);
    });
});
