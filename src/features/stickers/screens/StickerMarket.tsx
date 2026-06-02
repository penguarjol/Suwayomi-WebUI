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
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UploadIcon from '@mui/icons-material/Upload';
import {
    Sticker,
    StickerUnlockStatus,
    getMyStickerIds,
    getStickerCatalog,
    publishSticker,
    stickerImageUrl,
    unlockSticker,
    useStickerStore,
} from '@/features/stickers/Stickers.ts';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';

const UNLOCK_MSG: Record<StickerUnlockStatus, { text: string; severity: 'success' | 'warning' | 'error' }> = {
    owned: { text: 'Sticker unlocked!', severity: 'success' },
    already_owned: { text: 'You already own this.', severity: 'warning' },
    insufficient: { text: 'Not enough Coins.', severity: 'warning' },
    premium_required: { text: 'This sticker is included with Premium.', severity: 'warning' },
    not_found: { text: 'Sticker unavailable.', severity: 'warning' },
    error: { text: 'Could not unlock. Try again.', severity: 'error' },
};

const StickerArt = ({ sticker, size = 48 }: { sticker: Sticker; size?: number }) =>
    sticker.emoji ? (
        <Box component="span" sx={{ fontSize: size * 0.7 }}>
            {sticker.emoji}
        </Box>
    ) : (
        <Box
            component="img"
            src={stickerImageUrl(sticker.image_path)}
            alt={sticker.name}
            sx={{ width: size, height: size, objectFit: 'contain' }}
        />
    );

export function StickerMarket() {
    useAppTitle('Stickers');
    const [catalog, setCatalog] = useState<Sticker[]>([]);
    const [owned, setOwned] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState('');
    const [tier, setTier] = useState<'free' | 'coins'>('free');
    const [price, setPrice] = useState('20');
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);

    const reloadStore = () => {
        useStickerStore.setState({ loaded: false });
        useStickerStore.getState().load();
    };

    const refresh = async () => {
        const [list, ids] = await Promise.all([getStickerCatalog(), getMyStickerIds()]);
        setCatalog(list);
        setOwned(ids);
        setLoading(false);
    };

    useEffect(() => {
        refresh();
    }, []);

    const acquire = async (sticker: Sticker) => {
        const status = await unlockSticker(sticker.id);
        const msg = UNLOCK_MSG[status];
        makeToast(msg.text, msg.severity);
        if (status === 'owned') {
            await useBillingStore.getState().loadProfile();
            reloadStore();
            refresh();
        }
    };

    const publish = async () => {
        if (!name.trim() || !file) {
            makeToast('Add a name and image', 'warning');
            return;
        }
        setBusy(true);
        try {
            await publishSticker({ name: name.trim(), file, accessTier: tier, priceCoins: Number(price) || 0 });
            makeToast('Sticker published!', 'success');
            setName('');
            setFile(null);
            reloadStore();
            refresh();
        } catch (e) {
            makeToast(
                getErrorMessage(e) === 'Become a creator first'
                    ? 'Become a creator first (Creator Studio) to publish stickers.'
                    : 'Could not publish sticker',
                'error',
            );
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <LoadingPlaceholder />;

    const tierLabel = (s: Sticker) => {
        if (owned.has(s.id) || s.access_tier === 'free') return null;
        if (s.access_tier === 'premium') return 'Premium';
        return `${s.price_coins} Coins`;
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 820, mx: 'auto' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
                Stickers
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Use stickers in comments, chat, and threads. Buy premium packs or publish your own and earn from every
                purchase.
            </Typography>

            <Box
                sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 1.5, mb: 4 }}
            >
                {catalog.map((sticker) => {
                    const isOwned = owned.has(sticker.id) || sticker.access_tier === 'free';
                    return (
                        <Stack
                            key={sticker.id}
                            sx={{
                                p: 1.5,
                                gap: 0.5,
                                alignItems: 'center',
                                textAlign: 'center',
                                borderRadius: 2,
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}
                        >
                            <StickerArt sticker={sticker} />
                            <Typography variant="caption" noWrap sx={{ width: '100%' }}>
                                {sticker.name}
                            </Typography>
                            {isOwned ? (
                                <CheckCircleIcon fontSize="small" color="success" />
                            ) : (
                                <Button size="small" onClick={() => acquire(sticker)} sx={{ textTransform: 'none' }}>
                                    {tierLabel(sticker)}
                                </Button>
                            )}
                        </Stack>
                    );
                })}
            </Box>

            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Publish a sticker
            </Typography>
            <Stack sx={{ gap: 1.5, p: 2, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
                <Stack sx={{ flexDirection: 'row', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
                    <Button component="label" startIcon={<UploadIcon />} sx={{ textTransform: 'none' }}>
                        {file ? file.name : 'Image'}
                        <input
                            hidden
                            type="file"
                            accept="image/*"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        />
                    </Button>
                    <ToggleButtonGroup size="small" exclusive value={tier} onChange={(_, v) => v && setTier(v)}>
                        <ToggleButton value="free" sx={{ textTransform: 'none' }}>
                            Free
                        </ToggleButton>
                        <ToggleButton value="coins" sx={{ textTransform: 'none' }}>
                            Paid
                        </ToggleButton>
                    </ToggleButtonGroup>
                    {tier === 'coins' && (
                        <TextField
                            size="small"
                            label="Price (Coins)"
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            sx={{ width: 130 }}
                        />
                    )}
                    <Button variant="contained" disabled={busy} onClick={publish} sx={{ textTransform: 'none' }}>
                        Publish
                    </Button>
                </Stack>
                <Stack sx={{ flexDirection: 'row', gap: 1, alignItems: 'center' }}>
                    <Chip size="small" label="70% revenue share" color="primary" />
                    <Typography variant="caption" color="text.secondary">
                        Requires a creator profile (Creator Studio). You earn 70% of every paid unlock.
                    </Typography>
                </Stack>
            </Stack>
        </Box>
    );
}
