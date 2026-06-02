/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ReactNode, useEffect, useRef } from 'react';
import { SplashScreen } from '@/features/authentication/components/SplashScreen.tsx';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { supabase } from '@/lib/SupabaseClient.ts';

export const AuthGuard = ({ children }: { children: ReactNode }) => {
    const { isInitialized } = AuthManager.useSession();
    const initStarted = useRef(false);

    useEffect(() => {
        if (initStarted.current) return;
        initStarted.current = true;

        const initAuth = async () => {
            try {
                // Enforce authentication for Supabase integration
                AuthManager.setAuthRequired(true);

                // Bound the session lookup so a slow/offline network resolves to
                // the login screen instead of an indefinite splash (ADR-0004).
                const sessionResult = await Promise.race([
                    supabase.auth.getSession(),
                    new Promise<{ data: { session: null } }>((resolve) => {
                        setTimeout(() => resolve({ data: { session: null } }), 8000);
                    }),
                ]);
                const {
                    data: { session },
                } = sessionResult;

                if (session) {
                    AuthManager.setTokens(session.access_token, session.refresh_token);

                    // Sync Admin state from localStorage/Profile
                    const cachedIsAdmin = localStorage.getItem('isAdmin');

                    if (cachedIsAdmin === null) {
                        // Cold start rescue: fetch profile if missing from cache
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('role')
                            .eq('id', session.user.id)
                            .single();

                        localStorage.setItem('isAdmin', profile?.role === 'admin' ? 'true' : 'false');
                    }
                } else {
                    // No session, ensure clean slate
                    AuthManager.removeTokens();
                }
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error('[AuthGuard] Initialization error:', e);
            } finally {
                AuthManager.setAuthInitialized(true);
                requestManager.processQueues();
            }
        };

        initAuth();
    }, []);

    if (!isInitialized) {
        return <SplashScreen />;
    }

    return children;
};
