// resources/js/theme/colors.js
// TaskPilot Brand Colors - Improved for accessibility and readability

export const colors = {
    // Primary palette - improved for better contrast and readability
    primary: '#E53E3E', // Deeper red - better contrast than #FF6B6B
    secondary: '#319795', // Deeper teal - better contrast than #4ECDC4
    accent: '#3182CE', // Professional blue - better contrast than #45B7D1
    support: '#38A169', // Forest green - better contrast than #96CEB4
    warm: '#DD6B20', // Warm orange - better contrast than #FFEAA7
    purple: '#805AD5', // Professional purple - better contrast than #DDA0DD

    // Additional colors with improved contrast
    emerald: '#2F855A', // Darker emerald for better readability
    golden: '#D69E2E', // Darker golden for better contrast

    // Gradients with improved colors
    gradient: 'linear-gradient(135deg, #E53E3E 0%, #319795 50%, #3182CE 100%)',
    gradientReverse: 'linear-gradient(135deg, #3182CE 0%, #319795 50%, #E53E3E 100%)',
    gradientSubtle:
        'linear-gradient(135deg, rgba(229, 62, 62, 0.08) 0%, rgba(49, 151, 149, 0.08) 50%, rgba(49, 130, 206, 0.08) 100%)',

    // Background variants with better contrast
    bgWhite: '#FFFFFF',
    bgGradient: 'linear-gradient(135deg, #E53E3E 0%, #319795 50%, #3182CE 100%)',
    bgSubtle: 'linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 50%, #E2E8F0 100%)',
    
    // Text colors for better readability
    textPrimary: '#1A202C', // Dark gray for primary text
    textSecondary: '#4A5568', // Medium gray for secondary text
    textLight: '#718096', // Light gray for tertiary text
    
    // Background colors for light theme
    backgroundPrimary: '#FFFFFF',
    backgroundSecondary: '#F7FAFC',
    backgroundTertiary: '#EDF2F7',
    
    // Background colors for dark theme
    backgroundDarkPrimary: '#1A202C',
    backgroundDarkSecondary: '#2D3748',
    backgroundDarkTertiary: '#4A5568',
    
    // Border colors
    borderLight: '#E2E8F0',
    borderMedium: '#CBD5E0',
    borderDark: '#A0AEC0',
    
    // Status colors with better accessibility
    success: '#38A169', // Green
    warning: '#D69E2E', // Orange  
    error: '#E53E3E', // Red
    info: '#3182CE', // Blue
};

// Utility function to create alpha variants
export const alpha = (color, opacity) => {
    // Simple implementation - in production, you might want a more robust color utility
    return `${color}${Math.round(opacity * 255)
        .toString(16)
        .padStart(2, '0')}`;
};

export default colors;
