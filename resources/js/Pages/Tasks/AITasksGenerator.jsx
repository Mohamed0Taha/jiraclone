import React, { useState } from "react";
import { Head, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import {
    Box,
    Button,
    CircularProgress,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

/**
 * props:
 *   project  – Project model
 *   prefill  – { count?: string|number, prompt?: string }
 */
export default function AITasksGenerator({ auth, project, prefill = {} }) {
    const [submitting, setSubmitting] = useState(false);

    /* initial values come from ?count=&prompt= or fall back */
    const initial = {
        count:  prefill.count  ? Number(prefill.count) : 5,
        prompt: prefill.prompt ?? "",
    };

    const { data, setData, post, processing, errors } = useForm(initial);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitting(true);

        post(route("tasks.ai.preview", project.id), {
            ...data,
            preserveScroll: true,
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <>
            <Head title="AI Tasks Generator" />

            <AuthenticatedLayout user={auth.user}>
                <Box sx={{
                    p: 3, minHeight: "100vh", bgcolor: "#f1f5f9",
                    display: "flex", justifyContent: "center", alignItems: "center",
                }}>
                    <Paper elevation={3} sx={{ p: 4, width: "100%", maxWidth: 520 }}>
                        <Typography variant="h5" fontWeight={700} mb={2}>
                            AI Tasks Generator
                        </Typography>

                        <Typography mb={3}>
                            Enter how many tasks you’d like GPT-4o to create for "
                            {project.name}" and optionally give extra instructions.
                        </Typography>

                        <form onSubmit={handleSubmit}>
                            <Stack spacing={3}>
                                <TextField
                                    label="Number of tasks"
                                    type="number"
                                    inputProps={{ min: 1, max: 50 }}
                                    value={data.count}
                                    onChange={(e) =>
                                        setData("count", parseInt(e.target.value, 10))
                                    }
                                    error={!!errors.count}
                                    helperText={errors.count}
                                    required fullWidth
                                />

                                <TextField
                                    label="Extra instructions (optional)"
                                    multiline minRows={4} fullWidth
                                    value={data.prompt}
                                    onChange={(e) => setData("prompt", e.target.value)}
                                    error={!!errors.prompt}
                                    helperText={errors.prompt}
                                />

                                {errors.ai && (
                                    <Typography color="error" variant="body2">
                                        {errors.ai}
                                    </Typography>
                                )}

                                <Stack direction="row" spacing={2} justifyContent="flex-end">
                                    <Button
                                        variant="outlined"
                                        onClick={() =>
                                            router.visit(route("tasks.index", project.id))
                                        }
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="contained"
                                        type="submit"
                                        disabled={submitting || processing}
                                        startIcon={submitting && <CircularProgress size={18} />}
                                    >
                                        Generate
                                    </Button>
                                </Stack>
                            </Stack>
                        </form>
                    </Paper>
                </Box>
            </AuthenticatedLayout>
        </>
    );
}
