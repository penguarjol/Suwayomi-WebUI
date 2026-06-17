/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    // eslint-disable-next-line no-console
    console.error('Supabase URL or Key not found in environment variables!');
}

// Warm the DNS/TLS connection to Supabase before the first auth/RPC round-trip.
if (supabaseUrl && typeof document !== 'undefined') {
    try {
        const { origin } = new URL(supabaseUrl);
        for (const rel of ['preconnect', 'dns-prefetch']) {
            const link = document.createElement('link');
            link.rel = rel;
            link.href = origin;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        }
    } catch {
        // malformed URL — skip the hint, the client still works
    }
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
