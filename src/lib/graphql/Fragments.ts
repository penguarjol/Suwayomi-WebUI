/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import gql from 'graphql-tag';
import { SOURCE_BASE_FIELDS } from '@/lib/graphql/fragments/SourceFragments.ts';

export const PAGE_INFO = gql`
    fragment PAGE_INFO on PageInfo {
        endCursor
        hasNextPage
        hasPreviousPage
        startCursor
    }
`;

export const GLOBAL_METADATA = gql`
    fragment GLOBAL_METADATA on GlobalMetaType {
        key
        value
    }
`;

export const FULL_CATEGORY_FIELDS = gql`
    fragment FULL_CATEGORY_FIELDS on CategoryType {
        default
        id
        includeInUpdate
        includeInDownload
        name
        order
        meta {
            key
            value
        }
        mangas {
            totalCount
        }
    }
`;

export const UPDATER_CATEGORY_FIELDS = gql`
    fragment UPDATER_CATEGORY_FIELDS on CategoryType {
        id
        name
        includeInUpdate
        includeInDownload
    }
`;

export const FULL_TRACKER_FIELDS = gql`
    fragment FULL_TRACKER_FIELDS on TrackerType {
        id
        name
        authUrl
        icon
        supportsTrackDeletion
        isLoggedIn
        isTokenExpired
        scores
        statuses {
            name
            value
        }
    }
`;

export const BASE_TRACK_RECORD_FIELDS = gql`
    fragment BASE_TRACK_RECORD_FIELDS on TrackRecordType {
        id
        status
        lastChapterRead
        totalChapters
        score
        displayScore
        startDate
        finishDate
    }
`;

export const QUERY_TRACK_RECORD_FIELDS = gql`
    ${BASE_TRACK_RECORD_FIELDS}
    fragment QUERY_TRACK_RECORD_FIELDS on TrackRecordType {
        ...BASE_TRACK_RECORD_FIELDS
        title
        remoteUrl
        remoteId
    }
`;

export const FULL_TRACK_RECORD_FIELDS = gql`
    ${QUERY_TRACK_RECORD_FIELDS}
    ${FULL_TRACKER_FIELDS}
    fragment FULL_TRACK_RECORD_FIELDS on TrackRecordType {
        ...QUERY_TRACK_RECORD_FIELDS
        tracker {
            ...FULL_TRACKER_FIELDS
        }
    }
`;

export const BASE_MANGA_FIELDS = gql`
    ${SOURCE_BASE_FIELDS}
    ${FULL_TRACK_RECORD_FIELDS}
    fragment BASE_MANGA_FIELDS on MangaType {
        artist
        author
        chaptersLastFetchedAt
        description
        genre
        id
        inLibrary
        inLibraryAt
        initialized
        lastFetchedAt
        meta {
            key
            value
        }
        realUrl
        source {
            ...SOURCE_BASE_FIELDS
        }
        status
        thumbnailUrl
        thumbnailUrlLastFetched
        title
        url
        trackRecords {
            totalCount
            nodes {
                ...FULL_TRACK_RECORD_FIELDS
            }
        }
    }
`;

export const PARTIAL_MANGA_FIELDS = gql`
    ${BASE_MANGA_FIELDS}
    ${FULL_CATEGORY_FIELDS}
    fragment PARTIAL_MANGA_FIELDS on MangaType {
        ...BASE_MANGA_FIELDS
        unreadCount
        downloadCount
        bookmarkCount
        categories {
            nodes {
                ...FULL_CATEGORY_FIELDS
            }
            totalCount
        }
        chapters {
            totalCount
        }
    }
`;

export const FULL_CHAPTER_FIELDS = gql`
    fragment FULL_CHAPTER_FIELDS on ChapterType {
        chapterNumber
        fetchedAt
        id
        isBookmarked
        isDownloaded
        isRead
        lastPageRead
        lastReadAt
        mangaId
        manga {
            id
            title
            inLibrary
            thumbnailUrl
            lastFetchedAt
        }
        meta {
            key
            value
        }
        name
        pageCount
        realUrl
        scanlator
        sourceOrder
        uploadDate
        url
    }
`;

export const FULL_MANGA_FIELDS = gql`
    ${PARTIAL_MANGA_FIELDS}
    ${FULL_CHAPTER_FIELDS}
    fragment FULL_MANGA_FIELDS on MangaType {
        ...PARTIAL_MANGA_FIELDS
        lastReadChapter {
            ...FULL_CHAPTER_FIELDS
        }
        latestReadChapter {
            ...FULL_CHAPTER_FIELDS
        }
        latestFetchedChapter {
            ...FULL_CHAPTER_FIELDS
        }
        latestUploadedChapter {
            ...FULL_CHAPTER_FIELDS
        }
        firstUnreadChapter {
            ...FULL_CHAPTER_FIELDS
        }
    }
`;

