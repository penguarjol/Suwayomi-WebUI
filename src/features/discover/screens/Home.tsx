/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import ForumIcon from '@mui/icons-material/Forum';
import ExploreIcon from '@mui/icons-material/Explore';
import { MangaRail } from '@/features/library/components/MangaRail.tsx';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { Mangas } from '@/features/manga/services/Mangas.ts';
import { useApprovedSourceIds } from '@/features/library/services/useApprovedSources.ts';
import {
    TrendingWindow,
    getPopularReadingRanks,
    getRisingRanks,
    getTrendingWindowRanks,
} from '@/features/discover/Discover.ts';
import { getRecommendedMangaIds } from '@/features/library/services/Recommendations.ts';
import { OriginalWork, coverUrl, getFollowedCreatorWorks, listPublishedWorks } from '@/features/originals/Originals.ts';
import { Thread, getRecentThreads } from '@/features/social/Forum.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { useSaasSourceAccess } from '@/features/source/services/SourceAccess.ts';
import { DiscoverDedupeProvider, useDedupedMangas, useDiscoverClaim } from '@/features/discover/DiscoverDedupe.tsx';
import { CoverImage } from '@/features/discover/components/CoverImage.tsx';

const normalizeTitle = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

/** Guards against sources that return their popular list for unmatched searches. */
const titleMatches = (query: string, candidate: string): boolean => {
    const q = normalizeTitle(query);
    const c = normalizeTitle(candidate);
    if (q.length < 3 || c.length < 3) return false;
    return c.includes(q) || q.includes(c);
};

const railScrollSx = {
    flexDirection: 'row' as const,
    gap: 1.5,
    overflowX: 'auto' as const,
    pb: 1,
    px: 0.5,
    scrollbarWidth: 'thin' as const,
    WebkitOverflowScrolling: 'touch' as const,
};

// Editorially curated popular titles (market research, 2026). Shown even on a
// brand-new instance so Discover is never empty; each opens a catalog search so
// it resolves against whatever sources are enabled (no bundled cover art).
const CURATED_POPULAR = [
    'Solo Leveling',
    'One Piece',
    'Jujutsu Kaisen',
    'Chainsaw Man',
    'The Beginning After the End',
    "Omniscient Reader's Viewpoint",
    'Tower of God',
    'Solo Max-Level Newbie',
];

// Real, source-backed "popular" shelf. On a fresh instance the user-activity
// rankings are empty, so we hydrate Discover from the source's own popular
// listing (real covers + titles). Self-hides if the source has nothing.
const SourcePopularRail = ({ sourceId }: { sourceId: string }) => {
    const railOwner = useId();
    const [, pages] = requestManager.useGetSourcePopularMangas(sourceId, 1);
    const page = pages?.[0];
    const rawMangas = useMemo(
        () => (page?.data?.fetchSourceManga?.mangas ?? []).slice(0, 24),
        [page?.data?.fetchSourceManga?.mangas],
    );
    const mangas = useDedupedMangas(rawMangas, railOwner).slice(0, 16);
    if (!mangas.length) return null;

    return (
        <Box sx={{ mb: 3 }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1, px: 0.5 }}>
                <WhatshotIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Popular right now
                </Typography>
            </Stack>
            <Stack sx={railScrollSx}>
                {mangas.map((manga) => (
                    <Box
                        key={manga.id}
                        component={Link}
                        to={AppRoutes.manga.path(manga.id)}
                        sx={{ textDecoration: 'none', color: 'inherit', flex: '0 0 auto', width: 120 }}
                    >
                        <CoverImage src={Mangas.getThumbnailUrl(manga)} title={manga.title} />
                        <Typography
                            variant="caption"
                            sx={{
                                mt: 0.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                fontWeight: 600,
                            }}
                        >
                            {manga.title}
                        </Typography>
                    </Box>
                ))}
            </Stack>
        </Box>
    );
};

