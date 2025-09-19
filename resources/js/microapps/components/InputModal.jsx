import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Stack,
} from '@mui/material';

export default function InputModal({ open, onClose, title, fields, onSubmit }) {
    const [values, setValues] = useState({});

    useEffect(() => {
        if (open) {
            // Initialize values with default values
            const initialValues = {};
            fields.forEach(field => {
                initialValues[field.name] = field.defaultValue || '';
            });
            setValues(initialValues);
        }
    }, [open, fields]);

    const handleChange = (name, value) => {
        setValues(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        // Check if all required fields have values
        const allFieldsValid = fields.every(field => 
            !field.required || (values[field.name] && values[field.name].trim())
        );
        
        if (allFieldsValid) {
            onSubmit(values);
            onClose();
        }
    };

    const handleCancel = () => {
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleCancel}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {fields.map((field) => (
                        <TextField
                            key={field.name}
                            label={field.label}
                            value={values[field.name] || ''}
                            onChange={(e) => handleChange(field.name, e.target.value)}
                            fullWidth
                            required={field.required}
                            type={field.type || 'text'}
                            autoFocus={fields[0].name === field.name}
                            placeholder={field.placeholder}
                            InputLabelProps={{
                                shrink: true,
                            }}
                        />
                    ))}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel}>Cancel</Button>
                <Button 
                    onClick={handleSubmit} 
                    variant="contained"
                    disabled={!fields.every(field => 
                        !field.required || (values[field.name] && values[field.name].trim())
                    )}
                >
                    Add
                </Button>
            </DialogActions>
        </Dialog>
    );
}
