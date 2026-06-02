/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadIcon from '@mui/icons-material/Upload';
import {
    OriginalChapter,
    OriginalWork,
    coverUrl,
    createChapter,
    deleteChapter,
    getWork,
    setChapterPublished,
    setWorkStatus,
    uploadChapterPages,
    uploadCover,
} from '@/features/originals/Originals.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';

const ChapterRow = ({ chapter, onChanged }: { chapter: OriginalChapter; onChanged: () => void }) => {
    const [busy, setBusy] = useState(false);

    const upload = async (files: FileList | null) => {
        if (!files || !files.length) return;
        setBusy(true);
        try {
            await uploadChapterPages(chapter.id, Array.from(files));
            makeToast(`${files.length} pages uploaded`, 'success');
            onChanged();
        } catch (e) {
            makeToast('Upload failed', 'error', getErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Stack
            sx={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 1,
                p: 1.5,
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.06)',
            }}
        >
            <Stack sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>
                    #{chapter.number} {chapter.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {chapter.pages.length} pages · {chapter.price_coins > 0 ? `${chapter.price_coins} Coins` : 'Free'}
                </Typography>
            </Stack>
            <Button
                component="label"
                size="small"
                startIcon={<UploadIcon />}
                disabled={busy}
                sx={{ textTransform: 'none' }}
            >
                Pages
                <input hidden type="file" accept="image/*" multiple onChange={(e) => upload(e.target.files)} />
            </Button>
            <Chip
                size="small"
                label={chapter.published ? 'Published' : 'Draft'}
                color={chapter.published ? 'success' : 'default'}
            />
            <Switch
                checked={chapter.published}
                disabled={!chapter.pages.length}
                onChange={async (_, v) => {
                    await setChapterPublished(chapter.id, v).catch(() => {});
                    onChanged();
                }}
            />
            <IconButton
                size="small"
                aria-label="delete chapter"
                onClick={async () => {
                    await deleteChapter(chapter.id).catch(() => {});
                    onChanged();
                }}
            >
                <DeleteIcon fontSize="small" />
            </IconButton>
        </Stack>
    );
};

export function WorkEditor() {
    const { id = '' } = useParams<{ id: string }>();
    const [work, setWork] = useState<OriginalWork | null>(null);
    const [chapters, setChapters] = useState<OriginalChapter[]>([]);
    const [loading, setLoading] = useState(true);

    const [chTitle, setChTitle] = useState('');
    const [chNumber, setChNumber] = useState('');
    const [chPrice, setChPrice] = useState('5');
    const [busy, setBusy] = useState(false);

    useAppTitle(work?.title ?? 'Edit work');

    const load = async () => {
        const { work: w, chapters: c } = await getWork(id);
        setWork(w);
        setChapters(c);
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, [id]);

    const uploadWorkCover = async (files: FileList | null) => {
        if (!files || !files.length) return;
        try {
            await uploadCover(id, files[0]);
            makeToast('Cover updated', 'success');
            load();
        } catch (e) {
            makeToast('Cover upload failed', 'error', getErrorMessage(e));
        }
    };

    const addChapter = async () => {
        if (!chTitle.trim()) return;
        setBusy(true);
        try {
            const nextNumber = chNumber ? Number(chNumber) : (chapters.at(-1)?.number ?? 0) + 1;
            await createChapter({
                work_id: id,
                title: chTitle.trim(),
                number: nextNumber,
                price_coins: Number(chPrice) || 0,
            });
            setChTitle('');
            setChNumber('');
            load();
        } catch (e) {
            makeToast('Could not add chapter', 'error', getErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <LoadingPlaceholder />;
    if (!work) return <EmptyViewAbsoluteCentered message="Work not found" />;

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 820, mx: 'auto' }}>
            <Stack sx={{ flexDirection: 'row', gap: 2, mb: 3, alignItems: 'flex-start' }}>
                <Box
                    component="img"
                    src={coverUrl(work.cover_path) || undefined}
                    alt="cover"
                    sx={{
                        width: 110,
                        aspectRatio: '2/3',
                        objectFit: 'cover',
                        borderRadius: 2,
                        backgroundColor: 'action.hover',
                    }}
                />
                <Stack sx={{ flexGrow: 1, gap: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>
                        {work.title}
                    </Typography>
                    <Stack sx={{ flexDirection: 'row', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                            component="label"
                            size="small"
                            startIcon={<UploadIcon />}
                            sx={{ textTransform: 'none' }}
                        >
                            Cover
                            <input
                                hidden
                                type="file"
                                accept="image/*"
                                onChange={(e) => uploadWorkCover(e.target.files)}
                            />
                        </Button>
                        <Button
                            size="small"
                            variant={work.status === 'published' ? 'outlined' : 'contained'}
                            onClick={async () => {
                                await setWorkStatus(id, work.status === 'published' ? 'draft' : 'published');
                                load();
                            }}
                            sx={{ textTransform: 'none' }}
                        >
                            {work.status === 'published' ? 'Unpublish' : 'Publish work'}
                        </Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                        Publish the work and at least one chapter (with pages) for readers to see it.
                    </Typography>
                </Stack>
            </Stack>

            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Add chapter
            </Typography>
            <Stack sx={{ flexDirection: 'row', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 3 }}>
                <TextField size="small" label="Title" value={chTitle} onChange={(e) => setChTitle(e.target.value)} />
                <TextField
                    size="small"
                    label="#"
                    type="number"
                    value={chNumber}
                    onChange={(e) => setChNumber(e.target.value)}
                    sx={{ width: 80 }}
                />
                <TextField
                    size="small"
                    label="Price (Coins, 0=free)"
                    type="number"
                    value={chPrice}
                    onChange={(e) => setChPrice(e.target.value)}
                    sx={{ width: 170 }}
                />
                <Button
                    variant="contained"
                    disabled={busy || !chTitle.trim()}
                    onClick={addChapter}
                    sx={{ textTransform: 'none' }}
                >
                    Add
                </Button>
            </Stack>

            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Chapters
            </Typography>
            <Stack sx={{ gap: 1 }}>
                {chapters.map((chapter) => (
                    <ChapterRow key={chapter.id} chapter={chapter} onChanged={load} />
                ))}
                {!chapters.length && <Typography color="text.secondary">No chapters yet.</Typography>}
            </Stack>
        </Box>
    );
}
