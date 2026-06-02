/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';

/**
 * Admin operations (ADR-0003). Writes are RLS-protected: only profiles with
 * role='admin' (or the service role) may mutate `global_sources` /
 * `chapter_schedules`. These power the global source allow-list the Gatekeeper
 * enforces, and the Fast Pass release schedule the paywall reads.
 */

export interface GlobalSource {
    source_id: string;
    name: string | null;
    enabled: boolean;
    hidden: boolean;
}

export interface ChapterSchedule {
    id: string;
    manga_id: string;
    chapter_id: string;
    release_date: string;
    token_cost: number;
}

export const Admin = {
    async getGlobalSources(): Promise<GlobalSource[]> {
        const { data, error } = await supabase.from('global_sources').select('source_id, name, enabled, hidden');
        if (error) throw error;
        return (data ?? []) as GlobalSource[];
    },

    async upsertGlobalSource(sourceId: string, name: string | null, enabled: boolean, hidden: boolean): Promise<void> {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase.from('global_sources').upsert(
            {
                source_id: sourceId,
                name,
                enabled,
                hidden,
                added_by: userData.user?.id ?? null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'source_id' },
        );
        if (error) throw error;
    },

    async getSchedules(): Promise<ChapterSchedule[]> {
        const { data, error } = await supabase
            .from('chapter_schedules')
            .select('id, manga_id, chapter_id, release_date, token_cost')
            .order('release_date', { ascending: false });
        if (error) throw error;
        return (data ?? []) as ChapterSchedule[];
    },

    async createSchedule(mangaId: string, chapterId: string, releaseDate: string, tokenCost: number): Promise<void> {
        const { error } = await supabase
            .from('chapter_schedules')
            .upsert(
                { manga_id: mangaId, chapter_id: chapterId, release_date: releaseDate, token_cost: tokenCost },
                { onConflict: 'manga_id,chapter_id' },
            );
        if (error) throw error;
    },

    async deleteSchedule(id: string): Promise<void> {
        const { error } = await supabase.from('chapter_schedules').delete().eq('id', id);
        if (error) throw error;
    },

    async grantTokens(email: string, amount: number): Promise<number> {
        const { data, error } = await supabase.rpc('admin_grant_tokens', { p_email: email, p_amount: amount });
        if (error) throw error;
        return Number(data);
    },

    async refund(email: string, amount: number, reason: string): Promise<number> {
        const { data, error } = await supabase.rpc('admin_refund', {
            p_email: email,
            p_amount: amount,
            p_reason: reason || 'refund',
        });
        if (error) throw error;
        return Number(data);
    },

    /** Refund the actual card charge via Stripe (Gatekeeper, admin-gated). */
    async stripeRefund(paymentIntent: string): Promise<{ ok: boolean; error?: string }> {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch('/api/saas/admin/stripe-refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ paymentIntent }),
        });
        if (res.ok) return { ok: true };
        return { ok: false, error: res.status === 501 ? 'not_configured' : `status_${res.status}` };
    },

    async getTopManga(limit = 20): Promise<{ manga_id: number; readers: number; chapters_read: number }[]> {
        const { data, error } = await supabase.rpc('admin_top_manga', { p_limit: limit });
        if (error) throw error;
        return (data ?? []).map((row: { manga_id: number; readers: number; chapters_read: number }) => ({
            manga_id: Number(row.manga_id),
            readers: Number(row.readers),
            chapters_read: Number(row.chapters_read),
        }));
    },

    async getRecentLedger(
        limit = 50,
    ): Promise<{ user_id: string; delta: number; reason: string; created_at: string }[]> {
        const { data, error } = await supabase
            .from('token_ledger')
            .select('user_id, delta, reason, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return (data ?? []) as { user_id: string; delta: number; reason: string; created_at: string }[];
    },

    async getPricing(): Promise<{ tokenPacks?: unknown[]; plans?: unknown[] } | null> {
        const { data, error } = await supabase.from('app_config').select('value').eq('key', 'pricing').maybeSingle();
        if (error) throw error;
        return (data?.value as { tokenPacks?: unknown[]; plans?: unknown[] }) ?? null;
    },

    async setPricing(value: { tokenPacks: unknown[]; plans: unknown[] }): Promise<void> {
        const { error } = await supabase
            .from('app_config')
            .upsert({ key: 'pricing', value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) throw error;
    },
};
