/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { create } from 'zustand';
import { supabase } from '@/lib/SupabaseClient.ts';

/**
 * Nexus Reads billing (tokens "Coins" + Fast Pass paywall).
 *
 * Per ADR-0001/0002, the catalog below is a display fallback that mirrors the
 * Gatekeeper's server-owned catalog (`/api/saas/config`); the Gatekeeper
 * webhook remains the only authority that credits balances. Spending (unlock)
 * is the client-safe `unlock_chapter` Supabase RPC (auth.uid() + server-side
 * cost), so it works without a Gatekeeper round-trip.
 */

export interface TokenPack {
    id: string;
    label: string;
    tokens: number;
    bonus: number;
    priceUsd: number;
}

export interface SubscriptionPlan {
    id: string;
    label: string;
    priceUsd: number;
    period: 'month' | 'year';
}

export const DEFAULT_TOKEN_PACKS: TokenPack[] = [
    { id: 'tokens_starter', label: 'Starter', tokens: 50, bonus: 0, priceUsd: 3.99 },
    { id: 'tokens_popular', label: 'Popular', tokens: 150, bonus: 15, priceUsd: 9.99 },
    { id: 'tokens_power', label: 'Power', tokens: 400, bonus: 60, priceUsd: 24.99 },
    { id: 'tokens_whale', label: 'Whale', tokens: 850, bonus: 150, priceUsd: 49.99 },
];

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    { id: 'premium_monthly', label: 'Monthly', priceUsd: 7.99, period: 'month' },
    { id: 'premium_annual', label: 'Annual', priceUsd: 49.99, period: 'year' },
];

export interface PaywallChapter {
    id: number;
    name: string;
    cost: number;
    readerUrl: string;
}

type UnlockStatus = 'unlocked' | 'already_unlocked' | 'free' | 'entitled' | 'insufficient' | 'error';

interface BillingStore {
    tokens: number;
    isPremium: boolean;
    isAdmin: boolean;
    loaded: boolean;
    busy: boolean;
    lockedChapterIds: number[];
    chapterCosts: Record<number, number>;
    paywall: { open: boolean; chapter?: PaywallChapter };

    loadProfile: () => Promise<void>;
    loadLocksForChapters: (chapterIds: number[]) => Promise<void>;
    openPaywall: (chapter?: PaywallChapter) => void;
    closePaywall: () => void;
    unlock: (chapterId: number) => Promise<UnlockStatus>;
}

export const useBillingStore = create<BillingStore>((set, get) => ({
    tokens: 0,
    isPremium: false,
    isAdmin: false,
    loaded: false,
    busy: false,
    lockedChapterIds: [],
    chapterCosts: {},
    paywall: { open: false },

    loadProfile: async () => {
        try {
            const { data, error } = await supabase.from('profiles').select('tokens, is_premium, role').single();
            if (error) throw error;
            set({
                tokens: Number(data?.tokens ?? 0),
                isPremium: !!data?.is_premium || data?.role === 'premium',
                isAdmin: data?.role === 'admin',
                loaded: true,
            });
        } catch {
            set({ loaded: true });
        }
    },

    loadLocksForChapters: async (chapterIds) => {
        const { isPremium, isAdmin } = get();
        if (isPremium || isAdmin || chapterIds.length === 0) {
            set({ lockedChapterIds: [], chapterCosts: {} });
            return;
        }
        try {
            const idStrings = chapterIds.map(String);
            const nowIso = new Date().toISOString();
            const [{ data: schedules }, { data: unlocks }] = await Promise.all([
                supabase
                    .from('chapter_schedules')
                    .select('chapter_id, token_cost, release_date')
                    .in('chapter_id', idStrings)
                    .gt('release_date', nowIso),
                supabase.from('chapter_unlocks').select('chapter_id').in('chapter_id', idStrings),
            ]);

            const unlockedIds = new Set((unlocks ?? []).map((row) => String(row.chapter_id)));
            const costs: Record<number, number> = {};
            const locked: number[] = [];
            for (const row of schedules ?? []) {
                const idStr = String(row.chapter_id);
                if (!unlockedIds.has(idStr)) {
                    const numId = Number(idStr);
                    locked.push(numId);
                    costs[numId] = Number(row.token_cost ?? 5);
                }
            }
            set({ lockedChapterIds: locked, chapterCosts: costs });
        } catch {
            set({ lockedChapterIds: [], chapterCosts: {} });
        }
    },

    openPaywall: (chapter) => set({ paywall: { open: true, chapter } }),
    closePaywall: () => set({ paywall: { open: false, chapter: undefined } }),

    unlock: async (chapterId) => {
        set({ busy: true });
        try {
            const { data, error } = await supabase.rpc('unlock_chapter', { p_chapter_id: String(chapterId) });
            if (error) throw error;
            const status = (data ?? 'error') as UnlockStatus;
            if (['unlocked', 'already_unlocked', 'free', 'entitled'].includes(status)) {
                set((state) => ({ lockedChapterIds: state.lockedChapterIds.filter((id) => id !== chapterId) }));
                await get().loadProfile();
            }
            return status;
        } catch {
            return 'error';
        } finally {
            set({ busy: false });
        }
    },
}));

/** Build a Stripe (or other) web-checkout URL via the Gatekeeper, or null. */
export async function startCheckout(productId: string): Promise<{ url?: string; error?: string }> {
    try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch('/api/saas/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ productId }),
        });
        if (!res.ok) {
            return { error: res.status === 501 ? 'not_configured' : `status_${res.status}` };
        }
        const json = await res.json();
        return { url: json.url };
    } catch (e) {
        return { error: 'network' };
    }
}
