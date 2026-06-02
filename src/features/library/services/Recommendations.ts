/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';

/** Collaborative recommendations: titles favorited by readers who share yours. */
export async function getRecommendedMangaIds(limit = 12): Promise<number[]> {
    try {
        const { data, error } = await supabase.rpc('recommend_for_me', { p_limit: limit });
        if (error) throw error;
        return (data ?? []).map((row: { manga_id: number }) => Number(row.manga_id));
    } catch {
        return [];
    }
}

/** Globally most-favorited titles. */
export async function getTrendingMangaIds(limit = 12): Promise<number[]> {
    try {
        const { data, error } = await supabase.rpc('trending_manga', { p_limit: limit });
        if (error) throw error;
        return (data ?? []).map((row: { manga_id: number }) => Number(row.manga_id));
    } catch {
        return [];
    }
}
