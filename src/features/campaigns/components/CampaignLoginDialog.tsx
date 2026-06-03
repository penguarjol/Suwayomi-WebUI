/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import RedeemIcon from '@mui/icons-material/Redeem';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { supabase } from '@/lib/SupabaseClient.ts';
import { CampaignClaimList } from '@/features/campaigns/components/CampaignClaimList.tsx';

const DISMISS_PREFIX = 'nexus-campaign-login-dialog-dismissed';

export function CampaignLoginDialog() {
    const { accessToken } = AuthManager.useSession();
    const [open, setOpen] = useState(false);
    const [dismissKey, setDismissKey] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        if (!accessToken) {
            setOpen(false);
            setDismissKey(null);
            return () => {
                active = false;
            };
        }

        supabase.auth.getUser().then(({ data }) => {
            if (!active) return;
            setDismissKey(`${DISMISS_PREFIX}:${data.user?.id ?? 'session'}`);
        });

        return () => {
            active = false;
        };
    }, [accessToken]);

    const close = useCallback(() => {
        if (dismissKey) {
            try {
                sessionStorage.setItem(dismissKey, 'true');
            } catch {
                /* ignore storage errors */
            }
        }
        setOpen(false);
    }, [dismissKey]);

    const handleClaimableChange = useCallback(
        (hasClaimable: boolean) => {
            if (!accessToken || !dismissKey || !hasClaimable) return;
            try {
                if (sessionStorage.getItem(dismissKey) === 'true') return;
            } catch {
                /* ignore storage errors */
            }
            setOpen(true);
        },
        [accessToken, dismissKey],
    );

    if (!accessToken || !dismissKey) return null;

    return (
        <Dialog open={open} onClose={close} fullWidth maxWidth="sm" keepMounted>
            <DialogTitle>
                <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                    <RedeemIcon color="primary" />
                    <Typography component="span" variant="h6" sx={{ fontWeight: 800 }}>
                        Claim your rewards
                    </Typography>
                </Stack>
            </DialogTitle>
            <DialogContent dividers>
                <CampaignClaimList
                    dense
                    emptyMessage="No rewards are available right now."
                    onClaimableChange={handleClaimableChange}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={close} sx={{ textTransform: 'none', fontWeight: 700 }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
