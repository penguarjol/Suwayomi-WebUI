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

/** A horizontal "shelf" of manga covers, hydrated from a list of ids. Self-hides when empty. */
export const MangaRail = ({
    title,
    icon,
    loadIds,
}: {
    title: string;
    icon?: ReactNode;
    loadIds: () => Promise<number[]>;
}) => {
    const [ids, setIds] = useState<number[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let active = true;
        loadIds()
            .then((result) => {
                if (active) setIds(result);
            })
            .finally(() => {
                if (active) setLoaded(true);
            });
        return () => {
            active = false;
        };
    }, []);

    const { data } = requestManager.useGetMangas<GetMangasBaseQuery, GetMangasBaseQueryVariables>(
        GET_MANGAS_BASE,
        { filter: { id: { in: ids } } },
        { skip: ids.length === 0 },
    );

    const mangas = useMemo(() => {
        const nodes = data?.mangas.nodes ?? [];
        return [...nodes].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    }, [data?.mangas.nodes, ids]);

    if (!loaded || mangas.length === 0) return null;

    return (
        <Box sx={{ mb: 3 }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1, px: 0.5 }}>
                {icon}
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    {title}
                </Typography>
            </Stack>
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
                {mangas.map((manga) => (
                    <Box
                        key={manga.id}
                        component={Link}
                        to={AppRoutes.manga.path(manga.id)}
                        sx={{ textDecoration: 'none', color: 'inherit', flex: '0 0 auto', width: 120 }}
                    >
                        <Box
                            component="img"
                            src={Mangas.getThumbnailUrl(manga)}
                            alt={manga.title}
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
