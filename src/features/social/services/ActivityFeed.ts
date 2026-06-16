/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';

/**
 * Personalized activity feed: recent published works/chapters from the creators
 * the signed-in user follows. Backed by the `activity_feed` RPC, which scopes
 * strictly to the caller's own follow graph (see the migration).
 */

export type ActivityKind = 'work_published' | 'chapter_published';

export interface ActivityItem {
    kind: ActivityKind;
    creator_id: string;
    creator_name: string;
    work_id: string;
    work_title: string;
    cover_path: string | null;
    chapter_id: string | null;
    chapter_title: string | null;
    event_at: string;
}

export async function getActivityFeed(limit = 30): Promise<ActivityItem[]> {
    try {
        const { data, error } = await supabase.rpc('activity_feed', { p_limit: limit });
        if (error) throw error;
        return (data ?? []) as ActivityItem[];
    } catch {
        return [];
    }
}
