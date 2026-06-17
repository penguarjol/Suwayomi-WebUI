/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from 'vitest';
import { isSourceAllowedByConfig, SaasSourceConfig } from '@/features/source/services/SourceAccess.ts';

const source = {
    id: 'source-a',
    extension: { pkgName: 'pkg.a' },
};

describe('isSourceAllowedByConfig', () => {
    it('allows admins regardless of config', () => {
        expect(isSourceAllowedByConfig(source, null, true)).toBe(true);
    });

    it('fails closed for regular users until config is loaded', () => {
        expect(isSourceAllowedByConfig(source, null, false)).toBe(false);
    });

    it('uses source ids when global source allow-listing is active', () => {
        const config: SaasSourceConfig = {
            allowedExtensions: ['pkg.b'],
            allowedSourceIds: ['source-a'],
            featuredSourceIds: [],
            usesGlobalSourceAllowList: true,
        };

        expect(isSourceAllowedByConfig(source, config, false)).toBe(true);
        expect(isSourceAllowedByConfig({ ...source, id: 'source-b' }, config, false)).toBe(false);
    });

    it('falls back to extension package names for legacy config', () => {
        const config: SaasSourceConfig = {
            allowedExtensions: ['pkg.a'],
            allowedSourceIds: [],
            featuredSourceIds: [],
            usesGlobalSourceAllowList: false,
        };

        expect(isSourceAllowedByConfig(source, config, false)).toBe(true);
        expect(isSourceAllowedByConfig({ id: 'source-b', extension: { pkgName: 'pkg.b' } }, config, false)).toBe(false);
    });

    it('excludes NSFW sources for regular users even when otherwise allowed', () => {
        const config: SaasSourceConfig = {
            allowedExtensions: [],
            allowedSourceIds: ['source-a'],
            featuredSourceIds: [],
            usesGlobalSourceAllowList: true,
        };

        expect(isSourceAllowedByConfig({ ...source, isNsfw: true }, config, false)).toBe(false);
        // Admins still see NSFW sources (they curate the allow-list).
        expect(isSourceAllowedByConfig({ ...source, isNsfw: true }, config, true)).toBe(true);
    });
});
