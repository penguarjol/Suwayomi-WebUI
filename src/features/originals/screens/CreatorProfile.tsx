/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import Tooltip from '@mui/material/Tooltip';
import {
    Creator,
    CreatorStats,
    OriginalWork,
    SupportTier,
    coverUrl,
    followCreator,
    getCreator,
    getCreatorStats,
    getMyFollowedCreatorIds,
    getMySupportedCreatorIds,
    getSupportTiers,
    listWorksByCreator,
    supportCreator,
    unfollowCreator,
} from '@/features/originals/Originals.ts';
import { useBillingStore } from '@/features/billing/Billing.ts';
import {
    Badge,
    UserProfile,
    getBadgeCatalog,
    getEarnedBadges,
    getUserProfile,
} from '@/features/profile/ProfileCustomization.ts';
import { bannerSx, frameSx, nameEffectSx } from '@/features/profile/ProfileCosmetics.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { makeToast } from '@/base/utils/Toast.ts';

const TierCard = ({
    tier,
    supporting,
    busy,
    onSupport,
}: {
    tier: SupportTier;
    supporting: boolean;
    busy: boolean;
    onSupport: () => void;
}) => (
    <Stack
        sx={{
            p: 2,
            gap: 0.75,
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.03)',
        }}
    >
        <Stack sx={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {tier.name}
            </Typography>
            <Chip
                size="small"
                icon={<MonetizationOnIcon />}
                label={`${tier.monthly_coins}/mo`}
                color="primary"
                sx={{ fontWeight: 700 }}
            />
        </Stack>
        {tier.perks && (
            <Typography variant="body2" color="text.secondary">
                {tier.perks}
            </Typography>
        )}
        <Button
            variant={supporting ? 'outlined' : 'contained'}
            disabled={busy}
            onClick={onSupport}
            startIcon={<VolunteerActivismIcon />}
            sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700, mt: 0.5 }}
        >
            {supporting ? 'Renew support' : `Support for ${tier.monthly_coins} Coins`}
        </Button>
    </Stack>
);

