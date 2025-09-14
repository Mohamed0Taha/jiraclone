// Step 2: Scope & Team Form
// resources/js/Pages/Projects/CreateStepScope.jsx

import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    TextField,
    Typography,
    InputAdornment,
    Stack,
    Slider,
    FormControl,
    Select,
    MenuItem,
    FormHelperText,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import GroupsIcon from '@mui/icons-material/Groups';
import CategoryIcon from '@mui/icons-material/Category';

const CreateStepScope = memo(
    ({ data, setData, setMeta, errors, localErrors, projectTypes = [], domains = [] }) => {
        const { t } = useTranslation();
        const eFor = (field) => errors[field] || localErrors[field] || '';

        const today = new Date().toISOString().split('T')[0];

        return (
            <Stack spacing={3}>
                <Box>
                    <Typography variant="h6" fontWeight={600} mb={2}>
                        {t('projectScope.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                        {t('projectScope.description')}
                    </Typography>
                </Box>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                        fullWidth
                        type="date"
                        label={t('projectScope.startDate')}
                        value={data.start_date}
                        onChange={(e) => setData('start_date', e.target.value)}
                        error={!!eFor('start_date')}
                        helperText={eFor('start_date')}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <EventIcon />
                                </InputAdornment>
                            ),
                        }}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: today }}
                    />

                    <TextField
                        fullWidth
                        type="date"
                        label={t('projectScope.endDate')}
                        value={data.end_date}
                        onChange={(e) => setData('end_date', e.target.value)}
                        error={!!eFor('end_date')}
                        helperText={eFor('end_date')}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <EventIcon />
                                </InputAdornment>
                            ),
                        }}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: data.start_date || today }}
                    />
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <FormControl fullWidth>
                        <Select
                            value={data.meta.project_type}
                            onChange={(e) => setMeta('project_type', e.target.value)}
                            displayEmpty
                            startAdornment={
                                <InputAdornment position="start">
                                    <CategoryIcon />
                                </InputAdornment>
                            }
                        >
                            <MenuItem value="">
                                <em>{t('projectScope.selectProjectType')}</em>
                            </MenuItem>
                            {projectTypes.map((type) => (
                                <MenuItem key={type.value || type} value={type.value || type}>
                                    {type.label || type}
                                </MenuItem>
                            ))}
                        </Select>
                        <FormHelperText>
                            {t('projectScope.projectTypeHelper')}
                        </FormHelperText>
                    </FormControl>

                    <FormControl fullWidth>
                        <Select
                            value={data.meta.domain}
                            onChange={(e) => setMeta('domain', e.target.value)}
                            displayEmpty
                            startAdornment={
                                <InputAdornment position="start">
                                    <CategoryIcon />
                                </InputAdornment>
                            }
                        >
                            <MenuItem value="">
                                <em>{t('projectScope.selectDomain')}</em>
                            </MenuItem>
                            {domains.map((domain) => (
                                <MenuItem
                                    key={domain.value || domain}
                                    value={domain.value || domain}
                                >
                                    {domain.label || domain}
                                </MenuItem>
                            ))}
                        </Select>
                        <FormHelperText>
                            {t('projectScope.domainHelper')}
                        </FormHelperText>
                    </FormControl>
                </Stack>

                <TextField
                    fullWidth
                    label={t('projectScope.areaLocationLabel')}
                    placeholder={t('projectScope.areaLocationPlaceholder')}
                    value={data.meta.area}
                    onChange={(e) => setMeta('area', e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <PlaceIcon />
                            </InputAdornment>
                        ),
                    }}
                    helperText={t('projectScope.areaLocationHelper')}
                />

                <Box>
                    <Typography gutterBottom>
                        <GroupsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        {data.meta.team_size === 1
                            ? t('projectScope.teamSizeLabel', { count: data.meta.team_size })
                            : t('projectScope.teamSizeLabel_plural', { count: data.meta.team_size })}
                    </Typography>
                    <Slider
                        value={data.meta.team_size}
                        onChange={(_, value) => setMeta('team_size', value)}
                        min={1}
                        max={50}
                        step={1}
                        marks={[
                            { value: 1, label: '1' },
                            { value: 10, label: '10' },
                            { value: 25, label: '25' },
                            { value: 50, label: '50+' },
                        ]}
                        valueLabelDisplay="auto"
                    />
                </Box>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                        fullWidth
                        label={t('projectScope.budgetLabel')}
                        placeholder={t('projectScope.budgetPlaceholder')}
                        value={data.meta.budget}
                        onChange={(e) => setMeta('budget', e.target.value)}
                        helperText={t('projectScope.budgetHelper')}
                    />

                    <TextField
                        fullWidth
                        label={t('projectScope.primaryStakeholderLabel')}
                        placeholder={t('projectScope.primaryStakeholderPlaceholder')}
                        value={data.meta.primary_stakeholder}
                        onChange={(e) => setMeta('primary_stakeholder', e.target.value)}
                        helperText={t('projectScope.primaryStakeholderHelper')}
                    />
                </Stack>
            </Stack>
        );
    }
);

CreateStepScope.displayName = 'CreateStepScope';

export default CreateStepScope;
