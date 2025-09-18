// Provides style utilities as a raw string to embed in the runtime factory
export const STYLE_UTILS_SNIPPET = String.raw`
const styleUtils = {
  spacing: (size) => ({
    margin: designTokens.spacing[size] || size,
    padding: designTokens.spacing[size] || size,
  }),
  elevation: (level) => ({
    boxShadow: designTokens.shadows[level] || level,
    borderRadius: designTokens.borderRadius.lg,
  }),
  colorVariant: (color, shade = 500) => {
    const swatch = (designTokens.colors[color] || {})[shade];
    return {
      backgroundColor: swatch,
      color: shade >= 500 ? '#ffffff' : designTokens.colors.neutral[800],
    };
  },
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gradients: {
    primary: 'linear-gradient(135deg, ' + designTokens.colors.primary[400] + ' 0%, ' + designTokens.colors.primary[600] + ' 100%)',
    success: 'linear-gradient(135deg, ' + designTokens.colors.success[400] + ' 0%, ' + designTokens.colors.success[600] + ' 100%)',
    warm: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    cool: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
};
`;

