/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { create } from 'zustand';
import { supabase } from '@/lib/SupabaseClient.ts';
import { track } from '@/features/analytics/Analytics.ts';
import { DEFAULT_PURCHASE_POLICY, type PurchasePolicy } from '@/features/billing/PaymentRouter.ts';

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

export const DEFAULT_GATED_COUNT = 3;
export const DEFAULT_UNLOCK_COST = 5;

/**
 * Voluntary tip link (Ko-fi). Overridable per-deploy via VITE_TIP_URL; defaults
 * to the project Ko-fi so the tip UI works without extra config.
 */
export const TIP_URL = (import.meta.env.VITE_TIP_URL as string | undefined)?.trim() || 'https://ko-fi.com/nexusreads';

export interface LockChapter {
    id: number;
    chapterNumber: number;
}

/**
 * Pure Fast Pass lock policy. A chapter is locked for a free user when it is
 * either (a) explicitly scheduled with a future free-release date, or (b) among
 * the newest `gatedCount` chapters of the series (early-access "Fast Pass") —
 * but only when the series has more than `gatedCount` chapters, so there is
 * always free content to hook readers. Premium/admin lock nothing. Already
 * unlocked chapters are excluded. Cost is the schedule override else the global
 * unlock price (never client-trusted; the RPC re-derives it server-side).
 */
export function computeLockedChapters(
    chapters: LockChapter[],
    futureSchedules: { chapter_id: string | number; token_cost: number | null }[],
    unlockedChapterIds: (string | number)[],
    opts: { isPremium: boolean; isAdmin: boolean; gatedCount: number; unlockCost: number; paymentsEnabled?: boolean },
): { lockedChapterIds: number[]; chapterCosts: Record<number, number> } {
    // Soft launch (payments off): nothing is gated, so all chapters read free.
    if (opts.paymentsEnabled === false) return { lockedChapterIds: [], chapterCosts: {} };
    if (opts.isPremium || opts.isAdmin) return { lockedChapterIds: [], chapterCosts: {} };

    const unlocked = new Set(unlockedChapterIds.map(String));
    const scheduleCost = new Map<string, number>();
    for (const schedule of futureSchedules) {
        scheduleCost.set(String(schedule.chapter_id), Number(schedule.token_cost ?? opts.unlockCost));
    }

    const recency = new Set<number>();
    if (opts.gatedCount > 0 && chapters.length > opts.gatedCount) {
        [...chapters]
            .sort((a, b) => b.chapterNumber - a.chapterNumber)
            .slice(0, opts.gatedCount)
            .forEach((chapter) => recency.add(chapter.id));
    }

    const lockedChapterIds: number[] = [];
    const chapterCosts: Record<number, number> = {};
    for (const chapter of chapters) {
        const idStr = String(chapter.id);
        const scheduled = scheduleCost.has(idStr);
        if ((scheduled || recency.has(chapter.id)) && !unlocked.has(idStr)) {
            lockedChapterIds.push(chapter.id);
            chapterCosts[chapter.id] = scheduled ? scheduleCost.get(idStr)! : opts.unlockCost;
        }
    }
    return { lockedChapterIds, chapterCosts };
}

/** Public token-pack catalog: admin-configured (app_config) or the default. */
export async function getPublicTokenPacks(): Promise<TokenPack[]> {
    try {
        const { data } = await supabase.from('app_config').select('value').eq('key', 'pricing').maybeSingle();
        const packs = (data?.value as { tokenPacks?: TokenPack[] } | null)?.tokenPacks;
        if (Array.isArray(packs) && packs.length) return packs;
    } catch {
        // fall through to defaults
    }
    return DEFAULT_TOKEN_PACKS;
}

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
    acceptedTerms: boolean;
    loaded: boolean;
    busy: boolean;
    gatedCount: number;
    unlockCost: number;
    paymentsEnabled: boolean;
    purchasePolicy: PurchasePolicy;
    lockedChapterIds: number[];
    chapterCosts: Record<number, number>;
    paywall: { open: boolean; chapter?: PaywallChapter };
    premiumUpsell: { open: boolean; feature?: string };

    loadProfile: () => Promise<void>;
    loadConfig: () => Promise<void>;
    acceptTerms: () => Promise<void>;
    loadLocksForChapters: (chapters: LockChapter[]) => Promise<void>;
    openPaywall: (chapter?: PaywallChapter) => void;
    closePaywall: () => void;
    openPremiumUpsell: (feature?: string) => void;
    closePremiumUpsell: () => void;
    unlock: (chapterId: number) => Promise<UnlockStatus>;
}

