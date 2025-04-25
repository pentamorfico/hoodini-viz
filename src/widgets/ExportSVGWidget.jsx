import React from 'react';
import { exportToSVG } from '../utils/exportToSVG';

export default function ExportSVGWidget({ layers, viewState, containerSize }) {
  return (
    <button
      style={{
        background: '#fff',
        color: '#222',
        border: '1px solid #ccc',
        padding: '6px 16px',
        borderRadius: '4px',
        boxShadow: '0 1px 4px #bbb',
        cursor: 'pointer',
        fontWeight: 600
      }}
      onClick={() => exportToSVG(layers, viewState, containerSize)}
      title="Export current view to SVG"
    >
      Export SVG
    </button>
  );
}
