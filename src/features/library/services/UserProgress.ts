/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import gql from 'graphql-tag';
import { supabase } from '@/lib/SupabaseClient.ts';
import { requestManager } from '@/lib/requests/RequestManager.ts';

/**
 * Per-user reading progress (multi-tenancy, ADR-0005). The engine's
 * chapter read-state is GLOBAL/shared, so each user's real progress lives in
 * Supabase (`user_chapter_progress`, RLS). We overlay the per-user values onto
 * the Apollo cache after each fetch so every consumer (chapter list + reader
 * resume) shows THIS user's progress without per-component changes, and the
 * reader writes progress back to Supabase as the user reads.
 */

const PROGRESS_FRAGMENT = gql`
    fragment NexusUserProgress on ChapterType {
        isRead
        lastPageRead
    }
`;

const getCache = () => requestManager.graphQLClient.client.cache;

function overlayChapter(chapterId: number, isRead: boolean, lastPageRead: number) {
    const cache = getCache();
    cache.writeFragment({
        id: cache.identify({ __typename: 'ChapterType', id: chapterId }),
        fragment: PROGRESS_FRAGMENT,
        data: { __typename: 'ChapterType', id: chapterId, isRead, lastPageRead },
    });
}

/**
 * Load this user's progress for the given chapters and overlay it onto the
 * Apollo cache. Chapters with no per-user row are set unread (per-user
 * isolation: another user's read state must not leak in).
 */
export async function applyUserProgress(chapterIds: number[]): Promise<void> {
    if (!chapterIds.length) return;
    try {
        const { data, error } = await supabase
            .from('user_chapter_progress')
            .select('chapter_id, last_page_read, is_read')
            .in('chapter_id', chapterIds);
        if (error) throw error;

        const byId = new Map<number, { isRead: boolean; lastPageRead: number }>();
        for (const row of data ?? []) {
            byId.set(Number(row.chapter_id), {
                isRead: !!row.is_read,
                lastPageRead: Number(row.last_page_read ?? 0),
            });
        }
        for (const id of chapterIds) {
            const p = byId.get(id);
            overlayChapter(id, p?.isRead ?? false, p?.lastPageRead ?? 0);
        }
    } catch {
        // Engine values remain if Supabase is unreachable; reading still works.
    }
}

/**
 * Manga ids the user has read most recently (for the "Continue Reading" rail),
 * de-duplicated and ordered most-recent-first.
 */
export async function getInProgressMangaIds(limit = 12): Promise<number[]> {
    try {
        const { data, error } = await supabase
            .from('user_chapter_progress')
            .select('manga_id, updated_at')
            .order('updated_at', { ascending: false })
            .limit(60);
        if (error) throw error;

        const seen = new Set<number>();
        const ids: number[] = [];
        for (const row of data ?? []) {
            const id = Number(row.manga_id);
            if (!seen.has(id)) {
                seen.add(id);
                ids.push(id);
            }
            if (ids.length >= limit) break;
        }
        return ids;
    } catch {
        return [];
    }
}

/**
 * Clear this user's entire reading history (per-user progress). Empties the
 * History screen and the Continue Reading rail. RLS limits the delete to the
 * caller's own rows.
 */
export async function clearUserHistory(): Promise<boolean> {
    try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) return false;
        const { error } = await supabase.from('user_chapter_progress').delete().eq('user_id', uid);
        if (error) throw error;
        return true;
    } catch {
        return false;
    }
}

/** Persist this user's progress for a chapter and overlay it immediately. */
export async function writeUserProgress(
    mangaId: number,
    chapterId: number,
    sourceOrder: number,
    lastPageRead: number,
    isRead: boolean,
): Promise<void> {
    overlayChapter(chapterId, isRead, lastPageRead); // optimistic
    try {
        await supabase.rpc('set_chapter_progress', {
            p_manga_id: mangaId,
            p_chapter_id: chapterId,
            p_chapter_index: sourceOrder,
            p_last_page_read: lastPageRead,
            p_is_read: isRead,
        });
        // A completed chapter counts toward the daily reading streak. Fire-and-
        // forget — the streak is a retention nicety, never blocks progress.
        if (isRead) {
            supabase.rpc('touch_reading_streak').then(undefined, () => {});
        }
    } catch {
        // Optimistic overlay stands; the engine write (still performed) is the
        // shared fallback. Next fetch reconciles from Supabase.
    }
}

export interface ReadingStreak {
    current: number;
    longest: number;
    lastReadDate: string | null;
}

/** This user's reading streak (own-row read via RLS). */
export async function getMyStreak(): Promise<ReadingStreak> {
    try {
        const uid = (await supabase.auth.getUser()).data.user?.id;
        if (!uid) return { current: 0, longest: 0, lastReadDate: null };
        const { data } = await supabase
            .from('user_streaks')
            .select('current_streak, longest_streak, last_read_date')
            .eq('user_id', uid)
            .maybeSingle();
        return {
            current: Number(data?.current_streak ?? 0),
            longest: Number(data?.longest_streak ?? 0),
            lastReadDate: (data?.last_read_date as string) ?? null,
        };
    } catch {
        return { current: 0, longest: 0, lastReadDate: null };
    }
}
