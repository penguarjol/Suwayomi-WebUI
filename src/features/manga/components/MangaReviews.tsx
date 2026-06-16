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
import Rating from '@mui/material/Rating';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import {
    MangaReview,
    RatingSummary,
    deleteMyReview,
    getMangaRating,
    getMyReview,
    listMangaReviews,
    upsertMyReview,
} from '@/features/manga/services/MangaReviews.ts';
import { makeToast } from '@/base/utils/Toast.ts';

export const MangaReviews = ({ mangaId }: { mangaId: number }) => {
    const [summary, setSummary] = useState<RatingSummary>({ avg: 0, count: 0 });
    const [reviews, setReviews] = useState<MangaReview[]>([]);
    const [myRating, setMyRating] = useState<number>(0);
    const [myBody, setMyBody] = useState('');
    const [hasMine, setHasMine] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        const [s, list, mine] = await Promise.all([
            getMangaRating(mangaId),
            listMangaReviews(mangaId),
            getMyReview(mangaId),
        ]);
        setSummary(s);
        setReviews(list);
        if (mine) {
            setMyRating(mine.rating);
            setMyBody(mine.body ?? '');
            setHasMine(true);
        }
    };

    useEffect(() => {
        load();
    }, [mangaId]);

    const save = async () => {
        if (myRating < 1) {
            makeToast('Pick a star rating first.', 'info');
            return;
        }
        setBusy(true);
        try {
            const ok = await upsertMyReview(mangaId, myRating, myBody);
            if (ok) {
                makeToast('Review saved.', 'success');
                setHasMine(true);
                await load();
            } else {
                makeToast('Could not save your review.', 'error');
            }
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        setBusy(true);
        try {
            if (await deleteMyReview(mangaId)) {
                setMyRating(0);
                setMyBody('');
                setHasMine(false);
                await load();
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 880 }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Ratings & reviews
                </Typography>
                {summary.count > 0 && (
                    <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 0.75 }}>
                        <Rating value={summary.avg} precision={0.1} readOnly size="small" />
                        <Typography variant="body2" color="text.secondary">
                            {`${summary.avg.toFixed(1)} (${summary.count})`}
                        </Typography>
                    </Stack>
                )}
            </Stack>

            <Stack
                sx={{
                    gap: 1.5,
                    p: 2,
                    mb: 3,
                    borderRadius: 3,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.02)',
                }}
            >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {hasMine ? 'Your review' : 'Rate this series'}
                </Typography>
                <Rating value={myRating} onChange={(_, v) => setMyRating(v ?? 0)} />
                <TextField
                    size="small"
                    placeholder="Share what you thought (optional)"
                    multiline
                    minRows={2}
                    value={myBody}
                    onChange={(e) => setMyBody(e.target.value)}
                />
                <Stack sx={{ flexDirection: 'row', gap: 1 }}>
                    <Button
                        variant="contained"
                        disabled={busy}
                        onClick={save}
                        sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                    >
                        {hasMine ? 'Update review' : 'Post review'}
                    </Button>
                    {hasMine && (
                        <Button
                            variant="text"
                            color="error"
                            disabled={busy}
                            onClick={remove}
                            sx={{ textTransform: 'none' }}
                        >
                            Delete
                        </Button>
                    )}
                </Stack>
            </Stack>

            {reviews.length > 0 && (
                <Stack sx={{ gap: 1.5 }}>
                    {reviews.map((review) => (
                        <Box key={review.id}>
                            <Rating value={review.rating} readOnly size="small" />
                            {review.body && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                    {review.body}
                                </Typography>
                            )}
                            <Divider sx={{ mt: 1.5 }} />
                        </Box>
                    ))}
                </Stack>
            )}
        </Box>
    );
};
