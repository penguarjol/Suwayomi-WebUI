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
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import BrushIcon from '@mui/icons-material/Brush';
import { OriginalWork, coverUrl, listPublishedWorks } from '@/features/originals/Originals.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';

export function Originals() {
    useAppTitle('Nexus Originals');
    const [works, setWorks] = useState<OriginalWork[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        listPublishedWorks()
            .then(setWorks)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingPlaceholder />;

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1000, mx: 'auto' }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <AutoStoriesIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 900, flexGrow: 1 }}>
                    Nexus Originals
                </Typography>
                <Button
                    component={Link}
                    to={AppRoutes.studio.path}
                    variant="contained"
                    startIcon={<BrushIcon />}
                    sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                >
                    Creator Studio
                </Button>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Original manga, comics, and stories published by Nexus creators. Support them directly — creators earn
                from every unlock.
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 2 }}>
                {works.map((work) => (
                    <Box
                        key={work.id}
                        component={Link}
                        to={AppRoutes.originalWork.path(work.id)}
                        sx={{ textDecoration: 'none', color: 'inherit' }}
                    >
                        <Box
                            component="img"
                            src={coverUrl(work.cover_path) || undefined}
                            alt={work.title}
                            loading="lazy"
                            sx={{
                                width: '100%',
                                aspectRatio: '2/3',
                                objectFit: 'cover',
                                borderRadius: 2,
                                backgroundColor: 'action.hover',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                            }}
                        />
                        <Typography variant="subtitle2" sx={{ mt: 0.5, fontWeight: 700 }} noWrap>
                            {work.title}
                        </Typography>
                    </Box>
                ))}
                {!works.length && (
                    <Typography color="text.secondary" sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 4 }}>
                        No originals published yet. Be the first — open the Creator Studio!
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
