/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { UserAvatar } from '@/features/profile/components/UserAvatar.tsx';
import { usePublicProfiles } from '@/features/profile/PublicProfile.ts';
import { FollowingFeedItem, getFollowingFeed } from '@/features/social/SocialFeatures.ts';

const relativeTime = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

export function FollowingFeed() {
    useAppTitle('Following');
    const [items, setItems] = useState<FollowingFeedItem[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        getFollowingFeed(50).then((feed) => {
            setItems(feed);
            setLoaded(true);
        });
    }, []);

    const profiles = usePublicProfiles(useMemo(() => items.map((i) => i.user_id), [items]));

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: 'auto' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
                Following
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Reviews and achievements from readers you follow.
            </Typography>

            {loaded && items.length === 0 ? (
                <Stack sx={{ alignItems: 'center', gap: 2, py: 5 }}>
                    <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
                        You are not following anyone yet. Follow top readers to see their activity here.
                    </Typography>
                    <Button
                        component={Link}
                        to={AppRoutes.leaderboard.path}
                        variant="contained"
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px' }}
                    >
                        Find readers to follow
                    </Button>
                </Stack>
            ) : (
                <Stack sx={{ gap: 1.5 }}>
                    {items.map((item) => {
                        const profile = profiles.get(item.user_id);
                        const name = profile?.display_name || 'Reader';
                        return (
                            <Stack
                                key={`${item.user_id}-${item.event_at}-${item.title}`}
                                sx={{ flexDirection: 'row', gap: 1.5, alignItems: 'center' }}
                            >
                                <UserAvatar profile={profile} name={name} size={40} />
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Typography variant="body2" noWrap>
                                        <Box component="span" sx={{ fontWeight: 700 }}>
                                            {name}
                                        </Box>{' '}
                                        {item.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {relativeTime(item.event_at)}
                                    </Typography>
                                </Box>
                            </Stack>
                        );
                    })}
                </Stack>
            )}
        </Box>
    );
}
