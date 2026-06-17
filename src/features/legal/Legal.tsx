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
import { DmcaReportDialog } from '@/features/legal/DmcaReportDialog.tsx';
import { APP_NAME, LEGAL_CONTACT_EMAIL } from '@/features/legal/Legal.constants.ts';

export { LEGAL_CONTACT_EMAIL } from '@/features/legal/Legal.constants.ts';

// NOTE: standard protective boilerplate, strengthened for a metadata-index /
// reader posture + DMCA safe harbor. It is NOT a substitute for legal advice —
// have counsel review and set governing law before launch (see docs/LEGAL.md).
export const DISCLAIMER_SECTIONS: { title: string; body: string }[] = [
    {
        title: '1. Acceptance',
        body: `By creating an account or using ${APP_NAME} (the "Service") you agree to these Terms and the acknowledgements below. If you do not agree, do not use the Service.`,
    },
    {
        title: '2. What the Service is (and is not)',
        body: `${APP_NAME} is a technology tool: a reader interface and a metadata index. It does NOT host, store for redistribution, upload, own, create, sell, or control any third-party titles, images, or chapters. The catalogs and content available through the Service are selected and configured by users and administrators using independent third-party extensions and sources, and are retrieved directly from those third parties at your direction. During first-run setup you explicitly choose which sources to enable and acknowledge that they are independent third-party services; adult (NSFW) sources are not offered for selection, and ${APP_NAME} does not promote or curate any particular title or source. ${APP_NAME} stores only metadata necessary to operate the Service (e.g. titles, identifiers, descriptions, ratings, your library and reading progress). Any technical copy made while relaying content to your device is automatic, transient, and incidental to operating the interface — the function of a browser or proxy — and ${APP_NAME} does not curate or claim any rights in that content.`,
    },
    {
        title: '3. Third-party content',
        body: `All third-party titles, images, and chapters are provided by independent third parties. ${APP_NAME} makes no representation as to the legality, accuracy, availability, ownership, or quality of any such content and is not responsible for it. ${APP_NAME} does not endorse any source or extension. References to titles are for identification and interoperability only.`,
    },
    {
        title: '4. User responsibility',
        body: `You are solely responsible for your use of the Service, for the sources and extensions you choose to enable, and for ensuring that your access to and consumption of any content complies with all applicable laws, regulations, and third-party rights in your jurisdiction. You assume all risk arising from your use of the Service and any third-party content.`,
    },
    {
        title: '5. Copyright & DMCA',
        body: `${APP_NAME} respects intellectual-property rights and complies with the U.S. Digital Millennium Copyright Act (DMCA) and equivalent laws. Because ${APP_NAME} indexes metadata and relays third-party content rather than hosting it, most claims concern the third-party source; however, if you believe metadata we store or original content we host infringes your rights, send a notice to ${LEGAL_CONTACT_EMAIL} including: (a) your contact info; (b) identification of the work; (c) the specific material and its location; (d) a statement of good-faith belief that the use is unauthorized; (e) a statement, under penalty of perjury, that your notice is accurate and you are authorized to act; and (f) your signature. We act on valid notices, provide counter-notice rights, and terminate repeat infringers.`,
    },
    {
        title: '6. Original creator content & licensing',
        body: `Works published by creators through ${APP_NAME} Originals are licensed to us by those creators (see the Creator Agreement) and are the only content ${APP_NAME} distributes and sells directly. Creators represent that they own or control all rights in their works. Everything else is third-party content for which ${APP_NAME} acts only as a neutral interface.`,
    },
    {
        title: '7. No warranties',
        body: `The Service is provided "as is" and "as available" without warranties of any kind, whether express, implied, or statutory, including merchantability, fitness for a particular purpose, non-infringement, and uninterrupted or error-free operation.`,
    },
    {
        title: '8. Limitation of liability',
        body: `To the maximum extent permitted by law, ${APP_NAME} and its operators shall not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or any loss of data, revenue, or profits, arising out of or related to your use of (or inability to use) the Service or any content, even if advised of the possibility of such damages. Our total aggregate liability shall not exceed the amount you paid us, if any, in the 3 months preceding the claim.`,
    },
    {
        title: '9. Virtual items (Coins) & payments',
        body: `Coins and premium entitlements are a limited, revocable, non-transferable license to access certain features. They have no monetary value, are not redeemable for cash, and are non-refundable except where required by law or the rules of the applicable app store / payment processor. Prices and offerings may change at any time.`,
    },
    {
        title: '10. Acceptable use & termination',
        body: `You will not: misuse the Service; attempt to access non-public systems; upload unlawful, infringing, or harmful material; or use the Service to violate others' rights. We may suspend or terminate accounts, remove content, and cooperate with law enforcement for violations of these Terms or applicable law, with or without notice.`,
    },
    {
        title: '11. Indemnification',
        body: `You agree to indemnify and hold harmless ${APP_NAME} and its operators from any claims, damages, liabilities, and expenses (including reasonable legal fees) arising from your use of the Service, your content, or your violation of these Terms or any law or third-party right.`,
    },
    {
        title: '12. Governing law & disputes',
        body: `These Terms are governed by the laws applicable at the operator's principal place of business, without regard to conflict-of-laws rules. You agree to first attempt to resolve any dispute informally by contacting ${LEGAL_CONTACT_EMAIL}. To the extent permitted by law, you and ${APP_NAME} waive any right to a jury trial and to participate in a class action.`,
    },
    {
        title: '13. Changes & severability',
        body: `We may update these Terms; continued use after changes constitutes acceptance. If any provision is held unenforceable, the remaining provisions stay in effect. Nothing here is legal advice.`,
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
    const [dmcaOpen, setDmcaOpen] = useState(false);
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
            <Button
                variant="text"
                size="small"
                onClick={() => setDmcaOpen(true)}
                sx={{ textTransform: 'none', fontSize: 12, opacity: 0.8 }}
            >
                Report content (DMCA)
            </Button>
            <DmcaReportDialog open={dmcaOpen} onClose={() => setDmcaOpen(false)} />
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
