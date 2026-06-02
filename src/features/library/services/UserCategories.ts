/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';

/** Per-user library categories (multi-tenancy, ADR-0005). RLS-isolated. */
export interface UserCategory {
    id: string;
    name: string;
    position: number;
}

export async function listCategories(): Promise<UserCategory[]> {
    const { data, error } = await supabase
        .from('user_categories')
        .select('id, name, position')
        .order('position', { ascending: true });
    if (error) throw error;
    return (data ?? []) as UserCategory[];
}

export async function createCategory(name: string, position: number): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');
    const { error } = await supabase.from('user_categories').insert({ user_id: userData.user.id, name, position });
    if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
    const { error } = await supabase.from('user_categories').delete().eq('id', id);
    if (error) throw error;
}

export async function getMangaIdsInCategory(categoryId: string): Promise<number[]> {
    const { data, error } = await supabase.from('user_category_manga').select('manga_id').eq('category_id', categoryId);
    if (error) throw error;
    return (data ?? []).map((row) => Number(row.manga_id));
}

export async function getCategoryIdsForManga(mangaId: number): Promise<string[]> {
    const { data, error } = await supabase.from('user_category_manga').select('category_id').eq('manga_id', mangaId);
    if (error) throw error;
    return (data ?? []).map((row) => String(row.category_id));
}

/** Replace the set of categories a manga belongs to. */
export async function setMangaCategories(mangaId: number, categoryIds: string[]): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Not authenticated');

    await supabase.from('user_category_manga').delete().eq('manga_id', mangaId);
    if (categoryIds.length) {
        const rows = categoryIds.map((category_id) => ({ user_id: userId, category_id, manga_id: mangaId }));
        const { error } = await supabase.from('user_category_manga').insert(rows);
        if (error) throw error;
    }
}
