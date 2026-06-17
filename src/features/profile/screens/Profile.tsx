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
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import ForumIcon from '@mui/icons-material/Forum';
import BrushIcon from '@mui/icons-material/Brush';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import GroupIcon from '@mui/icons-material/Group';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import StorefrontIcon from '@mui/icons-material/Storefront';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import RedeemIcon from '@mui/icons-material/Redeem';
import SettingsIcon from '@mui/icons-material/Settings';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import EditIcon from '@mui/icons-material/Edit';
import Tooltip from '@mui/material/Tooltip';
import { supabase } from '@/lib/SupabaseClient.ts';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { Collection, getMyCollections } from '@/features/marketplace/Marketplace.ts';
import { Thread, getMyThreads } from '@/features/social/Forum.ts';
import { Creator, getMyCreatorProfile } from '@/features/originals/Originals.ts';
import { getMyStreak } from '@/features/library/services/UserProgress.ts';
import {
    Badge,
    UserProfile,
    getBadgeCatalog,
    getEarnedBadges,
    getUserProfile,
    syncMyAchievements,
} from '@/features/profile/ProfileCustomization.ts';
import { bannerSx, nameEffectSx } from '@/features/profile/ProfileCosmetics.ts';
import { ProfileCustomizeDialog } from '@/features/profile/components/ProfileCustomizeDialog.tsx';
import { UserAvatar } from '@/features/profile/components/UserAvatar.tsx';
import { PublicProfile } from '@/features/profile/PublicProfile.ts';
import { ListItemLink } from '@/base/components/lists/ListItemLink.tsx';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';

const DISCORD_INVITE = (import.meta.env.VITE_DISCORD_INVITE as string | undefined) || 'https://discord.gg/AU75Gnreh';

const logout = async () => {
    try {
        await supabase.auth.signOut();
    } catch {
        /* ensure local cleanup regardless */
    } finally {
        localStorage.clear();
        sessionStorage.clear();
        requestManager.reset();
        window.location.href = AppRoutes.root.path;
    }
};

