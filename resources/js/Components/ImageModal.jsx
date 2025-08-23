import React from 'react';
import { Dialog, DialogContent, IconButton, Box, Typography, Fade } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';

export default function ImageModal({
    open,
    onClose,
    src,
    alt,
    title,
    canDelete = false,
    onDelete,
    downloadUrl,
}) {
    if (!src) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            fullWidth
            sx={{
                '& .MuiDialog-paper': {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    boxShadow: 'none',
                    overflow: 'hidden',
                },
            }}
        >
            <DialogContent
                sx={{
                    p: 0,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '80vh',
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                }}
            >
                {/* Header Controls */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        zIndex: 1000,
                        display: 'flex',
                        gap: 1,
                    }}
                >
                    {downloadUrl && (
                        <IconButton
                            onClick={() => {
                                const link = document.createElement('a');
                                link.href = downloadUrl;
                                link.download = alt || 'image';
                                link.click();
                            }}
                            sx={{
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                },
                            }}
                        >
                            <DownloadIcon />
                        </IconButton>
                    )}
                    {canDelete && onDelete && (
                        <IconButton
                            onClick={() => {
                                if (confirm('Are you sure you want to delete this image?')) {
                                    onDelete();
                                    onClose();
                                }
                            }}
                            sx={{
                                backgroundColor: 'rgba(244, 67, 54, 0.8)',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: 'rgba(244, 67, 54, 0.9)',
                                },
                            }}
                        >
                            <DeleteIcon />
                        </IconButton>
                    )}
                    <IconButton
                        onClick={onClose}
                        sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            },
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Title */}
                {title && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 16,
                            left: 16,
                            zIndex: 1000,
                        }}
                    >
                        <Typography
                            variant="h6"
                            sx={{
                                color: 'white',
                                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            }}
                        >
                            {title}
                        </Typography>
                    </Box>
                )}

                {/* Image */}
                <Fade in={open} timeout={300}>
                    <Box
                        sx={{
                            maxWidth: '90vw',
                            maxHeight: '80vh',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <img
                            src={src}
                            alt={alt || 'Image'}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </Box>
                </Fade>

                {/* Click outside to close */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: -1,
                    }}
                    onClick={onClose}
                />
            </DialogContent>
        </Dialog>
    );
}
