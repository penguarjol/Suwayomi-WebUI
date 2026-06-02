/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { create } from 'zustand';
import { supabase } from '@/lib/SupabaseClient.ts';

export interface Sticker {
    id: string;
    creator_id: string | null;
    name: string;
    emoji: string | null;
    image_path: string | null;
    access_tier: 'free' | 'coins' | 'premium';
    price_coins: number;
}

const BUCKET = 'stickers';
export const STICKER_TOKEN_RE = /:s\[([0-9a-fA-F-]{36})\]:/g;
export const stickerToken = (id: string) => `:s[${id}]:`;

export function stickerImageUrl(path: string | null): string {
    if (!path) return '';
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

interface StickerStore {
    byId: Map<string, Sticker>;
    usable: Set<string>;
    loaded: boolean;
    load: () => Promise<void>;
}

export const useStickerStore = create<StickerStore>((set, get) => ({
    byId: new Map(),
    usable: new Set(),
    loaded: false,
    load: async () => {
        if (get().loaded) return;
        try {
            const [{ data: stickers }, { data: ents }] = await Promise.all([
                supabase.from('stickers').select('*').eq('status', 'active'),
                supabase.from('sticker_entitlements').select('sticker_id'),
            ]);
            const byId = new Map<string, Sticker>();
            (stickers ?? []).forEach((s) => byId.set(String(s.id), s as Sticker));
            const owned = new Set((ents ?? []).map((row) => String(row.sticker_id)));
            const usable = new Set<string>();
            byId.forEach((s, id) => {
                if (s.access_tier === 'free' || owned.has(id)) usable.add(id);
            });
            set({ byId, usable, loaded: true });
        } catch {
            set({ loaded: true });
        }
    },
}));

export async function getStickerCatalog(): Promise<Sticker[]> {
    const { data } = await supabase
        .from('stickers')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
    return (data ?? []) as Sticker[];
}

export async function getMyStickerIds(): Promise<Set<string>> {
    const { data } = await supabase.from('sticker_entitlements').select('sticker_id');
    return new Set((data ?? []).map((row) => String(row.sticker_id)));
}

export type StickerUnlockStatus =
    | 'owned'
    | 'already_owned'
    | 'insufficient'
    | 'premium_required'
    | 'not_found'
    | 'error';

export async function unlockSticker(id: string): Promise<StickerUnlockStatus> {
    const { data, error } = await supabase.rpc('unlock_sticker', { p_sticker_id: id });
    if (error) return 'error';
    return (data ?? 'error') as StickerUnlockStatus;
}

export async function publishSticker(input: {
    name: string;
    file: File;
    accessTier: 'free' | 'coins';
    priceCoins: number;
}): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) throw new Error('Not authenticated');
    // A creator profile is required so earnings have a payee.
    const { data: creator } = await supabase.from('creators').select('id').eq('id', uid).maybeSingle();
    if (!creator) throw new Error('Become a creator first');

    const { data: row, error: insErr } = await supabase
        .from('stickers')
        .insert({
            creator_id: uid,
            name: input.name,
            access_tier: input.accessTier,
            price_coins: input.accessTier === 'coins' ? input.priceCoins : 0,
        })
        .select('id')
        .single();
    if (insErr) throw insErr;

    const ext = input.file.name.split('.').pop() || 'png';
    const path = `${uid}/${row.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, input.file, { upsert: true });
    if (upErr) throw upErr;
    await supabase.from('stickers').update({ image_path: path }).eq('id', row.id);
}
