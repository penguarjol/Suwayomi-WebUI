/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import RedeemIcon from '@mui/icons-material/Redeem';
import { InviteFriendsCard } from '@/features/referrals/components/InviteFriendsCard.tsx';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { CampaignClaimList } from '@/features/campaigns/components/CampaignClaimList.tsx';

export function EarnCoins() {
    useAppTitle('Earn Coins');

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 680, mx: 'auto' }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <RedeemIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    Earn Coins
                </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Complete activities to earn free Coins and Premium time.
            </Typography>

            <InviteFriendsCard />

            <CampaignClaimList />
        </Box>
    );
}
