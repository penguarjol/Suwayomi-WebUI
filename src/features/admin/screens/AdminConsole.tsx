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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import DeleteIcon from '@mui/icons-material/Delete';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { DEFAULT_SUBSCRIPTION_PLANS, DEFAULT_TOKEN_PACKS, useBillingStore } from '@/features/billing/Billing.ts';
import { Admin, ChapterSchedule, GlobalSource } from '@/features/admin/services/Admin.ts';
import { FeedbackItem, getFeedback, setFeedbackStatus } from '@/features/feedback/Feedback.ts';
import {
    Campaign,
    createCampaign,
    deleteCampaign,
    listAllCampaigns,
    setCampaignActive,
} from '@/features/campaigns/Campaigns.ts';
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

const GrantCoins = () => {
    const [email, setEmail] = useState('');
    const [amount, setAmount] = useState('50');
    const [busy, setBusy] = useState(false);
    const [ledger, setLedger] = useState<{ user_id: string; delta: number; reason: string; created_at: string }[]>([]);

    const refresh = () =>
        Admin.getRecentLedger()
            .then(setLedger)
            .catch(() => setLedger([]));
    useEffect(() => {
        refresh();
    }, []);

    const grant = async () => {
        if (!email.trim()) return;
        setBusy(true);
        try {
            const balance = await Admin.grantTokens(email.trim(), Number(amount) || 0);
            makeToast(`Granted. New balance: ${balance} Coins`, 'success');
            refresh();
        } catch (e) {
            makeToast('Grant failed', 'error', getErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Stack sx={{ gap: 3 }}>
            <Typography variant="body2" color="text.secondary">
                Grant Coins to a user by email (for support, campaigns, or compensation). Every grant is recorded in the
                token ledger below.
            </Typography>
            <Stack sx={{ flexDirection: 'row', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField size="small" label="User email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <TextField
                    size="small"
                    label="Coins"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    sx={{ width: 120 }}
                />
                <Button variant="contained" disabled={busy} onClick={grant} sx={{ textTransform: 'none' }}>
                    Grant
                </Button>
            </Stack>
            <Stack sx={{ gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Recent token activity
                </Typography>
                {ledger.map((row, idx) => (
                    <Stack
                        // eslint-disable-next-line react/no-array-index-key
                        key={`${row.user_id}-${row.created_at}-${idx}`}
                        sx={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            p: 1,
                            borderRadius: 1.5,
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        <Typography variant="caption">{`${row.reason} · ${row.user_id.slice(0, 8)}…`}</Typography>
                        <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: row.delta >= 0 ? 'success.main' : 'warning.main' }}
                        >
                            {row.delta >= 0 ? `+${row.delta}` : row.delta}
                        </Typography>
                    </Stack>
                ))}
                {!ledger.length && <Typography color="text.secondary">No activity yet.</Typography>}
            </Stack>
        </Stack>
    );
};

const Analytics = () => {
    const [rows, setRows] = useState<{ manga_id: number; readers: number; chapters_read: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Admin.getTopManga(25)
            .then(setRows)
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingPlaceholder />;

    return (
        <Stack sx={{ gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Most-read titles across all users (by unique readers).
            </Typography>
            {rows.map((row, idx) => (
                <Stack
                    key={row.manga_id}
                    sx={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 2,
                        p: 1.25,
                        borderRadius: 1.5,
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <Typography sx={{ fontWeight: 800, width: 28, color: 'primary.main' }}>{idx + 1}</Typography>
                    <Typography sx={{ flexGrow: 1 }}>Manga #{row.manga_id}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {`${row.readers} readers · ${row.chapters_read} chapters`}
                    </Typography>
                </Stack>
            ))}
            {!rows.length && <Typography color="text.secondary">No reading data yet.</Typography>}
        </Stack>
    );
};

interface EditablePack {
    id: string;
    label: string;
    tokens: number;
    bonus: number;
    priceUsd: number;
}

const PricingEditor = () => {
    const [packs, setPacks] = useState<EditablePack[]>(DEFAULT_TOKEN_PACKS.map((p) => ({ ...p })));
    const [gatedCount, setGatedCount] = useState(3);
    const [unlockCost, setUnlockCost] = useState(5);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        Admin.getPricing()
            .then((cfg) => {
                if (cfg?.tokenPacks?.length) setPacks(cfg.tokenPacks as EditablePack[]);
                if (Number.isFinite(cfg?.gatedCount)) setGatedCount(Number(cfg?.gatedCount));
                if (Number.isFinite(cfg?.unlockCost)) setUnlockCost(Number(cfg?.unlockCost));
            })
            .catch(() => {});
    }, []);

    const updatePack = (id: string, field: keyof EditablePack, value: number) =>
        setPacks((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

    const save = async () => {
        setBusy(true);
        try {
            await Admin.setPricing({ tokenPacks: packs, plans: DEFAULT_SUBSCRIPTION_PLANS, gatedCount, unlockCost });
            makeToast('Pricing saved', 'success');
        } catch (e) {
            makeToast('Could not save pricing', 'error', getErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Stack sx={{ gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
                Fast Pass policy: how many of the newest chapters of every series are gated for free users, and the Coin
                cost to unlock one. Higher counts earn more but research shows aggressive gating erodes trust — 3–5 is
                the sweet spot.
            </Typography>
            <Stack sx={{ flexDirection: 'row', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                    size="small"
                    label="Gated chapters (newest)"
                    type="number"
                    value={gatedCount}
                    onChange={(e) => setGatedCount(Math.max(0, Number(e.target.value)))}
                    sx={{ width: 180 }}
                />
                <TextField
                    size="small"
                    label="Unlock cost (Coins)"
                    type="number"
                    value={unlockCost}
                    onChange={(e) => setUnlockCost(Math.max(1, Number(e.target.value)))}
                    sx={{ width: 160 }}
                />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Coin pack pricing shown in the Store. (Coins are credited via the payment webhook; keep the Gatekeeper
                catalog in sync for charge amounts.)
            </Typography>
            {packs.map((pack) => (
                <Stack key={pack.id} sx={{ flexDirection: 'row', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography sx={{ width: 90, fontWeight: 700 }}>{pack.label}</Typography>
                    <TextField
                        size="small"
                        label="Coins"
                        type="number"
                        value={pack.tokens}
                        onChange={(e) => updatePack(pack.id, 'tokens', Number(e.target.value))}
                        sx={{ width: 110 }}
                    />
                    <TextField
                        size="small"
                        label="Bonus"
                        type="number"
                        value={pack.bonus}
                        onChange={(e) => updatePack(pack.id, 'bonus', Number(e.target.value))}
                        sx={{ width: 110 }}
                    />
                    <TextField
                        size="small"
                        label="Price USD"
                        type="number"
                        value={pack.priceUsd}
                        onChange={(e) => updatePack(pack.id, 'priceUsd', Number(e.target.value))}
                        sx={{ width: 120 }}
                    />
                </Stack>
            ))}
            <Box>
                <Button variant="contained" disabled={busy} onClick={save} sx={{ textTransform: 'none' }}>
                    Save pricing
                </Button>
            </Box>
        </Stack>
    );
};

const FeedbackInbox = () => {
    const [items, setItems] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = () =>
        getFeedback()
            .then(setItems)
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    useEffect(() => {
        refresh();
    }, []);

    const cycle = async (item: FeedbackItem) => {
        const order: FeedbackItem['status'][] = ['open', 'planned', 'done', 'declined'];
        const next = order[(order.indexOf(item.status) + 1) % order.length];
        try {
            await setFeedbackStatus(item.id, next);
            setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: next } : i)));
        } catch (e) {
            makeToast('Could not update', 'error', getErrorMessage(e));
        }
    };

    if (loading) return <LoadingPlaceholder />;

    return (
        <Stack sx={{ gap: 1 }}>
            {items.map((item) => (
                <Stack
                    key={item.id}
                    sx={{ p: 1.5, gap: 0.5, borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                        <Typography
                            variant="caption"
                            sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'primary.main' }}
                        >
                            {item.type}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {new Date(item.created_at).toLocaleString()} · {item.page}
                        </Typography>
                        <Button size="small" onClick={() => cycle(item)} sx={{ ml: 'auto', textTransform: 'none' }}>
                            {item.status}
                        </Button>
                    </Stack>
                    <Typography variant="body2">{item.message}</Typography>
                </Stack>
            ))}
            {!items.length && <Typography color="text.secondary">No feedback yet.</Typography>}
        </Stack>
    );
};

const Refunds = () => {
    const [email, setEmail] = useState('');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('refund');
    const [paymentIntent, setPaymentIntent] = useState('');
    const [busy, setBusy] = useState(false);

    const refund = async () => {
        if (!email.trim() || !Number(amount)) {
            makeToast('Enter a user email and amount', 'warning');
            return;
        }
        setBusy(true);
        try {
            const balance = await Admin.refund(email.trim(), Number(amount), reason.trim());
            if (paymentIntent.trim()) {
                const result = await Admin.stripeRefund(paymentIntent.trim());
                if (!result.ok) {
                    makeToast(
                        result.error === 'not_configured'
                            ? 'Coins reversed. Stripe not configured — refund the card in Stripe.'
                            : 'Coins reversed, but the Stripe refund failed.',
                        'warning',
                    );
                    return;
                }
            }
            makeToast(`Refunded. New balance: ${balance} Coins`, 'success');
        } catch (e) {
            makeToast('Refund failed', 'error', getErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Stack sx={{ gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
                Reverse Coins from a user (chargeback or support refund). Optionally enter the Stripe payment-intent id
                to also refund the card. Every refund is recorded in the token ledger.
            </Typography>
            <Stack sx={{ flexDirection: 'row', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField size="small" label="User email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <TextField
                    size="small"
                    label="Coins to reverse"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    sx={{ width: 150 }}
                />
                <TextField size="small" label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </Stack>
            <Stack sx={{ flexDirection: 'row', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                    size="small"
                    label="Stripe payment intent (optional)"
                    value={paymentIntent}
                    onChange={(e) => setPaymentIntent(e.target.value)}
                    sx={{ minWidth: 280 }}
                />
                <Button
                    color="warning"
                    variant="contained"
                    disabled={busy}
                    onClick={refund}
                    sx={{ textTransform: 'none' }}
                >
                    Refund
                </Button>
            </Stack>
        </Stack>
    );
};

const CampaignManager = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [rewardType, setRewardType] = useState<'coins' | 'premium_days'>('coins');
    const [rewardAmount, setRewardAmount] = useState('25');
    const [cooldown, setCooldown] = useState('0');
    const [busy, setBusy] = useState(false);

    const refresh = () =>
        listAllCampaigns()
            .then(setCampaigns)
            .catch(() => setCampaigns([]));
    useEffect(() => {
        refresh();
    }, []);

    const create = async () => {
        if (!title.trim()) return;
        setBusy(true);
        try {
            await createCampaign({
                title: title.trim(),
                description: description.trim(),
                reward_type: rewardType,
                reward_amount: Number(rewardAmount) || 0,
                cooldown_hours: Number(cooldown) || 0,
            });
            setTitle('');
            setDescription('');
            refresh();
        } catch (e) {
            makeToast('Could not create campaign', 'error', getErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    const toggle = async (campaign: Campaign) => {
        await setCampaignActive(campaign.id, !campaign.active).catch(() => {});
        refresh();
    };
    const remove = async (id: string) => {
        await deleteCampaign(id).catch(() => {});
        refresh();
    };

    return (
        <Stack sx={{ gap: 3 }}>
            <Typography variant="body2" color="text.secondary">
                Run reward campaigns to drive engagement: one-time bonuses (cooldown 0) or repeatable ones (e.g. a daily
                check-in with cooldown 24). Rewards are Coins or Premium days.
            </Typography>
            <Stack sx={{ gap: 1.5, flexWrap: 'wrap' }}>
                <Stack sx={{ flexDirection: 'row', gap: 1.5, flexWrap: 'wrap' }}>
                    <TextField size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <TextField
                        size="small"
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        sx={{ flexGrow: 1, minWidth: 180 }}
                    />
                </Stack>
                <Stack sx={{ flexDirection: 'row', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={rewardType}
                        onChange={(_, value) => value && setRewardType(value)}
                    >
                        <ToggleButton value="coins" sx={{ textTransform: 'none' }}>
                            Coins
                        </ToggleButton>
                        <ToggleButton value="premium_days" sx={{ textTransform: 'none' }}>
                            Premium days
                        </ToggleButton>
                    </ToggleButtonGroup>
                    <TextField
                        size="small"
                        label="Amount"
                        type="number"
                        value={rewardAmount}
                        onChange={(e) => setRewardAmount(e.target.value)}
                        sx={{ width: 110 }}
                    />
                    <TextField
                        size="small"
                        label="Cooldown (h)"
                        type="number"
                        value={cooldown}
                        onChange={(e) => setCooldown(e.target.value)}
                        sx={{ width: 130 }}
                    />
                    <Button variant="contained" disabled={busy} onClick={create} sx={{ textTransform: 'none' }}>
                        Create
                    </Button>
                </Stack>
            </Stack>
            <Stack sx={{ gap: 1 }}>
                {campaigns.map((campaign) => (
                    <Stack
                        key={campaign.id}
                        sx={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 1,
                            p: 1.25,
                            borderRadius: 1.5,
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        <Stack sx={{ flexGrow: 1 }}>
                            <Typography sx={{ fontWeight: 700 }}>{campaign.title}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {`${campaign.reward_amount} ${campaign.reward_type === 'coins' ? 'Coins' : 'Premium days'} · ${campaign.cooldown_hours === 0 ? 'one-time' : `every ${campaign.cooldown_hours}h`}`}
                            </Typography>
                        </Stack>
                        <Switch checked={campaign.active} onChange={() => toggle(campaign)} />
                        <IconButton size="small" aria-label="delete campaign" onClick={() => remove(campaign.id)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                ))}
                {!campaigns.length && <Typography color="text.secondary">No campaigns yet.</Typography>}
            </Stack>
        </Stack>
    );
};

const TABS = [
    { label: 'Sources', render: () => <SourceManager /> },
    { label: 'Fast Pass', render: () => <FastPassScheduler /> },
    { label: 'Pricing', render: () => <PricingEditor /> },
    { label: 'Grant Coins', render: () => <GrantCoins /> },
    { label: 'Refunds', render: () => <Refunds /> },
    { label: 'Campaigns', render: () => <CampaignManager /> },
    { label: 'Analytics', render: () => <Analytics /> },
    { label: 'Feedback', render: () => <FeedbackInbox /> },
];

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
            <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" sx={{ mb: 3 }}>
                {TABS.map((t) => (
                    <Tab key={t.label} label={t.label} sx={{ textTransform: 'none' }} />
                ))}
            </Tabs>
            {TABS[tab].render()}
        </Box>
    );
}
