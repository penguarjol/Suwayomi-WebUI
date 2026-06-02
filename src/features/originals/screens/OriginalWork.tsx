/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import BookmarkAddedIcon from '@mui/icons-material/BookmarkAdded';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import {
    OriginalChapter,
    OriginalWork as Work,
    coverUrl,
    followCreator,
    getMyFollowedCreatorIds,
    getMyUnlockedChapterIds,
    getWork,
    tipCreator,
    unfollowCreator,
} from '@/features/originals/Originals.ts';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { ShareButton } from '@/base/components/ShareButton.tsx';
import { makeToast } from '@/base/utils/Toast.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';

export function OriginalWork() {
    const { id = '' } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [work, setWork] = useState<Work | null>(null);
    const [chapters, setChapters] = useState<OriginalChapter[]>([]);
    const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState(false);

    useAppTitle(work?.title ?? 'Original');

    useEffect(() => {
        Promise.all([getWork(id), getMyUnlockedChapterIds(), getMyFollowedCreatorIds()])
            .then(([{ work: w, chapters: c }, unlockedIds, followedCreators]) => {
                setWork(w);
                setChapters(c.filter((chapter) => chapter.published));
                setUnlocked(unlockedIds);
                if (w) setFollowing(followedCreators.has(w.creator_id));
            })
            .finally(() => setLoading(false));
    }, [id]);

    const toggleFollow = async () => {
        if (!work) return;
        const next = !following;
        setFollowing(next);
        try {
            if (next) await followCreator(work.creator_id);
            else await unfollowCreator(work.creator_id);
        } catch {
            setFollowing(!next);
        }
    };

    const tip = async () => {
        if (!work) return;
        const status = await tipCreator(work.creator_id, 10);
        if (status === 'tipped') {
            useBillingStore.getState().loadProfile();
            makeToast('Tipped 10 Coins to the creator. Thank you!', 'success');
        } else if (status === 'insufficient') {
            makeToast('Not enough Coins to tip.', 'warning');
        } else if (status === 'self') {
            makeToast("You can't tip yourself.", 'info');
        } else {
            makeToast('Could not tip right now.', 'error');
        }
    };

    if (loading) return <LoadingPlaceholder />;
    if (!work) return <EmptyViewAbsoluteCentered message="Work not found" />;

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 820, mx: 'auto' }}>
            <Stack sx={{ flexDirection: 'row', gap: 2, mb: 3 }}>
                <Box
                    component="img"
                    src={coverUrl(work.cover_path) || undefined}
                    alt={work.title}
                    sx={{
                        width: 130,
                        aspectRatio: '2/3',
                        objectFit: 'cover',
                        borderRadius: 2,
                        backgroundColor: 'action.hover',
                    }}
                />
                <Stack sx={{ flexGrow: 1, gap: 0.5 }}>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>
                        {work.title}
                    </Typography>
                    <Chip
                        label="Nexus Original"
                        color="primary"
                        size="small"
                        sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
                    />
                    {work.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {work.description}
                        </Typography>
                    )}
                    <Stack sx={{ flexDirection: 'row', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                        <Button
                            size="small"
                            variant={following ? 'outlined' : 'contained'}
                            startIcon={following ? <BookmarkAddedIcon /> : <BookmarkAddIcon />}
                            onClick={toggleFollow}
                            sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                        >
                            {following ? 'Following creator' : 'Follow creator'}
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VolunteerActivismIcon />}
                            onClick={tip}
                            sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                        >
                            Tip 10 Coins
                        </Button>
                        <ShareButton title={work.title} path={AppRoutes.originalWork.path(work.id)} />
                    </Stack>
                </Stack>
            </Stack>

            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Chapters
            </Typography>
            <Stack sx={{ gap: 1 }}>
                {chapters.map((chapter) => {
                    const isUnlocked = unlocked.has(chapter.id) || chapter.price_coins === 0;
                    return (
                        <Stack
                            key={chapter.id}
                            component={Link}
                            to={AppRoutes.originalReader.path(chapter.id)}
                            sx={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 1,
                                p: 1.5,
                                borderRadius: 2,
                                border: '1px solid rgba(255,255,255,0.06)',
                                textDecoration: 'none',
                                color: 'inherit',
                            }}
                        >
                            <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>
                                #{chapter.number} {chapter.title}
                            </Typography>
                            {chapter.price_coins === 0 && <Chip size="small" label="Free" />}
                            {chapter.price_coins > 0 && isUnlocked && (
                                <CheckCircleIcon fontSize="small" color="success" />
                            )}
                            {chapter.price_coins > 0 && !isUnlocked && (
                                <Stack
                                    sx={{ flexDirection: 'row', alignItems: 'center', gap: 0.5, color: 'warning.main' }}
                                >
                                    <LockIcon fontSize="small" />
                                    <Typography variant="caption" sx={{ fontWeight: 800 }}>
                                        {chapter.price_coins}
                                    </Typography>
                                </Stack>
                            )}
                        </Stack>
                    );
                })}
                {!chapters.length && <Typography color="text.secondary">No chapters published yet.</Typography>}
            </Stack>

            <Button onClick={() => navigate(AppRoutes.originals.path)} sx={{ mt: 3, textTransform: 'none' }}>
                Back to Originals
            </Button>
        </Box>
    );
}
