/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import { useQueryParam, StringParam } from 'use-query-params';
import { useTranslation } from 'react-i18next';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import FavoriteIcon from '@mui/icons-material/Favorite';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import FilterListIcon from '@mui/icons-material/FilterList';
import { CustomTooltip } from '@/modules/core/components/CustomTooltip.tsx';
import {
    requestManager,
    AbortableApolloUseMutationPaginatedResponse,
    SPECIAL_ED_SOURCES,
} from '@/lib/requests/RequestManager.ts';
import { SourceGridLayout } from '@/modules/source/components/SourceGridLayout.tsx';
import { AppbarSearch } from '@/modules/core/components/AppbarSearch.tsx';
import { SourceOptions } from '@/modules/source/components/SourceOptions.tsx';
import { BaseMangaGrid } from '@/modules/manga/components/BaseMangaGrid.tsx';
import {
    GetSourceBrowseQuery,
    GetSourceBrowseQueryVariables,
    GetSourceMangasFetchMutation,
    GetSourceMangasFetchMutationVariables,
    SourceType,
} from '@/lib/graphql/generated/graphql.ts';
import { useMetadataServerSettings } from '@/modules/settings/services/ServerSettingsMetadata.ts';
import { useLocalStorage, useSessionStorage } from '@/modules/core/hooks/useStorage.tsx';
import { AppStorage } from '@/lib/storage/AppStorage.ts';
import { getGridSnapshotKey } from '@/modules/manga/components/MangaGrid.tsx';
import { createUpdateSourceMetadata, useGetSourceMetadata } from '@/modules/source/services/SourceMetadata.ts';
import { makeToast } from '@/modules/core/utils/Toast.ts';
import { GET_SOURCE_BROWSE } from '@/lib/graphql/queries/SourceQuery.ts';
import { TranslationKey } from '@/Base.types.ts';
import { IPos } from '@/modules/source/Source.types.ts';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';
import { EmptyView } from '@/modules/core/components/placeholder/EmptyView.tsx';
import { EmptyViewAbsoluteCentered } from '@/modules/core/components/placeholder/EmptyViewAbsoluteCentered.tsx';
import { MangaIdInfo } from '@/modules/manga/Manga.types.ts';
import { GridLayout } from '@/modules/core/Core.types.ts';
import { AppRoutes } from '@/modules/core/AppRoute.constants.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { useNavBarContext } from '@/modules/navigation-bar/contexts/NavbarContext.tsx';

const DEFAULT_SOURCE: Pick<SourceType, 'id'> = { id: '-1' };

const ContentTypeMenu = styled('div')(({ theme }) => ({
    display: 'flex',
    position: 'sticky',
    width: '100%',
    zIndex: 1,
    padding: theme.spacing(1),
    gap: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
}));

const ContentTypeButton = styled(Button)(() => ({}));

const StyledGridWrapper = styled(Box)(() => ({
    minHeight: '100%',
    position: 'relative',
}));

export enum SourceContentType {
    POPULAR,
    LATEST,
    SEARCH,
}

const SOURCE_CONTENT_TYPE_TO_ERROR_MSG_KEY: { [contentType in SourceContentType]: TranslationKey } = {
    [SourceContentType.POPULAR]: 'manga.error.label.no_mangas_found',
    [SourceContentType.LATEST]: 'manga.error.label.no_mangas_found',
    [SourceContentType.SEARCH]: 'manga.error.label.no_matches',
};

const getUniqueMangas = <Manga extends MangaIdInfo>(mangas: Manga[]): Manga[] => {
    const mangaIdToManga: Record<string, Manga> = {};
    const uniqueMangas: Manga[] = [];

    mangas.forEach((manga) => {
        const isDuplicate = !!mangaIdToManga[manga.id];
        if (!isDuplicate) {
            mangaIdToManga[manga.id] = manga;
            uniqueMangas.push(manga);
        }
    });

    return uniqueMangas;
};

