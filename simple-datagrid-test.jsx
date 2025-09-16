// Simple DataGrid test component - only uses basic DataGrid
import React, { useState, useEffect } from 'react';

export default function SimpleDataGridTest() {
    const [rows, setRows] = useState([
        { id: 1, name: 'John Doe', age: 35 },
        { id: 2, name: 'Jane Smith', age: 28 },
        { id: 3, name: 'Bob Johnson', age: 42 }
    ]);

    const columns = [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'age', headerName: 'Age', width: 110 }
    ];

    return (
        <div style={{ height: 400, width: '100%' }}>
            <h3>Simple DataGrid Test</h3>
            <DataGrid
                rows={rows}
                columns={columns}
                pageSize={5}
                checkboxSelection
            />
        </div>
    );
}