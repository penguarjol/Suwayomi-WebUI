/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import SendIcon from '@mui/icons-material/Send';
import { ChatMessage, getRecentMessages, sendMessage, subscribeToChat } from '@/features/social/Chat.ts';
import { censorProfanity, hasProfanity } from '@/features/social/Social.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';

export const ChatRoom = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const endRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let active = true;
        getRecentMessages()
            .then((list) => {
                if (active) setMessages(list);
            })
            .catch(() => {})
            .finally(() => {
                if (active) setLoading(false);
            });

        const unsubscribe = subscribeToChat((message) => {
            setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
        });

        return () => {
            active = false;
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const send = async () => {
        const text = draft.trim();
        if (!text) return;
        if (hasProfanity(text)) {
            makeToast('Please keep chat respectful.', 'warning');
            return;
        }
        setSending(true);
        try {
            await sendMessage(text);
            setDraft('');
            // Realtime echoes our own insert back, so we don't append locally.
        } catch (e) {
            makeToast('Could not send message', 'error', getErrorMessage(e));
        } finally {
            setSending(false);
        }
    };

    if (loading) return <LoadingPlaceholder />;

    return (
        <Stack sx={{ height: 'calc(100vh - 220px)', minHeight: 360 }}>
            <Stack sx={{ flexGrow: 1, overflowY: 'auto', gap: 1, p: 1 }}>
                {messages.map((message) => (
                    <Box key={message.id}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {message.author_name ?? 'reader'}
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {censorProfanity(message.content)}
                        </Typography>
                    </Box>
                ))}
                {!messages.length && (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        Say hi — this is the community chat.
                    </Typography>
                )}
                <div ref={endRef} />
            </Stack>
            <Stack sx={{ flexDirection: 'row', gap: 1, pt: 1, alignItems: 'flex-end' }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Message the community…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            send();
                        }
                    }}
                />
                <IconButton color="primary" aria-label="send" disabled={sending || !draft.trim()} onClick={send}>
                    <SendIcon />
                </IconButton>
            </Stack>
        </Stack>
    );
};