const useSourceManga = (
    sourceId: string,
    contentType: SourceContentType,
    searchTerm: string | null | undefined,
    filters: IPos[],
    initialPages: number,
    hideLibraryEntries: boolean,
): [
    AbortableApolloUseMutationPaginatedResponse<GetSourceMangasFetchMutation, GetSourceMangasFetchMutationVariables>[0],
    AbortableApolloUseMutationPaginatedResponse<
        GetSourceMangasFetchMutation,
        GetSourceMangasFetchMutationVariables
    >[1][number] & { filteredOutAllItemsOfFetchedPage: boolean },
] => {
    let result: AbortableApolloUseMutationPaginatedResponse<
        GetSourceMangasFetchMutation,
        GetSourceMangasFetchMutationVariables
    >;
    switch (contentType) {
        case SourceContentType.POPULAR:
            result = requestManager.useGetSourcePopularMangas(sourceId, initialPages);
            break;
        case SourceContentType.LATEST:
            result = requestManager.useGetSourceLatestMangas(sourceId, initialPages);
            break;
        case SourceContentType.SEARCH:
            result = requestManager.useSourceSearch(
                sourceId,
                searchTerm ?? '',
                filters.map((filter) => {
                    const { position, state, group } = filter;

                    const isPartOfGroup = group !== undefined;
                    if (isPartOfGroup) {
                        return {
                            position: group,
                            groupChange: {
                                position,
                                [filter.type]: state,
                            },
                        };
                    }

                    return {
                        position,
                        [filter.type]: state,
                    };
                }),
                initialPages,
            );
            break;
        default:
            throw new Error(`Unknown ContentType "${contentType}"`);
    }

    const pages = result[1]!;
    const lastLoadedPageIndex = pages.findLastIndex((page) => !!page.data?.fetchSourceManga);
    const lastLoadedPage = pages[lastLoadedPageIndex];

    const isPageLoading = pages.slice(-1)[0].isLoading;
    let filteredOutAllItemsOfFetchedPage = !isPageLoading;
    const items = useMemo(() => {
        type FetchItemsResult = NonNullable<GetSourceMangasFetchMutation['fetchSourceManga']>['mangas'];
        let allItems: FetchItemsResult = [];

        pages.forEach((page, index) => {
            const pageItems = page.data?.fetchSourceManga?.mangas ?? [];
            const nonLibraryPageItems = pageItems.filter((item) => !hideLibraryEntries || !item.inLibrary);
            const uniqueItems = getUniqueMangas([...allItems, ...nonLibraryPageItems]);

            const isLastPage = !isPageLoading && pages.length === index + 1;
            filteredOutAllItemsOfFetchedPage = isLastPage && !nonLibraryPageItems.length && !!pageItems.length;
            allItems = uniqueItems;
        });

        return allItems;
    }, [pages, hideLibraryEntries]);

    if (lastLoadedPageIndex === -1) {
        return [result[0], { ...result[1][result[1].length - 1], filteredOutAllItemsOfFetchedPage }];
    }

    return [
        result[0],
        {
            ...pages[pages.length - 1],
            data: {
                ...lastLoadedPage!.data,
                fetchSourceManga: {
                    ...lastLoadedPage!.data!.fetchSourceManga,
                    hasNextPage:
                        pages.length > lastLoadedPageIndex + 1
                            ? false
                            : !!lastLoadedPage!.data!.fetchSourceManga?.hasNextPage,
                    mangas: items,
                },
            },
            filteredOutAllItemsOfFetchedPage,
        },
    ];
};

