/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ReactNode, createContext, useCallback, useContext, useMemo, useRef } from 'react';

/**
 * Page-wide manga dedupe for Discover. Multiple rails (Popular, Trending,
 * Editor's picks, …) independently resolve manga, so the same title can surface
 * in several rails. Each rail "claims" the ids it wants to render; a given
 * manga id is owned by the first claimant, and other rails skip it.
 *
 * `claim(id, owner)` is idempotent per owner, so re-renders (incl. StrictMode
 * double-invoke) are safe. Ownership lives in a ref for the lifetime of the page.
 */
type Claim = (id: number, owner: string) => boolean;

const DiscoverDedupeContext = createContext<Claim | null>(null);

export const DiscoverDedupeProvider = ({ children }: { children: ReactNode }) => {
    const owners = useRef(new Map<number, string>());
    const claim = useCallback<Claim>((id, owner) => {
        const existing = owners.current.get(id);
        if (existing === undefined) {
            owners.current.set(id, owner);
            return true;
        }
        return existing === owner;
    }, []);

    return <DiscoverDedupeContext.Provider value={claim}>{children}</DiscoverDedupeContext.Provider>;
};

export const useDiscoverClaim = (): Claim | null => useContext(DiscoverDedupeContext);

/** Filter a list down to the manga this owner is allowed to render (page-wide unique). */
export const useDedupedMangas = <T extends { id: number }>(mangas: T[], owner: string): T[] => {
    const claim = useDiscoverClaim();
    return useMemo(() => {
        if (!claim) return mangas;
        return mangas.filter((manga) => claim(manga.id, owner));
    }, [mangas, claim, owner]);
};
