/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import { StringParam, useQueryParam } from 'use-query-params';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import RedeemIcon from '@mui/icons-material/Redeem';
import { Link } from 'react-router-dom';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import {
    DEFAULT_TOKEN_PACKS,
    DEFAULT_SUBSCRIPTION_PLANS,
    getPublicTokenPacks,
    startCheckout,
    useBillingStore,
    TokenPack,
    SubscriptionPlan,
} from '@/features/billing/Billing.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { makeToast } from '@/base/utils/Toast.ts';

const fmt = (n: number) => `$${n.toFixed(2)}`;

const PackCard = ({
    pack,
    highlight,
    onBuy,
    busy,
}: {
    pack: TokenPack;
    highlight?: boolean;
    onBuy: () => void;
    busy: boolean;
}) => (
    <Stack
        sx={{
            p: 2.5,
            gap: 1,
            borderRadius: 3,
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            border: (theme) => `1px solid ${highlight ? theme.palette.primary.main : 'rgba(255,255,255,0.08)'}`,
            background: 'rgba(255,255,255,0.03)',
            boxShadow: highlight ? (theme) => `0 0 24px ${theme.palette.primary.main}40` : 'none',
        }}
    >
        {highlight && (
            <Chip
                label="Best value"
                color="primary"
                size="small"
                sx={{ position: 'absolute', top: -12, fontWeight: 700 }}
            />
        )}
        <MonetizationOnIcon color="primary" sx={{ fontSize: 36 }} />
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
            {pack.tokens + pack.bonus}
        </Typography>
        <Typography variant="caption" color="text.secondary">
            {pack.bonus > 0 ? `${pack.tokens} + ${pack.bonus} bonus Coins` : 'Coins'}
        </Typography>
        <Button
            fullWidth
            variant={highlight ? 'contained' : 'outlined'}
            disabled={busy}
            onClick={onBuy}
            sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700, mt: 1 }}
        >
            {fmt(pack.priceUsd)}
        </Button>
    </Stack>
);

export function Store() {
    useAppTitle('Get Coins');
    const tokens = useBillingStore((state) => state.tokens);
    const isPremium = useBillingStore((state) => state.isPremium);
    const [busy, setBusy] = useState(false);
    const [purchase, setPurchase] = useQueryParam('purchase', StringParam);

    // Handle the return from Stripe web checkout (success/cancel redirect).
    useEffect(() => {
        if (purchase === 'success') {
            makeToast('Purchase complete! Your Coins will appear in a moment.', 'success');
            useBillingStore.getState().loadProfile();
            setPurchase(undefined);
        } else if (purchase === 'cancel') {
            makeToast('Checkout canceled.', 'info');
            setPurchase(undefined);
        }
    }, [purchase, setPurchase]);

    const buy = async (productId: string) => {
        setBusy(true);
        try {
            const { url, error } = await startCheckout(productId);
            if (url) {
                window.location.href = url;
                return;
            }
            if (error === 'not_configured') {
                makeToast('Purchases are not enabled yet. Check back soon!', 'info');
            } else {
                makeToast('Could not start checkout. Please try again.', 'error');
            }
        } finally {
            setBusy(false);
        }
    };

    const [packs, setPacks] = useState<TokenPack[]>(DEFAULT_TOKEN_PACKS);
    const plans: SubscriptionPlan[] = DEFAULT_SUBSCRIPTION_PLANS;

    useEffect(() => {
        getPublicTokenPacks().then(setPacks);
    }, []);

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 880, mx: 'auto' }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    Get Coins
                </Typography>
                <Chip
                    icon={<MonetizationOnIcon />}
                    label={isPremium ? 'Premium' : `${tokens} Coins`}
                    color="primary"
                    sx={{ fontWeight: 800 }}
                />
            </Stack>

            {/* Premium */}
            <Stack
                sx={{
                    p: 3,
                    mb: 4,
                    borderRadius: 4,
                    gap: 1.5,
                    background: (theme) =>
                        `linear-gradient(135deg, ${theme.palette.primary.main}22, ${theme.palette.secondary.main}22)`,
                    border: '1px solid rgba(255,255,255,0.10)',
                }}
            >
                <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                    <WorkspacePremiumIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        Nexus Premium
                    </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                    Unlimited Fast Pass on every series, ad-free reading, offline downloads, and a monthly Coin bonus.
                </Typography>
                <Stack sx={{ flexDirection: 'row', gap: 1.5, flexWrap: 'wrap', mt: 1 }}>
                    {plans.map((plan) => (
                        <Button
                            key={plan.id}
                            variant="contained"
                            disabled={busy || isPremium}
                            onClick={() => buy(plan.id)}
                            sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                        >
                            {isPremium ? 'Active' : `${fmt(plan.priceUsd)} / ${plan.period}`}
                        </Button>
                    ))}
                </Stack>
            </Stack>

            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
                Coin packs
            </Typography>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                    gap: 2,
                }}
            >
                {packs.map((pack, index) => (
                    <PackCard
                        key={pack.id}
                        pack={pack}
                        highlight={index === 1}
                        busy={busy}
                        onBuy={() => buy(pack.id)}
                    />
                ))}
            </Box>

            <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Button
                    component={Link}
                    to={AppRoutes.earn.path}
                    variant="outlined"
                    startIcon={<RedeemIcon />}
                    sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                >
                    Earn free Coins
                </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, textAlign: 'center' }}>
                5 Coins unlock one Fast Pass chapter. Older chapters are always free.
            </Typography>
        </Box>
    );
}
