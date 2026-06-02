/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { Admin, ChapterSchedule, GlobalSource } from '@/features/admin/services/Admin.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';

type SourceState = { enabled: boolean; hidden: boolean; name: string | null };

const SourceManager = () => {
    const { data, loading } = requestManager.useGetSourceList();
    const [state, setState] = useState<Record<string, SourceState>>({});
    const [query, setQuery] = useState('');

    useEffect(() => {
        Admin.getGlobalSources()
            .then((rows: GlobalSource[]) => {
                const next: Record<string, SourceState> = {};
                rows.forEach((row) => {
                    next[row.source_id] = { enabled: row.enabled, hidden: row.hidden, name: row.name };
                });
                setState(next);
            })
            .catch((e) => makeToast('Failed to load source settings', 'error', getErrorMessage(e)));
    }, []);

    const sources = useMemo(() => {
        const nodes = data?.sources.nodes ?? [];
        const q = query.trim().toLowerCase();
        return [...nodes]
            .filter((s) => !q || s.displayName.toLowerCase().includes(q) || (s.lang ?? '').toLowerCase().includes(q))
            .sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [data?.sources.nodes, query]);

    const update = async (id: string, name: string, patch: Partial<SourceState>) => {
        const current = state[id] ?? { enabled: false, hidden: false, name };
        const next = { ...current, ...patch, name };
        setState((prev) => ({ ...prev, [id]: next })); // optimistic
        try {
            await Admin.upsertGlobalSource(id, name, next.enabled, next.hidden);
        } catch (e) {
            setState((prev) => ({ ...prev, [id]: current })); // revert
            makeToast('Failed to update source', 'error', getErrorMessage(e));
        }
    };

    if (loading) return <LoadingPlaceholder />;

    return (
        <Stack sx={{ gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
                Enable a source to make it visible to all users. Admin-only keeps it usable by admins but hidden from
                everyone else. Disabled sources are off for everyone.
            </Typography>
            <TextField
                size="small"
                label="Search sources"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ maxWidth: 320 }}
            />
            <Stack sx={{ gap: 1 }}>
                {sources.map((source) => {
                    const s = state[source.id] ?? { enabled: false, hidden: false, name: source.displayName };
                    return (
                        <Stack
                            key={source.id}
                            sx={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 2,
                                p: 1.5,
                                borderRadius: 2,
                                border: '1px solid rgba(255,255,255,0.06)',
                                flexWrap: 'wrap',
                            }}
                        >
                            <Stack>
                                <Typography sx={{ fontWeight: 600 }}>{source.displayName}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {source.lang?.toUpperCase()} · {source.id}
                                </Typography>
                            </Stack>
                            <Stack sx={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
                                <Stack sx={{ alignItems: 'center' }}>
                                    <Switch
                                        checked={s.enabled}
                                        onChange={(e) =>
                                            update(source.id, source.displayName, { enabled: e.target.checked })
                                        }
                                    />
                                    <Typography variant="caption">Visible</Typography>
                                </Stack>
                                <Stack sx={{ alignItems: 'center' }}>
                                    <Switch
                                        color="warning"
                                        checked={s.hidden}
                                        onChange={(e) =>
                                            update(source.id, source.displayName, { hidden: e.target.checked })
                                        }
                                    />
                                    <Typography variant="caption">Admin-only</Typography>
                                </Stack>
                            </Stack>
                        </Stack>
                    );
                })}
                {!sources.length && (
                    <Typography color="text.secondary">No sources found. Install extensions first.</Typography>
                )}
            </Stack>
        </Stack>
    );
};

const FastPassScheduler = () => {
    const [schedules, setSchedules] = useState<ChapterSchedule[]>([]);
    const [mangaId, setMangaId] = useState('');
    const [chapterId, setChapterId] = useState('');
    const [days, setDays] = useState('7');
    const [cost, setCost] = useState('5');
    const [busy, setBusy] = useState(false);

    const refresh = () =>
        Admin.getSchedules()
            .then(setSchedules)
            .catch(() => setSchedules([]));
    useEffect(() => {
        refresh();
    }, []);

    const create = async () => {
        if (!mangaId.trim() || !chapterId.trim()) {
            makeToast('Manga id and chapter id are required', 'warning');
            return;
        }
        setBusy(true);
        try {
            const releaseDate = new Date(Date.now() + Number(days) * 86400000).toISOString();
            await Admin.createSchedule(mangaId.trim(), chapterId.trim(), releaseDate, Number(cost) || 5);
            makeToast('Fast Pass scheduled', 'success');
            setChapterId('');
            refresh();
        } catch (e) {
            makeToast('Failed to schedule', 'error', getErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    const remove = async (id: string) => {
        try {
            await Admin.deleteSchedule(id);
            refresh();
        } catch (e) {
            makeToast('Failed to delete', 'error', getErrorMessage(e));
        }
    };

    return (
        <Stack sx={{ gap: 3 }}>
            <Typography variant="body2" color="text.secondary">
                Gate a chapter behind Fast Pass until its release date. Use the engine chapter id (visible in the
                chapter list URL). After the release date it becomes free for everyone.
            </Typography>
            <Stack sx={{ flexDirection: 'row', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField size="small" label="Manga id" value={mangaId} onChange={(e) => setMangaId(e.target.value)} />
                <TextField
                    size="small"
                    label="Chapter id"
                    value={chapterId}
                    onChange={(e) => setChapterId(e.target.value)}
                />
                <TextField
                    size="small"
                    label="Release in (days)"
                    type="number"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    sx={{ width: 140 }}
                />
                <TextField
                    size="small"
                    label="Cost (Coins)"
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    sx={{ width: 130 }}
                />
                <Button variant="contained" disabled={busy} onClick={create} sx={{ textTransform: 'none' }}>
                    Schedule
                </Button>
            </Stack>

            <Stack sx={{ gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Scheduled ({schedules.length})
                </Typography>
                {schedules.map((schedule) => (
                    <Stack
                        key={schedule.id}
                        sx={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1.25,
                            borderRadius: 2,
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        <Typography variant="body2">
                            {`Manga ${schedule.manga_id} · Ch ${schedule.chapter_id} · ${schedule.token_cost} Coins · free ${new Date(schedule.release_date).toLocaleString()}`}
                        </Typography>
                        <IconButton size="small" aria-label="delete schedule" onClick={() => remove(schedule.id)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                ))}
                {!schedules.length && <Typography color="text.secondary">No Fast Pass chapters scheduled.</Typography>}
            </Stack>
        </Stack>
    );
};

export function AdminConsole() {
    useAppTitle('Admin Console');
    const isAdmin = useBillingStore((state) => state.isAdmin);
    const loaded = useBillingStore((state) => state.loaded);
    const [tab, setTab] = useState(0);

    if (!loaded) return <LoadingPlaceholder />;
    if (!isAdmin) return <Navigate to={AppRoutes.root.path} replace />;

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 2 }}>
                Admin Console
            </Typography>
            <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 3 }}>
                <Tab label="Sources" sx={{ textTransform: 'none' }} />
                <Tab label="Fast Pass" sx={{ textTransform: 'none' }} />
            </Tabs>
            {tab === 0 ? <SourceManager /> : <FastPassScheduler />}
        </Box>
    );
}
