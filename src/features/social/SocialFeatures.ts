/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';

/** Phase 2 social features: following, leaderboards, reactions, guestbook,
 *  reading challenges, and gifting. All calls go through SECURITY DEFINER RPCs
 *  or RLS-guarded tables. */

// --- Following ---------------------------------------------------------------
export async function followUser(targetId: string): Promise<string> {
    const { data, error } = await supabase.rpc('follow_user', { p_target: targetId });
    return error ? 'error' : ((data ?? 'error') as string);
}

export async function unfollowUser(targetId: string): Promise<string> {
    const { data, error } = await supabase.rpc('unfollow_user', { p_target: targetId });
    return error ? 'error' : ((data ?? 'error') as string);
}

export async function getMyFollowingIds(): Promise<Set<string>> {
    try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) return new Set();
        const { data } = await supabase.from('user_follows').select('following_id').eq('follower_id', uid);
        return new Set((data ?? []).map((r) => r.following_id as string));
    } catch {
        return new Set();
    }
}

export interface FollowingFeedItem {
    user_id: string;
    kind: 'review' | 'achievement';
    title: string;
    event_at: string;
}

export async function getFollowingFeed(limit = 50): Promise<FollowingFeedItem[]> {
    try {
        const { data } = await supabase.rpc('following_feed', { p_limit: limit });
        return (data ?? []) as FollowingFeedItem[];
    } catch {
        return [];
    }
}

// --- Leaderboards ------------------------------------------------------------
export type LeaderboardMetric = 'chapters' | 'reviews' | 'streak';

export interface LeaderboardEntry {
    user_id: string;
    score: number;
}

export async function getWeeklyLeaderboard(metric: LeaderboardMetric, limit = 20): Promise<LeaderboardEntry[]> {
    try {
        const { data } = await supabase.rpc('weekly_leaderboard', { p_metric: metric, p_limit: limit });
        return (data ?? []) as LeaderboardEntry[];
    } catch {
        return [];
    }
}

// --- Reactions ---------------------------------------------------------------
export type ReactionTarget = 'comment' | 'review';

export async function toggleReaction(targetType: ReactionTarget, targetId: string, emoji: string): Promise<string> {
    const { data, error } = await supabase.rpc('toggle_reaction', {
        p_target_type: targetType,
        p_target_id: targetId,
        p_emoji: emoji,
    });
    return error ? 'error' : ((data ?? 'error') as string);
}

export interface ReactionRow {
    emoji: string;
    user_id: string;
}

export async function getReactions(targetType: ReactionTarget, targetIds: string[]): Promise<ReactionRow[]> {
    if (!targetIds.length) return [];
    try {
        const { data } = await supabase
            .from('reactions')
            .select('emoji, user_id, target_id')
            .eq('target_type', targetType)
            .in('target_id', targetIds);
        return (data ?? []) as (ReactionRow & { target_id: string })[];
    } catch {
        return [];
    }
}

// --- Guestbook ---------------------------------------------------------------
export interface GuestbookEntry {
    id: string;
    wall_user_id: string;
    author_id: string;
    body: string;
    created_at: string;
}

export async function getGuestbook(wallUserId: string, limit = 30): Promise<GuestbookEntry[]> {
    try {
        const { data } = await supabase
            .from('profile_guestbook')
            .select('*')
            .eq('wall_user_id', wallUserId)
            .order('created_at', { ascending: false })
            .limit(limit);
        return (data ?? []) as GuestbookEntry[];
    } catch {
        return [];
    }
}

export async function postGuestbook(wallUserId: string, body: string): Promise<boolean> {
    try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) return false;
        const { error } = await supabase
            .from('profile_guestbook')
            .insert({ wall_user_id: wallUserId, author_id: uid, body });
        return !error;
    } catch {
        return false;
    }
}

export async function deleteGuestbook(id: string): Promise<boolean> {
    const { error } = await supabase.from('profile_guestbook').delete().eq('id', id);
    return !error;
}

// --- Challenges --------------------------------------------------------------
export interface Challenge {
    id: string;
    title: string;
    description: string | null;
    goal_type: 'read_chapters' | 'reviews' | 'unlocks';
    goal_count: number;
    starts_at: string;
    ends_at: string;
    reward_badge_key: string | null;
    reward_sticker_id: string | null;
    active: boolean;
}

export async function getActiveChallenges(): Promise<Challenge[]> {
    try {
        const nowIso = new Date().toISOString();
        const { data } = await supabase
            .from('challenges')
            .select('*')
            .eq('active', true)
            .lte('starts_at', nowIso)
            .gte('ends_at', nowIso)
            .order('ends_at', { ascending: true });
        return (data ?? []) as Challenge[];
    } catch {
        return [];
    }
}

export async function getChallengeProgress(challengeId: string): Promise<number> {
    try {
        const { data } = await supabase.rpc('challenge_progress', { p_challenge_id: challengeId });
        return Number(data ?? 0);
    } catch {
        return 0;
    }
}

export async function getMyClaimedChallengeIds(): Promise<Set<string>> {
    try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) return new Set();
        const { data } = await supabase.from('challenge_claims').select('challenge_id').eq('user_id', uid);
        return new Set((data ?? []).map((r) => r.challenge_id as string));
    } catch {
        return new Set();
    }
}

export async function claimChallenge(challengeId: string): Promise<string> {
    const { data, error } = await supabase.rpc('claim_challenge', { p_challenge_id: challengeId });
    return error ? 'error' : ((data ?? 'error') as string);
}

// --- Gifting -----------------------------------------------------------------
export async function sendGift(
    recipientId: string,
    kind: 'coins' | 'sticker' | 'premium',
    opts: { amount?: number; stickerId?: string; message?: string },
): Promise<string> {
    const { data, error } = await supabase.rpc('send_gift', {
        p_recipient: recipientId,
        p_kind: kind,
        p_amount: opts.amount ?? 0,
        p_sticker_id: opts.stickerId ?? null,
        p_message: opts.message ?? null,
    });
    return error ? 'error' : ((data ?? 'error') as string);
}
