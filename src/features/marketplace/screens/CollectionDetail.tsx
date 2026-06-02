/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { GET_MANGAS_BASE } from '@/lib/graphql/queries/MangaQuery.ts';
import { GetMangasBaseQuery, GetMangasBaseQueryVariables } from '@/lib/graphql/generated/graphql.ts';
import { Mangas } from '@/features/manga/services/Mangas.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import {
    Collection,
    CollectionItem,
    boostCollection,
    getCollection,
    getMyLikedCollectionIds,
    likeCollection,
    unlikeCollection,
} from '@/features/marketplace/Marketplace.ts';
import { useApprovedSourceIds } from '@/features/library/services/useApprovedSources.ts';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { makeToast } from '@/base/utils/Toast.ts';

const BOOST_MESSAGE: Record<string, { text: string; severity: 'success' | 'warning' | 'error' }> = {
    boosted: { text: 'Collection boosted to Featured for 7 days!', severity: 'success' },
    insufficient: { text: 'Not enough Coins to boost.', severity: 'warning' },
    forbidden: { text: 'Only the owner can boost this.', severity: 'warning' },
    error: { text: 'Could not boost. Try again.', severity: 'error' },
};

export function CollectionDetail() {
    const { id = '' } = useParams<{ id: string }>();
    const [collection, setCollection] = useState<Collection | null>(null);
    const [items, setItems] = useState<CollectionItem[]>([]);
    const [liked, setLiked] = useState(false);
    const [loading, setLoading] = useState(true);
    const { ready: sourcesReady, isApproved } = useApprovedSourceIds();

    useAppTitle(collection?.title ?? 'Collection');

    const refresh = async () => {
        const [{ collection: c, items: i }, likedIds] = await Promise.all([
            getCollection(id),
            getMyLikedCollectionIds(),
        ]);
        setCollection(c);
        setItems(i);
        setLiked(likedIds.has(id));
        setLoading(false);
    };

    useEffect(() => {
        refresh();
    }, [id]);

    const mangaIds = useMemo(() => items.map((item) => item.manga_id), [items]);
    const { data } = requestManager.useGetMangas<GetMangasBaseQuery, GetMangasBaseQueryVariables>(
        GET_MANGAS_BASE,
        { filter: { id: { in: mangaIds } } },
        { skip: mangaIds.length === 0 },
    );
    const mangas = useMemo(() => {
        const nodes = data?.mangas.nodes ?? [];
        return nodes.filter((manga) => !sourcesReady || isApproved(manga.sourceId));
    }, [data?.mangas.nodes, isApproved, sourcesReady]);

    const toggleLike = async () => {
        setLiked((prev) => !prev);
        try {
            if (liked) await unlikeCollection(id);
            else await likeCollection(id);
        } catch {
            refresh();
        }
    };

    const boost = async () => {
        const status = await boostCollection(id);
        const message = BOOST_MESSAGE[status] ?? BOOST_MESSAGE.error;
        makeToast(message.text, message.severity);
        if (status === 'boosted') {
            useBillingStore.getState().loadProfile();
            refresh();
        }
    };

    if (loading || !sourcesReady) return <LoadingPlaceholder />;
    if (!collection) return <EmptyViewAbsoluteCentered message="Collection not found" />;

    const isFeatured = !!collection.featured_until && collection.featured_until > new Date().toISOString();

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                <Box sx={{ flexGrow: 1 }}>
                    <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 900 }}>
                            {collection.title}
                        </Typography>
                        {isFeatured && <Chip label="Featured" color="primary" size="small" sx={{ fontWeight: 700 }} />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                        by {collection.author_name ?? 'reader'} · {collection.like_count} likes
                    </Typography>
                </Box>
                <IconButton aria-label="like" onClick={toggleLike}>
                    {liked ? <FavoriteIcon color="primary" /> : <FavoriteBorderIcon />}
                </IconButton>
            </Stack>

            {collection.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {collection.description}
                </Typography>
            )}

            <Button
                variant="outlined"
                startIcon={<RocketLaunchIcon />}
                onClick={boost}
                sx={{ mb: 3, borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
            >
                Boost to Featured
            </Button>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                    gap: 1.5,
                }}
            >
                {mangas.map((manga) => (
                    <Box
                        key={manga.id}
                        component={Link}
                        to={AppRoutes.manga.path(manga.id)}
                        sx={{ textDecoration: 'none', color: 'inherit' }}
                    >
                        <Box
                            component="img"
                            src={Mangas.getThumbnailUrl(manga)}
                            alt={manga.title}
                            loading="lazy"
                            sx={{
                                width: '100%',
                                aspectRatio: '2 / 3',
                                objectFit: 'cover',
                                borderRadius: 2,
                                backgroundColor: 'action.hover',
                            }}
                        />
                        <Typography
                            variant="caption"
                            sx={{
                                mt: 0.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                        >
                            {manga.title}
                        </Typography>
                    </Box>
                ))}
                {!mangas.length && (
                    <Typography color="text.secondary" sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 4 }}>
                        No titles in this collection yet.
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
