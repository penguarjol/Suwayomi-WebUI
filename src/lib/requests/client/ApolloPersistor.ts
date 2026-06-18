/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { CachePersistor, LocalForageWrapper } from 'apollo3-cache-persist';
import localforage from 'localforage';

/*
 * Cross-session Apollo cache persistence (instant revisits).
 *
 * Stored in IndexedDB (NOT localStorage) so a multi-MB cache can never trigger a
 * QuotaExceededError that would break the Supabase auth session in localStorage.
 *
 * Safety:
 *  - Chapter lists are NEVER persisted (persistenceMapper strips them), so a
 *    persisted "initialized" manga can't hide newly released chapters — chapter
 *    queries always revalidate against the network.
 *  - The whole cache is invalidated daily (MAX_AGE_MS) and on app-version bump
 *    (PERSIST_VERSION), the client-side equivalent of a 24h cron refresh.
 *  - Restore is time-boxed so a slow/corrupt store never blocks app boot.
 */

// Bump when typePolicies / persisted cache shape changes to discard old caches.
const PERSIST_VERSION = '1';
const VERSION_KEY = 'nexus.apollo.cache.version';
const PERSISTED_AT_KEY = 'nexus.apollo.cache.persistedAt';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // daily auto-invalidation
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const RESTORE_TIMEOUT_MS = 1500;

const store = localforage.createInstance({ name: 'nexus-apollo-cache', storeName: 'apollo' });

let persistor: CachePersistor<NormalizedCacheObject> | null = null;

/**
 * Drop chapter data before persisting: ChapterType entries and any chapters(...)
 * field on the root query. On restore the chapter queries become cache misses
 * and refetch, so new chapters always appear while manga metadata stays instant.
 */
async function persistenceMapper(data: string): Promise<string> {
    try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        Object.keys(parsed).forEach((key) => {
            if (key.startsWith('ChapterType:')) {
                delete parsed[key];
            }
        });
        const root = parsed.ROOT_QUERY as Record<string, unknown> | undefined;
        if (root && typeof root === 'object') {
            Object.keys(root).forEach((field) => {
                if (field.startsWith('chapters')) {
                    delete root[field];
                }
            });
        }
        return JSON.stringify(parsed);
    } catch {
        return data;
    }
}

function withTimeout(promise: Promise<unknown>, ms: number): Promise<unknown> {
    const timeout = new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
    return Promise.race([promise, timeout]);
}

/**
 * Restore the persisted cache before the app renders so revisits paint instantly.
 * Purges on version change or after MAX_AGE_MS; always fails open within
 * RESTORE_TIMEOUT_MS so persistence never blocks or breaks boot.
 */
export async function restoreApolloCache(client: ApolloClient<NormalizedCacheObject>): Promise<void> {
    try {
        persistor = new CachePersistor({
            cache: client.cache,
            storage: new LocalForageWrapper(store),
            maxSize: MAX_SIZE_BYTES,
            persistenceMapper,
            trigger: 'write',
            debounce: 1000,
        });

        const version = window.localStorage.getItem(VERSION_KEY);
        const persistedAtRaw = window.localStorage.getItem(PERSISTED_AT_KEY);
        const persistedAt = persistedAtRaw ? Number(persistedAtRaw) : 0;
        const expired = !persistedAt || Date.now() - persistedAt > MAX_AGE_MS;

        if (version !== PERSIST_VERSION || expired) {
            await withTimeout(persistor.purge(), RESTORE_TIMEOUT_MS);
            window.localStorage.setItem(VERSION_KEY, PERSIST_VERSION);
            window.localStorage.setItem(PERSISTED_AT_KEY, String(Date.now()));
            return;
        }

        await withTimeout(persistor.restore(), RESTORE_TIMEOUT_MS);
    } catch {
        // best-effort: the app works without persistence
    }
}

/** Clear the persisted cache (e.g. on logout). */
export async function purgeApolloCache(): Promise<void> {
    try {
        await persistor?.purge();
    } catch {
        /* ignore */
    }
    try {
        window.localStorage.removeItem(VERSION_KEY);
        window.localStorage.removeItem(PERSISTED_AT_KEY);
    } catch {
        /* ignore */
    }
}
