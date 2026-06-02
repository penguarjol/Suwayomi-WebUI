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
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import BrushIcon from '@mui/icons-material/Brush';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import {
    Creator,
    OriginalWork,
    becomeCreator,
    createWork,
    getMyCreatorProfile,
    getMyEarnings,
    listMyWorks,
} from '@/features/originals/Originals.ts';
import { CREATOR_TERMS, CREATOR_REVENUE_SHARE } from '@/features/originals/CreatorTerms.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';

const BecomeCreator = ({ onDone }: { onDone: () => void }) => {
    const [name, setName] = useState('');
    const [accepted, setAccepted] = useState(false);
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if (!name.trim() || !accepted) return;
        setBusy(true);
        try {
            await becomeCreator(name.trim());
            makeToast('Welcome, creator!', 'success');
            onDone();
        } catch (e) {
            makeToast('Could not register', 'error', getErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: 'auto' }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1 }}>
                <BrushIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    Become a Creator
                </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Publish your original manga, comics, and stories on Nexus Reads and earn{' '}
                <strong>{CREATOR_REVENUE_SHARE}% of every Coin</strong> readers spend to unlock your chapters.
            </Typography>

            <Box
                sx={{
                    maxHeight: 280,
                    overflowY: 'auto',
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.02)',
                    whiteSpace: 'pre-line',
                }}
            >
                <Typography variant="body2" color="text.secondary">
                    {CREATOR_TERMS}
                </Typography>
            </Box>

            <TextField
                fullWidth
                label="Creator / pen name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ mb: 2 }}
            />
            <FormControlLabel
                control={<Checkbox checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />}
                label="I own or have the rights to everything I publish, and I accept the Creator Agreement above."
            />
            <Box sx={{ mt: 2 }}>
                <Button
                    variant="contained"
                    disabled={busy || !name.trim() || !accepted}
                    onClick={submit}
                    sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                >
                    Agree & start creating
                </Button>
            </Box>
        </Box>
    );
};

export function CreatorStudio() {
    useAppTitle('Creator Studio');
    const [creator, setCreator] = useState<Creator | null>(null);
    const [works, setWorks] = useState<OriginalWork[]>([]);
    const [earnings, setEarnings] = useState(0);
    const [loading, setLoading] = useState(true);

    // create-work form
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [contentType, setContentType] = useState<OriginalWork['content_type']>('manga');
    const [isMature, setIsMature] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        const profile = await getMyCreatorProfile();
        setCreator(profile);
        if (profile) {
            const [w, e] = await Promise.all([listMyWorks(), getMyEarnings()]);
            setWorks(w);
            setEarnings(e.total);
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const submitWork = async () => {
        if (!title.trim()) return;
        setBusy(true);
        try {
            await createWork({
                title: title.trim(),
                description: description.trim(),
                content_type: contentType,
                is_mature: isMature,
            });
            setTitle('');
            setDescription('');
            load();
        } catch (e) {
            makeToast('Could not create work', 'error', getErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <LoadingPlaceholder />;
    if (!creator) return <BecomeCreator onDone={load} />;

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 820, mx: 'auto' }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <BrushIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 900, flexGrow: 1 }}>
                    Creator Studio
                </Typography>
                <Chip
                    icon={<MonetizationOnIcon />}
                    color="primary"
                    label={`${earnings} Coins earned`}
                    sx={{ fontWeight: 700 }}
                />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {creator.display_name} · {creator.revenue_share}% revenue share. Earnings are credited to your Coin
                balance.
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                New work
            </Typography>
            <Stack sx={{ gap: 1.5, p: 2, mb: 3, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
                <TextField size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <TextField
                    size="small"
                    label="Description"
                    multiline
                    minRows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                <Stack sx={{ flexDirection: 'row', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        size="small"
                        select
                        label="Type"
                        value={contentType}
                        onChange={(e) => setContentType(e.target.value as OriginalWork['content_type'])}
                        sx={{ width: 150 }}
                    >
                        <MenuItem value="manga">Manga</MenuItem>
                        <MenuItem value="comic">Comic</MenuItem>
                        <MenuItem value="novel">Novel</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                    </TextField>
                    <FormControlLabel
                        control={<Checkbox checked={isMature} onChange={(e) => setIsMature(e.target.checked)} />}
                        label="Mature (18+)"
                    />
                    <Button
                        variant="contained"
                        disabled={busy || !title.trim()}
                        onClick={submitWork}
                        sx={{ textTransform: 'none' }}
                    >
                        Create
                    </Button>
                </Stack>
            </Stack>

            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                My works
            </Typography>
            <Stack sx={{ gap: 1 }}>
                {works.map((work) => (
                    <Stack
                        key={work.id}
                        component={Link}
                        to={AppRoutes.studioWork.path(work.id)}
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
                        <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>{work.title}</Typography>
                        <Chip
                            size="small"
                            label={work.status}
                            color={work.status === 'published' ? 'success' : 'default'}
                        />
                    </Stack>
                ))}
                {!works.length && (
                    <Typography color="text.secondary">No works yet — create your first above.</Typography>
                )}
            </Stack>

            <Divider sx={{ my: 3 }} />
            <Typography variant="caption" color="text.secondary">
                Payouts of earned Coins to cash are coming soon; see the Creator Agreement for details.
            </Typography>
        </Box>
    );
}
