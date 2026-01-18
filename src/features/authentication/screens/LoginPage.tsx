/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { StringParam, useQueryParam } from 'use-query-params';
import Typography from '@mui/material/Typography';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { supabase } from '@/lib/SupabaseClient.ts';
import { PasswordTextField } from '@/base/components/inputs/PasswordTextField.tsx';
import { makeToast } from '@/base/utils/Toast.ts';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { useNavBarContext } from '@/features/navigation-bar/NavbarContext.tsx';
import { SearchParam } from '@/base/Base.types.ts';
import { SplashScreen } from '@/features/authentication/components/SplashScreen.tsx';
import { ServerAddressSetting } from '@/features/settings/components/ServerAddressSetting.tsx';

export const LoginPage = () => {
    const theme = useTheme();
    const { t } = useTranslation();
    const { setOverride } = useNavBarContext();
    const navigate = useNavigate();
    const isAuthenticated = AuthManager.useIsAuthenticated();

    const [redirect] = useQueryParam(SearchParam.REDIRECT, StringParam);

    // Auth State
    const [isLoading, setIsLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState(''); // Supabase uses email, not username
    const [password, setPassword] = useState('');

    const doLogin = async () => {
        setIsLoading(true);
        try {
            let error;
            let data;

            if (isSignUp) {
                // Sign Up
                const res = await supabase.auth.signUp({
                    email,
                    password,
                });
                error = res.error;
                data = res.data;
                if (!error && data.user) {
                    makeToast('Account created! You can now log in.', 'success');
                    setIsSignUp(false); // Switch back to login
                    setIsLoading(false);
                    return;
                }
            } else {
                // Sign In
                const res = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                error = res.error;
                data = res.data;

                if (data.session) {
                    // Store the Supabase JWT as the Access Token
                    AuthManager.setTokens(data.session.access_token, data.session.refresh_token);

                    // Fetch Profile using the session user ID
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', data.session.user.id)
                        .single();

                    console.log('[LoginPage] Supabase Profile Fetch:', profile);
                    if (profileError) console.error('[LoginPage] Profile Fetch Error:', profileError);

                    if (profile && profile.role === 'admin') {
                        localStorage.setItem('isAdmin', 'true');
                    } else {
                        localStorage.setItem('isAdmin', 'false');
                    }

                    // Reset client to clear cache/stale state before redirecting
                    requestManager.reset();

                    navigate(redirect ?? AppRoutes.sources.childRoutes.browse.path('2131019126180322627'));
                }
            }

            if (error) throw error;
        } catch (e: any) {
            makeToast(e.message || 'Authentication failed', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setOverride({ status: true, value: null });

        return () => setOverride({ status: false, value: null });
    }, []);

    if (isAuthenticated) {
        return <Navigate to={AppRoutes.root.path} replace />;
    }

    return (
        <Stack
            sx={{
                [theme.breakpoints.up('lg')]: {
                    flexDirection: 'row',
                },
            }}
        >
            <SplashScreen
                slots={{
                    stackProps: {
                        sx: {
                            position: 'unset',
                            minWidth: 'auto',
                            minHeight: '50vh',
                            flexBasis: '60%',
                            p: 4,
                            [theme.breakpoints.up('lg')]: {
                                minHeight: '0vh',
                                height: '100vh',
                            },
                        },
                    },
                    serverAddressProps: {
                        sx: {
                            display: 'none',
                        },
                    },
                }}
            />
            <Stack
                sx={{
                    position: 'relative',
                    minHeight: '50vh',
                    flexBasis: '40%',
                    p: 4,
                    justifyContent: 'center',
                    alignItems: 'center',
                    [theme.breakpoints.up('lg')]: {
                        minHeight: '0vh',
                        height: '100vh',
                    },
                }}
            >
                <Stack sx={{ maxWidth: 300, gap: 2 }}>
                    <Typography variant="h5" textAlign="center">
                        {isSignUp ? 'Create Account' : t('global.button.log_in')}
                    </Typography>

                    <Stack>
                        <TextField
                            autoFocus
                            margin="dense"
                            id="email"
                            name="email"
                            label="Email"
                            type="email"
                            fullWidth
                            variant="standard"
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <PasswordTextField
                            margin="dense"
                            fullWidth
                            variant="standard"
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </Stack>
                    <Button disabled={isLoading || (!email && !password)} variant="contained" onClick={doLogin}>
                        {isLoading ? 'Processing...' : undefined}
                        {!isLoading && isSignUp ? 'Sign Up' : undefined}
                        {!isLoading && !isSignUp ? t('global.button.log_in') : undefined}
                    </Button>

                    <Button variant="text" onClick={() => setIsSignUp(!isSignUp)} disabled={isLoading}>
                        {isSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
                    </Button>

                    <Stack sx={{ position: 'absolute', left: 0, bottom: 0 }}>
                        <ServerAddressSetting />
                    </Stack>
                </Stack>
            </Stack>
        </Stack>
    );
};
