/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from 'vitest';
import { useSourcePrefs } from '@/features/source/services/SourcePreferences.ts';

describe('useSourcePrefs.completeSetup', () => {
    it('hides every selectable source the user did not choose and marks setup complete', () => {
        useSourcePrefs.getState().completeSetup(['a', 'c'], ['a', 'b', 'c', 'd']);

        const { hidden, setupComplete } = useSourcePrefs.getState();
        expect(setupComplete).toBe(true);
        expect([...hidden].sort()).toEqual(['b', 'd']);
        // Chosen sources are not hidden (i.e. they remain visible).
        expect(hidden.has('a')).toBe(false);
        expect(hidden.has('c')).toBe(false);
    });

    it('skipping (no selection) hides all selectable sources but still completes setup', () => {
        useSourcePrefs.getState().completeSetup([], ['x', 'y']);

        const { hidden, setupComplete } = useSourcePrefs.getState();
        expect(setupComplete).toBe(true);
        expect([...hidden].sort()).toEqual(['x', 'y']);
    });
});
