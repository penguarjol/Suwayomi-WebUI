/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';

/**
 * DMCA / copyright takedown queue. Notices are submitted via the
 * submit_dmca_report RPC (status fixed server-side); admins resolve them via
 * resolve_dmca_report, which unpublishes infringing Originals and strikes the
 * creator (suspending at 3). See docs/LEGAL.md.
 */

export type DmcaStatus = 'pending' | 'actioned' | 'rejected' | 'counter';
export type DmcaTargetType = 'original_work' | 'metadata' | 'other';
export type DmcaAction = 'takedown' | 'reject' | 'counter';

export interface DmcaReport {
    id: string;
    reporter_email: string | null;
    target_type: DmcaTargetType;
    target_work_id: string | null;
    subject: string;
    description: string;
    status: DmcaStatus;
    resolution_note: string | null;
    created_at: string;
}

export async function submitDmcaReport(input: {
    targetType: DmcaTargetType;
    targetWorkId?: string | null;
    subject: string;
    description: string;
    reporterEmail: string;
}): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase.rpc('submit_dmca_report', {
        p_target_type: input.targetType,
        p_target_work_id: input.targetWorkId ?? null,
        p_subject: input.subject,
        p_description: input.description,
        p_reporter_email: input.reporterEmail,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function listDmcaReports(status?: DmcaStatus): Promise<DmcaReport[]> {
    try {
        let query = supabase.from('dmca_reports').select('*').order('created_at', { ascending: false }).limit(200);
        if (status) query = query.eq('status', status);
        const { data } = await query;
        return (data ?? []) as DmcaReport[];
    } catch {
        return [];
    }
}

export async function resolveDmcaReport(id: string, action: DmcaAction, note: string): Promise<string> {
    const { data, error } = await supabase.rpc('resolve_dmca_report', { p_id: id, p_action: action, p_note: note });
    if (error) return 'error';
    return (data ?? 'error') as string;
}
