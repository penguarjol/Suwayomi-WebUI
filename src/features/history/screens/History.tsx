/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Typography from '@mui/material/Typography';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { StyledGroupedVirtuoso } from '@/base/components/virtuoso/StyledGroupedVirtuoso.tsx';
import { StyledGroupHeader } from '@/base/components/virtuoso/StyledGroupHeader.tsx';
import { StyledGroupItemWrapper } from '@/base/components/virtuoso/StyledGroupItemWrapper.tsx';
import { VirtuosoUtil } from '@/lib/virtuoso/Virtuoso.util.tsx';
import { ChapterHistoryCard } from '@/features/history/components/ChapterHistoryCard.tsx';
import { Chapters } from '@/features/chapter/services/Chapters.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { GET_CHAPTERS_HISTORY } from '@/lib/graphql/queries/ChapterQuery.ts';
import {
    ChapterHistoryListFieldsFragment,
    GetChaptersHistoryQuery,
    GetChaptersHistoryQueryVariables,
} from '@/lib/graphql/generated/graphql.ts';
import { HistoryRef, getUserHistoryRefs } from '@/features/library/services/UserProgress.ts';

/**
 * Per-user reading history (ADR-0005). The engine's chapter read-state is
 * GLOBAL, so history is sourced from this user's `user_chapter_progress` rows
 * (chapter ids + per-user timestamps), then the engine chapter nodes are
 * resolved by id for rendering. The per-user timestamp overrides the engine's
 * shared `lastReadAt` so dates reflect THIS user.
 */
export const History: React.FC = () => {
    const { t } = useTranslation();
    useAppTitle(t('history.title'));

    const [refs, setRefs] = useState<HistoryRef[] | null>(null);
    useEffect(() => {
        getUserHistoryRefs()
            .then(setRefs)
            .catch(() => setRefs([]));
    }, []);

    const chapterIds = useMemo(() => (refs ?? []).map((ref) => ref.chapterId), [refs]);

    const { data, loading } = requestManager.useGetChapters<GetChaptersHistoryQuery, GetChaptersHistoryQueryVariables>(
        GET_CHAPTERS_HISTORY,
        { filter: { id: { in: chapterIds } }, first: Math.max(1, chapterIds.length) },
        { skip: chapterIds.length === 0, fetchPolicy: 'cache-and-network' },
    );

    // Order engine nodes by the user's most-recent read and overlay the per-user
    // timestamp so grouping/labels reflect this user, not the shared engine state.
    const readEntries = useMemo<ChapterHistoryListFieldsFragment[]>(() => {
        const nodes = data?.chapters.nodes ?? [];
        const byId = new Map(nodes.map((node) => [node.id, node]));
        return (refs ?? [])
            .map((ref) => {
                const node = byId.get(ref.chapterId);
                return node ? { ...node, lastReadAt: String(ref.lastReadUnix) } : null;
            })
            .filter((node): node is ChapterHistoryListFieldsFragment => node !== null);
    }, [data, refs]);

    const groupedHistory = useMemo(
        () => Object.entries(Chapters.groupByDate(readEntries, 'lastReadAt')),
        [readEntries],
    );
    const groupCounts: number[] = useMemo(
        () => groupedHistory.map((group) => group[VirtuosoUtil.ITEMS].length),
        [groupedHistory],
    );

    const computeItemKey = VirtuosoUtil.useCreateGroupedComputeItemKey(
        groupCounts,
        useCallback((index) => groupedHistory[index][VirtuosoUtil.GROUP], [groupedHistory]),
        useCallback((index) => readEntries[index].id, [readEntries]),
    );

    const isLoading = refs === null || (chapterIds.length > 0 && loading && readEntries.length === 0);

    if (isLoading) {
        return <LoadingPlaceholder />;
    }

    if (readEntries.length === 0) {
        return <EmptyViewAbsoluteCentered message={t('history.error.label.no_history_available')} />;
    }

    return (
        <StyledGroupedVirtuoso
            persistKey="history"
            overscan={window.innerHeight * 0.5}
            groupCounts={groupCounts}
            groupContent={(index) => (
                <StyledGroupHeader isFirstItem={index === 0}>
                    <Typography variant="h5" component="h2">
                        {groupedHistory[index][VirtuosoUtil.GROUP]}
                    </Typography>
                </StyledGroupHeader>
            )}
            computeItemKey={computeItemKey}
            itemContent={(index) => (
                <StyledGroupItemWrapper>
                    <ChapterHistoryCard chapter={readEntries[index]} />
                </StyledGroupItemWrapper>
            )}
        />
    );
};
