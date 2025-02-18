/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Stack from '@mui/material/Stack';
import Link from '@mui/material/Link';

import { Link as RouterLink } from 'react-router-dom';
import { memo } from 'react';
import { CustomTooltip } from '@/modules/core/components/CustomTooltip.tsx';
import { TypographyMaxLines } from '@/modules/core/components/TypographyMaxLines';
import { AppRoutes } from '@/modules/core/AppRoute.constants.ts';

export const ReaderNavBarDesktopMetadata = memo(
    ({
        mangaId,
        mangaTitle,
        chapterTitle,
        scanlator,
    }: {
        mangaId: number;
        mangaTitle: string;
        chapterTitle: string;
        scanlator?: string | null;
    }) => (
        <Stack>
            <CustomTooltip title={mangaTitle} placement="right">
                <TypographyMaxLines lines={3} variant="h6" component="h1" sx={{ textAlign: 'center' }}>
                    <Link
                        component={RouterLink}
                        to={AppRoutes.manga.path(mangaId)}
                        sx={{ textDecoration: 'none', color: 'inherit' }}
                    >
                        {mangaTitle}
                    </Link>
                </TypographyMaxLines>
            </CustomTooltip>
            <CustomTooltip title={chapterTitle} placement="right">
                <TypographyMaxLines lines={4} variant="body1" component="h2" sx={{ textAlign: 'center' }}>
                    {chapterTitle}
                </TypographyMaxLines>
            </CustomTooltip>
            {scanlator && (
                <CustomTooltip title={scanlator} placement="right">
                    <TypographyMaxLines
                        lines={4}
                        variant="body2"
                        component="h3"
                        color="textDisabled"
                        sx={{ textAlign: 'center' }}
                    >
                        {scanlator}
                    </TypographyMaxLines>
                </CustomTooltip>
            )}
        </Stack>
    ),
);
