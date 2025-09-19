import React, { useState } from 'react';
import { Box, Typography, Stack, Button, Table, TableHead, TableRow, TableCell, TableBody, TextField, IconButton, Chip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudIcon from '@mui/icons-material/Cloud';
import ComputerIcon from '@mui/icons-material/Computer';
import useLocalViewData from '../useLocalViewData';
import useSharedViewData from '../useSharedViewData';
import InputModal from '../components/InputModal';

export default function Spreadsheet({ projectId, viewName }) {
  const [useShared, setUseShared] = useState(true); // Default to shared mode
  const defaultValue = { columns: ['A', 'B', 'C'], rows: [] };
  
  // Use either local or shared data based on toggle
  const localData = useLocalViewData({ projectId, viewName, appKey: 'Spreadsheet', defaultValue });
  const sharedData = useSharedViewData({ projectId, viewName, appKey: 'Spreadsheet', defaultValue });
  
  const [state, setState] = useShared ? sharedData : localData;
  const { columns = ['A','B','C'], rows = [] } = state || {};
  const [modalOpen, setModalOpen] = useState(false);

  const addRow = () => {
    const newRow = { id: Date.now() };
    columns.forEach((c) => { newRow[c] = ''; });
    setState({ ...state, rows: [...rows, newRow] });
  };
  const addColumn = () => {
    setModalOpen(true);
  };
  
  const handleAddColumn = (values) => {
    if (!values.columnName) return;
    const nextCols = [...columns, values.columnName];
    const nextRows = rows.map((r) => ({ ...r, [values.columnName]: r[values.columnName] || '' }));
    setState({ columns: nextCols, rows: nextRows });
  };
  const delRow = (id) => setState({ ...state, rows: rows.filter((r) => r.id !== id) });
  const updateCell = (id, col, val) => setState({ ...state, rows: rows.map(r => r.id === id ? { ...r, [col]: val } : r) });

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h6" fontWeight={600}>Spreadsheet</Typography>
          <Chip 
            icon={useShared ? <CloudIcon /> : <ComputerIcon />}
            label={useShared ? 'Shared' : 'Local'}
            onClick={() => setUseShared(!useShared)}
            color={useShared ? 'primary' : 'default'}
            variant={useShared ? 'filled' : 'outlined'}
            size="small"
            clickable
          />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={addColumn}>Add Column</Button>
          <Button variant="contained" onClick={addRow}>Add Row</Button>
        </Stack>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
            {columns.map((c) => (<TableCell key={c} sx={{ fontWeight: 600 }}>{c}</TableCell>))}
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={row.id} hover>
              <TableCell>{idx + 1}</TableCell>
              {columns.map((c) => (
                <TableCell key={c} sx={{ minWidth: 140 }}>
                  <TextField
                    size="small"
                    fullWidth
                    value={row[c] ?? ''}
                    onChange={(e) => updateCell(row.id, c, e.target.value)}
                  />
                </TableCell>
              ))}
              <TableCell width={48} align="right">
                <IconButton size="small" onClick={() => delRow(row.id)}><DeleteIcon fontSize="small"/></IconButton>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length + 2}>
                <Typography variant="body2" color="text.secondary">No rows yet. Click Add Row to start.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      <InputModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Column"
        fields={[
          {
            name: 'columnName',
            label: 'Column Name',
            defaultValue: String.fromCharCode(65 + columns.length),
            required: true
          }
        ]}
        onSubmit={handleAddColumn}
      />
    </Box>
  );
}
