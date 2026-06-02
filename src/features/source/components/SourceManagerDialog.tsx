/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useSourcePrefs } from '@/features/source/services/SourcePreferences.ts';

interface ManageableSource {
    id: string;
    name: string;
    lang: string;
    iconUrl?: string;
}

/** Lets a user choose which of the approved sources appear in their Browse. */
export const SourceManagerDialog = ({
    open,
    onClose,
    sources,
}: {
    open: boolean;
    onClose: () => void;
    sources: ManageableSource[];
}) => {
    const hidden = useSourcePrefs((state) => state.hidden);
    const setEnabled = useSourcePrefs((state) => state.setEnabled);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Manage your sources</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Choose which sources show up when you browse. This only affects you.
                </Typography>
                <List dense>
                    {sources.map((source) => (
                        <ListItem
                            key={source.id}
                            secondaryAction={
                                <Switch
                                    edge="end"
                                    checked={!hidden.has(String(source.id))}
                                    onChange={(e) => setEnabled(source.id, e.target.checked)}
                                />
                            }
                        >
                            <ListItemAvatar>
                                <Avatar src={source.iconUrl} variant="rounded" sx={{ width: 28, height: 28 }} />
                            </ListItemAvatar>
                            <ListItemText primary={source.name} secondary={source.lang?.toUpperCase()} />
                        </ListItem>
                    ))}
                    {!sources.length && (
                        <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                            No sources available.
                        </Typography>
                    )}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    );
};
