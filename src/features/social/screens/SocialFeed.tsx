/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { ChatRoom } from '@/features/social/components/ChatRoom.tsx';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { useBillingStore } from '@/features/billing/Billing.ts';
import {
    Post,
    createPost,
    getMyLikedPostIds,
    getPosts,
    hasProfanity,
    censorProfanity,
    hidePost,
    likePost,
    unlikePost,
} from '@/features/social/Social.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';

const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
};

export function SocialFeed() {
    useAppTitle('Community');
    const isAdmin = useBillingStore((state) => state.isAdmin);

    const [posts, setPosts] = useState<Post[]>([]);
    const [liked, setLiked] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [busy, setBusy] = useState(false);
    const [tab, setTab] = useState(0);

    const refresh = async () => {
        try {
            const list = await getPosts();
            setPosts(list);
            setLiked(await getMyLikedPostIds(list.map((p) => p.id)));
        } catch (e) {
            makeToast('Could not load the feed', 'error', getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const submit = async () => {
        const text = content.trim();
        if (!text) return;
        if (hasProfanity(text) || hasProfanity(title)) {
            makeToast('Please keep posts respectful and profanity-free.', 'warning');
            return;
        }
        setBusy(true);
        try {
            await createPost(text, title.trim() || undefined);
            setContent('');
            setTitle('');
            await refresh();
        } catch (e) {
            makeToast('Could not post', 'error', getErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    const toggleLike = async (post: Post) => {
        const isLiked = liked.has(post.id);
        setLiked((prev) => {
            const next = new Set(prev);
            if (isLiked) next.delete(post.id);
            else next.add(post.id);
            return next;
        });
        setPosts((prev) =>
            prev.map((p) => (p.id === post.id ? { ...p, like_count: p.like_count + (isLiked ? -1 : 1) } : p)),
        );
        try {
            if (isLiked) await unlikePost(post.id);
            else await likePost(post.id);
        } catch {
            refresh();
        }
    };

    const moderate = async (post: Post) => {
        try {
            await hidePost(post.id);
            setPosts((prev) => prev.filter((p) => p.id !== post.id));
        } catch (e) {
            makeToast('Could not hide post', 'error', getErrorMessage(e));
        }
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 680, mx: 'auto' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
                Community
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Share what you&apos;re reading and recommend titles to others. Be kind — posts are public.
            </Typography>

            <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
                <Tab label="Feed" sx={{ textTransform: 'none' }} />
                <Tab label="Chat" sx={{ textTransform: 'none' }} />
            </Tabs>

            {tab === 1 && <ChatRoom />}

            {tab === 0 && (
                <Box>
                    <Stack
                        sx={{
                            gap: 1.5,
                            p: 2,
                            mb: 3,
                            borderRadius: 3,
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.03)',
                        }}
                    >
                        <TextField
                            size="small"
                            label="Recommending a title? (optional)"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <TextField
                            multiline
                            minRows={2}
                            placeholder="What are you reading? Share a recommendation…"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                        <Box sx={{ textAlign: 'right' }}>
                            <Button
                                variant="contained"
                                disabled={busy || !content.trim()}
                                onClick={submit}
                                sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                            >
                                Post
                            </Button>
                        </Box>
                    </Stack>

                    {loading ? (
                        <LoadingPlaceholder />
                    ) : (
                        <Stack sx={{ gap: 1.5 }}>
                            {posts.map((post) => (
                                <Stack
                                    key={post.id}
                                    sx={{ p: 2, gap: 1, borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)' }}
                                >
                                    <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                                        <Avatar sx={{ width: 28, height: 28, fontSize: 14 }}>
                                            {(post.author_name ?? '?')[0]?.toUpperCase()}
                                        </Avatar>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                            {post.author_name ?? 'reader'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            · {timeAgo(post.created_at)}
                                        </Typography>
                                        {isAdmin && (
                                            <IconButton
                                                size="small"
                                                sx={{ ml: 'auto' }}
                                                aria-label="hide post"
                                                onClick={() => moderate(post)}
                                            >
                                                <VisibilityOffIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </Stack>
                                    {post.manga_title && (
                                        <Chip
                                            icon={<MenuBookIcon />}
                                            label={post.manga_title}
                                            size="small"
                                            sx={{ alignSelf: 'flex-start' }}
                                        />
                                    )}
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {censorProfanity(post.content)}
                                    </Typography>
                                    <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 0.5 }}>
                                        <IconButton size="small" aria-label="like" onClick={() => toggleLike(post)}>
                                            {liked.has(post.id) ? (
                                                <FavoriteIcon fontSize="small" color="primary" />
                                            ) : (
                                                <FavoriteBorderIcon fontSize="small" />
                                            )}
                                        </IconButton>
                                        <Typography variant="caption">{post.like_count}</Typography>
                                    </Stack>
                                </Stack>
                            ))}
                            {!posts.length && (
                                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                    No posts yet. Be the first to recommend something!
                                </Typography>
                            )}
                        </Stack>
                    )}
                </Box>
            )}
        </Box>
    );
}
