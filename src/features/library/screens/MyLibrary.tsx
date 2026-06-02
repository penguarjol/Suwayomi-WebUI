/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ExploreIcon from '@mui/icons-material/Explore';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { GET_MANGAS_BASE } from '@/lib/graphql/queries/MangaQuery.ts';
import { GetMangasBaseQuery, GetMangasBaseQueryVariables } from '@/lib/graphql/generated/graphql.ts';
import { Mangas } from '@/features/manga/services/Mangas.ts';
import { useUserLibraryStore } from '@/features/library/services/UserLibrary.ts';
import { useManageMangaLibraryState } from '@/features/manga/hooks/useManageMangaLibraryState.tsx';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';

type LibraryManga = GetMangasBaseQuery['mangas']['nodes'][number];

const MyLibraryCard = ({ manga }: { manga: LibraryManga }) => {
    const { updateLibraryState } = useManageMangaLibraryState(manga, true);
    const thumbnail = Mangas.getThumbnailUrl(manga);

    return (
        <Box sx={{ position: 'relative' }}>
            <Box
                component={Link}
                to={AppRoutes.manga.path(manga.id)}
                sx={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
                <Box
                    component="img"
                    src={thumbnail}
                    alt={manga.title}
                    loading="lazy"
                    sx={{
                        width: '100%',
                        aspectRatio: '2 / 3',
                        objectFit: 'cover',
                        borderRadius: 2,
                        backgroundColor: 'action.hover',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                        transition: 'transform 0.15s ease',
                        '&:hover': { transform: 'translateY(-2px)' },
                    }}
                />
                <Typography
                    variant="body2"
                    sx={{
                        mt: 0.75,
                        fontWeight: 600,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {manga.title}
                </Typography>
            </Box>
            <IconButton
                size="small"
                aria-label="remove from library"
                onClick={updateLibraryState}
                sx={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    color: 'primary.main',
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(6px)',
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.65)' },
                }}
            >
                <FavoriteIcon fontSize="small" />
            </IconButton>
        </Box>
    );
};

export function MyLibrary() {
    const { t } = useTranslation();
    useAppTitle('Nexus Reads');

    const favoriteIds = useUserLibraryStore((state) => state.favoriteIds);
    const loaded = useUserLibraryStore((state) => state.loaded);

    const { data, loading } = requestManager.useGetMangas<GetMangasBaseQuery, GetMangasBaseQueryVariables>(
        GET_MANGAS_BASE,
        { filter: { id: { in: favoriteIds } } },
        { skip: favoriteIds.length === 0 },
    );

    const mangas = useMemo(() => {
        const nodes = data?.mangas.nodes ?? [];
        // Most-recently-favorited first (favoriteIds is in insertion order).
        return [...nodes].sort((a, b) => favoriteIds.indexOf(b.id) - favoriteIds.indexOf(a.id));
    }, [data?.mangas.nodes, favoriteIds]);

    if (!loaded || (favoriteIds.length > 0 && loading && mangas.length === 0)) {
        return <LoadingPlaceholder />;
    }

    if (favoriteIds.length === 0) {
        return (
            <Stack
                sx={{
                    minHeight: '60vh',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    gap: 2,
                    px: 3,
                }}
            >
                <CollectionsBookmarkIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.85 }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {t('library.error.label.empty')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
                    {t('library.info.label.add_to_library_hint')}
                </Typography>
                <Button
                    component={Link}
                    to={AppRoutes.browse.path()}
                    variant="contained"
                    startIcon={<ExploreIcon />}
                    sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700, mt: 1 }}
                >
                    {t('global.label.browse')}
                </Button>
            </Stack>
        );
    }

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'baseline', gap: 1, mb: 2, px: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {t('library.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {mangas.length}
                </Typography>
            </Stack>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: 'repeat(auto-fill, minmax(110px, 1fr))',
                        sm: 'repeat(auto-fill, minmax(150px, 1fr))',
                    },
                    gap: { xs: 1.5, sm: 2 },
                }}
            >
                {mangas.map((manga) => (
                    <MyLibraryCard key={manga.id} manga={manga} />
                ))}
            </Box>
        </Box>
    );
}
