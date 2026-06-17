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

    // Default to all selectable enabled once the list is ready; the user can
    // deselect. The explicit consent + finish is the recorded user action.
    useEffect(() => {
        if (selected === null && ready && !loading && selectable.length > 0) {
            setSelected(new Set(selectable.map((source) => source.id)));
        }
    }, [ready, loading, selectable, selected]);

    const allIds = useMemo(() => selectable.map((source) => source.id), [selectable]);

    if (!needsSetup) return null;
    // Nothing to choose (no allow-listed, non-NSFW sources yet): don't trap the user.
    if (ready && !loading && selectable.length === 0) return null;

    const toggle = (id: string) =>
        setSelected((prev) => {
            const next = new Set(prev ?? []);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const finish = () => completeSetup([...(selected ?? new Set<string>())], allIds);
    const skip = () => completeSetup([], allIds);

    const selectedCount = selected?.size ?? 0;

    return (
        <Dialog open fullWidth maxWidth="sm" disableEscapeKeyDown>
            <DialogTitle sx={{ fontWeight: 800 }}>Choose your sources</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Nexus is a reader. The sources below are independent third-party services operated by others. Pick
                    the ones you want to read from — enabling a source tells the app to retrieve content from it at your
                    direction. We do not host or provide that content. You can change this anytime under Manage sources.
                </Typography>
                <List dense>
                    {selectable.map((source) => (
                        <ListItemButton key={source.id} onClick={() => toggle(source.id)} sx={{ borderRadius: 1 }}>
                            <Checkbox
                                edge="start"
                                tabIndex={-1}
                                disableRipple
                                checked={selected?.has(source.id) ?? false}
                            />
                            <ListItemAvatar sx={{ minWidth: 40 }}>
                                <Avatar src={source.iconUrl} variant="rounded" sx={{ width: 28, height: 28 }} />
                            </ListItemAvatar>
                            <ListItemText primary={source.name} secondary={source.lang?.toUpperCase()} />
                        </ListItemButton>
                    ))}
                </List>
                <Box sx={{ mt: 1 }}>
                    <FormControlLabel
                        control={<Checkbox checked={consented} onChange={(e) => setConsented(e.target.checked)} />}
                        label={
                            <Typography variant="body2" color="text.secondary">
                                I understand these are third-party sources and that I am choosing to retrieve content
                                from them. Nexus does not host or provide it.
                            </Typography>
                        }
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={skip} sx={{ textTransform: 'none' }} color="inherit">
                    Skip for now
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                    onClick={finish}
                    variant="contained"
                    disabled={!consented}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px' }}
                >
                    {selectedCount > 0 ? `Enable ${selectedCount} source${selectedCount === 1 ? '' : 's'}` : 'Continue'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
