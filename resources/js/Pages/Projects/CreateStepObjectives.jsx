// Step 3: Objectives Form
// resources/js/Pages/Projects/CreateStepObjectives.jsx

import React, { memo } from "react";
import {
  Box,
  TextField,
  Typography,
  InputAdornment,
  Stack,
} from "@mui/material";
import InsightsIcon from "@mui/icons-material/Insights";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

const CreateStepObjectives = memo(({ 
  data, 
  setMeta 
}) => {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" fontWeight={600} mb={2}>
          Objectives & Constraints
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Define what success looks like and any limitations to consider.
        </Typography>
      </Box>

      <TextField
        fullWidth
        multiline
        rows={4}
        label="Primary Objectives"
        placeholder="What are the main goals and success criteria for this project?"
        value={data.meta.objectives}
        onChange={(e) => setMeta("objectives", e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1 }}>
              <InsightsIcon />
            </InputAdornment>
          ),
        }}
        helperText="List the key outcomes and measurable goals"
      />

      <TextField
        fullWidth
        multiline
        rows={3}
        label="Constraints & Risks"
        placeholder="Any limitations, dependencies, or potential risks to be aware of?"
        value={data.meta.constraints}
        onChange={(e) => setMeta("constraints", e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1 }}>
              <WarningAmberIcon />
            </InputAdornment>
          ),
        }}
        helperText="Technical, budget, timeline, or resource constraints"
      />
    </Stack>
  );
});

CreateStepObjectives.displayName = "CreateStepObjectives";

export default CreateStepObjectives;
