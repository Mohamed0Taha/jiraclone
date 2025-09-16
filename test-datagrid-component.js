// Test DataGrid component to verify the integration works
const TestDataGridComponent = ({ React, useState, useEffect, MuiDataGrid, MuiMaterial }) => {
    const { DataGrid } = MuiDataGrid;
    const { Box } = MuiMaterial;
    const [rows, setRows] = useState([]);

    useEffect(() => {
        // Mock data for testing
        setRows([
            { id: 1, name: 'John Doe', age: 35, role: 'Developer' },
            { id: 2, name: 'Jane Smith', age: 28, role: 'Designer' },
            { id: 3, name: 'Bob Johnson', age: 42, role: 'Manager' }
        ]);
    }, []);

    const columns = [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'age', headerName: 'Age', type: 'number', width: 110 },
        { field: 'role', headerName: 'Role', width: 150 }
    ];

    return (
        <Box sx={{ height: 400, width: '100%', p: 2 }}>
            <DataGrid
                rows={rows}
                columns={columns}
                pageSize={5}
                rowsPerPageOptions={[5]}
                checkboxSelection
                disableSelectionOnClick
            />
        </Box>
    );
};

export default TestDataGridComponent;