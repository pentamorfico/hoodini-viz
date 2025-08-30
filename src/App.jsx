import React, { useState, useEffect, useRef } from 'react'
import './App.css'
import PhyloTreeViewer from './components/PhyloTreeViewer';
import ThemeToggle from './components/ThemeToggle';
import ColorPaletteWidget from './widgets/ColorPaletteWidget';
import LinkColorWidget from './widgets/LinkColorWidget';
import { ThemeProvider, useTheme } from './contexts/ThemeContext.jsx';
import { parseGFF } from './utils/parseGFF';
import { parseLinks } from './utils/parseLinks';
import { parseNucleotideLinks } from './utils/parseNucleotideLinks';
import { parseDomains } from './utils/parseDomains';
import parseBaselines from './utils/parseBaselines';
import parseProteinMetadata from './utils/parseProteinMetadata';
import parseTreeMetadata from './utils/parseTreeMetadata';
import { 
  parseProteinMetadataOptimized, 
  parseTreeMetadataOptimized, 
  parseGFFOptimized,
  parseProteinLinksOptimized,
  parseNucleotideLinksOptimized,
  parseDomainsOptimized,
  parseBaselinesOptimized,
  parseNonCodingMetadataOptimized
} from './utils/loadersGLUtils';
import { DEFAULT_CONFIG } from './config/visualizationConfig';
import { getPaletteColors } from './utils/colorPalettes';

import defaultNewick from './data/defaultNewick.txt?raw';
import defaultGFFStr from './data/defaultGFF.gff?raw';
import defaultProteinLinks from './data/defaultProteinLinks.txt?raw';
import defaultNucleotideLinks from './data/defaultNucleotideLinks.txt?raw';
import defaultDomains from './data/defaultDomains.txt?raw';
import defaultBaselines from './data/defaultBaselines.txt?raw';
import defaultProteinMetadata from './data/defaultProteinMetadata.txt?raw';
import defaultTreeMetadata from './data/defaultTreeMetadata.txt?raw';
import defaultNonCodingMetadata from './data/defaultNonCodingMetadata.txt?raw';


