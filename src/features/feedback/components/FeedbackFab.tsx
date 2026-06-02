/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Fab from '@mui/material/Fab';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Stack from '@mui/material/Stack';
import FeedbackIcon from '@mui/icons-material/Feedback';
import BugReportIcon from '@mui/icons-material/BugReport';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { FeedbackType, submitFeedback } from '@/features/feedback/Feedback.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';

/**
 * Always-available "Report a bug / Request a feature" entry point. Hidden in
 * the reader (so it never covers content) and when logged out.
 */
export const FeedbackFab = () => {
    const isAuthenticated = AuthManager.useIsAuthenticated();
    const { pathname } = useLocation();
    const [open, setOpen] = useState(false);
    const [type, setType] = useState<FeedbackType>('bug');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    // Reader paths look like /manga/:id/chapter/:n — never show there.
    const isReader = /\/manga\/[^/]+\/chapter\//.test(pathname);
    if (!isAuthenticated || isReader) return null;

    const submit = async () => {
        if (!message.trim()) {
            makeToast('Please add a short description', 'warning');
            return;
        }
        setBusy(true);
        try {
            await submitFeedback(type, message.trim(), pathname);
            makeToast('Thanks! Your feedback was sent.', 'success');
            setMessage('');
            setOpen(false);
        } catch (e) {
            makeToast('Could not send feedback', 'error', getErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Fab
                color="secondary"
                aria-label="report a bug or request a feature"
                onClick={() => setOpen(true)}
                size="medium"
                sx={{
                    position: 'fixed',
                    right: 16,
                    bottom: `calc(80px + env(safe-area-inset-bottom))`,
                    zIndex: (theme) => theme.zIndex.speedDial,
                }}
            >
                <FeedbackIcon />
            </Fab>
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: 800 }}>Send feedback</DialogTitle>
                <DialogContent>
                    <Stack sx={{ gap: 2, pt: 1 }}>
                        <ToggleButtonGroup
                            exclusive
                            fullWidth
                            value={type}
                            onChange={(_, value) => value && setType(value)}
                            size="small"
                        >
                            <ToggleButton value="bug" sx={{ textTransform: 'none', gap: 0.5 }}>
                                <BugReportIcon fontSize="small" /> Bug
                            </ToggleButton>
                            <ToggleButton value="feature" sx={{ textTransform: 'none', gap: 0.5 }}>
                                <LightbulbIcon fontSize="small" /> Feature
                            </ToggleButton>
                            <ToggleButton value="other" sx={{ textTransform: 'none' }}>
                                Other
                            </ToggleButton>
                        </ToggleButtonGroup>
                        <TextField
                            autoFocus
                            multiline
                            minRows={3}
                            fullWidth
                            label={type === 'bug' ? 'What went wrong?' : 'Tell us your idea'}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button variant="contained" disabled={busy} onClick={submit} sx={{ textTransform: 'none' }}>
                        Send
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
