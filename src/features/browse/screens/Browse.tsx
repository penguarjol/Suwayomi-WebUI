/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useTranslation } from 'react-i18next';
import { Sources } from '@/features/browse/sources/Sources.tsx';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';

// Browse is sources-only. Extension management lives in the Admin Console
// (Admin → Extensions); it is intentionally not exposed here.
export function Browse() {
    const { t } = useTranslation();
    useAppTitle(t('global.label.browse'));

    return <Sources tabsMenuHeight={0} />;
}
