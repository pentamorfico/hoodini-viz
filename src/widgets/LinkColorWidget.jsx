// LinkColorWidget.jsx
// Widget for controlling protein and nucleotide link coloring options

import React, { useState } from 'react';
import ColorPaletteWidget from './ColorPaletteWidget';

const LinkColorWidget = ({
  proteinLinkConfig,
  nucleotideLinkConfig,
  onProteinLinkConfigChange,
  onNucleotideLinkConfigChange,
  title = "Link Colors"
}) => {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Default configurations
  const defaultProteinConfig = {
    colorBy: 'source_gene', // 'source_gene', 'target_gene', 'identity_solid', 'identity_gradient'
    solidColor: [100, 0, 220, 255],
    useAlpha: false,
    minAlpha: 0.2,
    maxAlpha: 1.0,
    palette: {
      type: 'sequential',
      name: 'Blues',
      numColors: 9,
      reverse: false,
      enabled: true
    }
  };

  const defaultNucleotideConfig = {
    colorBy: 'solid', // 'solid', 'identity_gradient'
    solidColor: [200, 200, 200, 255],
    useAlpha: false,
    minAlpha: 0.2,
    maxAlpha: 1.0,
    palette: {
      type: 'sequential',
      name: 'Reds',
      numColors: 9,
      reverse: false,
      enabled: true
    }
  };

  const safeProteinConfig = proteinLinkConfig || defaultProteinConfig;
  const safeNucleotideConfig = nucleotideLinkConfig || defaultNucleotideConfig;

  const handleProteinConfigChange = (updates) => {
    onProteinLinkConfigChange({
      ...safeProteinConfig,
      ...updates
    });
  };

  const handleNucleotideConfigChange = (updates) => {
    onNucleotideLinkConfigChange({
      ...safeNucleotideConfig,
      ...updates
    });
  };

  const ColorInput = ({ label, color, onChange, alpha = true }) => (
    <div style={{ marginBottom: '8px' }}>
      <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
        {label}:
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <input
          type="color"
          value={`#${color.slice(0, 3).map(c => Math.round(c).toString(16).padStart(2, '0')).join('')}`}
          onChange={(e) => {
            const hex = e.target.value;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            const a = alpha ? (color.length > 3 ? color[3] : 255) : 255;
            onChange([r, g, b, a]);
          }}
          style={{ width: '30px', height: '20px', border: '1px solid #ccc', cursor: 'pointer' }}
        />
        {alpha && (
          <>
            <span style={{ fontSize: '10px' }}>α:</span>
            <input
              type="range"
              min="0"
              max="255"
              value={color.length > 3 ? color[3] : 255}
              onChange={(e) => {
                const newAlpha = parseInt(e.target.value);
                onChange([color[0], color[1], color[2], newAlpha]);
              }}
              style={{ width: '50px' }}
            />
            <span style={{ fontSize: '10px', minWidth: '25px' }}>
              {color.length > 3 ? Math.round((color[3] / 255) * 100) : 100}%
            </span>
          </>
        )}
      </div>
    </div>
  );

  const AlphaControls = ({ config, onChange }) => (
    <div style={{ marginTop: '8px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
      <label style={{ display: 'block', marginBottom: '5px' }}>
        <input
          type="checkbox"
          checked={config.useAlpha}
          onChange={(e) => onChange({ ...config, useAlpha: e.target.checked })}
          style={{ marginRight: '5px' }}
        />
        <span style={{ fontSize: '11px' }}>Apply alpha based on identity</span>
      </label>
      {config.useAlpha && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', gap: '5px' }}>
            <span style={{ fontSize: '10px', minWidth: '35px' }}>Min α:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.minAlpha}
              onChange={(e) => onChange({ ...config, minAlpha: parseFloat(e.target.value) })}
              style={{ width: '60px' }}
            />
            <span style={{ fontSize: '10px', minWidth: '30px' }}>{Math.round(config.minAlpha * 100)}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '10px', minWidth: '35px' }}>Max α:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.maxAlpha}
              onChange={(e) => onChange({ ...config, maxAlpha: parseFloat(e.target.value) })}
              style={{ width: '60px' }}
            />
            <span style={{ fontSize: '10px', minWidth: '30px' }}>{Math.round(config.maxAlpha * 100)}%</span>
          </div>
          <div style={{ fontSize: '9px', color: '#666', marginTop: '4px' }}>
            0% identity → {Math.round(config.minAlpha * 100)}% alpha<br/>
            100% identity → {Math.round(config.maxAlpha * 100)}% alpha
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ 
      marginTop: '10px', 
      borderTop: '1px solid #ccc', 
      paddingTop: '10px',
      fontSize: '12px'
    }}>
      <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>{title}:</div>
      
      {/* Protein Links Section */}
      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={() => toggleSection('protein')}
          style={{
            width: '100%',
            padding: '4px 8px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            textAlign: 'left',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>🔗 Protein Links</span>
          <span>{expandedSection === 'protein' ? '▼' : '▶'}</span>
        </button>
        
        {expandedSection === 'protein' && (
          <div style={{ 
            padding: '8px', 
            border: '1px solid #ddd', 
            borderTop: 'none', 
            backgroundColor: '#fafafa',
            borderRadius: '0 0 4px 4px'
          }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Color by:
              <select
                value={safeProteinConfig.colorBy}
                onChange={(e) => handleProteinConfigChange({ colorBy: e.target.value })}
                style={{ marginLeft: '5px', padding: '2px', fontSize: '11px' }}
              >
                <option value="source_gene">Source Gene Color</option>
                <option value="target_gene">Target Gene Color</option>
                <option value="identity_solid">Identity (Solid Color)</option>
                <option value="identity_gradient">Identity (Gradient)</option>
              </select>
            </label>

            {(safeProteinConfig.colorBy === 'source_gene' || safeProteinConfig.colorBy === 'target_gene') && (
              <AlphaControls
                config={safeProteinConfig}
                onChange={handleProteinConfigChange}
              />
            )}

            {safeProteinConfig.colorBy === 'identity_solid' && (
              <>
                <ColorInput
                  label="Solid Color"
                  color={safeProteinConfig.solidColor}
                  onChange={(color) => handleProteinConfigChange({ solidColor: color })}
                  alpha={false}
                />
                <AlphaControls
                  config={safeProteinConfig}
                  onChange={handleProteinConfigChange}
                />
              </>
            )}

            {safeProteinConfig.colorBy === 'identity_gradient' && (
              <>
                <ColorPaletteWidget
                  paletteConfig={safeProteinConfig.palette}
                  onPaletteChange={(palette) => handleProteinConfigChange({ palette })}
                  title="Identity Gradient"
                  showPreview={true}
                />
                <AlphaControls
                  config={safeProteinConfig}
                  onChange={handleProteinConfigChange}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Nucleotide Links Section */}
      <div>
        <button
          onClick={() => toggleSection('nucleotide')}
          style={{
            width: '100%',
            padding: '4px 8px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            textAlign: 'left',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>🧬 Nucleotide Links</span>
          <span>{expandedSection === 'nucleotide' ? '▼' : '▶'}</span>
        </button>
        
        {expandedSection === 'nucleotide' && (
          <div style={{ 
            padding: '8px', 
            border: '1px solid #ddd', 
            borderTop: 'none', 
            backgroundColor: '#fafafa',
            borderRadius: '0 0 4px 4px'
          }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Color by:
              <select
                value={safeNucleotideConfig.colorBy}
                onChange={(e) => handleNucleotideConfigChange({ colorBy: e.target.value })}
                style={{ marginLeft: '5px', padding: '2px', fontSize: '11px' }}
              >
                <option value="solid">Solid Color</option>
                <option value="identity_gradient">Identity (Gradient)</option>
              </select>
            </label>

            {safeNucleotideConfig.colorBy === 'solid' && (
              <>
                <ColorInput
                  label="Solid Color"
                  color={safeNucleotideConfig.solidColor}
                  onChange={(color) => handleNucleotideConfigChange({ solidColor: color })}
                  alpha={true}
                />
                <AlphaControls
                  config={safeNucleotideConfig}
                  onChange={handleNucleotideConfigChange}
                />
              </>
            )}

            {safeNucleotideConfig.colorBy === 'identity_gradient' && (
              <>
                <ColorPaletteWidget
                  paletteConfig={safeNucleotideConfig.palette}
                  onPaletteChange={(palette) => handleNucleotideConfigChange({ palette })}
                  title="Identity Gradient"
                  showPreview={true}
                />
                <AlphaControls
                  config={safeNucleotideConfig}
                  onChange={handleNucleotideConfigChange}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkColorWidget;
