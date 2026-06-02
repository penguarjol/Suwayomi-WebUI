/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { create } from 'zustand';
import { supabase } from '@/lib/SupabaseClient.ts';

/**
 * Per-user library (multi-tenancy). The Suwayomi engine's `inLibrary` flag is
 * global/shared, so each user's personal favorites live in Supabase
 * (`user_library`) isolated by RLS. The engine still provides the shared
 * source catalog and cover/metadata; ownership is per user (see ADR-0005).
 */

let cachedUserId: string | null = null;

const resolveUserId = async (): Promise<string | null> => {
    if (cachedUserId) return cachedUserId;
    const { data } = await supabase.auth.getUser();
    cachedUserId = data.user?.id ?? null;
    return cachedUserId;
};

interface UserLibraryStore {
    favoriteIds: number[];
    loaded: boolean;
    load: () => Promise<void>;
    add: (mangaId: number, title?: string | null) => Promise<void>;
    remove: (mangaId: number) => Promise<void>;
    reset: () => void;
}

export const useUserLibraryStore = create<UserLibraryStore>((set, get) => ({
    favoriteIds: [],
    loaded: false,
    load: async () => {
        try {
            const userId = await resolveUserId();
            if (!userId) {
                set({ loaded: true });
                return;
            }
            const { data, error } = await supabase.from('user_library').select('manga_id');
            if (error) throw error;
            set({ favoriteIds: (data ?? []).map((row) => Number(row.manga_id)), loaded: true });
        } catch {
            // Fail soft: an empty library is better than a wedged UI.
            set({ loaded: true });
        }
    },
    add: async (mangaId, title) => {
        const previous = get().favoriteIds;
        if (previous.includes(mangaId)) return;
        set({ favoriteIds: [...previous, mangaId] }); // optimistic

        const userId = await resolveUserId();
        if (!userId) {
            set({ favoriteIds: previous });
            throw new Error('Not authenticated');
        }
        const { error } = await supabase
            .from('user_library')
            .upsert({ user_id: userId, manga_id: mangaId, title: title ?? null }, { onConflict: 'user_id,manga_id' });
        if (error) {
            set({ favoriteIds: previous });
            throw error;
        }
    },
    remove: async (mangaId) => {
        const previous = get().favoriteIds;
        set({ favoriteIds: previous.filter((id) => id !== mangaId) }); // optimistic

        const userId = await resolveUserId();
        if (!userId) {
            set({ favoriteIds: previous });
            throw new Error('Not authenticated');
        }
        const { error } = await supabase.from('user_library').delete().eq('user_id', userId).eq('manga_id', mangaId);
        if (error) {
            set({ favoriteIds: previous });
            throw error;
        }
    },
    reset: () => {
        cachedUserId = null;
        set({ favoriteIds: [], loaded: false });
    },
}));
