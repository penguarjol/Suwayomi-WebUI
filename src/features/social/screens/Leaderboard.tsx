/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { supabase } from '@/lib/SupabaseClient.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { UserAvatar } from '@/features/profile/components/UserAvatar.tsx';
import { usePublicProfiles } from '@/features/profile/PublicProfile.ts';
import {
    getMyFollowingIds,
    getWeeklyLeaderboard,
    followUser,
    unfollowUser,
    LeaderboardEntry,
    LeaderboardMetric,
} from '@/features/social/SocialFeatures.ts';
import { GiftDialog } from '@/features/social/components/GiftDialog.tsx';
import { makeToast } from '@/base/utils/Toast.ts';

const METRIC_LABEL: Record<LeaderboardMetric, string> = {
    chapters: 'chapters',
    reviews: 'reviews',
    streak: 'day streak',
};

export function Leaderboard() {
    useAppTitle('Leaderboard');
    const [metric, setMetric] = useState<LeaderboardMetric>('chapters');
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [following, setFollowing] = useState<Set<string>>(new Set());
    const [myId, setMyId] = useState<string | null>(null);
    const [gift, setGift] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
        getMyFollowingIds().then(setFollowing);
    }, []);

    useEffect(() => {
        getWeeklyLeaderboard(metric).then(setEntries);
    }, [metric]);

    const profiles = usePublicProfiles(useMemo(() => entries.map((e) => e.user_id), [entries]));

    const toggleFollow = async (id: string) => {
        const isFollowing = following.has(id);
        const next = new Set(following);
        if (isFollowing) next.delete(id);
        else next.add(id);
        setFollowing(next);
        const status = isFollowing ? await unfollowUser(id) : await followUser(id);
        if (status !== 'following' && status !== 'unfollowed') {
            makeToast('Could not update follow', 'error');
            setFollowing(following);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: 'auto' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
                Weekly leaderboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Top readers over the last 7 days. Keep reading to climb.
            </Typography>

            <ToggleButtonGroup
                exclusive
                size="small"
                value={metric}
                onChange={(_, v) => v && setMetric(v)}
                sx={{ mb: 2 }}
            >
                <ToggleButton value="chapters" sx={{ textTransform: 'none' }}>
                    Chapters
                </ToggleButton>
                <ToggleButton value="reviews" sx={{ textTransform: 'none' }}>
                    Reviews
                </ToggleButton>
                <ToggleButton value="streak" sx={{ textTransform: 'none' }}>
                    Streaks
                </ToggleButton>
            </ToggleButtonGroup>

            {entries.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    No activity yet this week. Be the first.
                </Typography>
            ) : (
                <Stack sx={{ gap: 1 }}>
                    {entries.map((entry, index) => {
                        const profile = profiles.get(entry.user_id);
                        const name = profile?.display_name || 'Reader';
                        const isSelf = myId === entry.user_id;
                        return (
                            <Stack
                                key={entry.user_id}
                                sx={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.25,
                                    borderRadius: 2,
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    background: index < 3 ? 'rgba(236,72,153,0.08)' : 'transparent',
                                }}
                            >
                                <Typography sx={{ fontWeight: 900, width: 28, textAlign: 'center', opacity: 0.8 }}>
                                    {index + 1}
                                </Typography>
                                <UserAvatar profile={profile} name={name} size={40} />
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                                        {name}
                                        {isSelf ? ' (you)' : ''}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {`${entry.score} ${METRIC_LABEL[metric]}`}
                                    </Typography>
                                </Box>
                                {!isSelf && (
                                    <>
                                        <Button
                                            size="small"
                                            variant={following.has(entry.user_id) ? 'outlined' : 'contained'}
                                            onClick={() => toggleFollow(entry.user_id)}
                                            sx={{ textTransform: 'none', borderRadius: '50px', fontWeight: 700 }}
                                        >
                                            {following.has(entry.user_id) ? 'Following' : 'Follow'}
                                        </Button>
                                        <IconButton
                                            size="small"
                                            color="secondary"
                                            aria-label="gift coins"
                                            onClick={() => setGift({ id: entry.user_id, name })}
                                        >
                                            <CardGiftcardIcon />
                                        </IconButton>
                                    </>
                                )}
                            </Stack>
                        );
                    })}
                </Stack>
            )}

            {gift && <GiftDialog open onClose={() => setGift(null)} recipientId={gift.id} recipientName={gift.name} />}
        </Box>
    );
}
