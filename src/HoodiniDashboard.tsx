/**
 * HoodiniDashboard - Unified dashboard component for genomic neighborhood visualization
 * 
 * This is the main entry point for using hoodini-viz. It combines:
 * - Data loading (Parquet/TSV)
 * - Sidebar with controls
 * - HoodiniViz visualization
 * - DataGrid view
 * - Theme support
 * 
 * @example
 * // Minimal usage - just provide data paths
 * <HoodiniDashboard
 *   dataPaths={{
 *     gff: '/data/genes.parquet',
 *     hoods: '/data/hoods.parquet',
 *     newick: '/data/tree.nwk'
 *   }}
 * />
 * 
 * @example
 * // With full control
 * <HoodiniDashboard
 *   dataPaths={{ ... }}
 *   initialState={{ ultrametric: true, colorBy: 'cluster' }}
 *   showSidebar={true}
 *   onDataLoaded={(data) => console.log(data)}
 *   ref={dashboardRef}
 * />
 */

import React, { useState, useEffect, useRef, useImperativeHandle, useCallback, useMemo } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { SVGExportButton } from '@/components/SVGExportButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Table as TableIcon } from 'lucide-react';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import HoodiniVizComponent from './components/HoodiniViz';
import DataGridView from './components/DataGridView';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { DEFAULT_CONFIG, VisualizationConfig } from '@/config/visualizationConfig';
import { FormatPreset } from './components/GuideOverlay';

// Parsers
import { parseGFF } from './utils/parseGFF';
import { parseLinks } from './utils/parseLinks';
import { parseNucleotideLinks } from './utils/parseNucleotideLinks';
import { parseDomains } from './utils/parseDomains';
import parseHoods from './utils/parseHoods';
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
  parseHoodsOptimized,
  parseNonCodingMetadataOptimized
} from './utils/loadersGLUtils';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** RGBA color as [r, g, b, a] where each value is 0-255 */
export type RGBAColor = [number, number, number, number];

/** Palette configuration */
export interface PaletteConfig {
  type: 'qualitative' | 'sequential' | 'diverging';
  name: string;
  numColors?: number;
  reverse?: boolean;
  enabled?: boolean;
  alphaRange?: [number, number];
}

/** Protein link visualization config */
export interface ProteinLinkConfig {
  colorBy?: 'source_gene' | 'target_gene' | 'identity_solid' | 'identity_gradient';
  solidColor?: RGBAColor;
  useAlpha?: boolean;
  minAlpha?: number;
  maxAlpha?: number;
  palette?: PaletteConfig;
}

/** Nucleotide link visualization config */
export interface NucleotideLinkConfig {
  colorBy?: 'solid' | 'identity_gradient';
  solidColor?: RGBAColor;
  strandColoring?: boolean;
  sameStrandColor?: RGBAColor;
  oppositeStrandColor?: RGBAColor;
  useAlpha?: boolean;
  minAlpha?: number;
  maxAlpha?: number;
}

/**
 * Data paths for loading genomic data.
 * Supports both Parquet and TSV/text formats.
 * If a parquet path fails, will try the corresponding text path.
 */
export interface DataPaths {
  // Parquet paths (preferred)
  /** Path to GFF features parquet file */
  gffParquet?: string;
  /** Path to hoods parquet file */
  hoodsParquet?: string;
  /** Path to protein links parquet file */
  proteinLinksParquet?: string;
  /** Path to nucleotide links parquet file */
  nucleotideLinksParquet?: string;
  /** Path to domains parquet file */
  domainsParquet?: string;
  /** Path to protein metadata parquet file */
  proteinMetadataParquet?: string;
  /** Path to domain metadata parquet file */
  domainsMetadataParquet?: string;
  /** Path to tree metadata parquet file */
  treeMetadataParquet?: string;
  /** Path to ncRNA metadata parquet file */
  ncRNAMetadataParquet?: string;
  
  // Text/TSV paths (fallback)
  /** Path to GFF features text file */
  gffText?: string;
  /** Path to hoods TSV file */
  hoodsText?: string;
  /** Path to protein links TSV file */
  proteinLinksText?: string;
  /** Path to nucleotide links TSV file */
  nucleotideLinksText?: string;
  /** Path to domains TSV file */
  domainsText?: string;
  /** Path to protein metadata TSV file */
  proteinMetadataText?: string;
  /** Path to domain metadata TSV file */
  domainsMetadataText?: string;
  /** Path to tree metadata TSV file */
  treeMetadataText?: string;
  /** Path to ncRNA metadata TSV file (seqid, start, end, type, sequence, structure) */
  ncRNAMetadataText?: string;
  
  /** Path to Newick tree file */
  newick?: string;
}

/** Parsed data available after loading */
export interface ParsedData {
  gffFeatures: any[];
  hoods: any[];
  proteinLinks: any[];
  nucleotideLinks: any[];
  domainsByGene: Record<string, any[]>;
  proteinMetadata: Record<string, any>;
  domainMetadata: Record<string, any>;
  treeMetadata: Record<string, any>;
  ncRNAMetadata: Record<string, any>;
  newickStr: string;
}

/** Initial state configuration */
export interface InitialState {
  // Alignment
  alignCluster?: string | number | null;
  useDefaultGeneAlignment?: boolean;
  defaultAlign?: 'start' | 'center' | 'end';
  
  // Tree
  ultrametric?: boolean;
  treeXScale?: number;
  showConnectingLines?: boolean;
  phyloLabelPosition?: 'after-tree' | 'after-tracks';
  alignLabels?: boolean;
  treeLabelBy?: string;
  treeColorBy?: string;
  ySpacing?: number;
  phyloLabelSize?: number;
  
  // Genes
  geneColorBy?: string;
  geneLabelBy?: string;
  geneHeight?: number;
  arrowheadHeight?: number;
  geneLabelPosition?: 'top' | 'bottom' | 'center';
  geneLabelSize?: number;
  
  // Domains
  domainColorBy?: string;
  domainSource?: string;
  
  // Palettes
  genePalette?: PaletteConfig;
  domainPalette?: PaletteConfig;
  phyloPalette?: PaletteConfig;
  ncRNAPalette?: PaletteConfig;
  regionPalette?: PaletteConfig;
  
  // Links
  proteinLinkConfig?: ProteinLinkConfig;
  nucleotideLinkConfig?: NucleotideLinkConfig;
  
  // UI
  showScrollbar?: boolean;
  showRuler?: boolean;
  showDataTable?: boolean;
  rulerLabelSize?: number;
  strokeLineWidth?: number;
  genomeXScale?: number;
  
  // Format guides
  showFormatGuides?: boolean;
  formatGuidePreset?: FormatPreset | null;
  scaleExportToFormat?: boolean;
  cropToGuides?: boolean;
  scaleRulerWithCrop?: boolean;
  
  // Layer visibility
  showTreeLayer?: boolean;
  showGeneLayer?: boolean;
  showDomainLayer?: boolean;
  showProteinLinkLayer?: boolean;
  showNucleotideLinkLayer?: boolean;
  showNcRNALayer?: boolean;
  showRegionsLayer?: boolean;
  showGeneTextLayer?: boolean;
  showTreeTextLayer?: boolean;
}

/** Methods exposed via ref */
export interface HoodiniDashboardRef {
  // Data access
  /** Get the GenomeView instance */
  getGenomeView: () => any;
  /** Get the PhyloTree instance */
  getPhyloTree: () => any;
  /** Get parsed data */
  getParsedData: () => ParsedData | null;
  /** Get current legend data */
  getLegendData: () => any;
  
  // Navigation
  /** Focus on a specific gene by ID */
  focusGeneById: (geneId: string) => void;
  /** Focus on a specific hood by ID */
  focusHoodById: (hoodId: string) => void;
  /** Focus on a tree leaf by ID */
  focusTreeLeafById: (leafId: string) => void;
  
