import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MicroAppWrapper from '../components/MicroAppWrapper';

const EditableCell = ({ 
  value, 
  onChange, 
  onBlur, 
  isSelected, 
  onSelect,
  onKeyDown: onKeyDownProp,
  rowIndex,
  columnName
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [cellValue, setCellValue] = useState(value);
  const inputRef = React.useRef(null);

  useEffect(() => {
    setCellValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (cellValue !== value) {
      onChange(cellValue);
      onBlur && onBlur();
    }
  };

  const handleChange = (e) => {
    setCellValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur();
      if (onKeyDownProp) {
        onKeyDownProp(e, 'enter');
      }
    } else if (e.key === 'Escape') {
      setCellValue(value);
      setIsEditing(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleBlur();
      if (onKeyDownProp) {
        onKeyDownProp(e, 'tab');
      }
    } else if (e.key === 'ArrowUp' && !isEditing) {
      e.preventDefault();
      onKeyDownProp && onKeyDownProp(e, 'up');
    } else if (e.key === 'ArrowDown' && !isEditing) {
      e.preventDefault();
      onKeyDownProp && onKeyDownProp(e, 'down');
    } else if (e.key === 'ArrowLeft' && !isEditing) {
      e.preventDefault();
      onKeyDownProp && onKeyDownProp(e, 'left');
    } else if (e.key === 'ArrowRight' && !isEditing) {
      e.preventDefault();
      onKeyDownProp && onKeyDownProp(e, 'right');
    }
  };

  const showPlaceholder = !cellValue && !isEditing && isSelected;
  const cellContent = cellValue || '';

  return (
    <Box 
      sx={{ 
        position: 'relative', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center',
        cursor: 'pointer',
        p: 0.5,
        minHeight: '36px'
      }}
      onClick={() => !isEditing && onSelect()}
      onDoubleClick={handleDoubleClick}
      tabIndex={isSelected ? 0 : -1}
      onKeyDown={!isEditing ? handleKeyDown : undefined}
    >
      {isEditing ? (
        <TextField
          ref={inputRef}
          value={cellValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          variant="standard"
          fullWidth
          size="small"
          InputProps={{ 
            disableUnderline: true,
            style: { fontSize: '14px' }
          }}
          sx={{ 
            '& input': { 
              padding: '2px 4px',
              minHeight: '20px'
            } 
          }}
        />
      ) : (
        <Box 
          sx={{ 
            width: '100%', 
            padding: '2px 4px',
            fontSize: '14px',
            color: showPlaceholder ? 'text.disabled' : 'text.primary',
            fontStyle: showPlaceholder ? 'italic' : 'normal',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {showPlaceholder ? 'Double click to edit' : cellContent}
        </Box>
      )}
    </Box>
  );
};

export default function SpreadsheetApp({ projectId, viewName }) {
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [isEditingColumn, setIsEditingColumn] = useState(false);
  const [editColumnIndex, setEditColumnIndex] = useState(-1);

  // Initialize default state structure
  const defaultValue = useMemo(() => ({
    columns: ['A', 'B', 'C'],
    rows: Array(10).fill(null).map(() => ({ A: '', B: '', C: '' }))
  }), []);

  return (
    <MicroAppWrapper
      projectId={projectId}
      viewName={viewName}
      appKey="Spreadsheet"
      defaultValue={defaultValue}
      title="Spreadsheet"
      enableSharing={true}
      defaultShared={true}
    >
      {({ state, setState, isShared }) => {
        const columns = state?.columns || defaultValue.columns;
        const rows = state?.rows || defaultValue.rows;

        // Update the selected cell if it's out of bounds after data changes
        useEffect(() => {
          if (rows.length > 0 && selectedCell.row >= rows.length) {
            setSelectedCell(prev => ({ ...prev, row: rows.length - 1 }));
          }
          if (columns.length > 0 && selectedCell.col >= columns.length) {
            setSelectedCell(prev => ({ ...prev, col: columns.length - 1 }));
          }
        }, [rows.length, columns.length]);

        // Add a new column
        const addColumn = () => {
          setNewColumnName('');
          setIsEditingColumn(false);
          setShowColumnDialog(true);
        };

        // Handle save column (add or edit)
        const handleSaveColumn = () => {
          if (!newColumnName.trim()) return;

          if (isEditingColumn && editColumnIndex >= 0) {
            // Edit existing column
            const oldColumnName = columns[editColumnIndex];
            const updatedColumns = [...columns];
            updatedColumns[editColumnIndex] = newColumnName;

            const updatedRows = rows.map(row => {
              const newRow = { ...row };
              if (oldColumnName in newRow) {
                newRow[newColumnName] = newRow[oldColumnName];
                delete newRow[oldColumnName];
              }
              return newRow;
            });

            setState({
              ...state,
              columns: updatedColumns,
              rows: updatedRows,
              lastUpdated: new Date().toISOString()
            });
          } else {
            // Add new column
            const columnExists = columns.some(col => col === newColumnName);
            if (!columnExists) {
              setState({
                ...state,
                columns: [...columns, newColumnName],
                lastUpdated: new Date().toISOString()
              });
            }
          }
          
          setShowColumnDialog(false);
        };

        // Edit column
        const editColumn = (columnIndex) => {
          setEditColumnIndex(columnIndex);
          setNewColumnName(columns[columnIndex]);
          setIsEditingColumn(true);
          setShowColumnDialog(true);
        };

        // Delete column
        const deleteColumn = (columnIndex) => {
          if (columns.length <= 1) return; // Prevent deleting the last column
          
          const columnToDelete = columns[columnIndex];
          const updatedColumns = columns.filter((_, index) => index !== columnIndex);
          
          const updatedRows = rows.map(row => {
            const newRow = { ...row };
            delete newRow[columnToDelete];
            return newRow;
          });

          setState({
            ...state,
            columns: updatedColumns,
            rows: updatedRows,
            lastUpdated: new Date().toISOString()
          });
        };

        // Add a new row
        const addRow = () => {
          const newRow = {};
          columns.forEach(col => {
            newRow[col] = '';
          });
          
          setState({
            ...state,
            rows: [...rows, newRow],
            lastUpdated: new Date().toISOString()
          });
        };

        // Update cell value
        const updateCell = (rowIndex, column, value) => {
          const updatedRows = [...rows];
          if (!updatedRows[rowIndex]) {
            updatedRows[rowIndex] = {};
          }
          updatedRows[rowIndex] = {
            ...updatedRows[rowIndex],
            [column]: value
          };
          
          setState({
            ...state,
            rows: updatedRows,
            lastUpdated: new Date().toISOString()
          });
        };

        // Handle cell navigation
        const handleCellKeyDown = (e, direction) => {
          let newRow = selectedCell.row;
          let newCol = selectedCell.col;

          switch (direction) {
            case 'enter':
            case 'down':
              newRow = Math.min(selectedCell.row + 1, rows.length - 1);
              break;
            case 'up':
              newRow = Math.max(selectedCell.row - 1, 0);
              break;
            case 'tab':
            case 'right':
              newCol = Math.min(selectedCell.col + 1, columns.length - 1);
              break;
            case 'left':
              newCol = Math.max(selectedCell.col - 1, 0);
              break;
          }

          setSelectedCell({ row: newRow, col: newCol });
        };

        // Handle save
        const handleSave = () => {
          setState({
            ...state,
            lastSaved: new Date().toISOString()
          }, { force: true, immediate: true });
        };

        return (
          <Box sx={{ p: 2 }}>
            {/* Toolbar */}
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />}
                onClick={addColumn}
                size="small"
                sx={{ borderRadius: 2 }}
              >
                Add Column
              </Button>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={addRow}
                size="small"
                sx={{ borderRadius: 2 }}
              >
                Add Row
              </Button>
              <Button 
                variant="contained" 
                color="success" 
                startIcon={<SaveIcon />}
                onClick={handleSave}
                size="small"
                sx={{ borderRadius: 2 }}
              >
                Save
              </Button>
            </Stack>
            
            {/* Spreadsheet */}
            <Box sx={{ 
              flex: 1, 
              overflow: 'auto', 
              border: '1px solid', 
              borderColor: 'divider', 
              borderRadius: 1,
              '&:focus': {
                outline: '2px solid',
                outlineColor: 'primary.main',
              }
            }}>
              <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 40, fontWeight: 'bold', backgroundColor: 'action.hover' }}>#</TableCell>
                      {columns.map((column, index) => (
                        <TableCell 
                          key={index} 
                          align="center" 
                          sx={{ 
                            fontWeight: 'bold',
                            backgroundColor: 'action.hover',
                            position: 'relative',
                            minWidth: 120
                          }}
                        >
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="body2" fontWeight="bold">
                              {column}
                            </Typography>
                            <Stack direction="row" spacing={0.5}>
                              <IconButton size="small" onClick={() => editColumn(index)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                onClick={() => deleteColumn(index)}
                                disabled={columns.length <= 1}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Stack>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, rowIndex) => (
                      <TableRow key={rowIndex} hover>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>
                          {rowIndex + 1}
                        </TableCell>
                        {columns.map((column, colIndex) => (
                          <TableCell 
                            key={`${rowIndex}-${colIndex}`}
                            align="left"
                            sx={{ 
                              padding: 0,
                              borderRight: selectedCell.row === rowIndex && selectedCell.col === colIndex 
                                ? '2px solid' : '1px solid',
                              borderRightColor: selectedCell.row === rowIndex && selectedCell.col === colIndex 
                                ? 'primary.main' : 'divider',
                              borderLeft: selectedCell.row === rowIndex && selectedCell.col === colIndex 
                                ? '2px solid' : 'none',
                              borderLeftColor: 'primary.main',
                              borderTop: selectedCell.row === rowIndex && selectedCell.col === colIndex 
                                ? '2px solid' : 'none',
                              borderTopColor: 'primary.main',
                              borderBottom: selectedCell.row === rowIndex && selectedCell.col === colIndex 
                                ? '2px solid' : 'none',
                              borderBottomColor: 'primary.main',
                              backgroundColor: selectedCell.row === rowIndex && selectedCell.col === colIndex 
                                ? 'action.selected' : 'transparent'
                            }}
                          >
                            <EditableCell
                              value={row[column] || ''}
                              onChange={(value) => updateCell(rowIndex, column, value)}
                              onBlur={() => {}}
                              isSelected={selectedCell.row === rowIndex && selectedCell.col === colIndex}
                              onSelect={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                              onKeyDown={handleCellKeyDown}
                              rowIndex={rowIndex}
                              columnName={column}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Column Dialog */}
            <Dialog open={showColumnDialog} onClose={() => setShowColumnDialog(false)}>
              <DialogTitle>
                {isEditingColumn ? 'Edit Column Name' : 'Add New Column'}
              </DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Column Name"
                  fullWidth
                  variant="outlined"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveColumn()}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowColumnDialog(false)}>Cancel</Button>
                <Button onClick={handleSaveColumn} variant="contained">
                  {isEditingColumn ? 'Save' : 'Add'}
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        );
      }}
    </MicroAppWrapper>
  );
}
