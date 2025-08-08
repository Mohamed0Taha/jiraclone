import React from "react";
import { Head, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import {
    Box,
    Button,
    Divider,
    List,
    ListItem,
    ListItemText,
    Paper,
    Stack,
    Typography,
} from "@mui/material";

/**
 * props:
 *   generated      – array of { title, description, execution_date }
 *   originalInput  – { count, prompt }  (so "Redo" preserves values)
 */
export default function AITasksPreview({ auth, project, generated, originalInput }) {
    /* Return to the generator with previous count & prompt intact */
    const redo = () =>
        router.visit(route("tasks.ai.form", project.id), {
            method: "get",
            data:   originalInput,   // ← keeps both count and multi-line prompt
            preserveState: true,
        });

    const accept = () =>
        router.post(route("tasks.ai.accept", project.id), { tasks: generated });

    return (
        <>
            <Head title="AI Tasks Preview" />

            <AuthenticatedLayout user={auth.user}>
                <Box
                    sx={{
                        p: 3,
                        minHeight: "100vh",
                        bgcolor: "#f1f5f9",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <Paper elevation={3} sx={{ p: 4, width: "100%", maxWidth: 640 }}>
                        <Typography variant="h5" fontWeight={700} mb={2}>
                            Preview {generated.length} Tasks for “{project.name}”
                        </Typography>

                        <List>
                            {generated.map((t, i) => (
                                <React.Fragment key={i}>
                                    <ListItem alignItems="flex-start">
                                        <ListItemText
                                            primary={<strong>{t.title}</strong>}
                                            secondary={
                                                <>
                                                    {t.description}
                                                    {t.execution_date && (
                                                        <Typography
                                                            component="span"
                                                            variant="caption"
                                                            display="block"
                                                            color="text.secondary"
                                                        >
                                                            Execute by: {t.execution_date}
                                                        </Typography>
                                                    )}
                                                </>
                                            }
                                        />
                                    </ListItem>
                                    {i < generated.length - 1 && <Divider component="li" />}
                                </React.Fragment>
                            ))}
                        </List>

                        <Stack direction="row" spacing={2} justifyContent="flex-end" mt={3}>
                            <Button variant="outlined" onClick={redo}>
                                Redo
                            </Button>
                            <Button variant="contained" onClick={accept}>
                                Accept &amp; Save
                            </Button>
                        </Stack>
                    </Paper>
                </Box>
            </AuthenticatedLayout>
        </>
    );
}
