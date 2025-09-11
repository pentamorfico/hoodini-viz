import React, { useState, useEffect, useRef } from 'react'
//import './App.css'
import PhyloTreeViewer from './components/PhyloTreeViewer';
import ColorPaletteWidget from './widgets/ColorPaletteWidget';
import LinkColorWidget from './widgets/LinkColorWidget';
import LegendWidget from './widgets/LegendWidget';
// theme is provided at the app root (App.tsx)
import { parseGFF } from './utils/parseGFF';
import { parseLinks } from './utils/parseLinks';
import { parseNucleotideLinks } from './utils/parseNucleotideLinks';
import { parseDomains } from './utils/parseDomains';
import parseBaselines from './utils/parseBaselines';
import parseProteinMetadata from './utils/parseProteinMetadata';
import { parseDomainsMetadata } from './utils/parseDomainsMetadata';
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
import defaultDomainsMetadata from './data/defaultDomainsMetadata.txt?raw';
import defaultTreeMetadata from './data/defaultTreeMetadata.txt?raw';


// Toggle data source behavior:
// If true, the app will prefer Parquet files located in public/data/ (falling back to text parsers if parquet is missing).
// If false, the app will force using the text/TSV parsers from src/data and will not attempt to fetch Parquet files.
const PREFER_PUBLIC_PARQUET = false;

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
        if (Array.isArray(arr) && arr.length) return arr;
      } catch (e) {
        console.warn('[hyparquet] failed to read', url, e && e.message ? e.message : e);
      }
    }
  } catch (e) {
    // silent: hyparquet not installed or import failed
  }
}


