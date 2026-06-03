/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { GET_MANGAS_BASE } from '@/lib/graphql/queries/MangaQuery.ts';
import { GetMangasBaseQuery, GetMangasBaseQueryVariables } from '@/lib/graphql/generated/graphql.ts';
import { Mangas } from '@/features/manga/services/Mangas.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { useApprovedSourceIds } from '@/features/library/services/useApprovedSources.ts';
import { DiscoverMangaRank } from '@/features/discover/Discover.ts';
import { CoverImage } from '@/features/discover/components/CoverImage.tsx';

/** A horizontal "shelf" of manga covers, hydrated from a list of ids. Self-hides when empty. */
export const MangaRail = ({
    title,
    icon,
    loadIds,
    loadRanks,
    rankLabel,
    fallback,
}: {
    title: string;
    icon?: ReactNode;
    loadIds?: () => Promise<number[]>;
    loadRanks?: () => Promise<DiscoverMangaRank[]>;
    rankLabel?: string;
    /** Rendered when the ranked/id list resolves empty (e.g. preseed content). */
    fallback?: ReactNode;
}) => {
    const [ids, setIds] = useState<number[]>([]);
    const [ranks, setRanks] = useState<Map<number, DiscoverMangaRank>>(new Map());
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let active = true;
        const load = loadRanks
            ? loadRanks().then((result) => {
                  if (!active) return;
                  setIds(result.map((row) => row.manga_id));
                  setRanks(new Map(result.map((row) => [row.manga_id, row])));
              })
            : (loadIds?.() ?? Promise.resolve([])).then((result) => {
                  if (!active) return;
                  setIds(result);
                  setRanks(new Map(result.map((mangaId, index) => [mangaId, { manga_id: mangaId, rank: index + 1 }])));
              });

        load.finally(() => {
            if (active) {
                setLoaded(true);
            }
        });

        return () => {
            active = false;
        };
        // Loader callbacks are sampled once per mount; callers remount the rail when the ranking window changes.
    }, []);

    const rankCaption = (rank?: DiscoverMangaRank): string | null => {
        if (!rank) return null;
        if (rank.readers && rank.chapters_read) {
            return `${rank.readers} readers · ${rank.chapters_read} reads`;
        }
        if (rank.readers) {
            return `${rank.readers} readers`;
        }
        return rankLabel ? `#${rank.rank} ${rankLabel}` : `#${rank.rank}`;
    };

    const rankBadge = (rank?: DiscoverMangaRank): string | null => {
        if (!rank) return null;
        return rankLabel ? `#${rank.rank} ${rankLabel}` : `#${rank.rank}`;
    };

    const { data } = requestManager.useGetMangas<GetMangasBaseQuery, GetMangasBaseQueryVariables>(
        GET_MANGAS_BASE,
        { filter: { id: { in: ids } } },
        { skip: ids.length === 0 },
    );
    const { ready: sourcesReady, isApproved } = useApprovedSourceIds();

    const mangas = useMemo(() => {
        const nodes = data?.mangas.nodes ?? [];
        return [...nodes]
            .filter((manga) => isApproved(manga.sourceId))
            .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    }, [data?.mangas.nodes, ids, isApproved]);

    // Hide the rail until sources load, so unfiltered (possibly NSFW) titles never flash.
    if (!loaded || !sourcesReady) return null;
    // No ranked content yet — show the preseed fallback if one was provided.
    if (mangas.length === 0) return (fallback as JSX.Element) ?? null;

    return (
        <Box sx={{ mb: 3 }}>
            {(title || icon) && (
                <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1, px: 0.5 }}>
                    {icon}
                    {title && (
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                            {title}
                        </Typography>
                    )}
                </Stack>
            )}
            <Stack
                sx={{
                    flexDirection: 'row',
                    gap: 1.5,
                    overflowX: 'auto',
                    pb: 1,
                    px: 0.5,
                    scrollbarWidth: 'thin',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                {mangas.map((manga) => {
                    const rank = ranks.get(manga.id);
                    const badge = rankBadge(rank);
                    const caption = rankCaption(rank);

                    return (
                        <Box
                            key={manga.id}
                            component={Link}
                            to={AppRoutes.manga.path(manga.id)}
                            sx={{ textDecoration: 'none', color: 'inherit', flex: '0 0 auto', width: 120 }}
                        >
                            <Box sx={{ position: 'relative' }}>
                                <CoverImage src={Mangas.getThumbnailUrl(manga)} title={manga.title} />
                                {badge && (
                                    <Box
                                        component="span"
                                        sx={{
                                            position: 'absolute',
                                            top: 6,
                                            left: 6,
                                            px: 0.75,
                                            py: 0.25,
                                            borderRadius: 1,
                                            fontSize: '0.7rem',
                                            fontWeight: 800,
                                            lineHeight: 1.2,
                                            color: '#fff',
                                            backgroundColor: 'rgba(0,0,0,0.68)',
                                        }}
                                    >
                                        {badge}
                                    </Box>
                                )}
                            </Box>
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
                            {caption && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                                    {caption}
                                </Typography>
                            )}
                        </Box>
                    );
                })}
            </Stack>
        </Box>
    );
};
