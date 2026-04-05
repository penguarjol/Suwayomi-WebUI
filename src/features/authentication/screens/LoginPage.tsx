/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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

                    // Short delay to allow Apollo Client to re-initialize sockets/cache before we fire the new query
                    await new Promise<void>((resolve) => {
                        setTimeout(resolve, 500);
                    });

                    navigate(redirect ?? AppRoutes.root.path);
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
                position: 'relative',
                width: '100vw',
                height: '100vh',
                overflow: 'hidden',
                [theme.breakpoints.up('lg')]: {
                    flexDirection: 'row',
                },
            }}
        >
            <SplashScreen
                slots={{
                    stackProps: {
                        sx: {
                            position: 'relative',
                            minWidth: 'auto',
                            minHeight: '50vh',
                            flexBasis: '60%',
                            p: 4,
                            background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, rgba(14, 9, 20, 0.8) 100%)`,
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
                    background: `linear-gradient(to right, rgba(0,0,0,0.6) 0%, ${theme.palette.background.paper} 100%)`,
                    backdropFilter: 'blur(30px)',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                    [theme.breakpoints.up('lg')]: {
                        minHeight: '0vh',
                        height: '100vh',
                    },
                }}
            >
                <Stack
                    sx={{
                        maxWidth: 400,
                        width: '100%',
                        gap: 3,
                        p: 5,
                        borderRadius: 4,
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        zIndex: 2,
                    }}
                >
                    <Typography variant="h4" textAlign="center" sx={{ fontWeight: 800, color: 'primary.main', mb: 2 }}>
                        {isSignUp ? 'Join Nexus Reads' : 'Welcome Back'}
                    </Typography>

                    <Stack gap={2}>
                        <TextField
                            autoFocus
                            id="email"
                            name="email"
                            label="Email Address"
                            type="email"
                            fullWidth
                            variant="outlined"
                            autoComplete="username"
                            onChange={(e) => setEmail(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                },
                            }}
                        />
                        <PasswordTextField
                            fullWidth
                            label="Password"
                            variant="outlined"
                            autoComplete="current-password"
                            onChange={(e) => setPassword(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                },
                            }}
                        />
                    </Stack>

                    <Button
                        disabled={isLoading || (!email && !password)}
                        variant="contained"
                        size="large"
                        onClick={doLogin}
                        sx={{
                            mt: 2,
                            borderRadius: '50px',
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '1rem',
                            boxShadow: `0 4px 14px 0 ${theme.palette.primary.main}60`,
                            '&:hover': {
                                boxShadow: `0 6px 20px 0 ${theme.palette.primary.main}80`,
                            },
                        }}
                    >
                        {isLoading ? 'Authenticating...' : undefined}
                        {!isLoading && isSignUp ? 'Create Account' : undefined}
                        {!isLoading && !isSignUp ? 'Sign Into Nexus Reads' : undefined}
                    </Button>

                    <Button
                        variant="text"
                        onClick={() => setIsSignUp(!isSignUp)}
                        disabled={isLoading}
                        sx={{ textTransform: 'none', opacity: 0.7 }}
                    >
                        {isSignUp ? 'Already have an account? Log In' : 'Need access? Sign Up'}
                    </Button>
                </Stack>

                <Stack sx={{ position: 'absolute', left: 40, bottom: 40, opacity: 0.5 }}>
                    <ServerAddressSetting />
                </Stack>
            </Stack>
        </Stack>
    );
};
