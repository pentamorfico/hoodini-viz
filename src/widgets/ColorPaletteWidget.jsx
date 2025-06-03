// ColorPaletteWidget.jsx
// Widget for selecting and configuring color palettes using dicopal

import React, { useState, useEffect } from 'react';
import { 
  getQualitativePalettes, 
  getSequentialPalettes, 
  getDivergingPalettes,
  getPaletteColors,
  getPaletteColorCounts,
  RECOMMENDED_PALETTES
} from '../utils/colorPalettes';

const ColorPaletteWidget = ({ 
  paletteConfig, 
  onPaletteChange, 
  title = "Color Palette",
  showPreview = true 
}) => {
  const [availablePalettes, setAvailablePalettes] = useState([]);
  const [colorCounts, setColorCounts] = useState([]);
  const [previewColors, setPreviewColors] = useState([]);

  // Load available palettes when type changes
  useEffect(() => {
    let palettes = [];
    switch (paletteConfig.type) {
      case 'qualitative':
        palettes = getQualitativePalettes();
        break;
      case 'sequential':
        palettes = getSequentialPalettes();
        break;
      case 'diverging':
        palettes = getDivergingPalettes();
        break;
      default:
        palettes = getQualitativePalettes();
    }
    setAvailablePalettes(palettes);
  }, [paletteConfig.type]);

  // Update available color counts when palette name changes
  useEffect(() => {
    if (paletteConfig.name) {
      const counts = getPaletteColorCounts(paletteConfig.name);
      setColorCounts(counts);
      
      // If current numColors is not available, use the first available count
      if (counts.length > 0 && !counts.includes(paletteConfig.numColors)) {
        onPaletteChange({
          ...paletteConfig,
          numColors: counts[0]
        });
      }
    }
  }, [paletteConfig.name]);

  // Update preview colors when palette config changes
  useEffect(() => {
    if (paletteConfig.enabled && paletteConfig.name && paletteConfig.numColors) {
      try {
        const colors = getPaletteColors(paletteConfig.name, paletteConfig.numColors, paletteConfig.reverse);
        setPreviewColors(colors);
      } catch (error) {
        console.warn('Failed to load palette preview:', error);
        setPreviewColors([]);
      }
    } else {
      setPreviewColors([]);
    }
  }, [paletteConfig]);

  // Get unique palette names from available palettes
  const uniquePaletteNames = [...new Set(availablePalettes.map(p => p.name))].sort();

  const handleConfigChange = (updates) => {
    onPaletteChange({
      ...paletteConfig,
      ...updates
    });
  };

  const handleRecommendedPalette = (recommended) => {
    const matchingPalettes = availablePalettes.filter(p => p.name === recommended.name);
    if (matchingPalettes.length > 0) {
      const bestMatch = matchingPalettes.reduce((best, current) => 
        current.number > best.number ? current : best
      );
      
      handleConfigChange({
        name: recommended.name,
        numColors: bestMatch.number,
        enabled: true
      });
    }
  };

  return (
    <div style={{ 
      border: '1px solid #ddd', 
      borderRadius: '5px', 
      padding: '10px', 
      marginBottom: '10px',
      backgroundColor: '#f9f9f9'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
        {title}
      </div>

      {/* Enable/Disable Toggle */}
      <label style={{ display: 'block', marginBottom: '8px' }}>
        <input
          type="checkbox"
          checked={paletteConfig.enabled}
          onChange={(e) => handleConfigChange({ enabled: e.target.checked })}
          style={{ marginRight: '5px' }}
        />
        Enable color palette
      </label>

      {paletteConfig.enabled && (
        <>
          {/* Palette Type */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>
              Palette Type:
            </label>
            <select
              value={paletteConfig.type}
              onChange={(e) => handleConfigChange({ type: e.target.value })}
              style={{ width: '100%', padding: '3px', fontSize: '12px' }}
            >
              <option value="qualitative">Qualitative (Categorical)</option>
              <option value="sequential">Sequential (Continuous)</option>
              <option value="diverging">Diverging (Comparative)</option>
            </select>
          </div>

          {/* Recommended Palettes */}
          {RECOMMENDED_PALETTES[paletteConfig.type] && (
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>
                Recommended:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {RECOMMENDED_PALETTES[paletteConfig.type].map((rec, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleRecommendedPalette(rec)}
                    style={{
                      padding: '2px 6px',
                      fontSize: '10px',
                      border: '1px solid #ccc',
                      borderRadius: '3px',
                      backgroundColor: paletteConfig.name === rec.name ? '#007acc' : '#fff',
                      color: paletteConfig.name === rec.name ? '#fff' : '#333',
                      cursor: 'pointer'
                    }}
                    title={rec.description}
                  >
                    {rec.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Palette Name */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>
              Palette Name:
            </label>
            <select
              value={paletteConfig.name}
              onChange={(e) => handleConfigChange({ name: e.target.value })}
              style={{ width: '100%', padding: '3px', fontSize: '12px' }}
            >
              <option value="">Select a palette...</option>
              {uniquePaletteNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Number of Colors */}
          {colorCounts.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>
                Number of Colors:
              </label>
              <select
                value={paletteConfig.numColors}
                onChange={(e) => handleConfigChange({ numColors: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '3px', fontSize: '12px' }}
              >
                {colorCounts.map(count => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </div>
          )}

          {/* Reverse Toggle */}
          <label style={{ display: 'block', marginBottom: '8px' }}>
            <input
              type="checkbox"
              checked={paletteConfig.reverse}
              onChange={(e) => handleConfigChange({ reverse: e.target.checked })}
              style={{ marginRight: '5px' }}
            />
            <span style={{ fontSize: '12px' }}>Reverse palette</span>
          </label>

          {/* Color Preview */}
          {showPreview && previewColors.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>
                Preview:
              </label>
              <div style={{ 
                display: 'flex', 
                height: '20px', 
                border: '1px solid #ccc',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                {previewColors.map((color, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`,
                    }}
                    title={`Color ${idx + 1}: rgba(${color.join(', ')})`}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ColorPaletteWidget;
