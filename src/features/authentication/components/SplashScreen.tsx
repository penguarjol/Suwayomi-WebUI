/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useTheme } from '@mui/material/styles';
import Stack, { StackProps } from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ServerAddressSetting } from '@/features/settings/components/ServerAddressSetting.tsx';

export const SplashScreen = ({
    slots,
}: {
    slots?: {
        stackProps?: StackProps;
        serverAddressProps?: StackProps;
    };
}) => {
    const theme = useTheme();

    return (
        <Stack
            {...slots?.stackProps}
            sx={{
                position: 'relative',
                minWidth: '100vw',
                minHeight: '100vh',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'background.default',
                ...slots?.stackProps?.sx,
            }}
        >
            <Typography
                variant="h1"
                sx={{
                    fontWeight: 900,
                    fontSize: { xs: '4rem', lg: '8rem' },
                    letterSpacing: '-2px',
                    color: 'primary.main',
                    textShadow: `0 0 40px ${theme.palette.primary.main}`,
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    '@keyframes pulse': {
                        '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                        '50%': { opacity: 0.6, transform: 'scale(1.05)' },
                    },
                }}
            >
                NOVA
            </Typography>
            <Stack
                {...slots?.serverAddressProps}
                sx={{
                    position: 'absolute',
                    left: 0,
                    bottom: 0,
                    ...slots?.serverAddressProps?.sx,
                }}
            >
                <ServerAddressSetting />
            </Stack>
        </Stack>
    );
};
