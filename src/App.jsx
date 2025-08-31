import React, { useState, useEffect, useRef } from 'react'
import './App.css'
import PhyloTreeViewer from './components/PhyloTreeViewer';
import ThemeToggle from './components/ThemeToggle';
import ColorPaletteWidget from './widgets/ColorPaletteWidget';
import LinkColorWidget from './widgets/LinkColorWidget';
import LegendWidget from './widgets/LegendWidget';
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


// Toggle data source behavior:
// If true, the app will prefer Parquet files located in public/data/ (falling back to text parsers if parquet is missing).
// If false, the app will force using the text/TSV parsers from src/data and will not attempt to fetch Parquet files.
const PREFER_PUBLIC_PARQUET = true;

async function tryLoadParquet(url) {
  // First try hyparquet if available (parquetReadObjects returns row objects)
  try {
    const hy = await import('hyparquet');
    if (hy && typeof hy.parquetReadObjects === 'function') {
      try {
        // If embedded data exists, use it first (helps single-file builds)
        let ab;
        try {
          const embedded = await import('./embeddedData.js');
          const key = url.split('/').pop();
          if (embedded && embedded.default && embedded.default[key]) {
            const b64 = embedded.default[key];
            const binStr = atob(b64);
            const len = binStr.length;
            const u8 = new Uint8Array(len);
            for (let i = 0; i < len; ++i) u8[i] = binStr.charCodeAt(i);
            ab = u8.buffer;
          }
        } catch (e) {
          // no embedded data available; fall back to fetch
        }
        if (!ab) {
          const res = await fetch(url);
          if (!res.ok) throw new Error('no parquet at ' + url);
          ab = await res.arrayBuffer();
        }
        // hyparquet expects an AsyncBuffer-like object; pass the raw ArrayBuffer as { file: ab }
        const arr = await hy.parquetReadObjects({ file: ab });
        console.log('[hyparquet] parsed', url, { isArray: Array.isArray(arr), len: arr && arr.length });
        if (Array.isArray(arr) && arr.length) return arr;
      } catch (e) {
        console.warn('[hyparquet] failed to read', url, e && e.message ? e.message : e);
      }
    }
  } catch (e) {
    // silent: hyparquet not installed or import failed
  }
}


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

      
  // Try to load parquet files from public/data/ first. If missing or parse fails, fall back to optimized text parsers.
  const parquetBase = '/data';

        const promises = [
          // GFF (parquet or raw)
          (async () => {
            if (PREFER_PUBLIC_PARQUET) {
              const p = await tryLoadParquet(`${parquetBase}/defaultGFF.parquet`);
              if (p) {
                if (Array.isArray(p)) {
                  console.log('[data] using parquet for defaultGFF');
                  return p;
                }
                console.log('[data] parquet found for defaultGFF but not an array (Arrow table?), falling back to text parser');
              } else {
                console.log('[data] no parquet for defaultGFF, using text parser');
              }
            } else {
              console.log('[data] PREFER_PUBLIC_PARQUET=false: using text parser for defaultGFF');
            }
            return parseGFFOptimized(defaultGFFStr, coreConfig);
          })(),
          // Protein links
          (async () => {
            if (PREFER_PUBLIC_PARQUET) {
              const p = await tryLoadParquet(`${parquetBase}/defaultProteinLinks.parquet`);
              if (p) {
                if (Array.isArray(p)) { console.log('[data] using parquet for defaultProteinLinks'); return p; }
                console.log('[data] parquet found for defaultProteinLinks but not an array, falling back to text parser');
              } else {
                console.log('[data] no parquet for defaultProteinLinks, using text parser');
              }
            } else {
              console.log('[data] PREFER_PUBLIC_PARQUET=false: using text parser for defaultProteinLinks');
            }
            return parseProteinLinksOptimized(defaultProteinLinks);
          })(),
          // Nucleotide links
          (async () => {
            if (PREFER_PUBLIC_PARQUET) {
              const p = await tryLoadParquet(`${parquetBase}/defaultNucleotideLinks.parquet`);
              if (p) {
                if (Array.isArray(p)) { console.log('[data] using parquet for defaultNucleotideLinks'); return p; }
                console.log('[data] parquet found for defaultNucleotideLinks but not an array, falling back to text parser');
              } else {
                console.log('[data] no parquet for defaultNucleotideLinks, using text parser');
              }
            } else {
              console.log('[data] PREFER_PUBLIC_PARQUET=false: using text parser for defaultNucleotideLinks');
            }
            return parseNucleotideLinksOptimized(defaultNucleotideLinks);
          })(),
          // Domains
          (async () => {
            if (PREFER_PUBLIC_PARQUET) {
              const p = await tryLoadParquet(`${parquetBase}/defaultDomains.parquet`);
              if (p) {
                if (Array.isArray(p)) { console.log('[data] using parquet for defaultDomains'); return p; }
                console.log('[data] parquet found for defaultDomains but not an array, falling back to text parser');
              } else {
                console.log('[data] no parquet for defaultDomains, using text parser');
              }
            } else {
              console.log('[data] PREFER_PUBLIC_PARQUET=false: using text parser for defaultDomains');
            }
            return parseDomainsOptimized(defaultDomains);
          })(),
          // Baselines
          (async () => {
            if (PREFER_PUBLIC_PARQUET) {
              const p = await tryLoadParquet(`${parquetBase}/defaultBaselines.parquet`);
              if (p) {
                if (Array.isArray(p)) { console.log('[data] using parquet for defaultBaselines'); return p; }
                console.log('[data] parquet found for defaultBaselines but not an array, falling back to text parser');
              } else {
                console.log('[data] no parquet for defaultBaselines, using text parser');
              }
            } else {
              console.log('[data] PREFER_PUBLIC_PARQUET=false: using text parser for defaultBaselines');
            }
            return parseBaselinesOptimized(defaultBaselines);
          })(),
          // Protein metadata (expected object keyed by gene_id)
          (async () => {
            if (PREFER_PUBLIC_PARQUET) {
              const p = await tryLoadParquet(`${parquetBase}/defaultProteinMetadata.parquet`);
              if (p) {
                if (Array.isArray(p)) {
                  console.log('[data] using parquet for defaultProteinMetadata');
                  const out = {};
                  for (const row of p) { if (row.gene_id) out[row.gene_id] = row; }
                  return out;
                }
                console.log('[data] parquet found for defaultProteinMetadata but not an array, falling back to text parser');
              } else {
                console.log('[data] no parquet for defaultProteinMetadata, using text parser');
              }
            } else {
              console.log('[data] PREFER_PUBLIC_PARQUET=false: using text parser for defaultProteinMetadata');
            }
            return parseProteinMetadataOptimized(defaultProteinMetadata);
          })(),
          // Tree metadata
          (async () => {
            if (PREFER_PUBLIC_PARQUET) {
              const p = await tryLoadParquet(`${parquetBase}/defaultTreeMetadata.parquet`);
              if (p) {
                if (Array.isArray(p)) {
                  console.log('[data] using parquet for defaultTreeMetadata');
                  const out = {};
                  for (const row of p) { const key = row.leaf_id || Object.values(row)[0]; if (key) out[key] = row; }
                  return out;
                }
                console.log('[data] parquet found for defaultTreeMetadata but not an array, falling back to text parser');
              } else {
                console.log('[data] no parquet for defaultTreeMetadata, using text parser');
              }
            } else {
              console.log('[data] PREFER_PUBLIC_PARQUET=false: using text parser for defaultTreeMetadata');
            }
            return parseTreeMetadataOptimized(defaultTreeMetadata);
          })(),
          // Non-coding metadata
          (async () => {
            if (PREFER_PUBLIC_PARQUET) {
              const p = await tryLoadParquet(`${parquetBase}/defaultNonCodingMetadata.parquet`);
              if (p) {
                if (Array.isArray(p)) {
                  console.log('[data] using parquet for defaultNonCodingMetadata');
                  const out = {};
                  for (const row of p) {
                    const id = row[0] || row.id || Object.values(row)[0];
                    if (id) out[id] = { type: row[1], description: row[2] };
                  }
                  return out;
                }
                console.log('[data] parquet found for defaultNonCodingMetadata but not an array, falling back to text parser');
              } else {
                console.log('[data] no parquet for defaultNonCodingMetadata, using text parser');
              }
            } else {
              console.log('[data] PREFER_PUBLIC_PARQUET=false: using text parser for defaultNonCodingMetadata');
            }
            return parseNonCodingMetadataOptimized(defaultNonCodingMetadata || '');
          })()
        ];

        // Load all data (parquet preferred, text fallback). Capture raw results in local variables,
        // then run a single conversion + sample printing pass and set state once.
        let rawGff, rawProteinLinks, rawNucleotideLinks, rawDomains, rawBaselines, rawProteinMeta, rawTreeMeta, rawNonCodingMeta;
        try {
          [rawGff, rawProteinLinks, rawNucleotideLinks, rawDomains, rawBaselines, rawProteinMeta, rawTreeMeta, rawNonCodingMeta] = await Promise.all(promises);
        } catch (error) {
          console.warn('[data] parquet/text parallel load error, falling back to synchronous parsers:', error && error.message ? error.message : error);
          // fallback to synchronous parsing
          rawGff = parseGFF(defaultGFFStr, coreConfig);
          rawProteinLinks = parseLinks(defaultProteinLinks);
          rawNucleotideLinks = parseNucleotideLinks(defaultNucleotideLinks);
          rawDomains = parseDomains(defaultDomains);
          rawBaselines = parseBaselines(defaultBaselines);
          rawProteinMeta = parseProteinMetadata(defaultProteinMetadata);
          rawTreeMeta = parseTreeMetadata(defaultTreeMetadata);
          rawNonCodingMeta = {};
        }

        // Helper to convert BigInt fields to numbers recursively
        function convertBigInts(obj) {
          if (Array.isArray(obj)) return obj.map(convertBigInts);
          if (obj && typeof obj === 'object') {
            const out = {};
            for (const k in obj) {
              const v = obj[k];
              if (typeof v === 'bigint') out[k] = Number(v);
              else if (Array.isArray(v) || (v && typeof v === 'object')) out[k] = convertBigInts(v);
              else out[k] = v;
            }
            return out;
          }
          return obj;
        }

        function forceBaselineFieldsNumber(arr) {
          return (arr || []).map(b => {
            const out = { ...b };
            ['hood_id', 'start', 'end'].forEach(k => {
              if (typeof out[k] === 'bigint') out[k] = Number(out[k]);
              else if (typeof out[k] === 'string') out[k] = Number(out[k]);
            });
            return out;
          });
        }

        // Convert all raw datasets once
        const gffClean = convertBigInts(rawGff || []);
        const proteinLinksClean = convertBigInts(rawProteinLinks || []);
        const nucleotideLinksClean = convertBigInts(rawNucleotideLinks || []);
        const domainsClean = convertBigInts(rawDomains || {});
        let baselinesClean = convertBigInts(rawBaselines || []);
        baselinesClean = forceBaselineFieldsNumber(baselinesClean || []);
        const proteinMetaClean = convertBigInts(rawProteinMeta || {});
        const treeMetaClean = convertBigInts(rawTreeMeta || {});
        const nonCodingMetaClean = convertBigInts(rawNonCodingMeta || {});

        // Debug: print types of baseline fields
        if (baselinesClean && baselinesClean.length) {
          for (let i = 0; i < Math.min(3, baselinesClean.length); ++i) {
            const b = baselinesClean[i];
            console.log(`[debug] baseline[${i}] hood_id type:`, typeof b.hood_id, 'start type:', typeof b.start, 'end type:', typeof b.end);
          }
        }

        // Print a sample of each loaded object (cleaned)
        function printSample(label, obj) {
          if (Array.isArray(obj)) {
            if (obj.length === 0) console.log(`[sample] ${label}: (empty array)`);
            else {
              console.log(`[sample] ${label} (first 3):`);
              obj.slice(0, 3).forEach((item, idx) => console.log(`  [${idx}]`, item));
            }
          } else if (obj && typeof obj === 'object') {
            const keys = Object.keys(obj);
            if (keys.length === 0) console.log(`[sample] ${label}: (empty object)`);
            else keys.slice(0, 3).forEach((key, idx) => console.log(`  [${idx}] ${key}:`, obj[key]));
          } else console.log(`[sample] ${label}:`, obj);
        }

        printSample('GFF', gffClean);
        printSample('ProteinLinks', proteinLinksClean);
        printSample('NucleotideLinks', nucleotideLinksClean);
        printSample('Domains', domainsClean);
        printSample('Baselines', baselinesClean);
        printSample('ProteinMetadata', proteinMetaClean);
        printSample('TreeMetadata', treeMetaClean);
        printSample('NonCodingMetadata', nonCodingMetaClean);

        // Set state once with cleaned data
        setParsedGFF(gffClean);
        setParsedProteinLinks(proteinLinksClean);
        setParsedNucleotideLinks(nucleotideLinksClean);
        setParsedDomains(domainsClean);
        setParsedBaselines(baselinesClean);
        setParsedProteinMetadata(proteinMetaClean);
        setParsedTreeMetadata(treeMetaClean);
        setParsedNonCodingMetadata(nonCodingMetaClean);
      
      setDataLoading(false);
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

          {/* Legend Widget (compensate for parent padding to use full panel width) */}
          <LegendWidget
            legend={viewerLegend || (phyloTreeViewerRef.current && typeof phyloTreeViewerRef.current.getLegendData === 'function'
              ? phyloTreeViewerRef.current.getLegendData()
              : null)}
            styleConfig={styleConfig}
            genePalette={genePalette}
            phyloPalette={phyloPalette}
            regionPalette={regionPalette}
            proteinLinkConfig={proteinLinkConfig}
            nucleotideLinkConfig={nucleotideLinkConfig}
            width="calc(100% + 20px)"
            height="60vh"
            style={{ paddingTop: '6px', marginLeft: '-10px', marginRight: '-10px' }}
          />
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
