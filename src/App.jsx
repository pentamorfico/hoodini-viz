import React, { useState, useEffect, useRef } from 'react'
import './App.css'
import PhyloTreeViewer from './components/PhyloTreeViewer';
import ThemeToggle from './components/ThemeToggle';
import ColorPaletteWidget from './widgets/ColorPaletteWidget';
import { ThemeProvider, useTheme } from './contexts/ThemeContext.jsx';
import { parseGFF } from './utils/parseGFF';
import { parseLinks } from './utils/parseLinks';
import { parseNucleotideLinks } from './utils/parseNucleotideLinks';
import { parseDomains } from './utils/parseDomains';
import parseBaselines from './utils/parseBaselines';
import parseProteinMetadata from './utils/parseProteinMetadata';
import parseTreeMetadata from './utils/parseTreeMetadata';
import { DEFAULT_CONFIG } from './config/visualizationConfig';

import defaultNewick from './data/defaultNewick.txt?raw';
import defaultGFFStr from './data/defaultGFF.gff?raw';
import defaultProteinLinks from './data/defaultProteinLinks.txt?raw';
import defaultNucleotideLinks from './data/defaultNucleotideLinks.txt?raw';
import defaultDomains from './data/defaultDomains.txt?raw';
import defaultBaselines from './data/defaultBaselines.txt?raw';
import defaultProteinMetadata from './data/defaultProteinMetadata.txt?raw';
import defaultTreeMetadata from './data/defaultTreeMetadata.txt?raw';