function App(props) {
  // Use ultrametric from props when provided (App.tsx passes it); fall back to local state for standalone use
  const propUltrametric = props && typeof props.ultrametric !== 'undefined' ? props.ultrametric : undefined;
  useEffect(() => {
    if (typeof propUltrametric !== 'undefined') console.debug('[AppPhylo] received prop ultrametric ->', propUltrametric);
  }, [propUltrametric]);
  const propSetUltrametric = props && typeof props.setUltrametric === 'function' ? props.setUltrametric : undefined;
  const [localUltrametric, setLocalUltrametric] = useState(false);
  const ultrametric = typeof propUltrametric !== 'undefined' ? propUltrametric : localUltrametric;
  const setUltrametric = typeof propSetUltrametric === 'function' ? propSetUltrametric : setLocalUltrametric;

  const [newickStr, setNewickStr] = useState(defaultNewick);
  const [showScrollbar, setShowScrollbar] = useState(false);
  const [alignCluster, setAlignCluster] = useState(null); // Set to null by default - no cluster alignment
  const [useDefaultGeneAlignment, setUseDefaultGeneAlignment] = useState(true); // Enable default gene alignment by default
  const [showRuler, setShowRuler] = useState(true); // New state to control ruler visibility
  const [treeLabelBy, setTreeLabelBy] = useState("species");
  const [treeColorBy, setTreeColorBy] = useState("species");
  const [showConnectingLines, setShowConnectingLines] = useState(false); // New state to control connecting lines
  const [defaultAlign, setDefaultAlign] = useState('start'); // Add state for default alignment
  const [phyloLabelPosition, setPhyloLabelPosition] = useState('after-tree'); // New state to control phylo label positioning
  const [alignLabels, setAlignLabels] = useState(true); // New state to control phylo label alignment
  const [arrowheadHeight, setArrowheadHeight] = useState(0); // New state to control gene arrowhead height
  const [geneHeight, setGeneHeight] = useState(60); // New state to control gene height
  const [geneLabelPosition, setGeneLabelPosition] = useState('bottom'); // 'bottom' | 'center' | 'top'
  
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
    // Only initialize internal display state when the parent hasn't provided
    // explicit display props (e.g., committed values from the top-level App).
    // When parent provides `props.arrowheadHeightDisplay` / `props.geneHeightDisplay`
    // we should not overwrite or set local state which would force an extra render.
    if (typeof props.arrowheadHeightDisplay === 'undefined') {
      setArrowheadHeightDisplay(arrowheadHeight);
    }
    if (typeof props.geneHeightDisplay === 'undefined') {
      setGeneHeightDisplay(geneHeight);
    }
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

  // Respect prop-driven palettes (mirror ultrametric pattern)
  const propGenePalette = props && typeof props.genePalette !== 'undefined' ? props.genePalette : undefined;
  const propDomainPalette = props && typeof props.domainPalette !== 'undefined' ? props.domainPalette : undefined;
  const propPhyloPalette = props && typeof props.phyloPalette !== 'undefined' ? props.phyloPalette : undefined;
  const propNcRNAPalette = props && typeof props.ncRNAPalette !== 'undefined' ? props.ncRNAPalette : undefined;
  const propRegionPalette = props && typeof props.regionPalette !== 'undefined' ? props.regionPalette : undefined;

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
  // Use the ref from props if provided, otherwise create our own
  const internalPhyloTreeViewerRef = useRef(null);
  const phyloTreeViewerRef = props?.phyloTreeViewerRef || internalPhyloTreeViewerRef;
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
        genePalette: propGenePalette ?? genePalette,
        domainPalette: propDomainPalette ?? domainPalette,
        phyloPalette: propPhyloPalette ?? phyloPalette,
        ncRNAPalette: propNcRNAPalette ?? ncRNAPalette,
        regionPalette: propRegionPalette ?? regionPalette
      }
    };
  }, [coreConfig, arrowheadHeight, geneHeight, genePalette, domainPalette, phyloPalette, ncRNAPalette, regionPalette, propGenePalette, propDomainPalette, propPhyloPalette, propNcRNAPalette, propRegionPalette]);

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
    if (!props.setSelectedGene || !object) return;
    
    // Only handle gene objects, not regions or other features
    const isGene = object.type === 'gene' || (object?.metadata && !object.type?.includes('region'));
    if (!isGene) return;
    
    // Pass through ALL metadata that's available, don't filter it
    const meta = object.metadata || {};
    
    // Only clean up the gene_id to remove hood prefix if needed
    let cleanGeneId = meta.gene_id || meta.id;
    if (cleanGeneId && typeof cleanGeneId === 'string' && cleanGeneId.includes('_')) {
      // Remove hood prefix (e.g., "8_WP_105994699.1" -> "WP_105994699.1")
      const parts = cleanGeneId.split('_');
      if (parts.length > 1 && /^\d+$/.test(parts[0])) { // First part is just a number
        cleanGeneId = parts.slice(1).join('_');
      }
    }
    
    // Create a clean metadata object with all original data but clean gene_id
    const safeMetadata = {
      ...meta, // Keep ALL existing metadata
      gene_id: cleanGeneId, // Use cleaned gene_id
    };

    const selected = {
      type: 'gene',
      id: cleanGeneId || object.uniqueId || `${object.start}-${object.end}`, // Use clean gene ID
      fillColor: object.fillColor || object.color,
      metadata: safeMetadata
    };
    props.setSelectedGene(selected);
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
  const [parsedDomainMetadata, setParsedDomainMetadata] = React.useState({});
  const [dataLoading, setDataLoading] = React.useState(true);
  
  React.useEffect(() => {
    const loadData = async () => {
  const loadStart = performance.now();
  console.log('[perf] loadData start', new Date().toISOString());
  setDataLoading(true);

      // Create parser worker once per load cycle
      let parserWorker = null;
      try {
        parserWorker = new Worker(new URL('./workers/parser.worker.js', import.meta.url), { type: 'module' });
      } catch (e) {
        console.warn('[data] failed to create parser worker, falling back to main-thread parsing', e);
        parserWorker = null;
      }

      const runWorker = (type, text, config) => new Promise((resolve, reject) => {
        if (!parserWorker) {
          reject(new Error('no worker'));
          return;
        }
        const id = String(Math.random()) + Date.now();
        const handler = (e) => {
          if (!e.data || e.data.id !== id) return;
          parserWorker.removeEventListener('message', handler);
          if (e.data.error) reject(new Error(e.data.error));
          else resolve(e.data.result);
        };
        parserWorker.addEventListener('message', handler);
        parserWorker.postMessage({ id, type, text, config });
      });

      
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
            // Offload heavy parse to worker if available
            let parsed = null;
            if (parserWorker) {
              try { parsed = await runWorker('gff', defaultGFFStr, coreConfig); } catch (e) { parsed = null; }
            }
            if (!parsed) parsed = await parseGFFOptimized(defaultGFFStr, coreConfig);
            return parsed;
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
            let parsed = null;
            if (parserWorker) {
              try { parsed = await runWorker('proteinLinks', defaultProteinLinks); } catch (e) { parsed = null; }
            }
            if (!parsed) parsed = await parseProteinLinksOptimized(defaultProteinLinks);
            return parsed;
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
            let parsed = null;
            if (parserWorker) {
              try { parsed = await runWorker('nucleotideLinks', defaultNucleotideLinks); } catch (e) { parsed = null; }
            }
            if (!parsed) parsed = await parseNucleotideLinksOptimized(defaultNucleotideLinks);
            return parsed;
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
            let parsed = null;
            if (parserWorker) {
              try { parsed = await runWorker('domains', defaultDomains); } catch (e) { parsed = null; }
            }
            if (!parsed) parsed = await parseDomainsOptimized(defaultDomains);
            return parsed;
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
            let parsed = null;
            if (parserWorker) {
              try { parsed = await runWorker('baselines', defaultBaselines); } catch (e) { parsed = null; }
            }
            if (!parsed) parsed = await parseBaselinesOptimized(defaultBaselines);
            return parsed;
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
            let parsed = null;
            if (parserWorker) {
              try { parsed = await runWorker('proteinMetadata', defaultProteinMetadata); } catch (e) { parsed = null; }
            }
            if (!parsed) parsed = await parseProteinMetadataOptimized(defaultProteinMetadata);
            return parsed;
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
            let parsed = null;
            if (parserWorker) {
              try { parsed = await runWorker('treeMetadata', defaultTreeMetadata); } catch (e) { parsed = null; }
            }
            if (!parsed) parsed = await parseTreeMetadataOptimized(defaultTreeMetadata);
            return parsed;
          })(),
          // Domain metadata (expected object keyed by domain_id)
          (async () => {
            if (PREFER_PUBLIC_PARQUET) {
              const p = await tryLoadParquet(`${parquetBase}/defaultDomainsMetadata.parquet`);
              if (p) {
                if (Array.isArray(p)) {
                  console.log('[data] using parquet for defaultDomainsMetadata');
                  const out = {};
                  for (const row of p) { if (row.domain_id) out[row.domain_id] = row; }
                  return out;
                }
                console.log('[data] parquet found for defaultDomainsMetadata but not an array, falling back to text parser');
              } else {
                console.log('[data] no parquet for defaultDomainsMetadata, using text parser');
              }
            } else {
              console.log('[data] PREFER_PUBLIC_PARQUET=false: using text parser for defaultDomainsMetadata');
            }
            let parsed = null;
            if (parserWorker) {
              try { parsed = await runWorker('domainsMetadata', defaultDomainsMetadata); } catch (e) { parsed = null; }
            }
            if (!parsed) parsed = parseDomainsMetadata(defaultDomainsMetadata);
            return parsed;
          })(),
          // NOTE: Non-coding metadata will be derived from the GFF features (ncRNA entries)
          // if a separate defaultNonCodingMetadata file is not provided. We therefore
          // don't include a dedicated non-coding promise here; derivation is done
          // after the GFF is parsed below.
        ];

        // Load all data (parquet preferred, text fallback). Capture raw results in local variables,
        // then run a single conversion + sample printing pass and set state once.
        let rawGff, rawProteinLinks, rawNucleotideLinks, rawDomains, rawBaselines, rawProteinMeta, rawTreeMeta, rawDomainMeta;
        try {
          [rawGff, rawProteinLinks, rawNucleotideLinks, rawDomains, rawBaselines, rawProteinMeta, rawTreeMeta, rawDomainMeta] = await Promise.all(promises);
        } catch (error) {
          console.warn('[data] parquet/text parallel load error, falling back to synchronous parsers:', error && error.message ? error.message : error);
          // fallback to synchronous parsing
          rawGff = parseGFF(defaultGFFStr, coreConfig);
          rawProteinLinks = parseLinks(defaultProteinLinks);
          rawNucleotideLinks = parseNucleotideLinks(defaultNucleotideLinks);
          rawDomains = parseDomains(defaultDomains);
          rawBaselines = parseBaselines(defaultBaselines);
          rawProteinMeta = parseProteinMetadata(defaultProteinMetadata);
          rawDomainMeta = parseDomainsMetadata(defaultDomainsMetadata);
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

  const convertStart = performance.now();
  // Convert all raw datasets once
        const gffClean = convertBigInts(rawGff || []);
        const proteinLinksClean = convertBigInts(rawProteinLinks || []);
        const nucleotideLinksClean = convertBigInts(rawNucleotideLinks || []);
        const domainsClean = convertBigInts(rawDomains || {});
        let baselinesClean = convertBigInts(rawBaselines || []);
        baselinesClean = forceBaselineFieldsNumber(baselinesClean || []);
        const proteinMetaClean = convertBigInts(rawProteinMeta || {});
        const treeMetaClean = convertBigInts(rawTreeMeta || {});
        const domainMetaClean = convertBigInts(rawDomainMeta || {});
        // Derive non-coding metadata from parsed GFF if no separate metadata was provided.
        // Use attributes.ncrna_type when available and normalize any ID-like values.
        let nonCodingMetaClean = {};
        try {
          const ncRNAs = (gffClean || []).filter(f => f && f.type && String(f.type).toLowerCase().includes('ncrna'));

          function extractNcRNAId(attributes) {
            if (!attributes) return null;
            let id = attributes.ID ?? attributes.id ?? attributes.Name ?? null;
            if (!id) return null;
            // If id is an object, try common nested keys
            if (typeof id === 'object') {
              if (id.ID) id = id.ID;
              else if (id.id) id = id.id;
              else if (id.Name) id = id.Name;
              else id = JSON.stringify(id);
            }
            // Strip leading 'ID=' and trailing semicolons, trim
            id = String(id).replace(/^ID=/, '').replace(/;$/, '').trim();
            return id || null;
          }

          for (const feat of ncRNAs) {
            const attrs = feat.attributes || {};
            const id = extractNcRNAId(attrs);
            const ncrnaType = attrs.ncrna_type || attrs.ncrnaType || null;
            if (id) {
              nonCodingMetaClean[id] = { type: ncrnaType || id || 'ncRNA', description: '' };
            }
          }
        } catch (e) {
          nonCodingMetaClean = {};
        }





  // Set state once with cleaned data
  const stateSetStart = performance.now();
        setParsedGFF(gffClean);
        setParsedProteinLinks(proteinLinksClean);
        setParsedNucleotideLinks(nucleotideLinksClean);
        setParsedDomains(domainsClean);
        setParsedBaselines(baselinesClean);
        // Normalize protein metadata to an object keyed by gene_id so downstream
        // consumers (PhyloTreeViewer, legend building, etc.) can rely on a
        // consistent shape regardless of parser output (array vs object).
        let proteinMetaObj = proteinMetaClean;
        if (Array.isArray(proteinMetaClean)) {
          const out = {};
          for (const row of proteinMetaClean) {
            if (row && row.gene_id) out[row.gene_id] = row;
          }
          proteinMetaObj = out;
        }
        setParsedProteinMetadata(proteinMetaObj);
        setParsedTreeMetadata(treeMetaClean);
        setParsedDomainMetadata(domainMetaClean);
        // Propagate metadata column headers to parent (if setters provided)
        try {
          if (props.setGeneMetadataColumns && typeof props.setGeneMetadataColumns === 'function') {
            // proteinMetaObj is normalized to an object keyed by gene_id; take first row keys
            const first = Object.values(proteinMetaObj)[0] || null;
            if (first && typeof first === 'object') {
              const cols = Object.keys(first).filter(c => c !== 'gene_id');
              props.setGeneMetadataColumns(cols.length ? cols : ['cluster']);
            }
          }
        } catch (e) {}
        try {
          if (props.setTreeMetadataColumns && typeof props.setTreeMetadataColumns === 'function') {
            const firstT = Object.values(treeMetaClean)[0] || null;
            if (firstT && typeof firstT === 'object') {
              const colsT = Object.keys(firstT).filter(c => c !== 'leaf_id');
              props.setTreeMetadataColumns(colsT.length ? colsT : ['species']);
            }
          }
        } catch (e) {}
        setParsedNonCodingMetadata(nonCodingMetaClean);
        
        // Report data availability to parent component for conditional switch rendering
        try {
          if (props.setHasGeneData) props.setHasGeneData(gffClean && gffClean.length > 0);
          if (props.setHasDomainData) props.setHasDomainData(domainsClean && Object.keys(domainsClean).length > 0);
          if (props.setHasProteinLinkData) props.setHasProteinLinkData(proteinLinksClean && proteinLinksClean.length > 0);
          if (props.setHasNucleotideLinkData) props.setHasNucleotideLinkData(nucleotideLinksClean && nucleotideLinksClean.length > 0);
          if (props.setHasNcRNAData) props.setHasNcRNAData(nonCodingMetaClean && Object.keys(nonCodingMetaClean).length > 0);
        } catch (e) {
          console.error('Error reporting data availability:', e);
        }
      
      setDataLoading(false);
    };
    
    loadData();
  }, [coreConfig]);

  return (
    <div className="App" style={{ 
      width: '100%', 
      height: '100%', 
      position: 'relative',
      overflow: 'hidden'
    }}>
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
            <div>🚀 Initializing hoodini-viz...</div>
          </div>
        </div>
      )}
      
  
      
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
          showScrollbar={props.showScrollbar ?? showScrollbar}
          alignCluster={props.alignCluster ?? alignCluster}
          defaultAlign={props.defaultAlign ?? defaultAlign}
          useDefaultGeneAlignment={props.useDefaultGeneAlignment ?? useDefaultGeneAlignment}
          showRuler={props.showRuler ?? showRuler}
          onObjectClick={handleObjectClick}
          showSVGWidget={true}
          proteinMetadata={parsedProteinMetadata}
          domainMetadata={parsedDomainMetadata}
          colorBy={props.geneColorBy ?? geneColorBy}
          geneColorBy={props.geneColorBy ?? geneColorBy}
          labelBy={props.geneLabelBy ?? geneLabelBy}
          domainColorBy={props.domainColorBy ?? domainColorBy}
          treeMetadata={parsedTreeMetadata}
          treeLabelBy={props.treeLabelBy ?? treeLabelBy}
          treeColorBy={props.treeColorBy ?? treeColorBy}
          config={props.styleConfig ?? styleConfig}
          ultrametric={ultrametric}
          showConnectingLines={props.showConnectingLines ?? showConnectingLines}
          phyloLabelPosition={props.phyloLabelPosition ?? phyloLabelPosition}
          alignLabels={props.alignLabels ?? alignLabels}
          arrowheadHeightDisplay={props.arrowheadHeightDisplay ?? arrowheadHeightDisplay}
          geneHeightDisplay={props.geneHeightDisplay ?? geneHeightDisplay}
          genePalette={props.genePalette ?? genePalette}
          domainPalette={props.domainPalette ?? domainPalette}
          phyloPalette={props.phyloPalette ?? phyloPalette}
          ncRNAPalette={props.ncRNAPalette ?? ncRNAPalette}
          regionPalette={props.regionPalette ?? regionPalette}
          proteinLinkConfig={props.proteinLinkConfig ?? proteinLinkConfig}
          nucleotideLinkConfig={props.nucleotideLinkConfig ?? nucleotideLinkConfig}
          styleConfig={props.styleConfig ?? styleConfig}
          treeXScale={props.treeXScale ?? treeXScale}
          showTreeLayer={props.showTreeLayer}
          showGeneLayer={props.showGeneLayer}
          showDomainLayer={props.showDomainLayer}
          showProteinLinkLayer={props.showProteinLinkLayer}
          showNucleotideLinkLayer={props.showNucleotideLinkLayer}
          showNcRNALayer={props.showNcRNALayer}
          showGeneTextLayer={props.showGeneTextLayer}
          showTreeTextLayer={props.showTreeTextLayer}
          geneLabelPosition={props.geneLabelPosition ?? geneLabelPosition}
          onLegendChange={(legend) => {
            try {
              console.debug('[AppPhylo] onLegendChange received legend payload keys=', legend && Object.keys(legend || {}));
              if (props && typeof props.setViewerLegend === 'function') {
                props.setViewerLegend(legend);
              } else {
                setViewerLegend(legend);
              }
            } catch (e) {
              try { console.debug('[AppPhylo] fallback setViewerLegend'); setViewerLegend(legend); } catch (e2) {}
            }
          }}
          />
      )}
    </div>
  );
}

export default App;
