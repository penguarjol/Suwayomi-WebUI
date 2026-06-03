/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { create } from 'zustand';
import { supabase } from '@/lib/SupabaseClient.ts';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';

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
    favoriteTitles: Record<number, string | null>;
    loaded: boolean;
    load: () => Promise<void>;
    add: (mangaId: number, title?: string | null) => Promise<void>;
    remove: (mangaId: number) => Promise<void>;
    reset: () => void;
}

export const useUserLibraryStore = create<UserLibraryStore>((set, get) => ({
    favoriteIds: [],
    favoriteTitles: {},
    loaded: false,
    load: async () => {
        try {
            const userId = await resolveUserId();
            if (!userId) {
                set({ loaded: true });
                return;
            }
            // Read ids + title, but fall back to ids-only if the denormalized
            // `title` column is absent on older installs. Never let a missing
            // column silently empty a user's library.
            let rows: { manga_id: number; title?: string | null }[] = [];
            const withTitle = await supabase.from('user_library').select('manga_id, title');
            if (withTitle.error) {
                const idsOnly = await supabase.from('user_library').select('manga_id');
                if (idsOnly.error) throw idsOnly.error;
                rows = (idsOnly.data ?? []) as typeof rows;
            } else {
                rows = (withTitle.data ?? []) as typeof rows;
            }
            set({
                favoriteIds: rows.map((row) => Number(row.manga_id)),
                favoriteTitles: Object.fromEntries(rows.map((row) => [Number(row.manga_id), row.title ?? null])),
                loaded: true,
            });
        } catch (e) {
            // Keep the UI usable, but surface the failure instead of hiding it.
            defaultPromiseErrorHandler('UserLibrary::load')(e);
            set({ loaded: true });
        }
    },
    add: async (mangaId, title) => {
        const previous = get().favoriteIds;
        const previousTitles = get().favoriteTitles;
        if (previous.includes(mangaId)) return;
        set({ favoriteIds: [...previous, mangaId], favoriteTitles: { ...previousTitles, [mangaId]: title ?? null } });

        const userId = await resolveUserId();
        if (!userId) {
            set({ favoriteIds: previous, favoriteTitles: previousTitles });
            throw new Error('Not authenticated');
        }
        let { error } = await supabase
            .from('user_library')
            .upsert({ user_id: userId, manga_id: mangaId, title: title ?? null }, { onConflict: 'user_id,manga_id' });
        if (error) {
            // Older installs may lack the `title` column — persist ids-only so the
            // favorite is never lost just because a denormalized column is missing.
            ({ error } = await supabase
                .from('user_library')
                .upsert({ user_id: userId, manga_id: mangaId }, { onConflict: 'user_id,manga_id' }));
        }
        if (error) {
            set({ favoriteIds: previous, favoriteTitles: previousTitles });
            throw error;
        }

        // Engine "track" union flag: set the shared inLibrary so the engine keeps
        // fetching new chapters for any series at least one user favorites
        // (ADR-0005). Fire-and-forget; Supabase is the per-user source of truth.
        requestManager
            .updateManga(mangaId, { updateManga: { inLibrary: true } })
            .response.catch(defaultPromiseErrorHandler('UserLibrary::trackInEngine'));
    },
    remove: async (mangaId) => {
        const previous = get().favoriteIds;
        const previousTitles = get().favoriteTitles;
        const nextTitles = { ...previousTitles };
        delete nextTitles[mangaId];
        set({ favoriteIds: previous.filter((id) => id !== mangaId), favoriteTitles: nextTitles });

        const userId = await resolveUserId();
        if (!userId) {
            set({ favoriteIds: previous, favoriteTitles: previousTitles });
            throw new Error('Not authenticated');
        }
        const { error } = await supabase.from('user_library').delete().eq('user_id', userId).eq('manga_id', mangaId);
        if (error) {
            set({ favoriteIds: previous, favoriteTitles: previousTitles });
            throw error;
        }
    },
    reset: () => {
        cachedUserId = null;
        set({ favoriteIds: [], favoriteTitles: {}, loaded: false });
    },
}));
