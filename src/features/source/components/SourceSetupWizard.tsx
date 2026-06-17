/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
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
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { useSourcePrefs } from '@/features/source/services/SourcePreferences.ts';
import { useSaasSourceAccess } from '@/features/source/services/SourceAccess.ts';

/**
 * First-run source setup. Nexus is a reader, not a content provider: the user
 * must explicitly choose which independent third-party sources to enable, with a
 * consent acknowledgement, before any are shown (ADR-0011). NSFW and
 * non-allow-listed sources are already excluded by `useSaasSourceAccess`. Admins
 * skip this (they curate the allow-list via the console).
 */
export const SourceSetupWizard = () => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const isAdmin = useBillingStore((state) => state.isAdmin);
    const profileLoaded = useBillingStore((state) => state.loaded);
    const setupComplete = useSourcePrefs((state) => state.setupComplete);
    const completeSetup = useSourcePrefs((state) => state.completeSetup);

    const needsSetup = profileLoaded && !isAdmin && !setupComplete;

    const { ready, isAllowed } = useSaasSourceAccess();
    // Only fetch the source list when the wizard actually needs to run.
    const { data, loading } = requestManager.useGetSourceList({ skip: !needsSetup });

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

    // Default to all selectable enabled once the list is ready; the user can
    // deselect. The explicit consent + finish is the recorded user action.
    useEffect(() => {
        if (selected === null && ready && !loading && selectable.length > 0) {
            setSelected(new Set(selectable.map((source) => source.id)));
        }
    }, [ready, loading, selectable, selected]);

    const allIds = useMemo(() => selectable.map((source) => source.id), [selectable]);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return selectable;
        return selectable.filter((source) => source.name.toLowerCase().includes(q));
    }, [selectable, query]);

    if (!needsSetup) return null;
    // Nothing to choose (no allow-listed, non-NSFW sources yet): don't trap the user.
    if (ready && !loading && selectable.length === 0) return null;

    const isLoadingList = !ready || loading || selected === null;
    const selectedCount = selected?.size ?? 0;

    const toggle = (id: string) =>
        setSelected((prev) => {
            const next = new Set(prev ?? []);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const finish = () => completeSetup([...(selected ?? new Set<string>())], allIds);
    const skip = () => completeSetup([], allIds);

    return (
        <Dialog
            open
            fullWidth
            maxWidth="sm"
            fullScreen={fullScreen}
            disableEscapeKeyDown
            PaperProps={{
                sx: {
                    borderRadius: fullScreen ? 0 : 4,
                    overflow: 'hidden',
                    backgroundImage: 'none',
                },
            }}
        >
            {/* Branded header */}
            <Box
                sx={{
                    p: 3,
                    pb: 2.5,
                    textAlign: 'center',
                    color: '#fff',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                }}
            >
                <Box
                    component="img"
                    src="/favicon.svg"
                    alt=""
                    sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '16px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                        mb: 1.5,
                    }}
                />
                <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-0.5px' }}>
                    Welcome to Nexus
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.5, maxWidth: 420, mx: 'auto' }}>
                    Pick where you would like to read from. You can change this anytime under Manage sources.
                </Typography>
            </Box>

            <DialogContent sx={{ p: 0 }}>
                <Stack
                    sx={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 1,
                        px: 2.5,
                        pt: 2,
                        pb: 1,
                        flexWrap: 'wrap',
                    }}
                >
                    <Chip
                        size="small"
                        color="primary"
                        variant="outlined"
                        label={`${selectedCount} selected`}
                        sx={{ fontWeight: 700 }}
                    />
                    <Box sx={{ flexGrow: 1 }} />
                    <Button size="small" onClick={() => setSelected(new Set(allIds))} sx={{ textTransform: 'none' }}>
                        Select all
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

                {selectable.length > 6 && (
                    <Box sx={{ px: 2.5, pb: 1 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search sources"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>
                )}

                {isLoadingList ? (
                    <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 6, gap: 1.5 }}>
                        <CircularProgress />
                        <Typography variant="body2" color="text.secondary">
                            Finding sources…
                        </Typography>
                    </Stack>
                ) : (
                    <List dense sx={{ px: 1.5, maxHeight: fullScreen ? 'unset' : 360, overflowY: 'auto' }}>
                        {filtered.map((source) => {
                            const checked = selected?.has(source.id) ?? false;
                            return (
                                <ListItemButton
                                    key={source.id}
                                    onClick={() => toggle(source.id)}
                                    selected={checked}
                                    sx={{ borderRadius: 2, mb: 0.5 }}
                                >
                                    <Checkbox edge="start" tabIndex={-1} disableRipple checked={checked} />
                                    <ListItemAvatar sx={{ minWidth: 44 }}>
                                        <Avatar src={source.iconUrl} variant="rounded" sx={{ width: 32, height: 32 }}>
                                            <AutoStoriesIcon fontSize="small" />
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={source.name}
                                        secondary={source.lang?.toUpperCase()}
                                        primaryTypographyProps={{ fontWeight: 600 }}
                                    />
                                </ListItemButton>
                            );
                        })}
                        {!filtered.length && (
                            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                                No sources match “{query}”.
                            </Typography>
                        )}
                    </List>
                )}

                <Box sx={{ px: 2.5, pt: 1, pb: 0.5 }}>
                    <FormControlLabel
                        control={<Checkbox checked={consented} onChange={(e) => setConsented(e.target.checked)} />}
                        label={
                            <Typography variant="caption" color="text.secondary">
                                I understand these are independent third-party sources and that I am choosing to
                                retrieve content from them. Nexus is a reader and does not host or provide that content.
                            </Typography>
                        }
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 2.5, pb: 2, pt: 1 }}>
                <Button onClick={skip} color="inherit" sx={{ textTransform: 'none' }}>
                    Skip for now
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                    onClick={finish}
                    variant="contained"
                    disabled={!consented || isLoadingList}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 800,
                        borderRadius: '50px',
                        px: 3,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    }}
                >
                    {selectedCount > 0 ? `Start reading (${selectedCount})` : 'Continue'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
