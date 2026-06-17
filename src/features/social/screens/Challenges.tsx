/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import {
    Challenge,
    claimChallenge,
    getActiveChallenges,
    getChallengeProgress,
    getMyClaimedChallengeIds,
} from '@/features/social/SocialFeatures.ts';
import { makeToast } from '@/base/utils/Toast.ts';

const daysLeft = (endsAt: string): string => {
    const ms = new Date(endsAt).getTime() - Date.now();
    const d = Math.ceil(ms / 86_400_000);
    if (d <= 0) return 'ending soon';
    return d === 1 ? '1 day left' : `${d} days left`;
};

export function Challenges() {
    useAppTitle('Challenges');
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [progress, setProgress] = useState<Record<string, number>>({});
    const [claimed, setClaimed] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        const [list, claimedIds] = await Promise.all([getActiveChallenges(), getMyClaimedChallengeIds()]);
        setChallenges(list);
        setClaimed(claimedIds);
        const progressEntries = await Promise.all(
            list.map(async (c) => [c.id, await getChallengeProgress(c.id)] as const),
        );
        setProgress(Object.fromEntries(progressEntries));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const claim = async (challenge: Challenge) => {
        setBusy(challenge.id);
        try {
            const status = await claimChallenge(challenge.id);
            if (status === 'claimed') {
                makeToast('Challenge complete — reward unlocked!', 'success');
                setClaimed((prev) => new Set(prev).add(challenge.id));
            } else if (status === 'incomplete') {
                makeToast('Not quite there yet — keep going!', 'info');
            } else if (status === 'already_claimed') {
                setClaimed((prev) => new Set(prev).add(challenge.id));
            } else {
                makeToast('Could not claim this challenge', 'error');
            }
        } finally {
            setBusy(null);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: 'auto' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
                Reading challenges
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Time-boxed goals with rewards. Read, review, and unlock to complete them.
            </Typography>

            {challenges.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    No active challenges right now. Check back soon.
                </Typography>
            ) : (
                <Stack sx={{ gap: 1.5 }}>
                    {challenges.map((c) => {
                        const done = progress[c.id] ?? 0;
                        const pct = Math.min(100, Math.round((done / c.goal_count) * 100));
                        const isClaimed = claimed.has(c.id);
                        const complete = done >= c.goal_count;
                        return (
                            <Box
                                key={c.id}
                                sx={{
                                    p: 2,
                                    borderRadius: 3,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    background: 'rgba(255,255,255,0.03)',
                                }}
                            >
                                <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <EmojiEventsIcon color="primary" />
                                    <Typography variant="subtitle1" sx={{ fontWeight: 800, flexGrow: 1 }}>
                                        {c.title}
                                    </Typography>
                                    <Chip size="small" label={daysLeft(c.ends_at)} variant="outlined" />
                                </Stack>
                                {c.description && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        {c.description}
                                    </Typography>
                                )}
                                <LinearProgress
                                    variant="determinate"
                                    value={pct}
                                    sx={{ height: 8, borderRadius: 4, mb: 1 }}
                                />
                                <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                                        {`${Math.min(done, c.goal_count)} / ${c.goal_count}`}
                                    </Typography>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        disabled={isClaimed || !complete || busy === c.id}
                                        onClick={() => claim(c)}
                                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px' }}
                                    >
                                        {isClaimed ? 'Claimed' : 'Claim reward'}
                                    </Button>
                                </Stack>
                            </Box>
                        );
                    })}
                </Stack>
            )}
        </Box>
    );
}
