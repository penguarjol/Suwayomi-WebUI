/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import DeleteIcon from '@mui/icons-material/Delete';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import {
    UserCategory,
    createCategory,
    deleteCategory,
    getCategoryIdsForManga,
    listCategories,
    setMangaCategories,
} from '@/features/library/services/UserCategories.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';

const ManageDialog = ({
    open,
    categories,
    onClose,
    onChanged,
}: {
    open: boolean;
    categories: UserCategory[];
    onClose: () => void;
    onChanged: () => void;
}) => {
    const [name, setName] = useState('');

    const add = async () => {
        if (!name.trim()) return;
        try {
            await createCategory(name.trim(), categories.length);
            setName('');
            onChanged();
        } catch (e) {
            makeToast('Could not create category', 'error', getErrorMessage(e));
        }
    };

    const remove = async (id: string) => {
        try {
            await deleteCategory(id);
            onChanged();
        } catch (e) {
            makeToast('Could not delete category', 'error', getErrorMessage(e));
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ fontWeight: 800 }}>Manage categories</DialogTitle>
            <DialogContent>
                <Stack sx={{ gap: 1, pt: 1 }}>
                    <Stack sx={{ flexDirection: 'row', gap: 1 }}>
                        <TextField
                            size="small"
                            fullWidth
                            label="New category"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <Button variant="contained" onClick={add} sx={{ textTransform: 'none' }}>
                            Add
                        </Button>
                    </Stack>
                    {categories.map((category) => (
                        <Stack
                            key={category.id}
                            sx={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                        >
                            <Typography>{category.name}</Typography>
                            <IconButton size="small" aria-label="delete category" onClick={() => remove(category.id)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    ))}
                    {!categories.length && (
                        <Typography variant="body2" color="text.secondary">
                            No categories yet. Create one to organize your library.
                        </Typography>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/** Filter bar: All + each category + a manage button. */
export const CategoryBar = ({
    categories,
    selected,
    onSelect,
    onChanged,
}: {
    categories: UserCategory[];
    selected: string | null;
    onSelect: (id: string | null) => void;
    onChanged: () => void;
}) => {
    const [manageOpen, setManageOpen] = useState(false);

    if (!categories.length) {
        return (
            <>
                <Button
                    size="small"
                    startIcon={<TuneIcon />}
                    onClick={() => setManageOpen(true)}
                    sx={{ textTransform: 'none', mb: 1, opacity: 0.8 }}
                >
                    Categories
                </Button>
                <ManageDialog
                    open={manageOpen}
                    categories={categories}
                    onClose={() => setManageOpen(false)}
                    onChanged={onChanged}
                />
            </>
        );
    }

    return (
        <>
            <Stack sx={{ flexDirection: 'row', gap: 1, mb: 2, overflowX: 'auto', pb: 0.5, alignItems: 'center' }}>
                <Chip
                    label="All"
                    color={selected === null ? 'primary' : 'default'}
                    onClick={() => onSelect(null)}
                    size="small"
                />
                {categories.map((category) => (
                    <Chip
                        key={category.id}
                        label={category.name}
                        color={selected === category.id ? 'primary' : 'default'}
                        onClick={() => onSelect(category.id)}
                        size="small"
                    />
                ))}
                <IconButton size="small" aria-label="manage categories" onClick={() => setManageOpen(true)}>
                    <TuneIcon fontSize="small" />
                </IconButton>
            </Stack>
            <ManageDialog
                open={manageOpen}
                categories={categories}
                onClose={() => setManageOpen(false)}
                onChanged={onChanged}
            />
        </>
    );
};

/** Per-manga "assign to categories" button + dialog. */
export const AssignCategoriesButton = ({
    mangaId,
    categories,
    onChanged,
}: {
    mangaId: number;
    categories: UserCategory[];
    onChanged?: () => void;
}) => {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (open) {
            getCategoryIdsForManga(mangaId)
                .then((ids) => setSelected(new Set(ids)))
                .catch(() => setSelected(new Set()));
        }
    }, [open, mangaId]);

    const toggle = (id: string) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const save = async () => {
        try {
            await setMangaCategories(mangaId, [...selected]);
            setOpen(false);
            onChanged?.();
        } catch (e) {
            makeToast('Could not update categories', 'error', getErrorMessage(e));
        }
    };

    return (
        <>
            <IconButton
                size="small"
                aria-label="assign categories"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(true);
                }}
                sx={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    color: '#fff',
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(6px)',
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.65)' },
                }}
            >
                <LabelOutlinedIcon fontSize="small" />
            </IconButton>
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: 800 }}>Add to categories</DialogTitle>
                <DialogContent>
                    {categories.length ? (
                        <Stack>
                            {categories.map((category) => (
                                <FormControlLabel
                                    key={category.id}
                                    control={
                                        <Checkbox
                                            checked={selected.has(category.id)}
                                            onChange={() => toggle(category.id)}
                                        />
                                    }
                                    label={category.name}
                                />
                            ))}
                        </Stack>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            Create a category first (Categories button above the library).
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={save}
                        disabled={!categories.length}
                        sx={{ textTransform: 'none' }}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export const useUserCategories = () => {
    const [categories, setCategories] = useState<UserCategory[]>([]);
    const refresh = () =>
        listCategories()
            .then(setCategories)
            .catch(() => setCategories([]));
    useEffect(() => {
        refresh();
    }, []);
    return { categories, refresh };
};
