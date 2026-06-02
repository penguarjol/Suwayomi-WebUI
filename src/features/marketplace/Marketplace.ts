/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';
import { hasProfanity } from '@/features/social/Social.ts';

export interface Collection {
    id: string;
    user_id: string;
    author_name: string | null;
    title: string;
    description: string | null;
    cover_manga_id: number | null;
    like_count: number;
    featured_until: string | null;
    created_at: string;
}

export interface CollectionItem {
    id: string;
    collection_id: string;
    manga_id: number;
    manga_title: string | null;
    position: number;
}

const nowIso = () => new Date().toISOString();

export async function getCollections(): Promise<{ featured: Collection[]; recent: Collection[] }> {
    const { data } = await supabase
        .from('collections')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(100);
    const all = (data ?? []) as Collection[];
    const iso = nowIso();
    const featured = all
        .filter((c) => c.featured_until && c.featured_until > iso)
        .sort((a, b) => b.like_count - a.like_count);
    return { featured, recent: all };
}

export async function getMyCollections(): Promise<Collection[]> {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return [];
    const { data } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
    return (data ?? []) as Collection[];
}

export async function getCollection(id: string): Promise<{ collection: Collection | null; items: CollectionItem[] }> {
    const [{ data: collection }, { data: items }] = await Promise.all([
        supabase.from('collections').select('*').eq('id', id).maybeSingle(),
        supabase.from('collection_items').select('*').eq('collection_id', id).order('position', { ascending: true }),
    ]);
    return { collection: (collection as Collection) ?? null, items: (items ?? []) as CollectionItem[] };
}

export async function createCollection(title: string, description: string): Promise<string | null> {
    if (hasProfanity(`${title} ${description}`)) throw new Error('profanity');
    const { data: userData } = await supabase.auth.getUser();
    const { user } = userData;
    if (!user) throw new Error('Not authenticated');
    const authorName = (user.email ?? 'reader').split('@')[0];
    const { data, error } = await supabase
        .from('collections')
        .insert({ user_id: user.id, author_name: authorName, title, description })
        .select('id')
        .single();
    if (error) throw error;
    return data?.id ?? null;
}

export async function deleteCollection(id: string): Promise<void> {
    await supabase.from('collections').delete().eq('id', id);
}

export async function addToCollection(collectionId: string, mangaId: number, mangaTitle: string): Promise<void> {
    const { error } = await supabase
        .from('collection_items')
        .insert({ collection_id: collectionId, manga_id: mangaId, manga_title: mangaTitle });
    if (error && error.code !== '23505') throw error; // ignore duplicate
}

export async function removeFromCollection(collectionId: string, mangaId: number): Promise<void> {
    await supabase.from('collection_items').delete().eq('collection_id', collectionId).eq('manga_id', mangaId);
}

export async function getMyLikedCollectionIds(): Promise<Set<string>> {
    const { data } = await supabase.from('collection_likes').select('collection_id');
    return new Set((data ?? []).map((row) => String(row.collection_id)));
}

export async function likeCollection(id: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('collection_likes').insert({ collection_id: id, user_id: userData.user.id });
}

export async function unlikeCollection(id: string): Promise<void> {
    await supabase.from('collection_likes').delete().eq('collection_id', id);
}

export async function boostCollection(id: string): Promise<string> {
    const { data, error } = await supabase.rpc('boost_collection', { p_collection_id: id });
    if (error) return 'error';
    return (data ?? 'error') as string;
}

// --- Multi-collection membership (which of my collections contain a manga) ---
export async function getCollectionIdsForManga(mangaId: number): Promise<Set<string>> {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return new Set();
    // Only my own collections' memberships matter for the toggle menu.
    const { data } = await supabase
        .from('collection_items')
        .select('collection_id, collections!inner(user_id)')
        .eq('manga_id', mangaId)
        .eq('collections.user_id', uid);
    return new Set((data ?? []).map((row) => String(row.collection_id)));
}

// --- Following collections ---
export async function getMyFollowedCollectionIds(): Promise<Set<string>> {
    const { data } = await supabase.from('collection_follows').select('collection_id');
    return new Set((data ?? []).map((row) => String(row.collection_id)));
}

export async function followCollection(id: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('collection_follows').insert({ collection_id: id, user_id: userData.user.id });
}

export async function unfollowCollection(id: string): Promise<void> {
    await supabase.from('collection_follows').delete().eq('collection_id', id);
}

/** Collections the current user follows, most-recently-followed first. */
export async function getFollowedCollections(): Promise<Collection[]> {
    const { data: follows } = await supabase
        .from('collection_follows')
        .select('collection_id, created_at')
        .order('created_at', { ascending: false });
    const ids = (follows ?? []).map((row) => String(row.collection_id));
    if (!ids.length) return [];
    const { data } = await supabase.from('collections').select('*').in('id', ids);
    const order = new Map(ids.map((id, i) => [id, i]));
    return ((data ?? []) as Collection[]).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
