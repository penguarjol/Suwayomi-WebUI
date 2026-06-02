/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import IosShareIcon from '@mui/icons-material/IosShare';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import { ReferralStats, getMyReferralCode, getMyReferralStats, referralLink } from '@/features/referrals/Referrals.ts';
import { makeToast } from '@/base/utils/Toast.ts';

export const InviteFriendsCard = () => {
    const [link, setLink] = useState('');
    const [stats, setStats] = useState<ReferralStats>({ pending: 0, rewarded: 0 });

    useEffect(() => {
        getMyReferralCode().then((code) => {
            if (code) setLink(referralLink(code));
        });
        getMyReferralStats().then(setStats);
    }, []);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            makeToast('Invite link copied', 'success');
        } catch {
            makeToast('Could not copy', 'error');
        }
    };

    const share = async () => {
        const nav = navigator as Navigator & { share?: (data: { title: string; url: string }) => Promise<void> };
        if (nav.share) {
            nav.share({ title: 'Nexus Reads', url: link }).catch(() => {});
        } else {
            copy();
        }
    };

    if (!link) return null;

    return (
        <Stack
            sx={{
                gap: 1.5,
                p: 2,
                mb: 3,
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.10)',
                background: (theme) =>
                    `linear-gradient(135deg, ${theme.palette.primary.main}18, ${theme.palette.secondary.main}18)`,
            }}
        >
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                <GroupAddIcon color="primary" />
                <Typography sx={{ fontWeight: 800, flexGrow: 1 }}>Invite friends, earn Coins</Typography>
                {stats.rewarded > 0 && <Chip size="small" color="primary" label={`${stats.rewarded} joined`} />}
            </Stack>
            <Typography variant="body2" color="text.secondary">
                Share your link. When a friend signs up and reads their first chapter, you both win — you get Coins.
            </Typography>
            <Stack sx={{ flexDirection: 'row', gap: 1, alignItems: 'center' }}>
                <TextField size="small" value={link} fullWidth InputProps={{ readOnly: true }} />
                <IconButton aria-label="copy" onClick={copy}>
                    <ContentCopyIcon />
                </IconButton>
                <IconButton aria-label="share" onClick={share}>
                    <IosShareIcon />
                </IconButton>
            </Stack>
            {stats.pending > 0 && (
                <Typography variant="caption" color="text.secondary">
                    {stats.pending} friend(s) signed up — they earn you Coins once they start reading.
                </Typography>
            )}
            <Button
                variant="contained"
                onClick={share}
                sx={{ alignSelf: 'flex-start', borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
            >
                Share invite
            </Button>
        </Stack>
    );
};
