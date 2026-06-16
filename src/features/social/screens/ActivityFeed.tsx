/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import { getActivityFeed, type ActivityItem } from '@/features/social/services/ActivityFeed.ts';
import { coverUrl } from '@/features/originals/Originals.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';

function relativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

const FeedRow = ({ item }: { item: ActivityItem }) => {
    const to =
        item.kind === 'chapter_published' && item.chapter_id
            ? AppRoutes.originalReader.path(item.chapter_id)
            : AppRoutes.originalWork.path(item.work_id);
    const headline =
        item.kind === 'chapter_published' ? `New chapter: ${item.chapter_title ?? ''}` : 'New work published';

    return (
        <Stack
            component={Link}
            to={to}
            sx={{
                flexDirection: 'row',
                gap: 1.5,
                p: 1.5,
                borderRadius: 3,
                textDecoration: 'none',
                color: 'inherit',
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                transition: 'background 120ms ease',
                '&:hover': { background: 'rgba(255,255,255,0.05)' },
            }}
        >
            <Box
                component="img"
                src={coverUrl(item.cover_path) || undefined}
                alt={item.work_title}
                loading="lazy"
                sx={{ width: 48, height: 64, objectFit: 'cover', borderRadius: 1.5, backgroundColor: 'action.hover' }}
            />
            <Stack sx={{ flexGrow: 1, minWidth: 0, justifyContent: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                    {item.work_title}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                    {headline}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                    {`${item.creator_name} · ${relativeTime(item.event_at)}`}
                </Typography>
            </Stack>
        </Stack>
    );
};

export function ActivityFeed() {
    useAppTitle('Following');
    const [items, setItems] = useState<ActivityItem[] | null>(null);

    useEffect(() => {
        let active = true;
        getActivityFeed(50).then((data) => {
            if (active) setItems(data);
        });
        return () => {
            active = false;
        };
    }, []);

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: 'auto' }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 2.5 }}>
                <RssFeedIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    Following
                </Typography>
            </Stack>

            {items === null && (
                <Stack sx={{ alignItems: 'center', py: 6 }}>
                    <CircularProgress />
                </Stack>
            )}

            {items !== null && items.length === 0 && (
                <Stack sx={{ alignItems: 'center', textAlign: 'center', gap: 1.5, py: 6 }}>
                    <RssFeedIcon sx={{ fontSize: 48, opacity: 0.4 }} />
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        Your feed is quiet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
                        Follow creators to see their new works and chapters here as soon as they publish.
                    </Typography>
                    <Button
                        component={Link}
                        to={AppRoutes.originals.path}
                        variant="contained"
                        sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700, mt: 1 }}
                    >
                        Discover creators
                    </Button>
                </Stack>
            )}

            {items !== null && items.length > 0 && (
                <Stack sx={{ gap: 1 }}>
                    {items.map((item) => (
                        <FeedRow key={`${item.kind}-${item.chapter_id ?? item.work_id}`} item={item} />
                    ))}
                </Stack>
            )}
        </Box>
    );
}