function App() {
  const [newickStr, setNewickStr] = useState(defaultNewick);
  const [showScrollbar, setShowScrollbar] = useState(false);
  const [alignCluster, setAlignCluster] = useState(null); // Set to null by default - no cluster alignment
  const [useDefaultGeneAlignment, setUseDefaultGeneAlignment] = useState(true); // Enable default gene alignment by default
  const [showRuler, setShowRuler] = useState(true); // New state to control ruler visibility
  const [treeLabelBy, setTreeLabelBy] = useState("species");
  const [treeColorBy, setTreeColorBy] = useState("species");
  const [ultrametric, setUltrametric] = useState(false); // New state to control ultrametric tree conversion
  const [showConnectingLines, setShowConnectingLines] = useState(false); // New state to control connecting lines
  const [defaultAlign, setDefaultAlign] = useState('start'); // Add state for default alignment
  const [phyloLabelPosition, setPhyloLabelPosition] = useState('after-tree'); // New state to control phylo label positioning
  const [alignLabels, setAlignLabels] = useState(true); // New state to control phylo label alignment
  const [arrowheadHeight, setArrowheadHeight] = useState(0); // New state to control gene arrowhead height
  const [geneHeight, setGeneHeight] = useState(60); // New state to control gene height
  
  // Debounced display values for sliders
  const [arrowheadHeightDisplay, setArrowheadHeightDisplay] = useState(0);
  const [geneHeightDisplay, setGeneHeightDisplay] = useState(60);
  
  // Debounce timers
  const arrowheadHeightTimeoutRef = useRef(null);
  const geneHeightTimeoutRef = useRef(null);
  
  // Debounced handlers for sliders
  const handleArrowheadHeightChange = (value) => {
    setArrowheadHeightDisplay(value);
    if (arrowheadHeightTimeoutRef.current) {
      clearTimeout(arrowheadHeightTimeoutRef.current);
    }
    arrowheadHeightTimeoutRef.current = setTimeout(() => {
      setArrowheadHeight(value);
    }, 150); // 150ms debounce
  };
  
  const handleGeneHeightChange = (value) => {
    setGeneHeightDisplay(value);
    if (geneHeightTimeoutRef.current) {
      clearTimeout(geneHeightTimeoutRef.current);
    }
    geneHeightTimeoutRef.current = setTimeout(() => {
      setGeneHeight(value);
    }, 150); // 150ms debounce
  };
  
  // Initialize display values on mount
  useEffect(() => {
    setArrowheadHeightDisplay(arrowheadHeight);
    setGeneHeightDisplay(geneHeight);
  }, [arrowheadHeight, geneHeight]);
  
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

  // Region Palette state
  const [regionPalette, setRegionPalette] = useState({
    type: 'qualitative',
    name: 'Dark2',
    numColors: 8,
    reverse: false,
    enabled: true
  });

  // Link color configuration states
  const [proteinLinkConfig, setProteinLinkConfig] = useState({
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
  });

  const [nucleotideLinkConfig, setNucleotideLinkConfig] = useState({
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
  });
  
  // Handler for domain palette changes that updates enabled state
  const handleDomainPaletteChange = (newPalette) => {
    setDomainPalette(newPalette);
  };
  
  // Reference to the PhyloTreeViewer to access genomeView for track manipulation
  const phyloTreeViewerRef = useRef(null);
  const [viewerLegend, setViewerLegend] = useState(null);

  // Always use DEFAULT_CONFIG directly, but merge with dynamic settings
  // Split config into core (affects data processing) and style (affects rendering only)
  const coreConfig = React.useMemo(() => ({
    ...DEFAULT_CONFIG
  }), []);

  const styleConfig = React.useMemo(() => {
    return {
      ...coreConfig,
      gene: {
        ...coreConfig.gene,
        arrowheadHeight: arrowheadHeight,
        height: geneHeight
      },
      colorPalettes: {
        genePalette,
        domainPalette,
        phyloPalette,
        ncRNAPalette,
        regionPalette
      }
    };
  }, [coreConfig, arrowheadHeight, geneHeight, genePalette, domainPalette, phyloPalette, ncRNAPalette, regionPalette]);

  // Dedicated tree X-scale state (percent) so slider controls are explicit and reactive
  const [treeXScale, setTreeXScale] = React.useState(styleConfig.tree?.xScalePercent || 100);

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
  // Use optimized loaders.gl parsing for ALL TSV/CSV files
  
  // Store all parsed data in state with loading indicator
  const [parsedGFF, setParsedGFF] = React.useState([]);
  const [parsedProteinLinks, setParsedProteinLinks] = React.useState([]);
  const [parsedNucleotideLinks, setParsedNucleotideLinks] = React.useState([]);
  const [parsedDomains, setParsedDomains] = React.useState({});
  const [parsedBaselines, setParsedBaselines] = React.useState([]);
  const [parsedProteinMetadata, setParsedProteinMetadata] = React.useState({});
  const [parsedTreeMetadata, setParsedTreeMetadata] = React.useState({});
  const [parsedNonCodingMetadata, setParsedNonCodingMetadata] = React.useState({});
  const [dataLoading, setDataLoading] = React.useState(true);
  
  React.useEffect(() => {
    const loadData = async () => {
      setDataLoading(true);

      
      try {
        // Load all files in parallel for maximum performance

        
        const [gff, proteinLinks, nucleotideLinks, domains, baselines, proteinMeta, treeMeta, nonCodingMeta] = await Promise.all([
          parseGFFOptimized(defaultGFFStr, coreConfig),
          parseProteinLinksOptimized(defaultProteinLinks),
          parseNucleotideLinksOptimized(defaultNucleotideLinks),
          parseDomainsOptimized(defaultDomains),
          parseBaselinesOptimized(defaultBaselines),
          parseProteinMetadataOptimized(defaultProteinMetadata),
          parseTreeMetadataOptimized(defaultTreeMetadata),
          parseNonCodingMetadataOptimized(defaultNonCodingMetadata || '')
        ]);
        

        
        setParsedGFF(gff);
        setParsedProteinLinks(proteinLinks);
        setParsedNucleotideLinks(nucleotideLinks);
        setParsedDomains(domains);
        setParsedBaselines(baselines);
        setParsedProteinMetadata(proteinMeta);
        setParsedTreeMetadata(treeMeta);
        setParsedNonCodingMetadata(nonCodingMeta);
        
       
        // Add a slight delay to measure the render trigger timing
        setTimeout(() => {
        }, 0);
        
      } catch (error) {
        console.error('❌ Data loading failed:', error);
        // Fallback to synchronous parsing
        setParsedGFF(parseGFF(defaultGFFStr, coreConfig));
        setParsedProteinLinks(parseLinks(defaultProteinLinks));
        setParsedNucleotideLinks(parseNucleotideLinks(defaultNucleotideLinks));
        setParsedDomains(parseDomains(defaultDomains));
        setParsedBaselines(parseBaselines(defaultBaselines));
        setParsedProteinMetadata(parseProteinMetadata(defaultProteinMetadata));
        setParsedTreeMetadata(parseTreeMetadata(defaultTreeMetadata));
        setParsedNonCodingMetadata({}); // Default empty
      } finally {
        setDataLoading(false);
      }
    };
    
    loadData();
  }, [coreConfig]);

  return (
    <div className="App" >
      {/* Loading indicator */}
      {dataLoading && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          background: 'rgba(255,255,255,0.9)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 10000,
          fontSize: '18px',
          color: '#666'
        }}>
          <div>
            <div>🚀 Loading all data with optimized loaders.gl parsers...</div>
            <div style={{ fontSize: '14px', marginTop: '10px', opacity: 0.7 }}>
              Processing GFF (764KB), protein metadata (554KB), and all other TSV/CSV files in parallel
            </div>
          </div>
        </div>
      )}
      
  <div style={{ position: 'absolute', top: 10, right: 60, zIndex: 1000, background: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', maxHeight: '80vh', overflow: 'auto', width: '320px' }}>
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

        {/* Turn on/off the scroll bar */}
        <label style={{ display: 'block', marginBottom: '5px' }}>
          <input 
            type="checkbox" 
            checked={showScrollbar} 
            onChange={(e) => setShowScrollbar(e.target.checked)}
            style={{ marginRight: '5px' }}
          />
          Show Scrollbar
        </label>

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
            value={arrowheadHeightDisplay} 
            onChange={(e) => handleArrowheadHeightChange(Number(e.target.value))}
            style={{ marginLeft: '5px', width: '100px' }}
          />
          <span style={{ marginLeft: '5px' }}>{arrowheadHeightDisplay}</span>
        </label>

        {/* Gene Height Control */}
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Gene Height:
          <input 
            type="range" 
            min="10" 
            max="200" 
            value={geneHeightDisplay} 
            onChange={(e) => handleGeneHeightChange(Number(e.target.value))}
            style={{ marginLeft: '5px', width: '100px' }}
          />
          <span style={{ marginLeft: '5px' }}>{geneHeightDisplay}</span>
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

          {/* Region Palette */}
          <ColorPaletteWidget 
            paletteConfig={regionPalette}
            onPaletteChange={setRegionPalette}
            title="Region Palette (by region type)"
            showPreview={true}
          />

          {/* Link Color Controls */}
          <LinkColorWidget
            proteinLinkConfig={proteinLinkConfig}
            nucleotideLinkConfig={nucleotideLinkConfig}
            onProteinLinkConfigChange={setProteinLinkConfig}
            onNucleotideLinkConfigChange={setNucleotideLinkConfig}
            title="Link Colors"
          />
        </div>

        {/* Tree X-scale slider and Legend */}
        <div style={{ marginTop: '10px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Tree & Legend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ flex: '1' }}>
              <label style={{ display: 'block', fontSize: '12px' }}>Tree X-Scale</label>
              <input type="range" min="10" max="300" value={treeXScale} onChange={(e) => setTreeXScale(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
          </div>

          {/* Legend: strictly data-driven from viewer when available */}
          <div style={{ maxHeight: '40vh', overflow: 'auto', paddingTop: '6px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px', textAlign: 'center', width: '100%' }}>Legend</div>
            {(() => {
              const legend = viewerLegend || (phyloTreeViewerRef.current && typeof phyloTreeViewerRef.current.getLegendData === 'function'
                ? phyloTreeViewerRef.current.getLegendData()
                : null);

              // Helpers: convert color formats and render SVG swatches that match on-canvas shapes
              const colorToCss = (color, alphaOverride = null) => {
                if (!color) return '#eee';
                if (Array.isArray(color)) {
                  const a = typeof alphaOverride === 'number' ? alphaOverride : (color.length > 3 ? (color[3] / 255) : 1);
                  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${a})`;
                }
                return String(color);
              };

              // Compare helper: numeric when both parse to numbers, otherwise locale string compare
              const compareAny = (a, b) => {
                const na = Number(a);
                const nb = Number(b);
                const isNumA = !Number.isNaN(na) && String(a).trim() !== '';
                const isNumB = !Number.isNaN(nb) && String(b).trim() !== '';
                if (isNumA && isNumB) return na - nb;
                return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
              };

              const sortItemsByValue = (items) => {
                if (!items || !Array.isArray(items)) return items;
                try {
                  return [...items].sort((x, y) => compareAny(x.value ?? x.label ?? x[0], y.value ?? y.label ?? y[0]));
                } catch (e) { return items; }
              };

              const svgSwatch = (color, type = 'rect', w = 18, h = 12, strokeColor = null) => {
                const fill = colorToCss(color);
                const stroke = strokeColor ? colorToCss(strokeColor) : '#555';
                if (type === 'arrow') {
              const basePad = 1.0;        // visual padding (px)
              const strokeW = 1;          // matches polygon strokeWidth below
              const strokePad = strokeW / 2;
              const pY = basePad + strokePad; // vertical pad
              const pX = basePad + strokePad; // horizontal pad to prevent tip clip

              const TIP_WIDTH_FACTOR = styleConfig?.gene?.tipWidthFactor ?? 0.1;
              const geneHeightWorld = styleConfig?.gene?.height ?? 60;            // world px
              const arrowheadWorld  = styleConfig?.gene?.arrowheadHeight ?? 0;    // world px (0..100 if you pipe that directly)

              // --- Gene.js logic in "world" Y (trackY = 0 centered) ---
              const halfH_world = geneHeightWorld / 2;
              const arrowHalf_world = halfH_world + (arrowheadWorld / 2); // EXACT Gene._buildPolygon

              // X in swatch space; keep the tip INSIDE by pX
              const tipW = Math.max(2, Math.round(w * TIP_WIDTH_FACTOR));
              const startX = pX;
              let   endX   = w - pX;           // tip apex is inside box (prevents clipping)
              let   baseX  = endX - tipW;

              // Map world Y → swatch Y so the **body height** fits h - 2*pY
              const sY   = (h - 2 * pY) / geneHeightWorld;
              const midY = pY + (h - 2 * pY) / 2;
              const toSwY = (yW) => midY + yW * sY;

              // Build 7-pt forward polygon exactly like Gene._buildPolygon
              let pts = [
                [startX, toSwY(-halfH_world)],
                [baseX,  toSwY(-halfH_world)],
                [baseX,  toSwY(-arrowHalf_world)],
                [endX,   toSwY(0)],
                [baseX,  toSwY( arrowHalf_world)],
                [baseX,  toSwY( halfH_world)],
                [startX, toSwY( halfH_world)],
              ];

              // ---- Vertical bounds & grow height if needed (top/bottom padding) ----
              let minY = Infinity, maxY = -Infinity;
              for (const [, y] of pts) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
              const shiftDown = Math.max(0, pY - minY);        // ensure top ≥ pY
              if (shiftDown) pts = pts.map(([x, y]) => [x, y + shiftDown]);

              minY += shiftDown; maxY += shiftDown;
              const wantBottom = h - pY;
              const extraH = Math.max(0, Math.ceil(maxY - wantBottom)); // overflow at bottom
              const svgH = h + extraH;

              // ---- Horizontal bounds & grow width if needed (right padding) ----
              let minX = Infinity, maxX = -Infinity;
              for (const [x] of pts) { if (x < minX) minX = x; if (x > maxX) maxX = x; }

              // If due to rounding/miter we still exceed the right edge, expand width
              const wantRight = w - basePad;           // leave basePad at right
              const extraW = Math.max(0, Math.ceil(maxX - wantRight));
              const svgW = w + extraW;

              // If left edge is tighter than basePad, shift right
              const needLeftShift = Math.max(0, basePad - minX);
              if (extraW || needLeftShift) {
                const dx = needLeftShift;              // shift everything right if needed
                if (dx) pts = pts.map(([x, y]) => [x + dx, y]);
              }

              const polygonPoints = pts.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(' ');

              return (
                <svg
                  width={svgW}
                  height={svgH}
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polygon
                    points={polygonPoints}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeW}
                    strokeLinejoin="miter"   // keep crisp corners
                    strokeMiterlimit={10}
                    strokeLinecap="butt"
                  />
                </svg>
              );
            }


            if (type === 'half-arrow') {
              // ncRNA upper-half: filled upper polygon + mitered outline,
              // with padding and dynamic container size to avoid clipping.

              const basePad = 1.0;           // visual padding
              const strokeW = 1;             // must match strokeWidth below
              const strokePad = strokeW / 2;
              const pX = basePad + strokePad;  // horizontal padding
              const pY = basePad + strokePad;  // vertical padding

              // --- Gene.js geometry (world Y around trackY = 0) ---
              const TIP_WIDTH_FACTOR = styleConfig?.gene?.tipWidthFactor ?? 0.1;
              const geneHeightWorld  = styleConfig?.gene?.height ?? 60;            // world px
              const arrowheadWorld   = styleConfig?.gene?.arrowheadHeight ?? 0;    // world px (0..100 if you pass it directly)

              const halfH_world   = geneHeightWorld / 2;
              const arrowHalf_w   = halfH_world + (arrowheadWorld / 2);            // EXACT Gene._buildPolygon logic

              // X in swatch space; keep tip inside by pX so stroke/miter isn't clipped
              const tipW   = Math.max(2, Math.round(w * TIP_WIDTH_FACTOR));
              const startX = pX;
              let   endX   = w - pX;          // tip apex x (inside the box)
              let   baseX  = endX - tipW;     // vertical base x

              // World Y -> swatch Y so the **body** fits exactly into (h - 2*pY)
              const sY   = (h - 2 * pY) / geneHeightWorld;
              const midY = pY + (h - 2 * pY) / 2;
              const toSwY = (yW) => midY + yW * sY;

              // Build UPPER half polygon (forward strand), closing at midline:
              // (start, topBody) → (base, topBody) → (base, topBase) → (tip, midY) → (base, midY) → (start, midY)
              let pts = [
                [startX, toSwY(-halfH_world)],
                [baseX,  toSwY(-halfH_world)],
                [baseX,  toSwY(-arrowHalf_w)],
                [endX,   toSwY(0)],
                [baseX,  midY],
                [startX, midY],
              ];

              // ---- Vertical bounds: ensure top ≥ pY and grow height if bottom overflows ----
              let minY = Infinity, maxY = -Infinity;
              for (const [, y] of pts) { if (y < minY) minY = y; if (y > maxY) maxY = y; }

              // Shift down if the top goes above padding
              const shiftDown = Math.max(0, pY - minY);
              if (shiftDown) pts = pts.map(([x, y]) => [x, y + shiftDown]);

              minY += shiftDown; maxY += shiftDown;

              const wantBottom = h - pY;                  // we want at least pY padding at bottom
              const extraH = Math.max(0, Math.ceil(maxY - wantBottom));
              const svgH = h + extraH;

              // ---- Horizontal bounds: keep padding at right; grow width if needed ----
              let minX = Infinity, maxX = -Infinity;
              for (const [x] of pts) { if (x < minX) minX = x; if (x > maxX) maxX = x; }

              const wantRight = w - basePad;
              const extraW = Math.max(0, Math.ceil(maxX - wantRight));
              const svgW = w + extraW;

              // If left edge tighter than basePad, shift right a bit
              const needLeftShift = Math.max(0, basePad - minX);
              if (extraW || needLeftShift) {
                const dx = needLeftShift; // only shift if needed on the left
                if (dx) pts = pts.map(([x, y]) => [x + dx, y]);
              }

              const fillPts = pts.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(' ');

              return (
                <svg
                  width={svgW}
                  height={svgH}
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polygon points={fillPts} fill={fill} stroke="none" />
                  <polygon
                    points={fillPts}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={strokeW}
                    strokeLinejoin="miter"
                    strokeMiterlimit={10}
                    strokeLinecap="butt"
                  />
                </svg>
              );
            }

                // default: unfilled rectangle (for regions) or filled small rect for simple colors
                if (type === 'region') {
                  // region: empty fill, stroke uses the provided color
                  const strokeColor = colorToCss(color);
                  return (
                    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
                      <rect x={0.5} y={0.5} width={w-1} height={h-1} fill="none" stroke={strokeColor || colorToCss(color)} strokeWidth={1.5} />
                    </svg>
                  );
                }
                return <div style={{ width: w, height: h, background: fill, border: '1px solid #ccc' }} />;
              };

              const formatSim = (v) => {
                if (v === null || v === undefined || v === '') return '';
                if (typeof v === 'number') {
                  if (v >= 0 && v <= 1) return `${Math.round(v * 100)}%`;
                  if (Math.abs(v) < 100) return v.toFixed(2);
                  return `${Math.round(v)}`;
                }
                return String(v);
              };

              const gradientSwatchWithEndpoints = (paletteArray, minVal, maxVal, label) => {
                if (!Array.isArray(paletteArray) || paletteArray.length === 0) return null;
                const stopsCss = paletteArray.map((c, i) => `${colorToCss(c)} ${Math.round(100*(i/(paletteArray.length-1)||0))}%`).join(', ');
                const hasEndpoints = (minVal !== undefined && minVal !== null && minVal !== '') || (maxVal !== undefined && maxVal !== null && maxVal !== '');
                return (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ width: '120px', height: '14px', background: `linear-gradient(90deg, ${stopsCss})`, border: '1px solid #ccc' }} />
                      <div style={{ fontSize: '11px' }}>{label}</div>
                    </div>
                    {hasEndpoints && (
                      <div style={{ width: '120px', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: 1, height: 8, background: '#333', marginBottom: 2 }} />
                          <div style={{ fontSize: '10px', color: '#666' }}>{formatSim(minVal)}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: 1, height: 8, background: '#333', marginBottom: 2 }} />
                          <div style={{ fontSize: '10px', color: '#666' }}>{formatSim(maxVal)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              };

              const parts = [];

              // Genes
              if (genePalette && genePalette.enabled) {
                const items = (legend && legend.genes && Array.isArray(legend.genes)) ? legend.genes : null;
                const sortedGenes = items ? sortItemsByValue(items) : items;
                if (sortedGenes && sortedGenes.length > 0) {
                  parts.push(
                    <div key="genes" style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600' }}>Gene families</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', justifyContent: 'center' }}>
                        {sortedGenes.slice(0,24).map((it, i) => (
                          <div key={`gene-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {svgSwatch(it.color, 'arrow', 18, 12, it.stroke)}
                            <div style={{ fontSize: '11px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(it.value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              }

              // Phylo labels
              if (phyloPalette && phyloPalette.enabled) {
                const items = (legend && legend.phylo && Array.isArray(legend.phylo)) ? legend.phylo : null;
                const sortedPhylo = items ? sortItemsByValue(items) : items;
                if (sortedPhylo && sortedPhylo.length > 0) {
                  parts.push(
                    <div key="phylo" style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600' }}>Phylo labels</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', justifyContent: 'center' }}>
                        {sortedPhylo.slice(0,24).map((it, i) => (
                          <div key={`phylo-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {svgSwatch(it.color, 'rect', 18, 12, it.stroke)}
                            <div style={{ fontSize: '11px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(it.value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              }

              // ncRNAs - prefer live legend.ncRNAs
              const ncItemsLive = legend && legend.ncRNAs ? legend.ncRNAs : null;
              if (ncItemsLive && Array.isArray(ncItemsLive) && ncItemsLive.length > 0) {
                const normalizedNc = ncItemsLive.map(x => ({ label: x.label, color: x.color, stroke: x.stroke }));
                const sortedNc = sortItemsByValue(normalizedNc);
                parts.push(
                  <div key="ncrna-live" style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600' }}>ncRNAs</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', justifyContent: 'center' }}>
                        {sortedNc.slice(0,24).map((it, i) => (
                        <div key={`ncrna-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {svgSwatch(it.color, 'half-arrow', 18, 12, it.stroke)}
                          <div style={{ fontSize: '11px' }}>{String(it.label)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              // Regions - prefer live legend.regions when provided
              if (regionPalette && regionPalette.enabled) {
                const regions = legend && legend.regions ? legend.regions : null;
                if (regions && typeof regions === 'object') {
                  // regions may be an object mapping name->color array
                  const entries = Array.isArray(regions) ? regions : Object.entries(regions);
                  // normalize to [label,color]
                  const normalized = Array.isArray(regions)
                    ? regions
                    : Object.entries(regions).map(([k, c]) => [k, c]);
                  if (normalized.length > 0) {
                    parts.push(
                      <div key="regions" style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600' }}>Regions</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', justifyContent: 'center' }}>
                          {normalized.sort((a,b) => compareAny(a[0], b[0])).slice(0,24).map(([k, c], i) => (
                            <div key={`region-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {svgSwatch(c, 'region', 18, 12, c && c.stroke ? c.stroke : null)}
                              <div style={{ fontSize: '11px' }}>{String(k)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                }
              }

              // Links - grouped under a Links title with Protein and Nucleotide subsections
              
                const protParts = [];
                const nucParts = [];

                if (proteinLinkConfig) {
                  const cfg = proteinLinkConfig;
                  if (cfg.colorBy === 'source_gene' || cfg.colorBy === 'target_gene') {
                    // when coloring by source/target gene show the palette derived from mapping colors
                    const mapping = legend && legend.proteinLinks && Array.isArray(legend.proteinLinks.mapping) ? legend.proteinLinks.mapping : null;
                    if (mapping && mapping.length > 0) {
                      const pal = mapping.map(m => Array.isArray(m.color) ? m.color : (typeof m.color === 'string' ? m.color : [0,0,0,255]));
                      protParts.push(
                        <div key="prot-gene-pal">
                          {gradientSwatchWithEndpoints(pal, '', '', cfg.colorBy === 'source_gene' ? 'AA align' : 'AA align')}
                        </div>
                      );
                    }
                  } else {
                  if (!(cfg.colorBy === 'source_gene' || cfg.colorBy === 'target_gene')) {
                    if (cfg.colorBy === 'identity_gradient' && cfg.palette && cfg.palette.enabled) {
                      const pal = cfg.palette ? getPaletteColors(cfg.palette.name, cfg.palette.numColors || 8, cfg.palette.reverse || false) : [];
                      const legendLabel = 'AA align';
                      protParts.push(
                        <div key="prot-grad">
                          {gradientSwatchWithEndpoints(pal, legend && legend.proteinLinks ? legend.proteinLinks.minSim : '', legend && legend.proteinLinks ? legend.proteinLinks.maxSim : '', legendLabel)}
                        </div>
                      );
                    } else if (cfg.colorBy === 'identity_solid' || cfg.colorBy === 'solid' || cfg.solidColor) {
                      const base = cfg.solidColor || [200,200,200,255];
                      if (cfg.useAlpha && typeof cfg.minAlpha === 'number' && typeof cfg.maxAlpha === 'number' && cfg.minAlpha !== cfg.maxAlpha) {
                        const c0 = colorToCss(base, cfg.minAlpha);
                        const c1 = colorToCss(base, cfg.maxAlpha);
                        protParts.push(
                          <div key="prot-alpha" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ width: '120px', height: '14px', background: `linear-gradient(90deg, ${c0}, ${c1})`, border: '1px solid #ccc' }} />
                            <div style={{ fontSize: '11px' }}>AA align</div>
                          </div>
                        );
                      } else {
                        protParts.push(
                          <div key="prot-solid" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                            {svgSwatch(base, 'rect', 24, 12)}
                            <div style={{ fontSize: '11px' }}>AA align</div>
                          </div>
                        );
                      }
                    }
                  }
                }

                if (nucleotideLinkConfig) {
                  const cfg = nucleotideLinkConfig;
                  if (!(cfg.colorBy === 'source_gene' || cfg.colorBy === 'target_gene')) {
                    if (cfg.colorBy === 'identity_gradient' && cfg.palette && cfg.palette.enabled) {
                      const pal = cfg.palette ? getPaletteColors(cfg.palette.name, cfg.palette.numColors || 8, cfg.palette.reverse || false) : [];
                      const legendLabel = 'NT align';
                      nucParts.push(
                        <div key="nuc-grad">
                          {gradientSwatchWithEndpoints(pal, legend && legend.nucleotideLinks ? legend.nucleotideLinks.minSim : '', legend && legend.nucleotideLinks ? legend.nucleotideLinks.maxSim : '', legendLabel)}
                        </div>
                      );
                    } else {
                      const base = cfg.solidColor || [200,200,200,255];
                      if (cfg.useAlpha && typeof cfg.minAlpha === 'number' && typeof cfg.maxAlpha === 'number' && cfg.minAlpha !== cfg.maxAlpha) {
                        const c0 = colorToCss(base, cfg.minAlpha);
                        const c1 = colorToCss(base, cfg.maxAlpha);
                        nucParts.push(
                          <div key="nuc-alpha" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ width: '120px', height: '14px', background: `linear-gradient(90deg, ${c0}, ${c1})`, border: '1px solid #ccc' }} />
                            <div style={{ fontSize: '11px' }}>NT align</div>
                          </div>
                        );
                      } else {
                        nucParts.push(
                          <div key="nuc-solid" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                            {svgSwatch(base, 'rect', 24, 12)}
                            <div style={{ fontSize: '11px' }}>NT align</div>
                          </div>
                        );
                      }
                    }
                  }
                }

                if (protParts.length > 0 || nucParts.length > 0) {
                  parts.push(
                    <div key="links" style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600' }}>Links</div>
                      <div style={{ marginTop: '6px' }}>
                        {protParts.length > 0 && (
                          <div style={{ marginBottom: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: '11px', fontWeight: '600' }}>Protein links</div>
                            <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>{protParts}</div>
                          </div>
                        )}
                        {nucParts.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: '11px', fontWeight: '600' }}>Nucleotide links</div>
                            <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>{nucParts}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              }

              if (parts.length === 0) return <div style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>No legend entries available</div>;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                  {parts}
                </div>
              );
            })()}
          </div>
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
      
      {/* Only render PhyloTreeViewer when data is loaded */}
      {!dataLoading && (
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
        regionPalette={regionPalette}
        proteinLinkConfig={proteinLinkConfig}
        nucleotideLinkConfig={nucleotideLinkConfig}
          styleConfig={styleConfig}
          treeXScale={treeXScale}
    onLegendChange={(legend) => setViewerLegend(legend)}
      />
      )}
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
