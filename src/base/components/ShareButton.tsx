/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import IconButton from '@mui/material/IconButton';
import IosShareIcon from '@mui/icons-material/IosShare';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';
import { makeToast } from '@/base/utils/Toast.ts';

/** Share an in-app entity via the Web Share API, falling back to copy-link. */
export const ShareButton = ({ title, path }: { title: string; path: string }) => {
    const onShare = async () => {
        const url = `${window.location.origin}${path}`;
        const nav = navigator as Navigator & { share?: (data: { title: string; url: string }) => Promise<void> };
        if (nav.share) {
            nav.share({ title, url }).catch(() => {});
            return;
        }
        try {
            await navigator.clipboard.writeText(url);
            makeToast('Link copied', 'success');
        } catch {
            makeToast('Could not copy link', 'error');
        }
    };

    return (
        <CustomTooltip title="Share">
            <IconButton aria-label="share" onClick={onShare}>
                <IosShareIcon />
            </IconButton>
        </CustomTooltip>
    );
};
