// TreeScaleWidget.jsx
// Widget for controlling phylogenetic tree X-axis scaling

import React from 'react';
import { useTheme } from '../contexts/ThemeContext.jsx';

const TreeScaleWidget = ({ 
  treeXScale = 100, 
  onTreeXScaleChange, 
  title = "Tree X-Scale" 
}) => {
  const { getThemeColors } = useTheme();
  const themeColors = getThemeColors();

  const handleScaleChange = (event) => {
    const newScale = parseFloat(event.target.value);
    if (onTreeXScaleChange) {
      onTreeXScaleChange(newScale);
    }
  };

  const handleInputChange = (event) => {
    const newScale = parseFloat(event.target.value);
    if (!isNaN(newScale) && newScale > 0 && onTreeXScaleChange) {
      onTreeXScaleChange(newScale);
    }
  };

  return (
    <div style={{ 
      background: themeColors.widgetBackground, 
      color: themeColors.text, 
      border: `1px solid ${themeColors.border}`,
      borderRadius: '4px',
      padding: '12px',
      margin: '8px 0',
      fontSize: '13px'
    }}>
      <div style={{ 
        fontWeight: 'bold', 
        marginBottom: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>{title}</span>
        <input
          type="number"
          value={treeXScale}
          onChange={handleInputChange}
          min="1"
          max="1000"
          step="1"
          style={{
            width: '60px',
            padding: '2px 4px',
            border: `1px solid ${themeColors.border}`,
            borderRadius: '3px',
            background: themeColors.background,
            color: themeColors.text,
            fontSize: '12px'
          }}
        />
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <input
          type="range"
          min="1"
          max="500"
          step="1"
          value={treeXScale}
          onChange={handleScaleChange}
          style={{
            width: '100%',
            height: '6px',
            background: themeColors.sliderTrack,
            outline: 'none',
            borderRadius: '3px',
          }}
        />
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        fontSize: '11px',
        color: themeColors.textSecondary,
        marginTop: '4px'
      }}>
        <span>1%</span>
        <span>100% (Normal)</span>
        <span>500%</span>
      </div>
      
      <div style={{ 
        fontSize: '11px',
        color: themeColors.textSecondary,
        marginTop: '6px',
        textAlign: 'center'
      }}>
        {treeXScale < 100 ? 'Compressed' : treeXScale > 100 ? 'Stretched' : 'Normal'} 
        ({treeXScale}%)
      </div>
    </div>
  );
};

export default TreeScaleWidget;
