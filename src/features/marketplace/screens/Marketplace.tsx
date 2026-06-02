/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import AddIcon from '@mui/icons-material/Add';
import StorefrontIcon from '@mui/icons-material/Storefront';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import {
    Collection,
    Curator,
    createCollection,
    getCollections,
    getMyLikedCollectionIds,
    getTopCurators,
    likeCollection,
    unlikeCollection,
} from '@/features/marketplace/Marketplace.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';

const CollectionCard = ({
    collection,
    liked,
    onToggleLike,
}: {
    collection: Collection;
    liked: boolean;
    onToggleLike: () => void;
}) => (
    <Stack
        sx={{
            p: 2,
            gap: 0.5,
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
        }}
    >
        <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
            <Box
                component={Link}
                to={AppRoutes.collection.path(collection.id)}
                sx={{ textDecoration: 'none', color: 'inherit', flexGrow: 1, minWidth: 0 }}
            >
                <Typography sx={{ fontWeight: 800 }} noWrap>
                    {collection.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    by {collection.author_name ?? 'reader'}
                </Typography>
            </Box>
            <IconButton size="small" aria-label="like" onClick={onToggleLike}>
                {liked ? <FavoriteIcon fontSize="small" color="primary" /> : <FavoriteBorderIcon fontSize="small" />}
            </IconButton>
            <Typography variant="caption">{collection.like_count}</Typography>
        </Stack>
        {collection.description && (
            <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
                {collection.description}
            </Typography>
        )}
    </Stack>
);

export function Marketplace() {
    useAppTitle('Marketplace');
    const [featured, setFeatured] = useState<Collection[]>([]);
    const [recent, setRecent] = useState<Collection[]>([]);
    const [curators, setCurators] = useState<Curator[]>([]);
    const [liked, setLiked] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [busy, setBusy] = useState(false);

    const refresh = async () => {
        try {
            const [{ featured: f, recent: r }, likedIds, topCurators] = await Promise.all([
                getCollections(),
                getMyLikedCollectionIds(),
                getTopCurators(),
            ]);
            setFeatured(f);
            setRecent(r);
            setLiked(likedIds);
            setCurators(topCurators);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const toggleLike = async (collection: Collection) => {
        const isLiked = liked.has(collection.id);
        setLiked((prev) => {
            const next = new Set(prev);
            if (isLiked) next.delete(collection.id);
            else next.add(collection.id);
            return next;
        });
        try {
            if (isLiked) await unlikeCollection(collection.id);
            else await likeCollection(collection.id);
        } catch {
            refresh();
        }
    };

    const submitCreate = async () => {
        if (!title.trim()) return;
        setBusy(true);
        try {
            await createCollection(title.trim(), description.trim());
            setCreateOpen(false);
            setTitle('');
            setDescription('');
            refresh();
        } catch (e) {
            makeToast(
                getErrorMessage(e) === 'profanity' ? 'Please keep it respectful.' : 'Could not create collection',
                'error',
            );
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <LoadingPlaceholder />;

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 760, mx: 'auto' }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <StorefrontIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 900, flexGrow: 1 }}>
                    Marketplace
                </Typography>
                <Button
                    component={Link}
                    to={AppRoutes.stickers.path}
                    variant="outlined"
                    startIcon={<EmojiEmotionsOutlinedIcon />}
                    sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                >
                    Stickers
                </Button>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateOpen(true)}
                    sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                >
                    Create
                </Button>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Reader-made collections and stickers. Publish your own, like the best, and boost yours to the top.
            </Typography>

            {curators.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1 }}>
                        <EmojiEventsIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                            Top Curators
                        </Typography>
                    </Stack>
                    <Stack sx={{ flexDirection: 'row', gap: 1, overflowX: 'auto', pb: 1 }}>
                        {curators.map((curator) => (
                            <Chip
                                key={curator.author_name}
                                label={`${curator.author_name} · ${curator.likes}♥`}
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                            />
                        ))}
                    </Stack>
                </Box>
            )}

            {featured.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip label="Featured" color="primary" size="small" sx={{ fontWeight: 700 }} />
                    </Stack>
                    <Stack sx={{ gap: 1.5 }}>
                        {featured.map((collection) => (
                            <CollectionCard
                                key={collection.id}
                                collection={collection}
                                liked={liked.has(collection.id)}
                                onToggleLike={() => toggleLike(collection)}
                            />
                        ))}
                    </Stack>
                </Box>
            )}

            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Recent
            </Typography>
            <Stack sx={{ gap: 1.5 }}>
                {recent.map((collection) => (
                    <CollectionCard
                        key={collection.id}
                        collection={collection}
                        liked={liked.has(collection.id)}
                        onToggleLike={() => toggleLike(collection)}
                    />
                ))}
                {!recent.length && (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        No collections yet. Be the first to publish one!
                    </Typography>
                )}
            </Stack>

            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>New collection</DialogTitle>
                <DialogContent>
                    <Stack sx={{ gap: 2, pt: 1 }}>
                        <TextField
                            label="Title"
                            fullWidth
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                        <TextField
                            label="Description"
                            fullWidth
                            multiline
                            minRows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                        <Typography variant="caption" color="text.secondary">
                            Add titles to it from your Library (the &quot;Add to collection&quot; button on each cover).
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)} sx={{ textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        disabled={busy || !title.trim()}
                        onClick={submitCreate}
                        sx={{ textTransform: 'none' }}
                    >
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
