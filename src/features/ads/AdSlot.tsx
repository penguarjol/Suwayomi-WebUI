/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { useNavigate } from 'react-router-dom';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';

/**
 * Ad slot. Free users see an ad; Premium/admin users see nothing (this is what
 * makes the "ad-free" Premium benefit real). When a real ad network is wired
 * (Google AdSense: set `VITE_ADSENSE_CLIENT` and the per-slot `VITE_ADSENSE_*`
 * ids, add the AdSense <script> in index.html — see docs/MANUAL_SETUP.md), the
 * network unit renders; otherwise we show a house ad promoting Premium, which
 * keeps the slot useful and converts free users.
 */

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;

declare global {
    interface Window {
        adsbygoogle?: unknown[];
    }
}

export const AdSlot = ({ slotId, minHeight = 120 }: { slotId?: string; minHeight?: number }) => {
    const navigate = useNavigate();
    const isEntitled = useBillingStore((state) => state.isPremium || state.isAdmin);
    const insRef = useRef<HTMLModElement | null>(null);

    const networkEnabled = !!ADSENSE_CLIENT && !!slotId;

    useEffect(() => {
        if (isEntitled || !networkEnabled) return;
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
            // AdSense script not loaded yet; the house ad below still renders.
        }
    }, [isEntitled, networkEnabled]);

    if (isEntitled) return null;

    if (networkEnabled) {
        return (
            <Box sx={{ my: 3, textAlign: 'center', minHeight }}>
                <ins
                    ref={insRef}
                    className="adsbygoogle"
                    style={{ display: 'block' }}
                    data-ad-client={ADSENSE_CLIENT}
                    data-ad-slot={slotId}
                    data-ad-format="auto"
                    data-full-width-responsive="true"
                />
            </Box>
        );
    }

    // House ad — promotes Premium and keeps the slot meaningful before AdSense.
    return (
        <Stack
            sx={{
                my: 3,
                p: 2.5,
                minHeight,
                gap: 1,
                alignItems: 'center',
                textAlign: 'center',
                justifyContent: 'center',
                borderRadius: 3,
                border: '1px dashed rgba(255,255,255,0.15)',
                background: (theme) =>
                    `linear-gradient(135deg, ${theme.palette.primary.main}18, ${theme.palette.secondary.main}18)`,
            }}
        >
            <Typography variant="overline" color="text.secondary">
                Advertisement
            </Typography>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                <WorkspacePremiumIcon color="primary" />
                <Typography sx={{ fontWeight: 800 }}>Reading ad-free is a tap away</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
                Go Premium for ad-free reading, unlimited Fast Pass and offline downloads.
            </Typography>
            <Button
                variant="contained"
                onClick={() => navigate(AppRoutes.store.path)}
                sx={{ mt: 0.5, borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
            >
                Go ad-free
            </Button>
        </Stack>
    );
};
