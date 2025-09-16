# Material-UI DataGrid Support for Advanced Tables

## Issues Fixed

### 1. React Hooks Error (Critical)
**Problem**: `Cannot read properties of undefined (reading 'useMemo')`
**Root Cause**: ReactComponentRenderer was converting hook calls to `React.useMemo()` but React hooks were provided as destructured variables in factory scope.
**Solution**: Removed the hook transformation logic since hooks are already available as destructured variables.

### 2. Limited Table Functionality
**Problem**: Only basic HTML tables were supported, making it difficult to create sortable, filterable, editable tables.
**Solution**: Added comprehensive Material-UI DataGrid support with advanced features.

## Available Material-UI DataGrid Components

### Core Components (Runtime Exports)
- `DataGrid` - Main data grid component
- `GridActionsCellItem` - Action buttons in cells
- `GridRowModes` - Row editing mode constants
- `GridToolbar` - Built-in toolbar with search, filter, export
- `GridToolbarContainer` - Custom toolbar container

### Toolbar Components
- `GridToolbarColumnsButton` - Column visibility toggle
- `GridToolbarFilterButton` - Filter panel toggle
- `GridToolbarExport` - Export functionality
- `GridToolbarDensitySelector` - Row density selector

### TypeScript Types (Not Available at Runtime)
Note: These are TypeScript type definitions and cannot be destructured at runtime:
- `GridColDef` - Column definition type (use plain objects)
- `GridRowsProp` - Row data type (use arrays)
- `GridRowModesModel` - Row modes model type (use plain objects)

## Example Usage

### Basic Sortable/Filterable Table
```jsx
export default function AdvancedTable() {
    const [tableData, setTableData] = useEmbeddedData('table-data', { entries: [] });
    const entries = tableData?.entries || [];
    
    const columns = [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'name', headerName: 'Name', width: 150, editable: true },
        { field: 'age', headerName: 'Age', type: 'number', width: 110, editable: true },
        { field: 'email', headerName: 'Email', width: 200, editable: true },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 100,
            cellClassName: 'actions',
            getActions: ({ id }) => [
                <GridActionsCellItem
                    icon={<EditIcon />}
                    label="Edit"
                    onClick={() => handleEdit(id)}
                />,
                <GridActionsCellItem
                    icon={<DeleteIcon />}
                    label="Delete"
                    onClick={() => handleDelete(id)}
                />
            ]
        }
    ];

    const handleEdit = (id) => {
        // Handle edit logic
    };

    const handleDelete = (id) => {
        const updatedEntries = entries.filter(entry => entry.id !== id);
        setTableData({ ...tableData, entries: updatedEntries });
    };

    return (
        <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
                rows={entries}
                columns={columns}
                initialState={{
                    pagination: {
                        paginationModel: { page: 0, pageSize: 5 },
                    },
                }}
                pageSizeOptions={[5, 10]}
                checkboxSelection
                disableRowSelectionOnClick
                slots={{
                    toolbar: GridToolbar,
                }}
            />
        </Box>
    );
}
```

