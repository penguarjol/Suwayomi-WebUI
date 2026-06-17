/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { useNavigate } from 'react-router-dom';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { AdPlacement, ServedAd, pickAd, recordAdEvent } from '@/features/ads/InternalAds.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';

/**
 * Ad slot. Free users see an ad; Premium/admin users see nothing (this is what
 * makes the "ad-free" Premium benefit real). Serving priority (ADR: keep the
 * margin in-house): (1) our INTERNAL ad server (house promos + direct-sold
 * sponsorships, 100% ours), (2) a network unit (AdSense) for unsold inventory,
 * (3) a house Premium upsell. See docs/MANUAL_SETUP.md for AdSense env.
 */

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;

declare global {
    interface Window {
        adsbygoogle?: unknown[];
    }
}

export const AdSlot = ({
    slotId,
    minHeight = 120,
    placement = 'reader',
}: {
    slotId?: string;
    minHeight?: number;
    placement?: AdPlacement;
}) => {
    const navigate = useNavigate();
    const isEntitled = useBillingStore((state) => state.isPremium || state.isAdmin);
    const insRef = useRef<HTMLModElement | null>(null);
    const [internalAd, setInternalAd] = useState<ServedAd | null>(null);
    const [internalChecked, setInternalChecked] = useState(false);

    const networkEnabled = !!ADSENSE_CLIENT && !!slotId;

    // Try our own inventory first.
    useEffect(() => {
        if (isEntitled) return;
        let active = true;
        pickAd(placement).then((ad) => {
            if (!active) return;
            setInternalAd(ad);
            setInternalChecked(true);
            if (ad) recordAdEvent(ad.id, 'impression');
        });
        // eslint-disable-next-line consistent-return
        return () => {
            active = false;
        };
    }, [isEntitled, placement]);

    useEffect(() => {
        // Only fall back to the network once we've confirmed no internal ad.
        if (isEntitled || !networkEnabled || !internalChecked || internalAd) return;
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
            // AdSense script not loaded yet; the house ad below still renders.
        }
    }, [isEntitled, networkEnabled, internalChecked, internalAd]);

    if (isEntitled) return null;

    if (internalAd) {
        const onClick = () => {
            recordAdEvent(internalAd.id, 'click');
            window.open(internalAd.cta_url, '_blank', 'noopener,noreferrer');
        };
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
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: 'rgba(255,255,255,0.03)',
                }}
            >
                <Typography variant="overline" color="text.secondary">
                    {internalAd.kind === 'sponsor'
                        ? `Sponsored${internalAd.advertiser ? ` · ${internalAd.advertiser}` : ''}`
                        : 'Promoted'}
                </Typography>
                {internalAd.image_url && (
                    <Box
                        component="img"
                        src={internalAd.image_url}
                        alt={internalAd.title}
                        loading="lazy"
                        sx={{ maxWidth: '100%', maxHeight: 200, borderRadius: 2 }}
                    />
                )}
                <Typography sx={{ fontWeight: 800 }}>{internalAd.title}</Typography>
                {internalAd.body && (
                    <Typography variant="body2" color="text.secondary">
                        {internalAd.body}
                    </Typography>
                )}
                <Button
                    variant="contained"
                    onClick={onClick}
                    sx={{ mt: 0.5, borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                >
                    {internalAd.cta_label}
                </Button>
            </Stack>
        );
    }

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
