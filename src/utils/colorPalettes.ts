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

// Custom palettes defined in the application
export const CUSTOM_PALETTES: Record<string, string[]> = {
  // RPRlab palette - reordered to maximize visual difference between consecutive colors
  RPRlab: [
    "#F17C75", // 1 - coral/rojo
    "#55B5A6", // 2 - verde azulado
    "#7AB8E6", // 3 - azul medio
    "#EBC85E", // 4 - amarillo dorado
    "#9F8EC2", // 5 - púrpura
    "#B4CFA5", // 6 - verde salvia
    "#F6B272", // 7 - naranja
    "#A8D5EF", // 8 - azul cielo
    "#D2BDE0", // 9 - lavanda
    "#E3ECA4", // 10 - verde lima
    "#EA9AB0", // 11 - rosa suave
    "#9CDED6", // 12 - turquesa
    "#DDB894", // 13 - beige/arena
    "#FADAE0", // 14 - rosa pálido
    "#C09590"  // 15 - rosa marrón
  ]
};

// Check if a palette name is a custom palette
export function isCustomPalette(paletteName: string): boolean {
  return paletteName in CUSTOM_PALETTES;
}

// Get custom palettes formatted like dicopal palettes
function getCustomPalettesFormatted(type = 'qualitative') {
  return Object.entries(CUSTOM_PALETTES).map(([name, colors]) => ({
    name,
    number: colors.length,
    type,
    provider: 'custom',
    colors
  }));
}

