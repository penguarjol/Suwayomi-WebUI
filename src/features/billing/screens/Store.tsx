/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react';
import { StringParam, useQueryParam } from 'use-query-params';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import RedeemIcon from '@mui/icons-material/Redeem';
import LanguageIcon from '@mui/icons-material/Language';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { Link } from 'react-router-dom';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import {
    DEFAULT_TOKEN_PACKS,
    DEFAULT_SUBSCRIPTION_PLANS,
    getPublicTokenPacks,
    startCheckout,
    purchaseNative,
    openWebStore,
    openBillingPortal,
    claimPremiumBonus,
    useBillingStore,
    TokenPack,
    SubscriptionPlan,
} from '@/features/billing/Billing.ts';
import { resolvePurchaseOptions, webDiscountedPrice } from '@/features/billing/PaymentRouter.ts';
import { detectPlatform, detectRegion } from '@/features/billing/Platform.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { makeToast } from '@/base/utils/Toast.ts';

const fmt = (n: number) => `$${n.toFixed(2)}`;

// Optional voluntary "support the project" link (Ko-fi / Buy Me a Coffee /
// PayPal.me). Rendered only when configured so we never show a dead button.
// This is a tip, NOT a purchase — it grants no Coins or entitlement.
const TIP_URL = (import.meta.env.VITE_TIP_URL as string | undefined)?.trim() || undefined;

const PackCard = ({
    pack,
    highlight,
    onBuy,
    busy,
    discountPercent,
}: {
    pack: TokenPack;
    highlight?: boolean;
    onBuy: () => void;
    busy: boolean;
    discountPercent: number;
}) => {
    const discounted = discountPercent > 0;
    const price = discounted ? webDiscountedPrice(pack.priceUsd, discountPercent) : pack.priceUsd;
    return (
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
                {discounted ? (
                    <Stack component="span" sx={{ flexDirection: 'row', alignItems: 'center', gap: 0.75 }}>
                        <Box component="span" sx={{ textDecoration: 'line-through', opacity: 0.6 }}>
                            {fmt(pack.priceUsd)}
                        </Box>
                        <Box component="span">{fmt(price)}</Box>
                    </Stack>
                ) : (
                    fmt(price)
                )}
            </Button>
        </Stack>
    );
};

