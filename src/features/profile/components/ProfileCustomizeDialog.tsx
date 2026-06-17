/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ReactNode, useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Cosmetic, UserProfile, getCosmetics, saveCustomization } from '@/features/profile/ProfileCustomization.ts';
import { bannerSx, frameSx, nameEffectSx } from '@/features/profile/ProfileCosmetics.ts';
import { useBillingStore, ensurePremium } from '@/features/billing/Billing.ts';
import { makeToast } from '@/base/utils/Toast.ts';

const ACCENTS = ['#ec4899', '#7367f0', '#00e5ff', '#38ef7d', '#ffae00', '#ff5252', '#ffffff'];

const Swatch = ({
    selected,
    locked,
    onClick,
    children,
}: {
    selected: boolean;
    locked: boolean;
    onClick: () => void;
    children: ReactNode;
}) => (
    <Box
        onClick={onClick}
        sx={{
            position: 'relative',
            cursor: 'pointer',
            borderRadius: 2,
            p: 0.5,
            border: (theme) => `2px solid ${selected ? theme.palette.primary.main : 'transparent'}`,
            opacity: locked ? 0.55 : 1,
        }}
    >
        {children}
        {selected && (
            <CheckCircleIcon color="primary" sx={{ position: 'absolute', top: -6, right: -6, fontSize: 18 }} />
        )}
        {locked && <LockIcon sx={{ position: 'absolute', bottom: 4, right: 4, fontSize: 14, color: '#fff' }} />}
    </Box>
);

export const ProfileCustomizeDialog = ({
    open,
    profile,
    onClose,
    onSaved,
}: {
    open: boolean;
    profile: UserProfile;
    onClose: () => void;
    onSaved: () => void;
}) => {
    const isPremium = useBillingStore((s) => s.isPremium);
    const isAdmin = useBillingStore((s) => s.isAdmin);
    const entitled = isPremium || isAdmin;

    const [cosmetics, setCosmetics] = useState<Cosmetic[]>([]);
    const [bio, setBio] = useState(profile.bio ?? '');
    const [accent, setAccent] = useState(profile.accent_color ?? ACCENTS[0]);
    const [banner, setBanner] = useState(profile.banner_key);
    const [frame, setFrame] = useState(profile.avatar_frame_key);
    const [nameEffect, setNameEffect] = useState(profile.name_effect_key);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        getCosmetics().then(setCosmetics);
    }, []);

    const pick = (cosmetic: Cosmetic, setter: (k: string) => void) => {
        if (cosmetic.premium && !entitled) {
            ensurePremium('profile customization');
            return;
        }
        setter(cosmetic.key);
    };

    const banners = cosmetics.filter((c) => c.type === 'banner');
    const frames = cosmetics.filter((c) => c.type === 'frame');
    const effects = cosmetics.filter((c) => c.type === 'name_effect');

    const save = async () => {
        setBusy(true);
        try {
            const status = await saveCustomization({
                bio: bio.trim() || null,
                accentColor: accent,
                bannerKey: banner,
                avatarFrameKey: frame,
                nameEffectKey: nameEffect,
            });
            if (status === 'saved') {
                makeToast('Profile updated.', 'success');
                onSaved();
                onClose();
            } else if (status === 'premium_required') {
                ensurePremium('profile customization');
            } else {
                makeToast('Could not save your profile.', 'error');
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
            <DialogTitle sx={{ fontWeight: 800 }}>Customize profile</DialogTitle>
            <DialogContent dividers>
                <Stack sx={{ gap: 2.5 }}>
                    <TextField
                        label="Bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        multiline
                        minRows={2}
                        size="small"
                        fullWidth
                    />

                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                            Banner
                        </Typography>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(4, 1fr)' },
                                gap: 1,
                            }}
                        >
                            {banners.map((c) => (
                                <Swatch
                                    key={c.key}
                                    selected={banner === c.key}
                                    locked={c.premium && !entitled}
                                    onClick={() => pick(c, setBanner)}
                                >
                                    <Box sx={{ height: 44, borderRadius: 1.5, ...bannerSx(c.key) }} />
                                </Swatch>
                            ))}
                        </Box>
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                            Accent color
                        </Typography>
                        <Stack sx={{ flexDirection: 'row', gap: 1, flexWrap: 'wrap' }}>
                            {ACCENTS.map((color) => (
                                <Swatch
                                    key={color}
                                    selected={accent === color}
                                    locked={false}
                                    onClick={() => setAccent(color)}
                                >
                                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: color }} />
                                </Swatch>
                            ))}
                        </Stack>
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                            Avatar frame
                        </Typography>
                        <Stack sx={{ flexDirection: 'row', gap: 1, flexWrap: 'wrap' }}>
                            {frames.map((c) => (
                                <Swatch
                                    key={c.key}
                                    selected={frame === c.key}
                                    locked={c.premium && !entitled}
                                    onClick={() => pick(c, setFrame)}
                                >
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            backgroundColor: 'action.hover',
                                            ...frameSx(c.key),
                                        }}
                                    />
                                </Swatch>
                            ))}
                        </Stack>
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                            Name effect
                        </Typography>
                        <Stack sx={{ flexDirection: 'row', gap: 1.5, flexWrap: 'wrap' }}>
                            {effects.map((c) => (
                                <Swatch
                                    key={c.key}
                                    selected={nameEffect === c.key}
                                    locked={c.premium && !entitled}
                                    onClick={() => pick(c, setNameEffect)}
                                >
                                    <Typography sx={{ px: 1, fontWeight: 900, ...nameEffectSx(c.key, accent) }}>
                                        {c.name}
                                    </Typography>
                                </Swatch>
                            ))}
                        </Stack>
                    </Box>

                    {!entitled && (
                        <Typography variant="caption" color="text.secondary">
                            Locked styles are part of Nexus Premium.
                        </Typography>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    disabled={busy}
                    onClick={save}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};
