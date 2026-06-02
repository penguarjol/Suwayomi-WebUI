/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import {
    Thread,
    ThreadReply,
    createReply,
    getMyThreadLikes,
    getThread,
    likeThread,
    unlikeThread,
} from '@/features/social/Forum.ts';
import { censorProfanity, hasProfanity } from '@/features/social/Social.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { makeToast } from '@/base/utils/Toast.ts';

export function ThreadDetail() {
    const { id = '' } = useParams<{ id: string }>();
    const [thread, setThread] = useState<Thread | null>(null);
    const [replies, setReplies] = useState<ThreadReply[]>([]);
    const [liked, setLiked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);

    useAppTitle(thread?.title ?? 'Thread');

    const refresh = async () => {
        const [{ thread: t, replies: r }, likes] = await Promise.all([getThread(id), getMyThreadLikes()]);
        setThread(t);
        setReplies(r);
        setLiked(likes.has(id));
        setLoading(false);
    };

    useEffect(() => {
        refresh();
    }, [id]);

    const toggleLike = async () => {
        setLiked((prev) => !prev);
        setThread((prev) => (prev ? { ...prev, like_count: prev.like_count + (liked ? -1 : 1) } : prev));
        try {
            if (liked) await unlikeThread(id);
            else await likeThread(id);
        } catch {
            refresh();
        }
    };

    const submitReply = async () => {
        const text = draft.trim();
        if (!text) return;
        if (hasProfanity(text)) {
            makeToast('Please keep it respectful.', 'warning');
            return;
        }
        setBusy(true);
        try {
            await createReply(id, text);
            setDraft('');
            refresh();
        } catch {
            makeToast('Could not post reply', 'error');
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <LoadingPlaceholder />;
    if (!thread) return <EmptyViewAbsoluteCentered message="Thread not found" />;

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 760, mx: 'auto' }}>
            <Stack sx={{ gap: 1, p: 2, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', mb: 3 }}>
                <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {thread.manga_title && <Chip size="small" variant="outlined" label={thread.manga_title} />}
                    <Typography variant="caption" color="text.secondary">
                        {thread.author_name ?? 'reader'}
                    </Typography>
                </Stack>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {thread.title}
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {censorProfanity(thread.content)}
                </Typography>
                <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 0.5 }}>
                    <IconButton size="small" aria-label="like" onClick={toggleLike}>
                        {liked ? (
                            <FavoriteIcon fontSize="small" color="primary" />
                        ) : (
                            <FavoriteBorderIcon fontSize="small" />
                        )}
                    </IconButton>
                    <Typography variant="caption">{thread.like_count}</Typography>
                </Stack>
            </Stack>

            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </Typography>

            {!thread.locked && (
                <Stack sx={{ flexDirection: 'row', gap: 1, mb: 3, alignItems: 'flex-end' }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Add a reply…"
                        multiline
                        maxRows={4}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                    />
                    <Button
                        variant="contained"
                        disabled={busy || !draft.trim()}
                        onClick={submitReply}
                        sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                    >
                        Reply
                    </Button>
                </Stack>
            )}

            <Stack sx={{ gap: 2 }}>
                {replies.map((reply) => (
                    <Stack key={reply.id} sx={{ flexDirection: 'row', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                            {(reply.author_name ?? '?')[0]?.toUpperCase()}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                {reply.author_name ?? 'reader'}
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {censorProfanity(reply.content)}
                            </Typography>
                        </Box>
                    </Stack>
                ))}
            </Stack>
        </Box>
    );
}
