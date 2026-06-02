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
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import { Collection, getFollowedCollections } from '@/features/marketplace/Marketplace.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';

/**
 * Collections the user follows, shown as their own Library section. Tapping one
 * opens it; its titles resolve live, so it tracks the curator's updates.
 */
export const FollowedCollections = () => {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        getFollowedCollections()
            .then(setCollections)
            .catch(() => setCollections([]))
            .finally(() => setLoaded(true));
    }, []);

    if (!loaded || collections.length === 0) return null;

    return (
        <Box sx={{ mb: 3 }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1, px: 0.5 }}>
                <CollectionsBookmarkIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Followed Collections
                </Typography>
            </Stack>
            <Stack sx={{ gap: 1 }}>
                {collections.map((collection) => (
                    <Stack
                        key={collection.id}
                        component={Link}
                        to={AppRoutes.collection.path(collection.id)}
                        sx={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 1,
                            p: 1.5,
                            borderRadius: 2,
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.03)',
                            textDecoration: 'none',
                            color: 'inherit',
                        }}
                    >
                        <CollectionsBookmarkIcon fontSize="small" color="action" />
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700 }} noWrap>
                                {collection.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                by {collection.author_name ?? 'reader'} · {collection.like_count} likes
                            </Typography>
                        </Box>
                    </Stack>
                ))}
            </Stack>
        </Box>
    );
};
