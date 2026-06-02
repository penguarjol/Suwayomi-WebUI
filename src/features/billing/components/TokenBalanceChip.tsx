/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Chip from '@mui/material/Chip';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { useNavigate } from 'react-router-dom';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';

/** Always-visible Coins balance in the app bar; taps through to the Store. */
export const TokenBalanceChip = () => {
    const navigate = useNavigate();
    const tokens = useBillingStore((state) => state.tokens);
    const isPremium = useBillingStore((state) => state.isPremium);
    const loaded = useBillingStore((state) => state.loaded);

    if (!loaded) return null;

    return (
        <Chip
            icon={isPremium ? <WorkspacePremiumIcon /> : <MonetizationOnIcon />}
            label={isPremium ? 'Premium' : tokens}
            onClick={() => navigate(AppRoutes.store.path)}
            color="primary"
            variant="outlined"
            size="small"
            aria-label="coins balance"
            sx={{ fontWeight: 800, cursor: 'pointer', mr: 1 }}
        />
    );
};
