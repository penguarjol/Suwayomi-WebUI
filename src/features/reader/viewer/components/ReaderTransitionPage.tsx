/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { useTranslation } from 'react-i18next';
import Button from '@mui/material/Button';
import { Link } from 'react-router-dom';
import { ComponentProps, memo, useMemo } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import { IReaderSettings, ReaderTransitionPageMode, ReadingMode } from '@/features/reader/Reader.types.ts';
import { isTransitionPageVisible } from '@/features/reader/viewer/pager/ReaderPager.utils.tsx';
import { useBackButton } from '@/base/hooks/useBackButton.ts';
import { applyStyles } from '@/base/utils/ApplyStyles.ts';
import {
    isContinuousReadingMode,
    isContinuousVerticalReadingMode,
} from '@/features/reader/settings/ReaderSettings.utils.tsx';
import { useNavBarContext } from '@/features/navigation-bar/NavbarContext.tsx';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { NavbarContextType } from '@/features/navigation-bar/NavigationBar.types.ts';
import { withPropsFrom } from '@/base/hoc/withPropsFrom.tsx';
import { getValueFromObject, noOp } from '@/lib/HelperFunctions.ts';
import { READER_BACKGROUND_TO_COLOR } from '@/features/reader/settings/ReaderSettings.constants.tsx';
import { ChapterType } from '@/lib/graphql/generated/graphql.ts';
import { ChapterIdInfo } from '@/features/chapter/Chapter.types.ts';
import {
    useReaderChaptersStore,
    useReaderPagesStore,
    useReaderScrollbarStore,
    useReaderSettingsStore,
    useReaderStore,
} from '@/features/reader/stores/ReaderStore.ts';
import { ReaderComments } from '@/features/reader/viewer/components/ReaderComments.tsx';

const ChapterInfo = ({
    title,
    name,
    scanlator,
    backgroundColor,
}: {
    title: string;
    name?: ChapterType['name'];
    scanlator?: ChapterType['scanlator'];
    backgroundColor: IReaderSettings['backgroundColor'];
}) => {
    const theme = useTheme();

    const contrastText = theme.palette.getContrastText(
        getValueFromObject(theme.palette, READER_BACKGROUND_TO_COLOR[backgroundColor]),
    );
    const disabledText = alpha(contrastText, 0.5);

    if (!name) {
        return null;
    }

    return (
        <Stack>
            <Typography color={contrastText}>{title}</Typography>
            <Typography color={contrastText} variant="h6" component="h1">
                {name}
            </Typography>
            {scanlator && (
                <Typography variant="body2" color={disabledText}>
                    {scanlator}
                </Typography>
            )}
        </Stack>
    );
};

