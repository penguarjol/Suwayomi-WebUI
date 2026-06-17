/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { frameSx } from '@/features/profile/ProfileCosmetics.ts';
import {
    avatarUrlFromPath,
    PublicProfile,
    useAvatarPresetMap,
    useFlairMap,
    usePublicProfile,
} from '@/features/profile/PublicProfile.ts';

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
}: UserAvatarProps) => {
    const resolved = usePublicProfile(profileProp ? null : userId);
    const profile = profileProp ?? resolved;
    const presetMap = useAvatarPresetMap();
    const flairMap = useFlairMap();

    const displayName = profile?.display_name || name || '';
    const initial = (displayName || '?').charAt(0).toUpperCase();
    const photoUrl = avatarUrlFromPath(profile?.avatar_path);
    const preset = profile?.avatar_preset ? presetMap.get(profile.avatar_preset) : undefined;
    const frameKey = showFrame ? (profile?.avatar_frame_key ?? 'none') : 'none';
    const flair = profile?.flair_key ? flairMap.get(profile.flair_key) : undefined;
    const isAdmin = !!profile?.is_admin;
    const isPremium = !!profile?.is_premium;

    const overlay = Math.max(14, Math.round(size * 0.42));

    return (
        <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
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
        </Box>
    );
};
