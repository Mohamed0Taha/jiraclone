import React from 'react';
import { Box, Typography, Button } from '@mui/material';

export default function TestComponent({ onBack }) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Test Component Working
      </Typography>
      <Button variant="contained" onClick={onBack}>
        Go Back
      </Button>
    </Box>
  );
}
