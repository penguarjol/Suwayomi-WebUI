/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import { stickerImageUrl, stickerToken, useStickerStore } from '@/features/stickers/Stickers.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';

/** Inserts a sticker token into a composer. Shows the user's usable stickers. */
export const StickerPicker = ({ onPick }: { onPick: (token: string) => void }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const byId = useStickerStore((state) => state.byId);
    const usable = useStickerStore((state) => state.usable);
    const load = useStickerStore((state) => state.load);

    useEffect(() => {
        load();
    }, [load]);

    const stickers = [...usable].map((id) => byId.get(id)).filter(Boolean);

    return (
        <>
            <IconButton size="small" aria-label="stickers" onClick={(e) => setAnchorEl(e.currentTarget)}>
                <EmojiEmotionsOutlinedIcon />
            </IconButton>
            <Popover
                open={!!anchorEl}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Box sx={{ p: 1.5, width: 280 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0.5 }}>
                        {stickers.map((sticker) => (
                            <IconButton
                                key={sticker!.id}
                                size="small"
                                onClick={() => {
                                    onPick(stickerToken(sticker!.id));
                                    setAnchorEl(null);
                                }}
                            >
                                {sticker!.emoji ? (
                                    <Box component="span" sx={{ fontSize: 22 }}>
                                        {sticker!.emoji}
                                    </Box>
                                ) : (
                                    <Box
                                        component="img"
                                        src={stickerImageUrl(sticker!.image_path)}
                                        alt={sticker!.name}
                                        sx={{ width: 28, height: 28, objectFit: 'contain' }}
                                    />
                                )}
                            </IconButton>
                        ))}
                    </Box>
                    {!stickers.length && (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
                            No stickers yet.
                        </Typography>
                    )}
                    <Button
                        component={Link}
                        to={AppRoutes.stickers.path}
                        size="small"
                        fullWidth
                        onClick={() => setAnchorEl(null)}
                        sx={{ mt: 1, textTransform: 'none' }}
                    >
                        Get more stickers
                    </Button>
                </Box>
            </Popover>
        </>
    );
};
