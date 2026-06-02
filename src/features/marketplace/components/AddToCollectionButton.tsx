/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import {
    Collection,
    addToCollection,
    createCollection,
    getCollectionIdsForManga,
    getMyCollections,
    removeFromCollection,
} from '@/features/marketplace/Marketplace.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';

/**
 * Toggle this manga's membership across the user's collections (multi-add). The
 * menu shows every collection with a checkmark for the ones that already contain
 * the title; tapping toggles membership. A collection can hold many titles.
 */
export const AddToCollectionButton = ({ mangaId, mangaTitle }: { mangaId: number; mangaTitle: string }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [members, setMembers] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);

    const open = async (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setAnchorEl(e.currentTarget);
        try {
            const [list, memberIds] = await Promise.all([getMyCollections(), getCollectionIdsForManga(mangaId)]);
            setCollections(list);
            setMembers(memberIds);
        } catch {
            setCollections([]);
        }
    };

    const toggle = async (collectionId: string) => {
        const isMember = members.has(collectionId);
        setMembers((prev) => {
            const next = new Set(prev);
            if (isMember) next.delete(collectionId);
            else next.add(collectionId);
            return next;
        });
        setBusy(true);
        try {
            if (isMember) await removeFromCollection(collectionId, mangaId);
            else await addToCollection(collectionId, mangaId, mangaTitle);
        } catch (e) {
            makeToast('Could not update collection', 'error', getErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    const createAndAdd = async () => {
        setAnchorEl(null);
        try {
            const id = await createCollection(mangaTitle, '');
            if (id) await addToCollection(id, mangaId, mangaTitle);
            makeToast('New collection created with this title', 'success');
        } catch (e) {
            makeToast('Could not create collection', 'error', getErrorMessage(e));
        }
    };

    return (
        <>
            <IconButton
                size="small"
                aria-label="add to collection"
                onClick={open}
                sx={{
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.75)' },
                }}
            >
                <PlaylistAddIcon fontSize="small" />
            </IconButton>
            <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
                {collections.map((collection) => {
                    const isMember = members.has(collection.id);
                    return (
                        <MenuItem key={collection.id} disabled={busy} onClick={() => toggle(collection.id)}>
                            <ListItemIcon>
                                {isMember ? <CheckIcon fontSize="small" color="primary" /> : null}
                            </ListItemIcon>
                            <ListItemText>{collection.title}</ListItemText>
                        </MenuItem>
                    );
                })}
                {collections.length > 0 && <Divider />}
                <MenuItem onClick={createAndAdd}>
                    <ListItemIcon>
                        <AddIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>New collection</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
};
