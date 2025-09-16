// Test component to verify beautiful styling from first draft
import React, { useState, useEffect } from 'react';

export default function BeautifulTestComponent() {
    const [data, setData] = useEmbeddedData('test-data', {
        users: [
            { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'Active' },
            { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'User', status: 'Active' },
            { id: 3, name: 'Carol Davis', email: 'carol@example.com', role: 'User', status: 'Inactive' }
        ]
    });

    const users = data?.users || [];
    const currentUser = authUser || { id: 1, name: 'Anonymous' };

    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'User' });

    const addUser = () => {
        if (!newUser.name || !newUser.email) return;

        const user = {
            id: Date.now(),
            ...newUser,
            status: 'Active',
            creator: currentUser,
            created_at: new Date().toISOString()
        };

        setData({
            ...data,
            users: [...users, user]
        });

        setNewUser({ name: '', email: '', role: 'User' });
    };

    const deleteUser = (id) => {
        setData({
            ...data,
            users: users.filter(user => user.id !== id)
        });
    };

    const columns = [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'name', headerName: 'Name', width: 200 },
        { field: 'email', headerName: 'Email', width: 250 },
        { field: 'role', headerName: 'Role', width: 120 },
        { field: 'status', headerName: 'Status', width: 120 }
    ];

    return (
        <StyledComponents.ContentContainer>
            <StyledComponents.SectionHeader variant="h4">
                User Management Dashboard
            </StyledComponents.SectionHeader>

            {/* Add User Form */}
            <StyledComponents.FormContainer>
                <Typography variant="h6" sx={{ mb: 2, color: designTokens.colors.neutral[700] }}>
                    Add New User
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        label="Full Name"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        sx={{
                            minWidth: 200,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: designTokens.borderRadius.lg
                            }
                        }}
                    />

                    <TextField
                        label="Email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        sx={{
                            minWidth: 200,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: designTokens.borderRadius.lg
                            }
                        }}
                    />

                    <FormControl sx={{ minWidth: 120 }}>
                        <InputLabel>Role</InputLabel>
                        <Select
                            value={newUser.role}
                            label="Role"
                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                            sx={{ borderRadius: designTokens.borderRadius.lg }}
                        >
                            <MenuItem value="User">User</MenuItem>
                            <MenuItem value="Admin">Admin</MenuItem>
                            <MenuItem value="Manager">Manager</MenuItem>
                        </Select>
                    </FormControl>

                    <StyledComponents.SuccessButton onClick={addUser}>
                        <AddIcon sx={{ mr: 1 }} />
                        Add User
                    </StyledComponents.SuccessButton>
                </Box>
            </StyledComponents.FormContainer>

            {/* Users Data Grid */}
            <StyledComponents.BeautifulCard>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, color: designTokens.colors.neutral[700] }}>
                        Current Users ({users.length})
                    </Typography>

                    <Box sx={{ height: 400, width: '100%' }}>
                        <DataGrid
                            rows={users}
                            columns={columns}
                            pageSize={5}
                            rowsPerPageOptions={[5, 10, 20]}
                            checkboxSelection
                            disableSelectionOnClick
                            sx={{
                                border: 'none',
                                '& .MuiDataGrid-root': {
                                    border: 'none'
                                },
                                '& .MuiDataGrid-cell': {
                                    borderBottom: `1px solid ${designTokens.colors.neutral[200]}`
                                },
                                '& .MuiDataGrid-columnHeaders': {
                                    backgroundColor: designTokens.colors.neutral[50],
                                    borderBottom: `2px solid ${designTokens.colors.primary[500]}`,
                                    fontWeight: 600
                                },
                                '& .MuiDataGrid-row:hover': {
                                    backgroundColor: designTokens.colors.primary[50]
                                }
                            }}
                        />
                    </Box>
                </CardContent>
            </StyledComponents.BeautifulCard>

            {/* Action Buttons */}
            <Box sx={styleUtils.flexBetween}>
                <StyledComponents.DangerButton>
                    <DeleteIcon sx={{ mr: 1 }} />
                    Delete Selected
                </StyledComponents.DangerButton>

                <StyledComponents.PrimaryButton>
                    <SaveIcon sx={{ mr: 1 }} />
                    Export Data
                </StyledComponents.PrimaryButton>
            </Box>
        </StyledComponents.ContentContainer>
    );
}