function App() {
  const [newickStr, setNewickStr] = useState(defaultNewick);
  const [showScrollbar, setShowScrollbar] = useState(true);
  const [alignCluster, setAlignCluster] = useState(null); // Set to null by default - no cluster alignment
  const [useDefaultGeneAlignment, setUseDefaultGeneAlignment] = useState(false); // Enable default gene alignment by default
  const [showRuler, setShowRuler] = useState(true); // New state to control ruler visibility
  const [treeLabelBy, setTreeLabelBy] = useState("leaf_id");
  const [treeColorBy, setTreeColorBy] = useState("species");
  const [ultrametric, setUltrametric] = useState(false); // New state to control ultrametric tree conversion
  const [showConnectingLines, setShowConnectingLines] = useState(false); // New state to control connecting lines
  const [defaultAlign, setDefaultAlign] = useState('start'); // Add state for default alignment
  const [phyloLabelPosition, setPhyloLabelPosition] = useState('after-tree'); // New state to control phylo label positioning
  const [alignLabels, setAlignLabels] = useState(true); // New state to control phylo label alignment
  const [arrowheadHeight, setArrowheadHeight] = useState(0); // New state to control gene arrowhead height
  
  // Gene and domain selection states
  const [geneColorBy, setGeneColorBy] = useState('cluster'); // Gene coloring field selection
  const [geneLabelBy, setGeneLabelBy] = useState('cluster'); // Gene labeling field selection
  const [domainColorBy, setDomainColorBy] = useState('domainName'); // Domain coloring field selection
  
  // Color palette states - configured for Set2 palette
  const [genePalette, setGenePalette] = useState({
    type: 'qualitative',
    name: 'Set2',
    numColors: 8,
    reverse: false,
    enabled: true
  });
  const [domainPalette, setDomainPalette] = useState({
    type: 'qualitative', 
    name: 'Set2',
    numColors: 8,
    reverse: false,
    enabled: true
  });
  const [phyloPalette, setPhyloPalette] = useState({
    type: 'qualitative',
    name: 'Set2', 
    numColors: 8,
    reverse: false,
    enabled: true
  });
  
  // ncRNA Palette state  
  const [ncRNAPalette, setNcRNAPalette] = useState({
    type: 'qualitative',
    name: 'Set3',
    numColors: 8,
    reverse: false,
    enabled: true
  });
  
  // Handler for domain palette changes that updates enabled state
  const handleDomainPaletteChange = (newPalette) => {
    setDomainPalette(newPalette);
  };
  
  // Reference to the PhyloTreeViewer to access genomeView for track manipulation
  const phyloTreeViewerRef = useRef(null);

  // Always use DEFAULT_CONFIG directly, but merge with dynamic settings
  // Split config into core (affects data processing) and style (affects rendering only)
  const coreConfig = React.useMemo(() => ({
    ...DEFAULT_CONFIG
  }), []);

  const styleConfig = React.useMemo(() => ({
    ...coreConfig,
    gene: {
      ...coreConfig.gene,
      arrowheadHeight: arrowheadHeight
    },
    colorPalettes: {
      genePalette,
      domainPalette,
      phyloPalette,
      ncRNAPalette
    }
  }), [coreConfig, arrowheadHeight, genePalette, domainPalette, phyloPalette, ncRNAPalette]);

  // Extract columns from tree metadata header for dropdowns
  const treeMetadataColumns = defaultTreeMetadata.trim().split(/\r?\n/)[0].split(/\t/);
  
  // Extract gene metadata columns for dropdowns (from protein metadata)
  const geneMetadataColumns = React.useMemo(() => {
    const headerLine = defaultProteinMetadata.trim().split(/\r?\n/)[0];
    return headerLine.split(/\t/).filter(col => col !== 'gene_id'); // Exclude gene_id from options
  }, []);

  const handleObjectClick = (object) => {
    // object contains all metadata, etc.
    console.log('Clicked object:', object);
    // You can store it in state if needed
  };

  // Track manipulation functions
  const handleTrackShiftPlus1kb = (hoodId) => {
    if (phyloTreeViewerRef.current && phyloTreeViewerRef.current.genomeView) {
      phyloTreeViewerRef.current.genomeView.shiftTrackPlus1kb(hoodId);
      phyloTreeViewerRef.current.forceManualUpdate();
    }
  };
  const handleTrackShiftMinus1kb = (hoodId) => {
    if (phyloTreeViewerRef.current && phyloTreeViewerRef.current.genomeView) {
      phyloTreeViewerRef.current.genomeView.shiftTrackMinus1kb(hoodId);
      phyloTreeViewerRef.current.forceManualUpdate();
    }
  };
  const handleTrackFlip = (hoodId) => {
    if (phyloTreeViewerRef.current && phyloTreeViewerRef.current.genomeView) {
      phyloTreeViewerRef.current.genomeView.flipTrackToggle(hoodId);
      phyloTreeViewerRef.current.forceManualUpdate();
    }
  };

  // Parse all data up front - memoize to prevent recreation on every render
  const parsedGFF = React.useMemo(() => parseGFF(defaultGFFStr), []);
  const parsedProteinLinks = React.useMemo(() => parseLinks(defaultProteinLinks), []);
  const parsedNucleotideLinks = React.useMemo(() => parseNucleotideLinks(defaultNucleotideLinks), []);
  const parsedDomains = React.useMemo(() => parseDomains(defaultDomains), []);
  const parsedBaselines = React.useMemo(() => parseBaselines(defaultBaselines), []);
  const parsedProteinMetadata = React.useMemo(() => parseProteinMetadata(defaultProteinMetadata), []);
  const parsedTreeMetadata = React.useMemo(() => parseTreeMetadata(defaultTreeMetadata), []);

  return (
    <div className="App" >
      {/* Simple controls for demonstration */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, background: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          <input 
            type="checkbox" 
            checked={ultrametric} 
            onChange={(e) => setUltrametric(e.target.checked)}
            style={{ marginRight: '5px' }}
          />
          Convert to Ultrametric Tree
        </label>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          <input 
            type="checkbox" 
            checked={showConnectingLines} 
            onChange={(e) => setShowConnectingLines(e.target.checked)}
            style={{ marginRight: '5px' }}
          />
          Show Connecting Lines
        </label>
        
        {/* Phylo Label Position Control */}
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Phylo Label Position:
          <select 
            value={phyloLabelPosition} 
            onChange={(e) => setPhyloLabelPosition(e.target.value)}
            style={{ marginLeft: '5px' }}
          >
            <option value="after-tree">After Tree</option>
            <option value="after-tracks">After Tracks</option>
          </select>
        </label>

        {/* Phylo Label Alignment Control */}
        <label style={{ display: 'block', marginBottom: '5px' }}>
          <input 
            type="checkbox" 
            checked={alignLabels} 
            onChange={(e) => setAlignLabels(e.target.checked)}
            style={{ marginRight: '5px' }}
          />
          Align phylo labels to same X coordinate
        </label>

        {/* Gene Arrowhead Height Control */}
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Gene Arrowhead Height:
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={arrowheadHeight} 
            onChange={(e) => setArrowheadHeight(Number(e.target.value))}
            style={{ marginLeft: '5px', width: '100px' }}
          />
          <span style={{ marginLeft: '5px' }}>{arrowheadHeight}</span>
        </label>

        {/* Field Selection Controls */}
        <div style={{ marginTop: '10px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
          <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Color/Label Fields:</div>
          
          {/* Gene Color By */}
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Gene Colors:
            <select 
              value={geneColorBy} 
              onChange={(e) => setGeneColorBy(e.target.value)}
              style={{ marginLeft: '5px', padding: '2px', fontSize: '12px' }}
            >
              {geneMetadataColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </label>

          {/* Tree Color By */}
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Tree Colors:
            <select 
              value={treeColorBy} 
              onChange={(e) => setTreeColorBy(e.target.value)}
              style={{ marginLeft: '5px', padding: '2px', fontSize: '12px' }}
            >
              {treeMetadataColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </label>
          
          {/* Domain Color By */}
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Domain Colors:
            <select 
              value={domainColorBy} 
              onChange={(e) => setDomainColorBy(e.target.value)}
              style={{ marginLeft: '5px', padding: '2px', fontSize: '12px' }}
            >
              <option value="domainName">Domain Name</option>
              <option value="evalue">E-value</option>
              <option value="length">Length</option>
            </select>
          </label>
        </div>

        {/* Color Palette Controls */}
        <div style={{ marginTop: '10px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
          <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Color Palettes:</div>
          
          {/* Gene Palette */}
          <ColorPaletteWidget 
            paletteConfig={genePalette}
            onPaletteChange={setGenePalette}
            title="Gene Palette (by cluster)"
            showPreview={true}
          />

          {/* Tree Palette */}
          <ColorPaletteWidget 
            paletteConfig={phyloPalette}
            onPaletteChange={setPhyloPalette}
            title="Tree Palette (by species)"
            showPreview={true}
          />

          {/* Domain Palette */}
          <ColorPaletteWidget 
            paletteConfig={domainPalette}
            onPaletteChange={setDomainPalette}
            title="Domain Palette (by domain name)"
            showPreview={true}
          />

          {/* ncRNA Palette - New addition */}
          <ColorPaletteWidget 
            paletteConfig={ncRNAPalette}
            onPaletteChange={setNcRNAPalette}
            title="ncRNA Palette (by type)"
            showPreview={true}
          />
        </div>
        
        {/* Alignment Controls */}
        <div style={{ marginTop: '10px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
          <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Alignment Controls:</div>
          
          {/* Cluster Alignment */}
          <div style={{ marginBottom: '5px' }}>
            <button 
              onClick={() => setAlignCluster(1)}
              style={{ marginRight: '5px', padding: '2px 8px', fontSize: '12px' }}
            >
              Align Cluster 1
            </button>
            <button 
              onClick={() => setAlignCluster(2)}
              style={{ marginRight: '5px', padding: '2px 8px', fontSize: '12px' }}
            >
              Align Cluster 2
            </button>
            <button 
              onClick={() => setAlignCluster(null)}
              style={{ padding: '2px 8px', fontSize: '12px' }}
            >
              No Cluster
            </button>
          </div>
          
          {/* Traditional Alignment */}
          <div style={{ marginBottom: '5px' }}>
            <button 
              onClick={() => {
                setAlignCluster(null);
                setUseDefaultGeneAlignment(false);
                setDefaultAlign('start');
              }}
              style={{ marginRight: '5px', padding: '2px 8px', fontSize: '12px' }}
            >
              Align Start
            </button>
            <button 
              onClick={() => {
                setAlignCluster(null);
                setUseDefaultGeneAlignment(false);
                setDefaultAlign('center');
              }}
              style={{ marginRight: '5px', padding: '2px 8px', fontSize: '12px' }}
            >
              Align Center
            </button>
            <button 
              onClick={() => {
                setAlignCluster(null);
                setUseDefaultGeneAlignment(false);
                setDefaultAlign('end');
              }}
              style={{ marginRight: '5px', padding: '2px 8px', fontSize: '12px' }}
            >
              Align End
            </button>
          </div>
          
          {/* Default Gene Alignment */}
          <div style={{ marginBottom: '5px' }}>
            <button 
              onClick={() => {
                setAlignCluster(null);
                setUseDefaultGeneAlignment(true);
              }}
              style={{ padding: '2px 8px', fontSize: '12px' }}
            >
              Default Gene Alignment
            </button>
          </div>
        </div>



        {/* Track Manipulation Controls */}
        <div style={{ marginTop: '10px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
          <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Track Controls:</div>
          {['hood_A', 'hood_B', 'hood_C', 'hood_D', 'hood_E'].map(hoodId => (
            <div key={hoodId} style={{ marginBottom: '3px', fontSize: '11px' }}>
              <span style={{ display: 'inline-block', width: '60px', fontSize: '10px' }}>{hoodId}:</span>
              <button 
                onClick={() => handleTrackShiftMinus1kb(hoodId)}
                style={{ marginRight: '2px', padding: '1px 4px', fontSize: '10px' }}
                title={`Shift ${hoodId} left by 1kb`}
              >
                -1kb
              </button>
              <button 
                onClick={() => handleTrackShiftPlus1kb(hoodId)}
                style={{ marginRight: '2px', padding: '1px 4px', fontSize: '10px' }}
                title={`Shift ${hoodId} right by 1kb`}
              >
                +1kb
              </button>
              <button 
                onClick={() => handleTrackFlip(hoodId)}
                style={{ padding: '1px 4px', fontSize: '10px' }}
                title={`Flip ${hoodId}`}
              >
                Flip
              </button>
            </div>
          ))}
        </div>

        {/* Gene Label Controls */}
        <div style={{ marginTop: '10px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
          <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Label Controls:</div>
          
          {/* Tree Label By */}
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Tree Labels:
            <select 
              value={treeLabelBy} 
              onChange={(e) => setTreeLabelBy(e.target.value)}
              style={{ marginLeft: '5px', padding: '2px', fontSize: '12px' }}
            >
              {treeMetadataColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </label>

          {/* Gene Label By */}
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Gene Labels:
            <select 
              value={geneLabelBy} 
              onChange={(e) => setGeneLabelBy(e.target.value)}
              style={{ marginLeft: '5px', padding: '2px', fontSize: '12px' }}
            >
              <option value="">None</option>
              {geneMetadataColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      
      <PhyloTreeViewer
        ref={phyloTreeViewerRef}
        newickStr={newickStr}
        gffFeatures={parsedGFF}
        proteinLinks={parsedProteinLinks}
        nucleotideLinks={parsedNucleotideLinks}
        domainsByGene={parsedDomains}
        baselines={parsedBaselines}
        showScrollbar={showScrollbar}
        alignCluster={alignCluster}
        defaultAlign={defaultAlign}
        useDefaultGeneAlignment={useDefaultGeneAlignment}
        showRuler={showRuler}
        onObjectClick={handleObjectClick}
        showSVGWidget={true}
        proteinMetadata={parsedProteinMetadata}
        colorBy={geneColorBy}
        labelBy={geneLabelBy}
        domainColorBy={domainColorBy}
        treeMetadata={parsedTreeMetadata}
        treeLabelBy={treeLabelBy}
        treeColorBy={treeColorBy}
        config={styleConfig}
        ultrametric={ultrametric}
        showConnectingLines={showConnectingLines}
        phyloLabelPosition={phyloLabelPosition}
        alignLabels={alignLabels}
        genePalette={genePalette}
        domainPalette={domainPalette}
        phyloPalette={phyloPalette}
        ncRNAPalette={ncRNAPalette}
        styleConfig={styleConfig}
      />
      <ThemeToggle />
    </div>
  );
}

// Wrapper component with ThemeProvider
function AppWithTheme() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

export default AppWithTheme;
