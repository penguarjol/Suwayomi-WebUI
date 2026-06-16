/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';

export interface Creator {
    id: string;
    display_name: string;
    bio: string | null;
    revenue_share: number;
    status: string;
}

export type PubStatus = 'ongoing' | 'completed' | 'hiatus';

export interface OriginalWork {
    id: string;
    creator_id: string;
    title: string;
    description: string | null;
    cover_path: string | null;
    content_type: 'manga' | 'comic' | 'novel' | 'other';
    is_mature: boolean;
    status: 'draft' | 'published';
    pub_status: PubStatus;
    tags: string[];
    like_count: number;
    created_at: string;
}

export interface OriginalChapter {
    id: string;
    work_id: string;
    title: string;
    number: number;
    price_coins: number;
    pages: string[];
    published: boolean;
    author_note: string | null;
    publish_at: string | null;
    created_at: string;
}

const COVERS_BUCKET = 'original-covers';
const PAGES_BUCKET = 'originals';

async function currentUserId(): Promise<string> {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error('Not authenticated');
    return data.user.id;
}

// --- Creator profile ---
export async function getMyCreatorProfile(): Promise<Creator | null> {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return null;
    const { data } = await supabase.from('creators').select('*').eq('id', uid).maybeSingle();
    return (data as Creator) ?? null;
}

export async function becomeCreator(displayName: string): Promise<void> {
    const { error } = await supabase.rpc('become_creator', { p_display_name: displayName });
    if (error) throw error;
}

// --- Works ---
export async function listMyWorks(): Promise<OriginalWork[]> {
    const uid = await currentUserId();
    const { data } = await supabase
        .from('original_works')
        .select('*')
        .eq('creator_id', uid)
        .order('created_at', { ascending: false });
    return (data ?? []) as OriginalWork[];
}

export async function listPublishedWorks(): Promise<OriginalWork[]> {
    const { data } = await supabase
        .from('original_works')
        .select('*')
        .eq('status', 'published')
        .eq('is_mature', false)
        .order('created_at', { ascending: false })
        .limit(100);
    return (data ?? []) as OriginalWork[];
}

// --- Tipping + creator following ---
export async function tipCreator(creatorId: string, amount: number): Promise<string> {
    const { data, error } = await supabase.rpc('tip_creator', { p_creator_id: creatorId, p_amount: amount });
    if (error) return 'error';
    return (data ?? 'error') as string;
}

export async function getMyFollowedCreatorIds(): Promise<Set<string>> {
    const { data } = await supabase.from('creator_follows').select('creator_id');
    return new Set((data ?? []).map((row) => String(row.creator_id)));
}

export async function followCreator(creatorId: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('creator_follows').insert({ creator_id: creatorId, user_id: userData.user.id });
}

export async function unfollowCreator(creatorId: string): Promise<void> {
    await supabase.from('creator_follows').delete().eq('creator_id', creatorId);
}

/** Newest published works from creators the user follows. */
export async function getFollowedCreatorWorks(limit = 12): Promise<OriginalWork[]> {
    const { data: follows } = await supabase.from('creator_follows').select('creator_id');
    const ids = (follows ?? []).map((row) => String(row.creator_id));
    if (!ids.length) return [];
    const { data } = await supabase
        .from('original_works')
        .select('*')
        .eq('status', 'published')
        .in('creator_id', ids)
        .order('created_at', { ascending: false })
        .limit(limit);
    return (data ?? []) as OriginalWork[];
}

export async function createWork(input: {
    title: string;
    description: string;
    content_type: OriginalWork['content_type'];
    is_mature: boolean;
}): Promise<string> {
    const uid = await currentUserId();
    const { data, error } = await supabase
        .from('original_works')
        .insert({ ...input, creator_id: uid })
        .select('id')
        .single();
    if (error) throw error;
    return data.id;
}

export async function getWork(id: string): Promise<{ work: OriginalWork | null; chapters: OriginalChapter[] }> {
    const [{ data: work }, { data: chapters }] = await Promise.all([
        supabase.from('original_works').select('*').eq('id', id).maybeSingle(),
        supabase.from('original_chapters').select('*').eq('work_id', id).order('number', { ascending: true }),
    ]);
    return { work: (work as OriginalWork) ?? null, chapters: (chapters ?? []) as OriginalChapter[] };
}

export async function setWorkStatus(id: string, status: 'draft' | 'published'): Promise<void> {
    await supabase.from('original_works').update({ status }).eq('id', id);
}

export async function updateWork(
    id: string,
    patch: Partial<Pick<OriginalWork, 'title' | 'description' | 'content_type' | 'is_mature' | 'pub_status' | 'tags'>>,
): Promise<void> {
    const { error } = await supabase.from('original_works').update(patch).eq('id', id);
    if (error) throw error;
}