const SeededPopularRail = () => {
    const { data } = requestManager.useGetSourceList();
    const { ready, isApproved } = useApprovedSourceIds();
    const sourceId = useMemo(() => {
        const nodes = data?.sources?.nodes ?? [];
        const candidate = nodes.find((s) => !s.isNsfw && s.id !== '0' && isApproved(s.id));
        return candidate?.id ?? null;
    }, [data?.sources?.nodes, isApproved]);

    if (!ready || !sourceId) return null;
    return <SourcePopularRail sourceId={sourceId} />;
};

// Preseed for the Trending rail when there's no reading-activity ranking yet:
// the latest releases from a source (a reasonable "what's hot/new" proxy),
// rendered headerless since the Trending header is shown above it.
const SourceLatestRow = ({ sourceId }: { sourceId: string }) => {
    const railOwner = useId();
    const [, pages] = requestManager.useGetSourceLatestMangas(sourceId, 1);
    const page = pages?.[0];
    const rawMangas = useMemo(
        () => (page?.data?.fetchSourceManga?.mangas ?? []).slice(0, 24),
        [page?.data?.fetchSourceManga?.mangas],
    );
    const mangas = useDedupedMangas(rawMangas, railOwner).slice(0, 14);
    if (!mangas.length) return null;

    return (
        <Box sx={{ mb: 3 }}>
            <Stack sx={railScrollSx}>
                {mangas.map((manga) => (
                    <Box
                        key={manga.id}
                        component={Link}
                        to={AppRoutes.manga.path(manga.id)}
                        sx={{ textDecoration: 'none', color: 'inherit', flex: '0 0 auto', width: 120 }}
                    >
                        <CoverImage src={Mangas.getThumbnailUrl(manga)} title={manga.title} />
                        <Typography
                            variant="caption"
                            sx={{
                                mt: 0.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                fontWeight: 600,
                            }}
                        >
                            {manga.title}
                        </Typography>
                    </Box>
                ))}
            </Stack>
        </Box>
    );
};

const TrendingFallback = () => {
    const { data } = requestManager.useGetSourceList();
    const { ready, isApproved } = useApprovedSourceIds();
    const sourceId = useMemo(() => {
        const nodes = (data?.sources?.nodes ?? []).filter((s) => !s.isNsfw && s.id !== '0' && isApproved(s.id));
        return (nodes.find((s) => s.supportsLatest) ?? nodes[0])?.id ?? null;
    }, [data?.sources?.nodes, isApproved]);

    if (!ready || !sourceId) return null;
    return <SourceLatestRow sourceId={sourceId} />;
};

