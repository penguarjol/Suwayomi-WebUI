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

function loadHidden(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
        return [];
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
    toggle: (id: string | number) => void;
    setEnabled: (id: string | number, enabled: boolean) => void;
    isHidden: (id: string | number) => boolean;
}

export const useSourcePrefs = create<SourcePrefsState>((set, get) => ({
    hidden: new Set(loadHidden()),
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
}));
