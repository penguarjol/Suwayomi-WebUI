/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { supabase } from '@/lib/SupabaseClient.ts';

export interface ChatMessage {
    id: string;
    user_id: string;
    author_name: string | null;
    content: string;
    created_at: string;
}

export async function getRecentMessages(limit = 50): Promise<ChatMessage[]> {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('id, user_id, author_name, content, created_at')
        .eq('hidden', false)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return ((data ?? []) as ChatMessage[]).reverse(); // oldest first for display
}

export async function sendMessage(content: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const { user } = userData;
    if (!user) throw new Error('Not authenticated');
    const authorName = (user.email ?? 'reader').split('@')[0];
    const { error } = await supabase
        .from('chat_messages')
        .insert({ user_id: user.id, author_name: authorName, content });
    if (error) throw error;
}

export async function hideMessage(id: string): Promise<void> {
    await supabase.from('chat_messages').update({ hidden: true }).eq('id', id);
}

/** Subscribe to new chat messages via Supabase Realtime. Returns an unsubscribe fn. */
export function subscribeToChat(onMessage: (message: ChatMessage) => void): () => void {
    const channel = supabase
        .channel('community-chat')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
            onMessage(payload.new as ChatMessage);
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
