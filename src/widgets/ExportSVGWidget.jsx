import React from 'react';
import { exportToSVG } from '../utils/exportToSVG';
import { useTheme } from '../contexts/ThemeContext.jsx';
import imageIcon from '../assets/image.svg?url';

export default function ExportSVGWidget({ layers, viewState, containerSize, config, showRuler, rulerProps }) {
  const { getThemeColors } = useTheme();
  const themeColors = getThemeColors();

  return (
    <button
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        width: 32,
        height: 32,
        background: 'none',
        border: 'none',
        borderRadius: '0px', // force sharp square
        outline: 'none',
        boxShadow: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        zIndex: 30
      }}
      onClick={() => {
        const svg = exportToSVG(layers, viewState, containerSize, config, showRuler ? rulerProps : undefined, themeColors);
        if (!svg) return;
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hoodini-viz-export.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }}
      title="Export current view to SVG"
    >
      {imageIcon ? (
        <img src={imageIcon} alt="Export SVG" style={{ width: 20, height: 20, pointerEvents: 'none' }} />
      ) : (
        <span role="img" aria-label="image" style={{ fontSize: 20 }}>🖼️</span>
      )}
    </button>
  );
}
