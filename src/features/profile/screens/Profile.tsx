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
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import BrushIcon from '@mui/icons-material/Brush';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import StorefrontIcon from '@mui/icons-material/Storefront';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import RedeemIcon from '@mui/icons-material/Redeem';
import SettingsIcon from '@mui/icons-material/Settings';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { supabase } from '@/lib/SupabaseClient.ts';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { Collection, getMyCollections } from '@/features/marketplace/Marketplace.ts';
import { Thread, getMyThreads } from '@/features/social/Forum.ts';
import { Creator, getMyCreatorProfile } from '@/features/originals/Originals.ts';
import { getMyStreak } from '@/features/library/services/UserProgress.ts';
import { ListItemLink } from '@/base/components/lists/ListItemLink.tsx';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';

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
    const [creator, setCreator] = useState<Creator | null>(null);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [threads, setThreads] = useState<Thread[]>([]);
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
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

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 760, mx: 'auto' }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ width: 64, height: 64, fontSize: 28, bgcolor: 'primary.main' }}>
                    {name[0]?.toUpperCase()}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="h5" sx={{ fontWeight: 900 }} noWrap>
                        {name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                        {email}
                    </Typography>
                    <Stack sx={{ flexDirection: 'row', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        <Chip
                            size="small"
                            icon={<MonetizationOnIcon />}
                            label={`${tokens} Coins`}
                            color="primary"
                            sx={{ fontWeight: 700 }}
                        />
                        {isPremium && (
                            <Chip size="small" icon={<WorkspacePremiumIcon />} label="Premium" color="secondary" />
                        )}
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
                </Box>
            </Stack>

            <List sx={{ mb: 1 }}>
                <ListItemLink to={AppRoutes.feed.path}>
                    <ListItemIcon>
                        <RssFeedIcon />
                    </ListItemIcon>
                    <ListItemText primary="Following" secondary="New chapters from creators you follow" />
                </ListItemLink>
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
