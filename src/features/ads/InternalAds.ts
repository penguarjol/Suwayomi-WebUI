/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';

/**
 * First-party internal ad server: house promos + direct-sold sponsorships served
 * from our own inventory (no network cut). A network (AdSense) is only a fallback
 * for unsold slots. Serving is the weighted `pick_ad` RPC; counters via
 * `record_ad_event`. Campaign management is admin-only (RLS).
 */

export type AdPlacement = 'reader' | 'home' | 'library' | 'any';

export interface ServedAd {
    id: string;
    title: string;
    body: string | null;
    image_url: string | null;
    cta_url: string;
    cta_label: string;
    advertiser: string | null;
    kind: 'house' | 'sponsor';
}

export interface AdCampaign extends ServedAd {
    placement: AdPlacement;
    weight: number;
    active: boolean;
    starts_at: string | null;
    ends_at: string | null;
    impressions: number;
    clicks: number;
}

export async function pickAd(placement: AdPlacement): Promise<ServedAd | null> {
    try {
        const { data, error } = await supabase.rpc('pick_ad', { p_placement: placement });
        if (error) return null;
        const row = Array.isArray(data) ? data[0] : data;
        return (row as ServedAd) ?? null;
    } catch {
        return null;
    }
}

export async function recordAdEvent(id: string, kind: 'impression' | 'click'): Promise<void> {
    try {
        await supabase.rpc('record_ad_event', { p_id: id, p_kind: kind });
    } catch {
        /* best-effort metrics */
    }
}

// --- Admin management ---
export async function listAdCampaigns(): Promise<AdCampaign[]> {
    const { data } = await supabase.from('ad_campaigns').select('*').order('created_at', { ascending: false });
    return (data ?? []) as AdCampaign[];
}

export async function createAdCampaign(input: {
    title: string;
    body?: string;
    image_url?: string;
    cta_url: string;
    cta_label?: string;
    placement: AdPlacement;
    kind: 'house' | 'sponsor';
    advertiser?: string;
    weight: number;
}): Promise<boolean> {
    const { error } = await supabase.from('ad_campaigns').insert(input);
    return !error;
}

export async function setAdCampaignActive(id: string, active: boolean): Promise<void> {
    await supabase.from('ad_campaigns').update({ active }).eq('id', id);
}

export async function deleteAdCampaign(id: string): Promise<void> {
    await supabase.from('ad_campaigns').delete().eq('id', id);
}