export const UPDATER_MANGA_FIELDS = gql`
    fragment UPDATER_MANGA_FIELDS on MangaType {
        id
        title
        thumbnailUrl
    }
`;

export const FULL_EXTENSION_FIELDS = gql`
    fragment FULL_EXTENSION_FIELDS on ExtensionType {
        apkName
        repo
        hasUpdate
        iconUrl
        isInstalled
        isNsfw
        isObsolete
        lang
        name
        pkgName
        versionCode
        versionName
    }
`;

export const FULL_DOWNLOAD_STATUS = gql`
    fragment FULL_DOWNLOAD_STATUS on DownloadStatus {
        queue {
            chapter {
                id
                name
                sourceOrder
                isDownloaded
                manga {
                    id
                    title
                    downloadCount
                }
            }
            progress
            state
            tries
        }
        state
    }
`;

export const PARTIAL_UPDATER_STATUS = gql`
    fragment PARTIAL_UPDATER_STATUS on UpdateStatus {
        isRunning
    }
`;

export const FULL_UPDATER_STATUS = gql`
    ${UPDATER_MANGA_FIELDS}
    ${BASE_MANGA_FIELDS}
    ${PARTIAL_UPDATER_STATUS}
    ${UPDATER_CATEGORY_FIELDS}
    fragment FULL_UPDATER_STATUS on UpdateStatus {
        ...PARTIAL_UPDATER_STATUS
        completeJobs {
            mangas {
                nodes {
                    ...BASE_MANGA_FIELDS
                    unreadCount
                    downloadCount
                    chapters {
                        totalCount
                    }
                    firstUnreadChapter {
                        id
                        chapterNumber
                        sourceOrder
                    }
                    latestUploadedChapter {
                        id
                        uploadDate
                    }
                    latestFetchedChapter {
                        id
                        fetchedAt
                    }
                }
                totalCount
            }
        }
        failedJobs {
            mangas {
                nodes {
                    ...UPDATER_MANGA_FIELDS
                }
                totalCount
            }
        }
        pendingJobs {
            mangas {
                nodes {
                    ...UPDATER_MANGA_FIELDS
                }
                totalCount
            }
        }
        runningJobs {
            mangas {
                nodes {
                    ...UPDATER_MANGA_FIELDS
                }
                totalCount
            }
        }
        skippedJobs {
            mangas {
                nodes {
                    ...UPDATER_MANGA_FIELDS
                }
                totalCount
            }
        }
        updatingCategories {
            categories {
                nodes {
                    ...UPDATER_CATEGORY_FIELDS
                }
                totalCount
            }
        }
        skippedCategories {
            categories {
                nodes {
                    ...UPDATER_CATEGORY_FIELDS
                }
                totalCount
            }
        }
    }
`;

export const ABOUT_WEBUI = gql`
    fragment ABOUT_WEBUI on AboutWebUI {
        channel
        tag
    }
`;

export const WEBUI_UPDATE_CHECK = gql`
    fragment WEBUI_UPDATE_CHECK on WebUIUpdateCheck {
        channel
        tag
        updateAvailable
    }
`;

export const WEBUI_UPDATE_INFO = gql`
    fragment WEBUI_UPDATE_INFO on WebUIUpdateInfo {
        channel
        tag
    }
`;

export const WEBUI_UPDATE_STATUS = gql`
    ${WEBUI_UPDATE_INFO}
    fragment WEBUI_UPDATE_STATUS on WebUIUpdateStatus {
        info {
            ...WEBUI_UPDATE_INFO
        }
        progress
        state
    }
`;

export const SERVER_SETTINGS = gql`
    fragment SERVER_SETTINGS on SettingsType {
        # Server ip and port bindings
        ip
        port

        # Socks proxy
        socksProxyEnabled
        socksProxyVersion
        socksProxyHost
        socksProxyPort
        socksProxyUsername
        socksProxyPassword

        # webUI
        webUIFlavor
        initialOpenInBrowserEnabled
        webUIInterface
        electronPath
        webUIChannel
        webUIUpdateCheckInterval

        # downloader
        downloadAsCbz
        downloadsPath
        autoDownloadNewChapters
        excludeEntryWithUnreadChapters
        autoDownloadNewChaptersLimit
        autoDownloadIgnoreReUploads

        # extensions
        extensionRepos

        # requests
        maxSourcesInParallel

        # updater
        excludeUnreadChapters
        excludeNotStarted
        excludeCompleted
        globalUpdateInterval
        updateMangas

        # Authentication
        basicAuthEnabled
        basicAuthUsername
        basicAuthPassword

        # misc
        debugLogsEnabled
        gqlDebugLogsEnabled
        systemTrayEnabled

        # backup
        backupPath
        backupTime
        backupInterval
        backupTTL

        # local source
        localSourcePath

        # Cloudflare bypass
        flareSolverrEnabled
        flareSolverrUrl
        flareSolverrTimeout
        flareSolverrSessionName
        flareSolverrSessionTtl
    }
`;