### Editable DataGrid with CRUD Operations
```jsx
export default function EditableDataGrid() {
    const [tableData, setTableData] = useEmbeddedData('editable-data', { entries: [] });
    const [rowModesModel, setRowModesModel] = useState({});
    const entries = tableData?.entries || [];
    const currentUser = authUser || { id: 1, name: 'Anonymous' };

    const handleRowEditStart = (params, event) => {
        event.defaultMuiPrevented = true;
    };

    const handleRowEditStop = (params, event) => {
        if (params.reason === 'rowFocusOut') {
            event.defaultMuiPrevented = true;
        }
    };

    const processRowUpdate = (newRow) => {
        const updatedEntries = entries.map((row) => 
            row.id === newRow.id ? { 
                ...newRow, 
                updated_at: new Date().toISOString(),
                updated_by: currentUser.id 
            } : row
        );
        setTableData({ ...tableData, entries: updatedEntries });
        return newRow;
    };

    const handleDelete = (id) => {
        const updatedEntries = entries.filter(entry => entry.id !== id);
        setTableData({ ...tableData, entries: updatedEntries });
    };

    const columns = [
        { field: 'name', headerName: 'Name', width: 180, editable: true },
        { field: 'age', headerName: 'Age', type: 'number', width: 100, editable: true },
        { field: 'email', headerName: 'Email', width: 220, editable: true },
        { field: 'role', headerName: 'Role', width: 150, editable: true },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 100,
            getActions: ({ id }) => {
                const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;
                
                if (isInEditMode) {
                    return [
                        <GridActionsCellItem
                            icon={<SaveIcon />}
                            label="Save"
                            onClick={() => setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } })}
                        />,
                        <GridActionsCellItem
                            icon={<CancelIcon />}
                            label="Cancel"
                            onClick={() => setRowModesModel({ 
                                ...rowModesModel, 
                                [id]: { mode: GridRowModes.View, ignoreModifications: true } 
                            })}
                        />
                    ];
                }

                return [
                    <GridActionsCellItem
                        icon={<EditIcon />}
                        label="Edit"
                        onClick={() => setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } })}
                    />,
                    <GridActionsCellItem
                        icon={<DeleteIcon />}
                        label="Delete"
                        onClick={() => handleDelete(id)}
                    />
                ];
            }
        }
    ];

    return (
        <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
                rows={entries}
                columns={columns}
                editMode="row"
                rowModesModel={rowModesModel}
                onRowModesModelChange={setRowModesModel}
                onRowEditStart={handleRowEditStart}
                onRowEditStop={handleRowEditStop}
                processRowUpdate={processRowUpdate}
                slots={{
                    toolbar: GridToolbar,
                }}
                slotProps={{
                    toolbar: {
                        showQuickFilter: true,
                        quickFilterProps: { debounceMs: 500 },
                    },
                }}
            />
        </Box>
    );
}
```

### Custom Toolbar Example
```jsx
function CustomToolbar() {
    return (
        <GridToolbarContainer>
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
            <GridToolbarDensitySelector />
            <GridToolbarExport />
            <Button
                startIcon={<AddIcon />}
                onClick={() => {
                    // Add new row logic
                }}
            >
                Add Record
            </Button>
        </GridToolbarContainer>
    );
}

// Use in DataGrid:
<DataGrid
    // ... other props
    slots={{
        toolbar: CustomToolbar,
    }}
/>
```

## Migration from Basic Tables

### Before (Basic HTML Table)
```jsx
<table className="min-w-full bg-white">
    <thead>
        <tr>
            <th onClick={() => requestSort('name')}>Name</th>
            <th onClick={() => requestSort('age')}>Age</th>
        </tr>
    </thead>
    <tbody>
        {sortedEntries.map(entry => (
            <tr key={entry.id}>
                <td>{entry.name}</td>
                <td>{entry.age}</td>
            </tr>
        ))}
    </tbody>
</table>
```

### After (Material-UI DataGrid)
```jsx
<DataGrid
    rows={entries}
    columns={[
        { field: 'name', headerName: 'Name', width: 150, sortable: true },
        { field: 'age', headerName: 'Age', type: 'number', width: 100, sortable: true }
    ]}
    initialState={{
        pagination: {
            paginationModel: { page: 0, pageSize: 10 },
        },
    }}
    slots={{ toolbar: GridToolbar }}
/>
```

## Benefits of Material-UI DataGrid

1. **Built-in Sorting**: No need to implement custom sort logic
2. **Built-in Filtering**: Advanced filter panel with multiple operators
3. **Built-in Pagination**: Automatic pagination with customizable page sizes
4. **Row Selection**: Multi-select with checkboxes
5. **Column Management**: Show/hide columns, resize, reorder
6. **Export Functionality**: Export to CSV/Excel
7. **Inline Editing**: Edit cells directly in the grid
8. **Density Options**: Compact, standard, or comfortable row spacing
9. **Virtual Scrolling**: Handle large datasets efficiently
10. **Accessibility**: Full keyboard navigation and screen reader support

## Available React Hooks (Fixed)

All standard React hooks are now properly available:
- `useState` - State management
- `useEffect` - Side effects and lifecycle
- `useMemo` - Memoized values (FIXED)
- `useCallback` - Memoized functions
- `useRef` - References to DOM elements
- `useReducer` - Complex state management
- `useContext` - Context consumption

## Usage in AI Prompts

When generating components, you can now request:
- "Create a sortable data table with Material-UI DataGrid"
- "Make an editable table where users can modify rows inline"
- "Add a table with filtering, export, and pagination"
- "Create a table with custom actions column"

The AI will generate components using the full Material-UI DataGrid API with proper React hooks support.