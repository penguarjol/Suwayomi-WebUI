/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { supabase } from '@/lib/SupabaseClient.ts';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { isSetupComplete, useSourcePrefs } from '@/features/source/services/SourcePreferences.ts';
import { useSaasSourceAccess } from '@/features/source/services/SourceAccess.ts';

/**
 * First-run source setup — a compact, unskippable modal shown once after login.
 * Nexus is a reader, not a content provider: the user explicitly chooses which
 * independent third-party sources to enable, with a consent acknowledgement,
 * before any are shown (ADR-0011). NSFW and non-allow-listed sources are excluded
 * by `useSaasSourceAccess`. Admins skip this (they curate the allow-list).
 *
 * The confirm action is gated ONLY on the consent checkbox, never on the source
 * list finishing loading, so a slow/failed source fetch can never trap the user.
 */
export const SourceSetupWizard = () => {
    const isAuthenticated = AuthManager.useIsAuthenticated();
    const isAdmin = useBillingStore((state) => state.isAdmin);
    const profileLoaded = useBillingStore((state) => state.loaded);
    const completeSetup = useSourcePrefs((state) => state.completeSetup);

    // Resolve the current user fresh (handles account switches in the same tab)
    // and check PER-USER setup state, so a new account always sees the wizard.
    const [uid, setUid] = useState<string | null>(null);
    const [done, setDone] = useState(true);
    useEffect(() => {
        let active = true;
        supabase.auth.getUser().then(({ data }) => {
            if (!active) return;
            const id = data.user?.id ?? null;
            setUid(id);
            setDone(id ? isSetupComplete(id) : true);
        });
        return () => {
            active = false;
        };
    }, [isAuthenticated]);

    const needsSetup = isAuthenticated && profileLoaded && !isAdmin && !!uid && !done;

    const { ready, isAllowed } = useSaasSourceAccess();
    // Fetch the source list once (cache-first) only while the wizard is open, so
    // it never loops on re-render.
    const { data, loading } = requestManager.useGetSourceList({
        skip: !needsSetup,
        fetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: false,
    });

    const selectable = useMemo(() => {
        const nodes = data?.sources?.nodes ?? [];
        const seen = new Set<string>();
        return nodes
            .filter((source) => isAllowed(source))
            .filter((source) => {
                const key = String(source.id);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .map((source) => ({
                id: String(source.id),
                name: source.displayName ?? source.name,
                lang: source.lang,
                iconUrl: source.iconUrl,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [data, isAllowed]);

    const [selected, setSelected] = useState<Set<string> | null>(null);
    const [consented, setConsented] = useState(false);
    const [query, setQuery] = useState('');

    // Default to all selectable enabled once the list arrives; the user can deselect.
    useEffect(() => {
        if (selected === null && selectable.length > 0) {
            setSelected(new Set(selectable.map((source) => source.id)));
        }
    }, [selectable, selected]);

    const allIds = useMemo(() => selectable.map((source) => source.id), [selectable]);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return selectable;
        return selectable.filter((source) => source.name.toLowerCase().includes(q));
    }, [selectable, query]);

    if (!needsSetup) return null;

    const listLoading = (!ready || loading) && selectable.length === 0;
    const selectedCount = selected?.size ?? 0;

    const toggle = (id: string) =>
        setSelected((prev) => {
            const next = new Set(prev ?? []);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const finish = () => {
        if (uid) completeSetup(uid, [...(selected ?? new Set<string>())], allIds);
        setDone(true);
    };

    let listContent: JSX.Element;
    if (listLoading) {
        listContent = (
            <Stack sx={{ alignItems: 'center', gap: 1, py: 3 }}>
                <CircularProgress size={24} />
                <Typography variant="caption" color="text.secondary">
                    Loading sources… you can continue below either way.
                </Typography>
            </Stack>
        );
    } else if (selectable.length === 0) {
        listContent = (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                No sources are available to pick yet. You can continue and enable sources later under Manage sources.
            </Typography>
        );
    } else {
        listContent = (
            <List dense sx={{ maxHeight: 300, overflowY: 'auto', py: 0 }}>
                {filtered.map((source) => {
                    const checked = selected?.has(source.id) ?? false;
                    return (
                        <ListItemButton
                            key={source.id}
                            onClick={() => toggle(source.id)}
                            selected={checked}
                            sx={{ borderRadius: 1.5, mb: 0.25 }}
                        >
                            <Checkbox edge="start" tabIndex={-1} disableRipple checked={checked} />
                            <ListItemAvatar sx={{ minWidth: 42 }}>
                                <Avatar src={source.iconUrl} variant="rounded" sx={{ width: 28, height: 28 }}>
                                    <AutoStoriesIcon fontSize="small" />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={source.name}
                                secondary={source.lang?.toUpperCase()}
                                primaryTypographyProps={{ fontWeight: 600, noWrap: true }}
                            />
                        </ListItemButton>
                    );
                })}
                {!filtered.length && (
                    <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        No sources match “{query}”.
                    </Typography>
                )}
            </List>
        );
    }

    return (
        <Dialog open fullWidth maxWidth="sm" disableEscapeKeyDown PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle>
                <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                    <Box
                        component="img"
                        src="/favicon.svg"
                        alt=""
                        sx={{ width: 26, height: 26, borderRadius: '8px' }}
                    />
                    <Typography component="span" variant="h6" sx={{ fontWeight: 800 }}>
                        Choose your sources
                    </Typography>
                </Stack>
            </DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Nexus is a reader. Pick the independent third-party sources you want to read from — you can change
                    this anytime under Manage sources.
                </Typography>

                {selectable.length > 0 && (
                    <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip size="small" color="primary" variant="outlined" label={`${selectedCount} selected`} />
                        <Box sx={{ flexGrow: 1 }} />
                        <Button
                            size="small"
                            onClick={() => setSelected(new Set(allIds))}
                            sx={{ textTransform: 'none' }}
                        >
                            All
                        </Button>
                        <Button
                            size="small"
                            color="inherit"
                            onClick={() => setSelected(new Set())}
                            sx={{ textTransform: 'none' }}
                        >
                            Clear
                        </Button>
                    </Stack>
                )}

                {selectable.length > 6 && (
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search sources"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        sx={{ mb: 1 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />
                )}

                {listContent}

                <FormControlLabel
                    sx={{ mt: 1, alignItems: 'flex-start' }}
                    control={<Checkbox checked={consented} onChange={(e) => setConsented(e.target.checked)} />}
                    label={
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            I understand these are independent third-party sources and that I am choosing to retrieve
                            content from them. Nexus is a reader and does not host or provide that content.
                        </Typography>
                    }
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                    onClick={finish}
                    variant="contained"
                    disabled={!consented}
                    fullWidth
                    sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '50px' }}
                >
                    {selectedCount > 0 ? `Start reading (${selectedCount})` : 'Start reading'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
