/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Box from '@mui/material/Box';
import { AuthManager } from '@/features/authentication/AuthManager.ts';
import { useBillingStore } from '@/features/billing/Billing.ts';

const APP_NAME = 'Nexus Reads';

// NOTE: standard protective boilerplate. Have counsel review before launch in
// any jurisdiction you operate in.
export const DISCLAIMER_SECTIONS: { title: string; body: string }[] = [
    {
        title: '1. Acceptance',
        body: `By creating an account or using ${APP_NAME} (the "Service") you agree to these Terms and our acknowledgements below. If you do not agree, do not use the Service.`,
    },
    {
        title: '2. Third-party content',
        body: `${APP_NAME} is an aggregator/reader interface. It does not host, own, create, or control the content, catalogs, or sources made available through third-party extensions. All titles, images, and chapters are provided by independent third parties. ${APP_NAME} makes no representation as to the legality, accuracy, availability, or quality of any such content and is not responsible for it.`,
    },
    {
        title: '3. User responsibility',
        body: `You are solely responsible for your use of the Service and for ensuring that your access to and consumption of any content complies with all applicable laws, regulations, and third-party rights in your jurisdiction. You assume all risk arising from your use of the Service and any third-party content.`,
    },
    {
        title: '4. No warranties',
        body: `The Service is provided "as is" and "as available" without warranties of any kind, whether express, implied, or statutory, including merchantability, fitness for a particular purpose, non-infringement, and uninterrupted or error-free operation.`,
    },
    {
        title: '5. Limitation of liability',
        body: `To the maximum extent permitted by law, ${APP_NAME} and its operators shall not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or any loss of data, revenue, or profits, arising out of or related to your use of (or inability to use) the Service or any content, even if advised of the possibility of such damages. Our total aggregate liability shall not exceed the amount you paid us, if any, in the 3 months preceding the claim.`,
    },
    {
        title: '6. Virtual items (Coins) & payments',
        body: `Coins and premium entitlements are a limited, revocable, non-transferable license to access certain features. They have no monetary value, are not redeemable for cash, and are non-refundable except where required by law or the rules of the applicable app store / payment processor. Prices and offerings may change at any time.`,
    },
    {
        title: '7. Indemnification',
        body: `You agree to indemnify and hold harmless ${APP_NAME} and its operators from any claims, damages, liabilities, and expenses arising from your use of the Service or violation of these Terms.`,
    },
];

const DisclaimerBody = () => (
    <Stack sx={{ gap: 1.5 }}>
        {DISCLAIMER_SECTIONS.map((section) => (
            <Box key={section.title}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {section.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {section.body}
                </Typography>
            </Box>
        ))}
    </Stack>
);

/** Blocks the app until the signed-in user acknowledges the disclaimer. */
export const LegalGate = () => {
    const isAuthenticated = AuthManager.useIsAuthenticated();
    const loaded = useBillingStore((state) => state.loaded);
    const acceptedTerms = useBillingStore((state) => state.acceptedTerms);
    const acceptTerms = useBillingStore((state) => state.acceptTerms);
    const [checked, setChecked] = useState(false);

    if (!isAuthenticated || !loaded || acceptedTerms) return null;

    return (
        <Dialog open disableEscapeKeyDown fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontWeight: 800 }}>Welcome to {APP_NAME}</DialogTitle>
            <DialogContent dividers>
                <DisclaimerBody />
            </DialogContent>
            <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1, p: 2 }}>
                <FormControlLabel
                    control={<Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} />}
                    label="I have read and agree to the Terms and acknowledgements above."
                />
                <Button
                    variant="contained"
                    disabled={!checked}
                    onClick={() => acceptTerms()}
                    sx={{ textTransform: 'none' }}
                >
                    Agree & Continue
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/** Compact legal footer shown on non-reader screens. */
export const LegalFooter = () => {
    const [open, setOpen] = useState(false);
    return (
        <Box
            component="footer"
            sx={{
                px: 2,
                py: 2,
                textAlign: 'center',
                opacity: 0.6,
                fontSize: 12,
            }}
        >
            <Typography variant="caption" color="text.secondary">
                {`© ${new Date().getFullYear()} ${APP_NAME}. Content is provided by third-party sources; ${APP_NAME} is not responsible for it.`}
            </Typography>
            <Button
                variant="text"
                size="small"
                onClick={() => setOpen(true)}
                sx={{ textTransform: 'none', fontSize: 12, opacity: 0.8 }}
            >
                Terms &amp; Disclaimer
            </Button>
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" scroll="paper">
                <DialogTitle sx={{ fontWeight: 800 }}>Terms & Disclaimer</DialogTitle>
                <DialogContent dividers>
                    <DisclaimerBody />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none' }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
