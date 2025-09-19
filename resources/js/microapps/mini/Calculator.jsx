import React, { useState } from 'react';
import { Box, Typography, Stack, Paper, TextField, Button } from '@mui/material';
import useLocalViewData from '../useLocalViewData';

export default function Calculator({ projectId, viewName }) {
  const [state, setState] = useLocalViewData({ projectId, viewName, appKey: 'Calculator', defaultValue: { expr: '', result: '' } });
  const { expr = '', result = '' } = state || {};
  const [draft, setDraft] = useState(expr);

  const evaluate = () => {
    try {
      // very basic safe eval: numbers and operators only
      const safe = String(draft).replace(/[^-+/*().%0-9\s]/g, '');
      // eslint-disable-next-line no-new-func
      const val = Function(`return (${safe})`)();
      setState({ expr: draft, result: String(val) });
    } catch (e) {
      setState({ expr: draft, result: 'Error' });
    }
  };

  const clear = () => { setDraft(''); setState({ expr: '', result: '' }); };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Calculator</Typography>
      <Paper variant="outlined" sx={{ p: 2, maxWidth: 480 }}>
        <Stack spacing={1.5}>
          <TextField
            label="Expression"
            placeholder="e.g., (2 + 3) * 5"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={evaluate}>Evaluate</Button>
            <Button variant="outlined" onClick={clear}>Clear</Button>
          </Stack>
          <TextField label="Result" value={result} InputProps={{ readOnly: true }} />
        </Stack>
      </Paper>
    </Box>
  );
}
