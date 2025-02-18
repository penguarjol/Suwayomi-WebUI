/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import styled from '@emotion/styled';
import Typography, { TypographyProps } from '@mui/material/Typography';
import { shouldForwardProp } from '@/modules/core/utils/ShouldForwardProp.ts';

type TypographyMaxLinesProps = {
    lines?: number;
};

export const TypographyMaxLines = styled(Typography, {
    shouldForwardProp: shouldForwardProp<TypographyMaxLinesProps>(['lines']),
})<TypographyMaxLinesProps>(({ lines = 2 }) => ({
    lineHeight: '1.5rem',
    maxHeight: `${3 * lines}rem`,
    display: '-webkit-box',
    WebkitLineClamp: `${lines}`,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    overflowWrap: 'break-word',
})) as React.FC<TypographyProps & { lines?: number }>;
