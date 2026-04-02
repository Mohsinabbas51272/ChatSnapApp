/**
 * Determines if a HEX color is light or dark.
 * Used for choosing high-contrast text/icon colors.
 */
export const isLightColor = (hex: string): boolean => {
  if (!hex) return true;
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  // Perceptive luminance formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155; // 155 is a balanced threshold for light colors
};

/**
 * Returns a high-contrast text color based on the background color.
 */
export const getContrastText = (backgroundColor: string): string => {
  return isLightColor(backgroundColor) ? '#1a1c1e' : '#FFFFFF';
};
