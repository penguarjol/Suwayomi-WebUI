/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useNavigate } from 'react-router-dom';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';

/** Always-visible Coins balance (+ admin shortcut) in the app bar. */
export const TokenBalanceChip = () => {
    const navigate = useNavigate();
    const tokens = useBillingStore((state) => state.tokens);
    const isPremium = useBillingStore((state) => state.isPremium);
    const isAdmin = useBillingStore((state) => state.isAdmin);
    const paymentsEnabled = useBillingStore((state) => state.paymentsEnabled);
    const loaded = useBillingStore((state) => state.loaded);

    if (!loaded) return null;
    // Soft launch: no coins concept yet, so hide the balance chip. Keep the admin
    // shortcut so admins can still reach the console.
    if (!paymentsEnabled && !isAdmin) return null;

    return (
        <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 0.5, mr: 1 }}>
            {isAdmin && (
                <IconButton
                    size="small"
                    color="inherit"
                    aria-label="admin console"
                    onClick={() => navigate(AppRoutes.admin.path)}
                >
                    <AdminPanelSettingsIcon />
                </IconButton>
            )}
            {paymentsEnabled && (
                <Chip
                    icon={isPremium ? <WorkspacePremiumIcon /> : <MonetizationOnIcon />}
                    label={isPremium ? 'Premium' : tokens}
                    onClick={() => navigate(AppRoutes.store.path)}
                    color="primary"
                    variant="outlined"
                    size="small"
                    aria-label="coins balance"
                    sx={{ fontWeight: 800, cursor: 'pointer' }}
                />
            )}
        </Stack>
    );
};
