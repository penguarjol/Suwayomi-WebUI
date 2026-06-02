/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';

export type FeedbackType = 'bug' | 'feature' | 'other';

export interface FeedbackItem {
    id: string;
    user_id: string | null;
    type: FeedbackType;
    message: string;
    page: string | null;
    status: 'open' | 'planned' | 'done' | 'declined';
    created_at: string;
}

export async function submitFeedback(type: FeedbackType, message: string, page: string): Promise<void> {
    const { data } = await supabase.auth.getUser();
    const { error } = await supabase.from('feedback').insert({
        user_id: data.user?.id ?? null,
        type,
        message,
        page,
    });
    if (error) throw error;
}

export async function getFeedback(): Promise<FeedbackItem[]> {
    const { data, error } = await supabase
        .from('feedback')
        .select('id, user_id, type, message, page, status, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
    if (error) throw error;
    return (data ?? []) as FeedbackItem[];
}

export async function setFeedbackStatus(id: string, status: FeedbackItem['status']): Promise<void> {
    const { error } = await supabase.from('feedback').update({ status }).eq('id', id);
    if (error) throw error;
}
