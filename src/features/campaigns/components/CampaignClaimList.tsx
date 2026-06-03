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
    getCampaignClaimTimes,
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

interface ClaimState {
    claimable: boolean;
    /** epoch ms when it becomes claimable again (cooldown campaigns only) */
    availableAt: number | null;
}

/** Whether a campaign can be claimed right now, given the last claim time. */
function getClaimState(campaign: Campaign, claimTimes: Map<string, number>): ClaimState {
    const last = claimTimes.get(campaign.id);
    if (last == null) return { claimable: true, availableAt: null };
    // One-time campaign: a single claim locks it forever.
    if (campaign.cooldown_hours === 0) return { claimable: false, availableAt: null };
    const availableAt = last + campaign.cooldown_hours * 3_600_000;
    return { claimable: Date.now() >= availableAt, availableAt };
}

function formatCountdown(availableAt: number): string {
    const ms = availableAt - Date.now();
    if (ms <= 0) return 'now';
    const hours = Math.floor(ms / 3_600_000);
    if (hours >= 1) return `in ${hours}h`;
    const minutes = Math.max(1, Math.floor(ms / 60_000));
    return `in ${minutes}m`;
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
    const [claimTimes, setClaimTimes] = useState<Map<string, number>>(new Map());
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);

    const refresh = async () => {
        try {
            const [list, times] = await Promise.all([getActiveCampaigns(), getCampaignClaimTimes()]);
            setCampaigns(list);
            setClaimTimes(times);
        } catch {
            setCampaigns([]);
            setClaimTimes(new Map());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const hasClaimable = useMemo(
        () => campaigns.some((campaign) => getClaimState(campaign, claimTimes).claimable),
        [campaigns, claimTimes],
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
                const state = getClaimState(campaign, claimTimes);
                const reward = getReward(campaign);
                let buttonLabel = 'Claim';
                if (!state.claimable) {
                    buttonLabel = campaign.cooldown_hours === 0 ? 'Claimed' : 'Done';
                }

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
                            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <Chip
                                    label={`+ ${reward}`}
                                    color="primary"
                                    size="small"
                                    sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
                                />
                                {!state.claimable && state.availableAt && (
                                    <Typography variant="caption" color="text.secondary">
                                        Resets {formatCountdown(state.availableAt)}
                                    </Typography>
                                )}
                            </Stack>
                        </Stack>
                        <Button
                            variant="contained"
                            disabled={busyId === campaign.id || !state.claimable}
                            onClick={() => claim(campaign)}
                            sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700, minWidth: 96 }}
                        >
                            {buttonLabel}
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