const BaseReaderTransitionPage = ({
    chapterId,
    type,
    currentChapterName,
    currentChapterScanlator,
    previousChapterName,
    previousChapterScanlator,
    nextChapterName,
    nextChapterScanlator,
    readerNavBarWidth,
    handleBack,
}: Pick<NavbarContextType, 'readerNavBarWidth'> & {
    // gets used in the "source props creators" of the "withPropsFrom" call
    chapterId: ChapterIdInfo['id'];
    currentChapterName?: ChapterType['name'];
    currentChapterScanlator?: ChapterType['scanlator'];
    previousChapterName?: ChapterType['name'];
    previousChapterScanlator?: ChapterType['scanlator'];
    nextChapterName?: ChapterType['name'];
    nextChapterScanlator?: ChapterType['scanlator'];
    type: Exclude<ReaderTransitionPageMode, ReaderTransitionPageMode.NONE | ReaderTransitionPageMode.BOTH>;
    handleBack: () => void;
}) => {
    const { t } = useTranslation();
    const manga = useReaderStore((state) => state.manga);
    const scrollbar = useReaderScrollbarStore((state) => state.scrollbar);
    const transitionPageMode = useReaderPagesStore((state) => state.pages.transitionPageMode);
    const { readingMode, backgroundColor, shouldShowTransitionPage } = useReaderSettingsStore((state) => ({
        readingMode: state.settings.readingMode.value,
        backgroundColor: state.settings.backgroundColor,
        shouldShowTransitionPage: state.settings.shouldShowTransitionPage,
    }));

    const isPreviousType = type === ReaderTransitionPageMode.PREVIOUS;
    const isNextType = type === ReaderTransitionPageMode.NEXT;

    const isFirstChapter = !!currentChapterName && !previousChapterName;
    const isLastChapter = !!currentChapterName && !nextChapterName;

    const forceShowFirstChapterPreviousTransitionPage = isFirstChapter && type === ReaderTransitionPageMode.PREVIOUS;
    const forceShowLastChapterNextTransitionPage = isLastChapter && type === ReaderTransitionPageMode.NEXT;
    const forceShowTransitionPage =
        forceShowFirstChapterPreviousTransitionPage || forceShowLastChapterNextTransitionPage;

    if (!shouldShowTransitionPage && !forceShowTransitionPage) {
        return null;
    }

    if (!isTransitionPageVisible(type, transitionPageMode, readingMode)) {
        return null;
    }

    return (
        <Stack
            sx={{
                justifyContent: 'center',
                alignItems: 'center',
                ...applyStyles(!isContinuousReadingMode(readingMode), {
                    width: '100%',
                    height: '100%',
                }),
                ...applyStyles(isContinuousReadingMode(readingMode), {
                    position: 'sticky',
                    ...applyStyles(isContinuousVerticalReadingMode(readingMode), {
                        left: 0,
                        maxWidth: `calc(100vw - ${scrollbar.ySize}px - ${readerNavBarWidth}px)`,
                        minHeight: `calc(100vh - ${scrollbar.xSize}px)`,
                    }),
                    ...applyStyles(readingMode === ReadingMode.CONTINUOUS_HORIZONTAL, {
                        top: 0,
                        minWidth: `calc(100vw - ${scrollbar.ySize}px - ${readerNavBarWidth}px)`,
                        maxHeight: `calc(100vh - ${scrollbar.xSize}px)`,
                    }),
                }),
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    width: '100%',
                    minWidth: '320px',
                    p: 4,
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'linear-gradient(180deg, rgba(20,20,30,0) 0%, rgba(10,10,15,0.6) 100%)',
                    borderRadius: '16px',
                }}
            >
                {isPreviousType && isFirstChapter && (
                    <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        {t('reader.transition_page.first_chapter')}
                    </Typography>
                )}
                <Stack sx={{ gap: 4, width: '100%', alignItems: 'center', textAlign: 'center' }}>
                    {isPreviousType && !isFirstChapter && (
                        <ChapterInfo
                            title={t('reader.transition_page.previous')}
                            name={previousChapterName}
                            scanlator={previousChapterScanlator}
                            backgroundColor={backgroundColor}
                        />
                    )}
                    {!!currentChapterName && (
                        <Box sx={{ my: 2 }}>
                            <Typography
                                variant="overline"
                                sx={{ letterSpacing: '4px', color: '#ec4899', fontWeight: '800' }}
                            >
                                END OF EPISODE
                            </Typography>
                            <Typography
                                variant="h4"
                                sx={{
                                    mt: 1,
                                    color: '#fff',
                                    fontWeight: '900',
                                    fontFamily: 'Inter, system-ui, sans-serif',
                                }}
                            >
                                {currentChapterName}
                            </Typography>
                            {currentChapterScanlator && (
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1 }}>
                                    {currentChapterScanlator}
                                </Typography>
                            )}
                        </Box>
                    )}
                    {isNextType && !isLastChapter && (
                        <Box
                            sx={{
                                mt: 2,
                                p: 3,
                                borderRadius: '16px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                width: '100%',
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    color: 'rgba(255,255,255,0.4)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                }}
                            >
                                Up Next
                            </Typography>
                            <Typography variant="h6" sx={{ color: '#fff', fontWeight: '700', mt: 0.5 }}>
                                {nextChapterName}
                            </Typography>
                            {nextChapterScanlator && (
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>
                                    {nextChapterScanlator}
                                </Typography>
                            )}
                        </Box>
                    )}
                </Stack>
                {isNextType && isLastChapter && (
                    <Typography variant="h6">{t('reader.transition_page.last_chapter')}</Typography>
                )}
                {((isPreviousType && isFirstChapter) || (isNextType && isLastChapter)) && (
                    <Stack sx={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                        <Button
                            sx={{ flexGrow: 1 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleBack();
                            }}
                            variant="contained"
                        >
                            {t('reader.transition_page.exit.previous_page')}
                        </Button>
                        <Button
                            sx={{ flexGrow: 1 }}
                            component={Link}
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                            variant="contained"
                            to={AppRoutes.manga.path(manga?.id ?? -1)}
                        >
                            {t('reader.transition_page.exit.manga_page')}
                        </Button>
                    </Stack>
                )}
            </Box>
            {isNextType && <ReaderComments chapterId={chapterId} />}
        </Stack>
    );
};

export const ReaderTransitionPage = withPropsFrom(
    memo(BaseReaderTransitionPage) as typeof BaseReaderTransitionPage,
    [
        ({ chapterId }: Pick<ComponentProps<typeof BaseReaderTransitionPage>, 'chapterId'>) => {
            const chapters = useReaderChaptersStore((state) => state.chapters.chapters);

            const currentChapterIndex = useMemo(
                () => chapters.findIndex((chapter) => chapter.id === chapterId),
                [chapterId, chapters],
            );
            const currentChapter = chapters[currentChapterIndex];
            // chapters are sorted from latest to oldest
            const previousChapter = useMemo(() => chapters[currentChapterIndex + 1], [currentChapterIndex, chapters]);
            const nextChapter = useMemo(() => chapters[currentChapterIndex - 1], [currentChapterIndex, chapters]);

            return {
                currentChapterName: currentChapter?.name,
                currentChapterScanlator: currentChapter?.scanlator,
                previousChapterName: previousChapter?.name,
                previousChapterScanlator: previousChapter?.name,
                nextChapterName: nextChapter?.name,
                nextChapterScanlator: nextChapter?.scanlator,
            };
        },
        useNavBarContext,
        ({ chapterId, type }: Pick<ComponentProps<typeof BaseReaderTransitionPage>, 'chapterId' | 'type'>) => {
            const handleBack = useBackButton();
            const chapters = useReaderChaptersStore((state) => state.chapters.chapters);

            const currentChapterIndex = useMemo(
                () => chapters.findIndex((chapter) => chapter.id === chapterId),
                [chapterId, chapters],
            );

            // chapters are sorted from latest to oldest
            const isLastChapter = currentChapterIndex === 0;
            const isFirstChapter = currentChapterIndex === chapters.length - 1;

            const handleBackFirstChapter = type === ReaderTransitionPageMode.PREVIOUS && isFirstChapter;
            const handleBackLastChapter = type === ReaderTransitionPageMode.NEXT && isLastChapter;

            const needsToHandleBack = handleBackFirstChapter || handleBackLastChapter;

            return {
                handleBack: needsToHandleBack ? handleBack : noOp,
            };
        },
    ],
    [
        'currentChapterName',
        'currentChapterScanlator',
        'previousChapterName',
        'previousChapterScanlator',
        'nextChapterName',
        'nextChapterScanlator',
        'readerNavBarWidth',
        'handleBack',
    ],
);
