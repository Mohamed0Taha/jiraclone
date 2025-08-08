import React, { useState } from "react";
import { Head, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import {
    alpha,
    Box,
    Button,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Paper,
    Stack,
    Typography,
    Link as MuiLink,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import ProjectAccordion from "./ProjectAccordion";

export default function Dashboard({ auth, projects }) {
    /* pastel rainbow colours */
    const rainbow = [
        "#FFE934", "#C6FF00", "#4CAF50", "#00BFA5", "#2196F3",
        "#3F51B5", "#9C27B0", "#E040FB", "#FF4081", "#FF1744",
    ];
    const rowSx = (i) => ({
        bgcolor: alpha(rainbow[i % rainbow.length], 0.15),
        "&:hover": { bgcolor: alpha(rainbow[i % rainbow.length], 0.3) },
    });

    /* delete modal state */
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const askDelete = (e, p) => {
        e.stopPropagation();
        e.preventDefault();
        setProjectToDelete(p);
        setConfirmOpen(true);
    };
    const confirmDelete = () => {
        if (projectToDelete)
            router.delete(`/projects/${projectToDelete.id}`, { preserveScroll: true });
        setConfirmOpen(false);
        setProjectToDelete(null);
    };

    return (
        <>
            <Head title="Dashboard" />

            <AuthenticatedLayout user={auth.user}>
                <Box sx={{ py: 8, bgcolor: "background.default", minHeight: "100vh" }}>
                    <Container maxWidth="lg">
                        <Stack spacing={4}>
                            {/* new-project button */}
                            <Box display="flex" justifyContent="flex-end">
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    href="/projects/create"
                                    sx={{ textTransform: "none" }}
                                >
                                    New Project
                                </Button>
                            </Box>

                            {/* projects */}
                            <Paper elevation={1} sx={{ p: 4 }}>
                                <Typography variant="h5" fontWeight={600} mb={3}>
                                    Your Projects
                                </Typography>

                                {projects.length === 0 ? (
                                    <Typography color="text.secondary">
                                        You don’t have any projects yet. Click&nbsp;
                                        <MuiLink href="/projects/create" underline="hover">
                                            New Project
                                        </MuiLink>
                                        &nbsp;to create your first one.
                                    </Typography>
                                ) : (
                                    <Box>
                                        {projects.map((p, idx) => (
                                            <ProjectAccordion
                                                key={p.id}
                                                project={p}
                                                rowSx={rowSx(idx)}
                                                onDelete={askDelete}
                                            />
                                        ))}
                                    </Box>
                                )}
                            </Paper>
                        </Stack>
                    </Container>
                </Box>
            </AuthenticatedLayout>

            {/* confirmation dialog */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>Delete Project</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {projectToDelete
                            ? `Delete “${projectToDelete.name}”? This action cannot be undone.`
                            : ""}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={confirmDelete}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
