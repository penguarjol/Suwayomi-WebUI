/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { SourceType } from '@/lib/graphql/generated/graphql.ts';
import { MangaIdInfo } from '@/features/manga/Manga.types.ts';

import { ChapterSourceOrderInfo } from '@/features/chapter/Chapter.types.ts';
import { BrowseTab } from '@/features/browse/Browse.types.ts';
import { SearchParam } from '@/base/Base.types.ts';
import { UrlUtil } from '@/lib/UrlUtil.ts';

type AppRouteInfo = {
    match: string;
    path?: string | ((...args: any[]) => string);
};

type TAppRoutes = Record<string, AppRouteInfo & { childRoutes?: TAppRoutes }>;

export const AppRoutes = {
    root: {
        match: '/',
        path: '/',
    },
    matchAll: {
        match: '*',
    },
    home: {
        match: 'home',
        path: '/home',
    },
    profile: {
        match: 'profile',
        path: '/profile',
    },
    authentication: {
        match: 'auth',
        path: '/auth',
        childRoutes: {
            login: {
                match: 'login',
                path: '/auth/login',
            },
        },
    },
    about: {
        match: 'about',
        path: '/about',
    },
    settings: {
        match: 'settings',
        path: '/settings',
        childRoutes: {
            categories: {
                match: 'categories',
                path: '/settings/categories',
            },
            reader: {
                match: 'reader',
                path: '/settings/reader',
            },
            library: {
                match: 'library',
                path: '/settings/library',

                childRoutes: {
                    duplicates: {
                        match: 'duplicates',
                        path: '/settings/library/duplicates',
                    },
                },
            },
            download: {
                match: 'download',
                path: '/settings/download',
            },
            backup: {
                match: 'backup',
                path: '/settings/backup',
            },
            server: {
                match: 'server',
                path: '/settings/server',
            },
            webui: {
                match: 'webui',
                path: '/settings/webui',
            },
            browse: {
                match: 'browse',
                path: '/settings/browse',
            },
            device: {
                match: 'device',
                path: '/settings/device',
            },
            tracking: {
                match: 'tracking',
                path: '/settings/tracking',
            },
            appearance: {
                match: 'appearance',
                path: '/settings/appearance',
            },
            history: {
                match: 'history',
                path: '/settings/history',
            },
        },
    },
    sources: {
        match: 'sources',
        path: '/sources',
        childRoutes: {
            browse: {
                match: ':sourceId',
                path: (sourceId: SourceType['id'], query?: string | null | undefined) =>
                    UrlUtil.addQueryParam(`/sources/${sourceId}`, query),
            },
            configure: {
                match: ':sourceId/configure',
                path: (sourceId: SourceType['id']) => `/sources/${sourceId}/configure`,
            },
            searchAll: {
                match: 'all/search',
                path: (query?: string | null | undefined) => UrlUtil.addQueryParam('/sources/all/search', query),
            },
        },
    },

    extension: {
        match: 'extension',
        path: '/extension',
        childRoutes: {
            info: {
                match: ':pkgName',
                path: (pkgName: string) => `/extension/${pkgName}`,
            },
        },
    },
    downloads: {
        match: 'downloads',
        path: '/downloads',
    },
    manga: {
        match: 'manga/:id',
        path: (mangaId: MangaIdInfo['id']) => `/manga/${mangaId}`,

        childRoutes: {
            reader: {
                match: 'chapter/:chapterNum',
                path: (mangaId: MangaIdInfo['id'], chapterNum: ChapterSourceOrderInfo['sourceOrder']) =>
                    `/manga/${mangaId}/chapter/${chapterNum}`,
            },
        },
    },
    library: {
        match: 'library',
        path: (tab?: string, search?: string) =>
            UrlUtil.addParams('/library', {
                ...UrlUtil.createTabParam(tab),
                ...UrlUtil.createQueryParam(search),
            }),
    },
    updates: {
        match: 'updates',
        path: '/updates',
    },
    history: {
        match: 'history',
        path: '/history',
    },
    recent: {
        match: 'recent',
        path: '/recent',
    },
    browse: {
        match: 'browse',
        path: (tab?: BrowseTab) =>
            UrlUtil.addParams('/browse', {
                [SearchParam.TAB]: tab,
            }),
    },
    // Migration is no longer surfaced in the UI (Browse tab + manga menu entries
    // removed), but the route constant is retained so the dormant migration
    // module still type-checks. Not registered as a route.
    migrate: {
        match: 'migrate/source/:sourceId',
        path: (sourceId: SourceType['id']) => `/migrate/source/${sourceId}`,

        childRoutes: {
            search: {
                match: 'manga/:mangaId/search',
                path: (sourceId: SourceType['id'], mangaId: MangaIdInfo['id'], query?: string | null | undefined) =>
                    UrlUtil.addQueryParam(`/migrate/source/${sourceId}/manga/${mangaId}/search`, query),
            },
        },
    },
    tracker: {
        match: 'tracker/login/oauth',
        path: '/tracker/login/oauth',
    },
    reader: {
        match: '/manga/:mangaId/chapter/:chapterSourceOrder/*',
        path: (mangaId: MangaIdInfo['id'], chapterSourceOrder: ChapterSourceOrderInfo['sourceOrder']) =>
            `/manga/${mangaId}/chapter/${chapterSourceOrder}`,
    },
    more: {
        match: '/more',
        path: '/more',
    },
    store: {
        match: 'store',
        path: '/store',
    },
    admin: {
        match: 'admin',
        path: '/admin',
    },
    social: {
        match: 'community',
        path: '/community',
    },
    feed: {
        match: 'feed',
        path: '/feed',
    },
    leaderboard: {
        match: 'leaderboard',
        path: '/leaderboard',
    },
    challenges: {
        match: 'challenges',
        path: '/challenges',
    },
    thread: {
        match: 'community/thread/:id',
        path: (id: string) => `/community/thread/${id}`,
    },
    earn: {
        match: 'earn',
        path: '/earn',
    },
    marketplace: {
        match: 'marketplace',
        path: '/marketplace',
    },
    stickers: {
        match: 'stickers',
        path: '/stickers',
    },
    collection: {
        match: 'collection/:id',
        path: (id: string) => `/collection/${id}`,
    },
    originals: {
        match: 'originals',
        path: '/originals',
    },
    originalWork: {
        match: 'originals/work/:id',
        path: (id: string) => `/originals/work/${id}`,
    },
    originalReader: {
        match: 'originals/read/:chapterId',
        path: (chapterId: string) => `/originals/read/${chapterId}`,
    },
    studio: {
        match: 'studio',
        path: '/studio',
    },
    studioWork: {
        match: 'studio/work/:id',
        path: (id: string) => `/studio/work/${id}`,
    },
    creator: {
        match: 'creator/:id',
        path: (id: string) => `/creator/${id}`,
    },
} as const satisfies TAppRoutes;

type ExtractChildRouteStringPaths<T> = T extends { childRoutes: infer U } ? ExtractStringPaths<U[keyof U]> : never;

type ExtractStringPaths<T> = T extends { path: infer P }
    ? P extends string
        ? P | ExtractChildRouteStringPaths<T>
        : ExtractChildRouteStringPaths<T>
    : ExtractChildRouteStringPaths<T>;

export type StaticAppRoute = ExtractStringPaths<(typeof AppRoutes)[keyof typeof AppRoutes]>;
