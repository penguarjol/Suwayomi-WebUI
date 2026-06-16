/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useState } from 'react';
import { isNativeShell, isStandalonePwa } from '@/features/billing/Platform.ts';

/**
 * PWA install lifecycle (ADR-0008). Captures the browser's `beforeinstallprompt`
 * so we can offer an in-app install affordance, and falls back to an iOS
 * "Add to Home Screen" hint (Safari fires no such event). Suppressed when
 * already installed (standalone) or inside the native Capacitor shell.
 */

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_install_dismissed_at';
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function recentlyDismissed(): boolean {
    try {
        const raw = localStorage.getItem(DISMISS_KEY);
        return !!raw && Date.now() - Number(raw) < DISMISS_TTL_MS;
    } catch {
        return false;
    }
}

export function isIosSafari(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
    // Add-to-Home-Screen only works from Safari; exclude in-app/other browsers.
    const isOtherBrowser = /crios|fxios|edgios|opt\//i.test(ua);
    return isIos && !isOtherBrowser;
}

export interface PwaInstallState {
    canInstall: boolean;
    hasNativePrompt: boolean;
    isIosHint: boolean;
    promptInstall: () => Promise<void>;
    dismiss: () => void;
}

export function usePwaInstall(): PwaInstallState {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [installed, setInstalled] = useState(false);
    const [dismissed, setDismissed] = useState(recentlyDismissed());

    useEffect(() => {
        if (isNativeShell() || isStandalonePwa()) return undefined;
        const onPrompt = (e: Event) => {
            e.preventDefault();
            setDeferred(e as BeforeInstallPromptEvent);
        };
        const onInstalled = () => setInstalled(true);
        window.addEventListener('beforeinstallprompt', onPrompt);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    const promptInstall = useCallback(async () => {
        if (!deferred) return;
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === 'accepted') setInstalled(true);
        setDeferred(null);
    }, [deferred]);

    const dismiss = useCallback(() => {
        try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
            /* ignore storage errors */
        }
        setDismissed(true);
    }, []);

    const alreadyApp = isStandalonePwa() || isNativeShell();
    const isIosHint = isIosSafari() && !alreadyApp;
    const canInstall = !alreadyApp && !installed && !dismissed && (!!deferred || isIosHint);

    return { canInstall, hasNativePrompt: !!deferred, isIosHint, promptInstall, dismiss };
}
