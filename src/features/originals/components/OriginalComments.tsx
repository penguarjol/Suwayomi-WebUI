/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import PushPinIcon from '@mui/icons-material/PushPin';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '@/lib/SupabaseClient.ts';
import { hasProfanity } from '@/features/social/Social.ts';
import { StickerText } from '@/features/stickers/components/StickerText.tsx';
import { UserAvatar } from '@/features/profile/components/UserAvatar.tsx';
import { useBillingStore } from '@/features/billing/Billing.ts';
import {
    OriginalComment,
    deleteComment,
    getMyLikedCommentIds,
    listChapterComments,
    pinComment,
    postComment,
    toggleCommentLike,
} from '@/features/originals/OriginalComments.ts';
import { makeToast } from '@/base/utils/Toast.ts';

const CommentBody = ({
    comment,
    creatorId,
    currentUserId,
    canModerate,
    liked,
    onLike,
    onReply,
    onPin,
    onDelete,
    nested,
}: {
    comment: OriginalComment;
    creatorId: string;
    currentUserId: string | null;
    canModerate: boolean;
    liked: boolean;
    onLike: () => void;
    onReply?: () => void;
    onPin: () => void;
    onDelete: () => void;
    nested?: boolean;
}) => {
    const isCreator = comment.user_id === creatorId;
    return (
        <Stack sx={{ flexDirection: 'row', gap: 1.5, ml: nested ? 5 : 0 }}>
            <UserAvatar userId={comment.user_id} name={comment.authorName} size={32} />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 0.75 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {comment.authorName}
                    </Typography>
                    {isCreator && (
                        <Chip size="small" color="primary" label="Creator" sx={{ height: 18, fontSize: 11 }} />
                    )}
                    {comment.pinned && <PushPinIcon sx={{ fontSize: 14, opacity: 0.7 }} />}
                    <Typography variant="caption" color="text.secondary">
                        {new Date(comment.created_at).toLocaleDateString()}
                    </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }} component="div">
                    <StickerText text={comment.content} />
                </Typography>
                <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                    <IconButton size="small" onClick={onLike} disabled={!currentUserId}>
                        {liked ? (
                            <FavoriteIcon sx={{ fontSize: 16 }} color="primary" />
                        ) : (
                            <FavoriteBorderIcon sx={{ fontSize: 16 }} />
                        )}
                    </IconButton>
                    <Typography variant="caption" color="text.secondary">
                        {comment.likes_count}
                    </Typography>
                    {onReply && (
                        <Button size="small" onClick={onReply} sx={{ textTransform: 'none', minWidth: 0 }}>
                            Reply
                        </Button>
                    )}
                    {canModerate && (
                        <IconButton size="small" onClick={onPin} title={comment.pinned ? 'Unpin' : 'Pin'}>
                            <PushPinIcon sx={{ fontSize: 16 }} color={comment.pinned ? 'primary' : 'inherit'} />
                        </IconButton>
                    )}
                    {(comment.user_id === currentUserId || canModerate) && (
                        <IconButton size="small" onClick={onDelete} title="Delete">
                            <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    )}
                </Stack>
            </Box>
        </Stack>
    );
};

export const OriginalComments = ({ chapterId, creatorId }: { chapterId: string; creatorId: string }) => {
    const isAdmin = useBillingStore((s) => s.isAdmin);
    const [comments, setComments] = useState<OriginalComment[]>([]);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [busy, setBusy] = useState(false);

    const canModerate = (!!currentUserId && currentUserId === creatorId) || isAdmin;

    const load = async () => {
        const list = await listChapterComments(chapterId);
        setComments(list);
        setLikedIds(await getMyLikedCommentIds(list.map((c) => c.id)));
    };

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
        load();
    }, [chapterId]);

    const { topLevel, repliesByParent } = useMemo(() => {
        const top = comments.filter((c) => !c.parent_comment_id);
        const byParent = new Map<string, OriginalComment[]>();
        comments
            .filter((c) => c.parent_comment_id)
            .forEach((c) => {
                const arr = byParent.get(c.parent_comment_id!) ?? [];
                arr.push(c);
                byParent.set(c.parent_comment_id!, arr);
            });
        return { topLevel: top, repliesByParent: byParent };
    }, [comments]);

    const submit = async (content: string, parentId: string | null) => {
        if (!content.trim()) return;
        if (hasProfanity(content)) {
            makeToast('Please keep comments respectful.', 'warning');
            return;
        }
        setBusy(true);
        try {
            const ok = await postComment(chapterId, content, parentId);
            if (ok) {
                if (parentId) {
                    setReplyText('');
                    setReplyTo(null);
                } else {
                    setText('');
                }
                await load();
            } else {
                makeToast('Sign in to comment.', 'info');
            }
        } finally {
            setBusy(false);
        }
    };

    const like = async (id: string) => {
        const nowLiked = await toggleCommentLike(id);
        setLikedIds((prev) => {
            const next = new Set(prev);
            if (nowLiked) next.add(id);
            else next.delete(id);
            return next;
        });
        setComments((prev) =>
            prev.map((c) => (c.id === id ? { ...c, likes_count: c.likes_count + (nowLiked ? 1 : -1) } : c)),
        );
    };

    const pin = async (id: string, pinned: boolean) => {
        const result = await pinComment(id, pinned);
        if (result === 'ok') load();
        else makeToast('Could not update pin.', 'error');
    };

    const del = async (id: string) => {
        await deleteComment(id);
        load();
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', px: { xs: 2, sm: 0 }, mt: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                {`Comments${comments.length ? ` (${comments.length})` : ''}`}
            </Typography>

            <Stack sx={{ flexDirection: 'row', gap: 1, mb: 3 }}>
                <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={1}
                    placeholder="Add a comment…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <Button
                    variant="contained"
                    disabled={busy || !text.trim()}
                    onClick={() => submit(text, null)}
                    sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
                >
                    Post
                </Button>
            </Stack>

            <Stack sx={{ gap: 2.5 }}>
                {topLevel.map((comment) => (
                    <Stack key={comment.id} sx={{ gap: 1.5 }}>
                        <CommentBody
                            comment={comment}
                            creatorId={creatorId}
                            currentUserId={currentUserId}
                            canModerate={canModerate}
                            liked={likedIds.has(comment.id)}
                            onLike={() => like(comment.id)}
                            onReply={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                            onPin={() => pin(comment.id, !comment.pinned)}
                            onDelete={() => del(comment.id)}
                        />
                        {(repliesByParent.get(comment.id) ?? []).map((reply) => (
                            <CommentBody
                                key={reply.id}
                                comment={reply}
                                creatorId={creatorId}
                                currentUserId={currentUserId}
                                canModerate={canModerate}
                                liked={likedIds.has(reply.id)}
                                onLike={() => like(reply.id)}
                                onPin={() => pin(reply.id, !reply.pinned)}
                                onDelete={() => del(reply.id)}
                                nested
                            />
                        ))}
                        {replyTo === comment.id && (
                            <Stack sx={{ flexDirection: 'row', gap: 1, ml: 5 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder={`Reply to ${comment.authorName}…`}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                />
                                <Button
                                    size="small"
                                    variant="contained"
                                    disabled={busy || !replyText.trim()}
                                    onClick={() => submit(replyText, comment.id)}
                                    sx={{ textTransform: 'none', flexShrink: 0 }}
                                >
                                    Reply
                                </Button>
                            </Stack>
                        )}
                    </Stack>
                ))}
                {!comments.length && (
                    <Typography variant="body2" color="text.secondary">
                        No comments yet — start the discussion.
                    </Typography>
                )}
            </Stack>
        </Box>
    );
};
