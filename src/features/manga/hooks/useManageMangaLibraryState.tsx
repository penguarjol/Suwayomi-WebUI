/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MangaType } from '@/lib/graphql/generated/graphql.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';
import { Confirmation } from '@/base/AppAwaitableComponent.ts';
import { useUserLibraryStore } from '@/features/library/services/UserLibrary.ts';

/**
 * Per-user library toggle. Backed by Supabase (`user_library`) so each user
 * has a private library isolated by RLS, rather than the engine's shared
 * global `inLibrary` flag (see ADR-0005). The return shape is unchanged so
 * every existing call site keeps working.
 *
 * Note: per-user categories are a separate (Phase C) surface; the add flow
 * here no longer opens the engine category-select dialog.
 */
export const useManageMangaLibraryState = (
    manga: Pick<MangaType, 'id' | 'title'> & Partial<Pick<MangaType, 'inLibrary'>>,
    confirmRemoval: boolean = false,
) => {
    const { t } = useTranslation();

    const isInLibrary = useUserLibraryStore((state) => state.favoriteIds.includes(manga.id));

    const updateLibraryState = useCallback(() => {
        const run = async () => {
            const store = useUserLibraryStore.getState();
            const currentlyInLibrary = store.favoriteIds.includes(manga.id);

            if (currentlyInLibrary) {
                if (confirmRemoval) {
                    try {
                        await Confirmation.show(
                            {
                                title: t('global.label.are_you_sure'),
                                message: t('manga.action.library.remove.dialog.label.message', { title: manga.title }),
                                actions: { confirm: { title: t('global.button.remove') } },
                            },
                            { id: `manga-library-state-remove-${manga.id}` },
                        );
                    } catch {
                        return; // user dismissed the confirmation
                    }
                }
                await store.remove(manga.id);
                makeToast(t('library.info.label.removed_from_library'), 'success');
            } else {
                await store.add(manga.id, manga.title);
                makeToast(t('library.info.label.added_to_library'), 'success');
            }
        };

        run().catch((e) => {
            makeToast(t('library.error.label.add_to_library'), 'error', getErrorMessage(e));
            defaultPromiseErrorHandler('useManageMangaLibraryState::updateLibraryState')(e);
        });
    }, [manga.id, manga.title, confirmRemoval, t]);

    return {
        updateLibraryState,
        isInLibrary,
    };
};
