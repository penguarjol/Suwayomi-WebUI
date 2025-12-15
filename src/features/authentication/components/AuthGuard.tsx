/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ReactNode, useEffect } from 'react';
import { SplashScreen } from '@/features/authentication/components/SplashScreen.tsx';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { supabase } from '@/lib/SupabaseClient.ts';

export const AuthGuard = ({ children }: { children: ReactNode }) => {
    const { isInitialized } = AuthManager.useSession();

    useEffect(() => {
        const initAuth = async () => {
            // Enforce authentication for Supabase integration
            AuthManager.setAuthRequired(true);

            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (session) {
                AuthManager.setTokens(session.access_token, session.refresh_token);

                // Fetch Profile and set Admin Role
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (profile && profile.role === 'admin') {
                    localStorage.setItem('isAdmin', 'true');
                } else {
                    localStorage.setItem('isAdmin', 'false');
                }
            }

            AuthManager.setAuthInitialized(true);
            requestManager.processQueues();
        };

        initAuth();
    }, []);

    if (!isInitialized) {
        return <SplashScreen />;
    }

    return children;
};
