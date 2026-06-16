/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';

/**
 * Manga ratings/reviews (powers discovery via top_rated_manga). Keyed by the
 * shared engine manga id. Public read; own-row writes (RLS). Aggregates come
 * from the manga_rating / top_rated_manga RPCs.
 */

export interface MangaReview {
    id: string;
    user_id: string;
    manga_id: number;
    rating: number;
    body: string | null;
    created_at: string;
}

export interface RatingSummary {
    avg: number;
    count: number;
}

export async function getMangaRating(mangaId: number): Promise<RatingSummary> {
    try {
        const { data } = await supabase.rpc('manga_rating', { p_manga_id: mangaId });
        const row = Array.isArray(data) ? data[0] : data;
        return { avg: Number(row?.avg_rating ?? 0), count: Number(row?.review_count ?? 0) };
    } catch {
        return { avg: 0, count: 0 };
    }
}

export async function listMangaReviews(mangaId: number, limit = 20): Promise<MangaReview[]> {
    const { data } = await supabase
        .from('manga_reviews')
        .select('*')
        .eq('manga_id', mangaId)
        .order('created_at', { ascending: false })
        .limit(limit);
    return (data ?? []) as MangaReview[];
}

export async function getMyReview(mangaId: number): Promise<MangaReview | null> {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return null;
    const { data } = await supabase
        .from('manga_reviews')
        .select('*')
        .eq('manga_id', mangaId)
        .eq('user_id', uid)
        .maybeSingle();
    return (data as MangaReview) ?? null;
}

export async function upsertMyReview(mangaId: number, rating: number, body: string): Promise<boolean> {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return false;
    const { error } = await supabase.from('manga_reviews').upsert(
        {
            user_id: uid,
            manga_id: mangaId,
            rating,
            body: body.trim() || null,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,manga_id' },
    );
    return !error;
}

export async function deleteMyReview(mangaId: number): Promise<boolean> {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return false;
    const { error } = await supabase.from('manga_reviews').delete().eq('manga_id', mangaId).eq('user_id', uid);
    return !error;
}

/** Discovery: ids of the highest-rated manga (resolve details from the engine). */
export async function getTopRatedMangaIds(limit = 20, minReviews = 1): Promise<number[]> {
    try {
        const { data } = await supabase.rpc('top_rated_manga', { p_limit: limit, p_min_reviews: minReviews });
        return (data ?? []).map((row: { manga_id: number }) => Number(row.manga_id));
    } catch {
        return [];
    }
}
