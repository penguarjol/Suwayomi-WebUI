/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import '@/polyfill.manual';
import '@/i18n';
import '@/lib/dayjs/Setup.ts';
import '@/lib/koration/Setup.ts';
import '@/index.css';
import '@/lib/PointerDeviceUtil.ts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import { initAnalytics } from '@/features/analytics/Analytics.ts';
import { captureReferralFromUrl } from '@/features/referrals/Referrals.ts';
import { requestManager } from '@/lib/requests/RequestManager.ts';

initAnalytics();
captureReferralFromUrl();

const render = () => {
    const container = document.getElementById('root');
    const root = createRoot(container!);
    root.render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
};

// Hydrate the persisted Apollo cache before first render so revisits are instant.
// Loaded dynamically and fully guarded so a failure in the persistence layer can
// never block or crash app boot — render always runs.
const boot = async () => {
    try {
        const { restoreApolloCache } = await import('@/lib/requests/client/ApolloPersistor.ts');
        await restoreApolloCache(requestManager.graphQLClient.client);
    } catch {
        // persistence is best-effort
    } finally {
        render();
    }
};

boot();
