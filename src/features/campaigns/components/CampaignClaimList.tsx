/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import {
    Campaign,
    ClaimStatus,
    claimCampaign,
    getActiveCampaigns,
    getClaimedCampaignIds,
} from '@/features/campaigns/Campaigns.ts';
import { useBillingStore } from '@/features/billing/Billing.ts';
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

function getReward(campaign: Campaign): string {
    return campaign.reward_type === 'coins'
        ? `${campaign.reward_amount} Coins`
        : `${campaign.reward_amount} Premium days`;
}

function canClaimFromClientState(campaign: Campaign, claimed: Set<string>): boolean {
    return !(campaign.cooldown_hours === 0 && claimed.has(campaign.id));
}

export function CampaignClaimList({
    emptyMessage = 'No campaigns right now. Check back soon!',
    dense = false,
    onClaimableChange,
    onClaimed,
}: {
    emptyMessage?: string;
    dense?: boolean;
    onClaimableChange?: (hasClaimable: boolean) => void;
    onClaimed?: () => void;
}) {
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
            setClaimed(new Set());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const hasClaimable = useMemo(
        () => campaigns.some((campaign) => canClaimFromClientState(campaign, claimed)),
        [campaigns, claimed],
    );

    useEffect(() => {
        onClaimableChange?.(hasClaimable);
    }, [hasClaimable, onClaimableChange]);

    const claim = async (campaign: Campaign) => {
        setBusyId(campaign.id);
        try {
            const { status, error } = await claimCampaign(campaign.id);
            const message = CLAIM_MESSAGE[status] ?? CLAIM_MESSAGE.error;
            makeToast(status === 'error' && error ? `${message.text} ${error}` : message.text, message.severity);
            if (status === 'claimed') {
                await useBillingStore.getState().loadProfile();
                await refresh();
                onClaimed?.();
            }
        } finally {
            setBusyId(null);
        }
    };

    if (loading) return <LoadingPlaceholder />;

    return (
        <Stack sx={{ gap: dense ? 1 : 1.5 }}>
            {campaigns.map((campaign) => {
                const isOneTimeClaimed = campaign.cooldown_hours === 0 && claimed.has(campaign.id);
                const reward = getReward(campaign);

                return (
                    <Stack
                        key={campaign.id}
                        sx={{
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'stretch', sm: 'center' },
                            gap: dense ? 1 : 2,
                            p: dense ? 1.5 : 2,
                            borderRadius: 2,
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.03)',
                        }}
                    >
                        <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
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
                    {emptyMessage}
                </Typography>
            )}
        </Stack>
    );
}
