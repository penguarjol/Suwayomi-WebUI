/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import AddIcon from '@mui/icons-material/Add';
import ForumIcon from '@mui/icons-material/Forum';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { ChatRoom } from '@/features/social/components/ChatRoom.tsx';
import { ForumCategory, Thread, createThread, getCategories, getThreads } from '@/features/social/Forum.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';

const timeAgo = (iso: string): string => {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
};

const ThreadCard = ({ thread, categoryName }: { thread: Thread; categoryName?: string }) => (
    <Stack
        component={Link}
        to={AppRoutes.thread.path(thread.id)}
        sx={{
            p: 2,
            gap: 0.75,
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            textDecoration: 'none',
            color: 'inherit',
        }}
    >
        <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {thread.pinned && <Chip size="small" color="primary" label="Pinned" sx={{ fontWeight: 700 }} />}
            {categoryName && <Chip size="small" variant="outlined" label={categoryName} />}
            <Typography variant="caption" color="text.secondary">
                {thread.author_name ?? 'reader'} · {timeAgo(thread.last_activity_at)}
            </Typography>
        </Stack>
        <Typography sx={{ fontWeight: 800 }}>{thread.title}</Typography>
        <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
            {thread.content}
        </Typography>
        <Stack sx={{ flexDirection: 'row', gap: 2, alignItems: 'center', mt: 0.5 }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 0.5 }}>
                <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">{thread.reply_count}</Typography>
            </Stack>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 0.5 }}>
                <FavoriteIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">{thread.like_count}</Typography>
            </Stack>
        </Stack>
    </Stack>
);

const Forum = () => {
    const [categories, setCategories] = useState<ForumCategory[]>([]);
    const [threads, setThreads] = useState<Thread[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [composerOpen, setComposerOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [mangaTitle, setMangaTitle] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [busy, setBusy] = useState(false);

    const categoryName = useMemo(() => {
        const map = new Map(categories.map((c) => [c.id, c.name]));
        return (id: string | null) => (id ? map.get(id) : undefined);
    }, [categories]);

    const loadThreads = async (catId: string | null) => {
        setThreads(await getThreads(catId));
    };

    useEffect(() => {
        Promise.all([getCategories(), getThreads(null)])
            .then(([cats, th]) => {
                setCategories(cats);
                setThreads(th);
                if (cats.length) setCategoryId(cats[0].id);
            })
            .finally(() => setLoading(false));
    }, []);

    const selectCategory = (catId: string | null) => {
        setSelected(catId);
        loadThreads(catId);
    };

    const submit = async () => {
        if (!title.trim() || !content.trim() || !categoryId) return;
        setBusy(true);
        try {
            await createThread({
                categoryId,
                title: title.trim(),
                content: content.trim(),
                mangaTitle: mangaTitle.trim(),
            });
            setComposerOpen(false);
            setTitle('');
            setContent('');
            setMangaTitle('');
            loadThreads(selected);
        } catch (e) {
            makeToast(
                getErrorMessage(e) === 'profanity' ? 'Please keep it respectful.' : 'Could not post thread',
                'error',
            );
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <LoadingPlaceholder />;

    return (
        <Box>
            <Stack sx={{ flexDirection: 'row', gap: 1, overflowX: 'auto', pb: 1, mb: 2 }}>
                <Chip
                    label="All"
                    color={selected === null ? 'primary' : 'default'}
                    onClick={() => selectCategory(null)}
                    sx={{ fontWeight: 700 }}
                />
                {categories.map((cat) => (
                    <Chip
                        key={cat.id}
                        label={cat.name}
                        color={selected === cat.id ? 'primary' : 'default'}
                        onClick={() => selectCategory(cat.id)}
                    />
                ))}
            </Stack>

            <Box sx={{ textAlign: 'right', mb: 2 }}>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setComposerOpen(true)}
                    sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                >
                    New thread
                </Button>
            </Box>

            <Stack sx={{ gap: 1.5 }}>
                {threads.map((thread) => (
                    <ThreadCard key={thread.id} thread={thread} categoryName={categoryName(thread.category_id)} />
                ))}
                {!threads.length && (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        No threads here yet. Start the conversation!
                    </Typography>
                )}
            </Stack>

            <Dialog open={composerOpen} onClose={() => setComposerOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>New thread</DialogTitle>
                <DialogContent>
                    <Stack sx={{ gap: 2, pt: 1 }}>
                        <TextField
                            select
                            label="Category"
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            fullWidth
                        >
                            {categories.map((cat) => (
                                <MenuItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            fullWidth
                            autoFocus
                        />
                        <TextField
                            label="Discussing a title? (optional)"
                            value={mangaTitle}
                            onChange={(e) => setMangaTitle(e.target.value)}
                            fullWidth
                        />
                        <TextField
                            label="What's on your mind?"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            fullWidth
                            multiline
                            minRows={3}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setComposerOpen(false)} sx={{ textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        disabled={busy || !title.trim() || !content.trim()}
                        onClick={submit}
                        sx={{ textTransform: 'none' }}
                    >
                        Post
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export function Community() {
    useAppTitle('Community');
    const [tab, setTab] = useState(0);

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 760, mx: 'auto' }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <ForumIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    Community
                </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Discuss series, share recommendations, and chat with other readers. Be kind.
            </Typography>

            <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
                <Tab label="Forum" sx={{ textTransform: 'none' }} />
                <Tab label="Chat" sx={{ textTransform: 'none' }} />
            </Tabs>

            {tab === 0 && <Forum />}
            {tab === 1 && <ChatRoom />}
        </Box>
    );
}
