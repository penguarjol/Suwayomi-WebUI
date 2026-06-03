/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';

export interface Campaign {
    id: string;
    title: string;
    description: string | null;
    reward_type: 'coins' | 'premium_days';
    reward_amount: number;
    cooldown_hours: number;
    active: boolean;
    created_at: string;
}

export type ClaimStatus = 'claimed' | 'already_claimed' | 'too_soon' | 'inactive' | 'unauthenticated' | 'error';

export interface ClaimResult {
    status: ClaimStatus;
    error?: string;
}

export async function getActiveCampaigns(): Promise<Campaign[]> {
    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, description, reward_type, reward_amount, cooldown_hours, active, created_at')
        .eq('active', true)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Campaign[];
}

export async function getClaimedCampaignIds(): Promise<Set<string>> {
    const { data } = await supabase.from('campaign_participations').select('campaign_id');
    return new Set((data ?? []).map((row) => String(row.campaign_id)));
}

export async function claimCampaign(id: string): Promise<ClaimResult> {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return { status: 'unauthenticated' };

    let { data, error } = await supabase.rpc('claim_campaign', { p_campaign_id: id });
    if (error?.code === 'PGRST202') {
        ({ data, error } = await supabase.rpc('claim_campaign', { campaign_id: id }));
    }
    if (error) return { status: 'error', error: getErrorMessage(error) };
    return { status: (data ?? 'error') as ClaimStatus };
}

// --- Admin ---
export async function listAllCampaigns(): Promise<Campaign[]> {
    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, description, reward_type, reward_amount, cooldown_hours, active, created_at')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Campaign[];
}

export async function createCampaign(input: {
    title: string;
    description: string;
    reward_type: 'coins' | 'premium_days';
    reward_amount: number;
    cooldown_hours: number;
}): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('campaigns').insert({ ...input, created_by: userData.user?.id ?? null });
    if (error) throw error;
}

export async function setCampaignActive(id: string, active: boolean): Promise<void> {
    const { error } = await supabase.from('campaigns').update({ active }).eq('id', id);
    if (error) throw error;
}

export async function deleteCampaign(id: string): Promise<void> {
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) throw error;
}
