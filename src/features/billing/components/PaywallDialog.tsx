/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import LockIcon from '@mui/icons-material/Lock';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { useNavigate } from 'react-router-dom';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { makeToast } from '@/base/utils/Toast.ts';

/**
 * Global Fast Pass paywall. Opened proactively from a locked chapter, or
 * reactively from the `paymentRequired` 402 event dispatched by RestClient.
 */
export const PaywallDialog = () => {
    const navigate = useNavigate();

    const paywall = useBillingStore((state) => state.paywall);
    const tokens = useBillingStore((state) => state.tokens);
    const busy = useBillingStore((state) => state.busy);
    const { openPaywall, closePaywall, unlock } = useBillingStore.getState();

    useEffect(() => {
        const handler = () => openPaywall();
        window.addEventListener('paymentRequired', handler);
        return () => window.removeEventListener('paymentRequired', handler);
    }, [openPaywall]);

    const { chapter } = paywall;
    const cost = chapter?.cost ?? 0;
    const canAfford = !chapter || tokens >= cost;

    const handleUnlock = async () => {
        if (!chapter) return;
        const status = await unlock(chapter.id);
        if (['unlocked', 'already_unlocked', 'free', 'entitled'].includes(status)) {
            closePaywall();
            navigate(chapter.readerUrl);
            return;
        }
        if (status === 'insufficient') {
            makeToast('Not enough Coins — get more to unlock this chapter.', 'warning');
        } else if (status === 'error') {
            makeToast('Could not unlock chapter. Please try again.', 'error');
        }
    };

    const goToStore = () => {
        closePaywall();
        navigate(AppRoutes.store.path);
    };

    return (
        <Dialog
            open={paywall.open}
            onClose={closePaywall}
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: 4,
                        p: 1,
                        background: (theme) =>
                            `linear-gradient(160deg, ${theme.palette.background.paper} 0%, rgba(20,12,28,0.96) 100%)`,
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        maxWidth: 380,
                    },
                },
            }}
        >
            <Stack sx={{ p: 3, gap: 2, alignItems: 'center', textAlign: 'center' }}>
                <Box
                    sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: (theme) =>
                            `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    }}
                >
                    <LockIcon sx={{ fontSize: 32, color: '#fff' }} />
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Fast Pass chapter
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {chapter
                        ? `Unlock “${chapter.name}” to read it now, or wait for it to become free.`
                        : 'This chapter is part of Fast Pass. Get Coins to unlock the latest chapters early.'}
                </Typography>

                <Stack
                    sx={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 2,
                        py: 1,
                        borderRadius: 2,
                        backgroundColor: 'action.hover',
                    }}
                >
                    <MonetizationOnIcon fontSize="small" color="primary" />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {tokens} Coins
                    </Typography>
                    {!!chapter && (
                        <Typography variant="body2" color="text.secondary">
                            {`· costs ${cost}`}
                        </Typography>
                    )}
                </Stack>

                <Stack sx={{ width: '100%', gap: 1, mt: 1 }}>
                    {chapter && canAfford && (
                        <Button
                            variant="contained"
                            size="large"
                            disabled={busy}
                            onClick={handleUnlock}
                            sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                        >
                            {busy ? '…' : `Unlock for ${cost} Coins`}
                        </Button>
                    )}
                    <Button
                        variant={chapter && canAfford ? 'outlined' : 'contained'}
                        size="large"
                        onClick={goToStore}
                        sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                    >
                        Get more Coins
                    </Button>
                    <Button onClick={closePaywall} sx={{ textTransform: 'none', opacity: 0.7 }}>
                        Maybe later
                    </Button>
                </Stack>
            </Stack>
        </Dialog>
    );
};
