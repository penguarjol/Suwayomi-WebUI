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
import {
    TrendingWindow,
    getPopularReadingIds,
    getRisingIds,
    getTrendingWindowIds,
} from '@/features/discover/Discover.ts';
import { getRecommendedMangaIds } from '@/features/library/services/Recommendations.ts';
import { OriginalWork, coverUrl, getFollowedCreatorWorks, listPublishedWorks } from '@/features/originals/Originals.ts';
import { Thread, getRecentThreads } from '@/features/social/Forum.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';

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
    'Return of the Mount Hua Sect',
    'Nano Machine',
    'Lookism',
    'Eleceed',
    'Sakamoto Days',
    'Kagurabachi',
    'Blue Lock',
    'Oshi no Ko',
    'Damn Reincarnation',
    'The Greatest Estate Developer',
];

const CuratedPicks = () => (
    <Box sx={{ mb: 3 }}>
        <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1, px: 0.5 }}>
            <WhatshotIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Popular right now
            </Typography>
        </Stack>
        <Stack sx={railScrollSx}>
            {CURATED_POPULAR.map((title, i) => (
                <Box
                    key={title}
                    component={Link}
                    to={AppRoutes.sources.childRoutes.searchAll.path(title)}
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
                            boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                            background: (theme) =>
                                `linear-gradient(${140 + i * 12}deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        }}
                    >
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
                            {title}
                        </Typography>
                    </Stack>
                </Box>
            ))}
        </Stack>
    </Box>
);

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
                {!threads.length && (
                    <Typography color="text.secondary" variant="body2" sx={{ px: 0.5 }}>
                        Be the first to start a discussion in the community.
                    </Typography>
                )}
            </Stack>
        </Box>
    );
};

export function Home() {
    useAppTitle('Discover');
    const [window, setWindow] = useState<TrendingWindow>('week');

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1100, mx: 'auto' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, px: 0.5 }}>
                Discover
            </Typography>

            <CuratedPicks />

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
            <MangaRail key={window} title="" loadIds={() => getTrendingWindowIds(window, 14)} />

            <MangaRail
                title="Fast-rising"
                icon={<TrendingUpIcon color="primary" fontSize="small" />}
                loadIds={() => getRisingIds(14)}
            />
            <MangaRail
                title="Readers are reading"
                icon={<MenuBookIcon color="primary" fontSize="small" />}
                loadIds={() => getPopularReadingIds(14)}
            />
            <MangaRail
                title="Recommended for you"
                icon={<AutoAwesomeIcon color="primary" fontSize="small" />}
                loadIds={() => getRecommendedMangaIds(14)}
            />

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
    );
}
