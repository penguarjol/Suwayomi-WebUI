/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';

/**
 * Profile cosmetics + badges (engagement). The DB enforces premium gating on
 * cosmetic writes (set_profile_customization) and auto-awards achievements
 * (sync_my_achievements). Styling for each cosmetic key lives in ProfileCosmetics.
 */

export interface UserProfile {
    user_id: string;
    bio: string | null;
    accent_color: string | null;
    banner_key: string;
    avatar_frame_key: string;
    name_effect_key: string;
}

export interface Cosmetic {
    key: string;
    type: 'banner' | 'frame' | 'name_effect';
    name: string;
    premium: boolean;
    sort: number;
}

export interface Badge {
    id: string;
    key: string;
    name: string;
    description: string | null;
    icon: string | null;
    premium: boolean;
    sort: number;
}

export interface EarnedBadge {
    badge_id: string;
    equipped: boolean;
    earned_at: string;
}

const DEFAULT_PROFILE: Omit<UserProfile, 'user_id'> = {
    bio: null,
    accent_color: null,
    banner_key: 'default',
    avatar_frame_key: 'none',
    name_effect_key: 'none_effect',
};

export async function getUserProfile(userId: string): Promise<UserProfile> {
    try {
        const { data } = await supabase.from('user_profile').select('*').eq('user_id', userId).maybeSingle();
        if (data) return data as UserProfile;
    } catch {
        /* fall through to defaults */
    }
    return { user_id: userId, ...DEFAULT_PROFILE };
}

export async function getCosmetics(): Promise<Cosmetic[]> {
    try {
        const { data } = await supabase.from('cosmetics').select('*').order('sort', { ascending: true });
        return (data ?? []) as Cosmetic[];
    } catch {
        return [];
    }
}

export type SaveCustomizationStatus = 'saved' | 'premium_required' | 'unauthenticated' | 'error';

export async function saveCustomization(input: {
    bio: string | null;
    accentColor: string | null;
    bannerKey: string;
    avatarFrameKey: string;
    nameEffectKey: string;
}): Promise<SaveCustomizationStatus> {
    const { data, error } = await supabase.rpc('set_profile_customization', {
        p_bio: input.bio,
        p_accent_color: input.accentColor,
        p_banner_key: input.bannerKey,
        p_avatar_frame_key: input.avatarFrameKey,
        p_name_effect_key: input.nameEffectKey,
    });
    if (error) return 'error';
    return (data ?? 'error') as SaveCustomizationStatus;
}

export async function getBadgeCatalog(): Promise<Badge[]> {
    try {
        const { data } = await supabase.from('badges').select('*').order('sort', { ascending: true });
        return (data ?? []) as Badge[];
    } catch {
        return [];
    }
}

export async function getEarnedBadges(userId: string): Promise<EarnedBadge[]> {
    try {
        const { data } = await supabase
            .from('user_badges')
            .select('badge_id, equipped, earned_at')
            .eq('user_id', userId);
        return (data ?? []) as EarnedBadge[];
    } catch {
        return [];
    }
}

/** Auto-award any newly-qualified achievements for the current user. */
export async function syncMyAchievements(): Promise<number> {
    try {
        const { data, error } = await supabase.rpc('sync_my_achievements');
        if (error) return 0;
        return Number(data ?? 0);
    } catch {
        return 0;
    }
}
