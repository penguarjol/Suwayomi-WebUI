/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';
import { hasProfanity } from '@/features/social/Social.ts';

export interface ForumCategory {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    sort: number;
}

export interface Thread {
    id: string;
    category_id: string | null;
    user_id: string;
    author_name: string | null;
    title: string;
    content: string;
    manga_title: string | null;
    pinned: boolean;
    locked: boolean;
    reply_count: number;
    like_count: number;
    last_activity_at: string;
    created_at: string;
}

export interface ThreadReply {
    id: string;
    thread_id: string;
    user_id: string;
    author_name: string | null;
    content: string;
    like_count: number;
    created_at: string;
}

const authorName = (email: string | undefined) => (email ?? 'reader').split('@')[0];

export async function getCategories(): Promise<ForumCategory[]> {
    const { data } = await supabase.from('forum_categories').select('*').order('sort', { ascending: true });
    return (data ?? []) as ForumCategory[];
}

export async function getThreads(categoryId?: string | null, limit = 50): Promise<Thread[]> {
    let query = supabase
        .from('threads')
        .select('*')
        .eq('hidden', false)
        .order('pinned', { ascending: false })
        .order('last_activity_at', { ascending: false })
        .limit(limit);
    if (categoryId) query = query.eq('category_id', categoryId);
    const { data } = await query;
    return (data ?? []) as Thread[];
}

export async function getRecentThreads(limit = 5): Promise<Thread[]> {
    return getThreads(null, limit);
}

export async function getMyThreads(limit = 50): Promise<Thread[]> {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return [];
    const { data } = await supabase
        .from('threads')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(limit);
    return (data ?? []) as Thread[];
}

export async function getThread(id: string): Promise<{ thread: Thread | null; replies: ThreadReply[] }> {
    const [{ data: thread }, { data: replies }] = await Promise.all([
        supabase.from('threads').select('*').eq('id', id).maybeSingle(),
        supabase
            .from('thread_replies')
            .select('*')
            .eq('thread_id', id)
            .eq('hidden', false)
            .order('created_at', { ascending: true }),
    ]);
    return { thread: (thread as Thread) ?? null, replies: (replies ?? []) as ThreadReply[] };
}

export async function createThread(input: {
    categoryId: string;
    title: string;
    content: string;
    mangaTitle?: string;
}): Promise<string | null> {
    if (hasProfanity(`${input.title} ${input.content}`)) throw new Error('profanity');
    const { data: userData } = await supabase.auth.getUser();
    const { user } = userData;
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
        .from('threads')
        .insert({
            category_id: input.categoryId,
            user_id: user.id,
            author_name: authorName(user.email),
            title: input.title,
            content: input.content,
            manga_title: input.mangaTitle || null,
        })
        .select('id')
        .single();
    if (error) throw error;
    return data?.id ?? null;
}

export async function createReply(threadId: string, content: string): Promise<void> {
    if (hasProfanity(content)) throw new Error('profanity');
    const { data: userData } = await supabase.auth.getUser();
    const { user } = userData;
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
        .from('thread_replies')
        .insert({ thread_id: threadId, user_id: user.id, author_name: authorName(user.email), content });
    if (error) throw error;
}

export async function getMyThreadLikes(): Promise<Set<string>> {
    const { data } = await supabase.from('thread_likes').select('thread_id');
    return new Set((data ?? []).map((row) => String(row.thread_id)));
}

export async function likeThread(id: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('thread_likes').insert({ thread_id: id, user_id: userData.user.id });
}

export async function unlikeThread(id: string): Promise<void> {
    await supabase.from('thread_likes').delete().eq('thread_id', id);
}

export async function hideThread(id: string): Promise<void> {
    await supabase.from('threads').update({ hidden: true }).eq('id', id);
}

export async function hideReply(id: string): Promise<void> {
    await supabase.from('thread_replies').update({ hidden: true }).eq('id', id);
}
