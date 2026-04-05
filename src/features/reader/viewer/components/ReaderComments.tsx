/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { memo, useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import { supabase } from '@/lib/SupabaseClient.ts';

// Type for comment with basic profile relation if available
interface Profile {
    id: string;
    email?: string;
    role?: string;
}

interface Comment {
    id: string;
    chapter_id: string;
    user_id: string;
    content: string;
    created_at: string;
    likes_count: number;
    profiles?: Profile | null;
}

const ReaderCommentsBase = ({ chapterId }: { chapterId: number | string }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const fetchComments = useCallback(async () => {
        setLoading(true);
        // Assuming profiles relation exists, otherwise we just fetch comments
        const { data, error } = await supabase
            .from('comments')
            .select(
                `
                *,
                profiles (
                    id,
                    email,
                    role
                )
            `,
            )
            .eq('chapter_id', chapterId.toString())
            .order('created_at', { ascending: false });

        if (!error && data) {
            setComments(data as Comment[]);
        } else if (error) {
            // Fallback for missing relations logic:
            const { data: fallbackData } = await supabase
                .from('comments')
                .select('*')
                .eq('chapter_id', chapterId.toString())
                .order('created_at', { ascending: false });

            if (fallbackData) {
                setComments(fallbackData as Comment[]);
            }
        }
        setLoading(false);
    }, [chapterId]);

    useEffect(() => {
        if (!chapterId) return;

        const checkAuthAndFetch = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (session?.user) {
                setCurrentUserId(session.user.id);
            }

            fetchComments();
        };

        checkAuthAndFetch();
    }, [chapterId, fetchComments]);

    const handlePostComment = async () => {
        if (!newComment.trim() || !currentUserId) return;

        setSubmitting(true);
        const { error } = await supabase.from('comments').insert({
            chapter_id: chapterId.toString(),
            user_id: currentUserId,
            content: newComment.trim(),
        });

        setSubmitting(false);

        if (!error) {
            setNewComment('');
            fetchComments();
        } else {
            alert('Failed to post comment.');
        }
    };

    return (
        <Box
            sx={{
                width: '100%',
                maxWidth: '800px',
                margin: '0 auto',
                mt: 6,
                mb: 6,
                p: 3,
                borderRadius: '16px',
                background: 'rgba(15, 15, 20, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            }}
        >
            <Typography
                variant="h5"
                sx={{ color: '#fff', fontWeight: '800', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}
            >
                <span>💬</span> Comments {comments.length > 0 && `(${comments.length})`}
            </Typography>

            {currentUserId ? (
                <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                    <Avatar sx={{ bgcolor: '#ec4899' }}>U</Avatar>
                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                        <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            placeholder="Add a comment..."
                            variant="outlined"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '12px',
                                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                    '&.Mui-focused fieldset': { borderColor: '#ec4899' },
                                },
                            }}
                        />
                        <Button
                            variant="contained"
                            disabled={!newComment.trim() || submitting}
                            onClick={handlePostComment}
                            sx={{
                                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                                borderRadius: '20px',
                                textTransform: 'none',
                                fontWeight: '700',
                                padding: '6px 24px',
                            }}
                        >
                            Post
                        </Button>
                    </Box>
                </Box>
            ) : (
                <Box
                    sx={{
                        p: 3,
                        mb: 4,
                        textAlign: 'center',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '12px',
                    }}
                >
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        You must be logged in to post a comment.
                    </Typography>
                </Box>
            )}

            {loading && (
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', my: 4 }}>
                    Loading comments...
                </Typography>
            )}
            {!loading && comments.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.4)' }}>
                        No comments yet. Be the first to start the discussion!
                    </Typography>
                </Box>
            )}
            {!loading && comments.length > 0 && (
                <Stack spacing={3}>
                    {comments.map((comment) => {
                        const emailDisp = comment.profiles?.email || 'Anonymous';
                        const username = emailDisp.split('@')[0];
                        return (
                            <Box key={comment.id} sx={{ display: 'flex', gap: 2 }}>
                                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}>
                                    {username.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: '700' }}>
                                            {username}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                                            {new Date(comment.created_at).toLocaleDateString()}
                                        </Typography>
                                    </Box>
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            color: 'rgba(255,255,255,0.8)',
                                            wordBreak: 'break-word',
                                            whiteSpace: 'pre-wrap',
                                        }}
                                    >
                                        {comment.content}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: 'rgba(255,255,255,0.4)',
                                                cursor: 'pointer',
                                                '&:hover': { color: '#ec4899' },
                                            }}
                                        >
                                            👍 {comment.likes_count || 0}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })}
                </Stack>
            )}
        </Box>
    );
};

export const ReaderComments = memo(ReaderCommentsBase);
