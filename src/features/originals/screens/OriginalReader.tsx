/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LockIcon from '@mui/icons-material/Lock';
import {
    OriginalChapter,
    fetchOriginalPage,
    getMyUnlockedChapterIds,
    getOriginalChapter,
    unlockOriginalChapter,
} from '@/features/originals/Originals.ts';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { makeToast } from '@/base/utils/Toast.ts';

export function OriginalReader() {
    const { chapterId = '' } = useParams<{ chapterId: string }>();
    const [chapter, setChapter] = useState<OriginalChapter | null>(null);
    const [pageUrls, setPageUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [locked, setLocked] = useState(false);
    const [unlocking, setUnlocking] = useState(false);
    const objectUrls = useRef<string[]>([]);
    const tokens = useBillingStore((state) => state.tokens);

    const loadPages = async (ch: OriginalChapter) => {
        const urls: string[] = [];
        for (let i = 0; i < ch.pages.length; i += 1) {
            // eslint-disable-next-line no-await-in-loop -- pages render top-to-bottom in order
            const { url, status } = await fetchOriginalPage(ch.id, i);
            if (status === 402) {
                setLocked(true);
                return;
            }
            if (url) urls.push(url);
        }
        objectUrls.current = urls;
        setPageUrls(urls);
        setLocked(false);
    };

    const init = async () => {
        setLoading(true);
        const ch = await getOriginalChapter(chapterId);
        setChapter(ch);
        if (!ch) {
            setLoading(false);
            return;
        }
        const entitled = ch.price_coins === 0 || (await getMyUnlockedChapterIds()).has(ch.id);
        if (entitled) {
            await loadPages(ch);
        } else {
            setLocked(true);
        }
        setLoading(false);
    };

    useEffect(() => {
        init();
        return () => {
            objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
            objectUrls.current = [];
        };
    }, [chapterId]);

    const unlock = async () => {
        if (!chapter) return;
        setUnlocking(true);
        try {
            const status = await unlockOriginalChapter(chapter.id);
            if (status === 'unlocked' || status === 'already_unlocked' || status === 'free' || status === 'entitled') {
                await useBillingStore.getState().loadProfile();
                await loadPages(chapter);
            } else if (status === 'insufficient') {
                makeToast('Not enough Coins — get more to unlock this chapter.', 'warning');
            } else {
                makeToast('Could not unlock. Please try again.', 'error');
            }
        } finally {
            setUnlocking(false);
        }
    };

    if (loading) return <LoadingPlaceholder />;
    if (!chapter) return <EmptyViewAbsoluteCentered message="Chapter not found" />;

    if (locked) {
        return (
            <Stack sx={{ alignItems: 'center', textAlign: 'center', gap: 2, p: 4, maxWidth: 380, mx: 'auto', mt: 6 }}>
                <Box
                    sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: (theme) =>
                            `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    }}
                >
                    <LockIcon sx={{ fontSize: 32, color: '#fff' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Support the creator
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Unlock “{chapter.title}” for {chapter.price_coins} Coins. The creator earns from every unlock.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    You have {tokens} Coins.
                </Typography>
                <Button
                    variant="contained"
                    size="large"
                    disabled={unlocking}
                    onClick={unlock}
                    sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                >
                    {unlocking ? '…' : `Unlock for ${chapter.price_coins} Coins`}
                </Button>
            </Stack>
        );
    }

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto', pb: 6 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, p: 2 }}>
                #{chapter.number} {chapter.title}
            </Typography>
            <Stack>
                {pageUrls.map((url, i) => (
                    <Box
                        // eslint-disable-next-line react/no-array-index-key
                        key={i}
                        component="img"
                        src={url}
                        alt={`page ${i + 1}`}
                        sx={{ width: '100%', display: 'block' }}
                    />
                ))}
                {!pageUrls.length && (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        This chapter has no pages yet.
                    </Typography>
                )}
            </Stack>
        </Box>
    );
}
