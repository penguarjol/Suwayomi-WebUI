/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import { getReactions, toggleReaction, ReactionRow, ReactionTarget } from '@/features/social/SocialFeatures.ts';

const QUICK_EMOJI = ['🔥', '❤️', '😂', '😮', '👏'];

/** Compact emoji reaction bar for a comment or review (self-contained). */
export const CommentReactions = ({
    targetType = 'comment',
    targetId,
    currentUserId,
}: {
    targetType?: ReactionTarget;
    targetId: string;
    currentUserId: string | null;
}) => {
    const [rows, setRows] = useState<ReactionRow[]>([]);

    useEffect(() => {
        let active = true;
        getReactions(targetType, [targetId]).then((r) => {
            if (active) setRows(r);
        });
        return () => {
            active = false;
        };
    }, [targetType, targetId]);

    const counts = useMemo(() => {
        const map = new Map<string, { count: number; mine: boolean }>();
        for (const row of rows) {
            const entry = map.get(row.emoji) ?? { count: 0, mine: false };
            entry.count += 1;
            if (row.user_id === currentUserId) entry.mine = true;
            map.set(row.emoji, entry);
        }
        return map;
    }, [rows, currentUserId]);

    const toggle = async (emoji: string) => {
        if (!currentUserId) return;
        const mine = counts.get(emoji)?.mine ?? false;
        setRows((prev) =>
            mine
                ? prev.filter((r) => !(r.emoji === emoji && r.user_id === currentUserId))
                : [...prev, { emoji, user_id: currentUserId }],
        );
        await toggleReaction(targetType, targetId, emoji);
    };

    // Show emojis that have reactions plus the quick set (deduped, stable order).
    const shown = [...new Set([...QUICK_EMOJI, ...rows.map((r) => r.emoji)])];

    return (
        <Stack sx={{ flexDirection: 'row', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
            {shown.map((emoji) => {
                const entry = counts.get(emoji);
                return (
                    <Chip
                        key={emoji}
                        size="small"
                        variant={entry?.mine ? 'filled' : 'outlined'}
                        color={entry?.mine ? 'primary' : 'default'}
                        onClick={() => toggle(emoji)}
                        disabled={!currentUserId}
                        label={`${emoji}${entry?.count ? ` ${entry.count}` : ''}`}
                        sx={{ height: 24, cursor: currentUserId ? 'pointer' : 'default' }}
                    />
                );
            })}
        </Stack>
    );
};
