/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ReactNode, useEffect, useRef, useState } from 'react';
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
import {
    Cosmetic,
    UserProfile,
    checkUsernameAvailable,
    getBadgeCatalog,
    getCosmetics,
    getEarnedBadges,
    getMyUsername,
    saveCustomization,
    setUsername as saveUsername,
} from '@/features/profile/ProfileCustomization.ts';
import {
    AvatarPreset,
    clearMyAvatar,
    getAvatarPresets,
    invalidatePublicProfile,
    uploadAvatar,
} from '@/features/profile/PublicProfile.ts';
import { bannerSx, frameSx, nameEffectSx } from '@/features/profile/ProfileCosmetics.ts';
import { useBillingStore, ensurePremium } from '@/features/billing/Billing.ts';
import { makeToast } from '@/base/utils/Toast.ts';

const ACCENTS = ['#ec4899', '#7367f0', '#00e5ff', '#38ef7d', '#ffae00', '#ff5252', '#ffffff'];
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

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
    const [presets, setPresets] = useState<AvatarPreset[]>([]);
    const [earnedKeys, setEarnedKeys] = useState<Set<string>>(new Set());
    const [username, setUsernameVal] = useState('');
    const [originalUsername, setOriginalUsername] = useState('');
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [bio, setBio] = useState(profile.bio ?? '');
    const [accent, setAccent] = useState(profile.accent_color ?? ACCENTS[0]);
    const [banner, setBanner] = useState(profile.banner_key);
    const [frame, setFrame] = useState(profile.avatar_frame_key);
    const [nameEffect, setNameEffect] = useState(profile.name_effect_key);
    const [preset, setPreset] = useState<string | null>(profile.avatar_preset ?? null);
    const [flair, setFlair] = useState<string | null>(profile.flair_key ?? null);
    const [hasPhoto, setHasPhoto] = useState(!!profile.avatar_path);
    const [busy, setBusy] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getCosmetics().then(setCosmetics);
        getAvatarPresets().then(setPresets);
        getMyUsername().then((u) => {
            setUsernameVal(u ?? '');
            setOriginalUsername(u ?? '');
        });
        Promise.all([getBadgeCatalog(), getEarnedBadges(profile.user_id)]).then(([catalog, earned]) => {
            const earnedIds = new Set(earned.map((e) => e.badge_id));
            setEarnedKeys(new Set(catalog.filter((b) => earnedIds.has(b.id)).map((b) => b.key)));
        });
    }, [profile.user_id]);

    // Debounced username availability check.
    useEffect(() => {
        const v = username.trim();
        if (!v || v === originalUsername) {
            setUsernameAvailable(null);
            return undefined;
        }
        if (!USERNAME_RE.test(v)) {
            setUsernameAvailable(false);
            return undefined;
        }
        let active = true;
        const timer = setTimeout(() => {
            checkUsernameAvailable(v).then((ok) => {
                if (active) setUsernameAvailable(ok);
            });
        }, 350);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [username, originalUsername]);

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
    const flairs = cosmetics.filter((c) => c.type === 'flair');

    const flairUnlocked = (c: Cosmetic) => !c.required_badge_key || earnedKeys.has(c.required_badge_key);

    const usernameUnchanged = username.trim() === originalUsername;
    let usernameHelp = '3–20 letters, numbers, or underscores. Unique across Nexus.';
    if (!usernameUnchanged) {
        if (usernameAvailable === false) usernameHelp = 'Not available';
        else if (usernameAvailable) usernameHelp = 'Available';
        else usernameHelp = 'Checking…';
    }

    const onPickPhoto = async (file: File | undefined) => {
        if (!file) return;
        setBusy(true);
        try {
            const status = await uploadAvatar(file);
            if (status === 'saved') {
                setHasPhoto(true);
                setPreset(null);
                makeToast('Profile picture updated.', 'success');
                onSaved();
            } else {
                makeToast('Could not upload that image.', 'error');
            }
        } finally {
            setBusy(false);
        }
    };

    const onRemovePhoto = async () => {
        setBusy(true);
        try {
            await clearMyAvatar();
            setHasPhoto(false);
            makeToast('Profile picture removed.', 'info');
            onSaved();
        } finally {
            setBusy(false);
        }
    };

    const save = async () => {
        setBusy(true);
        try {
            const wantUsername = username.trim();
            if (wantUsername && wantUsername !== originalUsername) {
                const us = await saveUsername(wantUsername);
                if (us === 'taken') {
                    makeToast('That username is taken.', 'error');
                    return;
                }
                if (us === 'invalid') {
                    makeToast('Username must be 3–20 letters, numbers, or underscores.', 'error');
                    return;
                }
                if (us !== 'saved') {
                    makeToast('Could not save username.', 'error');
                    return;
                }
                setOriginalUsername(wantUsername);
            }
            const status = await saveCustomization({
                bio: bio.trim() || null,
                accentColor: accent,
                bannerKey: banner,
                avatarFrameKey: frame,
                nameEffectKey: nameEffect,
                avatarPreset: preset,
                flairKey: flair,
            });
            if (status === 'saved') {
                invalidatePublicProfile(profile.user_id);
                makeToast('Profile updated.', 'success');
                onSaved();
                onClose();
            } else if (status === 'premium_required') {
                ensurePremium('profile customization');
            } else if (status === 'locked') {
                makeToast('Earn the achievement to use that flair.', 'warning');
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
                        label="Username"
                        value={username}
                        onChange={(e) => setUsernameVal(e.target.value)}
                        size="small"
                        fullWidth
                        error={!usernameUnchanged && usernameAvailable === false}
                        helperText={usernameHelp}
                    />

                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                            Profile picture
                        </Typography>
                        <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1 }}>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) => onPickPhoto(e.target.files?.[0])}
                            />
                            <Button
                                size="small"
                                variant="outlined"
                                disabled={busy}
                                onClick={() => fileRef.current?.click()}
                                sx={{ textTransform: 'none' }}
                            >
                                {hasPhoto ? 'Change photo' : 'Upload photo'}
                            </Button>
                            {hasPhoto && (
                                <Button
                                    size="small"
                                    color="inherit"
                                    disabled={busy}
                                    onClick={onRemovePhoto}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Remove
                                </Button>
                            )}
                        </Stack>
                        {!hasPhoto && (
                            <Stack sx={{ flexDirection: 'row', gap: 1, flexWrap: 'wrap' }}>
                                <Swatch selected={!preset} locked={false} onClick={() => setPreset(null)}>
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            display: 'grid',
                                            placeItems: 'center',
                                            backgroundColor: 'primary.main',
                                            color: '#fff',
                                            fontWeight: 800,
                                        }}
                                    >
                                        A
                                    </Box>
                                </Swatch>
                                {presets.map((p) => (
                                    <Swatch
                                        key={p.key}
                                        selected={preset === p.key}
                                        locked={p.premium && !entitled}
                                        onClick={() => {
                                            if (p.premium && !entitled) {
                                                ensurePremium('preset avatars');
                                                return;
                                            }
                                            setPreset(p.key);
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                display: 'grid',
                                                placeItems: 'center',
                                                fontSize: 22,
                                                background: p.bg,
                                            }}
                                        >
                                            {p.emoji}
                                        </Box>
                                    </Swatch>
                                ))}
                            </Stack>
                        )}
                    </Box>

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

                    {flairs.length > 0 && (
                        <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                Achievement flair
                            </Typography>
                            <Stack sx={{ flexDirection: 'row', gap: 1, flexWrap: 'wrap' }}>
                                <Swatch selected={!flair} locked={false} onClick={() => setFlair(null)}>
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            display: 'grid',
                                            placeItems: 'center',
                                            backgroundColor: 'action.hover',
                                            fontSize: 12,
                                        }}
                                    >
                                        None
                                    </Box>
                                </Swatch>
                                {flairs.map((c) => {
                                    const unlocked = flairUnlocked(c);
                                    return (
                                        <Swatch
                                            key={c.key}
                                            selected={flair === c.key}
                                            locked={!unlocked}
                                            onClick={() => {
                                                if (!unlocked) {
                                                    makeToast('Earn the achievement to unlock this flair.', 'info');
                                                    return;
                                                }
                                                setFlair(c.key);
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '50%',
                                                    display: 'grid',
                                                    placeItems: 'center',
                                                    backgroundColor: 'action.hover',
                                                    fontSize: 22,
                                                }}
                                            >
                                                {c.icon ?? '⭐'}
                                            </Box>
                                        </Swatch>
                                    );
                                })}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                                Flair appears on your avatar across the app. Unlock more by earning achievements.
                            </Typography>
                        </Box>
                    )}

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
