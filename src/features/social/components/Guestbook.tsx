/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '@/lib/SupabaseClient.ts';
import { useBillingStore } from '@/features/billing/Billing.ts';
import { UserAvatar } from '@/features/profile/components/UserAvatar.tsx';
import { usePublicProfiles } from '@/features/profile/PublicProfile.ts';
import { GuestbookEntry, deleteGuestbook, getGuestbook, postGuestbook } from '@/features/social/SocialFeatures.ts';
import { makeToast } from '@/base/utils/Toast.ts';

/** A public message wall on a user's profile (creator pages). */
export const Guestbook = ({ wallUserId }: { wallUserId: string }) => {
    const isAdmin = useBillingStore((s) => s.isAdmin);
    const [entries, setEntries] = useState<GuestbookEntry[]>([]);
    const [body, setBody] = useState('');
    const [myId, setMyId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
        getGuestbook(wallUserId).then(setEntries);
    }, [wallUserId]);

    const profiles = usePublicProfiles(useMemo(() => entries.map((e) => e.author_id), [entries]));

    const post = async () => {
        if (!body.trim()) return;
        setBusy(true);
        try {
            const ok = await postGuestbook(wallUserId, body.trim());
            if (ok) {
                setBody('');
                setEntries(await getGuestbook(wallUserId));
            } else {
                makeToast('Could not post your message', 'error');
            }
        } finally {
            setBusy(false);
        }
    };

    const remove = async (id: string) => {
        if (await deleteGuestbook(id)) setEntries((prev) => prev.filter((e) => e.id !== id));
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Guestbook
            </Typography>
            {myId && (
                <Stack sx={{ flexDirection: 'row', gap: 1, mb: 2 }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Leave a message…"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                    />
                    <Button
                        variant="contained"
                        disabled={busy || !body.trim()}
                        onClick={post}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px' }}
                    >
                        Post
                    </Button>
                </Stack>
            )}
            {entries.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    No messages yet. Be the first to say hi.
                </Typography>
            ) : (
                <Stack sx={{ gap: 1.5 }}>
                    {entries.map((entry) => {
                        const profile = profiles.get(entry.author_id);
                        const canDelete = myId === entry.author_id || myId === wallUserId || isAdmin;
                        return (
                            <Stack key={entry.id} sx={{ flexDirection: 'row', gap: 1.5, alignItems: 'flex-start' }}>
                                <UserAvatar profile={profile} name={profile?.display_name || 'Reader'} size={32} />
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                                        {profile?.display_name || 'Reader'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {entry.body}
                                    </Typography>
                                </Box>
                                {canDelete && (
                                    <IconButton size="small" onClick={() => remove(entry.id)} aria-label="delete">
                                        <DeleteIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                )}
                            </Stack>
                        );
                    })}
                </Stack>
            )}
        </Box>
    );
};
