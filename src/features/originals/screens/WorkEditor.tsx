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
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadIcon from '@mui/icons-material/Upload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import {
    ChapterAnalytics,
    OriginalChapter,
    OriginalWork,
    PubStatus,
    WorkCollaborator,
    addChapterPages,
    addWorkCollaborator,
    coverUrl,
    createChapter,
    deleteChapter,
    getWork,
    getWorkChapterAnalytics,
    getWorkReadsTimeseries,
    listWorkCollaborators,
    removeChapterPage,
    removeWorkCollaborator,
    setChapterPages,
    setChapterPublished,
    setChapterSchedule,
    setWorkStatus,
    updateChapter,
    updateWork,
    uploadCover,
} from '@/features/originals/Originals.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';

const isoToLocalInput = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ChapterRow = ({ chapter, onDeleted }: { chapter: OriginalChapter; onDeleted: (id: string) => void }) => {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [title, setTitle] = useState(chapter.title);
    const [number, setNumber] = useState(String(chapter.number));
    const [price, setPrice] = useState(String(chapter.price_coins));
    const [note, setNote] = useState(chapter.author_note ?? '');
    const [schedule, setSchedule] = useState(isoToLocalInput(chapter.publish_at));
    const [pages, setPages] = useState<string[]>(chapter.pages);
    const [published, setPublished] = useState(chapter.published);

    const run = async (fn: () => Promise<void>, ok?: string) => {
        setBusy(true);
        try {
            await fn();
            if (ok) makeToast(ok, 'success');
        } catch (e) {
            makeToast('Action failed', 'error', getErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    const saveDetails = () =>
        run(
            () =>
                updateChapter(chapter.id, {
                    title: title.trim(),
                    number: Number(number) || chapter.number,
                    price_coins: Math.max(0, Number(price) || 0),
                    author_note: note.trim() || null,
                }),
            'Chapter saved',
        );

    const saveSchedule = () =>
        run(
            () => setChapterSchedule(chapter.id, schedule ? new Date(schedule).toISOString() : null),
            schedule ? 'Release scheduled' : 'Schedule cleared',
        );

    const addPages = (files: FileList | null) => {
        if (!files?.length) return;
        run(async () => {
            const next = await addChapterPages(chapter.id, pages, Array.from(files));
            setPages(next);
        }, `${files.length} page(s) added`);
    };

    const movePage = (index: number, dir: -1 | 1) => {
        const target = index + dir;
        if (target < 0 || target >= pages.length) return;
        const next = [...pages];
        [next[index], next[target]] = [next[target], next[index]];
        setPages(next);
        run(() => setChapterPages(chapter.id, next));
    };

    const delPage = (index: number) =>
        run(async () => {
            const next = await removeChapterPage(chapter.id, pages, index);
            setPages(next);
        });

    return (
        <Stack sx={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, p: 1.5 }}>
                <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }} noWrap>
                        #{number} {title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {pages.length} pages · {Number(price) > 0 ? `${price} Coins` : 'Free'}
                        {chapter.publish_at && !published ? ` · scheduled ${isoToLocalInput(chapter.publish_at)}` : ''}
                    </Typography>
                </Stack>
                <Chip
                    size="small"
                    label={published ? 'Published' : 'Draft'}
                    color={published ? 'success' : 'default'}
                />
                <Switch
                    checked={published}
                    disabled={!pages.length || busy}
                    onChange={(_, v) =>
                        run(async () => {
                            await setChapterPublished(chapter.id, v);
                            setPublished(v);
                        })
                    }
                />
                <IconButton size="small" aria-label="edit chapter" onClick={() => setOpen((o) => !o)}>
                    {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
                <IconButton
                    size="small"
                    aria-label="delete chapter"
                    onClick={() => run(async () => deleteChapter(chapter.id).then(() => onDeleted(chapter.id)))}
                >
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Stack>

            <Collapse in={open} unmountOnExit>
                <Stack sx={{ gap: 2, p: 1.5, pt: 0 }}>
                    <Divider />
                    <Stack sx={{ flexDirection: 'row', gap: 1, flexWrap: 'wrap' }}>
                        <TextField
                            size="small"
                            label="Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <TextField
                            size="small"
                            label="#"
                            type="number"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            sx={{ width: 80 }}
                        />
                        <TextField
                            size="small"
                            label="Price (Coins)"
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            sx={{ width: 130 }}
                        />
                    </Stack>
                    <TextField
                        size="small"
                        label="Author's note (shown to readers)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        multiline
                        minRows={2}
                        fullWidth
                    />
                    <Button
                        variant="contained"
                        size="small"
                        disabled={busy}
                        onClick={saveDetails}
                        sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                    >
                        Save details
                    </Button>

                    <Divider />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Scheduled release
                    </Typography>
                    <Stack sx={{ flexDirection: 'row', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                            size="small"
                            type="datetime-local"
                            value={schedule}
                            onChange={(e) => setSchedule(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                        <Button size="small" disabled={busy} onClick={saveSchedule} sx={{ textTransform: 'none' }}>
                            {schedule ? 'Schedule' : 'Clear'}
                        </Button>
                        <Typography variant="caption" color="text.secondary">
                            Auto-publishes at the set time (leave as draft).
                        </Typography>
                    </Stack>

                    <Divider />
                    <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, flexGrow: 1 }}>
                            Pages ({pages.length})
                        </Typography>
                        <Button
                            component="label"
                            size="small"
                            startIcon={<UploadIcon />}
                            disabled={busy}
                            sx={{ textTransform: 'none' }}
                        >
                            Add pages
                            <input
                                hidden
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => addPages(e.target.files)}
                            />
                        </Button>
                    </Stack>
                    <Stack sx={{ gap: 0.5 }}>
                        {pages.map((path, index) => (
                            <Stack
                                key={path}
                                sx={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    backgroundColor: 'action.hover',
                                }}
                            >
                                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                                    Page {index + 1}
                                </Typography>
                                <IconButton
                                    size="small"
                                    disabled={busy || index === 0}
                                    onClick={() => movePage(index, -1)}
                                >
                                    <ArrowUpwardIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    disabled={busy || index === pages.length - 1}
                                    onClick={() => movePage(index, 1)}
                                >
                                    <ArrowDownwardIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" disabled={busy} onClick={() => delPage(index)}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        ))}
                        {!pages.length && (
                            <Typography variant="caption" color="text.secondary">
                                No pages yet — add images above.
                            </Typography>
                        )}
                    </Stack>
                </Stack>
            </Collapse>
        </Stack>
    );
};

export function WorkEditor() {
    const { id = '' } = useParams<{ id: string }>();
    const [work, setWork] = useState<OriginalWork | null>(null);
    const [chapters, setChapters] = useState<OriginalChapter[]>([]);
    const [analytics, setAnalytics] = useState<ChapterAnalytics[]>([]);
    const [timeseries, setTimeseries] = useState<{ day: string; reads: number }[]>([]);
    const [loading, setLoading] = useState(true);

    // work-details form
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [contentType, setContentType] = useState<OriginalWork['content_type']>('manga');
    const [mature, setMature] = useState(false);
    const [pubStatus, setPubStatus] = useState<PubStatus>('ongoing');
    const [tags, setTags] = useState('');
    const [language, setLanguage] = useState('en');

    // collaborators
    const [collaborators, setCollaborators] = useState<WorkCollaborator[]>([]);
    const [collabEmail, setCollabEmail] = useState('');
    const [collabRole, setCollabRole] = useState('artist');

    // add-chapter form
    const [chTitle, setChTitle] = useState('');
    const [chNumber, setChNumber] = useState('');
    const [chPrice, setChPrice] = useState('5');
    const [busy, setBusy] = useState(false);

    useAppTitle(work?.title ?? 'Edit work');

    const hydrate = (w: OriginalWork) => {
        setTitle(w.title);
        setDescription(w.description ?? '');
        setContentType(w.content_type);
        setMature(w.is_mature);
        setPubStatus(w.pub_status);
        setTags((w.tags ?? []).join(', '));
        setLanguage(w.language ?? 'en');
    };

    const load = async () => {
        const { work: w, chapters: c } = await getWork(id);
        setWork(w);
        setChapters(c);
        if (w) hydrate(w);
        setLoading(false);
        getWorkChapterAnalytics(id).then(setAnalytics);
        getWorkReadsTimeseries(id, 14).then(setTimeseries);
        listWorkCollaborators(id).then(setCollaborators);
    };

    const addCollaborator = async () => {
        if (!collabEmail.trim()) return;
        const result = await addWorkCollaborator(id, collabEmail.trim(), collabRole);
        if (result === 'added') {
            setCollabEmail('');
            makeToast('Collaborator added.', 'success');
            listWorkCollaborators(id).then(setCollaborators);
        } else if (result === 'user_not_found') {
            makeToast('No account with that email.', 'warning');
        } else if (result === 'forbidden') {
            makeToast('Only the owner can add collaborators.', 'error');
        } else {
            makeToast('Could not add collaborator.', 'error');
        }
    };

    const removeCollaborator = async (userId: string) => {
        await removeWorkCollaborator(id, userId);
        listWorkCollaborators(id).then(setCollaborators);
    };

    useEffect(() => {
        load();
    }, [id]);

    const saveWorkDetails = async () => {
        setBusy(true);
        try {
            await updateWork(id, {
                title: title.trim() || work!.title,
                description: description.trim() || null,
                content_type: contentType,
                is_mature: mature,
                pub_status: pubStatus,
                language,
                tags: tags
                    .split(',')
                    .map((t) => t.trim().toLowerCase())
                    .filter(Boolean)
                    .slice(0, 12),
            });
            makeToast('Series details saved', 'success');
            load();
        } catch (e) {
            makeToast('Could not save details', 'error', getErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    const uploadWorkCover = async (files: FileList | null) => {
        if (!files?.length) return;
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
                <Stack sx={{ gap: 1, alignItems: 'center' }}>
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
                    <Button component="label" size="small" startIcon={<UploadIcon />} sx={{ textTransform: 'none' }}>
                        Cover
                        <input hidden type="file" accept="image/*" onChange={(e) => uploadWorkCover(e.target.files)} />
                    </Button>
                </Stack>
                <Stack sx={{ flexGrow: 1, gap: 1.25, minWidth: 0 }}>
                    <TextField size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <TextField
                        size="small"
                        label="Synopsis"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        multiline
                        minRows={2}
                    />
                    <Stack sx={{ flexDirection: 'row', gap: 1, flexWrap: 'wrap' }}>
                        <TextField
                            size="small"
                            select
                            label="Type"
                            value={contentType}
                            onChange={(e) => setContentType(e.target.value as OriginalWork['content_type'])}
                            sx={{ width: 130 }}
                        >
                            <MenuItem value="manga">Manga</MenuItem>
                            <MenuItem value="comic">Comic</MenuItem>
                            <MenuItem value="novel">Novel</MenuItem>
                            <MenuItem value="other">Other</MenuItem>
                        </TextField>
                        <TextField
                            size="small"
                            select
                            label="Status"
                            value={pubStatus}
                            onChange={(e) => setPubStatus(e.target.value as PubStatus)}
                            sx={{ width: 140 }}
                        >
                            <MenuItem value="ongoing">Ongoing</MenuItem>
                            <MenuItem value="completed">Completed</MenuItem>
                            <MenuItem value="hiatus">Hiatus</MenuItem>
                        </TextField>
                        <TextField
                            size="small"
                            select
                            label="Language"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            sx={{ width: 130 }}
                        >
                            <MenuItem value="en">English</MenuItem>
                            <MenuItem value="es">Español</MenuItem>
                            <MenuItem value="pt">Português</MenuItem>
                            <MenuItem value="fr">Français</MenuItem>
                            <MenuItem value="ja">日本語</MenuItem>
                            <MenuItem value="ko">한국어</MenuItem>
                            <MenuItem value="zh">中文</MenuItem>
                            <MenuItem value="id">Bahasa</MenuItem>
                        </TextField>
                        <FormControlLabel
                            control={<Checkbox checked={mature} onChange={(e) => setMature(e.target.checked)} />}
                            label="Mature (18+)"
                        />
                    </Stack>
                    <TextField
                        size="small"
                        label="Genres / tags (comma-separated)"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="action, fantasy, romance"
                    />
                    <Stack sx={{ flexDirection: 'row', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                            variant="contained"
                            disabled={busy}
                            onClick={saveWorkDetails}
                            sx={{ textTransform: 'none' }}
                        >
                            Save details
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
                </Stack>
            </Stack>

            {analytics.some((a) => a.views > 0) && (
                <>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                        Analytics
                    </Typography>
                    {(() => {
                        const maxReads = Math.max(1, ...timeseries.map((t) => t.reads));
                        return (
                            <Stack sx={{ gap: 1.5, mb: 3 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Reads · last 14 days
                                    </Typography>
                                    <Stack sx={{ flexDirection: 'row', alignItems: 'flex-end', gap: 0.5, height: 60 }}>
                                        {timeseries.map((t) => (
                                            <Box
                                                key={t.day}
                                                title={`${t.day}: ${t.reads}`}
                                                sx={{
                                                    flex: 1,
                                                    height: `${Math.round((t.reads / maxReads) * 100)}%`,
                                                    minHeight: 2,
                                                    borderRadius: 0.5,
                                                    backgroundColor: 'primary.main',
                                                    opacity: t.reads ? 0.85 : 0.2,
                                                }}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                                <Stack sx={{ gap: 0.5 }}>
                                    {analytics.map((a) => {
                                        const dropOff = a.views ? Math.round((1 - a.completions / a.views) * 100) : 0;
                                        return (
                                            <Stack
                                                key={a.chapter_id}
                                                sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}
                                            >
                                                <Typography variant="body2" sx={{ flexGrow: 1 }} noWrap>
                                                    #{a.chapter_number} {a.title}
                                                </Typography>
                                                <Chip size="small" variant="outlined" label={`${a.views} views`} />
                                                <Chip
                                                    size="small"
                                                    variant="outlined"
                                                    label={`${dropOff}% drop-off`}
                                                    color={dropOff > 50 ? 'warning' : 'default'}
                                                />
                                            </Stack>
                                        );
                                    })}
                                </Stack>
                            </Stack>
                        );
                    })()}
                </>
            )}

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
                    <ChapterRow
                        key={chapter.id}
                        chapter={chapter}
                        onDeleted={(deletedId) => setChapters((prev) => prev.filter((c) => c.id !== deletedId))}
                    />
                ))}
                {!chapters.length && <Typography color="text.secondary">No chapters yet.</Typography>}
            </Stack>

            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Collaborators
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Invite an artist, writer, translator, or editor (by their account email) to co-edit this work.
            </Typography>
            <Stack sx={{ gap: 1, mb: 1.5 }}>
                {collaborators.map((collab) => (
                    <Stack
                        key={collab.user_id}
                        sx={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 1,
                            p: 1.25,
                            borderRadius: 2,
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        <Typography sx={{ flexGrow: 1 }} noWrap>
                            {collab.email}
                        </Typography>
                        <Chip size="small" variant="outlined" label={collab.role} />
                        <IconButton size="small" onClick={() => removeCollaborator(collab.user_id)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                ))}
                {!collaborators.length && <Typography color="text.secondary">No collaborators yet.</Typography>}
            </Stack>
            <Stack sx={{ flexDirection: 'row', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                    size="small"
                    label="Collaborator email"
                    value={collabEmail}
                    onChange={(e) => setCollabEmail(e.target.value)}
                    sx={{ flexGrow: 1, minWidth: 180 }}
                />
                <TextField
                    size="small"
                    select
                    label="Role"
                    value={collabRole}
                    onChange={(e) => setCollabRole(e.target.value)}
                    sx={{ width: 130 }}
                >
                    <MenuItem value="artist">Artist</MenuItem>
                    <MenuItem value="writer">Writer</MenuItem>
                    <MenuItem value="translator">Translator</MenuItem>
                    <MenuItem value="editor">Editor</MenuItem>
                </TextField>
                <Button variant="contained" onClick={addCollaborator} sx={{ textTransform: 'none' }}>
                    Invite
                </Button>
            </Stack>
        </Box>
    );
}
