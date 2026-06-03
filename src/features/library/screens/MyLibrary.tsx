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
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ExploreIcon from '@mui/icons-material/Explore';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import SearchIcon from '@mui/icons-material/Search';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { GET_MANGAS_BASE } from '@/lib/graphql/queries/MangaQuery.ts';
import { GetMangasBaseQuery, GetMangasBaseQueryVariables } from '@/lib/graphql/generated/graphql.ts';
import { Mangas } from '@/features/manga/services/Mangas.ts';
import { useUserLibraryStore } from '@/features/library/services/UserLibrary.ts';
import { ContinueReading } from '@/features/library/components/ContinueReading.tsx';
import { FollowedCollections } from '@/features/library/components/FollowedCollections.tsx';
import {
    CategoryBar,
    AssignCategoriesButton,
    useUserCategories,
} from '@/features/library/components/LibraryCategories.tsx';
import { getMangaIdsInCategory, UserCategory } from '@/features/library/services/UserCategories.ts';
import { AddToCollectionButton } from '@/features/marketplace/components/AddToCollectionButton.tsx';
import { useManageMangaLibraryState } from '@/features/manga/hooks/useManageMangaLibraryState.tsx';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';

type LibraryManga = GetMangasBaseQuery['mangas']['nodes'][number];

const MyLibraryCard = ({ manga, categories }: { manga: LibraryManga; categories: UserCategory[] }) => {
    const { updateLibraryState } = useManageMangaLibraryState(manga, true);
    const thumbnail = Mangas.getThumbnailUrl(manga);

    return (
        <Box>
            {/* Overlay controls anchor to the COVER (this relative box), never the
                title below it, so they can't block the title. */}
            <Box sx={{ position: 'relative' }}>
                <Box
                    component={Link}
                    to={AppRoutes.manga.path(manga.id)}
                    sx={{ textDecoration: 'none', display: 'block' }}
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
                {categories.length > 0 && <AssignCategoriesButton mangaId={manga.id} categories={categories} />}
                <Box sx={{ position: 'absolute', bottom: 6, right: 6 }}>
                    <AddToCollectionButton mangaId={manga.id} mangaTitle={manga.title} />
                </Box>
            </Box>
            <Box component={Link} to={AppRoutes.manga.path(manga.id)} sx={{ textDecoration: 'none', color: 'inherit' }}>
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
        </Box>
    );
};

const UnavailableLibraryCard = ({ mangaId, title }: { mangaId: number; title: string | null }) => {
    const remove = useUserLibraryStore((state) => state.remove);
    const label = title || `Manga #${mangaId}`;

    return (
        <Box>
            <Stack
                sx={{
                    width: '100%',
                    aspectRatio: '2 / 3',
                    borderRadius: 2,
                    p: 1.5,
                    justifyContent: 'space-between',
                    backgroundColor: 'action.hover',
                    border: '1px dashed rgba(255,255,255,0.18)',
                }}
            >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Source unavailable
                </Typography>
                <Stack sx={{ gap: 1 }}>
                    <Button
                        component={Link}
                        to={AppRoutes.sources.childRoutes.searchAll.path(title ?? undefined)}
                        state={{ shouldShowOnlyPinnedSources: false }}
                        variant="contained"
                        size="small"
                        startIcon={<SearchIcon />}
                        disabled={!title}
                        sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                    >
                        Find again
                    </Button>
                    <Button
                        variant="text"
                        size="small"
                        onClick={() => remove(mangaId)}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                        Remove
                    </Button>
                </Stack>
            </Stack>
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
                {label}
            </Typography>
        </Box>
    );
};

export function MyLibrary() {
    const { t } = useTranslation();
    useAppTitle('Nexus Reads');

    const favoriteIds = useUserLibraryStore((state) => state.favoriteIds);
    const favoriteTitles = useUserLibraryStore((state) => state.favoriteTitles);
    const loaded = useUserLibraryStore((state) => state.loaded);
    const { categories, refresh: refreshCategories } = useUserCategories();

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [categoryMangaIds, setCategoryMangaIds] = useState<number[] | null>(null);

    useEffect(() => {
        if (selectedCategory === null) {
            setCategoryMangaIds(null);
            return;
        }
        getMangaIdsInCategory(selectedCategory)
            .then(setCategoryMangaIds)
            .catch(() => setCategoryMangaIds([]));
    }, [selectedCategory]);

    const { data, loading } = requestManager.useGetMangas<GetMangasBaseQuery, GetMangasBaseQueryVariables>(
        GET_MANGAS_BASE,
        { filter: { id: { in: favoriteIds } } },
        { skip: favoriteIds.length === 0 },
    );

    const mangas = useMemo(() => {
        const nodes = data?.mangas.nodes ?? [];
        const filtered =
            categoryMangaIds === null ? nodes : nodes.filter((manga) => categoryMangaIds.includes(manga.id));
        // Most-recently-favorited first (favoriteIds is in insertion order).
        return [...filtered].sort((a, b) => favoriteIds.indexOf(b.id) - favoriteIds.indexOf(a.id));
    }, [data?.mangas.nodes, favoriteIds, categoryMangaIds]);
    const unavailableIds = useMemo(() => {
        const loadedIds = new Set(mangas.map((manga) => manga.id));
        return favoriteIds.filter((id) => {
            if (loadedIds.has(id)) return false;
            return categoryMangaIds === null || categoryMangaIds.includes(id);
        });
    }, [favoriteIds, mangas, categoryMangaIds]);

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
            <ContinueReading />
            <FollowedCollections />
            <Stack sx={{ flexDirection: 'row', alignItems: 'baseline', gap: 1, mb: 2, px: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {t('library.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {mangas.length + unavailableIds.length}
                </Typography>
            </Stack>
            <CategoryBar
                categories={categories}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
                onChanged={refreshCategories}
            />
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
                    <MyLibraryCard key={manga.id} manga={manga} categories={categories} />
                ))}
                {unavailableIds.map((mangaId) => (
                    <UnavailableLibraryCard key={mangaId} mangaId={mangaId} title={favoriteTitles[mangaId] ?? null} />
                ))}
            </Box>
            {!mangas.length && !unavailableIds.length && (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Nothing in this category yet.
                </Typography>
            )}
        </Box>
    );
}
