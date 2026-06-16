/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';
import IosShareIcon from '@mui/icons-material/IosShare';
import { usePwaInstall } from '@/features/pwa/usePwaInstall.ts';

/**
 * Dismissible install banner. On Android/desktop it triggers the native install
 * prompt; on iOS Safari it shows the manual Add-to-Home-Screen hint. Pinned
 * above the bottom nav so it never covers reading content (mounted by MainApp,
 * not the reader).
 */
export const InstallPrompt = () => {
    const { canInstall, hasNativePrompt, isIosHint, promptInstall, dismiss } = usePwaInstall();

    if (!canInstall) return null;

    return (
        <Stack
            role="dialog"
            aria-label="Install Nexus Reads"
            sx={{
                position: 'fixed',
                left: { xs: 8, sm: 16 },
                right: { xs: 8, sm: 16 },
                bottom: { xs: 72, sm: 16 },
                zIndex: (theme) => theme.zIndex.snackbar,
                maxWidth: 480,
                mx: 'auto',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.12)',
                background: (theme) =>
                    `linear-gradient(135deg, ${theme.palette.primary.main}33, ${theme.palette.secondary.main}33)`,
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            }}
        >
            <InstallMobileIcon color="primary" />
            <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Install Nexus Reads
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {isIosHint && !hasNativePrompt
                        ? 'Tap Share, then "Add to Home Screen" for a faster, full-screen app.'
                        : 'Add the app for instant launch, offline reading, and full-screen mode.'}
                </Typography>
            </Stack>

            {hasNativePrompt && (
                <Button
                    onClick={promptInstall}
                    variant="contained"
                    size="small"
                    sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
                >
                    Install
                </Button>
            )}
            {isIosHint && !hasNativePrompt && <IosShareIcon color="action" sx={{ flexShrink: 0 }} />}

            <IconButton aria-label="Dismiss install prompt" size="small" onClick={dismiss} sx={{ flexShrink: 0 }}>
                <CloseIcon fontSize="small" />
            </IconButton>
        </Stack>
    );
};
