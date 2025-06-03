// colorPalettes.js
// Utility functions for working with dicopal color palettes

import { getPalettes, getColors, getPaletteNames } from 'dicopal';

// Convert hex color to RGBA array (for DeckGL)
function hexToRgba(hex, alpha = 255) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
    alpha
  ] : [0, 0, 0, alpha];
}

// Convert RGBA array to hex color
function rgbaToHex(rgba) {
  const [r, g, b] = rgba;
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Get a list of suitable palettes for phylogenetic visualization
export function getQualitativePalettes(minColors = 3, maxColors = 12) {
  return getPalettes({
    type: 'qualitative',
  }).filter(palette => 
    palette.number >= minColors && palette.number <= maxColors
  ).sort((a, b) => {
    // Sort by provider, then by name, then by number of colors
    if (a.provider !== b.provider) {
      return a.provider.localeCompare(b.provider);
    }
    if (a.name !== b.name) {
      return a.name.localeCompare(b.name);
    }
    return a.number - b.number;
  });
}

// Get a list of sequential palettes (good for continuous data)
export function getSequentialPalettes(minColors = 3, maxColors = 12) {
  return getPalettes({
    type: 'sequential',
  }).filter(palette => 
    palette.number >= minColors && palette.number <= maxColors
  ).sort((a, b) => {
    if (a.provider !== b.provider) {
      return a.provider.localeCompare(b.provider);
    }
    if (a.name !== b.name) {
      return a.name.localeCompare(b.name);
    }
    return a.number - b.number;
  });
}

// Get a list of diverging palettes (good for comparative data)
export function getDivergingPalettes(minColors = 3, maxColors = 12) {
  return getPalettes({
    type: 'diverging',
  }).filter(palette => 
    palette.number >= minColors && palette.number <= maxColors
  ).sort((a, b) => {
    if (a.provider !== b.provider) {
      return a.provider.localeCompare(b.provider);
    }
    if (a.name !== b.name) {
      return a.name.localeCompare(b.name);
    }
    return a.number - b.number;
  });
}

// Get colors from a palette and convert to RGBA format
export function getPaletteColors(paletteName, numColors, reverse = false) {
  try {
    const hexColors = getColors(paletteName, numColors, reverse);
    return hexColors.map(hex => hexToRgba(hex));
  } catch (error) {
    console.warn(`Failed to get palette ${paletteName} with ${numColors} colors:`, error);
    // Fallback to a simple color sequence
    return generateFallbackColors(numColors);
  }
}

// Generate fallback colors when palette is not available
function generateFallbackColors(numColors) {
  const colors = [];
  for (let i = 0; i < numColors; i++) {
    const hue = (i * 360) / numColors;
    const [r, g, b] = hslToRgb(hue / 360, 0.7, 0.5);
    colors.push([r, g, b, 255]);
  }
  return colors;
}

// Convert HSL to RGB
function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Get unique palette names for dropdowns
export function getUniquePaletteNames(type = null) {
  let palettes;
  if (type) {
    palettes = getPalettes({ type });
  } else {
    palettes = getPalettes();
  }
  
  const uniqueNames = [...new Set(palettes.map(p => p.name))];
  return uniqueNames.sort();
}

// Get available colors counts for a specific palette name
export function getPaletteColorCounts(paletteName) {
  const palettes = getPalettes({ name: paletteName });
  return [...new Set(palettes.map(p => p.number))].sort((a, b) => a - b);
}

// Predefined palette recommendations for phylogenetic visualization
export const RECOMMENDED_PALETTES = {
  qualitative: [
    { name: 'Set1', provider: 'colorbrewer', description: 'Classic qualitative palette, great for species/clusters' },
    { name: 'Set2', provider: 'colorbrewer', description: 'Softer qualitative palette' },
    { name: 'Set3', provider: 'colorbrewer', description: 'Pastel qualitative palette' },
    { name: 'Pastel', provider: 'cartocolors', description: 'Modern pastel colors' },
    { name: 'Vivid', provider: 'cartocolors', description: 'Bright, vivid colors' },
    { name: 'Safe', provider: 'cartocolors', description: 'Colorblind-safe palette' }
  ],
  sequential: [
    { name: 'Blues', provider: 'colorbrewer', description: 'Blue sequential palette' },
    { name: 'Viridis', provider: 'matplotlib', description: 'Perceptually uniform' },
    { name: 'Plasma', provider: 'matplotlib', description: 'Purple to yellow' },
    { name: 'OrRd', provider: 'colorbrewer', description: 'Orange to red' }
  ],
  diverging: [
    { name: 'RdYlBu', provider: 'colorbrewer', description: 'Red-Yellow-Blue diverging' },
    { name: 'RdBu', provider: 'colorbrewer', description: 'Red-Blue diverging' },
    { name: 'PiYG', provider: 'colorbrewer', description: 'Pink-Yellow-Green diverging' }
  ]
};

export { hexToRgba, rgbaToHex };
