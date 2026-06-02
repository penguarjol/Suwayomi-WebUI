/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import RedeemIcon from '@mui/icons-material/Redeem';
import {
    Campaign,
    ClaimStatus,
    claimCampaign,
    getActiveCampaigns,
    getClaimedCampaignIds,
} from '@/features/campaigns/Campaigns.ts';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { makeToast } from '@/base/utils/Toast.ts';

const CLAIM_MESSAGE: Record<ClaimStatus, { text: string; severity: 'success' | 'warning' | 'error' }> = {
    claimed: { text: 'Reward claimed!', severity: 'success' },
    already_claimed: { text: 'You already claimed this one.', severity: 'warning' },
    too_soon: { text: 'Come back later to claim this again.', severity: 'warning' },
    inactive: { text: 'This campaign is no longer available.', severity: 'warning' },
    unauthenticated: { text: 'Please log in.', severity: 'error' },
    error: { text: 'Could not claim. Try again.', severity: 'error' },
};

export function EarnCoins() {
    useAppTitle('Earn Coins');
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [claimed, setClaimed] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);

    const refresh = async () => {
        try {
            const [list, claimedIds] = await Promise.all([getActiveCampaigns(), getClaimedCampaignIds()]);
            setCampaigns(list);
            setClaimed(claimedIds);
        } catch {
            setCampaigns([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const claim = async (campaign: Campaign) => {
        setBusyId(campaign.id);
        try {
            const status = await claimCampaign(campaign.id);
            const message = CLAIM_MESSAGE[status];
            makeToast(message.text, message.severity);
            if (status === 'claimed') {
                await useBillingStore.getState().loadProfile();
                refresh();
            }
        } finally {
            setBusyId(null);
        }
    };

    if (loading) return <LoadingPlaceholder />;

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 680, mx: 'auto' }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <RedeemIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    Earn Coins
                </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Complete activities to earn free Coins and Premium time.
            </Typography>

            <Stack sx={{ gap: 1.5 }}>
                {campaigns.map((campaign) => {
                    const isOneTimeClaimed = campaign.cooldown_hours === 0 && claimed.has(campaign.id);
                    const reward =
                        campaign.reward_type === 'coins'
                            ? `${campaign.reward_amount} Coins`
                            : `${campaign.reward_amount} Premium days`;
                    return (
                        <Stack
                            key={campaign.id}
                            sx={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 2,
                                p: 2,
                                borderRadius: 3,
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(255,255,255,0.03)',
                            }}
                        >
                            <Stack sx={{ flexGrow: 1 }}>
                                <Typography sx={{ fontWeight: 700 }}>{campaign.title}</Typography>
                                {campaign.description && (
                                    <Typography variant="body2" color="text.secondary">
                                        {campaign.description}
                                    </Typography>
                                )}
                                <Chip
                                    label={`+ ${reward}`}
                                    color="primary"
                                    size="small"
                                    sx={{ alignSelf: 'flex-start', mt: 0.5, fontWeight: 700 }}
                                />
                            </Stack>
                            <Button
                                variant="contained"
                                disabled={busyId === campaign.id || isOneTimeClaimed}
                                onClick={() => claim(campaign)}
                                sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700, minWidth: 96 }}
                            >
                                {isOneTimeClaimed ? 'Claimed' : 'Claim'}
                            </Button>
                        </Stack>
                    );
                })}
                {!campaigns.length && (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        No campaigns right now. Check back soon!
                    </Typography>
                )}
            </Stack>
        </Box>
    );
}
