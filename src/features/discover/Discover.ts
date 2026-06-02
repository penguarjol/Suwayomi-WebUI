/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';

export type TrendingWindow = 'week' | 'month' | 'all';

function sinceFor(window: TrendingWindow): string | null {
    if (window === 'all') return null;
    const days = window === 'week' ? 7 : 30;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
}

async function rpcIds(fn: string, args: Record<string, unknown>): Promise<number[]> {
    try {
        const { data, error } = await supabase.rpc(fn, args);
        if (error) throw error;
        return (data ?? []).map((row: { manga_id: number }) => Number(row.manga_id));
    } catch {
        return [];
    }
}

export const getTrendingWindowIds = (window: TrendingWindow, limit = 12): Promise<number[]> =>
    rpcIds('trending_manga_window', { p_limit: limit, p_since: sinceFor(window) });

export const getRisingIds = (limit = 12): Promise<number[]> => rpcIds('rising_manga', { p_limit: limit });

export const getPopularReadingIds = (limit = 12): Promise<number[]> => rpcIds('popular_reading', { p_limit: limit });
