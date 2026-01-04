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
import DataGridView from './components/DataGridView.jsx';

import defaultGFFParquetUrl from './data/defaultGFF.parquet?url';
import defaultProteinLinksParquetUrl from './data/defaultProteinLinks.parquet?url';
import defaultNucleotideLinksParquetUrl from './data/defaultNucleotideLinks.parquet?url';
import defaultDomainsParquetUrl from './data/defaultDomains.parquet?url';
import defaultBaselinesParquetUrl from './data/defaultBaselines.parquet?url';
import defaultProteinMetadataParquetUrl from './data/defaultProteinMetadata.parquet?url';
import defaultDomainsMetadataParquetUrl from './data/defaultDomainsMetadata.parquet?url';
import defaultTreeMetadataParquetUrl from './data/defaultTreeMetadata.parquet?url';
import ParserWorker from './workers/parser.worker.js?worker&inline';

// Text fallbacks disabled: we rely on parquet. Leave empty strings to keep parser signatures.
const defaultGFFStr = '';
const defaultProteinLinks = '';
const defaultNucleotideLinks = '';
const defaultDomains = '';
const defaultBaselines = '';
const defaultProteinMetadata = '';
const defaultDomainsMetadata = '';
const defaultTreeMetadata = '';


// Toggle data source behavior:
// If true, the app will prefer Parquet files located in public/data/ (falling back to text parsers if parquet is missing).
// If false, the app will force using the text/TSV parsers from src/data and will not attempt to fetch Parquet files.
const PREFER_PUBLIC_PARQUET = true;

