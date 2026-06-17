/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';
import { TIP_URL } from '@/features/billing/Billing.ts';
import { submitFeedback } from '@/features/feedback/Feedback.ts';
import { track } from '@/features/analytics/Analytics.ts';
import { makeToast } from '@/base/utils/Toast.ts';

const STATE_KEY = 'nexus-support-prompt';
const SESSION_COUNT_KEY = 'nexus-session-count';
const SESSION_FLAG = 'nexus-session-counted';

const DAY_MS = 86_400_000;
const SHOW_DELAY_MS = 45_000; // let the user actually use the app first
const MIN_SESSIONS = 2; // never on the very first session
const SNOOZE_LATER_DAYS = 7;
const SNOOZE_DISMISS_DAYS = 3;

interface PromptState {
    snoozeUntil?: number;
    done?: boolean;
}

function readState(): PromptState {
    try {
        return JSON.parse(localStorage.getItem(STATE_KEY) || '{}') as PromptState;
    } catch {
        return {};
    }
}

function writeState(next: PromptState): void {
    try {
        localStorage.setItem(STATE_KEY, JSON.stringify(next));
    } catch {
        /* ignore storage errors */
    }
}

/** Count this browser session exactly once and return the running total. */
function bumpSessionCount(): number {
    let total = Number(localStorage.getItem(SESSION_COUNT_KEY) || '0');
    try {
        if (!sessionStorage.getItem(SESSION_FLAG)) {
            sessionStorage.setItem(SESSION_FLAG, '1');
            total += 1;
            localStorage.setItem(SESSION_COUNT_KEY, String(total));
        }
    } catch {
        /* ignore storage errors */
    }
    return total;
}

/**
 * A gentle, infrequent "from the developer" prompt: a warm note that the project
 * is self-hosted and run by one person, asking for feedback and (optionally) a
 * tip. Shown once after a delay on the user's 2nd+ session, then snoozed for
 * days, and never again once the user acts on it.
 */
export const SupportPrompt = () => {
    const theme = useTheme();
    const { pathname } = useLocation();
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const sessions = bumpSessionCount();
        const state = readState();
        const now = Date.now();
        if (state.done) return undefined;
        if (state.snoozeUntil && now < state.snoozeUntil) return undefined;
        if (sessions < MIN_SESSIONS) return undefined;

        const timer = setTimeout(() => {
            setOpen(true);
            track('support_prompt_shown');
        }, SHOW_DELAY_MS);
        return () => clearTimeout(timer);
    }, []);

    const snooze = (days: number) => {
        writeState({ ...readState(), snoozeUntil: Date.now() + days * DAY_MS });
        setOpen(false);
    };

    const leaveTip = () => {
        if (TIP_URL) window.open(TIP_URL, '_blank', 'noopener,noreferrer');
        writeState({ ...readState(), done: true });
        track('support_prompt_tip');
        setOpen(false);
    };

    const sendFeedback = async () => {
        if (!message.trim()) {
            makeToast('Add a short note first', 'warning');
            return;
        }
        setBusy(true);
        try {
            await submitFeedback('other', message.trim(), pathname);
            writeState({ ...readState(), done: true });
            track('support_prompt_feedback');
            makeToast('Thank you — that genuinely helps.', 'success');
            setOpen(false);
        } catch {
            makeToast('Could not send right now. Please try again.', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={() => snooze(SNOOZE_DISMISS_DAYS)}
            fullWidth
            maxWidth="xs"
            PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden', backgroundImage: 'none' } }}
        >
            <Box
                sx={{
                    position: 'relative',
                    p: 3,
                    pb: 2,
                    textAlign: 'center',
                    color: '#fff',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                }}
            >
                <IconButton
                    size="small"
                    onClick={() => snooze(SNOOZE_DISMISS_DAYS)}
                    aria-label="close"
                    sx={{ position: 'absolute', top: 8, right: 8, color: 'rgba(255,255,255,0.85)' }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
                <FavoriteRoundedIcon sx={{ fontSize: 40, mb: 0.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    A note from the developer
                </Typography>
            </Box>

            <DialogContent sx={{ pt: 2.5 }}>
                <Stack sx={{ gap: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                        Thanks for reading on Nexus. This project is self-hosted and built and run by a single developer
                        — no big company, no investors, and no ads forced on you.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {TIP_URL
                            ? 'If you are enjoying it, two things would mean the world: tell me how it is going, and — if you can — chip in whatever you like. Any amount helps offset the server costs and keeps Nexus growing. There is zero pressure; your feedback alone genuinely helps.'
                            : 'If you are enjoying it, I would love to hear how it is going. Your feedback genuinely shapes where Nexus goes next.'}
                    </Typography>
                    <TextField
                        multiline
                        minRows={2}
                        fullWidth
                        size="small"
                        placeholder="Anything you love, or want to see? (optional)"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, flexWrap: 'wrap', gap: 1 }}>
                <Button onClick={() => snooze(SNOOZE_LATER_DAYS)} color="inherit" sx={{ textTransform: 'none' }}>
                    Maybe later
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                    onClick={sendFeedback}
                    disabled={busy}
                    variant={TIP_URL ? 'outlined' : 'contained'}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px' }}
                >
                    Send feedback
                </Button>
                {TIP_URL && (
                    <Button
                        onClick={leaveTip}
                        variant="contained"
                        startIcon={<VolunteerActivismIcon />}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 800,
                            borderRadius: '50px',
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        }}
                    >
                        Leave a tip
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};
