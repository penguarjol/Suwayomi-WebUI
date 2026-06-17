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
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { sendGift } from '@/features/social/SocialFeatures.ts';
import { makeToast } from '@/base/utils/Toast.ts';

const PREMIUM_MONTH_COST = 100; // keep in sync with send_gift (migration 20260617030000)

/** Send Coins to another reader (ACID transfer via send_gift). */
export const GiftDialog = ({
    open,
    onClose,
    recipientId,
    recipientName,
}: {
    open: boolean;
    onClose: () => void;
    recipientId: string;
    recipientName: string;
}) => {
    const tokens = useBillingStore((s) => s.tokens);
    const [kind, setKind] = useState<'coins' | 'premium'>('coins');
    const [amount, setAmount] = useState(10);
    const [months, setMonths] = useState(1);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    const premiumCost = months * PREMIUM_MONTH_COST;
    const cost = kind === 'premium' ? premiumCost : amount;

    const send = async () => {
        if (cost <= 0) {
            makeToast('Enter an amount', 'warning');
            return;
        }
        if (cost > tokens) {
            makeToast('Not enough Coins', 'error');
            return;
        }
        setBusy(true);
        try {
            const status =
                kind === 'premium'
                    ? await sendGift(recipientId, 'premium', { amount: months, message: message.trim() || undefined })
                    : await sendGift(recipientId, 'coins', { amount, message: message.trim() || undefined });
            if (status === 'sent') {
                makeToast(
                    kind === 'premium'
                        ? `Gifted ${months} month${months === 1 ? '' : 's'} of Premium to ${recipientName}!`
                        : `Sent ${amount} Coins to ${recipientName}!`,
                    'success',
                );
                useBillingStore.getState().loadProfile();
                onClose();
            } else if (status === 'insufficient') {
                makeToast('Not enough Coins', 'error');
            } else if (status === 'self') {
                makeToast('You cannot gift yourself', 'warning');
            } else {
                makeToast('Could not send the gift', 'error');
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ fontWeight: 800 }}>{`Gift ${recipientName}`}</DialogTitle>
            <DialogContent>
                <Stack sx={{ gap: 2, pt: 1 }}>
                    <ToggleButtonGroup
                        exclusive
                        fullWidth
                        size="small"
                        value={kind}
                        onChange={(_, v) => v && setKind(v)}
                    >
                        <ToggleButton value="coins" sx={{ textTransform: 'none' }}>
                            Coins
                        </ToggleButton>
                        <ToggleButton value="premium" sx={{ textTransform: 'none' }}>
                            Premium
                        </ToggleButton>
                    </ToggleButtonGroup>
                    <Typography variant="caption" color="text.secondary">
                        {`You have ${tokens} Coins.`}
                    </Typography>
                    {kind === 'coins' ? (
                        <TextField
                            type="number"
                            label="Coins"
                            size="small"
                            value={amount}
                            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                            inputProps={{ min: 1 }}
                        />
                    ) : (
                        <TextField
                            type="number"
                            label="Months of Premium"
                            size="small"
                            value={months}
                            onChange={(e) => setMonths(Math.max(1, Number(e.target.value)))}
                            helperText={`${premiumCost} Coins (${PREMIUM_MONTH_COST}/month)`}
                            inputProps={{ min: 1 }}
                        />
                    )}
                    <TextField
                        label="Message (optional)"
                        size="small"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        multiline
                        minRows={2}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    disabled={busy || cost <= 0 || cost > tokens}
                    onClick={send}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px' }}
                >
                    {`Send (${cost} Coins)`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