  // Alignment
  /** Align all hoods by a cluster */
  alignByCluster: (clusterId: string | number) => void;
  /** Reset alignment to defaults */
  resetAlignment: () => void;
  
  // Export
  /** Export current view to SVG */
  exportSVG: () => string;
  
  // State
  /** Get current state (all settings) */
  getState: () => InitialState;
  /** Set state (partial update) */
  setState: (state: Partial<InitialState>) => void;
  
  // Internal refs
  /** Direct access to HoodiniViz ref */
  vizRef: React.RefObject<any>;
}

/**
 * Props for HoodiniDashboard component
 */
export interface HoodiniDashboardProps {
  // ============================================================================
  // DATA PROPS
  // ============================================================================
  
  /**
   * Paths to data files (Parquet and/or TSV).
   * At minimum, provide gffParquet/gffText and hoodsParquet/hoodsText.
   */
  dataPaths?: DataPaths;
  
  /**
   * Pre-parsed data (bypass loading).
   * Use this if you've already loaded/parsed the data externally.
   */
  data?: Partial<ParsedData>;
  
  /**
   * Prefer Parquet files over text when both are available.
   * @default true
   */
  preferParquet?: boolean;

  // ============================================================================
  // STATE PROPS
  // ============================================================================
  
  /**
   * Initial state for all visualization settings.
   * Use this for uncontrolled mode - values set once on mount.
   */
  initialState?: InitialState;
  
  /**
   * Controlled state - when provided, component is fully controlled.
   * You must handle all state changes via callbacks.
   */
  controlledState?: InitialState;
  
  /**
   * Callback when any state changes (for controlled mode).
   */
  onStateChange?: (state: InitialState, changedKey: string) => void;

  // ============================================================================
  // UI PROPS
  // ============================================================================
  
  /**
   * Show the sidebar with controls.
   * @default true
   */
  showSidebar?: boolean;
  
  /**
   * Show the toolbar (theme toggle, export button, table toggle).
   * @default true
   */
  showToolbar?: boolean;
  
  /**
   * Custom toolbar content to render alongside default buttons.
   */
  toolbarExtra?: React.ReactNode;
  
  /**
   * CSS class for the container.
   */
  className?: string;
  
  /**
   * Inline styles for the container.
   */
  style?: React.CSSProperties;

  // ============================================================================
  // CALLBACK PROPS
  // ============================================================================
  
  /**
   * Called when data loading completes.
   */
  onDataLoaded?: (data: ParsedData) => void;
  
  /**
   * Called when data loading fails.
   */
  onDataError?: (error: Error) => void;
  
  /**
   * Called when loading state changes.
   */
  onLoadingChange?: (isLoading: boolean) => void;
  
  /**
   * Called when a gene/object is clicked.
   */
  onObjectClick?: (object: any) => void;
  
  /**
   * Called when selection changes.
   */
  onSelectionChange?: (selection: any) => void;
  
  /**
   * Called when legend data updates.
   */
  onLegendChange?: (legendData: any) => void;
  
  /**
   * Called when metadata columns are detected from loaded data.
   */
  onMetadataColumnsDetected?: (columns: {
    gene: string[];
    tree: string[];
    domain: string[];
  }) => void;

  // ============================================================================
  // ADVANCED PROPS
  // ============================================================================
  
  /**
   * Master configuration object.
   * Overrides DEFAULT_CONFIG values.
   */
  config?: Partial<VisualizationConfig>;
  
  /**
   * Theme mode override.
   * @default 'system'
   */
  theme?: 'light' | 'dark' | 'system';
  
  /**
   * Disable the ThemeProvider wrapper (use if parent already provides one).
   * @default false
   */
  disableThemeProvider?: boolean;
  
  /**
   * Children to render inside the dashboard (overlays, etc).
   */
  children?: React.ReactNode;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_INITIAL_STATE: InitialState = {
  // Alignment
  alignCluster: null,
  useDefaultGeneAlignment: true,
  defaultAlign: 'start',
  
  // Tree
  ultrametric: false,
  treeXScale: DEFAULT_CONFIG.tree.xScalePercent,
  showConnectingLines: false,
  phyloLabelPosition: DEFAULT_CONFIG.tree.phyloLabelPosition as 'after-tree' | 'after-tracks',
  alignLabels: DEFAULT_CONFIG.tree.alignLabels,
  treeLabelBy: 'species',
  treeColorBy: 'species',
  ySpacing: DEFAULT_CONFIG.tree.ySpacing,
  phyloLabelSize: DEFAULT_CONFIG.text.phyloLabelSize,
  
  // Genes
  geneColorBy: 'cluster',
  geneLabelBy: 'cluster',
  geneHeight: DEFAULT_CONFIG.gene.height,
  arrowheadHeight: DEFAULT_CONFIG.gene.arrowheadHeight,
  geneLabelPosition: 'bottom',
  geneLabelSize: DEFAULT_CONFIG.text.geneLabelSize,
  
  // Domains
  domainColorBy: 'evalue',
  domainSource: 'all',
  
  // Palettes
  genePalette: { type: 'qualitative', name: 'Set2', numColors: 8, reverse: false, enabled: true },
  domainPalette: { type: 'sequential', name: 'Gray', numColors: 9, reverse: false, enabled: true, alphaRange: [0.2, 0.5] },
  phyloPalette: { type: 'qualitative', name: 'Set2', numColors: 8, reverse: false, enabled: true },
  ncRNAPalette: { type: 'qualitative', name: 'Set3', numColors: 8, reverse: false, enabled: true },
  regionPalette: { type: 'qualitative', name: 'Dark2', numColors: 8, reverse: false, enabled: true },
  
  // Links
  proteinLinkConfig: {
    colorBy: DEFAULT_CONFIG.proteinLink.colorBy,
    solidColor: DEFAULT_CONFIG.proteinLink.solidColor as [number, number, number, number],
    useAlpha: DEFAULT_CONFIG.proteinLink.useAlpha,
    minAlpha: DEFAULT_CONFIG.proteinLink.minAlpha,
    maxAlpha: DEFAULT_CONFIG.proteinLink.maxAlpha,
  },
  nucleotideLinkConfig: {
    colorBy: DEFAULT_CONFIG.nucleotideLink.colorBy,
    solidColor: DEFAULT_CONFIG.nucleotideLink.solidColor as [number, number, number, number],
    useAlpha: DEFAULT_CONFIG.nucleotideLink.useAlpha,
    minAlpha: DEFAULT_CONFIG.nucleotideLink.minAlpha,
    maxAlpha: DEFAULT_CONFIG.nucleotideLink.maxAlpha,
  },
  
  // UI
  showScrollbar: true,
  showRuler: true,
  showDataTable: false,
  rulerLabelSize: DEFAULT_CONFIG.text.rulerLabelSize,
  strokeLineWidth: DEFAULT_CONFIG.gene.edgeWidth,
  genomeXScale: DEFAULT_CONFIG.genome.xScalePercent,
  
  // Format guides
  showFormatGuides: false,
  formatGuidePreset: null,
  scaleExportToFormat: false,
  cropToGuides: true, // Default to true when scale to format is enabled
  scaleRulerWithCrop: true, // Default to true - scale ruler with format
  
  // Layer visibility
  showTreeLayer: true,
  showGeneLayer: true,
  showDomainLayer: true,
  showProteinLinkLayer: true,
  showNucleotideLinkLayer: true,
  showNcRNALayer: true,
  showRegionsLayer: true,
  showGeneTextLayer: true,
  showTreeTextLayer: true,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Convert BigInt values to Number recursively
function convertBigInts(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(convertBigInts);
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = convertBigInts(obj[key]);
    }
    return result;
  }
  return obj;
}

