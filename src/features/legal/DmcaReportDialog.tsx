/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import { submitDmcaReport } from '@/features/legal/Dmca.ts';
import { LEGAL_CONTACT_EMAIL } from '@/features/legal/Legal.constants.ts';
import { makeToast } from '@/base/utils/Toast.ts';

/** Tracked copyright/DMCA notice form. Files into the takedown queue (logged +
 *  admin-resolved) rather than an untracked mailto. */
export const DmcaReportDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if (!subject.trim() || !description.trim()) {
            makeToast('Add the work and a description of the claim.', 'info');
            return;
        }
        setBusy(true);
        try {
            const { ok, error } = await submitDmcaReport({
                targetType: 'other',
                subject: subject.trim(),
                description: description.trim(),
                reporterEmail: email.trim(),
            });
            if (ok) {
                makeToast('Notice submitted. Our team will review it.', 'success');
                setSubject('');
                setDescription('');
                setEmail('');
                onClose();
            } else if (error?.includes('unauthenticated')) {
                makeToast(`Please sign in to file a notice, or email ${LEGAL_CONTACT_EMAIL}.`, 'warning');
            } else {
                makeToast('Could not submit the notice. Please try again.', 'error');
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontWeight: 800 }}>Report content (Copyright / DMCA)</DialogTitle>
            <DialogContent dividers>
                <Stack sx={{ gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Submit a copyright notice. Provide enough detail to identify the work and the specific material.
                        Filing a knowingly false claim may carry legal liability. You can also email{' '}
                        {LEGAL_CONTACT_EMAIL}.
                    </Typography>
                    <TextField
                        label="Work / title / URL"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        size="small"
                        fullWidth
                    />
                    <TextField
                        label="Describe the claim"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        multiline
                        minRows={3}
                        size="small"
                        fullWidth
                    />
                    <TextField
                        label="Your contact email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        size="small"
                        fullWidth
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    disabled={busy}
                    onClick={submit}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    Submit notice
                </Button>
            </DialogActions>
        </Dialog>
    );
};
