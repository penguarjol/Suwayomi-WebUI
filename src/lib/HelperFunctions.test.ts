/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from 'vitest';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';

describe('getErrorMessage', () => {
    it('formats PostgREST error objects', () => {
        expect(
            getErrorMessage({
                code: 'PGRST202',
                message: 'Could not find the function public.claim_campaign(campaign_id)',
                hint: 'Perhaps you meant public.claim_campaign(p_campaign_id)',
            }),
        ).toBe(
            '[PGRST202] Could not find the function public.claim_campaign(campaign_id) Hint: Perhaps you meant public.claim_campaign(p_campaign_id)',
        );
    });

    it('does not collapse unknown objects to object Object', () => {
        expect(getErrorMessage({ reason: 'boom' })).toBe('{"reason":"boom"}');
    });
});