async function tryLoadParquet(url) {
  if (!url) return null;
  // First try hyparquet if available (parquetReadObjects returns row objects)
  try {
    const hy = await import('hyparquet');
    let compressors;
    try {
      const comp = await import('hyparquet-compressors');
      compressors = comp?.compressors;
    } catch (e) {
      // fallback: no compressors available
    }
    if (hy && typeof hy.parquetReadObjects === 'function') {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('no parquet at ' + url);
        const ab = await res.arrayBuffer();
        // hyparquet expects an AsyncBuffer-like object; pass the raw ArrayBuffer as { file: ab }
        const arr = await hy.parquetReadObjects({ file: ab, compressors });
        if (Array.isArray(arr)) return arr;
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

  const [newickStr, setNewickStr] = useState('');
  const [newickLoading, setNewickLoading] = useState(true);
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

  // Load Newick from bundled data
  useEffect(() => {
    let cancelled = false;
    const loadNewick = async () => {
      // Try props URL first if provided
      if (props.newickUrl) {
        try {
          const res = await fetch(props.newickUrl);
          if (res.ok) {
            const text = await res.text();
            if (!cancelled) {
              setNewickStr(text);
              setNewickLoading(false);
            }
            return;
          }
        } catch (e) {
          console.warn('[data] failed to load newick from props URL', e?.message || e);
        }
      }
      // Use bundled fallback
      try {
        const mod = await import('./data/defaultNewick.txt?raw');
        const fallback = mod?.default || mod;
        if (!cancelled && fallback) setNewickStr(fallback);
      } catch (e) {
        if (!cancelled) console.error('[data] no newick fallback available', e?.message || e);
      } finally {
        if (!cancelled) setNewickLoading(false);
      }
    };
    loadNewick();
    return () => { cancelled = true; };
  }, [props.newickUrl]);
  
  // Gene and domain selection states
  const [geneColorBy, setGeneColorBy] = useState('cluster'); // Gene coloring field selection
  const [geneLabelBy, setGeneLabelBy] = useState('cluster'); // Gene labeling field selection
  const [domainColorBy, setDomainColorBy] = useState('evalue'); // Domain coloring field selection
  const [labelRefreshCounter, setLabelRefreshCounter] = useState(0); // bump to force text layer refresh
  
  // Color palette states - configured for Set2 palette
  const [genePalette, setGenePalette] = useState({
    type: 'qualitative',
    name: 'Set2',
    numColors: 8,
    reverse: false,
    enabled: true
  });
  const [domainPalette, setDomainPalette] = useState({
    type: 'sequential',
    name: 'Gray',
    numColors: 9,
    reverse: false,
    enabled: true,
    alphaRange: [0.2, 0.5]
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

  // When domainPalette changes, try to apply it directly to the viewer's GenomeView
  // This ensures changes like alphaRange take effect immediately on rendered domains.
  // The effect is placed after the phyloTreeViewerRef declaration to avoid TDZ ReferenceErrors.
  useEffect(() => {
    // Only attempt to apply when a viewer ref exists and has an applyDomainPalette method
    const gvRef = phyloTreeViewerRef?.current;
    if (!gvRef) return; // viewer not mounted yet

    try {
      const effectivePalette = propDomainPalette ?? domainPalette;
      const gv = gvRef.genomeView ?? gvRef.getGenomeView?.();
      if (gv && typeof gv.applyDomainPalette === 'function') {
        gv.applyDomainPalette(effectivePalette);
      }
    } catch (e) {
      // ignore failures (viewer may not be fully initialized)
    }
  }, [propDomainPalette, domainPalette, phyloTreeViewerRef]);

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

  // Effective label fields (prop override when provided)
  const effectiveGeneLabelBy = props.geneLabelBy ?? geneLabelBy;
  const effectiveTreeLabelBy = props.treeLabelBy ?? treeLabelBy;

  // Force a refresh of text layers when label fields change
  useEffect(() => {
    setLabelRefreshCounter((v) => v + 1);
  }, [effectiveGeneLabelBy, effectiveTreeLabelBy]);

  // Extract columns from tree metadata header for dropdowns
  const treeMetadataColumns = defaultTreeMetadata.trim().split(/\r?\n/)[0].split(/\t/);
  
  // Header-based column extraction for domain metadata now occurs during data loading

  const handleObjectClick = (object) => {
    if (!props.setSelectedGene || !object) return;

    // If this is a clicked phylogenetic node (from Scatterplot 'nodes'), and it's
    // a leaf (no branchset children), try to resolve the full tree metadata and
    // show it in the same side panel used for genes.
    if (object.node && object.node.branchset && object.node.branchset.length === 0) {
      // Resolve parsed tree metadata (parsedTreeMetadata is in scope)
      const leafName = object.node.name || object.node.id || object.id;
      const resolveTreeMeta = (leaf) => {
        if (!parsedTreeMetadata) return {};
        if (!leaf) return {};
        if (parsedTreeMetadata[leaf]) return parsedTreeMetadata[leaf];
        const vals = Object.values(parsedTreeMetadata);
        for (let i = 0; i < vals.length; ++i) {
          const e = vals[i];
          if (!e) continue;
          if (e.leaf_id == leaf || e.leaf_id === leaf) return e;
          if (e.leaf_name == leaf || e.leaf_name === leaf) return e;
          if (e.id == leaf || e.id === leaf) return e;
          if (e.name == leaf || e.name === leaf) return e;
          if (e.originalId == leaf || e.original_id == leaf) return e;
        }
        return {};
      };

      const treeMeta = resolveTreeMeta(leafName) || {};
      const selected = {
        type: 'tree-node',
        id: leafName || object.id || `${object.node.start || ''}-${object.node.end || ''}`,
        fillColor: object.fillColor || object.color,
        metadata: treeMeta
      };
      props.setSelectedGene(selected);
      return;
    }

    // Fallback: only handle gene objects, not regions or other features
    const isGene = object.type === 'gene' || (object?.metadata && !object.type?.includes('region'));
    if (!isGene) return;

    const selected = buildSelectedGenePayload(object);
    if (selected) props.setSelectedGene(selected);
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
  const [hiddenGeneIds, setHiddenGeneIds] = React.useState(new Set());
  const [hiddenBaselineIds, setHiddenBaselineIds] = React.useState(new Set());
  const [flashBaselineHood, setFlashBaselineHood] = React.useState(null);
  const flashBaselineTimerRef = React.useRef(null);
  const [dataLoading, setDataLoading] = React.useState(true);
  const TABLE_HEIGHT = 360;
  const TABLE_MARGIN = 12;
  const initialLoading = dataLoading || newickLoading;
  const isReady = !initialLoading;

  const getGeneKey = React.useCallback((row) => {
    if (!row) return null;
    if (row.gene_id) return row.gene_id;
    if (row.id) return row.id;
    if (row.protein_id) return row.protein_id;

    // Try to parse attributes (supports JSON or semicolon string)
    if (row.attributes) {
      const val = row.attributes;
      if (typeof val === 'object' && !Array.isArray(val)) {
        if (val.ID) return val.ID;
        if (val.gene_id) return val.gene_id;
        if (val.Name) return val.Name;
      } else if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const obj = JSON.parse(trimmed);
            if (obj && typeof obj === 'object') {
              if (obj.ID) return obj.ID;
              if (obj.gene_id) return obj.gene_id;
              if (obj.Name) return obj.Name;
            }
          } catch (e) {
            // fall through to semicolon parsing
          }
        }
        const parts = trimmed.split(';');
        for (const p of parts) {
          const [k, ...rest] = p.split('=');
          const key = k ? k.trim() : '';
          const v = rest.join('=').trim();
          if (!key) continue;
          if (key === 'ID' || key === 'gene_id' || key === 'Name') return v || key;
        }
      }
    }

    if (row.seqid && row.start && row.end) return `${row.seqid}:${row.start}-${row.end}`;
    return null;
  }, []);

  const cleanGeneId = React.useCallback((rawId) => {
    if (!rawId) return rawId;
    const idStr = String(rawId);
    if (idStr.includes('_')) {
      const parts = idStr.split('_');
      if (parts.length > 1 && /^\d+$/.test(parts[0])) {
        return parts.slice(1).join('_');
      }
    }
    return idStr;
  }, []);

  const buildSelectedGenePayload = React.useCallback(
    (object) => {
      if (!object) return null;
      const meta = object.metadata || {};
      const isGene = object.type === 'gene' || (meta && !object.type?.includes?.('region'));
      if (!isGene) return null;

      // Only clean gene_id like the click handler does
      const cleanedId = cleanGeneId(meta.gene_id || meta.id || object.id || object.uniqueId);

      const safeMetadata = {
        ...meta,
        gene_id: cleanedId || meta.gene_id || meta.id,
      };

      const selected = {
        type: 'gene',
        id: cleanedId || object.uniqueId || object.id || `${object.start}-${object.end}`,
        fillColor: object.fillColor || object.color,
        metadata: safeMetadata,
      };
      return selected.id ? selected : null;
    },
    [cleanGeneId]
  );

  const getBaselineKey = React.useCallback((row) => {
    if (!row) return null;
    if (row.id) return String(row.id);
    const hood = row.hood_id || row.hoodId || row.seqid;
    const start = row.start ?? row.origStart;
    const end = row.end ?? row.origEnd;
    if (hood && start != null && end != null) return `${hood}:${start}-${end}`;
    if (hood) return String(hood);
    return null;
  }, []);

  const hiddenBaselineKeySet = React.useMemo(() => {
    if (!hiddenBaselineIds) return new Set();
    if (hiddenBaselineIds instanceof Set) return hiddenBaselineIds;
    if (Array.isArray(hiddenBaselineIds)) return new Set(hiddenBaselineIds);
    return new Set();
  }, [hiddenBaselineIds]);

  const hiddenHoodIdsFromBaselines = React.useMemo(() => {
    const set = new Set();
    if (!parsedBaselines || !parsedBaselines.length || !hiddenBaselineKeySet.size) return set;
    parsedBaselines.forEach((b) => {
      const key = getBaselineKey(b);
      if (key && hiddenBaselineKeySet.has(key)) {
        const hood = b.hood_id || b.hoodId || b.seqid;
        if (hood) set.add(String(hood));
      }
    });
    return set;
  }, [parsedBaselines, hiddenBaselineKeySet, getBaselineKey]);

  const effectiveHiddenGeneIds = React.useMemo(() => {
    const base = hiddenGeneIds instanceof Set ? hiddenGeneIds : new Set(hiddenGeneIds || []);
    if (!hiddenHoodIdsFromBaselines.size || !parsedGFF || !parsedGFF.length) return base;
    const merged = new Set(base);
    parsedGFF.forEach((row) => {
      const hood = row.hood_id || row.hoodId || row.seqid;
      if (!hood || !hiddenHoodIdsFromBaselines.has(String(hood))) return;
      const key = getGeneKey(row);
      if (key) merged.add(key);
    });
    return merged;
  }, [hiddenGeneIds, hiddenHoodIdsFromBaselines, parsedGFF, getGeneKey]);

  const visibleGFF = React.useMemo(() => {
    if (!parsedGFF || !parsedGFF.length) return [];
    return parsedGFF.filter((row) => {
      const key = getGeneKey(row);
      if (!key) return true;
      return !effectiveHiddenGeneIds.has(key);
    });
  }, [parsedGFF, effectiveHiddenGeneIds, getGeneKey]);

  const visibleBaselines = React.useMemo(() => {
    if (!parsedBaselines || !parsedBaselines.length) return [];
    return parsedBaselines.filter((row) => {
      const key = getBaselineKey(row);
      if (!key) return true;
      return !hiddenBaselineIds.has(key);
    });
  }, [parsedBaselines, hiddenBaselineIds, getBaselineKey]);

  const visibleGeneIds = React.useMemo(() => {
    const set = new Set();
    visibleGFF.forEach((row) => {
      const key = getGeneKey(row);
      if (key) set.add(String(key));
    });
    return set;
  }, [visibleGFF, getGeneKey]);

  // Protect baseline align genes (and current alignCluster) from being hidden
  const protectedGeneIds = React.useMemo(() => {
    const ids = new Set();
    if (alignCluster) ids.add(String(alignCluster));
    if (parsedBaselines && parsedBaselines.length) {
      for (const b of parsedBaselines) {
        const candidate = b?.align_gene || b?.alignGene || b?.gene_id || b?.id;
        if (candidate) ids.add(String(candidate));
      }
    }
    return ids;
  }, [alignCluster, parsedBaselines]);

  // If the current align anchor is hidden, switch to a visible baseline align_gene (or clear).
  React.useEffect(() => {
    // Respect external control: only adjust when alignCluster is locally managed
    if (props.alignCluster !== undefined) return;

    const isHidden = (geneId) => geneId && effectiveHiddenGeneIds.has(String(geneId));
    const currentHidden = alignCluster && isHidden(alignCluster);

    // Find first baseline align_gene that remains visible
    let fallback = null;
    if (parsedBaselines && parsedBaselines.length) {
      for (const b of parsedBaselines) {
        const candidate = b?.align_gene || b?.alignGene || b?.gene_id || b?.id;
        if (candidate && !isHidden(candidate)) {
          fallback = candidate;
          break;
        }
      }
    }

    // If current is visible, do nothing
    if (alignCluster && !currentHidden) return;

    // Prefer fallback; otherwise clear to let default alignment run
    if (fallback && fallback !== alignCluster) {
      setAlignCluster(fallback);
    } else if (!fallback && alignCluster !== null) {
      setAlignCluster(null);
    }
  }, [effectiveHiddenGeneIds, alignCluster, props.alignCluster, parsedBaselines]);

  const visibilityConfig = React.useMemo(() => ({
    genes: {
      getRowId: getGeneKey,
      hiddenSet: effectiveHiddenGeneIds,
      onToggle: (id, nextVisible) => {
        if (!id) return;
        const idStr = String(id);
        if (protectedGeneIds.has(idStr)) return; // never hide protected anchors
        setHiddenGeneIds((prev) => {
          const next = new Set(prev);
          if (nextVisible) next.delete(idStr);
          else next.add(idStr);
          return next;
        });
      },
      onBatchToggle: (changes) => {
        if (!changes || !changes.length) return;
        setHiddenGeneIds((prev) => {
          const next = new Set(prev);
          for (const { rowId, desiredVisible } of changes) {
            const idStr = String(rowId);
            if (protectedGeneIds.has(idStr)) continue; // never hide protected anchors
            if (desiredVisible) next.delete(idStr);
            else next.add(idStr);
          }
          return next;
        });
      },
    },
    baselines: {
      getRowId: getBaselineKey,
      hiddenSet: hiddenBaselineIds,
      onToggle: (id, nextVisible) => {
        if (!id) return;
        const idStr = String(id);
        setHiddenBaselineIds((prev) => {
          const next = new Set(prev);
          if (nextVisible) next.delete(idStr);
          else next.add(idStr);
          return next;
        });
      },
      onBatchToggle: (changes) => {
        if (!changes || !changes.length) return;
        setHiddenBaselineIds((prev) => {
          const next = new Set(prev);
          for (const { rowId, desiredVisible } of changes) {
            const idStr = String(rowId);
            if (desiredVisible) next.delete(idStr);
            else next.add(idStr);
          }
          return next;
        });
      },
    },
  }), [getGeneKey, effectiveHiddenGeneIds, protectedGeneIds, getBaselineKey, hiddenBaselineIds]);

  const handleZoomGene = React.useCallback((row) => {
    if (!row || !phyloTreeViewerRef.current || typeof phyloTreeViewerRef.current.focusGeneById !== 'function') return;
    try {
      if (props.setSelectedGene) {
        const gv = phyloTreeViewerRef.current.genomeView;
        let selected = null;
        if (gv) {
          const rawId = getGeneKey(row);
          if (rawId) {
            const idStr = String(rawId);
            let uniqueId = null;
            if (gv._genesByOriginalId && typeof gv._genesByOriginalId.get === 'function') {
              const matches = gv._genesByOriginalId.get(idStr);
              if (matches && matches.length) uniqueId = matches[0];
            }
            if (!uniqueId) {
              for (const [uid, g] of Object.entries(gv.genesById || {})) {
                const candidate =
                  g.originalGeneId ||
                  g.gene_id ||
                  g.originalId ||
                  g.id ||
                  (g.metadata && (g.metadata.gene_id || g.metadata.id));
                if (candidate && String(candidate) === idStr) {
                  uniqueId = uid;
                  break;
                }
              }
            }
            if (uniqueId && gv.genesById?.[uniqueId]) {
              const geneObj = gv.genesById[uniqueId];
              selected = buildSelectedGenePayload({
                type: 'gene',
                uniqueId,
                id: uniqueId,
                gene: geneObj,
                metadata: geneObj.metadata || {},
                fillColor: geneObj.fillColor
              });
            }
          }
        }
        if (!selected) {
          selected = buildSelectedGenePayload({
            type: 'gene',
            id: row.gene_id || row.id || getGeneKey(row),
            metadata: row,
          });
        }
        if (selected) props.setSelectedGene(selected);
      }
    } catch (e) {}
    const id = getGeneKey(row);
    if (!id) return;
    phyloTreeViewerRef.current.focusGeneById(String(id));
  }, [
    phyloTreeViewerRef,
    getGeneKey,
    buildSelectedGenePayload,
    props.setSelectedGene,
  ]);

  const handleZoomBaseline = React.useCallback((row) => {
    if (!row || !phyloTreeViewerRef.current || typeof phyloTreeViewerRef.current.focusBaselineByHood !== 'function') return;
    const hood = row.hood_id || row.hoodId || row.seqid;
    if (!hood) return;
    const hoodStr = String(hood);
    phyloTreeViewerRef.current.focusBaselineByHood(hoodStr);
    // Trigger a dedicated baseline glow when zooming from the table
    setFlashBaselineHood({ id: hoodStr, ts: Date.now() });
  }, [phyloTreeViewerRef]);

  const handleZoomTreeMetadata = React.useCallback((row) => {
    if (!row || !phyloTreeViewerRef.current || typeof phyloTreeViewerRef.current.focusTreeLeafById !== 'function') return;
    const leaf = row.leaf_id || row.leafId || row.leaf_name || row.leafName || row.id || row.name;
    if (!leaf) return;
    phyloTreeViewerRef.current.focusTreeLeafById(String(leaf));
  }, [phyloTreeViewerRef]);

  // No auto-clear: keep baseline glow until another selection overrides it
  React.useEffect(() => {
    if (flashBaselineTimerRef.current) {
      clearTimeout(flashBaselineTimerRef.current);
      flashBaselineTimerRef.current = null;
    }
    return () => {
      if (flashBaselineTimerRef.current) clearTimeout(flashBaselineTimerRef.current);
    };
  }, [flashBaselineHood]);

  const tableDatasets = React.useMemo(() => {
    const domainRows = Object.entries(parsedDomains || {}).flatMap(([gid, list]) =>
      (list || []).map((d) => ({ gene_id: gid, ...(d || {}) }))
    );
    const proteinMetaRows = parsedProteinMetadata ? Object.values(parsedProteinMetadata) : [];
    const domainMetaRows = parsedDomainMetadata ? Object.values(parsedDomainMetadata) : [];
    const treeMetaRows = parsedTreeMetadata ? Object.values(parsedTreeMetadata) : [];

    return {
      genes: { label: `Genes (${parsedGFF?.length || 0})`, rows: parsedGFF || [] },
      baselines: { label: `Baselines (${parsedBaselines?.length || 0})`, rows: parsedBaselines || [] },
      domains: { label: `Domains (${domainRows.length})`, rows: domainRows },
      proteinLinks: { label: `Protein links (${parsedProteinLinks?.length || 0})`, rows: parsedProteinLinks || [] },
      nucleotideLinks: { label: `Nucleotide links (${parsedNucleotideLinks?.length || 0})`, rows: parsedNucleotideLinks || [] },
      proteinMetadata: { label: `Protein metadata (${proteinMetaRows.length})`, rows: proteinMetaRows },
      domainMetadata: { label: `Domain metadata (${domainMetaRows.length})`, rows: domainMetaRows },
      treeMetadata: { label: `Tree metadata (${treeMetaRows.length})`, rows: treeMetaRows },
    };
  }, [parsedGFF, parsedBaselines, parsedDomains, parsedProteinLinks, parsedNucleotideLinks, parsedProteinMetadata, parsedDomainMetadata, parsedTreeMetadata]);
  
  React.useEffect(() => {
    let parserWorker = null;
    // Module workers are blocked when opening the built file via file://, so skip the worker in that scenario.
    const allowWorker = typeof window !== 'undefined' && window.location?.protocol !== 'file:';

    const loadData = async () => {
  const loadStart = performance.now();
  console.log('[perf] loadData start', new Date().toISOString());
  setDataLoading(true);

      // Create parser worker once per load cycle
      try {
        parserWorker = allowWorker ? new ParserWorker() : null;
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
              const p = await tryLoadParquet(defaultGFFParquetUrl || `${parquetBase}/defaultGFF.parquet`);
              if (Array.isArray(p)) {
                console.log('[data] using parquet for defaultGFF');
                return p;
              }
              console.log('[data] parquet missing for defaultGFF, using text parser');
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
              const p = await tryLoadParquet(defaultProteinLinksParquetUrl || `${parquetBase}/defaultProteinLinks.parquet`);
              if (Array.isArray(p)) { console.log('[data] using parquet for defaultProteinLinks'); return p; }
              console.log('[data] parquet missing for defaultProteinLinks, using text parser');
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
              const p = await tryLoadParquet(defaultNucleotideLinksParquetUrl || `${parquetBase}/defaultNucleotideLinks.parquet`);
              if (Array.isArray(p)) { console.log('[data] using parquet for defaultNucleotideLinks'); return p; }
              console.log('[data] parquet missing for defaultNucleotideLinks, using text parser');
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
              const p = await tryLoadParquet(defaultDomainsParquetUrl || `${parquetBase}/defaultDomains.parquet`);
              if (Array.isArray(p) || (p && typeof p === 'object')) { console.log('[data] using parquet for defaultDomains'); return p; }
              console.log('[data] parquet missing for defaultDomains, using text parser');
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
              const p = await tryLoadParquet(defaultBaselinesParquetUrl || `${parquetBase}/defaultBaselines.parquet`);
              if (Array.isArray(p)) { console.log('[data] using parquet for defaultBaselines'); return p; }
              console.log('[data] parquet missing for defaultBaselines, using text parser');
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
              const p = await tryLoadParquet(defaultProteinMetadataParquetUrl || `${parquetBase}/defaultProteinMetadata.parquet`);
              if (Array.isArray(p)) {
                console.log('[data] using parquet for defaultProteinMetadata');
                const out = {};
                for (const row of p) { const key = row.id || row.gene_id || row.geneId; if (key) out[key] = row; }
                return out;
              }
              console.log('[data] parquet missing for defaultProteinMetadata, using text parser');
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
              const p = await tryLoadParquet(defaultTreeMetadataParquetUrl || `${parquetBase}/defaultTreeMetadata.parquet`);
              if (Array.isArray(p)) {
                console.log('[data] using parquet for defaultTreeMetadata');
                const out = {};
                for (const row of p) { const key = row.leaf_id || Object.values(row)[0]; if (key) out[key] = row; }
                return out;
              }
              console.log('[data] parquet missing for defaultTreeMetadata, using text parser');
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
              const p = await tryLoadParquet(defaultDomainsMetadataParquetUrl || `${parquetBase}/defaultDomainsMetadata.parquet`);
              if (Array.isArray(p)) {
                console.log('[data] using parquet for defaultDomainsMetadata');
                const out = {};
                for (const row of p) { if (row.domain_id) out[row.domain_id] = row; }
                return out;
              }
              console.log('[data] parquet missing for defaultDomainsMetadata, using text parser');
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
        const safeJson = (val) => {
          try { return JSON.parse(val); } catch { return null; }
        };

        const parseAttributesString = (raw) => {
          const out = {};
          if (!raw) return out;
          const parts = String(raw).split(';');
          for (const p of parts) {
            const s = p.trim();
            if (!s) continue;
            if (s.includes('=')) {
              const [k, ...rest] = s.split('=');
              out[k.trim()] = rest.join('=').trim();
            } else {
              out.ID = s;
            }
          }
          return out;
        };

        const normalizeParquetRows = (arr, type = '') => {
          if (!Array.isArray(arr)) return arr;
          if (arr.length && Object.keys(arr[0]).length === 1 && Object.prototype.hasOwnProperty.call(arr[0], 'empty')) {
            return [];
          }
          const toJsVal = (v) => {
            if (v instanceof Uint8Array) return new TextDecoder().decode(v);
            return v;
          };
          return arr.map(r => {
            const obj = {};
            for (const [k, v] of Object.entries(r)) {
              obj[k] = toJsVal(v);
            }
            if (type === 'gff') {
              let attrs = obj?.attributes;
              if (typeof attrs === 'string') {
                attrs = safeJson(attrs) || parseAttributesString(attrs);
              }
              obj.attributes = attrs || {};
            }
            return obj;
          });
        };

        const toMapByKey = (arr, key) => {
          if (!Array.isArray(arr)) return arr || {};
          const out = {};
          for (const row of arr) {
            const k = row && row[key];
            if (!k) continue;
            out[k] = row;
          }
          return out;
        };

        const normalizeProteinLinks = (arr) => {
          if (!Array.isArray(arr)) return arr || [];
          return arr.map(l => ({
            geneA: l.geneA || l.gene_a || l.qseqid || l.gAId,
            geneB: l.geneB || l.gene_b || l.sseqid || l.gBId,
            similarity: l.similarity ?? l.score ?? l.pident ?? 0
          }));
        };

        const normalizeNucleotideLinks = (arr) => {
          if (!Array.isArray(arr)) return arr || [];
          return arr.map(l => ({
            seqidA: l.seqidA || l.seqid_a || l.query,
            startA: l.startA ?? l.start_a ?? l.query_start,
            endA: l.endA ?? l.end_a ?? l.query_end,
            seqidB: l.seqidB || l.seqid_b || l.ref,
            startB: l.startB ?? l.start_b ?? l.ref_start,
            endB: l.endB ?? l.end_b ?? l.ref_end,
            similarity: l.similarity ?? l.score ?? l.ani ?? 0
          }));
        };

        const toDomainsByGene = (domainsArr) => {
          if (!Array.isArray(domainsArr)) return domainsArr || {};
          const out = {};
          for (const d of domainsArr) {
            if (!d) continue;
            // Domains parquet may use protein_id instead of gene_id; fall back to protein_id.
            const key = d.gene_id || d.protein_id;
            if (!key) continue;
            // Ensure domainName is populated (fallback to domain_id).
            if (!d.domainName && d.domain_id) d.domainName = d.domain_id;
            (out[key] ||= []).push(d);
          }
          return out;
        };

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
        const gffClean = convertBigInts(normalizeParquetRows(rawGff, 'gff') || []);
        const proteinLinksClean = normalizeProteinLinks(convertBigInts(normalizeParquetRows(rawProteinLinks) || []));
        const nucleotideLinksClean = normalizeNucleotideLinks(convertBigInts(normalizeParquetRows(rawNucleotideLinks) || []));
        const domainsClean = toDomainsByGene(convertBigInts(normalizeParquetRows(rawDomains) || {}));
        let baselinesClean = convertBigInts(normalizeParquetRows(rawBaselines) || []);
        baselinesClean = forceBaselineFieldsNumber(baselinesClean || []);
        const proteinMetaClean = convertBigInts(normalizeParquetRows(rawProteinMeta) || {});
        const treeMetaClean = convertBigInts(normalizeParquetRows(rawTreeMeta) || {});
        const domainMetaClean = toMapByKey(convertBigInts(normalizeParquetRows(rawDomainMeta) || {}), 'domain_id');
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
            if (row) {
              const key = row.id || row.gene_id || row.geneId;
              if (key) out[key] = row;
            }
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
              const cols = Object.keys(first).filter(c => c !== 'id');
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
        try {
          if (props.setDomainMetadataColumns && typeof props.setDomainMetadataColumns === 'function') {
            const builtInFields = ['domainName', 'start', 'end', 'evalue', 'coverage'];
            const sampleDomainMeta = Object.values(domainMetaClean)[0] || null;
            const metadataFields = sampleDomainMeta && typeof sampleDomainMeta === 'object'
              ? Object.keys(sampleDomainMeta).filter(c => c !== 'domain_id')
              : [];
            props.setDomainMetadataColumns([...builtInFields, ...metadataFields]);
          }
        } catch (e) {
          console.error('Error setting domain metadata columns:', e);
        }
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

    return () => {
      if (parserWorker && typeof parserWorker.terminate === 'function') {
        try { parserWorker.terminate(); } catch (e) {}
      }
    };
  }, [coreConfig]);

  return (
    <div className="App" style={{ 
      width: '100%', 
      height: '100%', 
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Loading indicator */}
      {initialLoading && (
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
      {isReady && (
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: props.showDataTable ? `translateY(-${TABLE_HEIGHT + TABLE_MARGIN}px)` : 'translateY(0)',
            transition: 'transform 220ms ease',
            willChange: 'transform',
            position: 'relative',
          }}
        >
            <PhyloTreeViewer
            ref={phyloTreeViewerRef}
            newickStr={newickStr}
            gffFeatures={visibleGFF}
            proteinLinks={parsedProteinLinks}
            nucleotideLinks={parsedNucleotideLinks}
            domainsByGene={parsedDomains}
            baselines={visibleBaselines}
            visibleGeneIds={visibleGeneIds}
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
              labelBy={effectiveGeneLabelBy}
            domainColorBy={props.domainColorBy ?? domainColorBy}
            treeMetadata={parsedTreeMetadata}
              treeLabelBy={effectiveTreeLabelBy}
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
            domainSource={props.domainSource ?? undefined}
            setDomainSource={props.setDomainSource ?? undefined}
            phyloPalette={props.phyloPalette ?? phyloPalette}
            ncRNAPalette={props.ncRNAPalette ?? ncRNAPalette}
            regionPalette={props.regionPalette ?? regionPalette}
            proteinLinkConfig={props.proteinLinkConfig ?? proteinLinkConfig}
            nucleotideLinkConfig={props.nucleotideLinkConfig ?? nucleotideLinkConfig}
            styleConfig={props.styleConfig ?? styleConfig}
              treeXScale={props.treeXScale ?? treeXScale}
              forceUpdateCounter={labelRefreshCounter}
            showTreeLayer={props.showTreeLayer}
            showGeneLayer={props.showGeneLayer}
            showDomainLayer={props.showDomainLayer}
            showProteinLinkLayer={props.showProteinLinkLayer}
            showNucleotideLinkLayer={props.showNucleotideLinkLayer}
            showNcRNALayer={props.showNcRNALayer}
            showGeneTextLayer={props.showGeneTextLayer}
            showTreeTextLayer={props.showTreeTextLayer}
            geneLabelPosition={props.geneLabelPosition ?? geneLabelPosition}
            flashBaselineHood={flashBaselineHood}
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
        </div>
      )}
      {isReady && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: props.showDataTable ? `${TABLE_HEIGHT + TABLE_MARGIN}px` : '0px',
            opacity: props.showDataTable ? 1 : 0,
            transform: props.showDataTable ? 'translateY(0)' : 'translateY(8px)',
            transition: 'max-height 220ms ease, opacity 220ms ease, transform 220ms ease',
            overflow: 'hidden',
          pointerEvents: props.showDataTable ? 'auto' : 'none',
          zIndex: 20,
        }}
      >
          <DataGridView
            datasets={tableDatasets}
            height={TABLE_HEIGHT}
            visibilityConfig={visibilityConfig}
            onZoomGene={handleZoomGene}
            onZoomBaseline={handleZoomBaseline}
            onZoomTree={handleZoomTreeMetadata}
          />
        </div>
      )}
    </div>
  );
}

export default App;