export function SourceMangas() {
    const { t } = useTranslation();
    const { setTitle, setAction, appBarHeight } = useNavBarContext();

    const { sourceId } = useParams<{ sourceId: string }>();

    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { key: locationKey, state: locationState } = location;
    const { contentType: initialContentType = SourceContentType.POPULAR, clearCache = false } =
        useLocation<{
            contentType: SourceContentType;
            clearCache: boolean;
        }>().state ?? {};

    const {
        settings: { hideLibraryEntries },
    } = useMetadataServerSettings();

    const [sourceGridLayout] = useLocalStorage('source-grid-layout', GridLayout.Compact);
    const [query] = useQueryParam('query', StringParam);
    const [currentFiltersToApply, setCurrentFiltersToApply] = useSessionStorage<IPos[] | undefined>(
        `source-mangas-${sourceId}-filters`,
        [],
    );
    const [filtersToApply, setLocationFiltersToApply] = useSessionStorage<IPos[]>(
        `source-mangas-location-${locationKey}-${sourceId}-filters`,
        currentFiltersToApply ?? [],
    );
    const [dialogFiltersToApply, setDialogFiltersToApply] = useState<IPos[]>(filtersToApply);
    const [currentContentType, setCurrentContentType] = useSessionStorage<SourceContentType | undefined>(
        `source-mangas-${sourceId}-content-type`,
        initialContentType,
    );
    const [contentType, setLocationContentType] = useSessionStorage(
        `source-mangas-location-${locationKey}-${sourceId}-content-type`,
        query ? SourceContentType.SEARCH : currentContentType!,
    );

    const scrollToTop = useCallback(() => {
        AppStorage.session.setItem(getGridSnapshotKey(location), undefined, false);
        window.scrollTo(0, 0);
    }, [locationKey]);

    const currentQuery = useRef(query);
    const currentAbortRequest = useRef<(reason: any) => void>(() => {});

    const didSearchChange = currentQuery.current !== query;
    if (didSearchChange && contentType === SourceContentType.SEARCH) {
        currentQuery.current = query;
        currentAbortRequest.current(new Error(`SourceMangas(${sourceId}): search string changed`));
        scrollToTop();
    }

    useEffect(
        () => () => {
            setCurrentFiltersToApply(undefined);
            setCurrentContentType(undefined);
        },
        [sourceId],
    );

    const setFiltersToApply = (filters: IPos[]) => {
        setCurrentFiltersToApply(filters);
        setLocationFiltersToApply(filters);
        scrollToTop();
    };

    const setContentType = (newContentType: SourceContentType) => {
        setCurrentContentType(newContentType);
        setLocationContentType(newContentType);
    };

    const [
        loadPage,
        { data, error, isLoading: loading, size: lastPageNum, abortRequest, filteredOutAllItemsOfFetchedPage },
    ] = useSourceManga(sourceId, contentType, query, filtersToApply, 1, hideLibraryEntries);
    currentAbortRequest.current = abortRequest;
    const isLoading = loading || filteredOutAllItemsOfFetchedPage;
    const mangas = data?.fetchSourceManga?.mangas ?? [];
    const hasNextPage = !!data?.fetchSourceManga?.hasNextPage;
    const { data: sourceData } = requestManager.useGetSource<GetSourceBrowseQuery, GetSourceBrowseQueryVariables>(
        GET_SOURCE_BROWSE,
        sourceId,
    );
    const source = sourceData?.source;

    const filters = source?.filters ?? [];
    const { savedSearches = {} } = useGetSourceMetadata(source ?? DEFAULT_SOURCE);
    const updateSourceMetadata = createUpdateSourceMetadata<'savedSearches'>(source ?? { id: '-1' }, (e) =>
        makeToast(t('global.error.label.failed_to_save_changes'), 'error', getErrorMessage(e)),
    );

    const selectSavedSearch = useCallback(
        (savedSearch: string) => {
            const { query: savedSearchQuery, filters: savedSearchFilters } = savedSearches[savedSearch];

            if (savedSearchFilters) {
                setDialogFiltersToApply(savedSearchFilters);
                setFiltersToApply(savedSearchFilters);
            }

            if (savedSearchQuery) {
                searchParams.set('query', savedSearchQuery);
                setSearchParams(searchParams);
            }
        },
        [savedSearches, locationState],
    );

    const handleSavedSearchesUpdate = useCallback(
        (savedSearch: string, updateType: 'create' | 'delete') => {
            if (updateType === 'delete') {
                const savedSearchesCopy = { ...savedSearches };
                delete savedSearchesCopy[savedSearch];
                updateSourceMetadata('savedSearches', savedSearchesCopy);
                return;
            }

            const updatedSavedSearches = {
                ...savedSearches,
                [savedSearch]: { query: query ?? undefined, filters: dialogFiltersToApply },
            };
            updateSourceMetadata('savedSearches', updatedSavedSearches);
        },
        [savedSearches, query, dialogFiltersToApply],
    );

    const message = !isLoading ? t(SOURCE_CONTENT_TYPE_TO_ERROR_MSG_KEY[contentType]) : undefined;
    const isLocalSource = sourceId === '0';
    const messageExtra = isLocalSource ? (
        <>
            <span>{t('source.local_source.label.checkout')} </span>
            <Link href="https://github.com/Suwayomi/Suwayomi-Server/wiki/Local-Source" target="_blank" rel="noreferrer">
                {t('source.local_source.label.guide')}
            </Link>
        </>
    ) : undefined;

    const updateContentType = useCallback(
        (newContentType: SourceContentType, newSearch?: string | null) => {
            setContentType(newContentType);
            scrollToTop();

            if (query && !newSearch) {
                navigate(
                    {
                        pathname: '',
                    },
                    {
                        state: { ...locationState, contentType: newContentType },
                    },
                );
            }
        },
        [setContentType, query, scrollToTop],
    );

    const setSearchContentType = !!query && contentType !== SourceContentType.SEARCH;
    if (setSearchContentType) {
        updateContentType(SourceContentType.SEARCH, query);
    }

    const loadMore = useCallback(() => {
        if (!hasNextPage) {
            return;
        }

        loadPage(lastPageNum + 1);
    }, [lastPageNum, hasNextPage, contentType]);

    const resetFilters = () => {
        setDialogFiltersToApply([]);
        setFiltersToApply([]);
    };

    useEffect(() => {
        if (filteredOutAllItemsOfFetchedPage && hasNextPage && !loading) {
            loadPage(lastPageNum + 1);
        }
    }, [filteredOutAllItemsOfFetchedPage, loading]);

    useEffect(() => {
        if (!clearCache) {
            return;
        }

        const requiresClear = SPECIAL_ED_SOURCES.REVALIDATION.includes(sourceId);
        if (!requiresClear) {
            return;
        }

        requestManager.clearBrowseCacheFor(sourceId);
    }, [clearCache]);

    useLayoutEffect(() => {
        setTitle(source?.displayName ?? t('source.title_one'));
        setAction(
            <>
                <AppbarSearch />
                <SourceGridLayout />
                {source?.isConfigurable && (
                    <CustomTooltip title={t('settings.title')}>
                        <IconButton
                            onClick={() => navigate(AppRoutes.sources.childRoutes.configure.path(sourceId))}
                            aria-label="display more actions"
                            edge="end"
                            color="inherit"
                            size="large"
                        >
                            <SettingsIcon />
                        </IconButton>
                    </CustomTooltip>
                )}
            </>,
        );

        return () => {
            setTitle('');
            setAction(null);
        };
    }, [t, source]);

    const EmptyViewComponent = mangas.length ? EmptyView : EmptyViewAbsoluteCentered;

    return (
        <StyledGridWrapper>
            <ContentTypeMenu sx={{ top: `${appBarHeight}px` }}>
                <ContentTypeButton
                    variant={contentType === SourceContentType.POPULAR ? 'contained' : 'outlined'}
                    startIcon={<FavoriteIcon />}
                    onClick={() => updateContentType(SourceContentType.POPULAR)}
                >
                    {t('global.button.popular')}
                </ContentTypeButton>
                {source?.supportsLatest === undefined || source.supportsLatest ? (
                    <ContentTypeButton
                        disabled={!source?.supportsLatest}
                        variant={contentType === SourceContentType.LATEST ? 'contained' : 'outlined'}
                        startIcon={<NewReleasesIcon />}
                        onClick={() => updateContentType(SourceContentType.LATEST)}
                    >
                        {t('global.button.latest')}
                    </ContentTypeButton>
                ) : null}
                <ContentTypeButton
                    variant={contentType === SourceContentType.SEARCH ? 'contained' : 'outlined'}
                    startIcon={<FilterListIcon />}
                    onClick={() => updateContentType(SourceContentType.SEARCH, query)}
                >
                    {t('global.button.filter')}
                </ContentTypeButton>
            </ContentTypeMenu>

            {(isLoading || !error || (!!error && !!mangas.length)) && (
                <BaseMangaGrid
                    key={contentType}
                    gridWrapperProps={{ sx: { px: 1, pb: 1 } }}
                    mangas={mangas}
                    hasNextPage={hasNextPage}
                    loadMore={loadMore}
                    message={message}
                    messageExtra={messageExtra}
                    isLoading={isLoading}
                    gridLayout={sourceGridLayout}
                    mode="source"
                    inLibraryIndicator
                />
            )}

            {error && (
                <EmptyViewComponent
                    message={t('global.error.label.failed_to_load_data')}
                    messageExtra={getErrorMessage(error)}
                    retry={() => loadPage(lastPageNum).catch(defaultPromiseErrorHandler('SourceMangas::refetch'))}
                />
            )}

            {contentType === SourceContentType.SEARCH && (
                <SourceOptions
                    savedSearches={savedSearches}
                    selectSavedSearch={selectSavedSearch}
                    updateSavedSearches={handleSavedSearchesUpdate}
                    sourceFilter={filters}
                    updateFilterValue={setDialogFiltersToApply}
                    setTriggerUpdate={() => {
                        setFiltersToApply(dialogFiltersToApply);
                    }}
                    resetFilterValue={resetFilters}
                    update={dialogFiltersToApply}
                />
            )}
        </StyledGridWrapper>
    );
}