export async function uploadCover(workId: string, file: File): Promise<string> {
    const uid = await currentUserId();
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${uid}/${workId}/cover.${ext}`;
    const { error } = await supabase.storage.from(COVERS_BUCKET).upload(path, file, { upsert: true });
    if (error) throw error;
    await supabase.from('original_works').update({ cover_path: path }).eq('id', workId);
    return path;
}

export function coverUrl(path: string | null): string {
    if (!path) return '';
    return supabase.storage.from(COVERS_BUCKET).getPublicUrl(path).data.publicUrl;
}

// --- Chapters ---
export async function createChapter(input: {
    work_id: string;
    title: string;
    number: number;
    price_coins: number;
}): Promise<string> {
    const { data, error } = await supabase.from('original_chapters').insert(input).select('id').single();
    if (error) throw error;
    return data.id;
}

export async function uploadChapterPages(chapterId: string, files: File[]): Promise<string[]> {
    const uid = await currentUserId();
    const paths: string[] = [];
    for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${uid}/${chapterId}/${String(i).padStart(4, '0')}.${ext}`;
        // eslint-disable-next-line no-await-in-loop -- sequential keeps page order deterministic
        const { error } = await supabase.storage.from(PAGES_BUCKET).upload(path, file, { upsert: true });
        if (error) throw error;
        paths.push(path);
    }
    await supabase.from('original_chapters').update({ pages: paths }).eq('id', chapterId);
    return paths;
}

export async function setChapterPublished(chapterId: string, published: boolean): Promise<void> {
    await supabase.from('original_chapters').update({ published }).eq('id', chapterId);
}

export async function updateChapter(
    chapterId: string,
    patch: Partial<Pick<OriginalChapter, 'title' | 'number' | 'price_coins' | 'author_note'>>,
): Promise<void> {
    const { error } = await supabase.from('original_chapters').update(patch).eq('id', chapterId);
    if (error) throw error;
}

/** Schedule (or clear) a chapter's automatic release. Auto-publish requires the
 *  pg_cron job (see the migration); creators can also force it via the editor. */
export async function setChapterSchedule(chapterId: string, publishAtIso: string | null): Promise<void> {
    const { error } = await supabase.from('original_chapters').update({ publish_at: publishAtIso }).eq('id', chapterId);
    if (error) throw error;
}

/** Append newly uploaded pages to a chapter (keeps existing order). */
export async function addChapterPages(chapterId: string, existing: string[], files: File[]): Promise<string[]> {
    const uid = await currentUserId();
    const added: string[] = [];
    const base = existing.length;
    for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${uid}/${chapterId}/${String(base + i).padStart(4, '0')}-${Date.now()}.${ext}`;
        // eslint-disable-next-line no-await-in-loop -- sequential keeps page order deterministic
        const { error } = await supabase.storage.from(PAGES_BUCKET).upload(path, file, { upsert: true });
        if (error) throw error;
        added.push(path);
    }
    const next = [...existing, ...added];
    await supabase.from('original_chapters').update({ pages: next }).eq('id', chapterId);
    return next;
}

/** Persist a reordered/edited page list (e.g. after move or delete). */
export async function setChapterPages(chapterId: string, pages: string[]): Promise<void> {
    const { error } = await supabase.from('original_chapters').update({ pages }).eq('id', chapterId);
    if (error) throw error;
}

/** Remove a single page (by index) from a chapter and best-effort delete the file. */
export async function removeChapterPage(chapterId: string, pages: string[], index: number): Promise<string[]> {
    const path = pages[index];
    const next = pages.filter((_, i) => i !== index);
    await supabase.from('original_chapters').update({ pages: next }).eq('id', chapterId);
    if (path)
        await supabase.storage
            .from(PAGES_BUCKET)
            .remove([path])
            .catch(() => undefined);
    return next;
}

export async function deleteChapter(chapterId: string): Promise<void> {
    await supabase.from('original_chapters').delete().eq('id', chapterId);
}

export async function getOriginalChapter(chapterId: string): Promise<OriginalChapter | null> {
    const { data } = await supabase.from('original_chapters').select('*').eq('id', chapterId).maybeSingle();
    return (data as OriginalChapter) ?? null;
}

// --- Reading / unlock ---
export type OriginalUnlockStatus =
    | 'unlocked'
    | 'already_unlocked'
    | 'free'
    | 'entitled'
    | 'insufficient'
    | 'not_found'
    | 'error';

export async function unlockOriginalChapter(chapterId: string): Promise<OriginalUnlockStatus> {
    const { data, error } = await supabase.rpc('unlock_original_chapter', { p_chapter_id: chapterId });
    if (error) return 'error';
    return (data ?? 'error') as OriginalUnlockStatus;
}

export async function getMyUnlockedChapterIds(): Promise<Set<string>> {
    const { data } = await supabase.from('original_unlocks').select('chapter_id');
    return new Set((data ?? []).map((row) => String(row.chapter_id)));
}

/** Fetch a page image through the Gatekeeper (authed). Returns an object URL or null (402/err). */
export async function fetchOriginalPage(
    chapterId: string,
    position: number,
): Promise<{ url: string | null; status: number }> {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch(`/api/originals/chapter/${chapterId}/page/${position}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return { url: null, status: res.status };
    const blob = await res.blob();
    return { url: URL.createObjectURL(blob), status: 200 };
}

