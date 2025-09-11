// TreeScaleWidget.jsx
// Widget for controlling phylogenetic tree X-axis scaling

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext.jsx';

const TreeScaleWidget = ({ 
  treeXScale = 100, 
  onTreeXScaleChange, 
  title = "Tree X-Scale" 
}) => {
  const { getThemeColors, resolvedTheme } = useTheme();
  const themeColors = getThemeColors(resolvedTheme);

  // Local state to avoid firing parent updates on every tiny slider move
  const [localScale, setLocalScale] = useState(treeXScale);
  const commitTimer = useRef(null);
  useEffect(() => {
    setLocalScale(treeXScale);
  }, [treeXScale]);

  const commitScale = (value) => {
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
      commitTimer.current = null;
    }
    if (onTreeXScaleChange) onTreeXScaleChange(value);
  };

  const handleScaleChange = (event) => {
    const newScale = parseFloat(event.target.value);
    setLocalScale(newScale);
    // Debounce parent update slightly while dragging
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => commitScale(newScale), 120);
  };

  const handleInputChange = (event) => {
    const newScale = parseFloat(event.target.value);
    if (!isNaN(newScale) && newScale > 0) {
      setLocalScale(newScale);
      // commit immediately for numeric input
      commitScale(newScale);
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
          value={localScale}
          onChange={handleScaleChange}
          onMouseUp={() => commitScale(localScale)}
          onTouchEnd={() => commitScale(localScale)}
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