const CuratedPickCard = ({
    title,
    sources,
}: {
    title: string;
    sources: { id: string; displayName?: string | null; name?: string | null }[];
}) => {
    const claim = useDiscoverClaim();
    const [sourceIndex, setSourceIndex] = useState(0);
    const source = sources[sourceIndex];
    const [, pages] = requestManager.useSourceSearch(source?.id ?? '-1', title, undefined, 1, {
        skipRequest: !source,
    });
    const page = pages?.[0];
    const isDone = !!page && !page.isLoading;
    const mangas = page?.data?.fetchSourceManga?.mangas ?? [];
    // Only accept a result whose title actually matches the query. Sources that
    // return their popular list for an unmatched search would otherwise make many
    // different picks resolve to the same handful of titles (the duplicate bug).
    const match = useMemo(() => mangas.find((manga) => titleMatches(title, manga.title)), [mangas, title]);

    // No real match here — try the next source before giving up.
    useEffect(() => {
        if (!source || !isDone || match || sourceIndex >= sources.length - 1) return;
        setSourceIndex((index) => index + 1);
    }, [isDone, match, source, sourceIndex, sources.length]);

    if (!source) return null;

    let owned = false;
    if (match) {
        owned = claim ? claim(match.id, `curated:${title}`) : true;
    }

    if (match && owned) {
        return (
            <Box
                component={Link}
                to={AppRoutes.manga.path(match.id)}
                sx={{ textDecoration: 'none', color: 'inherit', flex: '0 0 auto', width: 120 }}
            >
                <CoverImage src={Mangas.getThumbnailUrl(match)} title={match.title} />
                <Typography
                    variant="caption"
                    sx={{
                        mt: 0.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontWeight: 600,
                    }}
                >
                    {match.title}
                </Typography>
            </Box>
        );
    }

    // Already surfaced in another rail — don't show it twice.
    if (match && !owned) return null;

    // Still searching across sources.
    if (!isDone) {
        return (
            <Box sx={{ flex: '0 0 auto', width: 120 }}>
                <Box sx={{ width: 120, aspectRatio: '2 / 3', borderRadius: 2, backgroundColor: 'action.hover' }} />
            </Box>
        );
    }

    // No match anywhere — offer a catalog search shortcut for the curated title.
    return (
        <Box
            component={Link}
            to={AppRoutes.sources.childRoutes.searchAll.path(title)}
            state={{ shouldShowOnlyPinnedSources: false }}
            sx={{ textDecoration: 'none', color: 'inherit', flex: '0 0 auto', width: 120 }}
        >
            <Stack
                sx={{
                    width: 120,
                    aspectRatio: '2 / 3',
                    borderRadius: 2,
                    p: 1.5,
                    justifyContent: 'flex-end',
                    color: '#fff',
                    background: (theme) =>
                        `linear-gradient(140deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                }}
            >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
                    {title}
                </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
                Search all sources
            </Typography>
        </Box>
    );
};

const CuratedPicks = () => {
    const { data } = requestManager.useGetSourceList({ fetchPolicy: 'cache-first' });
    const { ready, isAllowed } = useSaasSourceAccess();
    const sources = useMemo(
        () =>
            (data?.sources.nodes ?? [])
                .filter((source) => !source.isNsfw && isAllowed(source))
                .map((source) => ({ id: String(source.id), displayName: source.displayName, name: source.name })),
        [data?.sources.nodes, isAllowed],
    );

    if (!ready || !sources.length) return null;

    return (
        <Box sx={{ mb: 3 }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1, px: 0.5 }}>
                <AutoAwesomeIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Editor&apos;s picks
                </Typography>
            </Stack>
            <Stack sx={railScrollSx}>
                {CURATED_POPULAR.map((title) => (
                    <CuratedPickCard key={title} title={title} sources={sources} />
                ))}
            </Stack>
        </Box>
    );
};

const OriginalsRail = ({ title, load }: { title: string; load: () => Promise<OriginalWork[]> }) => {
    const [works, setWorks] = useState<OriginalWork[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        load()
            .then((list) => setWorks(list.slice(0, 12)))
            .finally(() => setLoaded(true));
    }, []);

    if (!loaded || works.length === 0) return null;

    return (
        <Box sx={{ mb: 3 }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1, px: 0.5 }}>
                <AutoStoriesIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, flexGrow: 1 }}>
                    {title}
                </Typography>
                <Button component={Link} to={AppRoutes.originals.path} size="small" sx={{ textTransform: 'none' }}>
                    See all
                </Button>
            </Stack>
            <Stack sx={railScrollSx}>
                {works.map((work) => (
                    <Box
                        key={work.id}
                        component={Link}
                        to={AppRoutes.originalWork.path(work.id)}
                        sx={{ textDecoration: 'none', color: 'inherit', flex: '0 0 auto', width: 120 }}
                    >
                        <Box
                            component="img"
                            src={coverUrl(work.cover_path) || undefined}
                            alt={work.title}
                            loading="lazy"
                            sx={{
                                width: 120,
                                aspectRatio: '2 / 3',
                                objectFit: 'cover',
                                borderRadius: 2,
                                backgroundColor: 'action.hover',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                            }}
                        />
                        <Typography variant="caption" sx={{ mt: 0.5, fontWeight: 600, display: 'block' }} noWrap>
                            {work.title}
                        </Typography>
                    </Box>
                ))}
            </Stack>
        </Box>
    );
};

const STARTER_TOPICS = [
    'What are you reading this week?',
    'Best completed series to binge?',
    'Underrated manhwa that deserve more love',
    'Recommend me something based on my last read',
];

const CommunityHighlights = () => {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        getRecentThreads(4)
            .then(setThreads)
            .catch(() => setThreads([]))
            .finally(() => setLoaded(true));
    }, []);

    if (!loaded) return null;

    return (
        <Box sx={{ mb: 3 }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1, px: 0.5 }}>
                <ForumIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, flexGrow: 1 }}>
                    From the community
                </Typography>
                <Button component={Link} to={AppRoutes.social.path} size="small" sx={{ textTransform: 'none' }}>
                    Open
                </Button>
            </Stack>
            <Stack sx={{ gap: 1 }}>
                {threads.map((thread) => (
                    <Box
                        key={thread.id}
                        component={Link}
                        to={AppRoutes.thread.path(thread.id)}
                        sx={{
                            textDecoration: 'none',
                            color: 'inherit',
                            p: 1.5,
                            borderRadius: 2,
                            border: '1px solid rgba(255,255,255,0.06)',
                            display: 'block',
                        }}
                    >
                        <Typography sx={{ fontWeight: 700 }} noWrap>
                            {thread.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {thread.author_name ?? 'reader'} · {thread.reply_count} replies · {thread.like_count} likes
                        </Typography>
                    </Box>
                ))}
                {!threads.length &&
                    STARTER_TOPICS.map((topic) => (
                        <Box
                            key={topic}
                            component={Link}
                            to={AppRoutes.social.path}
                            sx={{
                                textDecoration: 'none',
                                color: 'inherit',
                                p: 1.5,
                                borderRadius: 2,
                                border: '1px dashed rgba(255,255,255,0.12)',
                                display: 'block',
                            }}
                        >
                            <Typography sx={{ fontWeight: 700 }} noWrap>
                                {topic}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Suggested topic · be the first to post
                            </Typography>
                        </Box>
                    ))}
            </Stack>
        </Box>
    );
};

export function Home() {
    useAppTitle('Discover');
    const [window, setWindow] = useState<TrendingWindow>('week');

    return (
        <DiscoverDedupeProvider>
            <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1100, mx: 'auto' }}>
                <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, px: 0.5 }}>
                    Discover
                </Typography>

                <SeededPopularRail />

                <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1, px: 0.5, flexWrap: 'wrap' }}>
                    <WhatshotIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, flexGrow: 1 }}>
                        Trending
                    </Typography>
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={window}
                        onChange={(_, value) => value && setWindow(value)}
                    >
                        <ToggleButton value="week" sx={{ textTransform: 'none' }}>
                            Weekly
                        </ToggleButton>
                        <ToggleButton value="month" sx={{ textTransform: 'none' }}>
                            Monthly
                        </ToggleButton>
                        <ToggleButton value="all" sx={{ textTransform: 'none' }}>
                            All-time
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Stack>
                <MangaRail
                    key={window}
                    title=""
                    loadRanks={() => getTrendingWindowRanks(window, 14)}
                    rankLabel={window}
                    fallback={<TrendingFallback />}
                />

                <MangaRail
                    title="Fast-rising"
                    icon={<TrendingUpIcon color="primary" fontSize="small" />}
                    loadRanks={() => getRisingRanks(14)}
                    rankLabel="rising"
                />
                <MangaRail
                    title="Readers are reading"
                    icon={<MenuBookIcon color="primary" fontSize="small" />}
                    loadRanks={() => getPopularReadingRanks(14)}
                    rankLabel="read"
                />
                <MangaRail
                    title="Recommended for you"
                    icon={<AutoAwesomeIcon color="primary" fontSize="small" />}
                    loadIds={() => getRecommendedMangaIds(14)}
                />

                <CuratedPicks />

                <OriginalsRail title="From creators you follow" load={getFollowedCreatorWorks} />
                <OriginalsRail title="New Originals" load={listPublishedWorks} />
                <CommunityHighlights />

                <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Button
                        component={Link}
                        to={AppRoutes.browse.path()}
                        variant="outlined"
                        startIcon={<ExploreIcon />}
                        sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                    >
                        Browse the full catalog
                    </Button>
                </Box>
            </Box>
        </DiscoverDedupeProvider>
    );
}
