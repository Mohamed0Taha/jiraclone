// resources/js/theme/colors.js
// TaskPilot Brand Colors - Based on Landing Page Design

export const colors = {
    // Primary palette from Landing page
    primary: '#FF6B6B', // Coral red - main brand color
    secondary: '#4ECDC4', // Turquoise - secondary brand color
    accent: '#45B7D1', // Blue - accent color
    support: '#96CEB4', // Mint green - supporting color
    warm: '#FFEAA7', // Light yellow - warm accent
    purple: '#DDA0DD', // Plum - additional accent

    // Additional colors for variety
    emerald: '#98D8C8', // Additional green
    golden: '#F7DC6F', // Golden yellow

    // Gradients
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
    gradientReverse: 'linear-gradient(135deg, #45B7D1 0%, #4ECDC4 50%, #FF6B6B 100%)',
    gradientSubtle:
        'linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(78, 205, 196, 0.1) 50%, rgba(69, 183, 209, 0.1) 100%)',

    // Background variants
    bgWhite: 'white',
    bgGradient: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
    bgSubtle: 'linear-gradient(135deg, #F8F9FF 0%, #F0F9FF 50%, #FFF8F0 100%)',
};

// Utility function to create alpha variants
export const alpha = (color, opacity) => {
    // Simple implementation - in production, you might want a more robust color utility
    return `${color}${Math.round(opacity * 255)
        .toString(16)
        .padStart(2, '0')}`;
};

export default colors;