export const useBillingStore = create<BillingStore>((set, get) => ({
    tokens: 0,
    isPremium: false,
    isAdmin: false,
    acceptedTerms: true,
    loaded: false,
    busy: false,
    gatedCount: DEFAULT_GATED_COUNT,
    unlockCost: DEFAULT_UNLOCK_COST,
    // Default OFF (soft launch + fail-safe): never show a paywall or Store
    // purchases until the server config confirms payments are enabled.
    paymentsEnabled: false,
    purchasePolicy: DEFAULT_PURCHASE_POLICY,
    lockedChapterIds: [],
    chapterCosts: {},
    paywall: { open: false },
    premiumUpsell: { open: false },

    loadProfile: async () => {
        get().loadConfig();
        // Scope every profile read to the current user id. An admin RLS policy
        // (profiles_admin_read) lets admins SELECT every row, so an unscoped
        // `.single()` returns multiple rows for admins and throws — which is why
        // admin accounts were silently denied the console. `.eq('id', uid)` keeps
        // the query to exactly one row for free and admin users alike.
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) {
            set({ loaded: true });
            return;
        }
        try {
            // Core columns only — these always exist. Keeping this query minimal
            // ensures admin/balance never break if a newer column (e.g.
            // accepted_terms_at) hasn't been migrated to the live DB yet.
            const { data, error } = await supabase
                .from('profiles')
                .select('tokens, is_premium, role')
                .eq('id', uid)
                .maybeSingle();
            if (error) throw error;
            const isAdmin = data?.role === 'admin';
            set({
                tokens: Number(data?.tokens ?? 0),
                isPremium: !!data?.is_premium || data?.role === 'premium',
                isAdmin,
                loaded: true,
            });
            // Keep the legacy localStorage admin flag (read by Browse) in sync so
            // there is one source of truth for admin gating.
            try {
                localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
            } catch {
                /* ignore storage errors */
            }
        } catch {
            // Transient profile error: don't drop admin — trust the cached flag so
            // the admin nav/console stays reachable for a known admin.
            let cachedAdmin = false;
            try {
                cachedAdmin = localStorage.getItem('isAdmin') === 'true';
            } catch {
                cachedAdmin = false;
            }
            set({ isAdmin: cachedAdmin, loaded: true });
        }

        // Legal acknowledgement is best-effort: the column may not exist until
        // the admin-console migration is applied. Never let it break the profile.
        try {
            const { data: terms, error } = await supabase
                .from('profiles')
                .select('accepted_terms_at')
                .eq('id', uid)
                .maybeSingle();
            if (!error) set({ acceptedTerms: !!terms?.accepted_terms_at });
        } catch {
            // column not present yet — leave acceptedTerms at its default (true)
        }
    },

    loadConfig: async () => {
        try {
            const { data } = await supabase.from('app_config').select('value').eq('key', 'pricing').maybeSingle();
            const value = data?.value as { gatedCount?: number; unlockCost?: number } | null;
            set({
                gatedCount: Number.isFinite(value?.gatedCount) ? Number(value?.gatedCount) : DEFAULT_GATED_COUNT,
                unlockCost: Number.isFinite(value?.unlockCost) ? Number(value?.unlockCost) : DEFAULT_UNLOCK_COST,
            });
        } catch {
            // keep defaults
        }
        // Channel-aware purchase policy + master payments switch are server-owned
        // (Gatekeeper, ADR-0008/0011).
        try {
            const res = await fetch('/api/saas/config');
            if (res.ok) {
                const json = await res.json();
                if (json?.purchasePolicy) set({ purchasePolicy: json.purchasePolicy as PurchasePolicy });
                set({ paymentsEnabled: !!json?.paymentsEnabled });
            }
        } catch {
            // keep the conservative defaults (payments off, conservative policy)
        }
    },

    acceptTerms: async () => {
        set({ acceptedTerms: true }); // optimistic
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (userData.user?.id) {
                await supabase
                    .from('profiles')
                    .update({ accepted_terms_at: new Date().toISOString() })
                    .eq('id', userData.user.id);
            }
        } catch {
            // The acknowledgement is recorded best-effort; the gate won't nag again this session.
        }
    },

    loadLocksForChapters: async (chapters) => {
        const { isPremium, isAdmin, gatedCount, unlockCost, paymentsEnabled } = get();
        if (!paymentsEnabled || isPremium || isAdmin || chapters.length === 0) {
            set({ lockedChapterIds: [], chapterCosts: {} });
            return;
        }
        try {
            const idStrings = chapters.map((chapter) => String(chapter.id));
            const nowIso = new Date().toISOString();
            const [{ data: schedules }, { data: unlocks }] = await Promise.all([
                supabase
                    .from('chapter_schedules')
                    .select('chapter_id, token_cost, release_date')
                    .in('chapter_id', idStrings)
                    .gt('release_date', nowIso),
                supabase.from('chapter_unlocks').select('chapter_id').in('chapter_id', idStrings),
            ]);

            const { lockedChapterIds, chapterCosts } = computeLockedChapters(
                chapters,
                schedules ?? [],
                (unlocks ?? []).map((row) => row.chapter_id),
                { isPremium, isAdmin, gatedCount, unlockCost, paymentsEnabled },
            );
            set({ lockedChapterIds, chapterCosts });
        } catch {
            set({ lockedChapterIds: [], chapterCosts: {} });
        }
    },

    openPaywall: (chapter) => set({ paywall: { open: true, chapter } }),
    closePaywall: () => set({ paywall: { open: false, chapter: undefined } }),

    openPremiumUpsell: (feature) => set({ premiumUpsell: { open: true, feature } }),
    closePremiumUpsell: () => set({ premiumUpsell: { open: false, feature: undefined } }),

    unlock: async (chapterId) => {
        set({ busy: true });
        try {
            const { data, error } = await supabase.rpc('unlock_chapter', { p_chapter_id: String(chapterId) });
            if (error) throw error;
            const status = (data ?? 'error') as UnlockStatus;
            if (status === 'unlocked') track('unlock_chapter');
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

/**
 * Gate a premium-only action. Returns true if the user is entitled (premium or
 * admin); otherwise opens the upsell dialog and returns false. Call from an
 * event handler and bail when it returns false.
 */
export function ensurePremium(feature: string): boolean {
    const { isPremium, isAdmin, openPremiumUpsell } = useBillingStore.getState();
    if (isPremium || isAdmin) return true;
    openPremiumUpsell(feature);
    return false;
}

/** Claim the once-a-month Premium Coin bonus. Returns the RPC status string. */
export async function claimPremiumBonus(): Promise<string> {
    const { data, error } = await supabase.rpc('claim_premium_bonus');
    if (error) return 'error';
    if (data === 'claimed') await useBillingStore.getState().loadProfile();
    return (data ?? 'error') as string;
}

/** Build a Stripe (or other) web-checkout URL via the Gatekeeper, or null. */
export async function startCheckout(productId: string): Promise<{ url?: string; error?: string }> {
    try {
        track('checkout_start', { product: productId });
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

/**
 * Native in-app purchase via RevenueCat (iOS/Android). The RevenueCat webhook
 * (`/api/webhooks/revenuecat`) is the single crediting authority, so on success
 * we just refresh the profile. The plugin is imported lazily so it never enters
 * the web bundle's critical path (ADR-0008, perf). `productId` is the catalog
 * product id; it must match a RevenueCat product configured in an offering.
 */
export async function purchaseNative(productId: string): Promise<{ ok: boolean; error?: string }> {
    try {
        track('iap_start', { product: productId });
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        const offerings = await Purchases.getOfferings();
        const offers = Object.values(offerings.all ?? {});
        const pkg = offers
            .flatMap((offering) => offering.availablePackages ?? [])
            .find((p) => p.product.identifier === productId);
        if (!pkg) return { ok: false, error: 'product_unavailable' };

        await Purchases.purchasePackage({ aPackage: pkg });
        await useBillingStore.getState().loadProfile();
        return { ok: true };
    } catch (e) {
        const err = e as { userCancelled?: boolean };
        if (err?.userCancelled) return { ok: false, error: 'cancelled' };
        return { ok: false, error: 'purchase_failed' };
    }
}

/**
 * "Save on web" path for native apps in regions that permit external purchase
 * links (ADR-0008). Opens the discounted Stripe checkout in the device's
 * default browser (`_system`) — required for store compliance vs an in-app
 * webview. Caller must first confirm the region allows it via `PaymentRouter`.
 */
export async function openWebCheckout(productId: string): Promise<{ ok: boolean; error?: string }> {
    const { url, error } = await startCheckout(productId);
    if (!url) return { ok: false, error: error ?? 'no_url' };
    track('external_web_checkout', { product: productId });
    window.open(url, '_system');
    return { ok: true };
}

/** Open the web Store in the device's default browser (native "save on web"). */
export function openWebStore(): void {
    track('external_web_store');
    window.open('/store', '_system');
}

/**
 * Open the Stripe Billing Customer Portal so a web subscriber can cancel, update
 * their card, or view invoices. Returns an error code instead of a URL when the
 * user has no Stripe customer (e.g. never subscribed on web) or it's unconfigured.
 */
export async function openBillingPortal(): Promise<{ ok: boolean; error?: string }> {
    try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch('/api/saas/billing-portal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        if (!res.ok) {
            if (res.status === 400) return { ok: false, error: 'no_customer' };
            return { ok: false, error: res.status === 501 ? 'not_configured' : `status_${res.status}` };
        }
        const json = await res.json();
        if (json.url) {
            window.location.href = json.url;
            return { ok: true };
        }
        return { ok: false, error: 'no_url' };
    } catch {
        return { ok: false, error: 'network' };
    }
}
