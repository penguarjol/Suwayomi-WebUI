/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('public authentication surfaces', () => {
    it('do not expose operator server address controls', () => {
        const loginPage = readSource('./LoginPage.tsx');
        const splashScreen = readSource('../components/SplashScreen.tsx');

        expect(loginPage).not.toContain('ServerAddressSetting');
        expect(splashScreen).not.toContain('ServerAddressSetting');
        expect(loginPage).not.toContain('serverAddressProps');
        expect(splashScreen).not.toContain('serverAddressProps');
    });
});