export function Store() {
    useAppTitle('Get Coins');
    const tokens = useBillingStore((state) => state.tokens);
    const isPremium = useBillingStore((state) => state.isPremium);
    const paymentsEnabled = useBillingStore((state) => state.paymentsEnabled);
    const purchasePolicy = useBillingStore((state) => state.purchasePolicy);
    const [busy, setBusy] = useState(false);
    const [purchase, setPurchase] = useQueryParam('purchase', StringParam);

    // Resolve the purchase channel once from platform + region + server policy.
    const channel = useMemo(
        () => resolvePurchaseOptions(detectPlatform(), detectRegion(), purchasePolicy),
        [purchasePolicy],
    );
    // Web/PWA buyers pay the discounted price; native buyers pay the store (IAP)
    // price and are nudged to the web only where policy permits.
    const cardDiscount = channel.primaryChannel === 'web' ? channel.webDiscountPercent : 0;

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
            if (channel.primaryChannel === 'iap') {
                const { ok, error } = await purchaseNative(productId);
                if (ok) {
                    makeToast('Purchase complete!', 'success');
                } else if (error === 'product_unavailable') {
                    makeToast('This item is not available on this device yet.', 'error');
                } else if (error !== 'cancelled') {
                    makeToast('Could not complete the purchase. Please try again.', 'error');
                }
                return;
            }
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

    const manageSubscription = async () => {
        const { ok, error } = await openBillingPortal();
        if (ok) return;
        if (error === 'no_customer') {
            makeToast('No web subscription found to manage on this account.', 'info');
        } else if (error === 'not_configured') {
            makeToast('Subscription management is not enabled yet.', 'info');
        } else {
            makeToast('Could not open subscription management. Please try again.', 'error');
        }
    };

    const claimBonus = async () => {
        const status = await claimPremiumBonus();
        if (status === 'claimed') makeToast('Monthly Coin bonus claimed!', 'success');
        else if (status === 'too_soon') makeToast('You already claimed this month — check back later.', 'info');
        else if (status === 'not_premium') makeToast('Premium required for the monthly bonus.', 'warning');
        else makeToast('Could not claim the bonus right now.', 'error');
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
                    {paymentsEnabled ? 'Get Coins' : 'Support Nexus'}
                </Typography>
                {paymentsEnabled && (
                    <Chip
                        icon={<MonetizationOnIcon />}
                        label={isPremium ? 'Premium' : `${tokens} Coins`}
                        color="primary"
                        sx={{ fontWeight: 800 }}
                    />
                )}
            </Stack>

            {/* Soft launch: payments are off, so the Store shows only the tip jar. */}
            {!paymentsEnabled && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Everything is free right now while we grow. If you are enjoying Nexus, a tip below helps keep it
                    going. Coins and Premium are coming soon.
                </Typography>
            )}

            {/* Native "save on web" nudge — only where the region permits an
                external purchase link (ADR-0008). Opens the system browser. */}
            {paymentsEnabled && channel.showWebLink && channel.webDiscountPercent > 0 && (
                <Stack
                    sx={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 2,
                        mb: 3,
                        borderRadius: 3,
                        border: '1px solid rgba(255,255,255,0.10)',
                        background: 'rgba(255,255,255,0.03)',
                    }}
                >
                    <LanguageIcon color="primary" />
                    <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 600 }}>
                        {`Save ${channel.webDiscountPercent}% on every top-up when you buy on the web.`}
                    </Typography>
                    <Button
                        onClick={openWebStore}
                        variant="outlined"
                        size="small"
                        sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
                    >
                        Open web store
                    </Button>
                </Stack>
            )}

            {paymentsEnabled && (
                <>
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
                            Unlimited Fast Pass on every series, ad-free reading, offline downloads, and a monthly Coin
                            bonus.
                        </Typography>
                        <Stack sx={{ flexDirection: 'row', gap: 1.5, flexWrap: 'wrap', mt: 1 }}>
                            {plans.map((plan) => {
                                const planPrice =
                                    cardDiscount > 0 ? webDiscountedPrice(plan.priceUsd, cardDiscount) : plan.priceUsd;
                                return (
                                    <Button
                                        key={plan.id}
                                        variant="contained"
                                        disabled={busy || isPremium}
                                        onClick={() => buy(plan.id)}
                                        sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                                    >
                                        {isPremium ? 'Active' : `${fmt(planPrice)} / ${plan.period}`}
                                    </Button>
                                );
                            })}
                            {isPremium && (
                                <Button
                                    variant="outlined"
                                    startIcon={<RedeemIcon />}
                                    onClick={claimBonus}
                                    disabled={busy}
                                    sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                                >
                                    Claim monthly bonus
                                </Button>
                            )}
                            {isPremium && (
                                <Button
                                    variant="text"
                                    onClick={manageSubscription}
                                    disabled={busy}
                                    sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                                >
                                    Manage subscription
                                </Button>
                            )}
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
                                discountPercent={cardDiscount}
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
                </>
            )}

            {/* Voluntary tip — separate from purchases, grants no Coins. Only
                shown when VITE_TIP_URL is configured (Ko-fi / BMC / PayPal.me). */}
            {TIP_URL && (
                <Stack
                    sx={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 2,
                        mt: 4,
                        borderRadius: 3,
                        border: '1px solid rgba(255,255,255,0.10)',
                        background: 'rgba(255,255,255,0.03)',
                    }}
                >
                    <VolunteerActivismIcon color="secondary" />
                    <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Support the project
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Enjoying Nexus? Leave a tip to keep it growing. This is a voluntary tip and adds no Coins.
                        </Typography>
                    </Stack>
                    <Button
                        href={TIP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outlined"
                        color="secondary"
                        size="small"
                        sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
                    >
                        Leave a tip
                    </Button>
                </Stack>
            )}

            {paymentsEnabled && (
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 3, textAlign: 'center' }}
                >
                    5 Coins unlock one Fast Pass chapter. Older chapters are always free.
                </Typography>
            )}
        </Box>
    );
}
