/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useMemo } from 'react';
import { requestManager } from '@/lib/requests/RequestManager.ts';

/**
 * Set of source ids that are safe to surface in global/home rails: sources the
 * user is allowed to see (the Gatekeeper already strips NSFW sources from
 * non-admins) and that are not flagged isNsfw (covers admins, who can see all).
 * Used to keep 18+/NSFW titles out of Trending, Recommended, and Continue
 * Reading. `ready` is false until the source list has loaded, so callers should
 * hide content until then rather than risk showing unfiltered titles.
 */
export function useApprovedSourceIds(): { ready: boolean; isApproved: (sourceId: string | number) => boolean } {
    const { data } = requestManager.useGetSourceList({ fetchPolicy: 'cache-first' });

    return useMemo(() => {
        const nodes = data?.sources?.nodes ?? [];
        const approved = new Set<string>();
        nodes.forEach((source) => {
            if (!source.isNsfw) approved.add(String(source.id));
        });
        return {
            ready: nodes.length > 0,
            isApproved: (sourceId: string | number) => approved.has(String(sourceId)),
        };
    }, [data?.sources?.nodes]);
}
