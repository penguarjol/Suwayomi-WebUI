/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Fragment, useEffect } from 'react';
import Box from '@mui/material/Box';
import { STICKER_TOKEN_RE, stickerImageUrl, useStickerStore } from '@/features/stickers/Stickers.ts';
import { censorProfanity } from '@/features/social/Social.ts';

/**
 * Renders message text with inline stickers. `:s[<id>]:` tokens become the
 * sticker's emoji or image; plain text is profanity-censored.
 */
export const StickerText = ({ text }: { text: string }) => {
    const byId = useStickerStore((state) => state.byId);
    const load = useStickerStore((state) => state.load);

    useEffect(() => {
        load();
    }, [load]);

    const parts: Array<{ type: 'text'; value: string } | { type: 'sticker'; id: string }> = [];
    let lastIndex = 0;
    // Fresh regex per render (global regex carries lastIndex state).
    const re = new RegExp(STICKER_TOKEN_RE.source, 'g');
    let match = re.exec(text);
    while (match !== null) {
        if (match.index > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        parts.push({ type: 'sticker', id: match[1] });
        lastIndex = match.index + match[0].length;
        match = re.exec(text);
    }
    if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) });

    return (
        <>
            {parts.map((part, i) => {
                if (part.type === 'text') {
                    // eslint-disable-next-line react/no-array-index-key
                    return <Fragment key={i}>{censorProfanity(part.value)}</Fragment>;
                }
                const sticker = byId.get(part.id);
                if (!sticker) return null;
                if (sticker.emoji) {
                    return (
                        // eslint-disable-next-line react/no-array-index-key
                        <Box component="span" key={i} sx={{ fontSize: '1.6em', verticalAlign: 'middle' }}>
                            {sticker.emoji}
                        </Box>
                    );
                }
                return (
                    <Box
                        // eslint-disable-next-line react/no-array-index-key
                        key={i}
                        component="img"
                        src={stickerImageUrl(sticker.image_path)}
                        alt={sticker.name}
                        sx={{ height: 48, width: 48, objectFit: 'contain', verticalAlign: 'middle', mx: 0.25 }}
                    />
                );
            })}
        </>
    );
};
