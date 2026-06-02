/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';

const PERKS = [
    'Unlimited Fast Pass — read the newest chapters free',
    'Ad-free reading',
    'Offline downloads',
    'App customization (themes & layout)',
    'Monthly Coin bonus',
];

/** Global "this is a Premium feature" upsell, opened via ensurePremium(). */
export const PremiumUpsellDialog = () => {
    const navigate = useNavigate();
    const upsell = useBillingStore((state) => state.premiumUpsell);
    const { closePremiumUpsell } = useBillingStore.getState();

    const goToStore = () => {
        closePremiumUpsell();
        navigate(AppRoutes.store.path);
    };

    return (
        <Dialog
            open={upsell.open}
            onClose={closePremiumUpsell}
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: 4,
                        p: 1,
                        background: (theme) =>
                            `linear-gradient(160deg, ${theme.palette.background.paper} 0%, rgba(20,12,28,0.96) 100%)`,
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        maxWidth: 400,
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
                    <WorkspacePremiumIcon sx={{ fontSize: 32, color: '#fff' }} />
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Nexus Premium
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {upsell.feature
                        ? `${upsell.feature} is a Premium feature. Upgrade to unlock it and more:`
                        : 'Upgrade to Nexus Premium to unlock:'}
                </Typography>

                <Stack sx={{ gap: 0.75, alignSelf: 'stretch', textAlign: 'left', mt: 1 }}>
                    {PERKS.map((perk) => (
                        <Stack key={perk} sx={{ flexDirection: 'row', gap: 1, alignItems: 'center' }}>
                            <CheckCircleIcon fontSize="small" color="primary" />
                            <Typography variant="body2">{perk}</Typography>
                        </Stack>
                    ))}
                </Stack>

                <Stack sx={{ width: '100%', gap: 1, mt: 1 }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={goToStore}
                        sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                    >
                        See Premium plans
                    </Button>
                    <Button onClick={closePremiumUpsell} sx={{ textTransform: 'none', opacity: 0.7 }}>
                        Maybe later
                    </Button>
                </Stack>
            </Stack>
        </Dialog>
    );
};
