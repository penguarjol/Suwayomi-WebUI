/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/**
 * Manga cover that degrades gracefully. Source-fetched covers are frequently
 * uncached or 404 on a fresh instance; instead of a broken-image icon we render
 * a titled gradient placeholder. Single source of truth for cover rendering so
 * every Discover rail behaves the same.
 */
export const CoverImage = ({ src, title, width = 120 }: { src?: string; title: string; width?: number }) => {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return (
            <Stack
                sx={{
                    width,
                    aspectRatio: '2 / 3',
                    borderRadius: 2,
                    p: 1.25,
                    justifyContent: 'flex-end',
                    color: '#fff',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                    background: (theme) =>
                        `linear-gradient(140deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                }}
            >
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: 800,
                        lineHeight: 1.15,
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {title}
                </Typography>
            </Stack>
        );
    }

    return (
        <Box
            component="img"
            src={src}
            alt={title}
            loading="lazy"
            onError={() => setFailed(true)}
            sx={{
                width,
                aspectRatio: '2 / 3',
                objectFit: 'cover',
                borderRadius: 2,
                backgroundColor: 'action.hover',
                boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
            }}
        />
    );
};
