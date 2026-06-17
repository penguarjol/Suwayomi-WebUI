/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { create } from 'zustand';

/**
 * Per-user source visibility preference. Users pick which of the
 * admin-approved sources they want to see in Browse/search. This is a personal
 * UI filter only — the admin allow-list (and the NSFW boundary) remains the hard
 * limit, so this is safe to persist client-side.
 */
const STORAGE_KEY = 'nexus-hidden-sources';
const SETUP_KEY = 'nexus-source-setup';

function loadHidden(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
        return [];
    }
}

function loadSetupComplete(): boolean {
    try {
        return localStorage.getItem(SETUP_KEY) === '1';
    } catch {
        return false;
    }
}

function persist(hidden: Set<string>): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...hidden]));
    } catch {
        /* ignore storage errors */
    }
}

interface SourcePrefsState {
    hidden: Set<string>;
    setupComplete: boolean;
    toggle: (id: string | number) => void;
    setEnabled: (id: string | number, enabled: boolean) => void;
    isHidden: (id: string | number) => boolean;
    /**
     * Record the user's first-run source choice: the chosen sources become
     * visible and everything else selectable is hidden. Marks setup complete so
     * the wizard does not show again. `allSelectableIds` is the allow-listed,
     * non-NSFW set presented in the wizard.
     */
    completeSetup: (selectedIds: (string | number)[], allSelectableIds: (string | number)[]) => void;
}

export const useSourcePrefs = create<SourcePrefsState>((set, get) => ({
    hidden: new Set(loadHidden()),
    setupComplete: loadSetupComplete(),
    toggle: (id) =>
        set((state) => {
            const next = new Set(state.hidden);
            const key = String(id);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            persist(next);
            return { hidden: next };
        }),
    setEnabled: (id, enabled) =>
        set((state) => {
            const next = new Set(state.hidden);
            const key = String(id);
            if (enabled) next.delete(key);
            else next.add(key);
            persist(next);
            return { hidden: next };
        }),
    isHidden: (id) => get().hidden.has(String(id)),
    completeSetup: (selectedIds, allSelectableIds) =>
        set(() => {
            const selected = new Set(selectedIds.map(String));
            const hidden = new Set(allSelectableIds.map(String).filter((id) => !selected.has(id)));
            persist(hidden);
            try {
                localStorage.setItem(SETUP_KEY, '1');
            } catch {
                /* ignore storage errors */
            }
            return { hidden, setupComplete: true };
        }),
}));
