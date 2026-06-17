/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { frameSx } from '@/features/profile/ProfileCosmetics.ts';
import {
    avatarUrlFromPath,
    PublicProfile,
    reportAvatar,
    useAvatarPresetMap,
    useFlairMap,
    useMyUserId,
    usePublicProfile,
} from '@/features/profile/PublicProfile.ts';
import { makeToast } from '@/base/utils/Toast.ts';

interface UserAvatarProps {
    /** Resolve identity from this user id (batched/cached). */
    userId?: string | null;
    /** Or pass an already-resolved profile to avoid a fetch. */
    profile?: PublicProfile;
    /** Fallback display name (for the initial) when no profile is available. */
    name?: string;
    size?: number;
    showFrame?: boolean;
    /** Premium crown / admin badge / achievement flair overlays. */
    showOverlays?: boolean;
    /** Allow reporting another user's uploaded photo (click → "Report picture"). */
    enableReport?: boolean;
}

/**
 * The single way a user's identity is rendered across the app: uploaded photo →
 * preset avatar → initial, with the equipped frame and composited overlays
 * (admin badge wins over premium crown; equipped achievement flair). Other users'
 * data comes from the RLS-safe get_public_profiles resolver.
 */
export const UserAvatar = ({
    userId,
    profile: profileProp,
    name,
    size = 40,
    showFrame = true,
    showOverlays = true,
    enableReport = false,
}: UserAvatarProps) => {
    const resolved = usePublicProfile(profileProp ? null : userId);
    const profile = profileProp ?? resolved;
    const presetMap = useAvatarPresetMap();
    const flairMap = useFlairMap();
    const myId = useMyUserId();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const displayName = profile?.display_name || name || '';
    const initial = (displayName || '?').charAt(0).toUpperCase();
    const photoUrl = avatarUrlFromPath(profile?.avatar_path);
    const preset = profile?.avatar_preset ? presetMap.get(profile.avatar_preset) : undefined;
    const frameKey = showFrame ? (profile?.avatar_frame_key ?? 'none') : 'none';
    const flair = profile?.flair_key ? flairMap.get(profile.flair_key) : undefined;
    const isAdmin = !!profile?.is_admin;
    const isPremium = !!profile?.is_premium;
    // Only an uploaded photo (not a preset/initial) of another user is reportable.
    const reportable = enableReport && !!userId && userId !== myId && !!profile?.avatar_path;

    const overlay = Math.max(14, Math.round(size * 0.42));

    const report = async () => {
        setMenuAnchor(null);
        if (!userId) return;
        await reportAvatar(userId, 'reported from avatar');
        makeToast('Thanks — our team will review this picture.', 'success');
    };

    return (
        <Box
            sx={{
                position: 'relative',
                width: size,
                height: size,
                flexShrink: 0,
                cursor: reportable ? 'pointer' : 'default',
            }}
            onClick={reportable ? (e) => setMenuAnchor(e.currentTarget) : undefined}
        >
            <Avatar
                src={photoUrl || undefined}
                sx={{
                    width: size,
                    height: size,
                    fontSize: size * 0.42,
                    fontWeight: 800,
                    bgcolor: 'primary.main',
                    boxSizing: 'border-box',
                    ...(preset && !photoUrl ? { background: preset.bg } : {}),
                    ...frameSx(frameKey),
                }}
            >
                {preset && !photoUrl ? (
                    <Box component="span" sx={{ fontSize: size * 0.55 }}>
                        {preset.emoji}
                    </Box>
                ) : (
                    initial
                )}
            </Avatar>

            {showOverlays && (isAdmin || isPremium) && (
                <Tooltip title={isAdmin ? 'Admin' : 'Premium'}>
                    <Box
                        sx={{
                            position: 'absolute',
                            right: -2,
                            bottom: -2,
                            width: overlay,
                            height: overlay,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: isAdmin ? 'error.main' : 'secondary.main',
                            color: '#fff',
                            border: '2px solid',
                            borderColor: 'background.paper',
                        }}
                    >
                        {isAdmin ? (
                            <AdminPanelSettingsIcon sx={{ fontSize: overlay * 0.7 }} />
                        ) : (
                            <WorkspacePremiumIcon sx={{ fontSize: overlay * 0.7 }} />
                        )}
                    </Box>
                </Tooltip>
            )}

            {showOverlays && flair?.icon && (
                <Tooltip title={flair.name}>
                    <Box sx={{ position: 'absolute', left: -3, top: -3, fontSize: overlay * 0.95, lineHeight: 1 }}>
                        {flair.icon}
                    </Box>
                </Tooltip>
            )}

            {reportable && (
                <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
                    <MenuItem onClick={report}>Report picture</MenuItem>
                </Menu>
            )}
        </Box>
    );
};
