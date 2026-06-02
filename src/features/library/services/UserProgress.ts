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
    } catch {
        // Optimistic overlay stands; the engine write (still performed) is the
        // shared fallback. Next fetch reconciles from Supabase.
    }
}
