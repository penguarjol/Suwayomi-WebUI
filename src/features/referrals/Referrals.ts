/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';

const REF_KEY = 'nexus-ref';

/** Capture a ?ref=CODE from the current URL (called pre-auth, on app load). */
export function captureReferralFromUrl(): void {
    try {
        const code = new URLSearchParams(window.location.search).get('ref');
        if (code) localStorage.setItem(REF_KEY, code);
    } catch {
        /* ignore */
    }
}

export async function getMyReferralCode(): Promise<string | null> {
    const { data, error } = await supabase.rpc('get_or_create_my_referral_code');
    if (error) return null;
    return (data ?? null) as string | null;
}

export interface ReferralStats {
    pending: number;
    rewarded: number;
}

export async function getMyReferralStats(): Promise<ReferralStats> {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return { pending: 0, rewarded: 0 };
    const { data } = await supabase.from('referrals').select('status').eq('referrer_id', uid);
    const rows = data ?? [];
    return {
        pending: rows.filter((r) => r.status === 'pending').length,
        rewarded: rows.filter((r) => r.status === 'rewarded').length,
    };
}

/**
 * If a referral code was captured before signup, redeem it (once) and then try
 * to reward the referrer (gated server-side on the invitee's first read).
 * Fire-and-forget on app start after auth.
 */
export async function processCapturedReferral(): Promise<void> {
    try {
        const code = localStorage.getItem(REF_KEY);
        if (code) {
            const { data: status } = await supabase.rpc('redeem_referral', { p_code: code });
            // Stop retrying once it's resolved (redeemed, already redeemed, self, invalid).
            if (status) localStorage.removeItem(REF_KEY);
        }
        await supabase.rpc('process_my_referral');
    } catch {
        /* best-effort */
    }
}

export function referralLink(code: string): string {
    return `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
}
