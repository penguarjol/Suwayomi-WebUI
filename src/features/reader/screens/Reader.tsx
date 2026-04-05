/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Box from '@mui/material/Box';
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDefaultReaderSettings } from '@/features/reader/settings/ReaderSettingsMetadata.ts';
import { useNavBarContext } from '@/features/navigation-bar/NavbarContext.tsx';
import { ReaderOverlay } from '@/features/reader/overlay/ReaderOverlay.tsx';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { GetChaptersReaderQuery, GetMangaReaderQuery } from '@/lib/graphql/generated/graphql.ts';
import { GET_MANGA_READER } from '@/lib/graphql/queries/MangaQuery.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';
import { GET_CHAPTERS_READER } from '@/lib/graphql/queries/ChapterQuery.ts';
import { TapZoneLayout } from '@/features/reader/tap-zones/TapZoneLayout.tsx';
import { ReaderRGBAFilter } from '@/features/reader/filters/ReaderRGBAFilter.tsx';
import { ReaderViewer } from '@/features/reader/viewer/ReaderViewer.tsx';
import { READER_BACKGROUND_TO_COLOR } from '@/features/reader/settings/ReaderSettings.constants.tsx';
import { ReaderHotkeys } from '@/features/reader/hotkeys/ReaderHotkeys.tsx';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { NavbarContextType } from '@/features/navigation-bar/NavigationBar.types.ts';
import { withPropsFrom } from '@/base/hoc/withPropsFrom.tsx';
import { useReaderResetStates } from '@/features/reader/hooks/useReaderResetStates.ts';
import { useReaderSetSettingsState } from '@/features/reader/hooks/useReaderSetSettingsState.ts';
import { useReaderShowSettingPreviewOnChange } from '@/features/reader/hooks/useReaderShowSettingPreviewOnChange.ts';
import { useReaderSetChaptersState } from '@/features/reader/hooks/useReaderSetChaptersState.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { useChapterListOptions } from '@/features/chapter/utils/ChapterList.util.tsx';
import { FALLBACK_MANGA } from '@/features/manga/Manga.constants.ts';
import {
    getReaderOverlayStore,
    getReaderStore,
    useReaderChaptersStore,
    useReaderSettingsStore,
    useReaderStore,
    useReaderTapZoneStore,
} from '@/features/reader/stores/ReaderStore.ts';

import { ReaderAutoScroll } from '@/features/reader/auto-scroll/ReaderAutoScroll.tsx';

