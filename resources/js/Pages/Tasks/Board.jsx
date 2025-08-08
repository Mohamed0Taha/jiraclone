import React, { useState } from "react";
import { Head, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Fab,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import TaskCard from "./TaskCard";

export default function Board({ auth, project, tasks, users }) {
    /* column colours */
    const columns = [
        { key: "todo",       title: "To Do",       color: "#fef9c3" },
        { key: "inprogress", title: "In Progress", color: "#e0f2fe" },
        { key: "done",       title: "Done",        color: "#dcfce7" },
    ];

    /* state */
    const [taskState, setTaskState]         = useState(tasks);
    const [openForm, setOpenForm]           = useState(false);
    const [editMode, setEditMode]           = useState(false);
    const [editingId, setEditingId]         = useState(null);
    const [confirmOpen, setConfirmOpen]     = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    const { data, setData, post, patch, reset, processing, errors } = useForm({
        title: "", description: "", execution_date: "", assignee_id: "", status: "todo",
    });

    /* sync helper */
    const refreshTasks = (page) => {
        if (page?.props?.tasks) setTaskState(page.props.tasks);
    };

    /* create / edit helpers */
    const showCreate = () => { reset(); setEditMode(false); setEditingId(null); setOpenForm(true); };
    const showEdit   = (t) => {
        setEditMode(true); setEditingId(t.id);
        setData({
            title: t.title,
            description: t.description ?? "",
            execution_date: t.execution_date ?? "",
            assignee_id: t.assignee?.id ?? "",
            status: t.status,
        });
        setOpenForm(true);
    };

    const submit = (e) => {
        e.preventDefault();
        const routeName = editMode
            ? route("tasks.update", [project.id, editingId])
            : route("tasks.store",  project.id);

        const action = editMode ? patch : post;
        action(routeName, {
            ...data,
            preserveScroll: true,
            onSuccess: (p) => { refreshTasks(p); setOpenForm(false); reset(); },
        });
    };

    /* delete helpers */
    const askDelete = (id) => { setPendingDeleteId(id); setConfirmOpen(true); };
    const confirmDelete = () => {
        router.delete(route("tasks.destroy", [project.id, pendingDeleteId]), {
            preserveScroll: true,
            onSuccess: refreshTasks,
        });
        setConfirmOpen(false);
        setPendingDeleteId(null);
    };

    /* drag & drop */
    const onDragEnd = ({ destination, source, draggableId }) => {
        if (!destination || destination.droppableId === source.droppableId) return;

        const id   = Number(draggableId);
        const from = source.droppableId;
        const to   = destination.droppableId;
        const moving = taskState[from].find((t) => t.id === id);
        if (!moving) return;

        const newFrom = taskState[from].filter((t) => t.id !== id);
        const newTo   = [...taskState[to]];
        newTo.splice(destination.index, 0, { ...moving, status: to });

        setTaskState({ ...taskState, [from]: newFrom, [to]: newTo });

        router.patch(route("tasks.update", [project.id, id]), {
            status: to,
            preserveScroll: true,
            onSuccess: refreshTasks,
        });
    };

    return (
        <>
            <Head title={`${project.name} – Task Board`} />

            <AuthenticatedLayout user={auth.user}>
                <Box sx={{ p: 3, minHeight: "100vh", bgcolor: "#f1f5f9" }}>
                    {/* header */}
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                        <Typography variant="h4" fontWeight={700} sx={{
                            maxWidth: "65%", whiteSpace: "nowrap",
                            overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                            {project.name} – Task Board
                        </Typography>

                        <Button
                            variant="outlined"
                            sx={{ ml: "auto" }}  /* pinned right */
                            onClick={() => router.visit(route("tasks.ai.form", project.id))}
                        >
                            AI Tasks Generator
                        </Button>
                    </Box>

                    {/* board */}
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Box sx={{ display: "flex", gap: 2, minHeight: "calc(100vh - 160px)" }}>
                            {columns.map((col) => (
                                <Droppable key={col.key} droppableId={col.key}>
                                    {(dropProvided) => (
                                        <Box
                                            ref={dropProvided.innerRef}
                                            {...dropProvided.droppableProps}
                                            sx={{
                                                flex: 1, p: 1.5, borderRadius: 2,
                                                backgroundColor: col.color,
                                                display: "flex", flexDirection: "column",
                                            }}
                                        >
                                            <Typography align="center" fontWeight={600} mb={1}>
                                                {col.title}
                                            </Typography>

                                            <Stack spacing={1} flexGrow={1}>
                                                {(taskState[col.key] ?? []).map((task, idx) => (
                                                    <Draggable
                                                        key={task.id}
                                                        draggableId={String(task.id)}
                                                        index={idx}
                                                    >
                                                        {(dragProvided) => (
                                                            <div
                                                                ref={dragProvided.innerRef}
                                                                {...dragProvided.draggableProps}
                                                                {...dragProvided.dragHandleProps}
                                                                style={dragProvided.draggableProps.style}
                                                            >
                                                                <TaskCard
                                                                    task={task}
                                                                    onEdit={() => showEdit(task)}
                                                                    onDelete={() => askDelete(task.id)}
                                                                />
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {dropProvided.placeholder}
                                            </Stack>
                                        </Box>
                                    )}
                                </Droppable>
                            ))}
                        </Box>
                    </DragDropContext>

                    {/* FAB */}
                    <Fab color="primary" sx={{ position: "fixed", bottom: 24, right: 24 }} onClick={showCreate}>
                        <AddIcon />
                    </Fab>

                    {/* create / edit dialog */}
                    <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
                        <form onSubmit={submit}>
                            <DialogTitle>{editMode ? "Edit Task" : "New Task"}</DialogTitle>
                            <DialogContent dividers>
                                <Stack spacing={2} sx={{ mt: 1 }}>
                                    <TextField
                                        label="Title" required fullWidth
                                        value={data.title}
                                        onChange={(e) => setData("title", e.target.value)}
                                        error={!!errors.title} helperText={errors.title}
                                    />
                                    <TextField
                                        label="Description" multiline minRows={3} fullWidth
                                        value={data.description}
                                        onChange={(e) => setData("description", e.target.value)}
                                        error={!!errors.description} helperText={errors.description}
                                    />
                                    <TextField
                                        label="Execution Date" type="date" fullWidth
                                        InputLabelProps={{ shrink: true }}
                                        value={data.execution_date}
                                        onChange={(e) => setData("execution_date", e.target.value)}
                                        error={!!errors.execution_date} helperText={errors.execution_date}
                                    />
                                    <TextField
                                        select label="Assign to" fullWidth
                                        value={data.assignee_id}
                                        onChange={(e) => setData("assignee_id", e.target.value)}
                                        error={!!errors.assignee_id} helperText={errors.assignee_id}
                                    >
                                        <MenuItem value="">— Unassigned —</MenuItem>
                                        {users.map((u) => (
                                            <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                                        ))}
                                    </TextField>
                                </Stack>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setOpenForm(false)} disabled={processing}>Cancel</Button>
                                <Button type="submit" variant="contained" disabled={processing}>
                                    {editMode ? "Update" : "Create"}
                                </Button>
                            </DialogActions>
                        </form>
                    </Dialog>

                    {/* delete confirmation */}
                    <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                        <DialogTitle>Delete Task</DialogTitle>
                        <DialogContent>
                            <DialogContentText>Delete this task permanently?</DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                            <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </AuthenticatedLayout>
        </>
    );
}