export interface Earning {
    coins: number;
    created_at: string;
    chapter_id: string | null;
}

export interface CreatorWorkStats {
    work_id: string;
    title: string;
    status: 'draft' | 'published';
    pub_status: PubStatus;
    chapter_count: number;
    unlocks: number;
    coins_earned: number;
    like_count: number;
}

export async function getCreatorDashboard(): Promise<CreatorWorkStats[]> {
    try {
        const { data, error } = await supabase.rpc('creator_dashboard');
        if (error) throw error;
        return (data ?? []).map((row: Record<string, unknown>) => ({
            work_id: String(row.work_id),
            title: String(row.title),
            status: row.status as 'draft' | 'published',
            pub_status: row.pub_status as PubStatus,
            chapter_count: Number(row.chapter_count ?? 0),
            unlocks: Number(row.unlocks ?? 0),
            coins_earned: Number(row.coins_earned ?? 0),
            like_count: Number(row.like_count ?? 0),
        }));
    } catch {
        return [];
    }
}

export async function publishMyDueChapters(): Promise<number> {
    try {
        const { data, error } = await supabase.rpc('publish_my_due_chapters');
        if (error) return 0;
        return Number(data ?? 0);
    } catch {
        return 0;
    }
}

export async function getMyEarnings(): Promise<{ total: number; recent: Earning[] }> {
    const { data } = await supabase
        .from('creator_earnings')
        .select('coins, created_at, chapter_id')
        .order('created_at', { ascending: false })
        .limit(50);
    const recent = (data ?? []) as Earning[];
    const total = recent.reduce((sum, e) => sum + (e.coins ?? 0), 0);
    return { total, recent };
}

// --- Public creator profile ---
export async function getCreator(id: string): Promise<Creator | null> {
    const { data } = await supabase.from('creators').select('*').eq('id', id).maybeSingle();
    return (data as Creator) ?? null;
}

export async function listWorksByCreator(creatorId: string): Promise<OriginalWork[]> {
    const { data } = await supabase
        .from('original_works')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
    return (data ?? []) as OriginalWork[];
}

export interface CreatorStats {
    follower_count: number;
    supporter_count: number;
    work_count: number;
}

export async function getCreatorStats(creatorId: string): Promise<CreatorStats> {
    const { data } = await supabase.rpc('creator_stats', { p_creator_id: creatorId });
    const row = Array.isArray(data) ? data[0] : data;
    return {
        follower_count: Number(row?.follower_count ?? 0),
        supporter_count: Number(row?.supporter_count ?? 0),
        work_count: Number(row?.work_count ?? 0),
    };
}

// --- Creator support tiers (coin-based patronage) ---
export interface SupportTier {
    id: string;
    creator_id: string;
    name: string;
    monthly_coins: number;
    perks: string | null;
    active: boolean;
}

export type SupportStatus =
    | 'supported'
    | 'insufficient'
    | 'self'
    | 'inactive'
    | 'not_found'
    | 'unauthenticated'
    | 'error';

export async function getSupportTiers(creatorId: string): Promise<SupportTier[]> {
    const { data } = await supabase
        .from('creator_support_tiers')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('active', true)
        .order('monthly_coins', { ascending: true });
    return (data ?? []) as SupportTier[];
}

export async function supportCreator(tierId: string): Promise<SupportStatus> {
    const { data, error } = await supabase.rpc('support_creator', { p_tier_id: tierId });
    if (error) return 'error';
    return (data ?? 'error') as SupportStatus;
}

export async function getMySupportedCreatorIds(): Promise<Set<string>> {
    const nowIso = new Date().toISOString();
    const { data } = await supabase
        .from('creator_supporters')
        .select('creator_id, expires_at')
        .gt('expires_at', nowIso);
    return new Set((data ?? []).map((row) => String(row.creator_id)));
}

// --- Creator-side tier management (Studio) ---
export async function listMySupportTiers(): Promise<SupportTier[]> {
    const uid = await currentUserId();
    const { data } = await supabase
        .from('creator_support_tiers')
        .select('*')
        .eq('creator_id', uid)
        .order('monthly_coins', { ascending: true });
    return (data ?? []) as SupportTier[];
}

export async function createSupportTier(input: { name: string; monthly_coins: number; perks?: string }): Promise<void> {
    const uid = await currentUserId();
    const { error } = await supabase.from('creator_support_tiers').insert({ ...input, creator_id: uid });
    if (error) throw error;
}

export async function setSupportTierActive(tierId: string, active: boolean): Promise<void> {
    await supabase.from('creator_support_tiers').update({ active }).eq('id', tierId);
}
