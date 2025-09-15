export default function StickyNotesApp() {
    // ✅ Use the safe data initialization pattern
    const [notesData, setNotesData] = useEmbeddedData("sticky-notes", { tasks: [] });
    const tasks = notesData?.tasks || [];

    // UI state (not persisted)
    const [newNote, setNewNote] = useState('');
    const [editing, setEditing] = useState(null);

    const addNote = () => {
        if (newNote.trim()) {
            const newTask = {
                id: Date.now(),
                title: newNote,
                description: '',
                status: 'todo',
                priority: 'low',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                creator: null,
                assignee: null,
            };

            const updatedData = {
                ...notesData,
                tasks: [...tasks, newTask],
                lastUpdated: new Date().toISOString()
            };

            setNotesData(updatedData);
            setNewNote('');
        }
    };

    const updateNote = (id, updates) => {
        const updatedTasks = tasks.map(task =>
            task.id === id
                ? { ...task, ...updates, updated_at: new Date().toISOString() }
                : task
        );

        const updatedData = {
            ...notesData,
            tasks: updatedTasks,
            lastUpdated: new Date().toISOString()
        };

        setNotesData(updatedData);
    };

    const deleteNote = (id) => {
        if (window.confirm('Are you sure you want to delete this note?')) {
            const updatedData = {
                ...notesData,
                tasks: tasks.filter(task => task.id !== id),
                lastUpdated: new Date().toISOString()
            };

            setNotesData(updatedData);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeydown = (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                // Data is auto-saved via useEmbeddedData
            }
            if (e.key === 'Escape') {
                setEditing(null);
            }
        };
        document.addEventListener('keydown', handleKeydown);
        return () => document.removeEventListener('keydown', handleKeydown);
    }, []);

    return (
        <div className="p-4">
            <div className="mb-4" style={{ maxHeight: '13vh' }}>
                <input
                    type="text"
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addNote()}
                    placeholder="Add a new note"
                    className="border p-2 mr-2"
                />
                <button
                    onClick={addNote}
                    className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                >
                    Add Note
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: '87vh' }}>
                {tasks.map(task => (
                    <div key={task.id} className="border p-4 bg-yellow-100 rounded shadow-sm">
                        {editing === task.id ? (
                            <input
                                type="text"
                                value={task.title}
                                onChange={e => updateNote(task.id, { title: e.target.value })}
                                onBlur={() => setEditing(null)}
                                onKeyPress={e => e.key === 'Enter' && setEditing(null)}
                                className="border p-2 w-full rounded"
                                autoFocus
                            />
                        ) : (
                            <h3
                                onClick={() => setEditing(task.id)}
                                className="cursor-pointer hover:bg-yellow-200 p-1 rounded"
                                title="Click to edit"
                            >
                                {task.title}
                            </h3>
                        )}
                        <button
                            onClick={() => deleteNote(task.id)}
                            className="text-red-500 mt-2 hover:text-red-700 text-sm"
                        >
                            Delete
                        </button>
                        <div className="text-xs text-gray-500 mt-2">
                            Created: {new Date(task.created_at).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 text-sm text-gray-600">
                Notes: {tasks.length} | Last updated: {notesData?.lastUpdated ? new Date(notesData.lastUpdated).toLocaleString() : "Never"}
            </div>
        </div>
    );
}