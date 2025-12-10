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
    const { isAuthRequired } = AuthManager.useSession();

    useEffect(() => {
        const initAuth = async () => {
            // Enforce authentication for Supabase integration
            AuthManager.setAuthRequired(true);

            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (session) {
                AuthManager.setTokens(session.access_token, session.refresh_token);
            }

            AuthManager.setAuthInitialized(true);
            requestManager.processQueues();
        };

        initAuth();
    }, []);

    if (isAuthRequired === null) {
        return <SplashScreen />;
    }

    return children;
};
