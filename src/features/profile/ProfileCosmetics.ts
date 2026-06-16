/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { SxProps, Theme } from '@mui/material/styles';

/**
 * Visual styling for profile cosmetics. The DB `cosmetics` catalog is the source
 * of truth for which keys exist + their premium flag; this maps each key to its
 * pixels (gradients, animations). Animated styles ship their own @keyframes via
 * MUI sx so no global CSS is needed.
 */

const AURORA_KEYFRAMES = {
    '@keyframes nexusShift': {
        '0%': { backgroundPosition: '0% 50%' },
        '50%': { backgroundPosition: '100% 50%' },
        '100%': { backgroundPosition: '0% 50%' },
    },
};

export const BANNER_STYLES: Record<string, SxProps<Theme>> = {
    default: { background: 'linear-gradient(135deg, #6d28d9, #ec4899)' },
    banner_sunset: { background: 'linear-gradient(135deg, #ff7e5f, #feb47b)' },
    banner_ocean: { background: 'linear-gradient(135deg, #2193b0, #6dd5ed)' },
    banner_forest: { background: 'linear-gradient(135deg, #11998e, #38ef7d)' },
    banner_aurora: {
        ...AURORA_KEYFRAMES,
        background: 'linear-gradient(270deg, #00c9ff, #92fe9d, #ec4899, #7367f0)',
        backgroundSize: '800% 800%',
        animation: 'nexusShift 14s ease infinite',
    },
    banner_nebula: {
        ...AURORA_KEYFRAMES,
        background: 'linear-gradient(270deg, #360033, #0b8793, #360033)',
        backgroundSize: '600% 600%',
        animation: 'nexusShift 18s ease infinite',
    },
    banner_gold: {
        ...AURORA_KEYFRAMES,
        background: 'linear-gradient(270deg, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c)',
        backgroundSize: '600% 600%',
        animation: 'nexusShift 10s ease infinite',
    },
};

export const FRAME_STYLES: Record<string, SxProps<Theme>> = {
    none: {},
    frame_silver: { border: '3px solid #c0c0c0' },
    frame_glow: {
        '@keyframes nexusGlow': {
            '0%, 100%': { boxShadow: '0 0 8px #00e5ff' },
            '50%': { boxShadow: '0 0 18px #00e5ff' },
        },
        border: '3px solid #00e5ff',
        animation: 'nexusGlow 2.2s ease-in-out infinite',
    },
    frame_gold: {
        '@keyframes nexusGoldPulse': {
            '0%, 100%': { boxShadow: '0 0 8px #ffd700' },
            '50%': { boxShadow: '0 0 20px #ffae00' },
        },
        border: '3px solid #ffd700',
        animation: 'nexusGoldPulse 2.4s ease-in-out infinite',
    },
};

const GRADIENT_TEXT = {
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
};

export function nameEffectSx(key: string, accent?: string | null): SxProps<Theme> {
    const a = accent || '#ec4899';
    switch (key) {
        case 'effect_gradient':
            return { ...GRADIENT_TEXT, backgroundImage: `linear-gradient(90deg, ${a}, #7367f0)` };
        case 'effect_shimmer':
            return {
                ...GRADIENT_TEXT,
                '@keyframes nexusShimmer': {
                    '0%': { backgroundPosition: '0% 50%' },
                    '100%': { backgroundPosition: '200% 50%' },
                },
                backgroundImage: `linear-gradient(90deg, ${a}, #ffffff, ${a})`,
                backgroundSize: '200% auto',
                animation: 'nexusShimmer 3s linear infinite',
            };
        case 'effect_rainbow':
            return {
                ...GRADIENT_TEXT,
                '@keyframes nexusRainbow': {
                    '0%': { backgroundPosition: '0% 50%' },
                    '100%': { backgroundPosition: '300% 50%' },
                },
                backgroundImage: 'linear-gradient(90deg, #ff0080, #ff8c00, #40e0d0, #ff0080)',
                backgroundSize: '300% auto',
                animation: 'nexusRainbow 6s linear infinite',
            };
        default:
            return {};
    }
}

export function bannerSx(key: string): SxProps<Theme> {
    return BANNER_STYLES[key] ?? BANNER_STYLES.default;
}

export function frameSx(key: string): SxProps<Theme> {
    return FRAME_STYLES[key] ?? FRAME_STYLES.none;
}