async function tryLoadParquet(url: string): Promise<any[] | null> {
  if (!url) return null;
  try {
    console.log('[tryLoadParquet] Loading:', url.substring(0, 80) + '...');
    const hy = await import('hyparquet');
    let compressors;
    try {
      const comp = await import('hyparquet-compressors');
      compressors = comp?.compressors;
    } catch (e) { /* no compressors */ }
    
    if (hy && typeof hy.parquetReadObjects === 'function') {
      const res = await fetch(url);
      console.log('[tryLoadParquet] Fetch status:', res.ok, res.status);
      if (!res.ok) return null;
      const ab = await res.arrayBuffer();
      console.log('[tryLoadParquet] ArrayBuffer size:', ab.byteLength);
      const arr = await hy.parquetReadObjects({ file: ab, compressors });
      console.log('[tryLoadParquet] Parsed rows:', Array.isArray(arr) ? arr.length : 'not array');
      if (Array.isArray(arr)) {
        // Convert BigInt values to Number for compatibility
        return arr.map(convertBigInts);
      }
    }
  } catch (e) {
    console.warn('[hyparquet] failed to read', url.substring(0, 50), e);
  }
  return null;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${url}`);
  return res.text();
}

/**
 * Fetch and decompress gzip-compressed text from a data URL or regular URL.
 * The data URL should be base64-encoded gzip data.
 */
async function fetchCompressedText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${url}`);
  
  // Get raw bytes
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Check if it's gzip compressed (magic bytes 0x1f 0x8b)
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    // Decompress with pako
    const pako = await import('pako');
    const decompressed = pako.ungzip(bytes, { to: 'string' });
    return decompressed;
  }
  
  // Not compressed, decode as text
  return new TextDecoder().decode(bytes);
}

