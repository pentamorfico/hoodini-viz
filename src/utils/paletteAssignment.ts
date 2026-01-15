// paletteAssignment.js
// Utility functions for smart palette color assignment

import { memoGetPalette } from './paletteCache.js';

/**
 * Check if a value can be treated as a number
 */
function isNumerical(value) {
  if (value === null || value === undefined || value === '') return false;
  const num = Number(value);
  return !isNaN(num) && isFinite(num);
}

/**
 * Check if an array of values should be treated as numerical data
 * Returns true if at least 80% of non-null values are numerical
 */
function isNumericalData(values) {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNullValues.length === 0) return false;
  
  const numericalValues = nonNullValues.filter(isNumerical);
  return numericalValues.length / nonNullValues.length >= 0.8;
}

/**
 * Interpolate between two colors
 */
function interpolateColor(color1, color2, factor) {
  const [r1, g1, b1, a1 = 255] = color1;
  const [r2, g2, b2, a2 = 255] = color2;
  
  return [
    Math.round(r1 + factor * (r2 - r1)),
    Math.round(g1 + factor * (g2 - g1)),
    Math.round(b1 + factor * (b2 - b1)),
    Math.round(a1 + factor * (a2 - a1))
  ];
}

/**
 * Get color for a numerical value using sequential interpolation
 */
function getNumericalColor(value, minValue, maxValue, paletteColors) {
  if (!isNumerical(value)) {
    console.warn(`🚫 Non-numerical value: ${value}`);
    return paletteColors[0] || [128, 128, 128, 255];
  }
  
  const numValue = Number(value);
  if (minValue === maxValue) {
    console.log(`⚪ Single value case: ${numValue}`);
    return paletteColors[0] || [128, 128, 128, 255];
  }
  
  // Normalize value to 0-1 range
  const normalizedValue = (numValue - minValue) / (maxValue - minValue);
  const clampedValue = Math.max(0, Math.min(1, normalizedValue));
  
  if (paletteColors.length === 1) return paletteColors[0];
  
  // Find position in palette
  const palettePosition = clampedValue * (paletteColors.length - 1);
  const lowerIndex = Math.floor(palettePosition);
  const upperIndex = Math.ceil(palettePosition);
  
  if (lowerIndex === upperIndex) {
    const color = paletteColors[lowerIndex];
    console.log(`🎯 Direct color for ${numValue} (norm: ${normalizedValue.toFixed(3)}): [${color.join(',')}]`);
    return color;
  }
  
  // Interpolate between adjacent colors
  const factor = palettePosition - lowerIndex;
  const color = interpolateColor(paletteColors[lowerIndex], paletteColors[upperIndex], factor);
  console.log(`🌈 Interpolated color for ${numValue} (norm: ${normalizedValue.toFixed(3)}): [${color.join(',')}]`);
  return color;
}

/**
 * Smart color assignment based on palette type and data characteristics
 * 
 * @param {Array} values - Array of values to assign colors to
 * @param {Object} paletteConfig - Palette configuration object
 * @param {string} paletteConfig.type - 'qualitative', 'sequential', or 'diverging'
 * @param {string} paletteConfig.name - Palette name
 * @param {number} paletteConfig.numColors - Number of colors
 * @param {boolean} paletteConfig.reverse - Whether to reverse palette
 * @returns {Map} Map from value to color array [r, g, b, a]
 */
export function assignPaletteColors(values, paletteConfig) {
  if (!values || values.length === 0) return new Map();
  
  const { type = 'qualitative', name, numColors, reverse = false } = paletteConfig;
  
  // Filter out null/undefined/empty values
  const validValues = values.filter(v => v !== null && v !== undefined && v !== '');
  if (validValues.length === 0) return new Map();
  
  // Get palette colors
  let paletteColors = [];
  try {
    paletteColors = memoGetPalette(
      name,
      Math.max(validValues.length, numColors || validValues.length),
      reverse
    );
  } catch (error) {
    console.warn(`Failed to get palette ${name}:`, error);
    paletteColors = [[128, 128, 128, 255]]; // fallback gray
  }
  
  const colorMap = new Map();
  
  // For sequential palettes with numerical data, use interpolation
  if (type === 'sequential' && isNumericalData(validValues)) {
    const numericalValues = validValues.filter(isNumerical).map(v => Number(v));
    const minValue = Math.min(...numericalValues);
    const maxValue = Math.max(...numericalValues);
    
    
    validValues.forEach(value => {
      if (isNumerical(value)) {
        const color = getNumericalColor(value, minValue, maxValue, paletteColors);
        colorMap.set(String(value), color);
      } else {
        // Non-numerical values get first color
        colorMap.set(String(value), paletteColors[0] || [128, 128, 128, 255]);
      }
    });
  } else {
    // Qualitative assignment or non-numerical data - use discrete colors
    const uniqueValues = [...new Set(validValues.map(v => String(v)))].sort();
    
    
    uniqueValues.forEach((value, index) => {
      const colorIndex = index % paletteColors.length;
      colorMap.set(value, paletteColors[colorIndex]);
    });
  }
  
  return colorMap;
}

/**
 * Smart color assignment with prevalence filtering (for genes)
 * 
 * @param {Array} values - Array of values to assign colors to
 * @param {Object} paletteConfig - Palette configuration object
 * @param {Map} prevalenceMap - Map from value to prevalence (0-1)
 * @param {number} prevalenceThreshold - Minimum prevalence to get palette color (0-1)
 * @param {Array} defaultColor - Default color for low-prevalence values [r,g,b,a]
 * @returns {Map} Map from value to color array [r, g, b, a]
 */
export function assignPaletteColorsWithPrevalence(
  values, 
  paletteConfig, 
  prevalenceMap, 
  prevalenceThreshold = 0, 
  defaultColor = [150, 150, 150, 255]
) {
  if (!values || values.length === 0) return new Map();
  
  // Filter values by prevalence
  const validValues = values.filter(v => v !== null && v !== undefined && v !== '');
  const highPrevalenceValues = validValues.filter(v => {
    const prevalence = prevalenceMap?.get(String(v)) || 0;
    return prevalence >= prevalenceThreshold;
  });
  const lowPrevalenceValues = validValues.filter(v => {
    const prevalence = prevalenceMap?.get(String(v)) || 0;
    return prevalence < prevalenceThreshold;
  });
  
  // Get color map for high-prevalence values
  const colorMap = assignPaletteColors(highPrevalenceValues, paletteConfig);
  
  // Assign default color to low-prevalence values
  lowPrevalenceValues.forEach(value => {
    colorMap.set(String(value), defaultColor);
  });
  
  return colorMap;
}