export function CreatorProfile() {
    const { id = '' } = useParams<{ id: string }>();
    useAppTitle('Creator');

    const [creator, setCreator] = useState<Creator | null>(null);
    const [stats, setStats] = useState<CreatorStats | null>(null);
    const [works, setWorks] = useState<OriginalWork[]>([]);
    const [tiers, setTiers] = useState<SupportTier[]>([]);
    const [following, setFollowing] = useState(false);
    const [supporting, setSupporting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [cosmetics, setCosmetics] = useState<UserProfile | null>(null);
    const [badges, setBadges] = useState<Badge[]>([]);

    const load = async () => {
        const [c, s, w, t, follows, supported, profile, catalog, earned] = await Promise.all([
            getCreator(id),
            getCreatorStats(id),
            listWorksByCreator(id),
            getSupportTiers(id),
            getMyFollowedCreatorIds(),
            getMySupportedCreatorIds(),
            getUserProfile(id),
            getBadgeCatalog(),
            getEarnedBadges(id),
        ]);
        setCreator(c);
        setStats(s);
        setWorks(w);
        setTiers(t);
        setFollowing(follows.has(id));
        setSupporting(supported.has(id));
        setCosmetics(profile);
        const earnedIds = new Set(earned.map((b) => b.badge_id));
        setBadges(catalog.filter((b) => earnedIds.has(b.id)));
        setLoading(false);
    };

    useEffect(() => {
        setLoading(true);
        load();
    }, [id]);

    const toggleFollow = async () => {
        setBusy(true);
        try {
            if (following) {
                await unfollowCreator(id);
                setFollowing(false);
            } else {
                await followCreator(id);
                setFollowing(true);
            }
        } finally {
            setBusy(false);
        }
    };

    const support = async (tier: SupportTier) => {
        setBusy(true);
        try {
            const status = await supportCreator(tier.id);
            if (status === 'supported') {
                makeToast(`You're now supporting ${creator?.display_name ?? 'this creator'}!`, 'success');
                setSupporting(true);
                useBillingStore.getState().loadProfile();
                setStats(await getCreatorStats(id));
            } else if (status === 'insufficient') {
                makeToast('Not enough Coins — top up to support this creator.', 'warning');
            } else if (status === 'self') {
                makeToast("You can't support your own tier.", 'info');
            } else {
                makeToast('Could not complete support. Please try again.', 'error');
            }
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <Stack sx={{ alignItems: 'center', py: 8 }}>
                <CircularProgress />
            </Stack>
        );
    }

    if (!creator) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Creator not found
                </Typography>
            </Box>
        );
    }

    const bannerKey = cosmetics?.banner_key ?? 'default';
    const frameKey = cosmetics?.avatar_frame_key ?? 'none';
    const effectKey = cosmetics?.name_effect_key ?? 'none_effect';
    const accent = cosmetics?.accent_color ?? undefined;

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 880, mx: 'auto' }}>
            <Box sx={{ position: 'relative', height: 120, borderRadius: 3, mb: 1, ...bannerSx(bannerKey) }} />
            <Stack sx={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, mt: -5, mb: 2, px: 1 }}>
                <Avatar
                    sx={{
                        width: 80,
                        height: 80,
                        fontSize: 32,
                        fontWeight: 800,
                        boxSizing: 'border-box',
                        ...frameSx(frameKey),
                    }}
                >
                    {creator.display_name.charAt(0).toUpperCase()}
                </Avatar>
                <Stack sx={{ flexGrow: 1, minWidth: 0, pb: 0.5 }}>
                    <Typography
                        variant="h5"
                        noWrap
                        sx={{ fontWeight: 900, display: 'inline-block', ...nameEffectSx(effectKey, accent) }}
                    >
                        {creator.display_name}
                    </Typography>
                    {stats && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {`${stats.follower_count} followers · ${stats.supporter_count} supporters · ${stats.work_count} works`}
                        </Typography>
                    )}
                    {badges.length > 0 && (
                        <Stack sx={{ flexDirection: 'row', gap: 0.5, mt: 0.75, flexWrap: 'wrap' }}>
                            {badges.map((badge) => (
                                <Tooltip key={badge.id} title={badge.description ?? badge.name}>
                                    <Chip
                                        size="small"
                                        variant="outlined"
                                        label={`${badge.icon ?? '🏅'} ${badge.name}`}
                                    />
                                </Tooltip>
                            ))}
                        </Stack>
                    )}
                </Stack>
                <Button
                    variant={following ? 'outlined' : 'contained'}
                    disabled={busy}
                    onClick={toggleFollow}
                    startIcon={following ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                    sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
                >
                    {following ? 'Following' : 'Follow'}
                </Button>
            </Stack>

            {creator.bio && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {creator.bio}
                </Typography>
            )}

            {tiers.length > 0 && (
                <>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
                        Support {creator.display_name}
                    </Typography>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                            gap: 1.5,
                            mb: 4,
                        }}
                    >
                        {tiers.map((tier) => (
                            <TierCard
                                key={tier.id}
                                tier={tier}
                                supporting={supporting}
                                busy={busy}
                                onSupport={() => support(tier)}
                            />
                        ))}
                    </Box>
                </>
            )}

            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
                Works
            </Typography>
            {works.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    No published works yet.
                </Typography>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(5, 1fr)' },
                        gap: 1.5,
                    }}
                >
                    {works.map((work) => (
                        <Stack
                            key={work.id}
                            component={Link}
                            to={AppRoutes.originalWork.path(work.id)}
                            sx={{ textDecoration: 'none', color: 'inherit', gap: 0.5 }}
                        >
                            <Box
                                component="img"
                                src={coverUrl(work.cover_path) || undefined}
                                alt={work.title}
                                loading="lazy"
                                sx={{
                                    width: '100%',
                                    aspectRatio: '2/3',
                                    objectFit: 'cover',
                                    borderRadius: 2,
                                    backgroundColor: 'action.hover',
                                }}
                            />
                            <Typography variant="caption" sx={{ fontWeight: 600 }} noWrap>
                                {work.title}
                            </Typography>
                        </Stack>
                    ))}
                </Box>
            )}
        </Box>
    );
}
