/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'app.nexusreads.mobile',
    appName: 'Nexus Reads',
    // Must match Vite's build output dir (vite.config.ts -> build.outDir: 'build').
    webDir: 'build',
};

// eslint-disable-next-line import/no-default-export
export default config;
