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
import Divider from '@mui/material/Divider';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { Collection, addToCollection, createCollection, getMyCollections } from '@/features/marketplace/Marketplace.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';

export const AddToCollectionButton = ({ mangaId, mangaTitle }: { mangaId: number; mangaTitle: string }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [collections, setCollections] = useState<Collection[]>([]);

    const open = async (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setAnchorEl(e.currentTarget);
        try {
            setCollections(await getMyCollections());
        } catch {
            setCollections([]);
        }
    };

    const add = async (collectionId: string) => {
        setAnchorEl(null);
        try {
            await addToCollection(collectionId, mangaId, mangaTitle);
            makeToast('Added to collection', 'success');
        } catch (e) {
            makeToast('Could not add to collection', 'error', getErrorMessage(e));
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
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    color: '#fff',
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.65)' },
                }}
            >
                <PlaylistAddIcon fontSize="small" />
            </IconButton>
            <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
                {collections.map((collection) => (
                    <MenuItem key={collection.id} onClick={() => add(collection.id)}>
                        {collection.title}
                    </MenuItem>
                ))}
                {collections.length > 0 && <Divider />}
                <MenuItem onClick={createAndAdd}>+ New collection</MenuItem>
            </Menu>
        </>
    );
};
