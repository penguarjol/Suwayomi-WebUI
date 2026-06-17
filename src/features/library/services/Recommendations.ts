/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';

// Recommendation/trending RPCs change slowly; cache in-memory so revisiting
// Discover within a session is instant rather than re-querying Supabase.
const ID_TTL_MS = 5 * 60 * 1000;
const idCache = new Map<string, { value: number[]; expires: number }>();

async function cachedIds(fn: string, args: Record<string, unknown>): Promise<number[]> {
    const key = `${fn}:${JSON.stringify(args)}`;
    const cached = idCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;
    try {
        const { data, error } = await supabase.rpc(fn, args);
        if (error) throw error;
        const value = (data ?? []).map((row: { manga_id: number }) => Number(row.manga_id));
        idCache.set(key, { value, expires: Date.now() + ID_TTL_MS });
        return value;
    } catch {
        return [];
    }
}

/** Collaborative recommendations: titles favorited by readers who share yours. */
export const getRecommendedMangaIds = (limit = 12): Promise<number[]> =>
    cachedIds('recommend_for_me', { p_limit: limit });

/** Globally most-favorited titles. */
export const getTrendingMangaIds = (limit = 12): Promise<number[]> => cachedIds('trending_manga', { p_limit: limit });