function toTextUrl(url: string): string | null {
  if (!url) return null;
  return url.replace(/\.parquet(\?.*)?$/, '.txt');
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const HoodiniDashboardInner = React.forwardRef<HoodiniDashboardRef, HoodiniDashboardProps>((props, ref) => {
  const {
    dataPaths = {},
    data: preParsedData,
    preferParquet = true,
    initialState = {},
    controlledState,
    onStateChange,
    showSidebar = true,
    showToolbar = true,
    toolbarExtra,
    className,
    style,
    onDataLoaded,
    onDataError,
    onLoadingChange,
    onObjectClick,
    onSelectionChange,
    onLegendChange,
    onMetadataColumnsDetected,
    config: userConfig,
    children,
  } = props;

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // Merge initial state with defaults
  const mergedInitial = useMemo(() => ({
    ...DEFAULT_INITIAL_STATE,
    ...initialState,
  }), []);
  
  // Internal state (used in uncontrolled mode)
  const [internalState, setInternalState] = useState<InitialState>(mergedInitial);
  
  // Determine if controlled
  const isControlled = controlledState !== undefined;
  const state = isControlled ? { ...DEFAULT_INITIAL_STATE, ...controlledState } : internalState;
  
  // State update helper
  const updateState = useCallback((key: string, value: any) => {
    if (isControlled) {
      onStateChange?.({ ...state, [key]: value }, key);
    } else {
      setInternalState(prev => ({ ...prev, [key]: value }));
    }
  }, [isControlled, state, onStateChange]);
  
  // Create setters for each state property
  const createSetter = useCallback((key: string) => (value: any) => updateState(key, value), [updateState]);

  // ============================================================================
  // REFS
  // ============================================================================
  
  const vizRef = useRef<any>(null);
  
  // ============================================================================
  // DATA LOADING STATE
  // ============================================================================
  
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  
  // Metadata columns detected from data
  const [geneMetadataColumns, setGeneMetadataColumns] = useState<string[]>(['cluster', 'species', 'geneType']);
  const [treeMetadataColumns, setTreeMetadataColumns] = useState<string[]>(['species', 'branchLength', 'support']);
  const [domainMetadataColumns, setDomainMetadataColumns] = useState<string[]>([]);
  
  // Data availability flags
  const [hasGeneData, setHasGeneData] = useState(false);
  const [hasDomainData, setHasDomainData] = useState(false);
  const [hasProteinLinkData, setHasProteinLinkData] = useState(false);
  const [hasNucleotideLinkData, setHasNucleotideLinkData] = useState(false);
  const [hasNcRNAData, setHasNcRNAData] = useState(false);
  const [hasRegionsData, setHasRegionsData] = useState(false);
  
  // Selection
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [viewerLegend, setViewerLegend] = useState<any>(null);

  // Visibility state
  const [hiddenHoodIds, setHiddenHoodIds] = useState<Set<string | number>>(new Set());
  const [hiddenGeneIds, setHiddenGeneIds] = useState<Set<string>>(new Set());

  // ============================================================================
  // CONFIG
  // ============================================================================
  
  const config = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...userConfig,
  }), [userConfig]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  useEffect(() => {
    if (preParsedData) {
      // Use pre-parsed data
      const data: ParsedData = {
        gffFeatures: preParsedData.gffFeatures || [],
        hoods: preParsedData.hoods || [],
        proteinLinks: preParsedData.proteinLinks || [],
        nucleotideLinks: preParsedData.nucleotideLinks || [],
        domainsByGene: preParsedData.domainsByGene || {},
        proteinMetadata: preParsedData.proteinMetadata || {},
        domainMetadata: preParsedData.domainMetadata || {},
        treeMetadata: preParsedData.treeMetadata || {},
        newickStr: preParsedData.newickStr || '',
      };
      setParsedData(data);
      setIsLoading(false);
      setHasGeneData(data.gffFeatures.length > 0);
      setHasDomainData(Object.keys(data.domainsByGene).length > 0);
      setHasProteinLinkData(data.proteinLinks.length > 0);
      setHasNucleotideLinkData(data.nucleotideLinks.length > 0);
      // Detect ncRNA and region features from GFF
      const hasNcRNA = data.gffFeatures.some((f: any) => f?.type === 'ncRNA');
      const hasRegions = data.gffFeatures.some((f: any) => f?.type === 'region');
      setHasNcRNAData(hasNcRNA);
      setHasRegionsData(hasRegions);
      onDataLoaded?.(data);
      onLoadingChange?.(false);
      return;
    }
    
    // Load from paths
    const loadData = async () => {
      setIsLoading(true);
      onLoadingChange?.(true);
      
      try {
        const results: Partial<ParsedData> = {};
        
        console.log('[loadData] Starting data load...', { dataPaths, preferParquet });
        
        // Load GFF
        if (dataPaths.gffParquet || dataPaths.gffText) {
          console.log('[loadData] Loading GFF from:', dataPaths.gffParquet ? 'parquet' : 'text');
          if (preferParquet && dataPaths.gffParquet) {
            const parquetData = await tryLoadParquet(dataPaths.gffParquet);
            console.log('[loadData] GFF parquet result:', parquetData?.length ?? 'null');
            if (parquetData) {
              results.gffFeatures = parquetData;
            }
          }
          if (!results.gffFeatures && dataPaths.gffText) {
            console.log('[loadData] Falling back to GFF text');
            const text = await fetchCompressedText(dataPaths.gffText);
            results.gffFeatures = await parseGFFOptimized(text);
          }
        }
        results.gffFeatures = results.gffFeatures || [];
        console.log('[loadData] Final gffFeatures count:', results.gffFeatures.length);
        if (results.gffFeatures.length > 0) {
          console.log('[loadData] Sample GFF feature:', JSON.stringify(results.gffFeatures[0]));
        }
        
        // Load Hoods
        if (dataPaths.hoodsParquet || dataPaths.hoodsText) {
          if (preferParquet && dataPaths.hoodsParquet) {
            const parquetData = await tryLoadParquet(dataPaths.hoodsParquet);
            if (parquetData) {
              results.hoods = parquetData;
            }
          }
          if (!results.hoods && dataPaths.hoodsText) {
            const text = await fetchCompressedText(dataPaths.hoodsText);
            results.hoods = await parseHoodsOptimized(text);
          }
        }
        results.hoods = results.hoods || [];
        console.log('[loadData] Final hoods count:', results.hoods.length);
        if (results.hoods.length > 0) {
          console.log('[loadData] Sample hood:', JSON.stringify(results.hoods[0]));
        }
        
        // Load Protein Links
        if (dataPaths.proteinLinksParquet || dataPaths.proteinLinksText) {
          console.log('[loadData] Loading Protein Links...');
          if (preferParquet && dataPaths.proteinLinksParquet) {
            const parquetData = await tryLoadParquet(dataPaths.proteinLinksParquet);
            if (parquetData) {
              // Normalize field names: parquet uses qseqid/sseqid/pident, code expects geneA/geneB/score
              results.proteinLinks = parquetData.map(p => ({
                geneA: p.geneA || p.qseqid || p.gene_a,
                geneB: p.geneB || p.sseqid || p.gene_b,
                score: p.score ?? p.pident ?? p.similarity ?? 0,
                ...p
              }));
              console.log('[loadData] Protein Links from parquet:', parquetData.length);
            }
          }
          if (!results.proteinLinks && dataPaths.proteinLinksText) {
            console.log('[loadData] Loading protein links from text:', dataPaths.proteinLinksText?.substring(0, 100));
            const text = await fetchCompressedText(dataPaths.proteinLinksText);
            console.log('[loadData] Protein links text length:', text?.length, 'sample:', text?.substring(0, 200));
            results.proteinLinks = await parseProteinLinksOptimized(text);
            console.log('[loadData] Parsed protein links:', results.proteinLinks?.length, results.proteinLinks?.slice(0, 2));
          }
        }
        results.proteinLinks = results.proteinLinks || [];
        console.log('[loadData] Final protein links count:', results.proteinLinks.length);
        
        // Load Nucleotide Links
        if (dataPaths.nucleotideLinksParquet || dataPaths.nucleotideLinksText) {
          console.log('[loadData] Loading Nucleotide Links...');
          if (preferParquet && dataPaths.nucleotideLinksParquet) {
            const parquetData = await tryLoadParquet(dataPaths.nucleotideLinksParquet);
            if (parquetData) {
              // Normalize field names: parquet uses query/ref/ani, code expects seqidA/seqidB/similarity
              results.nucleotideLinks = parquetData.map(n => ({
                seqidA: n.seqidA || n.query || n.seqid_a,
                startA: n.startA ?? n.query_start ?? n.start_a,
                endA: n.endA ?? n.query_end ?? n.end_a,
                seqidB: n.seqidB || n.ref || n.seqid_b,
                startB: n.startB ?? n.ref_start ?? n.start_b,
                endB: n.endB ?? n.ref_end ?? n.end_b,
                similarity: n.similarity ?? n.ani ?? n.pident ?? 0,
                ...n
              }));
              console.log('[loadData] Nucleotide Links from parquet:', parquetData.length);
            }
          }
          if (!results.nucleotideLinks && dataPaths.nucleotideLinksText) {
            console.log('[loadData] Loading nucleotide links from text...');
            const text = await fetchCompressedText(dataPaths.nucleotideLinksText);
            console.log('[loadData] Nucleotide links text length:', text?.length);
            results.nucleotideLinks = await parseNucleotideLinksOptimized(text);
            console.log('[loadData] Parsed nucleotide links:', results.nucleotideLinks?.length);
          }
        }
        results.nucleotideLinks = results.nucleotideLinks || [];
        console.log('[loadData] Final nucleotide links count:', results.nucleotideLinks.length);
        
        // Load Domains
        if (dataPaths.domainsParquet || dataPaths.domainsText) {
          if (preferParquet && dataPaths.domainsParquet) {
            const parquetData = await tryLoadParquet(dataPaths.domainsParquet);
            if (parquetData) {
              // Convert array to object by gene
              const byGene: Record<string, any[]> = {};
              for (const d of parquetData) {
                const geneId = d.gene_id || d.geneId;
                if (geneId) {
                  if (!byGene[geneId]) byGene[geneId] = [];
                  byGene[geneId].push(d);
                }
              }
              results.domainsByGene = byGene;
            }
          }
          if (!results.domainsByGene && dataPaths.domainsText) {
            const text = await fetchCompressedText(dataPaths.domainsText);
            results.domainsByGene = await parseDomainsOptimized(text) as Record<string, any[]>;
          }
        }
        results.domainsByGene = results.domainsByGene || {};
        
        // Load Protein Metadata
        if (dataPaths.proteinMetadataParquet || dataPaths.proteinMetadataText) {
          console.log('[loadData] Loading Protein Metadata...');
          if (preferParquet && dataPaths.proteinMetadataParquet) {
            const parquetData = await tryLoadParquet(dataPaths.proteinMetadataParquet);
            if (parquetData) {
              const byId: Record<string, any> = {};
              for (const p of parquetData) {
                const id = p.id || p.gene_id || p.protein_id;
                if (id) byId[id] = p;
              }
              results.proteinMetadata = byId;
              console.log('[loadData] Protein Metadata from parquet:', Object.keys(byId).length);
            }
          }
          if (!results.proteinMetadata && dataPaths.proteinMetadataText) {
            console.log('[loadData] Loading protein metadata from text:', dataPaths.proteinMetadataText?.substring(0, 100));
            const text = await fetchCompressedText(dataPaths.proteinMetadataText);
            console.log('[loadData] Protein metadata text length:', text?.length, 'sample:', text?.substring(0, 300));
            results.proteinMetadata = await parseProteinMetadataOptimized(text);
            console.log('[loadData] Parsed protein metadata keys:', Object.keys(results.proteinMetadata || {}).length);
            if (Object.keys(results.proteinMetadata || {}).length > 0) {
              const firstKey = Object.keys(results.proteinMetadata)[0];
              console.log('[loadData] Sample protein metadata:', firstKey, results.proteinMetadata[firstKey]);
            }
          }
        }
        results.proteinMetadata = results.proteinMetadata || {};
        console.log('[loadData] Final protein metadata count:', Object.keys(results.proteinMetadata).length);
        
        // Load Tree Metadata
        if (dataPaths.treeMetadataParquet || dataPaths.treeMetadataText) {
          console.log('[loadData] Loading Tree Metadata...');
          if (preferParquet && dataPaths.treeMetadataParquet) {
            const parquetData = await tryLoadParquet(dataPaths.treeMetadataParquet);
            if (parquetData) {
              const byId: Record<string, any> = {};
              for (const t of parquetData) {
                const id = t.leaf_id || t.id || t.name;
                if (id) byId[id] = t;
              }
              results.treeMetadata = byId;
              console.log('[loadData] Tree Metadata from parquet:', Object.keys(byId).length);
            }
          }
          if (!results.treeMetadata && dataPaths.treeMetadataText) {
            console.log('[loadData] Loading tree metadata from text...');
            const text = await fetchCompressedText(dataPaths.treeMetadataText);
            results.treeMetadata = await parseTreeMetadataOptimized(text);
            console.log('[loadData] Parsed tree metadata keys:', Object.keys(results.treeMetadata || {}).length);
          }
        }
        results.treeMetadata = results.treeMetadata || {};
        console.log('[loadData] Final tree metadata count:', Object.keys(results.treeMetadata).length);
        
        // Load ncRNA Metadata (seqid, start, end, type, sequence, structure)
        if (dataPaths.ncRNAMetadataParquet || dataPaths.ncRNAMetadataText) {
          console.log('[loadData] Loading ncRNA Metadata...');
          if (preferParquet && dataPaths.ncRNAMetadataParquet) {
            const parquetData = await tryLoadParquet(dataPaths.ncRNAMetadataParquet);
            if (parquetData) {
              const byKey: Record<string, any> = {};
              for (const row of parquetData) {
                const seqid = row.seqid;
                const start = parseInt(row.start, 10);
                const end = parseInt(row.end, 10);
                if (seqid && !isNaN(start) && !isNaN(end)) {
                  const key = `${seqid}:${start}:${end}`;
                  const { seqid: _s, start: _st, end: _e, ...metadata } = row;
                  byKey[key] = metadata;
                }
              }
              results.ncRNAMetadata = byKey;
              console.log('[loadData] ncRNA Metadata from parquet:', Object.keys(byKey).length);
            }
          }
          if (!results.ncRNAMetadata && dataPaths.ncRNAMetadataText) {
            console.log('[loadData] Loading ncRNA metadata from text...');
            const text = await fetchCompressedText(dataPaths.ncRNAMetadataText);
            results.ncRNAMetadata = await parseNonCodingMetadataOptimized(text);
            console.log('[loadData] Parsed ncRNA metadata keys:', Object.keys(results.ncRNAMetadata || {}).length);
          }
        }
        results.ncRNAMetadata = results.ncRNAMetadata || {};
        console.log('[loadData] Final ncRNA metadata count:', Object.keys(results.ncRNAMetadata).length);
        
        // Load Newick (may be gzip-compressed in template mode)
        if (dataPaths.newick) {
          try {
            results.newickStr = await fetchCompressedText(dataPaths.newick);
          } catch (e) {
            console.warn('Failed to load newick:', e);
          }
        }
        results.newickStr = results.newickStr || '';
        
        // Load Domain Metadata (optional)
        if (dataPaths.domainsMetadataParquet || dataPaths.domainsMetadataText) {
          console.log('[loadData] Loading Domain Metadata...');
          if (preferParquet && dataPaths.domainsMetadataParquet) {
            const parquetData = await tryLoadParquet(dataPaths.domainsMetadataParquet);
            if (parquetData) {
              const byId: Record<string, any> = {};
              for (const d of parquetData) {
                const id = d.domain_id || d.domainId || d.id || d.name;
                if (id) byId[id] = d;
              }
              results.domainMetadata = byId;
              console.log('[loadData] Domain Metadata from parquet:', Object.keys(byId).length);
            }
          }
          if (!results.domainMetadata && dataPaths.domainsMetadataText) {
            console.log('[loadData] Loading domain metadata from text...');
            const text = await fetchCompressedText(dataPaths.domainsMetadataText);
            results.domainMetadata = parseDomainsMetadata(text);
            console.log('[loadData] Parsed domain metadata keys:', Object.keys(results.domainMetadata || {}).length);
          }
        }
        results.domainMetadata = results.domainMetadata || {};
        console.log('[loadData] Final domain metadata count:', Object.keys(results.domainMetadata).length);
        
        const finalData = results as ParsedData;
        setParsedData(finalData);
        
        // Update availability flags
        setHasGeneData(finalData.gffFeatures.length > 0);
        setHasDomainData(Object.keys(finalData.domainsByGene).length > 0);
        setHasProteinLinkData(finalData.proteinLinks.length > 0);
        setHasNucleotideLinkData(finalData.nucleotideLinks.length > 0);
        // Detect ncRNA and region features from GFF
        const hasNcRNA = finalData.gffFeatures.some((f: any) => f?.type === 'ncRNA');
        const hasRegions = finalData.gffFeatures.some((f: any) => f?.type === 'region');
        setHasNcRNAData(hasNcRNA);
        setHasRegionsData(hasRegions);
        
        // Detect metadata columns
        if (Object.keys(finalData.proteinMetadata).length > 0) {
          const firstMeta = Object.values(finalData.proteinMetadata)[0];
          if (firstMeta && typeof firstMeta === 'object') {
            const cols = Object.keys(firstMeta).filter(k => !k.startsWith('_'));
            setGeneMetadataColumns(cols);
          }
        }
        if (Object.keys(finalData.treeMetadata).length > 0) {
          const firstMeta = Object.values(finalData.treeMetadata)[0];
          if (firstMeta && typeof firstMeta === 'object') {
            const cols = Object.keys(firstMeta).filter(k => !k.startsWith('_'));
            setTreeMetadataColumns(cols);
          }
        }
        
        onDataLoaded?.(finalData);
        onMetadataColumnsDetected?.({
          gene: geneMetadataColumns,
          tree: treeMetadataColumns,
          domain: domainMetadataColumns,
        });
        
      } catch (error) {
        console.error('[HoodiniDashboard] Data loading failed:', error);
        setLoadError(error as Error);
        onDataError?.(error as Error);
      } finally {
        setIsLoading(false);
        onLoadingChange?.(false);
      }
    };
    
    loadData();
  }, [dataPaths, preParsedData, preferParquet]);

  // ============================================================================
  // LEGEND HANDLING
  // ============================================================================
  
  useEffect(() => {
    if (viewerLegend) {
      onLegendChange?.(viewerLegend);
    }
  }, [viewerLegend, onLegendChange]);

  // ============================================================================
  // CLICK HANDLING
  // ============================================================================
  
  const handleObjectClick = useCallback((objectOrInfo: any) => {
    // HoodiniViz passes the object directly, not wrapped in {object: ...}
    const object = objectOrInfo?.object ?? objectOrInfo;
    if (!object) return;

    // ncRNA metadata hydration fallback (ensures sequence/structure for sidebar)
    const hydrateNcRNAMetadata = (ncObj: any) => {
      try {
        const metadataMap = parsedData?.ncRNAMetadata || {};
        if (!metadataMap || Object.keys(metadataMap).length === 0) return ncObj;
        if (ncObj?.metadata?.sequence || ncObj?.metadata?.structure) return ncObj;

        const normalizeEntry = (entry: any) => {
          if (!entry || typeof entry !== 'object') return entry;
          const m: Record<string, any> = { ...entry };
          if (!m.sequence) m.sequence = m.rna_sequence || m.sequence_nt || m.nucleotide_sequence || m.rna_seq || m.seq || null;
          if (!m.structure) m.structure = m.secondary_structure || m.dot_bracket || m.dbn || m.structure_dbn || null;
          if (!m.type) m.type = m.ncrna_type || m.rna_type || m.subtype || null;
          return m;
        };

        // genomicStart/genomicEnd contain the ORIGINAL genomic coordinates from GFF (absolute)
        // These are the true absolute positions that match the ncrna_metadata keys
        const absStart = Number.isFinite(Number(ncObj.genomicStart)) ? Number(ncObj.genomicStart) : null;
        const absEnd = Number.isFinite(Number(ncObj.genomicEnd)) ? Number(ncObj.genomicEnd) : null;

        const tryAttach = (key: string | null | undefined) => {
          if (!key) return false;
          const entry = metadataMap[key];
          if (entry) {
            ncObj.metadata = { ...(ncObj.metadata || {}), ...normalizeEntry(entry) };
            if (process.env.NODE_ENV !== 'production') {
              console.debug('[Dashboard ncRNA hydrate] key', key, 'seq?', !!ncObj.metadata?.sequence, 'struct?', !!ncObj.metadata?.structure);
            }
            return true;
          }
          return false;
        };

        // Try composite key with original genomic coordinates
        if (absStart !== null && absEnd !== null) {
          const absKey = `${ncObj.seqid}:${absStart}:${absEnd}`;
          if (tryAttach(absKey)) return ncObj;
          // Try swapped start/end for reverse-strand datasets
          const swapKey = `${ncObj.seqid}:${absEnd}:${absStart}`;
          if (tryAttach(swapKey)) return ncObj;
        }

        // Fallback: try adjusted coordinates (start/end from ncRNA object)
        const relStart = Number.isFinite(Number(ncObj.start)) ? Number(ncObj.start) : null;
        const relEnd = Number.isFinite(Number(ncObj.end)) ? Number(ncObj.end) : null;
        if (relStart !== null && relEnd !== null) {
          const relKey = `${ncObj.seqid}:${relStart}:${relEnd}`;
          if (tryAttach(relKey)) return ncObj;
        }

        const origId = ncObj.id || ncObj.originalId;
        tryAttach(origId);
        return ncObj;
      } catch (err) {
        console.debug('[Dashboard] ncRNA hydration failed', err);
        return ncObj;
      }
    };

    if (object?.type === 'ncRNA' || object?.type === 'ncRNA_gene') {
      hydrateNcRNAMetadata(object);
    }
    
    setSelectedObject(object);
    onObjectClick?.(object);
    onSelectionChange?.(object);
  }, [onObjectClick, onSelectionChange, parsedData, vizRef]);

  // ============================================================================
  // ZOOM HANDLERS
  // ============================================================================

  const getGeneKey = useCallback((row: any) => {
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
        // Check for JSON
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
        // Check for semicolon format
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

  const handleZoomGene = useCallback((row: any) => {
    if (!row || !vizRef.current) return;
    
    // Check the type of feature - CDS uses focusGeneById, others use focusFeatureByPosition
    const featureType = row.type || row.featureType || 'CDS';
    const isCDS = featureType === 'CDS' || featureType === 'gene';
    
    if (isCDS) {
      // Original logic for CDS/genes
      const id = getGeneKey(row);
      if (id) {
        vizRef.current.focusGeneById?.(String(id));
        
        // Also set the selected object
        const gv = vizRef.current.genomeView;
        let geneObj = null;
        if (gv && gv.genesById) {
           const idStr = String(id);
           let uniqueId = null;
           
           if (gv._genesByOriginalId && typeof gv._genesByOriginalId.get === 'function') {
             const matches = gv._genesByOriginalId.get(idStr);
             if (matches && matches.length) uniqueId = matches[0];
           }
           
           if (!uniqueId) {
              for (const [uid, g] of Object.entries(gv.genesById || {}) as any) {
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
           
           if (uniqueId) {
             geneObj = gv.genesById[uniqueId];
           }
        }
        
        const selected = {
          type: 'gene',
          id: id,
          metadata: geneObj?.metadata || row,
          ...geneObj
        };
        
        setSelectedObject(selected);
        onSelectionChange?.(selected);
      }
    } else {
      // For regions, ncRNAs, and other feature types - use position-based zoom
      const hoodId = row.seqid || row.hood_id || row.hoodId;
      const start = row.start;
      const end = row.end;
      
      if (hoodId && start != null && end != null) {
        // Pass featureType so focusFeatureByPosition knows where to search
        vizRef.current.focusFeatureByPosition?.(String(hoodId), start, end, featureType);
        
        const selected = {
          type: featureType,
          id: row.id || `${hoodId}:${start}-${end}`,
          metadata: row.metadata || row,
          ...row
        };
        
        setSelectedObject(selected);
        onSelectionChange?.(selected);
      } else {
        console.warn('[HoodiniDashboard] Missing required fields for zoom:', { hoodId, start, end });
      }
    }
  }, [getGeneKey, onSelectionChange]);

  const handleZoomHood = useCallback((row: any) => {
    if (!row || !vizRef.current) return;
    const hood = row.hood_id || row.hoodId || row.seqid;
    if (hood) {
      vizRef.current.focusBaselineByHood?.(String(hood));
    }
  }, []);

  const handleZoomTree = useCallback((row: any) => {
    if (!row || !vizRef.current) return;
    const leaf = row.leaf_id || row.leafId || row.leaf_name || row.leafName || row.id || row.name;
    if (leaf) {
      vizRef.current.focusTreeLeafById?.(String(leaf));
    }
  }, []);

  const isRowZoomable = useCallback((row: any, datasetKey: string) => {
    if (datasetKey === 'hoods') {
      // If visualization isn't ready or doesn't support filtering, show by default
      if (!vizRef.current) return true;
      
      const hoodId = row.hood_id || row.hoodId || row.seqid;
      if (!hoodId) return true;
      
      // Check if hood is hidden via checkbox
      if (hiddenHoodIds.has(String(hoodId)) || hiddenHoodIds.has(Number(hoodId))) {
        return false;
      }
      
      // Check if hood is currently visible (e.g. filtered by clade)
      const visibleHoods = vizRef.current.getVisibleHoods?.();
      if (visibleHoods && visibleHoods instanceof Set) {
        return visibleHoods.has(String(hoodId));
      }
      
      // Fallback to static leaves if dynamic set not available
      const gv = vizRef.current.genomeView;
      if (gv && gv.leaves) {
        return gv.leaves.includes(String(hoodId));
      }
    }
    
    if (datasetKey === 'treeMetadata') {
       if (!vizRef.current) return true;
       const leafId = row.leaf_id || row.leafId || row.leaf_name || row.leafName || row.id || row.name;
       if (!leafId) return true;
       
       // Check if this leaf's corresponding hood is hidden via checkbox
       // (Assuming leaf ID === hood ID, which is standard in this app)
       if (hiddenHoodIds.has(String(leafId)) || hiddenHoodIds.has(Number(leafId))) {
         return false;
       }
       
       // Check if leaf is currently visible (e.g. filtered by clade)
       const visibleLeaves = vizRef.current.getVisibleHoods?.();
       if (visibleLeaves && visibleLeaves instanceof Set) {
         return visibleLeaves.has(String(leafId));
       }
    }
    return true;
  }, [hiddenHoodIds, selectedObject]);

  const visibilityConfig = useMemo(() => {
    // Helper to extract gene ID from attributes (can be string or object)
    const getGeneIdFromAttributes = (attrs: any): string | null => {
      if (!attrs) return null;
      if (typeof attrs === 'string') {
        // Parse "ID=WP_347132630.1" or "ID=WP_347132630.1;Name=..."
        const match = attrs.match(/ID=([^;]+)/);
        return match ? match[1] : null;
      } else if (typeof attrs === 'object') {
        return attrs.ID || attrs.gene_id || attrs.protein_id || null;
      }
      return null;
    };

    return {
      genes: {
        hiddenSet: hiddenGeneIds,
        // Invert so "Checked" = "Hidden", "Unchecked" = "Visible"
        invert: true,
        getRowId: (rowObj: any) => {
          // GFF features store the gene ID in attributes (string or object)
          return rowObj?.gene_id || 
                 getGeneIdFromAttributes(rowObj?.attributes) ||
                 rowObj?.uniqueId || 
                 rowObj?.id || 
                 rowObj?.originalGeneId;
        },
        onToggle: (id: string, visible: boolean) => {
          console.log('[Dashboard] onToggle Gene:', id, 'visible:', visible);
          if (!id) return;
          setHiddenGeneIds(prev => {
            const next = new Set(prev);
            if (visible) next.delete(id);
            else next.add(id);
            console.log('[Dashboard] updated hiddenGeneIds size:', next.size);
            return next;
          });
        }
      },
      hoods: {
        hiddenSet: hiddenHoodIds,
        // Invert so "Checked" = "Hidden", "Unchecked" = "Visible"
        invert: true,
        getRowId: (rowObj: any) => rowObj?.hood_id || rowObj?.seqid || rowObj?.id || rowObj?.name,
        onToggle: (id: string | number, visible: boolean) => {
          console.log('[Dashboard] onToggle Hood:', id, 'visible:', visible);
          if (!id) return;
          setHiddenHoodIds(prev => {
            const next = new Set(prev);
            // Ensure ID type consistency
            const key = String(id);
            // Handle both string/number removal to be safe
            if (visible) {
              next.delete(key);
              next.delete(Number(key));
            } else {
              next.add(key);
            }
            console.log('[Dashboard] updated hiddenHoods size:', next.size);
            return next;
          });
        }
      }
      // Note: treeMetadata does not have visibility toggles
    };
  }, [hiddenGeneIds, hiddenHoodIds]);

  // ============================================================================
  // IMPERATIVE HANDLE (REF API)
  // ============================================================================
  
  useImperativeHandle(ref, () => ({
    // Data access
    getGenomeView: () => vizRef.current?.genomeView ?? null,
    getPhyloTree: () => vizRef.current?.phyloTree ?? null,
    getParsedData: () => parsedData,
    getLegendData: () => vizRef.current?.getLegendData?.() ?? viewerLegend,
    
    // Navigation
    focusGeneById: (geneId: string) => vizRef.current?.focusGeneById?.(geneId),
    focusHoodById: (hoodId: string) => vizRef.current?.focusBaselineByHood?.(hoodId),
    focusTreeLeafById: (leafId: string) => vizRef.current?.focusTreeLeafById?.(leafId),
    
    // Alignment
    alignByCluster: (clusterId: string | number) => {
      updateState('alignCluster', clusterId);
      updateState('useDefaultGeneAlignment', false);
    },
    resetAlignment: () => {
      updateState('alignCluster', null);
      updateState('useDefaultGeneAlignment', true);
    },
    
    // Export
    exportSVG: () => vizRef.current?.exportSVG?.() ?? '',
    
    // State
    getState: () => state,
    setState: (newState: Partial<InitialState>) => {
      for (const [key, value] of Object.entries(newState)) {
        updateState(key, value);
      }
    },
    
    // Refs
    vizRef,
  }), [parsedData, state, updateState, viewerLegend]);

  // ============================================================================
  // RENDER
  // ============================================================================
  
  // Loading state
  if (isLoading) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', ...style }}>
        <div>Loading data...</div>
      </div>
    );
  }
  
  // Error state
  if (loadError) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'red', ...style }}>
        <div>Error loading data: {loadError.message}</div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{
        '--sidebar-width': 'calc(var(--spacing) * 85)',
        '--header-height': 'calc(var(--spacing) * 12)',
        ...style,
      } as React.CSSProperties}
      className={className}
    >
      {showSidebar && (
        <AppSidebar
          variant="inset"
          ultrametric={state.ultrametric}
          setUltrametric={createSetter('ultrametric')}
          showConnectingLines={state.showConnectingLines}
          setShowConnectingLines={createSetter('showConnectingLines')}
          showScrollbar={state.showScrollbar}
          setShowScrollbar={createSetter('showScrollbar')}
          alignLabels={state.alignLabels}
          setAlignLabels={createSetter('alignLabels')}
          alignCluster={state.alignCluster}
          setAlignCluster={createSetter('alignCluster')}
          useDefaultGeneAlignment={state.useDefaultGeneAlignment}
          setUseDefaultGeneAlignment={createSetter('useDefaultGeneAlignment')}
          defaultAlign={state.defaultAlign}
          setDefaultAlign={createSetter('defaultAlign')}
          phyloLabelPosition={state.phyloLabelPosition}
          setPhyloLabelPosition={createSetter('phyloLabelPosition')}
          arrowheadHeight={state.arrowheadHeight}
          geneHeight={state.geneHeight}
          geneLabelPosition={state.geneLabelPosition}
          setGeneLabelPosition={createSetter('geneLabelPosition')}
          geneColorBy={state.geneColorBy}
          setGeneColorBy={createSetter('geneColorBy')}
          treeColorBy={state.treeColorBy}
          setTreeColorBy={createSetter('treeColorBy')}
          domainColorBy={state.domainColorBy}
          setDomainColorBy={createSetter('domainColorBy')}
          treeLabelBy={state.treeLabelBy}
          setTreeLabelBy={createSetter('treeLabelBy')}
          geneLabelBy={state.geneLabelBy}
          setGeneLabelBy={createSetter('geneLabelBy')}
          genePalette={state.genePalette}
          setGenePalette={createSetter('genePalette')}
          phyloPalette={state.phyloPalette}
          setPhyloPalette={createSetter('phyloPalette')}
          domainPalette={state.domainPalette}
          setDomainPalette={createSetter('domainPalette')}
          domainSource={state.domainSource}
          setDomainSource={createSetter('domainSource')}
          ncRNAPalette={state.ncRNAPalette}
          setNcRNAPalette={createSetter('ncRNAPalette')}
          regionPalette={state.regionPalette}
          setRegionPalette={createSetter('regionPalette')}
          proteinLinkConfig={state.proteinLinkConfig}
          setProteinLinkConfig={createSetter('proteinLinkConfig')}
          nucleotideLinkConfig={state.nucleotideLinkConfig}
          setNucleotideLinkConfig={createSetter('nucleotideLinkConfig')}
          treeXScale={state.treeXScale}
          setTreeXScale={createSetter('treeXScale')}
          viewerLegend={viewerLegend}
          setViewerLegend={setViewerLegend}
          phyloTreeViewerRef={vizRef}
          geneMetadataColumns={geneMetadataColumns}
          treeMetadataColumns={treeMetadataColumns}
          domainMetadataColumns={domainMetadataColumns}
          setGeneMetadataColumns={setGeneMetadataColumns}
          setTreeMetadataColumns={setTreeMetadataColumns}
          setDomainMetadataColumns={setDomainMetadataColumns}
          selectedGene={selectedObject}
          handleArrowheadHeightChange={createSetter('arrowheadHeight')}
          handleGeneHeightChange={createSetter('geneHeight')}
          showTreeLayer={state.showTreeLayer}
          setShowTreeLayer={createSetter('showTreeLayer')}
          showGeneLayer={state.showGeneLayer}
          setShowGeneLayer={createSetter('showGeneLayer')}
          showDomainLayer={state.showDomainLayer}
          setShowDomainLayer={createSetter('showDomainLayer')}
          showProteinLinkLayer={state.showProteinLinkLayer}
          setShowProteinLinkLayer={createSetter('showProteinLinkLayer')}
          showNucleotideLinkLayer={state.showNucleotideLinkLayer}
          setShowNucleotideLinkLayer={createSetter('showNucleotideLinkLayer')}
          showNcRNALayer={state.showNcRNALayer}
          setShowNcRNALayer={createSetter('showNcRNALayer')}
          showRegionsLayer={state.showRegionsLayer}
          setShowRegionsLayer={createSetter('showRegionsLayer')}
          showGeneTextLayer={state.showGeneTextLayer}
          setShowGeneTextLayer={createSetter('showGeneTextLayer')}
          showTreeTextLayer={state.showTreeTextLayer}
          setShowTreeTextLayer={createSetter('showTreeTextLayer')}
          hasGeneData={hasGeneData}
          hasDomainData={hasDomainData}
          hasProteinLinkData={hasProteinLinkData}
          hasNucleotideLinkData={hasNucleotideLinkData}
          hasNcRNAData={hasNcRNAData}
          hasRegionsData={hasRegionsData}
          // Format guides
          showFormatGuides={state.showFormatGuides}
          setShowFormatGuides={createSetter('showFormatGuides')}
          formatGuidePreset={state.formatGuidePreset}
          setFormatGuidePreset={createSetter('formatGuidePreset')}
          scaleExportToFormat={state.scaleExportToFormat}
          setScaleExportToFormat={createSetter('scaleExportToFormat')}
          cropToGuides={state.cropToGuides}
          setCropToGuides={createSetter('cropToGuides')}
          scaleRulerWithCrop={state.scaleRulerWithCrop}
          setScaleRulerWithCrop={createSetter('scaleRulerWithCrop')}
          // New visual settings
          ySpacing={state.ySpacing}
          setYSpacing={createSetter('ySpacing')}
          phyloLabelSize={state.phyloLabelSize}
          setPhyloLabelSize={createSetter('phyloLabelSize')}
          geneLabelSize={state.geneLabelSize}
          setGeneLabelSize={createSetter('geneLabelSize')}
          rulerLabelSize={state.rulerLabelSize}
          setRulerLabelSize={createSetter('rulerLabelSize')}
          strokeLineWidth={state.strokeLineWidth}
          setStrokeLineWidth={createSetter('strokeLineWidth')}
          genomeXScale={state.genomeXScale}
          setGenomeXScale={createSetter('genomeXScale')}
        />
      )}
      
      <SidebarInset>
        {/* Toolbar */}
        {showToolbar && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            zIndex: 1000,
            display: 'flex',
            gap: '4px',
            padding: '4px',
            borderRadius: '8px',
          }}>
            {showSidebar && (
              <SidebarTrigger
                className="size-7 flex items-center justify-center border"
                style={{ position: 'static' }}
              />
            )}
            <SVGExportButton phyloTreeViewerRef={vizRef} />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => updateState('showDataTable', !state.showDataTable)}
              aria-label={state.showDataTable ? 'Hide table view' : 'Show table view'}
              className="size-7 border bg-transparent"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <ThemeToggle />
            {toolbarExtra}
          </div>
        )}
        
        {/* Main visualization */}
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {parsedData && (
            <HoodiniVizComponent
              ref={vizRef}
              newickStr={parsedData.newickStr}
              gffFeatures={parsedData.gffFeatures}
              proteinLinks={parsedData.proteinLinks}
              nucleotideLinks={parsedData.nucleotideLinks}
              domainsByGene={parsedData.domainsByGene}
              hoods={parsedData.hoods}
              proteinMetadata={parsedData.proteinMetadata}
              domainMetadata={parsedData.domainMetadata}
              treeMetadata={parsedData.treeMetadata}
              nonCodingMetadata={parsedData.ncRNAMetadata}
              config={config}
              // Alignment
              alignCluster={state.alignCluster}
              useDefaultGeneAlignment={state.useDefaultGeneAlignment}
              defaultAlign={state.defaultAlign}
              // Tree
              ultrametric={state.ultrametric}
              treeXScale={state.treeXScale}
              showConnectingLines={state.showConnectingLines}
              phyloLabelPosition={state.phyloLabelPosition}
              alignLabels={state.alignLabels}
              treeLabelBy={state.treeLabelBy}
              treeColorBy={state.treeColorBy}
              // Genes
              colorBy={state.geneColorBy}
              geneLabelBy={state.geneLabelBy}
              geneHeight={state.geneHeight}
              arrowheadHeight={state.arrowheadHeight}
              geneLabelPosition={state.geneLabelPosition}
              // Domains
              domainColorBy={state.domainColorBy}
              domainSource={state.domainSource}
              // Palettes
              genePalette={state.genePalette}
              domainPalette={state.domainPalette}
              phyloPalette={state.phyloPalette}
              ncRNAPalette={state.ncRNAPalette}
              regionPalette={state.regionPalette}
              // Links
              proteinLinkConfig={state.proteinLinkConfig}
              nucleotideLinkConfig={state.nucleotideLinkConfig}
              // UI
              showScrollbar={state.showScrollbar}
              showRuler={state.showRuler}
              // Format guides
              showFormatGuides={state.showFormatGuides}
              formatGuidePreset={state.formatGuidePreset}
              scaleExportToFormat={state.scaleExportToFormat}
              cropToGuides={state.cropToGuides}
              scaleRulerWithCrop={state.scaleRulerWithCrop}
              // Visual settings (new sliders)
              ySpacing={state.ySpacing}
              phyloLabelSize={state.phyloLabelSize}
              geneLabelSize={state.geneLabelSize}
              rulerLabelSize={state.rulerLabelSize}
              strokeLineWidth={state.strokeLineWidth}
              genomeXScale={state.genomeXScale}
              // Layer visibility
              showTreeLayer={state.showTreeLayer}
              showGeneLayer={state.showGeneLayer}
              showDomainLayer={state.showDomainLayer}
              showProteinLinkLayer={state.showProteinLinkLayer}
              showNucleotideLinkLayer={state.showNucleotideLinkLayer}
              showNcRNALayer={state.showNcRNALayer}
              showRegionsLayer={state.showRegionsLayer}
              showGeneTextLayer={state.showGeneTextLayer}
              showTreeTextLayer={state.showTreeTextLayer}
              // Callbacks
              onObjectClick={handleObjectClick}
              onLegendChange={setViewerLegend}
              hiddenHoodIds={hiddenHoodIds}
              hiddenGeneIds={hiddenGeneIds}
            />
          )}
          
          {/* Data table overlay */}
          {parsedData && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: state.showDataTable ? 360 : 0,
              zIndex: 100,
              overflow: 'hidden',
              transition: 'height 0.3s ease-out',
              background: 'var(--background, #fff)',
              borderTop: state.showDataTable ? '1px solid var(--border, #e5e7eb)' : 'none',
            }}>
              {state.showDataTable && (
                <DataGridView
                  datasets={{
                    genes: { label: `Genes (${parsedData.gffFeatures.length})`, rows: parsedData.gffFeatures },
                    hoods: { label: `Hoods (${parsedData.hoods.length})`, rows: parsedData.hoods },
                    proteinLinks: { label: `Protein Links (${parsedData.proteinLinks.length})`, rows: parsedData.proteinLinks },
                    nucleotideLinks: { label: `Nucleotide Links (${parsedData.nucleotideLinks.length})`, rows: parsedData.nucleotideLinks },
                    proteinMetadata: { label: `Protein Metadata (${Object.keys(parsedData.proteinMetadata || {}).length})`, rows: Object.entries(parsedData.proteinMetadata || {}).map(([id, data]) => ({ id, ...data })) },
                    domainMetadata: { label: `Domain Metadata (${Object.keys(parsedData.domainMetadata || {}).length})`, rows: Object.entries(parsedData.domainMetadata || {}).map(([id, data]) => ({ id, ...data })) },
                    treeMetadata: { label: `Tree Metadata (${Object.keys(parsedData.treeMetadata || {}).length})`, rows: Object.entries(parsedData.treeMetadata || {}).map(([id, data]) => ({ id, ...data })) },
                  }}
                  initialKey="genes"
                  height={360}
                  visibilityConfig={visibilityConfig}
                  onZoomGene={handleZoomGene}
                  onZoomHood={handleZoomHood}
                  onZoomTree={handleZoomTree}
                  isRowZoomable={isRowZoomable}
                />
              )}
            </div>
          )}
        </div>
        
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
});

HoodiniDashboardInner.displayName = 'HoodiniDashboardInner';

/**
 * HoodiniDashboard - Complete genomic neighborhood visualization dashboard.
 * 
 * Provides:
 * - Automatic data loading (Parquet/TSV)
 * - Sidebar with all controls
 * - HoodiniViz visualization
 * - DataGrid for tabular views
 * - Full theme support
 * - Imperative API via ref
 */
export const HoodiniDashboard = React.forwardRef<HoodiniDashboardRef, HoodiniDashboardProps>((props, ref) => {
  const { disableThemeProvider = false, theme = 'system' } = props;
  
  if (disableThemeProvider) {
    return <HoodiniDashboardInner ref={ref} {...props} />;
  }
  
  return (
    <ThemeProvider>
      <HoodiniDashboardInner ref={ref} {...props} />
    </ThemeProvider>
  );
});

HoodiniDashboard.displayName = 'HoodiniDashboard';

export default HoodiniDashboard;
