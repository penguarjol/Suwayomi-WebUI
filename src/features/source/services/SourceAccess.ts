/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBillingStore } from '@/features/billing/Billing.ts';

type SourceAccessInfo = {
    id: string | number;
    isNsfw?: boolean | null;
    extension?: { pkgName?: string | null } | null;
};

export interface SaasSourceConfig {
    allowedExtensions: string[];
    allowedSourceIds: string[];
    featuredSourceIds: string[];
    usesGlobalSourceAllowList: boolean;
}

const EMPTY_CONFIG: SaasSourceConfig = {
    allowedExtensions: [],
    allowedSourceIds: [],
    featuredSourceIds: [],
    usesGlobalSourceAllowList: false,
};

function normalizeConfig(raw: Partial<SaasSourceConfig> | null | undefined): SaasSourceConfig {
    return {
        allowedExtensions: Array.isArray(raw?.allowedExtensions) ? raw.allowedExtensions.map(String) : [],
        allowedSourceIds: Array.isArray(raw?.allowedSourceIds) ? raw.allowedSourceIds.map(String) : [],
        featuredSourceIds: Array.isArray(raw?.featuredSourceIds) ? raw.featuredSourceIds.map(String) : [],
        usesGlobalSourceAllowList: !!raw?.usesGlobalSourceAllowList,
    };
}

export async function fetchSaasSourceConfig(): Promise<SaasSourceConfig> {
    const response = await fetch('/api/saas/config');
    if (!response.ok) {
        throw new Error(`Source config returned ${response.status}`);
    }
    return normalizeConfig(await response.json());
}

export function isSourceAllowedByConfig(
    source: SourceAccessInfo,
    config: SaasSourceConfig | null,
    isAdmin: boolean,
): boolean {
    if (isAdmin) return true;
    if (!config) return false;

    if (config.usesGlobalSourceAllowList) {
        return config.allowedSourceIds.includes(String(source.id));
    }

    const pkgName = source.extension?.pkgName;
    return !!pkgName && config.allowedExtensions.includes(pkgName);
}

export function useSaasSourceAccess(): {
    ready: boolean;
    isAllowed: (source: SourceAccessInfo) => boolean;
    config: SaasSourceConfig;
} {
    const isAdmin = useBillingStore((state) => state.isAdmin);
    const [config, setConfig] = useState<SaasSourceConfig | null>(isAdmin ? EMPTY_CONFIG : null);

    useEffect(() => {
        let active = true;

        if (isAdmin) {
            setConfig(EMPTY_CONFIG);
            return () => {
                active = false;
            };
        }

        fetchSaasSourceConfig()
            .then((nextConfig) => {
                if (active) setConfig(nextConfig);
            })
            .catch(() => {
                if (active) setConfig(null);
            });

        return () => {
            active = false;
        };
    }, [isAdmin]);

    const isAllowed = useCallback(
        (source: SourceAccessInfo) => isSourceAllowedByConfig(source, config, isAdmin),
        [config, isAdmin],
    );

    return useMemo(
        () => ({
            ready: isAdmin || config !== null,
            isAllowed,
            config: config ?? EMPTY_CONFIG,
        }),
        [config, isAdmin, isAllowed],
    );
}
