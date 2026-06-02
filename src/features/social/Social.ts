/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';

export interface Post {
    id: string;
    user_id: string;
    author_name: string | null;
    manga_id: number | null;
    manga_title: string | null;
    content: string;
    like_count: number;
    created_at: string;
}

// Lightweight profanity guard (v1). A production system should use a managed
// moderation service; admins can also hide posts. Kept intentionally small.
const PROFANITY = [
    'fuck',
    'shit',
    'bitch',
    'cunt',
    'asshole',
    'nigger',
    'faggot',
    'slut',
    'whore',
    'dick',
    'piss',
    'bastard',
];

const profanityRegex = new RegExp(`\\b(${PROFANITY.join('|')})\\b`, 'gi');

export function hasProfanity(text: string): boolean {
    return profanityRegex.test(text);
}

export function censorProfanity(text: string): string {
    return text.replace(profanityRegex, (word) => word[0] + '*'.repeat(Math.max(word.length - 1, 1)));
}

export async function getPosts(limit = 50): Promise<Post[]> {
    const { data, error } = await supabase
        .from('posts')
        .select('id, user_id, author_name, manga_id, manga_title, content, like_count, created_at')
        .eq('hidden', false)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return (data ?? []) as Post[];
}

export async function createPost(content: string, mangaTitle?: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const { user } = userData;
    if (!user) throw new Error('Not authenticated');
    const authorName = (user.email ?? 'reader').split('@')[0];
    const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        author_name: authorName,
        content,
        manga_title: mangaTitle || null,
    });
    if (error) throw error;
}

export async function getMyLikedPostIds(postIds: string[]): Promise<Set<string>> {
    if (!postIds.length) return new Set();
    const { data } = await supabase.from('post_likes').select('post_id').in('post_id', postIds);
    return new Set((data ?? []).map((row) => String(row.post_id)));
}

export async function likePost(postId: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('post_likes').insert({ post_id: postId, user_id: userData.user.id });
}

export async function unlikePost(postId: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userData.user.id);
}

export async function hidePost(postId: string): Promise<void> {
    await supabase.from('posts').update({ hidden: true }).eq('id', postId);
}
