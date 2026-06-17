/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/SupabaseClient.ts';

/**
 * App-wide public user identity. Other users' display fields (name, avatar,
 * premium/admin, flair) come ONLY from the RLS-safe `get_public_profiles` RPC —
 * never from a direct `profiles` read (own-row only). Results are cached in
 * memory and resolved in batches so comment/feed lists make one round-trip.
 */

export interface PublicProfile {
    user_id: string;
    display_name: string | null;
    avatar_path: string | null;
    avatar_preset: string | null;
    avatar_frame_key: string;
    name_effect_key: string;
    accent_color: string | null;
    flair_key: string | null;
    title: string | null;
    is_premium: boolean;
    is_admin: boolean;
}

const AVATARS_BUCKET = 'avatars';

export function avatarUrlFromPath(path: string | null | undefined): string {
    if (!path) return '';
    return supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path).data.publicUrl;
}

const cache = new Map<string, PublicProfile>();

export function invalidatePublicProfile(userId: string): void {
    cache.delete(userId);
}

export async function fetchPublicProfiles(ids: string[]): Promise<Map<string, PublicProfile>> {
    const unique = [...new Set(ids.filter(Boolean))];
    const missing = unique.filter((id) => !cache.has(id));
    if (missing.length) {
        try {
            const { data } = await supabase.rpc('get_public_profiles', { p_ids: missing });
            for (const row of (data ?? []) as PublicProfile[]) cache.set(row.user_id, row);
        } catch {
            /* leave uncached; callers fall back to initials */
        }
    }
    const out = new Map<string, PublicProfile>();
    for (const id of unique) {
        const profile = cache.get(id);
        if (profile) out.set(id, profile);
    }
    return out;
}

/** Batched, cached resolver for a set of user ids. */
export function usePublicProfiles(ids: (string | null | undefined)[]): Map<string, PublicProfile> {
    const key = useMemo(() => [...new Set(ids.filter((id): id is string => !!id))].sort().join(','), [ids]);
    const [map, setMap] = useState<Map<string, PublicProfile>>(() => new Map());

    useEffect(() => {
        let active = true;
        const list = key ? key.split(',') : [];
        if (!list.length) {
            setMap(new Map());
            return undefined;
        }
        fetchPublicProfiles(list).then((resolved) => {
            if (active) setMap(resolved);
        });
        return () => {
            active = false;
        };
    }, [key]);

    return map;
}

export function usePublicProfile(id: string | null | undefined): PublicProfile | undefined {
    const ids = useMemo(() => (id ? [id] : []), [id]);
    const map = usePublicProfiles(ids);
    return id ? map.get(id) : undefined;
}

/** Crop to a centered square and downscale to keep avatars small (egress + UX). */
async function downscaleSquare(file: File, size = 256): Promise<Blob> {
    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => {
                resolve(el);
            };
            el.onerror = reject;
            el.src = url;
        });
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no 2d context');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, 'image/webp', 0.85);
        });
        if (!blob) throw new Error('encode failed');
        return blob;
    } finally {
        URL.revokeObjectURL(url);
    }
}

export type AvatarStatus = 'saved' | 'error' | 'unauthenticated' | 'forbidden';

export async function uploadAvatar(file: File): Promise<AvatarStatus> {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return 'unauthenticated';
    try {
        const blob = await downscaleSquare(file).catch(() => file as Blob);
        // Unique filename busts the public CDN cache on re-upload.
        const path = `${uid}/avatar-${Date.now()}.webp`;
        const { error } = await supabase.storage
            .from(AVATARS_BUCKET)
            .upload(path, blob, { upsert: true, contentType: 'image/webp' });
        if (error) return 'error';
        const { data } = await supabase.rpc('set_avatar', { p_path: path });
        invalidatePublicProfile(uid);
        return (data ?? 'error') as AvatarStatus;
    } catch {
        return 'error';
    }
}

export async function clearMyAvatar(): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    try {
        await supabase.rpc('clear_avatar');
        if (uid) invalidatePublicProfile(uid);
    } catch {
        /* best-effort */
    }
}

export async function reportAvatar(userId: string, reason: string): Promise<void> {
    try {
        await supabase.rpc('report_avatar', { p_user_id: userId, p_reason: reason });
    } catch {
        /* best-effort */
    }
}

export interface AvatarPreset {
    key: string;
    name: string;
    emoji: string;
    bg: string;
    premium: boolean;
    sort: number;
}

export async function getAvatarPresets(): Promise<AvatarPreset[]> {
    try {
        const { data } = await supabase.from('avatar_presets').select('*').order('sort', { ascending: true });
        return (data ?? []) as AvatarPreset[];
    } catch {
        return [];
    }
}

export interface FlairCosmetic {
    key: string;
    name: string;
    icon: string | null;
    required_badge_key: string | null;
    sort: number;
}

let presetsPromise: Promise<AvatarPreset[]> | null = null;
let flairsPromise: Promise<FlairCosmetic[]> | null = null;

function loadPresetsCached(): Promise<AvatarPreset[]> {
    if (!presetsPromise) presetsPromise = getAvatarPresets();
    return presetsPromise;
}

export async function getFlairs(): Promise<FlairCosmetic[]> {
    try {
        const { data } = await supabase
            .from('cosmetics')
            .select('key, name, icon, required_badge_key, sort')
            .eq('type', 'flair')
            .order('sort', { ascending: true });
        return (data ?? []) as FlairCosmetic[];
    } catch {
        return [];
    }
}

function loadFlairsCached(): Promise<FlairCosmetic[]> {
    if (!flairsPromise) flairsPromise = getFlairs();
    return flairsPromise;
}

/** Cached key→preset map for rendering other users' preset avatars. */
export function useAvatarPresetMap(): Map<string, AvatarPreset> {
    const [map, setMap] = useState<Map<string, AvatarPreset>>(() => new Map());
    useEffect(() => {
        let active = true;
        loadPresetsCached().then((list) => {
            if (active) setMap(new Map(list.map((p) => [p.key, p])));
        });
        return () => {
            active = false;
        };
    }, []);
    return map;
}

/** Cached key→flair map for rendering equipped flair icons. */
export function useFlairMap(): Map<string, FlairCosmetic> {
    const [map, setMap] = useState<Map<string, FlairCosmetic>>(() => new Map());
    useEffect(() => {
        let active = true;
        loadFlairsCached().then((list) => {
            if (active) setMap(new Map(list.map((f) => [f.key, f])));
        });
        return () => {
            active = false;
        };
    }, []);
    return map;
}