const BaseReader = ({
    setOverride,
    readerNavBarWidth,
}: Pick<NavbarContextType, 'setOverride' | 'readerNavBarWidth'>) => {
    const { t } = useTranslation();
    const manga = useReaderStore((state) => state.manga);
    const { mangaChapters, initialChapter, chapterForDuplicatesHandling, currentChapter } = useReaderChaptersStore(
        (state) => ({
            mangaChapters: state.chapters.mangaChapters,
            initialChapter: state.chapters.initialChapter,
            chapterForDuplicatesHandling: state.chapters.chapterForDuplicatesHandling,
            currentChapter: state.chapters.currentChapter,
        }),
    );
    const {
        shouldSkipDupChapters,
        shouldSkipFilteredChapters,
        backgroundColor,
        readingMode,
        tapZoneLayout,
        tapZoneInvertMode,
        shouldShowReadingModePreview,
        shouldShowTapZoneLayoutPreview,
        setSettings,
    } = useReaderSettingsStore((state) => ({
        shouldSkipDupChapters: state.settings.shouldSkipDupChapters,
        shouldSkipFilteredChapters: state.settings.shouldSkipFilteredChapters,
        backgroundColor: state.settings.backgroundColor,
        readingMode: state.settings.readingMode,
        tapZoneLayout: state.settings.tapZoneLayout,
        tapZoneInvertMode: state.settings.tapZoneInvertMode,
        shouldShowReadingModePreview: state.settings.shouldShowReadingModePreview,
        shouldShowTapZoneLayoutPreview: state.settings.shouldShowTapZoneLayoutPreview,
        setSettings: state.settings.setSettings,
    }));
    const setShowPreview = useReaderTapZoneStore((state) => state.tapZone.setShowPreview);

    const scrollElementRef = useRef<HTMLDivElement | null>(null);

    const [areSettingsSet, setAreSettingsSet] = useState(false);
    const [showPaymentOverlay, setShowPaymentOverlay] = useState(false);

    useEffect(() => {
        const handlePaymentRequired = () => setShowPaymentOverlay(true);
        window.addEventListener('paymentRequired', handlePaymentRequired);
        return () => window.removeEventListener('paymentRequired', handlePaymentRequired);
    }, []);

    const { chapterSourceOrder: paramChapterSourceOrder, mangaId: paramMangaId } = useParams<{
        chapterSourceOrder: string;
        mangaId: string;
    }>();
    const chapterSourceOrder = Number(paramChapterSourceOrder);
    const mangaId = Number(paramMangaId);

    const mangaResponse = requestManager.useGetManga<GetMangaReaderQuery>(GET_MANGA_READER, mangaId);
    const chaptersResponse = requestManager.useGetMangaChapters<GetChaptersReaderQuery>(GET_CHAPTERS_READER, mangaId);

    useAppTitle(
        !manga || !currentChapter
            ? t('reader.title', { mangaId, chapterIndex: chapterSourceOrder })
            : `${manga.title}: ${currentChapter.name}`,
    );

    const {
        metadata: defaultSettingsMetadata,
        settings: defaultSettings,
        request: defaultSettingsResponse,
    } = useDefaultReaderSettings();
    const chapterListOptions = useChapterListOptions(manga ?? FALLBACK_MANGA);

    const isLoading =
        currentChapter === undefined ||
        !areSettingsSet ||
        mangaResponse.loading ||
        chaptersResponse.loading ||
        defaultSettingsResponse.loading;
    const error = mangaResponse.error ?? chaptersResponse.error ?? defaultSettingsResponse.error;

    useEffect(() => {
        getReaderStore().setManga(mangaResponse.data?.manga);
    }, [mangaResponse.data?.manga]);

    useReaderResetStates();
    useReaderSetSettingsState(
        mangaResponse,
        defaultSettingsResponse,
        defaultSettings,
        defaultSettingsMetadata,
        setSettings,
        setAreSettingsSet,
    );
    useReaderShowSettingPreviewOnChange(
        isLoading,
        error,
        areSettingsSet,
        readingMode,
        tapZoneLayout,
        tapZoneInvertMode,
        shouldShowReadingModePreview,
        shouldShowTapZoneLayoutPreview,
        setShowPreview,
    );
    useReaderSetChaptersState(
        chaptersResponse,
        chapterSourceOrder,
        mangaChapters,
        initialChapter,
        chapterForDuplicatesHandling,
        shouldSkipDupChapters,
        shouldSkipFilteredChapters,
        chapterListOptions,
    );

    useLayoutEffect(() => {
        setOverride({
            status: true,
            value: (
                <Box sx={{ position: 'absolute' }}>
                    <ReaderHotkeys scrollElementRef={scrollElementRef} />
                    <ReaderOverlay />
                    {!scrollElementRef.current && (
                        <Box
                            onClick={() => getReaderOverlayStore().setIsVisible(!getReaderOverlayStore().isVisible)}
                            sx={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                width: '100vw',
                                height: '100vh',
                                background: 'transparent',
                            }}
                        />
                    )}
                </Box>
            ),
        });

        return () => setOverride({ status: false, value: null });
    }, [scrollElementRef.current]);

    if (showPaymentOverlay) {
        return (
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 9999,
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(10, 10, 15, 0.70)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    animation: 'overlayFade 0.4s ease-out',
                }}
            >
                <style>
                    {`
                    @keyframes overlayFade {
                        from { opacity: 0; backdrop-filter: blur(0px); }
                        to { opacity: 1; backdrop-filter: blur(20px); }
                    }
                    @keyframes glowBorder {
                        0% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.2); }
                        50% { box-shadow: 0 0 50px rgba(139, 92, 246, 0.4); }
                        100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.2); }
                    }
                    @keyframes pulseBtn {
                        0% { box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.4); }
                        70% { box-shadow: 0 0 0 15px rgba(236, 72, 153, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(236, 72, 153, 0); }
                    }
                    `}
                </style>
                <Box
                    sx={{
                        p: 5,
                        borderRadius: '24px',
                        background: 'linear-gradient(145deg, rgba(30, 30, 40, 0.8) 0%, rgba(15, 15, 20, 0.95) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                        animation: 'glowBorder 4s infinite alternate',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        maxWidth: '420px',
                        textAlign: 'center',
                    }}
                >
                    <Box
                        sx={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 3,
                            boxShadow: '0 10px 25px rgba(236, 72, 153, 0.4)',
                        }}
                    >
                        <span style={{ fontSize: '2.5rem' }}>💎</span>
                    </Box>
                    <h1
                        style={{
                            fontSize: '2rem',
                            margin: '0 0 16px 0',
                            background: 'linear-gradient(to right, #e879f9, #a78bfa)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontFamily: 'Inter, system-ui, sans-serif',
                            fontWeight: '800',
                        }}
                    >
                        Premium Chapter
                    </h1>
                    <p
                        style={{
                            margin: '0 0 32px 0',
                            fontSize: '1rem',
                            color: 'rgba(255, 255, 255, 0.75)',
                            lineHeight: '1.6',
                            fontFamily: 'Inter, system-ui, sans-serif',
                        }}
                    >
                        Your token balance is depleted. Unlock this chapter instantly by grabbing a Premium Token pack.
                    </p>
                    <Box
                        component="button"
                        type="button"
                        sx={{
                            padding: '16px 36px',
                            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                            color: '#fff',
                            borderRadius: '16px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            letterSpacing: '0.5px',
                            boxShadow: '0 10px 20px rgba(236, 72, 153, 0.3)',
                            animation: 'pulseBtn 2.5s infinite',
                            transition: 'all 0.25s ease',
                            fontFamily: 'Inter, system-ui, sans-serif',
                            '&:hover': {
                                transform: 'translateY(-3px)',
                                filter: 'brightness(1.15)',
                            },
                        }}
                        onClick={() => {
                            // eslint-disable-next-line no-console
                            console.log('[RevenueCat] Payment Modal Initialized!');
                        }}
                    >
                        Purchase Tokens
                    </Box>
                    <Box
                        component="button"
                        type="button"
                        sx={{
                            marginTop: '20px',
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.4)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            fontFamily: 'Inter, system-ui, sans-serif',
                            transition: 'color 0.2s ease',
                            '&:hover': {
                                color: '#fff',
                            },
                        }}
                        onClick={() => window.history.back()}
                    >
                        Go Back to Library
                    </Box>
                </Box>
            </Box>
        );
    }

    if (error) {
        return (
            <EmptyViewAbsoluteCentered
                message={t('global.error.label.failed_to_load_data')}
                messageExtra={getErrorMessage(error)}
                retry={() => {
                    if (mangaResponse.error) {
                        mangaResponse.refetch().catch(defaultPromiseErrorHandler('Reader::refetchManga'));
                    }

                    if (defaultSettingsResponse.error) {
                        defaultSettingsResponse
                            .refetch()
                            .catch(defaultPromiseErrorHandler('Reader::refetchDefaultSettings'));
                    }

                    if (chaptersResponse.error) {
                        chaptersResponse.refetch().catch(defaultPromiseErrorHandler('Reader::refetchChapters'));
                    }
                }}
            />
        );
    }

    if (isLoading) {
        return (
            <Box
                sx={{
                    height: '100vh',
                    width: '100vw',
                    display: 'grid',
                    placeItems: 'center',
                }}
            >
                <LoadingPlaceholder />
            </Box>
        );
    }

    if (currentChapter === null) {
        return <EmptyViewAbsoluteCentered message={t('reader.error.label.chapter_not_found')} />;
    }

    if (!manga || !currentChapter) {
        return null;
    }

    return (
        <Box
            sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                minWidth: `calc(100vw - ${readerNavBarWidth}px)`,
                maxWidth: `calc(100vw - ${readerNavBarWidth}px)`,
                width: `calc(100vw - ${readerNavBarWidth}px)`,
                height: `100vh`,
                marginLeft: `${readerNavBarWidth}px`,
                transition: (theme) =>
                    `width 0.${theme.transitions.duration.shortest}s, margin-left 0.${theme.transitions.duration.shortest}s`,
                overflow: 'auto',
                backgroundColor: READER_BACKGROUND_TO_COLOR[backgroundColor],
            }}
        >
            <ReaderViewer ref={scrollElementRef} />
            <TapZoneLayout />
            <ReaderRGBAFilter />
            <ReaderAutoScroll />
        </Box>
    );
};

export const Reader = withPropsFrom(memo(BaseReader), [useNavBarContext], ['setOverride', 'readerNavBarWidth']);