// Get a list of suitable palettes for phylogenetic visualization
export function getQualitativePalettes(minColors = 3, maxColors = 20) {
  const dicopalPalettes = getPalettes({
    type: 'qualitative',
  }).filter(palette => 
    palette.number >= minColors && palette.number <= maxColors
  );
  
  // Add custom palettes at the beginning
  const customPalettes = getCustomPalettesFormatted('qualitative').filter(p => 
    p.number >= minColors && p.number <= maxColors
  );
  
  const allPalettes = [...customPalettes, ...dicopalPalettes];
  
  return allPalettes.sort((a, b) => {
    // Custom palettes first
    if (a.provider === 'custom' && b.provider !== 'custom') return -1;
    if (a.provider !== 'custom' && b.provider === 'custom') return 1;
    // Then sort by provider, then by name, then by number of colors
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

// Get colors from a custom palette
export function getCustomPaletteColors(paletteName: string, numColors: number, reverse = false): number[][] {
  const palette = CUSTOM_PALETTES[paletteName];
  if (!palette) {
    console.warn(`Custom palette ${paletteName} not found`);
    // Generate fallback colors using hue rotation
    const colors: number[][] = [];
    for (let i = 0; i < numColors; i++) {
      const hue = (i * 360) / numColors;
      const [r, g, b] = hslToRgb(hue / 360, 0.7, 0.5);
      colors.push([r, g, b, 255]);
    }
    return colors;
  }

  let colors = [...palette];
  if (reverse) {
    colors = colors.reverse();
  }

  // If we need fewer colors, slice
  if (numColors <= colors.length) {
    return colors.slice(0, numColors).map(hex => hexToRgba(hex));
  }

  // If we need more colors, cycle through the palette
  const result: number[][] = [];
  for (let i = 0; i < numColors; i++) {
    result.push(hexToRgba(colors[i % colors.length]));
  }
  return result;
}

// Get colors from a palette and convert to RGBA format
// For qualitative palettes, cycles colors when more are needed
// For sequential/diverging palettes, interpolates colors
export function getPaletteColors(paletteName, numColors, reverse = false, paletteType = 'qualitative') {
  try {
    // First check if it's a custom palette
    if (isCustomPalette(paletteName)) {
      return getCustomPaletteColors(paletteName, numColors, reverse);
    }
    
    // Then check if the palette exists in dicopal and get its maximum supported colors
    const palettes = getPalettes({ name: paletteName });
    if (!palettes || palettes.length === 0) {
      console.warn(`Palette ${paletteName} not found, using fallback`);
      return paletteType === 'qualitative' 
        ? getCycledColors(paletteName, numColors, reverse)
        : getSequentialColors(paletteName, numColors, reverse);
    }

    // Find the maximum number of colors this palette supports
    const maxSupportedColors = Math.max(...palettes.map(p => p.number));
    
    // If requesting more colors than the palette supports
    if (numColors > maxSupportedColors) {
      // For qualitative palettes, cycle through available colors
      // For sequential/diverging palettes, interpolate
      if (paletteType === 'qualitative') {
        console.info(`Palette ${paletteName} supports max ${maxSupportedColors} colors, but ${numColors} requested. Cycling colors.`);
        return getCycledColors(paletteName, numColors, reverse);
      } else {
        console.info(`Palette ${paletteName} supports max ${maxSupportedColors} colors, but ${numColors} requested. Using interpolated colors.`);
        return getSequentialColors(paletteName, numColors, reverse);
      }
    }

    // Try to get colors normally for supported numbers
    const hexColors = getColors(paletteName, numColors, reverse);
    if (!hexColors || !Array.isArray(hexColors) || hexColors.length === 0) {
      console.warn(`Failed to get palette ${paletteName} with ${numColors} colors: palette not found or invalid`);
      return paletteType === 'qualitative'
        ? getCycledColors(paletteName, numColors, reverse)
        : getSequentialColors(paletteName, numColors, reverse);
    }
    
    // Additional safety check for individual hex values
    const validHexColors = hexColors.filter(hex => hex != null && typeof hex === 'string');
    if (validHexColors.length === 0) {
      console.warn(`All colors in palette ${paletteName} are invalid`);
      return paletteType === 'qualitative'
        ? getCycledColors(paletteName, numColors, reverse)
        : getSequentialColors(paletteName, numColors, reverse);
    }
    
    return validHexColors.map(hex => hexToRgba(hex));
  } catch (error) {
    console.warn(`Failed to get palette ${paletteName} with ${numColors} colors:`, error);
    return paletteType === 'qualitative'
      ? getCycledColors(paletteName, numColors, reverse)
      : getSequentialColors(paletteName, numColors, reverse);
  }
}

// Get colors by cycling through the palette (for qualitative palettes)
export function getCycledColors(paletteName, numColors, reverse = false) {
  try {
    // First try to get the maximum number of colors this palette supports
    const palettes = getPalettes({ name: paletteName });
    if (!palettes || palettes.length === 0) {
      return generateFallbackColors(numColors);
    }

    // Find the palette with the highest number of colors
    const maxColorsPalette = palettes.reduce((max, current) => 
      current.number > max.number ? current : max
    );
    
    // Get the base colors from the palette
    let baseColors = getColors(paletteName, maxColorsPalette.number, false);
    if (!baseColors || baseColors.length === 0) {
      return generateFallbackColors(numColors);
    }

    if (reverse) {
      baseColors = [...baseColors].reverse();
    }

    // Convert hex colors to RGB
    const baseRgbColors = baseColors.map(hex => hexToRgba(hex));

    // If we need fewer or equal colors than available, just slice
    if (numColors <= baseRgbColors.length) {
      return baseRgbColors.slice(0, numColors);
    }

    // If we need more colors, CYCLE through the base colors (don't interpolate)
    const cycledColors = [];
    for (let i = 0; i < numColors; i++) {
      cycledColors.push([...baseRgbColors[i % baseRgbColors.length]]);
    }
    
    return cycledColors;
  } catch (error) {
    console.warn(`Failed to get cycled colors for palette ${paletteName}:`, error);
    return generateFallbackColors(numColors);
  }
}

// Generate sequential colors by interpolating between palette colors
export function getSequentialColors(paletteName, numColors, reverse = false) {
  try {
    // Performance optimization: cap extremely large color requests
    if (numColors > 500) {
      console.warn(`🚨 PERFORMANCE: Capping color generation from ${numColors} to 500 colors to prevent main thread blocking`);
      numColors = 500;
    }
    
    const startTime = performance.now();
    
    // First try to get the maximum number of colors this palette supports
    const palettes = getPalettes({ name: paletteName });
    if (!palettes || palettes.length === 0) {
      return generateFallbackColors(numColors);
    }

    // Find the palette with the highest number of colors
    const maxColorsPalette = palettes.reduce((max, current) => 
      current.number > max.number ? current : max
    );
    
    // Get the base colors from the palette
    const baseColors = getColors(paletteName, maxColorsPalette.number, reverse);
    if (!baseColors || baseColors.length === 0) {
      return generateFallbackColors(numColors);
    }

    // Convert hex colors to RGB
    const baseRgbColors = baseColors.map(hex => hexToRgba(hex));

    // If we need fewer or equal colors than available, just slice
    if (numColors <= baseRgbColors.length) {
      return baseRgbColors.slice(0, numColors);
    }

    // If we need more colors, interpolate between the base colors
    const interpolatedColors = [];
    
    for (let i = 0; i < numColors; i++) {
      // Map the index to the range of base colors
      const position = (i / (numColors - 1)) * (baseRgbColors.length - 1);
      const lowerIndex = Math.floor(position);
      const upperIndex = Math.min(lowerIndex + 1, baseRgbColors.length - 1);
      const fraction = position - lowerIndex;

      if (lowerIndex === upperIndex) {
        // At the boundary, just use the color
        interpolatedColors.push([...baseRgbColors[lowerIndex]]);
      } else {
        // Interpolate between the two colors
        const lowerColor = baseRgbColors[lowerIndex];
        const upperColor = baseRgbColors[upperIndex];
        
        const interpolated = [
          Math.round(lowerColor[0] + (upperColor[0] - lowerColor[0]) * fraction),
          Math.round(lowerColor[1] + (upperColor[1] - lowerColor[1]) * fraction),
          Math.round(lowerColor[2] + (upperColor[2] - lowerColor[2]) * fraction),
          255
        ];
        
        interpolatedColors.push(interpolated);
      }
    }

    const endTime = performance.now();
    
    return interpolatedColors;
  } catch (error) {
    console.warn(`Failed to generate sequential colors for palette ${paletteName}:`, error);
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
  
  // Include custom palette names
  const customNames = Object.keys(CUSTOM_PALETTES);
  const dicopalNames = palettes.map(p => p.name);
  const uniqueNames = [...new Set([...customNames, ...dicopalNames])];
  
  // Sort with custom palettes first
  return uniqueNames.sort((a, b) => {
    const aIsCustom = a in CUSTOM_PALETTES;
    const bIsCustom = b in CUSTOM_PALETTES;
    if (aIsCustom && !bIsCustom) return -1;
    if (!aIsCustom && bIsCustom) return 1;
    return a.localeCompare(b);
  });
}

// Get available colors counts for a specific palette name
export function getPaletteColorCounts(paletteName) {
  // Handle custom palettes
  if (paletteName in CUSTOM_PALETTES) {
    return [CUSTOM_PALETTES[paletteName].length];
  }
  const palettes = getPalettes({ name: paletteName });
  return [...new Set(palettes.map(p => p.number))].sort((a, b) => a - b);
}