export function Profile() {
    useAppTitle('Profile');
    const tokens = useBillingStore((state) => state.tokens);
    const isPremium = useBillingStore((state) => state.isPremium);
    const isAdmin = useBillingStore((state) => state.isAdmin);

    const [email, setEmail] = useState('');
    const [userId, setUserId] = useState('');
    const [creator, setCreator] = useState<Creator | null>(null);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [threads, setThreads] = useState<Thread[]>([]);
    const [streak, setStreak] = useState(0);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [badgeCatalog, setBadgeCatalog] = useState<Badge[]>([]);
    const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());
    const [customizeOpen, setCustomizeOpen] = useState(false);

    const loadProfileCosmetics = async (uid: string) => {
        // Auto-award any newly-qualified achievements, then load profile + badges.
        await syncMyAchievements();
        const [p, catalog, earned] = await Promise.all([getUserProfile(uid), getBadgeCatalog(), getEarnedBadges(uid)]);
        setProfile(p);
        setBadgeCatalog(catalog);
        setEarnedIds(new Set(earned.map((b) => b.badge_id)));
    };

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setEmail(data.user?.email ?? '');
            const uid = data.user?.id ?? '';
            setUserId(uid);
            if (uid) loadProfileCosmetics(uid).catch(() => {});
        });
        getMyStreak()
            .then((s) => setStreak(s.current))
            .catch(() => setStreak(0));
        getMyCreatorProfile()
            .then(setCreator)
            .catch(() => setCreator(null));
        getMyCollections()
            .then(setCollections)
            .catch(() => setCollections([]));
        getMyThreads(20)
            .then(setThreads)
            .catch(() => setThreads([]));
    }, []);

    const name = creator?.display_name || (email ? email.split('@')[0] : 'reader');
    const bannerKey = profile?.banner_key ?? 'default';
    const frameKey = profile?.avatar_frame_key ?? 'none';
    const effectKey = profile?.name_effect_key ?? 'none_effect';
    const accent = profile?.accent_color ?? undefined;
    const earnedBadges = badgeCatalog.filter((badge) => earnedIds.has(badge.id));

    // Build the caller's public identity locally (premium/admin from the billing
    // store) so the avatar shows the crown/admin badge/flair without a fetch.
    const ownPublic: PublicProfile = {
        user_id: '',
        display_name: name,
        avatar_path: profile?.avatar_path ?? null,
        avatar_preset: profile?.avatar_preset ?? null,
        avatar_frame_key: frameKey,
        name_effect_key: effectKey,
        accent_color: accent ?? null,
        flair_key: profile?.flair_key ?? null,
        title: isAdmin ? 'Admin' : null,
        is_premium: isPremium,
        is_admin: isAdmin,
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 760, mx: 'auto', overflowX: 'hidden' }}>
            {/* Customizable banner */}
            <Box sx={{ position: 'relative', height: { xs: 104, sm: 120 }, borderRadius: 3, ...bannerSx(bannerKey) }}>
                <Button
                    onClick={() => setCustomizeOpen(true)}
                    size="small"
                    startIcon={<EditIcon />}
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        textTransform: 'none',
                        fontWeight: 700,
                        color: '#fff',
                        backgroundColor: 'rgba(0,0,0,0.35)',
                        backdropFilter: 'blur(6px)',
                        minWidth: { xs: 0, sm: 64 },
                        px: { xs: 1, sm: 2 },
                        '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.5)' },
                    }}
                >
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                        Customize
                    </Box>
                </Button>
            </Box>

            {/* Avatar + name overlapping the banner */}
            <Stack
                sx={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    gap: { xs: 1.5, sm: 2 },
                    mt: { xs: -4, sm: -5 },
                    mb: 1,
                    px: 1,
                }}
            >
                <UserAvatar profile={ownPublic} name={name} size={76} />
                <Box sx={{ flexGrow: 1, minWidth: 0, pb: 0.5 }}>
                    <Typography
                        variant="h5"
                        noWrap
                        sx={{
                            fontWeight: 900,
                            fontSize: { xs: '1.25rem', sm: '1.5rem' },
                            display: 'block',
                            maxWidth: '100%',
                            ...nameEffectSx(effectKey, accent),
                        }}
                    >
                        {name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {email}
                    </Typography>
                </Box>
            </Stack>

            {profile?.bio && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {profile.bio}
                </Typography>
            )}

            <Stack sx={{ flexDirection: 'row', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                <Chip
                    size="small"
                    icon={<MonetizationOnIcon />}
                    label={`${tokens} Coins`}
                    color="primary"
                    sx={{ fontWeight: 700 }}
                />
                {isPremium && <Chip size="small" icon={<WorkspacePremiumIcon />} label="Premium" color="secondary" />}
                {streak > 0 && (
                    <Chip
                        size="small"
                        icon={<LocalFireDepartmentIcon />}
                        label={`${streak}-day streak`}
                        color="warning"
                        sx={{ fontWeight: 700 }}
                    />
                )}
                {creator && <Chip size="small" icon={<BrushIcon />} label="Creator" variant="outlined" />}
                {isAdmin && <Chip size="small" label="Admin" variant="outlined" />}
            </Stack>

            {earnedBadges.length > 0 && (
                <Stack sx={{ flexDirection: 'row', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    {earnedBadges.map((badge) => (
                        <Tooltip key={badge.id} title={badge.description ?? badge.name}>
                            <Chip size="small" variant="outlined" label={`${badge.icon ?? '🏅'} ${badge.name}`} />
                        </Tooltip>
                    ))}
                </Stack>
            )}

            {customizeOpen && (
                <ProfileCustomizeDialog
                    open={customizeOpen}
                    profile={
                        profile ?? {
                            user_id: userId,
                            bio: null,
                            accent_color: null,
                            banner_key: 'default',
                            avatar_frame_key: 'none',
                            name_effect_key: 'none_effect',
                            avatar_path: null,
                            avatar_preset: null,
                            flair_key: null,
                        }
                    }
                    onClose={() => setCustomizeOpen(false)}
                    onSaved={() => {
                        if (userId) loadProfileCosmetics(userId).catch(() => {});
                    }}
                />
            )}

            <List sx={{ mb: 1 }}>
                <ListItemLink to={AppRoutes.feed.path}>
                    <ListItemIcon>
                        <RssFeedIcon />
                    </ListItemIcon>
                    <ListItemText primary="New chapters" secondary="From creators you follow" />
                </ListItemLink>
                <ListItemLink to={AppRoutes.following.path}>
                    <ListItemIcon>
                        <GroupIcon />
                    </ListItemIcon>
                    <ListItemText primary="Following" secondary="Activity from readers you follow" />
                </ListItemLink>
                <ListItemLink to={AppRoutes.leaderboard.path}>
                    <ListItemIcon>
                        <LeaderboardIcon />
                    </ListItemIcon>
                    <ListItemText primary="Leaderboard" secondary="Top readers this week" />
                </ListItemLink>
                <ListItemLink to={AppRoutes.challenges.path}>
                    <ListItemIcon>
                        <EmojiEventsIcon />
                    </ListItemIcon>
                    <ListItemText primary="Challenges" secondary="Goals with rewards" />
                </ListItemLink>
                <ListItemButton component="a" href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer">
                    <ListItemIcon>
                        <ForumIcon />
                    </ListItemIcon>
                    <ListItemText primary="Join our Discord" secondary="Chat with readers & creators" />
                </ListItemButton>
                <ListItemLink to={AppRoutes.studio.path}>
                    <ListItemIcon>
                        <BrushIcon />
                    </ListItemIcon>
                    <ListItemText primary="Creator Studio" secondary="Publish & manage your Originals" />
                </ListItemLink>
                <ListItemLink to={AppRoutes.marketplace.path}>
                    <ListItemIcon>
                        <StorefrontIcon />
                    </ListItemIcon>
                    <ListItemText primary="Marketplace" />
                </ListItemLink>
                <ListItemLink to={AppRoutes.store.path}>
                    <ListItemIcon>
                        <MonetizationOnIcon />
                    </ListItemIcon>
                    <ListItemText primary="Get Coins" />
                </ListItemLink>
                <ListItemLink to={AppRoutes.earn.path}>
                    <ListItemIcon>
                        <RedeemIcon />
                    </ListItemIcon>
                    <ListItemText primary="Earn Coins" />
                </ListItemLink>
                {isAdmin && (
                    <ListItemLink to={AppRoutes.admin.path}>
                        <ListItemIcon>
                            <AdminPanelSettingsIcon />
                        </ListItemIcon>
                        <ListItemText primary="Admin Console" />
                    </ListItemLink>
                )}
                <ListItemLink to={AppRoutes.settings.path}>
                    <ListItemIcon>
                        <SettingsIcon />
                    </ListItemIcon>
                    <ListItemText primary="Settings" />
                </ListItemLink>
            </List>

            {badgeCatalog.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <Stack sx={{ flexDirection: 'row', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                            Achievements
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {`${earnedBadges.length} / ${badgeCatalog.length}`}
                        </Typography>
                    </Stack>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
                            gap: 1,
                        }}
                    >
                        {badgeCatalog.map((badge) => {
                            const earned = earnedIds.has(badge.id);
                            return (
                                <Stack
                                    key={badge.id}
                                    sx={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 1,
                                        p: 1.25,
                                        borderRadius: 2,
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        opacity: earned ? 1 : 0.45,
                                        filter: earned ? 'none' : 'grayscale(1)',
                                    }}
                                >
                                    <Box sx={{ fontSize: 22, lineHeight: 1 }}>{badge.icon ?? '🏅'}</Box>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                                            {badge.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" noWrap>
                                            {earned ? 'Unlocked' : (badge.description ?? 'Locked')}
                                        </Typography>
                                    </Box>
                                </Stack>
                            );
                        })}
                    </Box>
                </Box>
            )}

            {collections.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                        My Collections
                    </Typography>
                    <Stack sx={{ gap: 1 }}>
                        {collections.map((collection) => (
                            <Box
                                key={collection.id}
                                component={Link}
                                to={AppRoutes.collection.path(collection.id)}
                                sx={{
                                    p: 1.25,
                                    borderRadius: 2,
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    display: 'block',
                                }}
                            >
                                <Typography sx={{ fontWeight: 700 }} noWrap>
                                    {collection.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {collection.like_count} likes
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            )}

            {threads.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                        My Discussions
                    </Typography>
                    <Stack sx={{ gap: 1 }}>
                        {threads.map((thread) => (
                            <Box
                                key={thread.id}
                                component={Link}
                                to={AppRoutes.thread.path(thread.id)}
                                sx={{
                                    p: 1.25,
                                    borderRadius: 2,
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    display: 'block',
                                }}
                            >
                                <Typography sx={{ fontWeight: 700 }} noWrap>
                                    {thread.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {thread.reply_count} replies · {thread.like_count} likes
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            )}

            <Divider sx={{ my: 2 }} />
            <Button
                fullWidth
                color="error"
                startIcon={<LogoutIcon />}
                onClick={logout}
                sx={{ textTransform: 'none', fontWeight: 700, justifyContent: 'flex-start' }}
            >
                Log Out
            </Button>
        </Box>
    );
}
