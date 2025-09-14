// resources/js/Components/ThemeLanguageSwitcher.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    IconButton,
    Menu,
    MenuItem,
    Tooltip,
    Divider,
    ListItemIcon,
    ListItemText,
    Switch,
    FormControlLabel,
    Typography,
    Stack,
} from '@mui/material';
import {
    LightMode,
    DarkMode,
    Language,
    Settings,
    Check,
} from '@mui/icons-material';
import { useThemeMode } from '../contexts/ThemeContext';

const languages = [
    { code: 'en', name: 'language.english', flag: '🇺🇸' },
    { code: 'es', name: 'language.spanish', flag: '🇪🇸' },
    { code: 'de', name: 'language.german', flag: '🇩🇪' },
    { code: 'fi', name: 'language.finnish', flag: '🇫🇮' },
    { code: 'sv', name: 'language.swedish', flag: '🇸🇪' },
    { code: 'nl', name: 'language.dutch', flag: '🇳🇱' },
    { code: 'fr', name: 'language.french', flag: '🇫🇷' },
];

export default function ThemeLanguageSwitcher() {
    const { t, i18n } = useTranslation();
    const { mode, toggleMode } = useThemeMode();
    const [anchorEl, setAnchorEl] = useState(null);
    const [languageAnchorEl, setLanguageAnchorEl] = useState(null);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLanguageClick = (event) => {
        setLanguageAnchorEl(event.currentTarget);
        setAnchorEl(null);
    };

    const handleLanguageClose = () => {
        setLanguageAnchorEl(null);
    };

    const handleLanguageChange = (languageCode) => {
        i18n.changeLanguage(languageCode);
        handleLanguageClose();
    };

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

    return (
        <Box>
            <Tooltip title={t('common.settings')}>
                <IconButton
                    onClick={handleClick}
                    size="small"
                    aria-label={t('accessibility.expandMenu')}
                    aria-expanded={Boolean(anchorEl)}
                    aria-haspopup="menu"
                    sx={{
                        color: 'inherit',
                        '&:focus-visible': {
                            outline: 2,
                            outlineOffset: 2,
                            outlineColor: 'primary.main',
                        },
                    }}
                >
                    <Settings />
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        minWidth: 220,
                        '& .MuiMenuItem-root': {
                            borderRadius: 1,
                            mx: 1,
                            my: 0.5,
                        },
                    },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <MenuItem disableRipple>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">
                        <Stack direction="row" alignItems="center" gap={1}>
                            {mode === 'light' ? <LightMode /> : <DarkMode />}
                            <Typography variant="body2">
                                {t('theme.toggle')}
                            </Typography>
                        </Stack>
                        <Switch
                            checked={mode === 'dark'}
                            onChange={toggleMode}
                            size="small"
                            inputProps={{ 'aria-label': t('theme.toggle') }}
                        />
                    </Stack>
                </MenuItem>

                <Divider sx={{ my: 1 }} />

                <MenuItem onClick={handleLanguageClick}>
                    <ListItemIcon>
                        <Language />
                    </ListItemIcon>
                    <ListItemText>
                        <Stack direction="row" alignItems="center" gap={1}>
                            <Typography variant="body2">
                                {t('language.select')}
                            </Typography>
                            <Box component="span" fontSize="1.2rem">
                                {currentLanguage.flag}
                            </Box>
                        </Stack>
                    </ListItemText>
                </MenuItem>
            </Menu>

            <Menu
                anchorEl={languageAnchorEl}
                open={Boolean(languageAnchorEl)}
                onClose={handleLanguageClose}
                PaperProps={{
                    sx: {
                        minWidth: 200,
                        '& .MuiMenuItem-root': {
                            borderRadius: 1,
                            mx: 1,
                            my: 0.5,
                        },
                    },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
            >
                {languages.map((language) => (
                    <MenuItem
                        key={language.code}
                        onClick={() => handleLanguageChange(language.code)}
                        selected={i18n.language === language.code}
                    >
                        <ListItemIcon>
                            {i18n.language === language.code && <Check />}
                        </ListItemIcon>
                        <ListItemText>
                            <Stack direction="row" alignItems="center" gap={1}>
                                <Box component="span" fontSize="1.2rem">
                                    {language.flag}
                                </Box>
                                <Typography variant="body2">
                                    {t(language.name)}
                                </Typography>
                            </Stack>
                        </ListItemText>
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    );
}