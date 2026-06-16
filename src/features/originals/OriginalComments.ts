/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';

/**
 * Originals comments (reuse the shared `comments` table; chapter_id holds the
 * original chapter uuid as text). Adds threads, per-user hearts, creator pins,
 * and creator announcements (creator_posts). Author identity follows the
 * existing reader-comment model (email prefix) plus a "Creator" badge.
 */

export interface OriginalComment {
    id: string;
    chapter_id: string;
    user_id: string;
    parent_comment_id: string | null;
    content: string;
    likes_count: number;
    pinned: boolean;
    created_at: string;
    authorName: string;
}

interface RawComment {
    id: string;
    chapter_id: string;
    user_id: string;
    parent_comment_id: string | null;
    content: string;
    likes_count: number | null;
    pinned: boolean | null;
    created_at: string;
    profiles?: { email?: string } | null;
}

function toComment(row: RawComment): OriginalComment {
    const email = row.profiles?.email ?? '';
    return {
        id: row.id,
        chapter_id: row.chapter_id,
        user_id: row.user_id,
        parent_comment_id: row.parent_comment_id,
        content: row.content,
        likes_count: Number(row.likes_count ?? 0),
        pinned: !!row.pinned,
        created_at: row.created_at,
        authorName: email ? email.split('@')[0] : 'reader',
    };
}

export async function listChapterComments(chapterId: string): Promise<OriginalComment[]> {
    const select = '*, profiles ( email )';
    const { data, error } = await supabase
        .from('comments')
        .select(select)
        .eq('chapter_id', chapterId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
    if (!error && data) return (data as RawComment[]).map(toComment);

    const { data: fallback } = await supabase
        .from('comments')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
    return ((fallback ?? []) as RawComment[]).map(toComment);
}

export async function postComment(chapterId: string, content: string, parentId?: string | null): Promise<boolean> {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return false;
    const { error } = await supabase.from('comments').insert({
        chapter_id: chapterId,
        user_id: uid,
        content: content.trim(),
        parent_comment_id: parentId ?? null,
    });
    return !error;
}

export async function deleteComment(id: string): Promise<void> {
    await supabase.from('comments').delete().eq('id', id);
}

export async function toggleCommentLike(id: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('toggle_comment_like', { p_comment_id: id });
    if (error) return false;
    return !!data;
}

export async function pinComment(id: string, pinned: boolean): Promise<string> {
    const { data, error } = await supabase.rpc('pin_comment', { p_comment_id: id, p_pinned: pinned });
    if (error) return 'error';
    return (data ?? 'error') as string;
}

export async function getMyLikedCommentIds(commentIds: string[]): Promise<Set<string>> {
    if (!commentIds.length) return new Set();
    const { data } = await supabase.from('comment_likes').select('comment_id').in('comment_id', commentIds);
    return new Set((data ?? []).map((row) => String(row.comment_id)));
}

export interface CreatorPost {
    id: string;
    creator_id: string;
    body: string;
    created_at: string;
}

export async function listCreatorPosts(creatorId: string, limit = 20): Promise<CreatorPost[]> {
    const { data } = await supabase
        .from('creator_posts')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(limit);
    return (data ?? []) as CreatorPost[];
}

export async function createCreatorPost(body: string): Promise<boolean> {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return false;
    const { error } = await supabase.from('creator_posts').insert({ creator_id: uid, body: body.trim() });
    return !error;
}
