// HoodiniViz.tsx - Core visualization component (deck.gl rendering only)
// Props-driven, no data loading or parsing
// @ts-nocheck - Using JS classes without TS definitions; type-checking disabled for internal code
import React, { useEffect, useRef, useState, useImperativeHandle } from 'react';
import { isEmptyValue, normalizeKey } from '@/utils/valueUtils.js';
import PhyloTree from '../models/PhyloTree';
import GenomeView from '../models/GenomeView';
import DeckGL from '@deck.gl/react';
import { LineLayer, PolygonLayer, PathLayer, TextLayer, ScatterplotLayer } from '@deck.gl/layers';
import {OrthographicView} from '@deck.gl/core';
import ScrollbarWidget from '../widgets/ScrollbarWidget';
import RulerWidget from '../widgets/RulerWidget';
import TreeScaleWidget from '../widgets/TreeScaleWidget';
import { DEFAULT_CONFIG, VisualizationConfig } from '../config/visualizationConfig';
import { useTheme } from '../contexts/ThemeContext';
import { getPaletteColors } from '../utils/colorPalettes';
import { memoGetPalette as sharedMemoGetPalette } from '../utils/paletteCache';
import { exportToSVG } from '../utils/exportToSVG';
import { parseNonCodingMetadata } from '../utils/parseNonCodingMetadata';
import { parseDomainsMetadata } from '../utils/parseDomainsMetadata';
import GuideOverlay, { FormatPreset } from './GuideOverlay';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** RGBA color as [r, g, b, a] where each value is 0-255 */
export type RGBAColor = [number, number, number, number];

/** Color map for entities - maps entity ID to RGBA color */
export type ColorMap = Record<string, RGBAColor> | Map<string, RGBAColor> | null;

/** GFF Feature representing a gene or genomic feature */
export interface GFFFeatureData {
  seqid: string;
  start: number;
  end: number;
  strand: '+' | '-';
  type?: string;
  attributes?: Record<string, string>;
  [key: string]: unknown;
}

/** Hood (genomic neighborhood) definition */
export interface HoodData {
  seqid: string;
  start: number;
  end: number;
  hood_id?: string | number;
  hoodId?: string | number;
  align_gene?: string;
  [key: string]: unknown;
}

/** Protein-protein homology link */
export interface ProteinLinkData {
  gAId: string;
  gBId: string;
  similarity: number;
  [key: string]: unknown;
}

/** Nucleotide-level synteny link */
export interface NucleotideLinkData {
  seqidA: string;
  startA: number;
  endA: number;
  seqidB: string;
  startB: number;
  endB: number;
  similarity: number;
  [key: string]: unknown;
}

/** Palette configuration for coloring */
export interface PaletteConfig {
  /** Palette type: 'qualitative', 'sequential', or 'diverging' */
  type: 'qualitative' | 'sequential' | 'diverging';
  /** Name of the palette (e.g., 'Set1', 'Blues', 'RdBu') */
  name: string;
  /** Number of colors to use from the palette */
  numColors?: number;
  /** Whether to reverse the palette order */
  reverse?: boolean;
  /** Whether palette coloring is enabled */
  enabled?: boolean;
}

/** Configuration for protein link visualization */
export interface ProteinLinkConfig {
  /** How to color links: 'source_gene', 'target_gene', 'identity_solid', 'identity_gradient' */
  colorBy?: 'source_gene' | 'target_gene' | 'identity_solid' | 'identity_gradient';
  /** Solid color when colorBy is 'identity_solid' */
  solidColor?: RGBAColor;
  /** Whether to use alpha transparency */
  useAlpha?: boolean;
  /** Minimum alpha value (0-1) */
  minAlpha?: number;
  /** Maximum alpha value (0-1) */
  maxAlpha?: number;
  /** Palette for gradient coloring */
  palette?: PaletteConfig;
}

/** Configuration for nucleotide link visualization */
export interface NucleotideLinkConfig {
  /** How to color links: 'solid' or 'identity_gradient' */
  colorBy?: 'solid' | 'identity_gradient';
  /** Solid color for links */
  solidColor?: RGBAColor;
  /** Whether to use strand-based coloring */
  strandColoring?: boolean;
  /** Color for same-strand alignments */
  sameStrandColor?: RGBAColor;
  /** Color for opposite-strand alignments */
  oppositeStrandColor?: RGBAColor;
  /** Whether to use alpha transparency */
  useAlpha?: boolean;
  /** Minimum alpha value (0-1) */
  minAlpha?: number;
  /** Maximum alpha value (0-1) */
  maxAlpha?: number;
}

/** Style configuration for visual layers */
export interface StyleConfig {
  /** Gene layer styles */
  gene?: {
    height?: number;
    arrowheadHeight?: number;
  };
  /** Tree layer styles */
  tree?: {
    xScalePercent?: number;
  };
}

/**
 * Props for the HoodiniViz component.
 * 
 * HoodiniViz is the core visualization component that renders phylogenetic trees,
 * genomic neighborhoods, protein domains, and homology links using deck.gl.
 */
export interface HoodiniVizProps {
  // ============================================================================
  // DATA PROPS
  // ============================================================================
  
  /** 
   * Newick format string for the phylogenetic tree.
   * @example "((A:0.1,B:0.2):0.3,C:0.4);"
   */
  newickStr?: string;
  
  /** 
   * Array of GFF features (genes) to display.
   * Each feature should have seqid, start, end, strand, and attributes.
   */
  gffFeatures?: GFFFeatureData[];
  
  /** 
   * Protein-protein homology links between genes.
   * Used to draw connecting curves between related genes.
   */
  proteinLinks?: ProteinLinkData[];
  
  /** 
   * Nucleotide-level synteny links between genomic regions.
   * Used to draw connecting polygons showing synteny blocks.
   */
  nucleotideLinks?: NucleotideLinkData[];
  
  /** 
   * Domain annotations organized by gene ID.
   * @example { "gene1": [{ domainId: "PF00001", start: 10, end: 100 }] }
   */
  domainsByGene?: Record<string, Array<{
    domainId: string;
    start: number;
    end: number;
    source?: string;
    evalue?: number;
    coverage?: number;
  }>>;
  
  /** 
   * Hood (genomic neighborhood) definitions.
   * Each hood groups genes from a contig/sequence.
   */
  hoods?: HoodData[];
  
  /** 
   * Protein metadata for additional gene information.
   * Used for coloring by cluster, labeling, etc.
   * Keys are gene IDs (e.g., WP_347132630.1)
   */
  proteinMetadata?: Record<string, {
    id?: string;
    cluster?: string | number;
    product?: string;
    sequence?: string;
    color?: string;
    [key: string]: unknown;
  }>;
  
  /** 
   * Domain metadata with additional domain information.
   */
  domainMetadata?: Array<{
    domainId: string;
    name?: string;
    description?: string;
    [key: string]: unknown;
  }>;
  
  /** 
   * Tree leaf metadata for phylogenetic labels and coloring.
   * Keys are leaf IDs/names from the Newick tree.
   */
  treeMetadata?: Record<string, {
    leaf_id?: string;
    [key: string]: unknown;
  }>;

  // ============================================================================
  // ALIGNMENT PROPS
  // ============================================================================
  
  /** 
   * Cluster ID to align all hoods by.
   * When set, genes matching this cluster will be aligned vertically.
   * @default null (no cluster alignment)
   */
  alignCluster?: string | number | null;
  
  /** 
   * Default alignment position when no alignCluster is set.
   * @default 'start'
   */
  defaultAlign?: 'start' | 'center' | 'end';
  
  /** 
   * Whether to use each hood's default alignment gene (align_gene column).
   * When true, each hood aligns by its own specified gene.
   * @default true
   */
  useDefaultGeneAlignment?: boolean;

  // ============================================================================
  // COLORING & LABELING PROPS
  // ============================================================================
  
  /** 
   * Field to color genes by.
   * @default 'cluster'
   */
  colorBy?: string;
  
  /** 
   * Field to color genes by (alternative prop name).
   */
  geneColorBy?: string;
  
  /** 
   * Field to use for gene labels.
   */
  labelBy?: string;
  
  /** 
   * Field to use for gene labels (alternative prop name).
   */
  geneLabelBy?: string;
  
  /** 
   * Field to color tree labels by.
   */
  treeColorBy?: string;
  
  /** 
   * Field to use for tree labels.
   */
  treeLabelBy?: string;
  
  /** 
   * Field to color domains by.
   * @default 'domainName'
   */
  domainColorBy?: string;
  
  /** 
   * Filter domains by source.
   * @default 'all'
   */
  domainSource?: string;

  // ============================================================================
  // PALETTE PROPS
  // ============================================================================
  
  /** Palette configuration for gene coloring */
  genePalette?: PaletteConfig;
  
  /** Palette configuration for domain coloring */
  domainPalette?: PaletteConfig;
  
  /** Palette configuration for phylogenetic label coloring */
  phyloPalette?: PaletteConfig;
  
  /** Palette configuration for ncRNA coloring */
  ncRNAPalette?: PaletteConfig;
  
  /** Palette configuration for region coloring */
  regionPalette?: PaletteConfig;

  // ============================================================================
  // CUSTOM COLOR MAPS
  // ============================================================================
  
  /** 
   * Custom colors for genes, overriding palette assignment.
   * @example { "gene1": [255, 0, 0, 255] }
   */
  geneColors?: ColorMap;
  
  /** 
   * Custom colors for phylo labels, overriding palette assignment.
   * @example { "leaf1": [0, 255, 0, 255] }
   */
  phyloColors?: ColorMap;

  // ============================================================================
  // LINK CONFIGURATION PROPS
  // ============================================================================
  
  /** Configuration for protein link visualization */
  proteinLinkConfig?: ProteinLinkConfig;
  
  /** Configuration for nucleotide link visualization */
  nucleotideLinkConfig?: NucleotideLinkConfig;

  // ============================================================================
  // VISUAL STYLE PROPS
  // ============================================================================
  
  /** 
   * Height of gene arrow shapes in pixels.
   */
  geneHeight?: number;
  
  /** 
   * Height of the arrowhead tip. 0 = flat rectangle, >0 = arrow shape.
   */
  arrowheadHeight?: number;
  
  /** 
   * X-axis scale factor for the phylogenetic tree (percentage).
   * 100 = actual size, 50 = compressed, 200 = stretched.
   */
  treeXScale?: number;
  
  /** 
   * Position of phylogenetic labels.
   * @default 'after-tree'
   */
  phyloLabelPosition?: 'after-tree' | 'after-tracks';
  
  /** 
   * Whether to align all phylo labels to the same X coordinate.
   * @default true
   */
  alignLabels?: boolean;
  
  /** 
   * Position of gene labels relative to genes.
   * @default 'bottom'
   */
  geneLabelPosition?: 'top' | 'bottom' | 'center';
  
  /** 
   * Whether to render the tree as ultrametric (all leaves at same X).
   * @default false
   */
  ultrametric?: boolean;
  
  /** 
   * Additional style configuration for layers.
   */
  styleConfig?: StyleConfig;

  // ============================================================================
  // VISIBILITY PROPS
  // ============================================================================
  
  /** 
   * Set of visible gene IDs. Null = show all genes.
   */
  visibleGeneIds?: Set<string> | null;
  
  /** 
   * Set of hidden hood IDs.
   */
  hiddenHoodIds?: Set<string | number>;
  
  /** 
   * Whether to show the scrollbar widget.
   */
  showScrollbar?: boolean;
  
  /** 
   * Whether to show the ruler widget.
   * @default true
   */
  showRuler?: boolean;
  
  /** 
   * Whether to show the SVG export widget.
   * @default false
   */
  showSVGWidget?: boolean;
  
  /** 
   * Whether to show connecting lines between tree and tracks.
   * @default false
   */
  showConnectingLines?: boolean;

  // ============================================================================
  // LAYER VISIBILITY PROPS
  // ============================================================================
  
  /** Show/hide tree layer. @default true */
  showTreeLayer?: boolean;
  
  /** Show/hide gene layer. @default true */
  showGeneLayer?: boolean;
  
  /** Show/hide domain layer. @default true */
  showDomainLayer?: boolean;
  
  /** Show/hide protein link layer. @default true */
  showProteinLinkLayer?: boolean;
  
  /** Show/hide nucleotide link layer. @default true */
  showNucleotideLinkLayer?: boolean;
  
  /** Show/hide ncRNA layer. @default true */
  showNcRNALayer?: boolean;
  
  /** Show/hide gene text labels. @default true */
  showGeneTextLayer?: boolean;
  
  /** Show/hide tree text labels. @default true */
  showTreeTextLayer?: boolean;

  // ============================================================================
  // INTERACTION PROPS
  // ============================================================================
  
  /** 
   * Hood ID to flash/highlight temporarily.
   */
  flashHood?: string | number | null;
  
  /** 
   * Adjacency parameter for filtering (N neighbors).
   * @default 1
   */
  adjacencyN?: number;

  // ============================================================================
  // CALLBACK PROPS
  // ============================================================================
  
  /** 
   * Callback when a visualization object is clicked.
   * Receives the clicked object's data.
   */
  onObjectClick?: (info: { object?: unknown; layer?: unknown }) => void;
  
  /** 
   * Callback when legend data changes.
   */
  onLegendChange?: (legendData: unknown) => void;
  
  /** 
   * Callback to receive the GenomeView instance reference.
   */
  setGenomeViewRef?: (genomeView: GenomeView | null) => void;

  // ============================================================================
  // ADVANCED PROPS
  // ============================================================================
  
  /** 
   * Master visualization configuration object.
   * Contains all default values for tree, gene, domain, link, and UI parameters.
   * Individual props override corresponding config values.
   * @default DEFAULT_CONFIG
   */
  config?: VisualizationConfig;
  
  /** 
   * Counter to force re-renders when external state changes.
   * @default 1000
   */
  forceUpdateCounter?: number;

  // ============================================================================
  // FORMAT GUIDE PROPS
  // ============================================================================
  
  /** 
   * Whether format guides are visible.
   * @default false
   */
  showFormatGuides?: boolean;
  
  /** 
   * Selected format preset for guides.
   */
  formatGuidePreset?: FormatPreset | null;
  
  /** 
   * Whether to scale SVG exports to match the format guide dimensions.
   * @default false
   */
  scaleExportToFormat?: boolean;
  
  /**
   * Whether to crop SVG exports to the guide bounds (only export content within guides).
   * @default true (when scaleExportToFormat is enabled)
   */
  cropToGuides?: boolean;

  /**
   * Whether to scale ruler dimensions proportionally when cropping to guides.
   * When true, ruler will appear the same relative size as in the viewport.
   * @default true
   */
  scaleRulerWithCrop?: boolean;

  // ============================================================================
  // VISUAL SETTINGS PROPS (new sliders)
  // ============================================================================
  
  /** 
   * Vertical spacing between tree leaves (pixels).
   * @default 80
   */
  ySpacing?: number;
  
  /** 
   * Font size for phylogenetic labels (pixels).
   * @default 20
   */
  phyloLabelSize?: number;
  
  /** 
   * Font size for gene labels (pixels).
   * @default 12
   */
  geneLabelSize?: number;
  
  /** 
   * Font size for ruler labels (pixels).
   * @default 14
   */
  rulerLabelSize?: number;
  
  /** 
   * Stroke/line width for edges (e.g., domains, genes).
   * @default 0.1
   */
  strokeLineWidth?: number;
  
  /** 
   * X-axis scale for genome section (percentage).
   * 100 = actual size, 30 = compressed, >100 = stretched.
   * @default 30
   */
  genomeXScale?: number;
}

// Toggle verbose debug/perf logging in Storybook
const DEBUG_LOGS = true;

const HoodiniViz = React.forwardRef<unknown, HoodiniVizProps>(({
  newickStr,
  gffFeatures,
  proteinLinks, 
  nucleotideLinks,
  domainsByGene,
  hoods,
  hiddenHoodIds,
  visibleGeneIds,
  showScrollbar,
  setGenomeViewRef,
  onLegendChange,
  alignCluster,
  defaultAlign = 'start',
  useDefaultGeneAlignment = true,
  showRuler = true,
  onObjectClick,
  showSVGWidget = false,
  proteinMetadata,
  domainMetadata,
  colorBy = 'cluster',
  labelBy,
  treeMetadata,
  treeLabelBy,
  treeColorBy, 
  config = DEFAULT_CONFIG,
  ultrametric = false,
  showConnectingLines = false,
  forceUpdateCounter = 1000,
  phyloLabelPosition = 'after-tree',
  alignLabels = true,
  // Committed values (only update when slider is released)
  arrowheadHeight,
  geneHeight,
  genePalette,
  domainPalette,
  phyloPalette,
  ncRNAPalette,
  regionPalette,
  geneColorBy,
  geneLabelBy,
  domainColorBy = 'domainName', // Add this prop
  domainSource = 'all',
  proteinLinkConfig, // Add protein link configuration prop
  nucleotideLinkConfig, // Add nucleotide link configuration prop
  styleConfig, // Add styleConfig prop for layers
  treeXScale, // external tree X-scale percent (optional)
  adjacencyN = 1,
  // Layer visibility props
  showTreeLayer = true,
  showGeneLayer = true,
  showDomainLayer = true,
  showProteinLinkLayer = true,
  showNucleotideLinkLayer = true,
  showNcRNALayer = true,
  showGeneTextLayer = true,
  showTreeTextLayer = true,
  geneLabelPosition = 'bottom',
  flashHood = null,
  // Custom color maps - override automatic palette assignment
  // Format: { entityId: [r, g, b, a] } or Map<string, [r, g, b, a]>
  geneColors = null,   // Custom colors for genes by gene ID
  phyloColors = null,  // Custom colors for phylo labels by leaf name
  // Format guide props
  showFormatGuides = false,
  formatGuidePreset = null,
  scaleExportToFormat = false,
  cropToGuides = true, // Default to true when scale to format is enabled
  scaleRulerWithCrop = true, // Default to true - match viewport ruler appearance
  // Visual settings props (new sliders)
  ySpacing: ySpacingProp,
  phyloLabelSize: phyloLabelSizeProp,
  geneLabelSize: geneLabelSizeProp,
  rulerLabelSize: rulerLabelSizeProp,
  strokeLineWidth: strokeLineWidthProp,
  genomeXScale: genomeXScaleProp,
}, ref) => {
  // RENDER DIAGNOSTICS: count renders and show which key props changed
  const _renderCount = useRef(0);
  const _prevProps = useRef({});
  React.useEffect(() => {
    _renderCount.current += 1;
    try {
      const keys = ['treeXScale', 'arrowheadHeight', 'geneHeight', 'alignmentVersion', 'paletteVersion', 'geneColorBy', 'colorBy', 'phyloLabelPosition'];
      const current = {
        treeXScale: treeXScale,
        arrowheadHeight: arrowheadHeight,
        geneHeight: geneHeight,
        alignmentVersion: alignmentVersion,
        paletteVersion: typeof paletteVersion !== 'undefined' ? paletteVersion : null,
        geneColorBy: geneColorBy,
        colorBy: colorBy,
        phyloLabelPosition: phyloLabelPosition
      };
      const changed = keys.filter(k => _prevProps.current[k] !== current[k]);
      if (changed.length > 0) {
        if (DEBUG_LOGS) console.log(`HoodiniViz render #${_renderCount.current} changed props:`, changed, current);
      } else {
        if (DEBUG_LOGS) console.log(`HoodiniViz render #${_renderCount.current} (no key-prop change)`);
      }
      _prevProps.current = current;
    } catch (e) {}
  });
  // Theme context — use resolvedTheme so we react to system resolution immediately
  const { getThemeColors, theme, resolvedTheme } = useTheme();
  const themeColors = React.useMemo(() => getThemeColors(resolvedTheme), [resolvedTheme]);
  // Use shared palette cache helper for consistent memoization across modules
  const memoGetPalette = sharedMemoGetPalette;
  const hiddenHoodSet = React.useMemo(() => {
    if (!hiddenHoodIds) return new Set();
    if (hiddenHoodIds instanceof Set) return hiddenHoodIds;
    if (Array.isArray(hiddenHoodIds)) return new Set(hiddenHoodIds);
    return new Set();
  }, [hiddenHoodIds]);

  // Normalize custom color maps to Map<string, RGBA> format
  // Accepts: null, Map, or plain object { id: [r,g,b,a] }
  const normalizedGeneColors = React.useMemo(() => {
    if (!geneColors) return null;
    if (geneColors instanceof Map) return geneColors;
    if (typeof geneColors === 'object') {
      const map = new Map();
      for (const [key, value] of Object.entries(geneColors)) {
        map.set(String(key), value);
      }
      return map;
    }
    return null;
  }, [geneColors]);

  const normalizedPhyloColors = React.useMemo(() => {
    if (!phyloColors) return null;
    if (phyloColors instanceof Map) return phyloColors;
    if (typeof phyloColors === 'object') {
      const map = new Map();
      for (const [key, value] of Object.entries(phyloColors)) {
        map.set(String(key), value);
      }
      return map;
    }
    return null;
  }, [phyloColors]);

  const getHoodKey = React.useCallback((hoodId, hoodObj) => {
    if (!hoodId) return null;
    const start = hoodObj?.origStart ?? hoodObj?.start;
    const end = hoodObj?.origEnd ?? hoodObj?.end;
    if (start != null && end != null) return `${hoodId}:${start}-${end}`;
    return String(hoodId);
  }, []);

  const hoodsSignature = React.useMemo(() => {
    if (!hoods || !Array.isArray(hoods)) return 'none';
    try {
      return hoods
        .map((b) => getHoodKey(b?.hood_id || b?.hoodId || b?.seqid, b) || '')
        .join('|');
    } catch (e) {
      return `len:${hoods.length}`;
    }
  }, [hoods, getHoodKey]);
  // Ruler height used to reserve space for the ruler overlay when present
  const rulerHeight = (config && config.ruler && typeof config.ruler.height === 'number') ? config.ruler.height : DEFAULT_CONFIG.ruler.height;

  // Helper: robustly resolve metadata for a leaf name. treeMetadata may be keyed
  // by leaf_id or another id, so try direct key first then search common id fields.
  const getMetaForLeaf = (leafName) => {
    if (!treeMetadata) return {};
    if (treeMetadata[leafName]) return treeMetadata[leafName];
    const vals = Object.values(treeMetadata);
    for (let i = 0; i < vals.length; ++i) {
      const e = vals[i];
      if (!e) continue;
      if (e.leaf_id == leafName || e.leaf_id === leafName) return e;
      if (e.leaf_name == leafName || e.leaf_name === leafName) return e;
      if (e.id == leafName || e.id === leafName) return e;
      if (e.name == leafName || e.name === leafName) return e;
      if (e.originalId == leafName || e.original_id == leafName) return e;
    }
    return {};
  };
  
  // Visualization state
  const [selectedNode, setSelectedNode] = useState(null);
  const [alignmentVersion, setAlignmentVersion] = useState(0); // Trigger for alignment changes only
  const [metadataAttached, setMetadataAttached] = useState(false); // Track when metadata is ready
  const containerRef = React.useRef(null);
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });
  // NOTE: treeLabelPadding is now computed via useMemo below, not useState
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const [treeXScalePercent, setTreeXScalePercent] = useState(config?.tree?.xScalePercent || DEFAULT_CONFIG.tree.xScalePercent);
  const effectiveTreeXScale = (treeXScale !== undefined && treeXScale !== null) ? treeXScale : treeXScalePercent;
  const [viewState, setViewState] = useState({
    target: [0, 0, 0],
    zoom: -2
  });
  const [flashGeneId, setFlashGeneId] = useState(null);
  const [flashTreeLeaf, setFlashTreeLeaf] = useState(null);
  
  // ========== OVERLAY STRATEGY FOR GLOW EFFECT ==========
  // Store the actual highlighted data (not just the ID) to avoid filtering large arrays
  // These states only update on click, not on every frame
  const [highlightedGeneData, setHighlightedGeneData] = useState(null);
  const [highlightedTreeLeafData, setHighlightedTreeLeafData] = useState(null);
  const [highlightedTreeNodeData, setHighlightedTreeNodeData] = useState(null); // Internal tree nodes
  const [highlightedHoodData, setHighlightedHoodData] = useState(null);
  
  // Flag to track if baseline highlight was set internally (via focusBaselineByHood)
  // This prevents the flashHood effect from overwriting internal highlights
  const internalHoodHighlightRef = useRef(false);
  
  // ========== ANIMATED GLOW SYSTEM (NO REACT RE-RENDERS) ==========
  // Animation runs via requestAnimationFrame and updates DeckGL directly via deck.setProps()
  const deckGlRef = useRef(null); // React ref to DeckGL component
  const glowAnimationRef = useRef(null);
  const glowTickRef = useRef(0);
  const baseLayersRef = useRef([]); // Store base layers for combining with animated glow
  
  // Static bounds for scrollbar - computed once when data loads, not affected by visibility toggles
  const staticBoundsRef = React.useRef(null);
  
  // Debug: log selection changes so we can confirm click handling
  React.useEffect(() => {
    try {
      console.debug('[HoodiniViz] mounted; initial selectedNode=', selectedNode);
    } catch (e) {}
    return () => {};
  }, []);

  React.useEffect(() => {
    try {
      console.debug('[HoodiniViz] selectedNode changed ->', selectedNode && (selectedNode.id || selectedNode.name || selectedNode));
    } catch (e) {}
  }, [selectedNode]);

  const stopGeneFlash = React.useCallback(() => {
    setFlashGeneId(null);
    setHighlightedGeneData(null);
  }, []);

  // Stop baseline highlight/flash
  const stopHoodFlash = React.useCallback(() => {
    internalHoodHighlightRef.current = false;
    setHighlightedHoodData(null);
  }, []);

  // Stop tree leaf highlight/flash
  const stopTreeLeafFlash = React.useCallback(() => {
    setFlashTreeLeaf(null);
    setHighlightedTreeLeafData(null);
  }, []);

  // Stop tree internal node highlight
  const stopTreeNodeFlash = React.useCallback(() => {
    setHighlightedTreeNodeData(null);
  }, []);

  // Trigger gene highlight - accepts the full gene object to avoid filtering
  const triggerGeneFlash = React.useCallback((geneId, geneObject = null) => {
    if (!geneId) {
      stopGeneFlash();
      return;
    }
    setFlashGeneId(String(geneId));
    // Store the actual gene data for the glow layer (avoids filtering large array)
    if (geneObject) {
      setHighlightedGeneData([geneObject]);
    }
  }, [stopGeneFlash]);

  // Track previous flashHood to avoid clearing on unrelated re-renders
  const prevFlashHoodRef = useRef(flashHood);

  // Handle baseline flash from props (used by external controls)
  useEffect(() => {
    const prevValue = prevFlashHoodRef.current;
    prevFlashHoodRef.current = flashHood;
    
    // Skip if baseline highlight was set internally (via focusBaselineByHood)
    if (internalHoodHighlightRef.current) {
      return;
    }
    
    // Only clear if flashHood explicitly changed to null/undefined
    // Don't clear if it was already null (this prevents clearing on unrelated re-renders)
    if (!flashHood) {
      if (prevValue) {
        // Was something, now null - clear the highlight
        setHighlightedHoodData(null);
      }
      // If prevValue was also null, don't do anything (preserve current highlight state)
      return;
    }
    // Get target baseline ID
    const targetId = typeof flashHood === 'string'
      ? flashHood
      : (flashHood?.id != null ? String(flashHood.id) : null);
    
    if (!targetId || !genomeViewRef.current) {
      setHighlightedHoodData(null);
      return;
    }
    
    // Filter baselines (this happens ONCE when prop changes, not on every render)
    const hoodLinks = genomeViewRef.current.nucleotideLinks?.filter(link => link.hood) || [];
    const matchedHoods = hoodLinks.filter((b) => {
      const hoodStr = b?.hood_id != null ? String(b.hood_id) : null;
      const seqStr = b?.seqid != null ? String(b.seqid) : null;
      return hoodStr === targetId || seqStr === targetId;
    });
    
    setHighlightedHoodData(matchedHoods.length > 0 ? matchedHoods : null);
  }, [flashHood]);

  // If the gene label vertical position changes, force an alignmentVersion bump
  // so DeckGL layers that depend on alignmentVersion or geneLabelPosition will
  // re-evaluate their accessors immediately (avoids needing manual "Force refresh").
  useEffect(() => {
    try {
      setAlignmentVersion(v => (v || 0) + 1);
    } catch (e) {}
  }, [geneLabelPosition]);

  // Use a ref for genomeView so it persists across renders
  const genomeViewRef = useRef(null);
  const rulerWidgetRef = useRef(null); // Ref to access ruler ticks for SVG export
  // Perf guards: avoid recomputing genome geometry when only tree X-scale changes
  const lastEffectiveTreeXScaleRef = useRef(effectiveTreeXScale);
  const lastGeometrySignatureRef = useRef(null);
  
  // Cache for layers to avoid expensive rebuild on flash-only changes
  const cachedLayersRef = useRef(null);
  const cachedLayersDepsRef = useRef(null);
  
  // 🚀 PERFORMANCE: Cache genesData to avoid rebuilding 92k+ items when only colors change
  const cachedGenesDataRef = useRef(null);
  const cachedGenesDataSignatureRef = useRef(null);
  
  // 🚀 PERFORMANCE: Cache other expensive computations when only colors change
  const cachedBoundsRef = useRef(null);
  const cachedHoodsRef = useRef(null);
  const cachedTreeNodesRef = useRef(null);
  const cachedGeometrySignatureRef = useRef(null);
  
  // Track whether we're in manual manipulation mode to prevent alignment reset
  const isManualManipulation = useRef(false);

  // No bundled default non-coding metadata; derive ncRNA metadata from GFF when needed
  const nonCodingMetadata = null;

  // 🚀 PERFORMANCE: Memoize expensive proteinMetadata operations
  const proteinMetadataEntries = React.useMemo(() => {
    if (!proteinMetadata) return [];
    return Object.values(proteinMetadata);
  }, [proteinMetadata]);

  // 🚀 PERFORMANCE: Build a strict cluster map once from proteinMetadata.cluster; don't depend on UI fields
  const strictClusterMap = React.useMemo(() => {
    if (!proteinMetadataEntries.length) return null;
    const out = {};
    for (const entry of proteinMetadataEntries) {
        // Prefer canonical 'id' field; accept legacy 'gene_id' or 'geneId'
        const gid = entry?.id || entry?.gene_id || entry?.geneId;
      if (!gid) continue;
      const c = (entry?.cluster ?? entry?.clusterId ?? entry?.cluster_id);
      if (c === undefined || c === null || c === '') continue;
      out[gid] = c;
    }
    return Object.keys(out).length ? out : null;
  }, [proteinMetadataEntries]);

  // Extract primitive values to break dependency on config object reference  
  // ALL config properties are now visual-only - they just affect polygon shapes and positioning,
  // not the fundamental data structure (genes, proteins, links, domains stay the same)
  // No structural properties needed anymore!

  // Memoize only based on actual data changes - NO config dependencies
  // All config properties are visual-only and handled by the visual update effect
  const structuralConfigValues = React.useMemo(() => {
    const result = {
      // NO CONFIG PROPERTIES HERE - they're all visual-only!
      // The data structure (genes, proteins, links, domains) only depends on the actual data,
      // not on how it's displayed (tip width, bezier segments, heights, spacing, etc.)
    };
    
    return result;
  }, [
    // NO DEPENDENCIES - core data only depends on actual data, not visual config
  ]);

  // Check if we have a valid newick tree
  const hasNewick = newickStr && typeof newickStr === 'string' && newickStr.trim() !== '';

  // When no newick is provided, extract leaves from hoods ordered by hood_id
  const hoodsOrderedLeaves = React.useMemo(() => {
    if (hasNewick || !hoods || !Array.isArray(hoods)) return null;
    // Extract unique hood_ids and sort them naturally (numeric aware)
    const hoodIds = [...new Set(hoods.map(h => h?.hood_id || h?.hoodId || h?.seqid).filter(Boolean))];
    // Natural sort: numeric parts sorted numerically
    hoodIds.sort((a, b) => {
      const aStr = String(a);
      const bStr = String(b);
      // Try numeric comparison first
      const aNum = parseFloat(aStr);
      const bNum = parseFloat(bStr);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      // Fall back to string comparison
      return aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' });
    });
    return hoodIds.map(String);
  }, [hasNewick, hoods]);

  // Create a config for tree creation that includes ySpacing from props
  const treeConfig = React.useMemo(() => {
    const effectiveYSpacing = typeof ySpacingProp === 'number' ? ySpacingProp : (config?.tree?.ySpacing || DEFAULT_CONFIG.tree.ySpacing);
    return {
      ...config,
      tree: {
        ...config?.tree,
        ySpacing: effectiveYSpacing
      }
    };
  }, [config, ySpacingProp]);

  // Create a config for GenomeView that includes BOTH ySpacing AND genomeXScale
  // This ensures when genomeView is recreated due to ySpacing change,
  // it uses the correct xScalePercent for alignment calculations
  const genomeViewConfig = React.useMemo(() => {
    const effectiveYSpacing = typeof ySpacingProp === 'number' ? ySpacingProp : (config?.tree?.ySpacing || DEFAULT_CONFIG.tree.ySpacing);
    const effectiveGenomeXScale = typeof genomeXScaleProp === 'number' ? genomeXScaleProp : (config?.genome?.xScalePercent || DEFAULT_CONFIG.genome.xScalePercent);
    return {
      ...config,
      tree: {
        ...config?.tree,
        ySpacing: effectiveYSpacing
      },
      genome: {
        ...config?.genome,
        xScalePercent: effectiveGenomeXScale
      }
    };
  }, [config, ySpacingProp, genomeXScaleProp]);

  // Memoize tree creation separately - ultrametric only affects tree, not genome
  const tree = React.useMemo(() => {
    // If no newick, create flat tree from hoods ordered by hood_id
    const source = hasNewick ? newickStr : (hoodsOrderedLeaves || []);
    const newTree = new PhyloTree(source, treeConfig, ultrametric);
    const leavesToUse = newTree.getLeafNodes().map(n => n.name);
    newTree.layout(leavesToUse);
    return newTree;
  }, [newickStr, hasNewick, hoodsOrderedLeaves, ultrametric, treeConfig, structuralConfigValues]);

  // Create a base tree for GenomeView that doesn't change with ultrametric
  const baseTree = React.useMemo(() => {
    const source = hasNewick ? newickStr : (hoodsOrderedLeaves || []);
    const newTree = new PhyloTree(source, treeConfig, false); // Always non-ultrametric for genome
    const leavesToUse = newTree.getLeafNodes().map(n => n.name);
    newTree.layout(leavesToUse);
    return newTree;
  }, [newickStr, hasNewick, hoodsOrderedLeaves, treeConfig, structuralConfigValues]);

  // Memoize core data processing to avoid recomputing on style changes
  // Only depend on actual structural data and essential config properties
  const genomeView = React.useMemo(() => {
    
    // Use the base tree that doesn't change with ultrametric
    const leavesToUse = baseTree.getLeafNodes().map(n => n.name);
    
    // Use genomeViewConfig which includes BOTH ySpacing AND genomeXScaleProp
    // This ensures alignment calculations use the correct xScale when genomeView is recreated
    const newGenomeView = new GenomeView(leavesToUse, baseTree, genomeViewConfig);
    
    newGenomeView.addFeatures(gffFeatures);
    
    if (hoods) {
      newGenomeView.applyHoods(hoods);
    }
    
    newGenomeView.initGenes();
    
    // 🔧 FIX: Set proteinClusters BEFORE alignment so alignCluster can find genes
    // This must happen after initGenes() creates the genes and before alignCluster()
    if (strictClusterMap && Object.keys(strictClusterMap).length > 0) {
      newGenomeView.proteinClusters = {};
      if (!newGenomeView._genesIndexReady) newGenomeView._buildGeneIndex();
      
      for (const originalGeneId of Object.keys(strictClusterMap)) {
        const cluster = strictClusterMap[originalGeneId];
        const normCluster = (cluster === undefined || cluster === null) ? null : String(cluster).trim();
        const ids = newGenomeView._genesByOriginalId.get(originalGeneId) || [];
        for (const uid of ids) newGenomeView.proteinClusters[uid] = normCluster;
      }
    }
    
    // Compute initial track positions so genes have valid polygons
    newGenomeView.computeTrackPositions();
    
    // Apply initial alignment immediately to avoid double render
    if (alignCluster != null && alignCluster !== '') {
      newGenomeView.alignCluster(String(alignCluster));
    } else {
      const hasDefaultGenes = Object.values(newGenomeView.hoodRanges || {}).some(hoodRange => hoodRange.align_gene);
      if (useDefaultGeneAlignment && hasDefaultGenes) {
        newGenomeView.alignByDefaultGenes();
      } else {
        if (defaultAlign === 'center') {
          newGenomeView.alignAllToCenter();
        } else if (defaultAlign === 'end') {
          newGenomeView.alignAllToEnd();
        } else {
          newGenomeView.alignAllToStart();
        }
      }
    }
    
  newGenomeView.addDomains(domainsByGene);
  
  // Attach domain metadata if provided
  if (domainMetadata) {
    newGenomeView.addDomainMetadata(domainMetadata);
  }
  
  // Pass adjacencyN so links are filtered to nearby leaves (N=1 -> adjacent only)
  newGenomeView.addProteinLinks(proteinLinks, [200, 200, 200, 255], adjacencyN);
  newGenomeView.addNucleotideLinks(nucleotideLinks, [200, 200, 200, 255], adjacencyN);

  // 🚀 PERFORMANCE: Integrate metadata attachment directly into GenomeView creation
    // This ensures metadata is available from the very first render, just like tree metadata
    if (proteinMetadata && Object.keys(proteinMetadata).length > 0) {
      const metaAttachStart = performance.now();
      let attachedCount = 0;
      
      // Attach protein metadata to genes immediately during construction
      for (const uniqueGeneId in newGenomeView.genesById) {
        const gene = newGenomeView.genesById[uniqueGeneId];
        const originalGeneId = gene.originalGeneId;
        if (originalGeneId && proteinMetadata[originalGeneId]) {
          gene.metadata = proteinMetadata[originalGeneId];
          attachedCount++;
        } else {
          gene.metadata = {}; // Ensure consistent state
        }
      }
      
      // Set cluster metadata on genes (proteinClusters already set above before alignment)
      if (strictClusterMap && newGenomeView.proteinClusters) {
        // Invalidate cluster summary cache when clusters change
        newGenomeView._clusterSummary = null;
        
        // Set cluster metadata without colors (colors applied in separate effect)
        for (const uniqueGeneId in newGenomeView.genesById) {
          const gene = newGenomeView.genesById[uniqueGeneId];
          const cluster = newGenomeView.proteinClusters[uniqueGeneId];
          if (!gene.metadata) gene.metadata = {};
          gene.metadata.clusterId = cluster || null;
          // Explicitly don't set gene.fillColor here
        }
      }
      
  const metaAttachEnd = performance.now();
    }

  // Apply ncRNA metadata and palette colors
  if (nonCodingMetadata && Object.keys(nonCodingMetadata).length > 0) {
    for (const ncRNAId in newGenomeView.ncRNAsById) {
      const ncRNA = newGenomeView.ncRNAsById[ncRNAId];
      const originalId = ncRNA.id || ncRNA.originalId;
      if (originalId && nonCodingMetadata[originalId]) {
        ncRNA.metadata = nonCodingMetadata[originalId];
      } else {
        // Derive from GFF attributes if no metadata found
        if (!ncRNA.metadata) ncRNA.metadata = {};
      }
    }
  } else {
    // Ensure ncRNAs have metadata derived from GFF
    for (const ncRNAId in newGenomeView.ncRNAsById) {
      const ncRNA = newGenomeView.ncRNAsById[ncRNAId];
      if (!ncRNA.metadata) ncRNA.metadata = {};
    }
  }

  // Palette colors will be applied in separate effect to avoid recreating genomeView

  // No default non-coding metadata to attach here — derive from GFF when needed

    // NOTE: Link coloring moved back to layer rendering since it depends on gene fillColor
    // which is calculated from geneColorMap in the layers section

    genomeViewRef.current = newGenomeView;
    
  const genomeViewEndTime = performance.now();
    return newGenomeView;
  }, [
    // Only structural data dependencies - prefer stable scalar signatures instead of raw references
    baseTree,
    // Config with correct xScalePercent for alignment calculations
    genomeViewConfig,
    // Use counts/signatures so identical data passed as new references doesn't trigger recreation
    (gffFeatures ? gffFeatures.length : 0),
    (proteinLinks ? proteinLinks.length : 0),
    (nucleotideLinks ? nucleotideLinks.length : 0),
    (domainsByGene ? Object.keys(domainsByGene).length : 0),
    hoodsSignature,
    // Metadata dependencies - essential for immediate gene coloring
    (proteinMetadata ? Object.keys(proteinMetadata).length : 0),
    (domainMetadata ? Object.keys(domainMetadata).length : 0),
  (strictClusterMap ? Object.keys(strictClusterMap).length : 0),
    (nonCodingMetadata ? Object.keys(nonCodingMetadata).length : 0),
    // Alignment dependencies - essential for proper gene alignment
    alignCluster,
    useDefaultGeneAlignment,
    defaultAlign,
    // NOTE: Palette dependencies removed - palette changes should not recreate genomeView
    // Palettes only affect rendering layers, not the underlying data structure
    // Use the memoized structural config values instead of direct config access
    structuralConfigValues
  ]);

  // REMOVED: Separate effect to handle metadata attachment - now integrated into genomeView creation
  // This ensures metadata is available from the very first render, just like tree metadata

  // REMOVED: ncRNA metadata effect - now integrated into genomeView creation during construction

  // Effect for theme color updates - removed because we handle this directly in layers now
  // useEffect(() => {
  //   if (!tree) return;
  //   tree.themeColors = themeColors;
  //   setManualUpdateTrigger(prev => prev + 1);
  // }, [themeColors, tree]);

  // Reset selection when core data changes
  useEffect(() => {
    setSelectedNode(null);
  }, [tree]);

  // Apply palette colors when palettes change (separate from genomeView creation)
  useEffect(() => {
    if (!genomeView) return;

    // Apply or clear gene palette colors. Always call the setter when we have
    // a strictClusterMap so GenomeView can apply colors or clear them when the
    // palette is disabled (it will bump its internal _paletteVersion signal).
    const effectiveGenePalette = genePalette || config?.colorPalettes?.genePalette;
    if (strictClusterMap) {
      genomeView.setProteinClustersWithPalette(strictClusterMap, effectiveGenePalette);
    }

    // Apply ncRNA palette colors if enabled  
    const effectiveNcRNAPalette = ncRNAPalette || config?.colorPalettes?.ncRNAPalette;
    if (effectiveNcRNAPalette?.enabled) {
      genomeView.setNcRNAColorsWithPalette(effectiveNcRNAPalette);
    }

    // Apply region palette colors if enabled
    const effectiveRegionPalette = regionPalette || config?.colorPalettes?.regionPalette;
    if (effectiveRegionPalette?.enabled) {
      genomeView.setRegionColorsWithPalette(effectiveRegionPalette);
    }
  }, [genomeView, genePalette, ncRNAPalette, regionPalette, strictClusterMap, config?.colorPalettes]);

  // Effect that responds to forceUpdateCounter changes from parent
  useEffect(() => {
    if (forceUpdateCounter > 0) {
      isManualManipulation.current = true;
      setAlignmentVersion(prev => prev + 1);
    }
  }, [forceUpdateCounter]);

  // Sync genomeView config AND re-apply alignment BEFORE bounds/layers calculation
  // This must be a useMemo (not useLayoutEffect) because useMemo runs during render,
  // while useLayoutEffect runs after render. We need alignment applied BEFORE layers memo.
  const lastGenomeXScaleRef = React.useRef(genomeXScaleProp);
  const lastDefaultAlignRef = React.useRef(defaultAlign);
  const lastAlignClusterRef = React.useRef(alignCluster);
  const lastUseDefaultGeneAlignmentRef = React.useRef(useDefaultGeneAlignment);
  const lastYSpacingRef = React.useRef(ySpacingProp);
  
  // Track alignment changes synchronously using a ref counter that increments during render
  // This avoids the race condition of using useEffect to update alignmentVersion
  const alignmentCounterRef = React.useRef(0);
  
  // Compute alignment signature synchronously during render - this replaces async alignmentVersion updates
  const alignmentSignature = React.useMemo(() => {
    if (!genomeView) return `empty-${alignmentCounterRef.current}`;
    
    // Update config with current scale
    const currentScale = genomeView.config?.genome?.xScalePercent;
    const targetScale = genomeXScaleProp ?? currentScale ?? 30;
    if (currentScale !== targetScale) {
      genomeView.config = {
        ...genomeView.config,
        genome: {
          ...genomeView.config?.genome,
          xScalePercent: targetScale
        }
      };
    }
    
    // Check if any alignment-related prop changed
    const genomeXScaleChanged = lastGenomeXScaleRef.current !== genomeXScaleProp;
    const defaultAlignChanged = lastDefaultAlignRef.current !== defaultAlign;
    const alignClusterChanged = lastAlignClusterRef.current !== alignCluster;
    const useDefaultGeneAlignmentChanged = lastUseDefaultGeneAlignmentRef.current !== useDefaultGeneAlignment;
    const ySpacingChanged = lastYSpacingRef.current !== ySpacingProp;
    
    // Re-apply alignment if any relevant prop changed
    if (genomeXScaleChanged || defaultAlignChanged || alignClusterChanged || useDefaultGeneAlignmentChanged) {
      // Update refs
      lastGenomeXScaleRef.current = genomeXScaleProp;
      lastDefaultAlignRef.current = defaultAlign;
      lastAlignClusterRef.current = alignCluster;
      lastUseDefaultGeneAlignmentRef.current = useDefaultGeneAlignment;
      
      // Re-apply the current alignment to recalculate offsets with new scale
      if (alignCluster != null && alignCluster !== '') {
        genomeView.alignCluster(String(alignCluster));
      } else {
        const hasDefaultGenes = Object.values(genomeView.hoodRanges || {}).some(hoodRange => hoodRange.align_gene);
        if (useDefaultGeneAlignment && hasDefaultGenes) {
          genomeView.alignByDefaultGenes();
        } else {
          if (defaultAlign === 'center') {
            genomeView.alignAllToCenter();
          } else if (defaultAlign === 'end') {
            genomeView.alignAllToEnd();
          } else {
            genomeView.alignAllToStart();
          }
        }
      }
      // Increment counter synchronously during this render
      alignmentCounterRef.current++;
    }
    
    // Track ySpacing changes
    if (ySpacingChanged) {
      lastYSpacingRef.current = ySpacingProp;
    }
    
    // Return a signature that uniquely identifies the alignment state
    // This is computed synchronously and can be used as a dependency
    return `${genomeXScaleProp}-${defaultAlign}-${alignCluster || ''}-${useDefaultGeneAlignment}-${ySpacingProp}-${alignmentCounterRef.current}`;
  }, [genomeView, genomeXScaleProp, defaultAlign, alignCluster, useDefaultGeneAlignment, ySpacingProp]);

  // Keep alignmentVersion in sync for backwards compatibility (other parts of code may depend on it)
  // But now it updates synchronously via signature change, not async via effect
  React.useEffect(() => {
    setAlignmentVersion(alignmentCounterRef.current);
  }, [alignmentSignature]);

  // Compute treeLabelPadding based on the longest leaf label length - use useMemo for synchronous calculation
  const treeLabelPadding = React.useMemo(() => {
    if (!tree) return 100; // Default fallback
    // Helper: robustly resolve metadata for a leaf name. treeMetadata may be keyed
    // by leaf_id or another id, so try direct key first then search common id fields.
    const getMetaForLeaf = (leafName) => {
      if (!treeMetadata) return {};
      if (treeMetadata[leafName]) return treeMetadata[leafName];
      const vals = Object.values(treeMetadata);
      for (let i = 0; i < vals.length; ++i) {
        const e = vals[i];
        if (!e) continue;
        if (e.leaf_id == leafName || e.leaf_id === leafName) return e;
        if (e.leaf_name == leafName || e.leaf_name === leafName) return e;
        if (e.id == leafName || e.id === leafName) return e;
        if (e.name == leafName || e.name === leafName) return e;
        if (e.originalId == leafName || e.original_id == leafName) return e;
      }
      return {};
    };

    const labels = tree.leafNodes.map(l => {
      const meta = getMetaForLeaf(l.name) || {};
      let label = meta[treeLabelBy];
      if (label === undefined || label === null) label = l.name;
      return String(label);
    });
    const maxLen = labels.reduce((max, txt) => Math.max(max, txt.length), 0);
    const charWidth = config.tree.labelPadding.charWidth; // Use configurable char width
    return maxLen * charWidth;
  }, [tree, treeMetadata, treeLabelBy, config]);

  // Utility to compute bounding box from all polygons/paths
  function computeBounds(genomeView, tree, phyloLabelPosition = 'after-tree', treeXScaleOverride = null, includeTree = true, visibleHoods: Set<string> | null = null) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let minHoodX = Infinity;
    let minHoodSource: { seqid: string; start: number; end: number } | null = null;
    if (!genomeView) return config.layout.containerFallback; // Use configurable fallback
    
    // When visibleHoods is provided (node selected), calculate bounds only for visible hoods
    // Otherwise use GenomeView's authoritative global bounds
    const filterByVisibleHoods = visibleHoods && visibleHoods.size > 0;
    
    console.log('[computeBounds] filterByVisibleHoods:', filterByVisibleHoods, 'visibleHoods size:', visibleHoods?.size || 0);
    
    if (filterByVisibleHoods) {
      // Calculate X bounds only from visible hoods
      Object.values(genomeView.genesById).forEach(g => {
        // Skip genes not in visible hoods
        if (!visibleHoods.has(String(g.hood_id))) return;
        if (g.polygon) g.polygon.forEach(([x, y]) => {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        });
      });
      Object.values(genomeView.ncRNAsById).forEach(nc => {
        if (!visibleHoods.has(String(nc.hood_id))) return;
        if (nc.polygon) nc.polygon.forEach(([x, y]) => {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        });
      });
      genomeView.getAllDomains().forEach(d => {
        const parentGene = d.parentGene;
        if (parentGene && !visibleHoods.has(String(parentGene.hood_id))) return;
        if (d.polygon) d.polygon.forEach(([x, y]) => {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        });
      });
    } else if (genomeView.globalMin !== Infinity && genomeView.globalMax !== -Infinity) {
      // Use GenomeView's authoritative global bounds for X coordinates if available
      minX = genomeView.globalMin;
      maxX = genomeView.globalMax;
    } else {
      // Fallback: manually calculate X bounds from genes, ncRNAs, and domains
      Object.values(genomeView.genesById).forEach(g => {
        if (g.polygon) g.polygon.forEach(([x, y]) => {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        });
      });
      Object.values(genomeView.ncRNAsById).forEach(nc => {
        if (nc.polygon) nc.polygon.forEach(([x, y]) => {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        });
      });
      genomeView.getAllDomains().forEach(d => {
        if (d.polygon) d.polygon.forEach(([x, y]) => {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        });
      });
    }
    
    // Calculate Y bounds - also filter by visible hoods if filtering is active
    Object.values(genomeView.genesById).forEach(g => {
      if (filterByVisibleHoods && !visibleHoods.has(String(g.hood_id))) return;
      if (g.polygon) g.polygon.forEach(([x, y]) => {
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      });
    });
    Object.values(genomeView.ncRNAsById).forEach(nc => {
      if (filterByVisibleHoods && !visibleHoods.has(String(nc.hood_id))) return;
      if (nc.polygon) nc.polygon.forEach(([x, y]) => {
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      });
    });
    genomeView.getAllDomains().forEach(d => {
      const parentGene = d.parentGene;
      if (filterByVisibleHoods && parentGene && !visibleHoods.has(String(parentGene.hood_id))) return;
      if (d.polygon) d.polygon.forEach(([x, y]) => {
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      });
    });
    
    // Hoods (for tree offset calculation)
    // Filter by valid hoods to exclude orphan nucleotides
    let hoodCount = 0;
    const hasLeafFilter = genomeView.leaves && genomeView.leaves.length > 0;
    const validSeqids = hasLeafFilter ? new Set() : null;
    if (hasLeafFilter) {
      const validHoodIds = new Set(genomeView.leaves.map(id => String(id)));
      for (const hoodId of validHoodIds) {
        const seqid = genomeView.hoodToSeqidMap[hoodId];
        if (seqid) validSeqids.add(seqid);
      }
    }
    
    // Note: nucleotides baselines are excluded from minX/minHoodX to avoid skew from flips/offsets.
    
    // Tree paths: get maxX with scaling - ALWAYS calculate treeMaxX for treeOffset
    let treeMaxX = -Infinity;
    const treeXScale = treeXScaleOverride !== null ? treeXScaleOverride / 100 : 
                      (config.tree && typeof config.tree.xScalePercent === 'number') ? config.tree.xScalePercent / 100 : 1;
    if (tree) tree.buildEdges().forEach(e => {
      e.path.forEach(([x, y]) => {
        treeMaxX = Math.max(treeMaxX, x * treeXScale);
      });
    });
    // Use hoods if available as the authoritative leftmost genome coordinate
    // Add validation: if all values are NaN, use minX as fallback
    // Prefer the already filtered/scaled GenomeView globalMin when available
    // This avoids letting a single baseline with large negative offset dominate bounds
    const leftmostGenomeRaw = isFinite(genomeView.globalMin)
      ? genomeView.globalMin
      : isFinite(minHoodX)
        ? minHoodX
        : isFinite(minX)
          ? minX
          : -Infinity; // Use -Infinity to trigger fallback
    
    // Set geneOffset so that the leftmost genome coordinate (prefer hoods) is at configurable position
    const geneOffset = isFinite(leftmostGenomeRaw) ? (config.layout.geneOffset - leftmostGenomeRaw) : 0;
    // Compute offset to align tree's maxX to the leftmost genome feature (prefer hoods)
    // Always keep tree to the left of genome features by a configurable gap
    const treeGap = config.tree.gap;
    const leftmostGenomeX = isFinite(leftmostGenomeRaw) ? leftmostGenomeRaw : minX;
    
    // Only apply treeLabelPadding when phylo labels are positioned after tree
    const effectivePhyloLabelPosition = phyloLabelPosition || config.tree?.phyloLabelPosition || 'after-tree';
    const labelPadding = effectivePhyloLabelPosition === 'after-tree' ? treeLabelPadding : 0;
    
    // treeOffset is ALWAYS calculated when there's a tree (needed for ruler)
    const treeOffset = isFinite(treeMaxX) && isFinite(leftmostGenomeX)
      ? (leftmostGenomeX - treeMaxX - treeGap - labelPadding)
      : 0;
    
    // Include tree in X bounds calculation - only if includeTree is true
    // Tree is positioned at treeOffset, so tree's minX in world coordinates is treeOffset
    if (tree && includeTree && isFinite(treeOffset)) {
      let treeMinX = Infinity;
      tree.buildEdges().forEach(e => {
        e.path.forEach(([x, y]) => {
          treeMinX = Math.min(treeMinX, x * treeXScale + treeOffset);
        });
      });
      if (isFinite(treeMinX)) {
        minX = Math.min(minX, treeMinX);
      }
    }
    
    // Fallback
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      const fallback = config.layout.containerFallback;
      minX = fallback.minX; minY = fallback.minY; maxX = fallback.maxX; maxY = fallback.maxY;
    }
    // Debug: print key values to trace skew
    // Always log when filtering by visible hoods to debug ruler positioning
    if (filterByVisibleHoods) {
      console.log('[computeBounds] FILTERED bounds:', { minX, maxX, minY, maxY, visibleHoodsSize: visibleHoods?.size });
    }
    try {
      if (DEBUG_LOGS) {
        console.log('[computeBounds] X:', { minX, maxX, minHoodX, leftmostGenomeRaw, leftmostGenomeX, treeMaxX, treeOffset, includeTree, minHoodSource, globalMin: genomeView.globalMin, globalMax: genomeView.globalMax });
        if (minHoodSource) {
          console.log('[computeBounds] minHoodSource seqid/start/end:', minHoodSource);
        }
      }
    } catch {}
    return { minX, minY, maxX, maxY, treeOffset, geneOffset };
  }

  // External function to fit view to bounds
  // Update container size on mount and resize
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const lastSize = { w: -1, h: -1 };
    let rafId = 0;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      const w = Math.floor(width);
      const h = Math.floor(height);
      // Guard: only update when size actually changes to prevent resize loops in SB10
      if (w === lastSize.w && h === lastSize.h) return;
      lastSize.w = w; lastSize.h = h;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setContainerSize({ width: w, height: h }));
    });
    ro.observe(el);
    // initial
    const initW = el.clientWidth || 0;
    const initH = el.clientHeight || 0;
    lastSize.w = initW; lastSize.h = initH;
    setContainerSize({ width: initW, height: initH });
    return () => { ro.disconnect(); if (rafId) cancelAnimationFrame(rafId); };
  }, [containerRef.current]);

  // Function to detect alignment and return the alignment reference point
  function getAlignmentReferencePoint(genomeView) {
    if (!genomeView) return null;
    
    // Check if any alignment mode is active (offsets set or global alignment selected)
    const hasOffsets = genomeView.leaves.some(hood_id => 
      genomeView.trackOffset && genomeView.trackOffset[hood_id] !== undefined && genomeView.trackOffset[hood_id] !== 0
    );
    const hasTraditionalAlignment = (defaultAlign === 'start' || defaultAlign === 'center' || defaultAlign === 'end') &&
      genomeView.leaves.some(hood_id => genomeView.trackOffset && genomeView.trackOffset[hood_id] !== undefined);
    const hasClusterAlignment = alignCluster != null && alignCluster !== '';
    const hasDefaultGeneAlign = !!useDefaultGeneAlignment;
    
    if (!hasOffsets && !hasTraditionalAlignment && !hasClusterAlignment && !hasDefaultGeneAlign) {
      // No alignment detected
      return null;
    }
    
    // All alignment operations in GenomeView place the visual alignment axis at X=0.
    // Returning 0 ensures the ruler anchor stays stable across genomeXScale changes.
    return 0;
  }
  
  // Compute visible leaves set EARLY - needed for bounds calculation when a node is selected
  // This determines which hoods are visible when filtering by tree node selection
  const visibleLeavesSetForBounds = React.useMemo(() => {
    const gv = genomeViewRef.current;
    console.log('[visibleLeavesSetForBounds] gv:', !!gv, 'tree:', !!tree, 'selectedNode:', selectedNode?.name || selectedNode?.id || selectedNode);
    if (!gv || !tree) return null; // null means no filtering
    if (!selectedNode) return null; // no selection means show all hoods
    
    try {
      const leaves = (typeof gv.getNodeDescendantLeaves === 'function')
        ? gv.getNodeDescendantLeaves(selectedNode)
        : (tree && typeof tree.getNodeDescendantLeaves === 'function'
          ? tree.getNodeDescendantLeaves(selectedNode)
          : []);
      const visibleLeaves = Array.isArray(leaves) ? leaves : [];
      console.log('[visibleLeavesSetForBounds] leaves:', visibleLeaves.length, visibleLeaves.slice(0, 5));
      return new Set(visibleLeaves.map(l => String(l)));
    } catch (e) {
      console.log('[visibleLeavesSetForBounds] error:', e);
      return null;
    }
  }, [tree, selectedNode]);
  
  // Add after viewState and bounds are available
  // Pass hasNewick to computeBounds so it only includes tree space when there's a real tree
  // NOTE: Use alignmentSignature (computed synchronously) instead of alignmentVersion (async state)
  // to ensure bounds update in the same render cycle as alignment changes
  // bounds = only genes (for ruler) - filter by visible hoods when node is selected
  const bounds = React.useMemo(() => {
    // Recompute bounds when alignment or geometry-affecting scale/spacing changes
    return computeBounds(genomeViewRef.current, tree, phyloLabelPosition, effectiveTreeXScale, false, visibleLeavesSetForBounds);
  }, [
    tree,
    phyloLabelPosition,
    effectiveTreeXScale,
    alignmentSignature,
    genomeXScaleProp,
    ySpacingProp,
    geneHeight,
    arrowheadHeight,
    visibleLeavesSetForBounds,
  ]);
  
  // boundsWithTree = genes + tree (for auto-fit and centering)
  // Also filter by visible hoods when node is selected
  const boundsWithTree = React.useMemo(() => {
    if (!hasNewick) return bounds;
    return computeBounds(genomeViewRef.current, tree, phyloLabelPosition, effectiveTreeXScale, true, visibleLeavesSetForBounds);
  }, [
    hasNewick,
    tree,
    phyloLabelPosition,
    effectiveTreeXScale,
    alignmentSignature,
    bounds,
    genomeXScaleProp,
    ySpacingProp,
    geneHeight,
    arrowheadHeight,
    visibleLeavesSetForBounds,
  ]);
  
  // Initialize static bounds once when we have valid data - these won't change with visibility toggles
  if (!staticBoundsRef.current && isFinite(bounds.minY) && isFinite(bounds.maxY) && bounds.maxY > bounds.minY) {
    staticBoundsRef.current = { minY: bounds.minY, maxY: bounds.maxY };
  }
  
  // Auto-fit zoom on initial load - calculate optimal zoom to fit content
  // Use boundsWithTree to include tree in centering calculation
  const initialZoomSetRef = React.useRef(false);
  React.useEffect(() => {
    if (initialZoomSetRef.current) return;
    if (!containerSize.width || !containerSize.height) return;
    if (!isFinite(boundsWithTree.minX) || !isFinite(boundsWithTree.maxX) || !isFinite(boundsWithTree.minY) || !isFinite(boundsWithTree.maxY)) return;
    
    const contentWidth = boundsWithTree.maxX - boundsWithTree.minX;
    const contentHeight = boundsWithTree.maxY - boundsWithTree.minY;
    if (contentWidth <= 0 || contentHeight <= 0) return;
    
    // Adjust padding - same for all cases
    const padding = 0.5;
    const zoomX = Math.log2((containerSize.width * padding) / contentWidth);
    const zoomY = Math.log2((containerSize.height * padding) / contentHeight);
    
    // Use the smaller zoom (more zoomed out) to fit both dimensions
    const optimalZoom = Math.min(zoomX, zoomY);
    
    // Clamp to reasonable range
    const clampedZoom = Math.max(-5, Math.min(2, optimalZoom));
    
    // Calculate center of content
    const centerX = (boundsWithTree.minX + boundsWithTree.maxX) / 2;
    const centerY = (boundsWithTree.minY + boundsWithTree.maxY) / 2;
    
    setViewState(prev => ({
      ...prev,
      target: [centerX, centerY, 0],
      zoom: clampedZoom
    }));
    
    initialZoomSetRef.current = true;
  }, [containerSize.width, containerSize.height, boundsWithTree.minX, boundsWithTree.maxX, boundsWithTree.minY, boundsWithTree.maxY]);
  
  // Use static bounds for scrollbar if available, otherwise fall back to current bounds
  const scrollBounds = staticBoundsRef.current || bounds;
  const minY = scrollBounds.minY;
  const maxY = scrollBounds.maxY;
  // Compute minY/maxY from bounds with padding for scrollbar
  const paddingY = config?.scrollbar?.panPaddingY ?? 200;
  const scrollMinY = minY - paddingY;
  const scrollMaxY = maxY + paddingY;
  
  // Normalized scrollbar state (0-100)
  const [scrollNorm, setScrollNorm] = React.useState(0);

  // When viewState changes, update normalized scroll position (but only when not actively scrolling)
  // This syncs the scrollbar thumb with camera moves (pan/zoom)
  React.useEffect(() => {
      if (viewState && isFinite(viewState.target[1]) && isFinite(minY) && isFinite(maxY) && maxY > minY) {
        const norm = ((maxY - viewState.target[1]) / (maxY - minY)) * 100;
        setScrollNorm(Math.max(0, Math.min(100, norm)));
      }
  }, [viewState?.target?.[1], minY, maxY]); // Only track Y position, not entire viewState 

  // Compute visible Y range for DeckGL (based on zoom and container height)
  let visibleFraction = 1;
  if (viewState && containerSize.height && maxY > minY) {
    // OrthographicView: 1 unit = 1 px at zoom=0, zoom is log2 scale
    const scale = Math.pow(2, viewState.zoom || 0);
    const visibleY = containerSize.height / scale;
    visibleFraction = Math.min(1, visibleY / (maxY - minY));
  }

  // Helper to build gene metadata labels (e.g., protein cluster) below each gene
  function buildGeneLabels(genes, geneColorMap, geneColorBy, colorBy, themeColors, config, geneLabelPosition = 'bottom') {
    const ensureRgba = (col) => {
      if (Array.isArray(col)) return col.length === 3 ? [col[0], col[1], col[2], 255] : col;
      if (typeof col === 'string') {
        const parts = col.split(',').map(n => parseInt(n.trim(), 10)).filter(v => !isNaN(v));
        if (parts.length === 3) return [parts[0], parts[1], parts[2], 255];
        if (parts.length >= 4) return [parts[0], parts[1], parts[2], parts[3]];
      }
      return Array.isArray(themeColors.geneFill) ? themeColors.geneFill : [150,150,150,255];
    };

    const resolveGeneColor = (g) => {
      const primaryField = geneColorBy || colorBy || 'cluster';
      let key = g?.metadata?.[primaryField];
      if (key === null || key === undefined || key === '') {
        if (primaryField === 'cluster') {
          key = g?.metadata?.clusterId ?? g?.metadata?.cluster_id ?? g?.cluster;
        }
      }
      let col = null;
    if (geneColorMap && !isEmptyValue(key)) {
  col = getColorFromMap(geneColorMap, normalizeKey(key), effectiveGenePalette?.type) || null;
      }
      return ensureRgba(col || g.fillColor || themeColors.geneFill);
    };

    const out = genes.map(gene => {
      const labelKey = labelBy || colorBy;
      const labelValue = gene.metadata && gene.metadata[labelKey] !== undefined ? gene.metadata[labelKey] : null;
      if (labelValue === null || labelValue === undefined) return null;
  // Fallback when polygon isn't available: compute from trackY and geneHeight
  const centerX = (gene.start + gene.end) / 2;
  const trackY = (gene.trackY !== undefined && gene.trackY !== null) ? gene.trackY : (gene.polygon && gene.polygon.length ? Math.min(...gene.polygon.map(([_, y]) => y)) : 0);
  // Use provided gene.geneHeight (from genesData) or config fallback
  const geneHeightVal = (gene.geneHeight !== undefined && gene.geneHeight !== null) ? gene.geneHeight : (config && config.gene ? config.gene.height : 60);
  const halfH = geneHeightVal / 2;
  const minY = trackY - halfH;
      // Use a darkened version of the resolved gene color for label
      const baseFill = resolveGeneColor(gene);
      const strokeColor = darkenColor(baseFill) || ensureRgba(themeColors.geneFill);
      const text = (labelValue === null || labelValue === undefined) ? '' : String(labelValue);

      // Keep label size fixed to config value (restore previous appearance)
      const labelSize = (config && config.text && config.text.geneLabelSize) ? config.text.geneLabelSize : 12;

      // Position label relative to gene according to geneLabelPosition
      const padding = 2; // world units
      let posY;
      switch ((geneLabelPosition || 'bottom').toLowerCase()) {
        case 'top':
          // place label above the gene: trackY - halfHeight - padding
          posY = trackY + halfH + padding;
          break;
        case 'center':
          // center vertically on the gene track
          posY = trackY;
          break;
        case 'bottom':
        default:
          // place label below the gene: trackY + halfHeight + padding
          posY = trackY - halfH - padding;
          break;
      }

      // Choose alignmentBaseline so the visual position matches expectation:
      // - bottom -> baseline 'top' (text sits below the position)
      // - center -> baseline 'center' (text centered on the position)
      // - top -> baseline 'bottom' (text sits above the position)
      let alignmentBaseline = 'top';
      switch ((geneLabelPosition || 'bottom').toLowerCase()) {
        case 'center':
          alignmentBaseline = 'center';
          break;
        case 'top':
          alignmentBaseline = 'bottom';
          break;
        case 'bottom':
        default:
          alignmentBaseline = 'top';
          break;
      }

      return {
        position: [centerX, posY],
        text,
        color: strokeColor,
        size: labelSize,
        textAnchor: 'middle',
        alignmentBaseline,
      };
    }).filter(Boolean);

  // logging removed

    return out;
  }

  // Utility to darken an RGBA color array
  function darkenColor(color, factor = config.stroke.darkenFactor) {
    if (!Array.isArray(color) || color.length < 3) return color;
    return [
      Math.max(0, Math.floor(color[0] * factor)),
      Math.max(0, Math.floor(color[1] * factor)),
      Math.max(0, Math.floor(color[2] * factor)),
      color.length > 3 ? color[3] : 255
    ];
  }

  // Utility: hash a string to a color
  function hashToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; ++i) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const r = (hash >> 0) & 0xFF;
    const g = (hash >> 8) & 0xFF;
    const b = (hash >> 16) & 0xFF;
    return [Math.abs(r), Math.abs(g), Math.abs(b), 255];
  }

  // Helper: robust numeric parser for palette interpolation
  function toNumeric(v) {
    if (v === null || v === undefined) return NaN;
    if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
    let s = String(v).trim();
    if (s === '') return NaN;
    // Remove commas, leading comparison signs, and trailing percent
    s = s.replace(/,/g, '');
    s = s.replace(/^\s*[<>]=?\s*/, '');
    if (s.endsWith('%')) s = s.slice(0, -1);
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  // Helper: consider a value empty when it's null/undefined, empty/whitespace-only,
  // or the literal strings "null" or "none" (case-insensitive).
  function isEmptyValue(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string') {
      const s = v.trim();
      if (s === '') return true;
      const low = s.toLowerCase();
      if (low === 'null' || low === 'none') return true;
      return false;
    }
    return false;
  }

  // Helper: get color from map using numeric keys for sequential palettes
  function getColorFromMap(colorMap, key, paletteType) {
    if (!colorMap) return undefined;
    // Treat null/undefined/empty/whitespace-only/'null'/'none' as missing keys
    if (isEmptyValue(key)) return undefined;

    if (paletteType === 'sequential') {
      const n = toNumeric(key);
      if (!isNaN(n)) return colorMap.get(n);
      return undefined;
    }

    return colorMap.get(String(key).trim());
  }

  // Helper: extract a domain field value robustly from a domain object.
  // Tries top-level property, then metadata[field], then common aliases in both places.
  function extractDomainField(d, field) {
    if (!d || !field) return undefined;
    // direct property
    if (d[field] !== undefined && d[field] !== '') return d[field];
    // metadata direct lookup
    if (d.metadata && d.metadata[field] !== undefined && d.metadata[field] !== '') return d.metadata[field];

    const aliases = {
      start: ['start', 'from', 'begin', 'pos', 'coord_start'],
      end: ['end', 'to', 'stop', 'finish', 'pos2', 'coord_end'],
      evalue: ['evalue', 'e_value', 'E-value', 'score'],
      coverage: ['coverage', 'cov', 'pct_coverage', 'percent_coverage']
    };

    const keyLower = String(field).toLowerCase();
    const tryKeys = aliases[keyLower] || [field];
    for (const k of tryKeys) {
      if (d[k] !== undefined && d[k] !== '') return d[k];
      if (d.metadata && d.metadata[k] !== undefined && d.metadata[k] !== '') return d.metadata[k];
    }

    // As a last resort, try a case-insensitive metadata match
    if (d.metadata) {
      for (const [k, v] of Object.entries(d.metadata)) {
        if (k && String(k).toLowerCase() === keyLower && v !== undefined && v !== '') return v;
      }
    }
    return undefined;
  }

  // Helper: interpolate across a palette (array of rgba arrays) at normalized t [0..1]
  function interpolatePaletteColor(colors, t) {
    if (!Array.isArray(colors) || colors.length === 0) return [0,0,0,255];
    if (colors.length === 1) return colors[0];
    // Clamp t
    const tt = Math.max(0, Math.min(1, t));
    const span = (colors.length - 1) * tt;
    const i0 = Math.floor(span);
    const i1 = Math.min(colors.length - 1, i0 + 1);
    const localT = span - i0;
    const c0 = colors[i0] || colors[0];
    const c1 = colors[i1] || colors[colors.length - 1];
    const out = [0,0,0,255];
    for (let ci = 0; ci < 4; ci++) {
      const v0 = (c0[ci] !== undefined) ? c0[ci] : (ci === 3 ? 255 : 0);
      const v1 = (c1[ci] !== undefined) ? c1[ci] : (ci === 3 ? 255 : 0);
      out[ci] = Math.round(v0 + (v1 - v0) * localT);
    }
    return out;
  }

  // Function to apply color palette to phylogenetic labels
  // When stableColorMap is provided, use pre-assigned colors for stability
  function applyPhyloPalette(treeLabels, treeColorBy, treeMetadata, phyloPalette, stableColorMap = null) {
    if (!phyloPalette || !phyloPalette.enabled) {
      // Ensure no colors are applied if phyloPalette is null or not enabled
      return treeLabels.map(label => ({
        ...label,
        color: [0, 0, 0, 255] // Default to black or uncolored
      }));
    }

    // If we have a stable color map, use it directly
    if (stableColorMap && stableColorMap.size > 0) {
      return treeLabels.map(label => {
        const metadata = getMetaForLeaf(label.leafNode.name) || {};
        const colorValue = metadata[treeColorBy];
        if (colorValue !== null && colorValue !== undefined) {
          const colorKey = String(colorValue);
          const color = stableColorMap.get(colorKey) || stableColorMap.get(Number(colorKey)) || [0, 0, 0, 255];
          return { ...label, color };
        } else {
          return { ...label, color: [0, 0, 0, 255] };
        }
      });
    }

    // DYNAMIC MODE: Collect unique values for the color-by field and assign colors
    const colorValues = new Set();
    for (const label of treeLabels) {
      const metadata = getMetaForLeaf(label.leafNode.name) || {};
      const colorValue = metadata[treeColorBy];
      if (colorValue !== undefined && colorValue !== null && colorValue !== '') {
        colorValues.add(String(colorValue));
      }
    }
    const sortedColorValues = Array.from(colorValues).sort();
    let paletteColors = [];
    if (phyloPalette && phyloPalette.name) {
      try {
        paletteColors = memoGetPalette(
          phyloPalette.name,
          Math.max(sortedColorValues.length, phyloPalette.numColors || sortedColorValues.length),
          phyloPalette.reverse || false
        );
      } catch (error) {
        paletteColors = [];
      }
    }

    // Create color mapping (numeric interpolation for sequential palettes)
    const colorValueToColor = {};
    if (phyloPalette.type === 'sequential' && sortedColorValues.length > 0 && sortedColorValues.every(v => !isNaN(Number(v)))) {
      // Numeric interpolation across sorted values
      const numericVals = sortedColorValues.map(v => Number(v));
      const minVal = Math.min(...numericVals);
      const maxVal = Math.max(...numericVals);
      sortedColorValues.forEach(val => {
        const num = Number(val);
        const t = maxVal > minVal ? (num - minVal) / (maxVal - minVal) : 0;
        const idx = Math.floor(t * (paletteColors.length - 1));
        colorValueToColor[val] = paletteColors[idx];
      });
    } else {
      // Categorical mapping
      sortedColorValues.forEach((value, i) => {
        colorValueToColor[value] = paletteColors[i % paletteColors.length];
      });
    }
    // Apply palette colors to labels
    return treeLabels.map(label => {
      const metadata = getMetaForLeaf(label.leafNode.name) || {};
      const colorValue = metadata[treeColorBy];
      // Only apply palette color if colorValue is valid, otherwise use default black color
      if (colorValue !== null && colorValue !== undefined) {
        const colorKey = String(colorValue);
        return {
          ...label,
          color: colorValueToColor[colorKey] || [0, 0, 0, 255]
        };
      } else {
        return {
          ...label,
          color: [0, 0, 0, 255] // Default black color for null/undefined values
        };
      }
    });
  }

  // Define effective palettes first
  const effectiveGenePalette = genePalette || config?.colorPalettes?.genePalette;
  const effectiveDomainPalette = domainPalette || config?.colorPalettes?.domainPalette;
  const effectivePhyloPalette = phyloPalette || config?.colorPalettes?.phyloPalette;
  const effectiveNcRNAPalette = ncRNAPalette || config?.colorPalettes?.ncRNAPalette;

  // Sync highlighted tree leaf color when tree palette changes
  // This ensures the glow color updates when user changes the palette
  // Uses double requestAnimationFrame to ensure we run AFTER the render cycle completes
  // and cachedTreeNodesRef has been updated with new colors
  useEffect(() => {
    // highlightedTreeLeafData is an array: [{id, position, radius, color}]
    if (!highlightedTreeLeafData || highlightedTreeLeafData.length === 0) return;
    const leafId = highlightedTreeLeafData[0]?.id;
    if (!leafId) return;
    
    // Double RAF ensures we run after the browser has painted and React has committed
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cachedTreeNodesRef.current?.nodes) return;
        
        // Look up the current color from the cached tree nodes
        // Search by multiple fields since leafId can be id, name, leaf_id, etc.
        const node = cachedTreeNodesRef.current.nodes.find(n => 
          n.id === leafId || 
          n.name === leafId || 
          n.leaf_id === leafId ||
          n.node?.id === leafId ||
          n.node?.name === leafId ||
          n.node?.leaf_id === leafId
        );
        if (node?.color) {
          const newColor = Array.isArray(node.color) ? [...node.color] : node.color;
          // Only update if color actually changed
          const currentColor = highlightedTreeLeafData[0]?.color;
          const colorChanged = !currentColor || 
            newColor[0] !== currentColor[0] || 
            newColor[1] !== currentColor[1] || 
            newColor[2] !== currentColor[2];
          
          if (colorChanged) {
            console.log('[TreeLeafColor] Syncing color from palette change:', newColor);
            setHighlightedTreeLeafData(prev => 
              prev ? prev.map(leaf => ({ ...leaf, color: newColor })) : null
            );
          }
        }
      });
    });
    
    return () => cancelAnimationFrame(rafId);
  }, [highlightedTreeLeafData?.[0]?.id, treeColorBy, effectivePhyloPalette?.name, effectivePhyloPalette?.type]);

  // NOTE: Effects that require effectiveConfig are defined after effectiveConfig (around line 3950)
  // - Sync tree node/leaf positions when tree geometry changes
  // - Sync gene data when gene geometry changes

  // 🚀 PERFORMANCE: Pre-compute prevalence data for tooltips and color desaturation
  // When a clade is selected, compute prevalence only across visible baselines
  // so palette prevalence filters/desaturation reflect what the user sees.
  const visibleLeavesForPrevalence = React.useMemo(() => {
    if (!genomeView) return new Set();
    if (!selectedNode) return new Set(genomeView.leaves || []);
    try {
      const fd = genomeView.filterBySelectedNode(selectedNode) || {};
      if (Array.isArray(fd.genes)) {
        const leaves = fd.genes.map(g => g.hood_id).filter(Boolean);
        return new Set(leaves);
      }
    } catch (e) {
      // fall through
    }
    return new Set(genomeView.leaves || []);
  }, [genomeView, selectedNode]);

  const genePrevalenceMap = React.useMemo(() => {
    if (!genomeView) return null;
    const primaryField = geneColorBy || colorBy || 'cluster';

    // If no clade is selected, use the model's cached prevalence (fast)
    if (!selectedNode) return genomeView.computeGenePrevalence(primaryField);

    // Otherwise compute prevalence only across the visible leaves set
    const visibleLeaves = visibleLeavesForPrevalence;
    const totalHoods = visibleLeaves.size || 0;
    if (totalHoods === 0) return new Map();

    const categoryToHoods = new Map();
    for (const gene of Object.values(genomeView.genesById)) {
      const hood = gene.hood_id || genomeView.getHoodIdFromSeqid(gene.seqid);
      if (!hood || !visibleLeaves.has(hood)) continue;

      let category = null;
      if (primaryField === 'cluster') {
        category = gene.metadata?.cluster ?? gene.metadata?.clusterId ?? gene.cluster;
      } else {
        category = gene.metadata?.[primaryField];
      }
      if (category === null || category === undefined || category === '') continue;
      const categoryKey = String(category);
      if (!categoryToHoods.has(categoryKey)) categoryToHoods.set(categoryKey, new Set());
      categoryToHoods.get(categoryKey).add(hood);
    }

    const prevalenceMap = new Map();
    for (const [category, hoods] of categoryToHoods) {
      prevalenceMap.set(category, hoods.size / totalHoods);
    }
    return prevalenceMap;
  }, [genomeView, geneColorBy, colorBy, selectedNode, visibleLeavesForPrevalence]);

  // 🎨 STABLE COLOR ASSIGNMENT: Pre-assign colors to ALL unique values once
  // This map doesn't change with prevalence/visibility filters - colors are stable
  const stableGeneColorMapRef = React.useRef(null);
  const stableGeneColorMapKeyRef = React.useRef(null); // Track when to regenerate
  
  const stableGeneColorMap = React.useMemo(() => {
    if (!genomeView || !effectiveGenePalette?.enabled) return null;
    const primaryField = geneColorBy || colorBy || 'cluster';
    const genes = Object.values(genomeView.genesById);

    const extractKey = (g) => {
      let key = g?.metadata?.[primaryField];
      if (key === null || key === undefined || key === '') {
        if (primaryField === 'cluster') {
          key = g?.metadata?.clusterId ?? g?.metadata?.cluster_id ?? g?.cluster;
        }
      }
      return key;
    };

    const validKeys = genes
      .map(extractKey)
      .map(k => normalizeKey(k))
      .filter(key => !isEmptyValue(key));
    
    const uniqueKeys = [...new Set(validKeys)].sort(); // Sort for stable ordering
    if (uniqueKeys.length === 0) return null;
    
    // Check if we can reuse the cached stable map
    const cacheKey = `${primaryField}-${effectiveGenePalette.name}-${effectiveGenePalette.numColors}-${effectiveGenePalette.reverse}-${uniqueKeys.length}`;
    if (stableGeneColorMapRef.current && stableGeneColorMapKeyRef.current === cacheKey) {
      return stableGeneColorMapRef.current;
    }
    
    // Determine numeric interpolation for sequential palettes
    const numericGeneVals = uniqueKeys.map(k => toNumeric(k)).filter(n => !isNaN(n));
    const isNumericGene = numericGeneVals.length === uniqueKeys.length && uniqueKeys.length > 0;
    
    // Generate colors for ALL unique keys
    const colors = memoGetPalette(
      effectiveGenePalette.name,
      effectiveGenePalette.numColors && effectiveGenePalette.type === 'sequential'
        ? effectiveGenePalette.numColors
        : Math.max(uniqueKeys.length, effectiveGenePalette.numColors || uniqueKeys.length),
      effectiveGenePalette.reverse || false
    );
    
    const colorMap = new Map();
    
    if (effectiveGenePalette.type === 'sequential' && isNumericGene) {
      const numericGenes = uniqueKeys.map(k => toNumeric(k));
      const minG = Math.min(...numericGenes);
      const maxG = Math.max(...numericGenes);
      uniqueKeys.forEach(key => {
        const val = toNumeric(key);
        const t = maxG > minG ? (val - minG) / (maxG - minG) : 0;
        const idx = Math.floor(t * (colors.length - 1));
        colorMap.set(val, colors[idx]);
        try { colorMap.set(String(key), colors[idx]); } catch (e) {}
      });
    } else {
      uniqueKeys.forEach((key, i) => {
        colorMap.set(String(key), colors[i % colors.length]);
        const num = toNumeric(key);
        if (!isNaN(num)) colorMap.set(num, colors[i % colors.length]);
      });
    }
    
    // Cache the stable map
    stableGeneColorMapRef.current = colorMap;
    stableGeneColorMapKeyRef.current = cacheKey;
    
    console.debug('stableGeneColorMap: generated for', uniqueKeys.length, 'unique values');
    return colorMap;
  }, [genomeView, geneColorBy, colorBy, effectiveGenePalette?.enabled, effectiveGenePalette?.name, effectiveGenePalette?.numColors, effectiveGenePalette?.reverse, effectiveGenePalette?.type]);

  // 🎨 STABLE COLOR ASSIGNMENT FOR TREE: Pre-assign colors to ALL unique values once
  const stableTreeColorMapRef = React.useRef(null);
  const stableTreeColorMapKeyRef = React.useRef(null);
  
  const stableTreeColorMap = React.useMemo(() => {
    if (!tree || !treeMetadata || !treeColorBy || !effectivePhyloPalette?.enabled) return null;
    
    // Collect ALL unique values for the color-by field
    const colorValues = new Set();
    for (const leaf of tree.leafNodes || []) {
      const metadata = treeMetadata[leaf.name] || {};
      const colorValue = metadata[treeColorBy];
      if (colorValue !== undefined && colorValue !== null && colorValue !== '') {
        colorValues.add(String(colorValue));
      }
    }
    const sortedColorValues = Array.from(colorValues).sort();
    if (sortedColorValues.length === 0) return null;
    
    // Check if we can reuse the cached stable map
    const cacheKey = `${treeColorBy}-${effectivePhyloPalette.name}-${effectivePhyloPalette.numColors}-${effectivePhyloPalette.reverse}-${sortedColorValues.length}`;
    if (stableTreeColorMapRef.current && stableTreeColorMapKeyRef.current === cacheKey) {
      return stableTreeColorMapRef.current;
    }
    
    // Generate colors for ALL unique values
    let paletteColors = [];
    try {
      paletteColors = memoGetPalette(
        effectivePhyloPalette.name,
        Math.max(sortedColorValues.length, effectivePhyloPalette.numColors || sortedColorValues.length),
        effectivePhyloPalette.reverse || false
      );
    } catch (e) {
      paletteColors = [];
    }
    
    const colorMap = new Map();
    
    // Numeric interpolation for sequential palettes
    if (effectivePhyloPalette.type === 'sequential' && sortedColorValues.every(v => !isNaN(Number(v)))) {
      const numericVals = sortedColorValues.map(v => Number(v));
      const minVal = Math.min(...numericVals);
      const maxVal = Math.max(...numericVals);
      sortedColorValues.forEach(val => {
        const num = Number(val);
        const t = maxVal > minVal ? (num - minVal) / (maxVal - minVal) : 0;
        const idx = Math.floor(t * (paletteColors.length - 1));
        colorMap.set(val, paletteColors[idx]);
        colorMap.set(num, paletteColors[idx]);
      });
    } else {
      // Categorical mapping
      sortedColorValues.forEach((value, i) => {
        colorMap.set(value, paletteColors[i % paletteColors.length]);
        const num = Number(value);
        if (!isNaN(num)) colorMap.set(num, paletteColors[i % paletteColors.length]);
      });
    }
    
    // Cache the stable map
    stableTreeColorMapRef.current = colorMap;
    stableTreeColorMapKeyRef.current = cacheKey;
    
    console.debug('stableTreeColorMap: generated for', sortedColorValues.length, 'unique values');
    return colorMap;
  }, [tree, treeMetadata, treeColorBy, effectivePhyloPalette?.enabled, effectivePhyloPalette?.name, effectivePhyloPalette?.numColors, effectivePhyloPalette?.reverse, effectivePhyloPalette?.type]);

  // 🚀 PERFORMANCE: Compute final color map using stable colors + prevalence filtering
  // When stableColors is true (default), colors are pre-assigned to ALL values and don't change
  // When stableColors is false, colors are reassigned based on currently visible/filtered values
  const useStableColors = effectiveGenePalette?.stableColors !== false; // Default to true
  const useStableTreeColors = effectivePhyloPalette?.stableColors !== false; // Default to true
  
  const geneColorMap = React.useMemo(() => {
    if (!genomeView || !effectiveGenePalette?.enabled) return null;
    
    // If using stable colors, we need the stableGeneColorMap
    if (useStableColors && !stableGeneColorMap) return null;
    
    const primaryField = geneColorBy || colorBy || 'cluster';
    const genes = Object.values(genomeView.genesById);

    const extractKey = (g) => {
      let key = g?.metadata?.[primaryField];
      if (key === null || key === undefined || key === '') {
        if (primaryField === 'cluster') {
          key = g?.metadata?.clusterId ?? g?.metadata?.cluster_id ?? g?.cluster;
        }
      }
      return key;
    };

    const validKeys = genes
      .map(extractKey)
      .map(k => normalizeKey(k))
      .filter(key => !isEmptyValue(key));
    
    const uniqueKeys = [...new Set(validKeys)].sort(); // Sort for stable ordering
    if (uniqueKeys.length === 0) return null;
    
    // Determine numeric mode for key lookups
    const numericGeneVals = uniqueKeys.map(k => toNumeric(k)).filter(n => !isNaN(n));
    const isNumericGene = numericGeneVals.length === uniqueKeys.length && uniqueKeys.length > 0;
    
    const colorMap = new Map();
    const defaultGeneColor = DEFAULT_CONFIG.gene.fillColor;
    const thresholdDecimal = (effectiveGenePalette.prevalenceFilter || 0) / 100;
    
    if (useStableColors) {
      // STABLE MODE: Use pre-assigned colors from stableGeneColorMap
      uniqueKeys.forEach(key => {
        const prevalence = genePrevalenceMap?.get(String(key)) || 0;
        const passesPrevalence = prevalence >= thresholdDecimal;
        
        // Get the stable color for this key
        const stableColor = getColorFromMap(stableGeneColorMap, key, effectiveGenePalette?.type);
        
        // Use stable color if passes prevalence, otherwise default gray
        let finalColor = passesPrevalence ? stableColor : defaultGeneColor;
        
        // Apply desaturation by prevalence if enabled
        if (passesPrevalence && effectiveGenePalette.desaturateByPrevalence && genePrevalenceMap && genomeView._desaturateColorByPrevalence) {
          finalColor = genomeView._desaturateColorByPrevalence(finalColor, prevalence);
        }
        
        // Store in both string and numeric forms
        const mapKey = (effectiveGenePalette.type === 'sequential' && isNumericGene) ? toNumeric(key) : String(key);
        colorMap.set(mapKey, finalColor);
        try { colorMap.set(String(key), finalColor); } catch (e) {}
        const num = toNumeric(key);
        if (!isNaN(num)) colorMap.set(num, finalColor);
      });
    } else {
      // DYNAMIC MODE: Reassign colors based on keys that pass prevalence filter
      const keysForPalette = uniqueKeys.filter(key => {
        const prevalence = genePrevalenceMap?.get(String(key)) || 0;
        return prevalence >= thresholdDecimal;
      });
      
      // Generate colors only for visible keys
      const colors = memoGetPalette(
        effectiveGenePalette.name,
        effectiveGenePalette.numColors && effectiveGenePalette.type === 'sequential'
          ? effectiveGenePalette.numColors
          : Math.max(keysForPalette.length, effectiveGenePalette.numColors || keysForPalette.length),
        effectiveGenePalette.reverse || false
      );
      
      // Assign colors to keys that pass prevalence
      if (effectiveGenePalette.type === 'sequential' && isNumericGene) {
        const numericGenes = keysForPalette.map(k => toNumeric(k));
        const minG = Math.min(...numericGenes);
        const maxG = Math.max(...numericGenes);
        keysForPalette.forEach(key => {
          const val = toNumeric(key);
          const t = maxG > minG ? (val - minG) / (maxG - minG) : 0;
          const idx = Math.floor(t * (colors.length - 1));
          let finalColor = colors[idx];
          
          if (effectiveGenePalette.desaturateByPrevalence && genePrevalenceMap && genomeView._desaturateColorByPrevalence) {
            const prevalence = genePrevalenceMap.get(String(key)) || 0;
            finalColor = genomeView._desaturateColorByPrevalence(finalColor, prevalence);
          }
          
          colorMap.set(val, finalColor);
          try { colorMap.set(String(key), finalColor); } catch (e) {}
        });
      } else {
        keysForPalette.forEach((key, i) => {
          let finalColor = colors[i % colors.length];
          
          if (effectiveGenePalette.desaturateByPrevalence && genePrevalenceMap && genomeView._desaturateColorByPrevalence) {
            const prevalence = genePrevalenceMap.get(String(key)) || 0;
            finalColor = genomeView._desaturateColorByPrevalence(finalColor, prevalence);
          }
          
          colorMap.set(String(key), finalColor);
          const num = toNumeric(key);
          if (!isNaN(num)) colorMap.set(num, finalColor);
        });
      }
      
      // Assign default color to keys that don't pass prevalence
      uniqueKeys.forEach(key => {
        const prevalence = genePrevalenceMap?.get(String(key)) || 0;
        if (prevalence < thresholdDecimal) {
          const mapKey = (effectiveGenePalette.type === 'sequential' && isNumericGene) ? toNumeric(key) : String(key);
          colorMap.set(mapKey, defaultGeneColor);
          try { colorMap.set(String(key), defaultGeneColor); } catch (e) {}
          const num = toNumeric(key);
          if (!isNaN(num)) colorMap.set(num, defaultGeneColor);
        }
      });
    }
    
    return colorMap;
  }, [
    genomeView,
    stableGeneColorMap, // Use stable colors as base
    genePrevalenceMap, 
    // depend on primitive palette properties so toggling/enabling recomputes reliably
    effectiveGenePalette?.enabled,
    effectiveGenePalette?.type,
    effectiveGenePalette?.name, // For dynamic mode palette generation
    effectiveGenePalette?.numColors, // For dynamic mode palette generation
    effectiveGenePalette?.reverse, // For dynamic mode palette generation
    effectiveGenePalette?.desaturateByPrevalence,
    effectiveGenePalette?.prevalenceFilter,
    effectiveGenePalette?.stableColors, // Track stable colors setting
    useStableColors, // Flag for stable vs dynamic mode
    colorBy,
    geneColorBy,
    alignmentVersion
  ]);

  // Debug: log when user changes gene/domain/tree color-by selections so we can trace mapping issues
  React.useEffect(() => {
    try {
      if (DEBUG_LOGS) console.log('[ColorSelect] selection changed', { geneColorBy, domainColorBy, treeColorBy, colorBy });
      if (!genomeView) {
        if (DEBUG_LOGS) console.log('[ColorSelect] genomeView not ready');
        return;
      }
      const primary = geneColorBy || colorBy || 'cluster';
      const genes = Object.values(genomeView.genesById || {});
      const keys = genes.map(g => {
        let v = g?.metadata?.[primary];
        if ((v === null || v === undefined || v === '') && primary === 'cluster') {
          v = g?.metadata?.clusterId ?? g?.metadata?.cluster_id ?? g?.cluster;
        }
        return v;
      }).filter(k => k !== null && k !== undefined && k !== '');
      const unique = [...new Set(keys)];
      const numericVals = unique.map(k => toNumeric(k)).filter(n => !isNaN(n));
      const isNumeric = numericVals.length === unique.length && unique.length > 0;
      if (DEBUG_LOGS) {
        console.log(`[ColorSelect][gene] field=${primary} unique=${unique.length} isNumeric=${isNumeric} sample=${unique.slice(0,5)}`);
        if (isNumeric && numericVals.length > 0) console.log('[ColorSelect][gene] numericRange=', Math.min(...numericVals), Math.max(...numericVals));
        if (geneColorMap) unique.slice(0,5).forEach(k => console.log('[ColorSelect][gene] map', k, '->', getColorFromMap(geneColorMap, k, effectiveGenePalette?.type)));
      }
    } catch (e) {
      console.error('ColorSelect gene logging error', e);
    }
  }, [geneColorBy, colorBy, genomeView, geneColorMap, effectiveGenePalette?.name, effectiveGenePalette?.type]);

  // Tooltip handler for DeckGL - defined after genePrevalenceMap to avoid reference errors
  const getTooltip = ({object, layer}) => {
    if (!object) return null;
    
    // Handle protein links (protein-polygons layer)
    if (layer && layer.id === 'protein-polygons') {
      const gv = genomeViewRef.current;
      const gA = gv?.genesById?.[object.gAId];
      const gB = gv?.genesById?.[object.gBId];
      const similarity = object.metadata?.similarity ?? object.similarity ?? 'N/A';
      
      const entries = [
        ['type', 'Protein Link'],
        ['similarity', typeof similarity === 'number' ? `${similarity.toFixed(1)}%` : similarity],
      ];
      
      // Add source gene info
      if (gA) {
        const geneNameA = gA.metadata?.gene_name || gA.metadata?.name || gA.gene_id || object.gAId;
        const clusterA = gA.metadata?.cluster || gA.metadata?.clusterId || gA.cluster || '';
        entries.push(['source gene', geneNameA]);
        if (clusterA) entries.push(['source cluster', clusterA]);
        entries.push(['source hood', gA.hood_id || gA.seqid || '']);
      }
      
      // Add target gene info
      if (gB) {
        const geneNameB = gB.metadata?.gene_name || gB.metadata?.name || gB.gene_id || object.gBId;
        const clusterB = gB.metadata?.cluster || gB.metadata?.clusterId || gB.cluster || '';
        entries.push(['target gene', geneNameB]);
        if (clusterB) entries.push(['target cluster', clusterB]);
        entries.push(['target hood', gB.hood_id || gB.seqid || '']);
      }
      
      const filteredEntries = entries.filter(([k, v]) => v !== '' && v !== null && v !== undefined);
      if (filteredEntries.length === 0) return null;
      const html = `<table>${filteredEntries.map(([k, v]) => `<tr><td><b>${k}</b></td><td style="width:10px"></td><td>${String(v)}</td></tr>`).join('')}</table>`;
      return { html };
    }
    
    // Handle nucleotide links (nucleotide-polygons layer)
    if (layer && layer.id === 'nucleotide-polygons') {
      // Try to find the original NucleotideLink to get similarity
      let similarity = object.similarity;
      if (similarity === undefined || similarity === null) {
        similarity = object.metadata?.similarity;
      }
      
      // If still no similarity, try to find it from the original link data
      if (similarity === undefined || similarity === null) {
        const gv = genomeViewRef.current;
        if (gv && gv.nucleotideLinks) {
          // Find matching link by comparing hoodA, hoodB, and coordinates
          const originalLink = gv.nucleotideLinks.find(nl => 
            nl.hoodA === object.hoodA && 
            nl.hoodB === object.hoodB &&
            nl.hoodStartA === object.hoodStartA
          );
          if (originalLink) {
            similarity = originalLink.similarity;
          }
        }
      }
      
      // Format similarity for display
      let similarityDisplay = 'N/A';
      if (typeof similarity === 'number' && !isNaN(similarity)) {
        similarityDisplay = `${similarity.toFixed(1)}%`;
      } else if (typeof similarity === 'string' && similarity !== '') {
        similarityDisplay = similarity;
      }
      
      // Determine strand orientation for each side of the link
      // Original strand: stored in the NucleotideLink as strandA/strandB (determined before coordinate normalization)
      // Effective strand: accounts for track flip state
      const gv = genomeViewRef.current;
      let strandInfo = '';
      if (gv) {
        // Find the original link to get strand info
        const originalLink = gv.nucleotideLinks?.find(nl => 
          nl.hoodA === object.hoodA && 
          nl.hoodB === object.hoodB &&
          nl.hoodStartA === object.hoodStartA
        );
        
        if (originalLink) {
          // Get original strand from the link (determined before coordinate normalization)
          const origStrandA = originalLink.strandA || '+';
          const origStrandB = originalLink.strandB || '+';
          
          // Get flip state of each baseline
          const flippedA = !!gv.trackFlipped[object.hoodA];
          const flippedB = !!gv.trackFlipped[object.hoodB];
          
          // Effective strand = original strand XOR flipped
          // If flipped, the strand appears reversed in the visualization
          const effectiveStrandA = (origStrandA === '+') !== flippedA ? '+' : '-';
          const effectiveStrandB = (origStrandB === '+') !== flippedB ? '+' : '-';
          
          // Determine alignment type
          const alignmentType = (effectiveStrandA === effectiveStrandB) ? 'same strand' : 'opposite strand';
          strandInfo = `${effectiveStrandA}/${effectiveStrandB} (${alignmentType})`;
        }
      }
      
      const entries = [
        ['type', 'Nucleotide Link'],
        ['similarity', similarityDisplay],
        ['strand', strandInfo],
        ['hood A', object.hoodA || ''],
        ['hood B', object.hoodB || ''],
      ];
      
      // Add coordinate info if available
      if (object.hoodStartA !== undefined && object.hoodEndA !== undefined) {
        entries.push(['region A', `${Math.round(object.hoodStartA)}-${Math.round(object.hoodEndA)}`]);
      }
      if (object.hoodStartB !== undefined && object.hoodEndB !== undefined) {
        entries.push(['region B', `${Math.round(object.hoodStartB)}-${Math.round(object.hoodEndB)}`]);
      }
      
      const filteredEntries = entries.filter(([k, v]) => v !== '' && v !== null && v !== undefined);
      if (filteredEntries.length === 0) return null;
      const html = `<table>${filteredEntries.map(([k, v]) => `<tr><td><b>${k}</b></td><td style="width:10px"></td><td>${String(v)}</td></tr>`).join('')}</table>`;
      return { html };
    }
    
    // Show metadata for nodes (tree), genes, domains, protein links, nucleotide links
    // If this is a tree node (Scatterplot 'nodes' layer) and it's a leaf, prefer
    // returning the full tree metadata (from `treeMetadata`) so users see all
    // fields attached to the leaf in the tooltip. Otherwise fall back to
    // object.metadata which covers genes/domains/links.
    if (layer && layer.id === 'nodes' && object.node && object.node.branchset && object.node.branchset.length === 0) {
      // Resolve tree metadata for this leaf robustly (try direct key then common id fields)
      const leafName = object.node.name || object.node.id || object.id;
      const resolveTreeMeta = (leaf) => {
        if (!treeMetadata) return {};
        if (!leaf) return {};
        if (treeMetadata[leaf]) return treeMetadata[leaf];
        const vals = Object.values(treeMetadata);
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
      // Format entries using same filtering rules as below
      const entries = Object.entries(treeMeta).filter(([k, v]) => {
        if (!k) return false;
        const key = String(k).toLowerCase();
        if (key === 'sequence' || key === 'attributes') return false;
        if (isEmptyValue(v)) return false;
        const t = typeof v;
        return (t === 'string' || t === 'number' || t === 'boolean');
      });

      if (entries.length === 0) return null;
      const html = `<table>${entries.map(([k, v]) => `<tr><td><b>${k}</b></td><td style="width:10px"></td><td>${String(v)}</td></tr>`).join('')}</table>`;
      return { html };
    }

    if (object.metadata) {
      // Format metadata as HTML table, but exclude 'sequence' field (case-insensitive),
      // and skip any values that are empty, null, undefined, or objects to avoid '[object Object]' rendering.
      const meta = object.metadata || {};
      const entries = Object.entries(meta).filter(([k, v]) => {
        if (!k) return false;
        const key = String(k).toLowerCase();
        if (key === 'sequence') return false;
        if (key === 'attributes') return false; // Handle separately below
        if (isEmptyValue(v)) return false;
        // skip complex objects/arrays to avoid ugly stringification
        const t = typeof v;
        return (t === 'string' || t === 'number' || t === 'boolean');
      });
      
      // Parse attributes - they can be an object (already parsed by parseGFF)
      if (object.metadata.attributes) {
        if (typeof object.metadata.attributes === 'object' && !Array.isArray(object.metadata.attributes)) {
          // attributes is already an object, just add its entries
          Object.entries(object.metadata.attributes).forEach(([key, value]) => {
            if (key && value !== null && value !== undefined) {
              entries.push([key, String(value)]);
            }
          });
        } else if (typeof object.metadata.attributes === 'string') {
          // Fallback: parse GFF format string (key=value;key=value;...)
          const attrPairs = object.metadata.attributes.split(';').filter(s => s.trim());
          for (const pair of attrPairs) {
            const [key, value] = pair.split('=').map(s => s.trim());
            if (key && value) {
              entries.push([key, value]);
            }
          }
        }
      }
      
      // Add prevalence information for genes if available
      if (genePrevalenceMap && object.metadata && (geneColorBy || colorBy)) {
        const primaryField = geneColorBy || colorBy || 'cluster';
        let categoryValue = object.metadata[primaryField];
        
        // Use same fallback logic as color mapping for cluster field
        if ((categoryValue === null || categoryValue === undefined || categoryValue === '') && primaryField === 'cluster') {
          categoryValue = object.metadata.clusterId ?? object.metadata.cluster_id ?? object.cluster;
        }
        
        if (categoryValue !== null && categoryValue !== undefined && categoryValue !== '') {
          const prevalence = genePrevalenceMap.get(String(categoryValue));
          if (prevalence !== undefined) {
            const percentStr = (prevalence * 100).toFixed(1);
            entries.push(['prevalence', `${percentStr}% of hoods`]);
          }
        }
      }
      
      if (entries.length === 0) return null;
      const html = `<table>${entries.map(([k, v]) => `<tr><td><b>${k}</b></td><td style="width:10px"></td><td>${String(v)}</td></tr>`).join('')}</table>`;
      return { html };
    }
    // Fallback for legacy or missing metadata
  if (object.name) return { text: object.name };
  // Fall back to id (preferred) or legacy gene_id
  if (object.id) return { text: object.id };
  if (object.gene_id) return { text: object.gene_id };
    return null;
  };

  // Previously we mutated genomeView.genesById to apply fillColor and called
  // genomeView.applyProteinLinkColors / applyNucleotideLinkColors. That caused
  // unnecessary mutations and forced re-renders. We now compute colors
  // immutably when building `genesData` and link data below.
  React.useMemo(() => true, [alignmentVersion, effectiveGenePalette?.enabled, effectiveGenePalette?.name, effectiveGenePalette?.numColors, effectiveGenePalette?.reverse]);

  // 🚀 PERFORMANCE: Get fresh polygons AFTER colors are applied
  const { filteredProteinPolygons, filteredNucleotidePolygons } = React.useMemo(() => {
    if (!genomeView) return { filteredProteinPolygons: [], filteredNucleotidePolygons: [] };

    // If a clade node is selected, use the model's filter to get only features
    // that belong to descendant leaves of that node. Otherwise use full sets.
    let proteinPolygons = genomeView.getProteinPolygons();
    let nucleotidePolygons = genomeView.getNucleotidePolygons();
    let leaves = genomeView.leaves;
    if (selectedNode) {
      try {
        const filtered = genomeView.filterBySelectedNode(selectedNode);
        // filterBySelectedNode returns { genes, proteinPolygons, nucleotidePolygons, domains, ncRNAs }
        if (filtered && Array.isArray(filtered.proteinPolygons)) proteinPolygons = filtered.proteinPolygons.map(p => ({ polygon: p.polygon || p.polygon, fillColor: p.fillColor, metadata: p.metadata }));
        if (filtered && Array.isArray(filtered.nucleotidePolygons)) nucleotidePolygons = filtered.nucleotidePolygons.map(p => ({ polygon: p.polygon || p.polygon, fillColor: p.fillColor, metadata: p.metadata }));
        leaves = filtered && Array.isArray(filtered.genes) ? filtered.genes.map(g => g.hood_id) : leaves;
      } catch (e) {
        // ignore and fall back to full sets
      }
    }
  // Build consecutive pairs once
    const consecutivePairs = new Set();
    for (let i = 0; i < leaves.length - 1; i++) {
      const [a, b] = [leaves[i], leaves[i + 1]].sort();
      consecutivePairs.add(`${a}__${b}`);
    }
    
    // Filter protein polygons
    const filteredProtein = proteinPolygons.filter(p => {
      if (!p.metadata) return false;
      const { gAId, gBId, hoodA, hoodB, seqids } = p.metadata;
      let hood1 = hoodA || (gAId && genomeView.genesById[gAId]?.hood_id) || seqids?.[0];
      let hood2 = hoodB || (gBId && genomeView.genesById[gBId]?.hood_id) || seqids?.[1];
      if (hood1 && hood2) {
        const [sortedHood1, sortedHood2] = [hood1, hood2].sort();
        return consecutivePairs.has(`${sortedHood1}__${sortedHood2}`);
      }
      return false;
    });
    
    // Build valid consecutive pairs for nucleotide links
    const validConsecutivePairs = new Set();
    for (let i = 0; i < leaves.length - 1; i++) {
      const [a, b] = [leaves[i], leaves[i + 1]].sort();
      validConsecutivePairs.add(`${a}__${b}`);
    }
    
    // Filter nucleotide polygons
    const assignedPairs = new Set();
    const filteredNucleotide = nucleotidePolygons.filter(p => {
      if (!p.metadata) return false;
      const { seqids } = p.metadata;
      if (!seqids || seqids.length < 2) return false;
      const [sortedSeqid1, sortedSeqid2] = seqids.sort();
      const pairKey = `${sortedSeqid1}__${sortedSeqid2}`;
      if (validConsecutivePairs.has(pairKey) && !assignedPairs.has(pairKey)) {
        assignedPairs.add(pairKey);
        return true;
      }
      return false;
    });
    
    return { 
      filteredProteinPolygons: filteredProtein, 
      filteredNucleotidePolygons: filteredNucleotide 
    };
  }, [genomeView, proteinLinks, nucleotideLinks, alignmentVersion, proteinLinkConfig, nucleotideLinkConfig, geneColorMap, effectiveGenePalette, selectedNode]);

  // 🚀 CRITICAL: Extract genes AFTER pre-filtering applies colors
  const genes = React.useMemo(() => {
    if (!genomeView) return [];
    try {
      if (selectedNode) {
        const filtered = genomeView.filterBySelectedNode(selectedNode);
        if (filtered && Array.isArray(filtered.genes)) {
          return filtered.genes.map(g => ({ ...g, fillColor: g.fillColor || themeColors.geneFill }));
        }
      }
    } catch (e) {}
    return Object.values(genomeView.genesById).map(g => ({ ...g, fillColor: g.fillColor || themeColors.geneFill }));
  }, [genomeView, geneColorMap, geneColorBy, colorBy, themeColors.geneFill, alignmentVersion, selectedNode]);

  // 🚀 CRITICAL: Build legend data AFTER gene coloring is complete
  function buildLegendData() {
    const gv = genomeView;
    const legend = {
      genes: null,
      phylo: null,
      regions: null,
      ncRNAs: null,
      proteinLinks: null,
      nucleotideLinks: null
    };

    try {
      // Genes: prefer the computed geneColorMap (palette-derived) when available so legend matches rendering
      if (typeof geneColorMap !== 'undefined' && geneColorMap && geneColorMap.size > 0) {
        const items = Array.from(geneColorMap.entries()).map(([k, color]) => ({ value: String(k), color, stroke: (Array.isArray(color) ? darkenColor(color) : null) }));
        legend.genes = items;
      } else if (gv && gv.genesById) {
        const geneVals = new Map();
        const field = geneColorBy || colorBy || 'cluster';
        // Helper: resolve color for a gene using geneColorMap when possible
        const resolveColor = (g) => {
          try {
            if (geneColorMap) {
              let key = g?.metadata?.[field];
              if (key === null || key === undefined || key === '') {
                if (field === 'cluster') key = g?.metadata?.clusterId ?? g?.metadata?.cluster_id ?? g?.cluster;
              }
              if (key !== null && key !== undefined && key !== '') {
                const m = getColorFromMap(geneColorMap, key, effectiveGenePalette?.type);
                if (m) return m;
              }
            }
          } catch (e) {}
          return g.fillColor || themeColors.geneFill;
        };

        // Use genes with colors resolved from palette when available
        genes.forEach(g => {
          const val = (g.metadata && g.metadata[field]) ? g.metadata[field] : null;
          if (val !== null && val !== undefined) {
            const key = String(val);
            if (!geneVals.has(key)) {
              const color = resolveColor(g);
              geneVals.set(key, { value: key, color, stroke: Array.isArray(color) ? darkenColor(color) : null });
            }
          }
        });
        legend.genes = Array.from(geneVals.values());
      }

      // Phylo: build legend from tree leaf nodes with metadata
      const phyloVals = new Map();
      if (tree && tree.leafNodes && Array.isArray(tree.leafNodes) && tree.leafNodes.length > 0 && treeMetadata && treeColorBy) {
        const field = treeColorBy;
        
        // Get all unique values first to match palette generation logic
        const uniqueValues = [...new Set(tree.leafNodes.map(leaf => {
          const meta = treeMetadata[leaf.name] || {};
          const val = meta[field];
          return (val !== null && val !== undefined && val !== '') ? val : null;
        }).filter(v => v !== null))];
        
        const sortedValues = uniqueValues.sort();
        
        // Generate palette colors if palette is enabled
        let paletteColors = [];
        if (effectivePhyloPalette && effectivePhyloPalette.enabled && sortedValues.length > 0) {
          try {
            paletteColors = memoGetPalette(
              effectivePhyloPalette.name,
              Math.max(sortedValues.length, effectivePhyloPalette.numColors || sortedValues.length),
              effectivePhyloPalette.reverse || false
            );
          } catch (e) {
            // palette error, fall through to hash colors
            paletteColors = [];
          }
        }
        
        // Build legend entries
        sortedValues.forEach((val, index) => {
          const v = String(val);
          let color = null;
          
          // Use palette color if available
          if (paletteColors.length > 0 && index < paletteColors.length) {
            color = paletteColors[index];
          } else {
            // Fallback to hash-based color
            let hash = 0; 
            for (let i = 0; i < v.length; ++i) hash = v.charCodeAt(i) + ((hash << 5) - hash);
            const r = (hash >> 0) & 0xFF; 
            const g = (hash >> 8) & 0xFF; 
            const b = (hash >> 16) & 0xFF;
            color = [Math.abs(r), Math.abs(g), Math.abs(b), 255];
          }
          
          phyloVals.set(v, { value: v, color, stroke: Array.isArray(color) ? darkenColor(color) : null });
        });
      }
      legend.phylo = Array.from(phyloVals.values());

      // Protein links
      if (gv && Array.isArray(gv.proteinLinks) && gv.proteinLinks.length > 0) {
        const cfg = proteinLinkConfig || {};
        if (cfg.colorBy === 'identity_gradient' && cfg.palette && cfg.palette.enabled) {
          const sims = gv.proteinLinks.map(l => (typeof l.similarity === 'number' ? l.similarity : 0));
          const minSim = Math.min(...sims);
          const maxSim = Math.max(...sims);
          let palette = [];
          try { palette = memoGetPalette(cfg.palette.name, cfg.palette.numColors || 8, cfg.palette.reverse || false); } catch(e) { palette = []; }
          legend.proteinLinks = { mode: 'identity_gradient', minSim, maxSim, palette };
        } else if (cfg.colorBy === 'source_gene' || cfg.colorBy === 'target_gene') {
          const list = [];
          gv.proteinLinks.forEach(l => {
            const gA = gv.genesById && gv.genesById[l.gAId];
            const gB = gv.genesById && gv.genesById[l.gBId];
  if (cfg.colorBy === 'source_gene' && gA) {
  const primaryField = geneColorBy || colorBy || 'cluster';
  let metaKeyA = (gA.metadata && gA.metadata[primaryField]);
  // Only fall back to cluster when the selected field is cluster
  if (isEmptyValue(metaKeyA) && primaryField === 'cluster') metaKeyA = gA.cluster;
  const colorA = (geneColorMap && gA && !isEmptyValue(metaKeyA)) ? (getColorFromMap(geneColorMap, normalizeKey(metaKeyA), effectiveGenePalette?.type) || gA.fillColor) : (gA.fillColor || themeColors.geneFill);
            list.push({ id: l.gAId, label: gA.metadata ? gA.metadata[geneColorBy || colorBy] : gA.id, color: colorA, stroke: Array.isArray(colorA) ? darkenColor(colorA) : null });
      }
      if (cfg.colorBy === 'target_gene' && gB) {
        const primaryField = geneColorBy || colorBy || 'cluster';
        let metaKeyB = (gB.metadata && gB.metadata[primaryField]);
        if (isEmptyValue(metaKeyB) && primaryField === 'cluster') metaKeyB = gB.cluster;
        const colorB = (geneColorMap && gB && !isEmptyValue(metaKeyB)) ? (getColorFromMap(geneColorMap, normalizeKey(metaKeyB), effectiveGenePalette?.type) || gB.fillColor) : (gB.fillColor || themeColors.geneFill);
        list.push({ id: l.gBId, label: gB.metadata ? gB.metadata[geneColorBy || colorBy] : gB.id, color: colorB, stroke: Array.isArray(colorB) ? darkenColor(colorB) : null });
      }
          });
          const uniq = new Map(); list.forEach(li => { if (li && li.id && !uniq.has(li.id)) uniq.set(li.id, li); });
          legend.proteinLinks = { mode: cfg.colorBy, mapping: Array.from(uniq.values()) };
        } else {
          legend.proteinLinks = { mode: cfg.colorBy, solidColor: cfg.solidColor || null, useAlpha: cfg.useAlpha, minAlpha: cfg.minAlpha, maxAlpha: cfg.maxAlpha };
        }
      }

      // Nucleotide links
      if (gv && Array.isArray(gv.nucleotideLinks) && gv.nucleotideLinks.length > 0) {
        const cfg = nucleotideLinkConfig || {};
        if (cfg.colorBy === 'identity_gradient' && cfg.palette && cfg.palette.enabled) {
          const sims = gv.nucleotideLinks.map(l => (typeof l.similarity === 'number' ? l.similarity : 0));
          const minSim = Math.min(...sims);
          const maxSim = Math.max(...sims);
          let palette = [];
          try { palette = memoGetPalette(cfg.palette.name, cfg.palette.numColors || 8, cfg.palette.reverse || false); } catch(e) { palette = []; }
          legend.nucleotideLinks = { mode: 'identity_gradient', minSim, maxSim, palette };
        } else if (cfg.colorBy === 'source_gene' || cfg.colorBy === 'target_gene') {
          const list = [];
          gv.nucleotideLinks.forEach(l => {
            const gA = gv.genesById && gv.genesById[l.gAId];
            const gB = gv.genesById && gv.genesById[l.gBId];
      if (cfg.colorBy === 'source_gene' && gA) {
        const metaKeyA = (gA.metadata && gA.metadata[geneColorBy || colorBy]) || gA.cluster;
        const colorA = (geneColorMap && gA && metaKeyA) ? (getColorFromMap(geneColorMap, metaKeyA, effectiveGenePalette?.type) || gA.fillColor) : (gA.fillColor || themeColors.geneFill);
        list.push({ id: l.gAId, label: gA.metadata ? gA.metadata[geneColorBy || colorBy] : gA.id, color: colorA, stroke: Array.isArray(colorA) ? darkenColor(colorA) : null });
      }
      if (cfg.colorBy === 'target_gene' && gB) {
        const metaKeyB = (gB.metadata && gB.metadata[geneColorBy || colorBy]) || gB.cluster;
        const colorB = (geneColorMap && gB && metaKeyB) ? (getColorFromMap(geneColorMap, metaKeyB, effectiveGenePalette?.type) || gB.fillColor) : (gB.fillColor || themeColors.geneFill);
        list.push({ id: l.gBId, label: gB.metadata ? gB.metadata[geneColorBy || colorBy] : gB.id, color: colorB, stroke: Array.isArray(colorB) ? darkenColor(colorB) : null });
      }
          });
          const uniq = new Map(); list.forEach(li => { if (li && li.id && !uniq.has(li.id)) uniq.set(li.id, li); });
          legend.nucleotideLinks = { mode: cfg.colorBy, mapping: Array.from(uniq.values()) };
        } else {
          legend.nucleotideLinks = { mode: cfg.colorBy, solidColor: cfg.solidColor || null, useAlpha: cfg.useAlpha, minAlpha: cfg.minAlpha, maxAlpha: cfg.maxAlpha };
        }
      }

      // Regions: collect colors that are now set directly on region objects
      try {
        const regions = gv ? gv.getAllRegions() : [];
        if (regions.length > 0) {
          const obj = {};
          regions.forEach(r => {
            if (r.fillColor) {
              const key = r.getColorKey();
              if (key !== null && key !== undefined && key !== '') {
                obj[String(key)] = r.fillColor;
              }
            }
          });
          if (Object.keys(obj).length > 0) {
            legend.regions = obj;
          } else {
            // Fallback to building legend from metadata
            const regionMap = {};
            regions.forEach(r => {
              const key = (r.metadata && (r.metadata.region_type || r.metadata.type)) ? String(r.metadata.region_type || r.metadata.type) : (r.name || r.id || 'region');
              const fill = r.fillColor || r.color || null;
              const stroke = r.strokeColor || (Array.isArray(fill) ? darkenColor(fill) : null);
              regionMap[key] = { color: fill, stroke };
            });
            legend.regions = regionMap;
          }
        }
      } catch (e) {
        // ignore
      }

      // ncRNAs
      try {
        const ncRNAs = gv ? gv.getAllNonCodingFeatures() : [];
        if (ncRNAs && ncRNAs.length > 0) {
          // Build an array of ncRNA legend entries similar to genes (label, color, stroke)
          const ncMap = new Map();
          ncRNAs.forEach(nc => {
            const key = (nc.metadata && nc.metadata.type) ? String(nc.metadata.type) : (nc.name || nc.id || 'ncRNA');
            const fill = nc.fillColor || nc.color || null;
            const stroke = nc.strokeColor || (Array.isArray(fill) ? darkenColor(fill) : null);
            if (!ncMap.has(key)) ncMap.set(key, { label: String(key), color: fill, stroke });
          });
          legend.ncRNAs = Array.from(ncMap.values());
        }
      } catch (e) {
        // ignore
      }
    } catch (e) {
      // ignore, return partial legend
    }

    return legend;
  }

  // Notify parent about legend changes whenever relevant inputs change.
  // Only emit when the payload actually differs from the last emitted payload
  const lastLegendRef = React.useRef(null);
  React.useEffect(() => {
    if (typeof onLegendChange !== 'function') {
      try { console.debug('[Legend] onLegendChange not provided or not a function:', onLegendChange); } catch (e) {}
      return;
    }
    try {
      const legendPayload = buildLegendData();
      if (!legendPayload || typeof legendPayload !== 'object') return;

      // Stable string comparison to avoid creating a deep-equality util here.
      let asStr = null;
      try { asStr = JSON.stringify(legendPayload); } catch (e) { asStr = String(legendPayload); }

      if (lastLegendRef.current !== asStr) {
        lastLegendRef.current = asStr;
        // If payload looks empty (all nulls or empty), log that explicitly so we can
        // diagnose why the widget isn't receiving entries.
        try {
          const hasEntries = (obj) => {
            if (!obj || typeof obj !== 'object') return false;
            return Object.keys(obj).some(k => {
              const v = obj[k];
              if (v == null) return false;
              if (Array.isArray(v) && v.length > 0) return true;
              if (typeof v === 'object' && Object.keys(v).length > 0) return true;
              return false;
            });
          };
          if (!hasEntries(legendPayload)) {
            // logging removed
          }
        } catch (e) {}
        try {
          // Summarize legend for debugging
          const summary = {};
          try {
            if (legendPayload.genes) summary.genes = Array.isArray(legendPayload.genes) ? legendPayload.genes.length : Object.keys(legendPayload.genes || {}).length;
            if (legendPayload.phylo) summary.phylo = Array.isArray(legendPayload.phylo) ? legendPayload.phylo.length : 0;
            if (legendPayload.regions) summary.regions = Array.isArray(legendPayload.regions) ? legendPayload.regions.length : Object.keys(legendPayload.regions || {}).length;
            if (legendPayload.ncRNAs) summary.ncRNAs = Array.isArray(legendPayload.ncRNAs) ? legendPayload.ncRNAs.length : Object.keys(legendPayload.ncRNAs || {}).length;
            if (legendPayload.proteinLinks) summary.proteinLinks = typeof legendPayload.proteinLinks === 'object' ? Object.keys(legendPayload.proteinLinks).length : 0;
            if (legendPayload.nucleotideLinks) summary.nucleotideLinks = typeof legendPayload.nucleotideLinks === 'object' ? Object.keys(legendPayload.nucleotideLinks).length : 0;
          } catch (e) {}
          
        } catch (e) {}
        // Force a visible console.log so users see legend emission even when
        // DevTools filters hide console.debug messages. We keep the output
        // concise by printing a small summary and a truncated JSON string.
        
        // Also create a temporary on-screen overlay so the legend is visible
        // even when console output is unavailable or filtered.
  // overlay removed — use console logs or window.__hoodini_getLegend() to inspect payload
        onLegendChange(legendPayload);
      }
    } catch (e) {
      // ignore errors in legend generation
    }
  }, [buildLegendData, onLegendChange]);

  // 🚀 CRITICAL: Force DeckGL updates when metadata or configurations change
  // This ensures DeckGL detects data changes and re-renders properly
  const _lastAlignmentTriggerSig = React.useRef(null);
  React.useEffect(() => {
    if (!genomeView) return;
    try {
      const gvCount = genomeView ? Object.keys(genomeView.genesById || {}).length : 0;
      const protoSig = [
        gvCount,
        (proteinMetadata && typeof proteinMetadata === 'object') ? Object.keys(proteinMetadata).length : 0,
        proteinLinkConfig ? JSON.stringify(proteinLinkConfig) : '',
        nucleotideLinkConfig ? JSON.stringify(nucleotideLinkConfig) : '',
        String(geneColorBy || ''),
        String(colorBy || '')
      ].join('|');
      if (_lastAlignmentTriggerSig.current !== protoSig) {
        _lastAlignmentTriggerSig.current = protoSig;
        setAlignmentVersion(prev => prev + 1);
      }
    } catch (e) {
      setAlignmentVersion(prev => prev + 1);
    }
  }, [genomeView, proteinMetadata, nonCodingMetadata, proteinLinkConfig, nucleotideLinkConfig, geneColorBy, colorBy]);

  // NOTE: live slider display props (arrowheadHeight/geneHeight)
  // are intentionally NOT used to bump `alignmentVersion` here. The layers
  // memo uses a geometry signature (including the live heights) to decide
  // whether to recompute heavy polygons. This avoids changing
  // `alignmentVersion`/`paletteVersion` for purely visual slider updates.

  const domainColorMap = React.useMemo(() => {
    if (!genomeView || !effectiveDomainPalette?.enabled) return null;
    
    // Optionally filter domains by source before computing keys
    let domains = genomeView.getAllDomains();
    if (domainSource && domainSource !== 'all') {
      domains = domains.filter(d => {
        const s = (d && (d.source || (d.metadata && d.metadata.source))) || null;
        return String(s) === String(domainSource);
      });
    }
    const validKeys = domains
      .map(d => {
        // Use robust extractor that checks top-level, metadata and common aliases
        if (domainColorBy === 'domainName') return d.domainName;
        const v = extractDomainField(d, domainColorBy);
        return (v !== undefined && v !== '') ? v : undefined;
      })
      .filter(key => key !== null && key !== undefined && key !== '');
    
  const uniqueKeys = [...new Set(validKeys)];
    if (uniqueKeys.length === 0) return null;

    // Detect numeric keys before generating colors so we can control reversal
    const numericVals = uniqueKeys.map(k => toNumeric(k)).filter(n => !isNaN(n));
    const isNumeric = numericVals.length === uniqueKeys.length && uniqueKeys.length > 0;

    // Decide whether to ask the palette generator to reverse the color array.
    // For numeric sequential palettes that are specifically evalue (with -log10
    // transform), invert the requested reverse so that larger -log10 (smaller
    // evalue) maps to darker colors as users typically expect.
    let paletteReverse = (effectiveDomainPalette.reverse || false);
    const isEvalueField = String(domainColorBy).toLowerCase() === 'evalue' || String(domainColorBy).toLowerCase() === 'e_value';
    if (effectiveDomainPalette.type === 'sequential' && isNumeric && isEvalueField) {
      paletteReverse = !paletteReverse;
    }

    const colors = memoGetPalette(
      effectiveDomainPalette.name,
      effectiveDomainPalette.numColors && effectiveDomainPalette.type === 'sequential'
        ? effectiveDomainPalette.numColors
        : Math.max(uniqueKeys.length, effectiveDomainPalette.numColors || uniqueKeys.length),
      paletteReverse
    );

    const colorMap = new Map();
    // Diagnostic log: show how many unique keys we found and sample values
    if (DEBUG_LOGS) try { console.log('[domainColorMap] uniqueKeys', uniqueKeys.length, uniqueKeys.slice(0,8), 'isNumeric=', isNumeric); } catch(e) {}
    if (effectiveDomainPalette.type === 'sequential' && isNumeric) {
      // Compute numeric originals and transformed values
      const numericOriginal = uniqueKeys.map(k => toNumeric(k));
      let transformed = numericOriginal.slice();
      // If coloring by evalue, apply -log10 transform so small e-values spread out
      if (String(domainColorBy).toLowerCase() === 'evalue' || String(domainColorBy).toLowerCase() === 'e_value') {
        // Apply -log10 to spread small e-values, then compress extreme
        // dynamic range by applying log2(1 + t). This prevents very large
        // -log10 values (e.g. 200, 300) from dominating the color scale.
        transformed = numericOriginal.map(v => {
          if (!isFinite(v) || v <= 0) {
            // substitute a tiny positive value to avoid -Infinity
            return -Math.log10(Number.MIN_VALUE);
          }
          return -Math.log10(v);
        });
        // Compress dynamic range (safe for t>=0): use log2(1 + t)
        transformed = transformed.map(t => Math.log2(1 + Math.max(0, t)));
      }
      // Normalize so minimum is anchored at 0 and maximum is observed max
      const maxT = Math.max(...transformed);
      // Alpha mapping: use palette.alphaRange [minAlpha,maxAlpha] (0-255) if provided,
      // otherwise default to semi-transparent -> opaque range [128,255].
      let alphaMin = 128, alphaMax = 255;
      try {
        if (effectiveDomainPalette.alphaRange && Array.isArray(effectiveDomainPalette.alphaRange) && effectiveDomainPalette.alphaRange.length === 2) {
          let a0 = Number(effectiveDomainPalette.alphaRange[0]);
          let a1 = Number(effectiveDomainPalette.alphaRange[1]);
          if (!isNaN(a0) && !isNaN(a1)) {
            // If values look fractional (0..1), scale up to 0..255
            if (a0 <= 1 && a1 <= 1) {
              a0 = a0 * 255;
              a1 = a1 * 255;
            }
            alphaMin = Math.max(0, Math.min(255, Math.round(a0)));
            alphaMax = Math.max(0, Math.min(255, Math.round(a1)));
          }
        }
      } catch (e) {}
  if (DEBUG_LOGS) try { console.log('[domainColorMap] alphaRange used', alphaMin, alphaMax); } catch(e) {}

      // Build colors based on transformed values but store them under original numeric keys.
      uniqueKeys.forEach((k, i) => {
  const orig = numericOriginal[i];
  const tVal = transformed[i];
  // Always anchor minimum at 0 (not at observed min). Use t = value / max.
  const rawT = (maxT > 0) ? (tVal / maxT) : 0;
  // Use raw interpolation parameter (palette reversal is handled by
  // the palette generator above).
  const t = rawT;
        const idx = Math.floor(t * (colors.length - 1));
        const base = colors[idx] || [0,0,0,255];
        // compute alpha for this value
        const mappedAlpha = Math.round(alphaMin + (alphaMax - alphaMin) * t);
        const col = [
          (base[0] !== undefined ? base[0] : 0),
          (base[1] !== undefined ? base[1] : 0),
          (base[2] !== undefined ? base[2] : 0),
          mappedAlpha
        ];
        // Map by original numeric value so lookups using the original key succeed
        try { colorMap.set(orig, col); } catch (e) {}
        // Mirror by string forms too
        try { colorMap.set(String(orig), col); } catch (e) {}
        try { colorMap.set(String(k), col); } catch (e) {}
      });
    } else {
      // Categorical coloring fallback — normalize keys to strings
      uniqueKeys.forEach((key, i) => {
        colorMap.set(String(key), colors[i % colors.length]);
        const num = toNumeric(key);
        if (!isNaN(num)) colorMap.set(num, colors[i % colors.length]);
      });
    }
  return colorMap;
  }, [genomeView, effectiveDomainPalette, domainColorBy, domainSource]);

  // Debug: log domain color mapping diagnostics when selection changes
  React.useEffect(() => {
    try {
      if (DEBUG_LOGS) console.log('[ColorSelect] domain selection changed', { domainColorBy });
  if (!genomeView) {
        if (DEBUG_LOGS) console.log('[ColorSelect] genomeView not ready for domains');
        return;
      }
  const domains = genomeView.getAllDomains();
  if (DEBUG_LOGS) {
    try { console.log('[ColorSelect] domains.length=', Array.isArray(domains) ? domains.length : String(domains)); } catch(e) {}
    try { console.log('[ColorSelect] sample domains=', Array.isArray(domains) ? domains.slice(0,6) : domains); } catch(e) {}
  }
  const keys = domains.map(d => {
    if (domainColorBy === 'domainName') return d.domainName;
    return extractDomainField(d, domainColorBy);
  }).filter(k => k !== null && k !== undefined && k !== '');
  if (DEBUG_LOGS) try { console.log('[ColorSelect] extracted keys sample=', keys.slice(0,12)); } catch(e) {}
      const unique = [...new Set(keys)];
      const numericVals = unique.map(k => toNumeric(k)).filter(n => !isNaN(n));
      const isNumeric = numericVals.length === unique.length && unique.length > 0;
      if (DEBUG_LOGS) {
        console.log(`[ColorSelect][domain] field=${domainColorBy} unique=${unique.length} isNumeric=${isNumeric} sample=${unique.slice(0,5)}`);
        if (isNumeric && numericVals.length > 0) console.log('[ColorSelect][domain] numericRange=', Math.min(...numericVals), Math.max(...numericVals));
        if (domainColorMap) unique.slice(0,5).forEach(k => console.log('[ColorSelect][domain] map', k, '->', getColorFromMap(domainColorMap, k, effectiveDomainPalette?.type)));
      }
    } catch (e) {
      console.error('ColorSelect domain logging error', e);
    }
  }, [domainColorBy, genomeView, domainColorMap, effectiveDomainPalette?.name, effectiveDomainPalette?.type, domainSource]);

  // Build legend entries for display (gene families, phylo labels, ncRNAs, regions, links)
  const colorArrayToCss = (c) => {
    if (!Array.isArray(c)) return 'rgba(0,0,0,1)';
    const [r,g,b,a] = c;
    const alpha = typeof a === 'number' ? (a/255) : 1;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const legendEntries = React.useMemo(() => {
    const entries = [];

    // Gene families (from geneColorMap)
    // Use stableGeneColorMap for consistent legend display (it has unique sorted keys)
    // Fall back to geneColorMap if stable is not available
    const sourceMap = stableGeneColorMap || geneColorMap;
    if (sourceMap && sourceMap.size > 0) {
      const seenLabels = new Set();
      const items = [];
      for (const [k, color] of sourceMap.entries()) {
        // Only use string keys to avoid duplicates (Map stores both "1" and 1 as separate keys)
        if (typeof k === 'string') {
          const label = k;
          if (!seenLabels.has(label)) {
            seenLabels.add(label);
            items.push({ label, color });
          }
        }
      }
      if (items.length > 0) {
        entries.push({ id: 'genes', title: 'Gene families', items: items.slice(0, 20) });
      }
    }

    // Phylogenetic labels (from effectivePhyloPalette + treeMetadata)
    if (effectivePhyloPalette && effectivePhyloPalette.enabled && tree && treeMetadata && treeColorBy) {
      const values = new Set();
      tree.leafNodes.forEach(l => {
        const meta = treeMetadata[l.name] || {};
        const v = meta[treeColorBy];
        if (v !== undefined && v !== null && v !== '') values.add(String(v));
      });
      const sorted = Array.from(values).sort();
      if (sorted.length > 0) {
        let paletteColors = [];
        try {
          paletteColors = memoGetPalette(
            effectivePhyloPalette.name,
            Math.max(sorted.length, effectivePhyloPalette.numColors || sorted.length),
            effectivePhyloPalette.reverse || false
          );
        } catch (e) {
          paletteColors = [];
        }
        const items = sorted.map((v, i) => ({ label: v, color: paletteColors[i % (paletteColors.length || 1)] || [0,0,0,255] }));
        entries.push({ id: 'phylo', title: 'Phylo labels', items });
      }
    }

    // ncRNAs (show a sample set)
    const ncItems = [];
    if (genomeView) {
      Object.values(genomeView.ncRNAsById || {}).slice(0, 20).forEach(nc => {
        const label = nc.name || nc.originalId || nc.id || 'ncRNA';
        const color = nc.fillColor || nc.color || [0,0,0,255];
        ncItems.push({ label: String(label), color });
      });
    }
    if (ncItems.length > 0) entries.push({ id: 'ncrna', title: 'ncRNAs', items: ncItems });

    // Regions (from colors set directly on region objects)
    const regions = genomeView.getAllRegions();
    const regionItems = [];
    if (regions.length > 0) {
      const regionColorMap = new Map();
      regions.forEach(r => {
        if (r.fillColor) {
          const key = r.getColorKey();
          if (key !== null && key !== undefined && key !== '') {
            regionColorMap.set(key, r.fillColor);
          }
        }
      });
      if (regionColorMap.size > 0) {
        const items = Array.from(regionColorMap.entries()).map(([k, c]) => ({ label: String(k), color: c }));
        entries.push({ id: 'regions', title: 'Regions', items });
      }
    }

    // Protein links legend
    if (proteinLinkConfig) {
      if ((proteinLinkConfig.palette && proteinLinkConfig.palette.enabled) || proteinLinkConfig.colorBy === 'identity_gradient') {
        // show palette samples
        let pal = [];
        try {
          pal = memoGetPalette(
            proteinLinkConfig.palette?.name || DEFAULT_CONFIG.proteinLink.palette.name,
            Math.max(proteinLinkConfig.palette?.numColors || 6, 6),
            proteinLinkConfig.palette?.reverse || false
          );
        } catch (e) { pal = []; }
        const items = (pal.length > 0 ? pal : [[100,0,220,255]]).slice(0, 12).map((c, i) => ({ label: `${i+1}`, color: c }));
        entries.push({ id: 'proteinLinks', title: 'Protein links (palette)', items });
      } else if (proteinLinkConfig.colorBy === 'source_gene' || proteinLinkConfig.colorBy === 'target_gene') {
        entries.push({ id: 'proteinLinks', title: 'Protein links', note: `Colored by ${proteinLinkConfig.colorBy.replace('_', ' ')}` });
      } else {
        entries.push({ id: 'proteinLinks', title: 'Protein links', items: [{ label: 'solid', color: proteinLinkConfig.solidColor || DEFAULT_CONFIG.proteinLink.solidColor }] });
      }
    }

    // Nucleotide links legend
    if (nucleotideLinkConfig) {
      if ((nucleotideLinkConfig.palette && nucleotideLinkConfig.palette.enabled) || nucleotideLinkConfig.colorBy === 'identity_gradient') {
        let pal = [];
        try {
          pal = memoGetPalette(
            nucleotideLinkConfig.palette?.name || DEFAULT_CONFIG.nucleotideLink.palette.name,
            Math.max(nucleotideLinkConfig.palette?.numColors || 6, 6),
            nucleotideLinkConfig.palette?.reverse || false
          );
        } catch (e) { pal = []; }
        const items = (pal.length > 0 ? pal : [[200,200,200,255]]).slice(0, 12).map((c, i) => ({ label: `${i+1}`, color: c }));
        entries.push({ id: 'nucleotideLinks', title: 'Nucleotide links (palette)', items });
      } else {
        entries.push({ id: 'nucleotideLinks', title: 'Nucleotide links', items: [{ label: 'solid', color: nucleotideLinkConfig.solidColor || DEFAULT_CONFIG.nucleotideLink.solidColor }] });
      }
    }

    return entries;
  }, [
    geneColorMap,
    stableGeneColorMap, // Use stable map for legend (has unique string keys)
    effectivePhyloPalette,
    tree,
    treeMetadata,
    treeColorBy,
    JSON.stringify(genePalette), // Add gene palette to dependencies
    JSON.stringify(ncRNAPalette), // Add ncRNA palette to dependencies  
    JSON.stringify(regionPalette), // Add region palette to dependencies
    proteinLinkConfig,
    nucleotideLinkConfig,
    themeColors,
    alignmentVersion // Add this to trigger legend updates when data changes
  ]);

  // 🚀 PERFORMANCE: Pre-compute rightmost positions for 'after-tracks' mode (O(N+M) instead of O(N×M))
  const rightmostPositionsByLeaf = React.useMemo(() => {
    if (!genomeView || !tree) return new Map();
    
    const effectivePhyloLabelPosition = phyloLabelPosition || config.tree?.phyloLabelPosition || 'after-tree';
    if (effectivePhyloLabelPosition !== 'after-tracks') return new Map();
    
    const positions = new Map();
    
    // Initialize with -Infinity for all leaf names
    tree.leafNodes.forEach(leaf => {
      positions.set(leaf.name, -Infinity);
    });
    
    // Single pass through all genes (O(M) instead of O(N×M))
    Object.values(genomeView.genesById).forEach(gene => {
      const leafName = gene.hood_id || genomeView.getHoodIdFromSeqid(gene.seqid);
      if (leafName && positions.has(leafName)) {
        const currentMax = positions.get(leafName);
        positions.set(leafName, Math.max(currentMax, Math.max(gene.start, gene.end)));
      }
    });
    
    // Single pass through all ncRNAs
    Object.values(genomeView.ncRNAsById).forEach(ncRNA => {
      const leafName = ncRNA.hood_id || genomeView.getHoodIdFromSeqid(ncRNA.seqid);
      if (leafName && positions.has(leafName)) {
        const currentMax = positions.get(leafName);
        positions.set(leafName, Math.max(currentMax, Math.max(ncRNA.start, ncRNA.end)));
      }
    });
    
    // Process baselines
    const nucleotideHoods = genomeView.nucleotideLinks.filter(link => link.hood);
    nucleotideHoods.forEach(hood => {
      if (hood.hood_id && positions.has(hood.hood_id)) {
        const currentMax = positions.get(hood.hood_id);
        positions.set(hood.hood_id, Math.max(currentMax, Math.max(hood.start, hood.end)));
      }
    });
    
    return positions;
  }, [genomeView, tree, phyloLabelPosition, config.tree?.phyloLabelPosition, alignmentVersion, effectiveTreeXScale, phyloPalette, treeColorBy, treeMetadata, treeLabelBy, genomeXScaleProp]);

  // Compact palette/data version signature used in updateTriggers to avoid passing large objects
  const paletteVersion = React.useMemo(() => {
    const gp = JSON.stringify(genePalette || config?.colorPalettes?.genePalette || {});
    const np = JSON.stringify(ncRNAPalette || config?.colorPalettes?.ncRNAPalette || {});
    const rp = JSON.stringify(regionPalette || config?.colorPalettes?.regionPalette || {});
  const dp = JSON.stringify(domainPalette || config?.colorPalettes?.domainPalette || {});
    const pl = JSON.stringify(proteinLinkConfig || {});
    const nl = JSON.stringify(nucleotideLinkConfig || {});
  return `${gp}|${np}|${rp}|${dp}|${pl}|${nl}|${alignmentVersion}`;
  }, [genePalette, ncRNAPalette, regionPalette, proteinLinkConfig, nucleotideLinkConfig, alignmentVersion, config]);

  // Memoize geneColorMap: Map(uniqueGeneId -> [r,g,b,a])
  // This integrates colors from geneColorMap (palette-based) which includes prevalence filtering
  // Priority: 1. normalizedGeneColors (custom) > 2. proteinMetadata color > 3. geneColorMap (palette) > 4. cluster colors
  // When palette is disabled, only use custom colors (normalizedGeneColors and proteinMetadata)
  const geneColorMapMemo = React.useMemo(() => {
    const map = new Map();
    if (!genomeView) return map;
    
    const paletteEnabled = effectiveGenePalette?.enabled;
    const primaryField = geneColorBy || colorBy || 'cluster';
    
    // Helper: parse color from string "R,G,B,A" or "R,G,B" or array
    const parseColorValue = (val) => {
      if (!val) return null;
      if (Array.isArray(val)) return val.length >= 3 ? val : null;
      if (typeof val === 'string') {
        const parts = val.split(',').map(n => parseInt(n.trim(), 10)).filter(v => !isNaN(v));
        if (parts.length >= 3) {
          return parts.length === 3 ? [...parts, 255] : parts.slice(0, 4);
        }
      }
      return null;
    };
    
    // DEBUG: Log normalizedGeneColors once
    if (normalizedGeneColors && normalizedGeneColors.size > 0) {
      if (DEBUG_LOGS) console.log('[geneColorMapMemo] normalizedGeneColors has', normalizedGeneColors.size, 'entries:', [...normalizedGeneColors.keys()].slice(0, 5));
    }
    if (proteinMetadata) {
      const sampleKeys = Object.keys(proteinMetadata).slice(0, 3);
      if (DEBUG_LOGS) console.log('[geneColorMapMemo] proteinMetadata sample keys:', sampleKeys, 'has color:', sampleKeys.map(k => !!proteinMetadata[k]?.color));
    }
    
    for (const uid in genomeView.genesById) {
      const gene = genomeView.genesById[uid];
      let col = null;
      
      // 0. HIGHEST PRIORITY: Custom geneColors map (user-provided prop)
      if (normalizedGeneColors) {
        // Try gene ID, original ID, unique ID
        col = normalizedGeneColors.get(uid) 
          || normalizedGeneColors.get(gene?.id)
          || normalizedGeneColors.get(gene?.originalGeneId)
          || normalizedGeneColors.get(gene?.gene_id);
        // DEBUG: log first match attempt
        if (uid.includes('gene_A1')) {
          if (DEBUG_LOGS) console.log('[geneColorMapMemo] Gene', uid, 'originalGeneId:', gene?.originalGeneId, 'looking for color, found:', col);
        }
      }
      
      // 0.5. SECOND PRIORITY: Color from proteinMetadata "color" column
      if (!col && proteinMetadata) {
        const geneId = gene?.id || gene?.gene_id || gene?.originalGeneId || uid;
        const meta = proteinMetadata[geneId] || proteinMetadata[uid];
        if (meta?.color) {
          col = parseColorValue(meta.color);
          // DEBUG
          if (uid.includes('gene_A1')) {
            if (DEBUG_LOGS) console.log('[geneColorMapMemo] Gene', uid, 'got color from metadata:', meta.color, '->', col);
          }
        }
      }
      
      // The following color sources are ONLY used when palette is enabled
      if (paletteEnabled) {
        // 1. THEN try geneColorMap (palette-based colors with prevalence filtering)
        // This is the authoritative source for gene colors
        if (!col && geneColorMap) {
          const key = gene?.metadata?.[primaryField];
          if (key !== undefined && key !== null && key !== '') {
            const normalizedKey = normalizeKey(key);
            col = getColorFromMap(geneColorMap, normalizedKey, effectiveGenePalette?.type);
          }
        }
        
        // 2. Fallback to cluster colors from GenomeView
        if (!col && genomeView.proteinClusters && genomeView.proteinClusters[uid]) {
          const clusterId = genomeView.proteinClusters[uid];
          if (genomeView.clusterColors && genomeView.clusterColors[clusterId]) {
            col = genomeView.clusterColors[clusterId];
          }
        }
      }
      
      // Note: gene.fillColor fallback removed - when palette is disabled, 
      // genes should use the default theme color, not cached palette colors
      
      map.set(uid, col || null);
    }
    // DEBUG: Log map contents
    const coloredGenes = [...map.entries()].filter(([,v]) => v !== null);
    if (DEBUG_LOGS) console.log('[geneColorMapMemo] Final map has', coloredGenes.length, 'colored genes. Sample:', coloredGenes.slice(0, 3));
    return map;
  }, [genomeView, genomeView?._paletteVersion, effectiveGenePalette?.enabled, effectiveGenePalette?.type, effectiveGenePalette?.prevalenceFilter, paletteVersion, geneColorMap, geneColorBy, colorBy, normalizedGeneColors, proteinMetadata]);

  // Memoize layer data arrays to avoid rebuilding on every render
  const genesData = React.useMemo(() => {
    if (!genomeView) return [];
    const visibleSet = visibleGeneIds instanceof Set ? visibleGeneIds : null;

    const isVisible = (geneObj) => {
      if (!visibleSet) return true;
      const key =
        geneObj?.gene_id ||
        geneObj?.originalGeneId ||
        geneObj?.originalId ||
        geneObj?.id ||
        geneObj?.uniqueId;
      if (!key) return true;
      return visibleSet.has(String(key));
    };

    // If a clade is selected, prefer the filtered gene set from the model so
    // all genes outside the selected clade are excluded from rendering.
    if (selectedNode) {
      try {
        const filtered = genomeView.filterBySelectedNode(selectedNode);
        if (filtered && Array.isArray(filtered.genes)) {
          return filtered.genes
            .filter(isVisible)
            .map(g => {
            const uid = g.uniqueId || g.id || '';
            return {
              id: uid,
              gene: g,
              start: g.start,
              end: g.end,
              strand: g.strand,
              trackY: g.trackY,
              fillColor: geneColorMapMemo.get(uid) || themeColors.geneFill || [200,200,200,255]
            };
          });
        }
      } catch (e) {
        // fallback to full set on error
      }
    }

    const result = Object.entries(genomeView.genesById)
      .filter(([, g]) => isVisible(g))
      .map(([uid, g]) => ({
        id: uid,
        gene: g,
        start: g.start,
        end: g.end,
        strand: g.strand,
        trackY: g.trackY,
        fillColor: geneColorMapMemo.get(uid) || themeColors.geneFill || [200,200,200,255]
      }));
    // DEBUG: Check if colors are being applied
    const coloredGenes = result.filter(r => r.fillColor && r.fillColor[0] !== 200);
    if (DEBUG_LOGS) {
      console.log('[genesData] Built', result.length, 'genes, with custom colors:', coloredGenes.length);
      if (coloredGenes.length > 0) {
        console.log('[genesData] Sample colored gene:', coloredGenes[0].id, coloredGenes[0].fillColor);
      } else {
        console.log('[genesData] geneColorMapMemo size:', geneColorMapMemo.size, 'sample entry:', geneColorMapMemo.get('1_gene_A1'));
      }
    }
    return result;
  }, [genomeView, genomeView?._paletteVersion, effectiveGenePalette?.enabled, geneColorMapMemo, themeColors, paletteVersion, visibleGeneIds, selectedNode, alignmentVersion, genomeXScaleProp, ySpacingProp]);

  // Create stable dependency strings for link configs
  const proteinLinkConfigKey = React.useMemo(() => JSON.stringify(proteinLinkConfig), [proteinLinkConfig]);
  const nucleotideLinkConfigKey = React.useMemo(() => JSON.stringify(nucleotideLinkConfig), [nucleotideLinkConfig]);

  const proteinLinkData = React.useMemo(() => {
    if (!genomeView || !genomeView.proteinLinks || !Array.isArray(genomeView.proteinLinks)) return [];
    // Apply colors before building data array
    if (proteinLinkConfig) {
      genomeView.applyProteinLinkColors(proteinLinkConfig);
    }
    
    // Get visible hoods when a node is selected
    let visibleHoods = null;
    if (selectedNode && genomeView.getNodeDescendantLeaves) {
      try {
        const descendantLeaves = genomeView.getNodeDescendantLeaves(selectedNode);
        if (Array.isArray(descendantLeaves) && descendantLeaves.length > 0) {
          visibleHoods = new Set(descendantLeaves);
        }
      } catch (e) {
        console.warn('[proteinLinkData] Error getting descendant leaves:', e);
      }
    }
    
    // Filter and map protein links
    return genomeView.proteinLinks
      .filter(pl => {
        // If no node is selected, show all links
        if (!visibleHoods) return true;
        // Only show links where both genes' hoods are visible
        const gA = genomeView.genesById[pl.gAId];
        const gB = genomeView.genesById[pl.gBId];
        const hoodA = gA?.hood_id;
        const hoodB = gB?.hood_id;
        return hoodA && hoodB && visibleHoods.has(hoodA) && visibleHoods.has(hoodB);
      })
      .map((pl, i) => ({
        id: `${pl.gAId}|${pl.gBId}|${i}`,
        gAId: pl.gAId,
        gBId: pl.gBId,
        metadata: pl.metadata || pl,
        fillColor: pl.fillColor || [150,150,150,255],
        _k: `${alignmentVersion}_${i}`
      }));
  }, [genomeView, genomeView?.proteinLinks, paletteVersion, alignmentVersion, proteinLinkConfigKey, geneColorMap, selectedNode]);

  // Debug: log selectedNode changes
  React.useEffect(() => {
    if (DEBUG_LOGS) console.log('[DEBUG] selectedNode changed:', selectedNode?.name || selectedNode?.id || 'null');
  }, [selectedNode]);

  const nucleotideLinkData = React.useMemo(() => {
    if (!genomeView || !genomeView.nucleotideLinks || !Array.isArray(genomeView.nucleotideLinks)) return [];
    // Apply colors before building data array
    if (nucleotideLinkConfig) {
      genomeView.applyNucleotideLinkColors(nucleotideLinkConfig);
    }
    
    // Get visible hoods when a node is selected
    let visibleHoods = null;
    if (DEBUG_LOGS) console.log('[nucleotideLinkData] selectedNode:', selectedNode, 'has getNodeDescendantLeaves:', !!genomeView.getNodeDescendantLeaves);
    if (selectedNode && genomeView.getNodeDescendantLeaves) {
      try {
        const descendantLeaves = genomeView.getNodeDescendantLeaves(selectedNode);
        if (DEBUG_LOGS) console.log('[nucleotideLinkData] descendantLeaves result:', descendantLeaves);
        if (Array.isArray(descendantLeaves) && descendantLeaves.length > 0) {
          visibleHoods = new Set(descendantLeaves);
          if (DEBUG_LOGS) console.log('[nucleotideLinkData] visibleHoods Set created with', visibleHoods.size, 'items:', Array.from(visibleHoods));
        }
      } catch (e) {
        if (DEBUG_LOGS) console.warn('[nucleotideLinkData] Error getting descendant leaves:', e);
      }
    }
    
    // Debug: log filtering info
    if (DEBUG_LOGS && genomeView.nucleotideLinks.length > 0) {
      const firstLink = genomeView.nucleotideLinks[0];
      console.log('[nucleotideLinkData] total links:', genomeView.nucleotideLinks.length, 
        'visibleHoods:', visibleHoods ? Array.from(visibleHoods) : 'all',
        'selectedNode:', selectedNode?.name || 'none',
        'first link hoodA:', firstLink.hoodA, 'hoodB:', firstLink.hoodB);
    }
    
    // Filter and map nucleotide links
    const filtered = genomeView.nucleotideLinks
      .filter(nl => {
        // If no node is selected, show all links
        if (!visibleHoods) return true;
        // Only show links where both hoods are visible
        const hoodA = nl.hoodA;
        const hoodB = nl.hoodB;
        const hasA = visibleHoods.has(hoodA);
        const hasB = visibleHoods.has(hoodB);
        const pass = hasA && hasB;
        // Log first few that fail
        if (!pass && genomeView.nucleotideLinks.indexOf(nl) < 5 && DEBUG_LOGS) {
          console.log('[nucleotideLinkData] FILTERED OUT link:', hoodA, '->', hoodB, 'hasA:', hasA, 'hasB:', hasB);
        }
        return pass;
      });
    
    if (DEBUG_LOGS) console.log('[nucleotideLinkData] filtered count:', filtered.length, 'from total:', genomeView.nucleotideLinks.length);
    
    return filtered.map((nl, i) => {
      // Debug first link to see original values
      if (i === 0) {
        if (DEBUG_LOGS) console.log('[nucleotideLinkData] first nl object:', nl, 'nl.similarity:', nl.similarity);
      }
      return {
        id: `${nl.seqidA}:${nl.startA}-${nl.endA}|${nl.seqidB}:${nl.startB}-${nl.endB}|${i}`,
        seqidA: nl.seqidA,
        seqidB: nl.seqidB,
        hoodA: nl.hoodA || nl.seqidA,
        hoodB: nl.hoodB || nl.seqidB,
        hoodStartA: nl.hoodStartA ?? nl.startA,
        hoodEndA: nl.hoodEndA ?? nl.endA,
        hoodStartB: nl.hoodStartB ?? nl.startB,
        hoodEndB: nl.hoodEndB ?? nl.endB,
        // Ensure similarity is always available
        similarity: nl.similarity,
        metadata: { similarity: nl.similarity },
        fillColor: nl.fillColor || [200,100,100,255],
        _k: `${alignmentVersion}_${i}`
      };
    });
  }, [genomeView, genomeView?.nucleotideLinks, paletteVersion, alignmentVersion, nucleotideLinkConfigKey, selectedNode]);

  // ========== EXTRACTED USEMEMOS FOR PERFORMANCE ==========
  // These were previously computed inside the main `layers` useMemo
  // Extracting them reduces cascading rebuilds

  // 1. Effective config - used everywhere, changes with slider adjustments
  const effectiveConfig = React.useMemo(() => {
    const baseConfig = styleConfig || config;
    const finalGeneHeight = typeof geneHeight === 'number' 
      ? geneHeight 
      : (baseConfig.gene?.height || baseConfig.gene?.defaultHeight || DEFAULT_CONFIG.gene.height);
    const finalArrowheadHeight = typeof arrowheadHeight === 'number' 
      ? arrowheadHeight 
      : (baseConfig.gene?.arrowheadHeight ?? DEFAULT_CONFIG.gene.arrowheadHeight);
    // New visual settings from props
    const finalYSpacing = typeof ySpacingProp === 'number'
      ? ySpacingProp
      : (baseConfig.tree?.ySpacing || DEFAULT_CONFIG.tree.ySpacing);
    const finalGenomeXScale = typeof genomeXScaleProp === 'number'
      ? genomeXScaleProp
      : (baseConfig.genome?.xScalePercent || DEFAULT_CONFIG.genome.xScalePercent);
    const finalStrokeLineWidth = typeof strokeLineWidthProp === 'number'
      ? strokeLineWidthProp
      : (baseConfig.gene?.edgeWidth || DEFAULT_CONFIG.gene.edgeWidth);
    // Label sizes
    const finalPhyloLabelSize = typeof phyloLabelSizeProp === 'number'
      ? phyloLabelSizeProp
      : (baseConfig.text?.phyloLabelSize || DEFAULT_CONFIG.text.phyloLabelSize);
    const finalGeneLabelSize = typeof geneLabelSizeProp === 'number'
      ? geneLabelSizeProp
      : (baseConfig.text?.geneLabelSize || DEFAULT_CONFIG.text.geneLabelSize);
    const finalRulerLabelSize = typeof rulerLabelSizeProp === 'number'
      ? rulerLabelSizeProp
      : (baseConfig.text?.rulerLabelSize || DEFAULT_CONFIG.text.rulerLabelSize);
    
    if (DEBUG_LOGS) {
      console.log('🎛️ effectiveConfig recalculating:', { 
        geneHeight, 
        arrowheadHeight,
        finalGeneHeight,
        finalArrowheadHeight,
        ySpacingProp,
        finalYSpacing,
        genomeXScaleProp,
        finalGenomeXScale,
        phyloLabelSizeProp,
        finalPhyloLabelSize,
        geneLabelSizeProp,
        finalGeneLabelSize,
        'baseConfig.gene.height': baseConfig.gene?.height,
        'baseConfig.gene.defaultHeight': baseConfig.gene?.defaultHeight
      });
    }
    
    return {
      ...baseConfig,
      // Enable alignment debug logs temporarily when DEBUG_LOGS is on
      debug: {
        ...(baseConfig as any).debug,
        alignment: DEBUG_LOGS ? true : ((baseConfig as any)?.debug?.alignment || false)
      },
      tree: {
        ...baseConfig.tree,
        xScalePercent: effectiveTreeXScale,
        ySpacing: finalYSpacing
      },
      gene: {
        ...baseConfig.gene,
        height: finalGeneHeight,
        arrowheadHeight: finalArrowheadHeight,
        edgeWidth: finalStrokeLineWidth
      },
      genome: {
        ...baseConfig.genome,
        xScalePercent: finalGenomeXScale
      },
      domain: {
        ...baseConfig.domain
      },
      text: {
        ...baseConfig.text,
        phyloLabelSize: finalPhyloLabelSize,
        geneLabelSize: finalGeneLabelSize,
        rulerLabelSize: finalRulerLabelSize
      },
      stroke: {
        ...baseConfig.stroke,
        lineWidth: finalStrokeLineWidth
      }
    };
  }, [styleConfig, config, effectiveTreeXScale, geneHeight, arrowheadHeight, ySpacingProp, genomeXScaleProp, strokeLineWidthProp, phyloLabelSizeProp, geneLabelSizeProp, rulerLabelSizeProp]);

  // ========== GLOW SYNC EFFECTS ==========
  // These effects sync highlighted element positions/colors when geometry or theme changes

  // Sync highlighted internal tree node color when theme changes
  // Internal nodes use themeColors.treeEdges, so we need to update when theme changes
  useEffect(() => {
    if (!highlightedTreeNodeData || highlightedTreeNodeData.length === 0) return;
    
    const newColor = themeColors.treeEdges || [100, 180, 255, 255];
    const currentColor = highlightedTreeNodeData[0]?.color;
    
    // Only update if color actually changed
    const colorChanged = !currentColor || 
      newColor[0] !== currentColor[0] || 
      newColor[1] !== currentColor[1] || 
      newColor[2] !== currentColor[2];
    
    if (colorChanged) {
      setHighlightedTreeNodeData(prev => 
        prev ? prev.map(node => ({ ...node, color: newColor })) : null
      );
    }
  }, [themeColors.treeEdges, highlightedTreeNodeData?.length]);

  // Sync highlighted tree node positions when tree geometry changes
  // This ensures glow follows the node when tree scale, offset, or ySpacing changes
  useEffect(() => {
    if (!highlightedTreeNodeData || highlightedTreeNodeData.length === 0) return;
    if (!cachedTreeNodesRef.current?.nodes) return;
    
    const nodeId = highlightedTreeNodeData[0]?.id;
    if (!nodeId) return;
    
    const rafId = requestAnimationFrame(() => {
      const node = cachedTreeNodesRef.current.nodes.find(n => n.id === nodeId);
      if (node) {
        const treeXScale = (effectiveConfig.tree?.xScalePercent || 100) / 100;
        const treeOffsetVal = bounds?.treeOffset || 0;
        const rawY = Number(node.rawY);
        const rawX = Number(node.x);
        if (Number.isFinite(rawY) && Number.isFinite(rawX)) {
          const newPosition = [rawY * treeXScale + treeOffsetVal, rawX];
          setHighlightedTreeNodeData(prev => 
            prev ? prev.map(n => ({ ...n, position: newPosition })) : null
          );
        }
      }
    });
    
    return () => cancelAnimationFrame(rafId);
  }, [effectiveConfig.tree?.xScalePercent, bounds?.treeOffset, effectiveConfig.tree?.ySpacing, highlightedTreeNodeData?.[0]?.id]);

  // Sync highlighted tree leaf positions when tree geometry changes
  // highlightedTreeLeafData is an array: [{id, position, radius, color}]
  useEffect(() => {
    if (!highlightedTreeLeafData || highlightedTreeLeafData.length === 0) return;
    if (!cachedTreeNodesRef.current?.nodes) return;
    
    const leafId = highlightedTreeLeafData[0]?.id;
    if (!leafId) return;
    
    const rafId = requestAnimationFrame(() => {
      // Search by multiple fields since leafId can be id, name, leaf_id, etc.
      const node = cachedTreeNodesRef.current.nodes.find(n => 
        n.id === leafId || 
        n.name === leafId || 
        n.leaf_id === leafId ||
        n.node?.id === leafId ||
        n.node?.name === leafId ||
        n.node?.leaf_id === leafId
      );
      if (node) {
        const treeXScale = (effectiveConfig.tree?.xScalePercent || 100) / 100;
        const treeOffsetVal = bounds?.treeOffset || 0;
        const rawY = Number(node.rawY);
        const rawX = Number(node.x);
        if (Number.isFinite(rawY) && Number.isFinite(rawX)) {
          const newPosition = [rawY * treeXScale + treeOffsetVal, rawX];
          setHighlightedTreeLeafData(prev => 
            prev ? prev.map(leaf => ({ ...leaf, position: newPosition })) : null
          );
        }
      }
    });
    
    return () => cancelAnimationFrame(rafId);
  }, [effectiveConfig.tree?.xScalePercent, bounds?.treeOffset, effectiveConfig.tree?.ySpacing, highlightedTreeLeafData?.[0]?.id]);

  // Helper function to compute gene polygon based on current config
  // This is used by both initial polygon calculation and geometry sync
  // Now accepts optional liveTrackY parameter for when ySpacing changes
  const computeGenePolygon = React.useCallback((geneObj, liveTrackY = null) => {
    if (!geneObj) return null;
    
    const currentGeneHeight = effectiveConfig.gene?.height || effectiveConfig.gene?.geneHeight || 20;
    const currentArrowheadHeight = effectiveConfig.gene?.arrowheadHeight || 10;
    const genomeXScale = (effectiveConfig.genome?.xScalePercent || 100) / 100;
    
    // Get gene data - might be wrapped in gene property or direct
    const gene = geneObj.gene || geneObj;
    
    // Use live trackY if provided (from genomeView.getTrackYByHoodId), otherwise fallback to stored value
    const trackY = liveTrackY ?? geneObj.trackY ?? gene.trackY ?? 0;
    
    // Scale coordinates by genomeXScale
    const start = (geneObj.start ?? gene.start) * genomeXScale;
    const end = (geneObj.end ?? gene.end) * genomeXScale;
    const strand = geneObj.strand ?? gene.strand;
    
    const halfH = currentGeneHeight / 2;
    const arrowH = currentArrowheadHeight / 2;
    const tipWidth = (effectiveConfig.gene?.tipWidthFactor || 0.15) * Math.abs(end - start);
    
    if (strand === '+' || strand === 1) {
      const arrowStart = Math.max(start, end - tipWidth);
      return [
        [start, trackY - halfH],
        [arrowStart, trackY - halfH],
        [arrowStart, trackY - halfH - arrowH],
        [end, trackY],
        [arrowStart, trackY + halfH + arrowH],
        [arrowStart, trackY + halfH],
        [start, trackY + halfH],
      ];
    } else {
      const arrowEnd = Math.min(end, start + tipWidth);
      return [
        [end, trackY - halfH],
        [arrowEnd, trackY - halfH],
        [arrowEnd, trackY - halfH - arrowH],
        [start, trackY],
        [arrowEnd, trackY + halfH + arrowH],
        [arrowEnd, trackY + halfH],
        [end, trackY + halfH],
      ];
    }
  }, [effectiveConfig.gene?.height, effectiveConfig.gene?.geneHeight, effectiveConfig.gene?.arrowheadHeight, effectiveConfig.genome?.xScalePercent, effectiveConfig.gene?.tipWidthFactor]);

  // Initial polygon calculation when highlightedGeneData is set without polygon
  // This runs immediately when a gene is clicked to ensure glow appears
  useEffect(() => {
    if (!highlightedGeneData || highlightedGeneData.length === 0) return;
    
    // Check if polygon is missing - if so, calculate it immediately
    const geneObj = highlightedGeneData[0];
    if (geneObj.polygon && Array.isArray(geneObj.polygon) && geneObj.polygon.length > 0) {
      return; // Already has polygon, no need to compute
    }
    
    const gene = geneObj.gene || geneObj;
    const geneId = geneObj.id || geneObj.uniqueId || geneObj.gene?.uniqueId || geneObj.gene?.id;
    const hoodId = gene.hood_id || geneObj.hood_id;
    
    // Get LIVE trackY from genomeView
    let liveTrackY = null;
    if (genomeView && hoodId && typeof genomeView.getTrackYByHoodId === 'function') {
      liveTrackY = genomeView.getTrackYByHoodId(hoodId);
    }
    if (liveTrackY === null && genomeView && geneId && genomeView.genesById) {
      const liveGene = genomeView.genesById[geneId];
      if (liveGene) {
        liveTrackY = liveGene.trackY;
      }
    }
    
    // Get the gene's fill color (live lookup from geneColorMap)
    const colorFromMap = geneColorMap?.get?.(geneId);
    const newColor = colorFromMap || geneObj.fillColor || geneObj.gene?.fillColor || 
                     themeColors.geneFill || config.gene?.fillColor || [100, 200, 255, 255];
    
    const newPolygon = computeGenePolygon(geneObj, liveTrackY);
    if (newPolygon) {
      setHighlightedGeneData(prev => {
        if (!prev || prev.length === 0) return null;
        return prev.map(g => ({
          ...g,
          polygon: newPolygon,
          fillColor: newColor,
          trackY: liveTrackY ?? g.trackY
        }));
      });
    }
  }, [highlightedGeneData, computeGenePolygon, themeColors.geneFill, config.gene?.fillColor, geneColorMap, genomeView]);

  // Sync highlighted gene data when theme or gene geometry changes
  // Updates color and polygon when geneHeight, arrowheadHeight, genomeXScale, ySpacing, alignmentVersion etc. change
  // Gets LIVE trackY and coordinates from genomeView to follow gene position
  useEffect(() => {
    if (!highlightedGeneData || highlightedGeneData.length === 0) return;
    if (!genomeView) return;
    // Skip if polygon is not yet computed (let the initial effect handle it)
    if (!highlightedGeneData[0]?.polygon) return;
    
    const geneObj = highlightedGeneData[0];
    const geneId = geneObj.id || geneObj.uniqueId || geneObj.gene?.uniqueId || geneObj.gene?.id;
    const gene = geneObj.gene || geneObj;
    
    // Get hood_id to lookup live trackY
    const hoodId = gene.hood_id || geneObj.hood_id;
    
    const rafId = requestAnimationFrame(() => {
      // Get LIVE gene data from genomeView - this updates when ySpacing or alignment changes
      let liveTrackY = null;
      let liveStart = geneObj.start ?? gene.start;
      let liveEnd = geneObj.end ?? gene.end;
      let liveStrand = geneObj.strand ?? gene.strand;
      
      // Try to get fresh gene data from genomeView.genesById
      if (geneId && genomeView.genesById) {
        const liveGene = genomeView.genesById[geneId];
        if (liveGene) {
          liveTrackY = liveGene.trackY;
          liveStart = liveGene.start;
          liveEnd = liveGene.end;
          liveStrand = liveGene.strand;
        }
      }
      
      // Fallback: get trackY from hood
      if (liveTrackY === null && hoodId && typeof genomeView.getTrackYByHoodId === 'function') {
        liveTrackY = genomeView.getTrackYByHoodId(hoodId);
      }
      
      // Get color from color map (live lookup)
      const colorFromMap = geneColorMap?.get?.(geneId);
      const newColor = colorFromMap || geneObj.fillColor || geneObj.gene?.fillColor || 
                       themeColors.geneFill || config.gene?.fillColor || [100, 200, 255, 255];
      
      // Create updated gene object with live coordinates for polygon calculation
      const updatedGeneObj = {
        ...geneObj,
        start: liveStart,
        end: liveEnd,
        strand: liveStrand,
        trackY: liveTrackY ?? geneObj.trackY
      };
      
      // Compute polygon with live data
      const newPolygon = computeGenePolygon(updatedGeneObj, liveTrackY);
      
      if (newPolygon) {
        setHighlightedGeneData(prev => {
          if (!prev || prev.length === 0) return null;
          return prev.map(g => ({
            ...g,
            polygon: newPolygon,
            fillColor: newColor,
            // Update stored coordinates for consistency
            start: liveStart,
            end: liveEnd,
            strand: liveStrand,
            trackY: liveTrackY ?? g.trackY
          }));
        });
      }
    });
    
    return () => cancelAnimationFrame(rafId);
  }, [
    themeColors.geneFill,
    config.gene?.fillColor,
    effectiveConfig.gene?.height,
    effectiveConfig.gene?.geneHeight,
    effectiveConfig.gene?.arrowheadHeight,
    effectiveConfig.genome?.xScalePercent,
    effectiveConfig.gene?.tipWidthFactor,
    // CRITICAL: Listen to ySpacing changes to update trackY
    effectiveConfig.tree?.ySpacing,
    ySpacingProp,
    // CRITICAL: Listen to genomeXScale changes
    genomeXScaleProp,
    // CRITICAL: Listen to alignment changes (flip/reverse)
    alignmentVersion,
    geneColorMap,
    computeGenePolygon,
    genomeView
  ]);

  // 2. Visible leaves set - critical for filtering when a clade is selected
  const visibleLeavesSet = React.useMemo(() => {
    if (!genomeView || !tree) return new Set();
    
    let visibleLeaves = genomeView.leaves || [];
    if (selectedNode) {
      try {
        const leaves = (typeof genomeView.getNodeDescendantLeaves === 'function')
          ? genomeView.getNodeDescendantLeaves(selectedNode)
          : (tree && typeof tree.getNodeDescendantLeaves === 'function'
            ? tree.getNodeDescendantLeaves(selectedNode)
            : []);
        visibleLeaves = Array.isArray(leaves) ? leaves : [];
      } catch (e) {
        visibleLeaves = genomeView.leaves || [];
      }
    }
    
    // If a baseline flash was requested, include its hood
    if (flashHood) {
      const target = typeof flashHood === 'string'
        ? flashHood
        : (flashHood?.id != null ? String(flashHood.id) : null);
      if (target && !new Set(visibleLeaves).has(target)) {
        visibleLeaves = [...visibleLeaves, target];
      }
    }
    
    return new Set(visibleLeaves);
  }, [genomeView, tree, selectedNode, flashHood]);

  // NOTE: bounds and treeOffset are computed earlier in the component (line ~760)
  // using computeBounds(). We use those values here.

  const layers = React.useMemo(() => {
  if (DEBUG_LOGS) {
    console.warn('🔥 LAYERS USEMEMO TRIGGERED - check DevTools Performance tab for what changed');
    console.log('🎨 Theme state:', { resolvedTheme, background: themeColors?.background });
  }
  const layersStartTime = performance.now();
    
    // genomeView is now passed via useMemo dependencies (no longer read from ref here)
    if (!genomeView || !tree) {
      return [];
    }
    
    // NOTE: effectiveConfig is now computed in a separate useMemo above
    // NOTE: visibleLeavesSet is now computed in a separate useMemo above
    // NOTE: bounds/treeOffset are now computed in separate useMemos above
    
    // 🚀 POLYGON UPDATES FOR NON-GENE FEATURES
    // Ensure gene instances reflect the live gene height first so downstream
    // domain/link/region polygon calculations use the updated gene polygons.
    // To avoid recomputing heavy geometry when only the tree X-scale changed,
    // only flash state changed, or only colors changed, compute a lightweight 
    // geometry signature and skip full updates when safe.
    // CRITICAL: Include alignment props directly (defaultAlign, alignCluster, useDefaultGeneAlignment)
    // because alignmentVersion is incremented in an effect that runs AFTER render
    // CRITICAL: Include selectedNode so clicking a tree node properly invalidates caches and
    // rebuilds baselines/genes/links for only the selected subtree
    // NOTE: Use selectedNode?.id (not name) because internal nodes have empty names!
    // NOTE: Include visibleLeavesSet.size to properly invalidate when selection changes
    // NOTE: Include domain.heightFactor so domain polygons update when domain relative height changes
    // NOTE: Include genome.xScalePercent so gene positions update when genomeXScale slider changes
    // Include ySpacing so changing vertical spacing forces a full track recompute
    const geomSignature = `${Object.keys(genomeView.genesById).length}:${effectiveConfig.gene.height}:${effectiveConfig.gene.arrowheadHeight}:${effectiveConfig.domain.heightFactor || 0.6}:${effectiveConfig.genome.xScalePercent}:${effectiveConfig.tree.ySpacing}:${alignmentVersion}:${defaultAlign}:${alignCluster || ''}:${useDefaultGeneAlignment}:${selectedNode?.id ?? 'null'}:${visibleLeavesSet.size}`;
    const signatureMatches = lastGeometrySignatureRef.current === geomSignature;
    const scaleMatches = lastEffectiveTreeXScaleRef.current === effectiveTreeXScale;
    const isFirstRender = lastGeometrySignatureRef.current === null;
    
    // Debug: log signature comparison
    if (DEBUG_LOGS) {
      console.log('🔍 geomSignature check:', {
        current: geomSignature,
        last: lastGeometrySignatureRef.current,
        signatureMatches,
        scaleMatches,
        isFirstRender,
        lastScale: lastEffectiveTreeXScaleRef.current,
        currentScale: effectiveTreeXScale
      });
    }
    
    const onlyTreeScaleChanged = signatureMatches && !scaleMatches;
    // Check if geometry is unchanged (covers flash, color, and other non-geometry changes)
    const geometryUnchanged = signatureMatches && scaleMatches;

    // Always update on first render to ensure genes have correct dimensions
    if ((onlyTreeScaleChanged || geometryUnchanged) && !isFirstRender) {
      // Skip expensive polygon recompute; we only need to update the cached refs
      lastEffectiveTreeXScaleRef.current = effectiveTreeXScale;
      // Minimal work: update genomeView.config so layers that read it will get correct xScale
      genomeView.config = effectiveConfig;
      const skipReason = onlyTreeScaleChanged ? 'tree scale only' : 'geometry unchanged (color/flash/etc)';
      if (DEBUG_LOGS) console.log(`⚡ HoodiniViz: polygonUpdate SKIPPED (${skipReason})`);
    } else {
      const polygonUpdateStart = performance.now();
      if (DEBUG_LOGS && console.time) console.time('layers:polygonUpdate');

      try {
        // First update genomeView config so computeTrackPositions uses new scale
        genomeView.config = effectiveConfig;
        
        // Recalculate all track positions with current offsets and scale
        // NOTE: Alignment (which sets offsets) is applied in useMemo BEFORE this layers memo
        // so offsets are already correct here
        if (typeof genomeView.computeTrackPositions === 'function') {
          if (DEBUG_LOGS) console.log('📐 Recalculating track positions with genomeXScale:', effectiveConfig.genome.xScalePercent);
          genomeView.computeTrackPositions();
        }
        
        // Always update gene polygons with effectiveConfig
        const genesStart = performance.now();
        if (DEBUG_LOGS) console.log('📐 Updating gene polygons with height:', effectiveConfig.gene.height);
        for (const gid in genomeView.genesById) {
          const gg = genomeView.genesById[gid];
          if (!gg) continue;
          gg.config = effectiveConfig;
          gg.geneHeight = effectiveConfig.gene.height;
          // Recompute gene polygon and centerline immediately so children (domains)
          // can rely on up-to-date geometry.
          if (typeof gg.updatePolygon === 'function') {
            try { gg.updatePolygon(); } catch (e) { /* defensive */ }
          }
        }
        if (DEBUG_LOGS) console.log(`  📐 genes updatePolygon: ${(performance.now() - genesStart).toFixed(1)}ms`);
      } catch (e) {}

      // Update ncRNA polygons synchronously
      const ncRNAStart = performance.now();
      for (const uniqueNcId in genomeView.ncRNAsById) {
        const nc = genomeView.ncRNAsById[uniqueNcId];
        nc.config = effectiveConfig;
        // Ensure the instance feature height matches live display config
        if (typeof effectiveConfig?.gene?.height === 'number') nc.featureHeight = effectiveConfig.gene.height;
        if (nc.updatePolygon) nc.updatePolygon();
      }
      if (DEBUG_LOGS) console.log(`  📐 ncRNAs updatePolygon: ${(performance.now() - ncRNAStart).toFixed(1)}ms`);

      // Update domain polygons synchronously (domains clip against gene polygons)
      // NOTE: We iterate over gene.domains directly instead of getAllDomains() cache
      // because the cache holds copies of polygon arrays, not references to the live domain objects
      const domainsStart = performance.now();
      let domainCount = 0;
      for (const gid in genomeView.genesById) {
        const gene = genomeView.genesById[gid];
        if (gene && gene.domains) {
          for (const domain of gene.domains) {
            domain.config = effectiveConfig;
            if (domain.updatePolygon) {
              domain.updatePolygon();
              domainCount++;
            }
          }
        }
      }
      // Invalidate the getAllDomains cache so it rebuilds with updated polygons
      genomeView._cachedAllDomains = undefined;
      if (DEBUG_LOGS) console.log(`  📐 domains updatePolygon: ${(performance.now() - domainsStart).toFixed(1)}ms (${domainCount} domains)`);

      // Update protein links polygons synchronously
      const proteinLinksStart = performance.now();
      if (genomeView.proteinLinks) {
        genomeView.proteinLinks.forEach(link => {
          link.config = effectiveConfig;
          if (link.updatePolygon) link.updatePolygon();
        });
      }
      if (DEBUG_LOGS) console.log(`  📐 proteinLinks updatePolygon: ${(performance.now() - proteinLinksStart).toFixed(1)}ms`);

      // Update nucleotide links polygons synchronously
      const nucleotideLinksStart = performance.now();
      if (genomeView.nucleotideLinks) {
        genomeView.nucleotideLinks.forEach(link => {
          link.config = effectiveConfig;
          if (link.updatePolygon) link.updatePolygon();
        });
      }
      if (DEBUG_LOGS) console.log(`  📐 nucleotideLinks updatePolygon: ${(performance.now() - nucleotideLinksStart).toFixed(1)}ms`);

      // Update region polygons synchronously
      const regionsStart = performance.now();
      genomeView.getAllRegions().forEach(region => {
        region.config = effectiveConfig;
        // Get genes in this region for polygon calculation
        const genesInRegion = Object.values(genomeView.genesById).filter(gene => 
          region.containsGene && region.containsGene(gene)
        );
        const trackY = genomeView.getTrackYByHoodId(region.hood_id);
        if (trackY !== null && trackY !== undefined) {
          region.updatePolygon(genesInRegion, trackY);
        }
      });
      if (DEBUG_LOGS) console.log(`  📐 regions updatePolygon: ${(performance.now() - regionsStart).toFixed(1)}ms`);

      const polygonUpdateTime = performance.now() - polygonUpdateStart;
      if (DEBUG_LOGS) console.log('HoodiniViz: polygonUpdateTime(ms)=', polygonUpdateTime);

      // Update stored geometry signature and tree scale
      lastGeometrySignatureRef.current = geomSignature;
      lastEffectiveTreeXScaleRef.current = effectiveTreeXScale;
      // Invalidate geometry caches when geometry changes
      cachedGeometrySignatureRef.current = null;
    }
  
    // 🚀 PERFORMANCE: Cache bounds, baselines, treeNodes when only colors change
    // Note: bounds/baselines don't depend on colors, but treeNodes does - so we track theme separately
    // NOTE: Use selectedNode?.id (not name) because internal nodes have empty names!
    const geometryCacheKey = `${geomSignature}:${effectiveTreeXScale}:${selectedNode?.id ?? 'null'}:${phyloLabelPosition}:${ultrametric}`;
    const colorCacheKey = `${geometryCacheKey}:${resolvedTheme}:${paletteVersion}`;
    const canUseCachedGeometry = geometryUnchanged && cachedGeometrySignatureRef.current === geometryCacheKey;
    
    // 🚀 PERFORMANCE: Separate cache signatures for components that DON'T depend on gene height/arrowhead
    // baselines and treeNodes only depend on: gene count, alignment, tree scale, selected node, ultrametric
    // CRITICAL: Include alignment props directly (defaultAlign, alignCluster, useDefaultGeneAlignment) 
    // because alignmentVersion is incremented in an effect that runs AFTER render
    // NOTE: Use selectedNode?.id (not name) because internal nodes have empty names!
    // NOTE: Include hiddenHoodSet.size and visibleLeavesSet.size to detect visibility changes
    // NOTE: Include ySpacing and genomeXScale so caches invalidate when these sliders change
    const structuralSignature = `${Object.keys(genomeView.genesById).length}:${alignmentVersion}:${effectiveTreeXScale}:${selectedNode?.id ?? 'null'}:${ultrametric}:${defaultAlign}:${alignCluster || ''}:${useDefaultGeneAlignment}:${hiddenHoodSet.size}:${visibleLeavesSet.size}:${effectiveConfig.tree.ySpacing}:${effectiveConfig.genome.xScalePercent}`;
    const canUseCachedHoods = cachedHoodsRef.current?.signature === structuralSignature;
    const canUseCachedTreeNodesStructure = cachedTreeNodesRef.current?.structuralSignature === structuralSignature;
    
    // Compute bounds and treeOffset for coordinate calculations
    const boundsStart = performance.now();
    // Always compute bounds to avoid stale X limits when sliders change; cost is low (<2ms)
    // Pass visibleLeavesSetForBounds to filter by visible hoods when a node is selected
    const localBounds = computeBounds(genomeView, tree, phyloLabelPosition, effectiveTreeXScale, true, visibleLeavesSetForBounds);
    const treeOffset = localBounds.treeOffset || 0;
    cachedBoundsRef.current = localBounds;
    if (DEBUG_LOGS) console.log(`📊 bounds computed in ${(performance.now() - boundsStart).toFixed(1)}ms`);
    
    // Use pre-filtered and pre-computed data but create fresh copies so
    // DeckGL receives new object identities when underlying geometry changes.
    // 🚀 PERFORMANCE: Reference polygons directly - they were already updated by updatePolygon()
    const linkPolygonsStart = performance.now();
  const proteinPolygons = (filteredProteinPolygons || []).map((p, index) => ({
      // shallow copy metadata
      ...p,
      // Reference polygon directly - it was already updated by proteinLinks.updatePolygon() above
      polygon: p.polygon,
      fillColor: p.fillColor || themeColors.proteinFill || p.fillColor,
      // Add a unique key that changes when alignmentVersion changes to force identity change
      _alignmentKey: `${alignmentVersion}_${index}`
    }));
  const proteinPolygonsEnd = performance.now();

  const nucleotidePolygons = (filteredNucleotidePolygons || []).map((p, index) => ({
      ...p,
      // Reference polygon directly - already updated by nucleotideLinks.updatePolygon()
      polygon: p.polygon,
      fillColor: p.fillColor || themeColors.nucleotideFill || p.fillColor,
      _alignmentKey: `${alignmentVersion}_${index}`
    }));
    const nucleotidePolygonsEnd = performance.now();
    
    // --- OPTIMIZED REGION COLORING ---
    // Respect clade selection for regions as well (filter by hood_id when available)
    const regionPolygons = (genomeView.getAllRegions() || []).filter(r => {
      if (!selectedNode) return true;
      try { return visibleLeavesSet.has(r.hood_id); } catch (e) { return true; }
    }).map(r => {
      // Check if palette color was applied (non-transparent)
      let paletteColor = r.fillColor;
      let finalStrokeColor, finalFillColor;
      
      if (!paletteColor || (Array.isArray(paletteColor) && paletteColor[3] === 0)) {
        // No palette color or transparent default - use fallback for stroke
        finalStrokeColor = r.strokeColor || [100, 100, 100, 255]; // Default gray stroke
        finalFillColor = [0, 0, 0, 0]; // Transparent fill
      } else {
        // Use palette color for stroke, keep fill transparent
        finalStrokeColor = paletteColor;
        finalFillColor = [0, 0, 0, 0]; // Transparent fill
      }
      
      // Convert region to polygon format for rendering
      return { 
        polygon: r.polygon,
        fillColor: finalFillColor,
        strokeColor: finalStrokeColor,
        strokeWidth: r.strokeWidth,
        metadata: r.metadata
      };
    });
    const regionPolygonsEnd = performance.now();
    if (DEBUG_LOGS) console.log(`📊 linkPolygons+regions built in ${(performance.now() - linkPolygonsStart).toFixed(1)}ms (protein: ${(proteinPolygonsEnd - linkPolygonsStart).toFixed(1)}ms, nucleotide: ${(nucleotidePolygonsEnd - proteinPolygonsEnd).toFixed(1)}ms, regions: ${(regionPolygonsEnd - nucleotidePolygonsEnd).toFixed(1)}ms)`);
    
    // --- GENE EXTRACTION MOVED AFTER COLORING ---
    // Genes will be extracted after pre-filtering section applies colors

    // --- OPTIMIZED DOMAIN COLORING ---
    const domainsStart = performance.now();
    
    // 🚀 PERFORMANCE: Early exit if no domains exist
    const allDomains = genomeView.getAllDomains();
    let domains = [];
    
    if (allDomains.length === 0) {
      if (DEBUG_LOGS) console.log(`📊 domains built in ${(performance.now() - domainsStart).toFixed(1)}ms (0 domains - skipped)`);
    } else {
    // Domain rendering: filter by selected node (clade) first, then by source
    let renderedDomains = allDomains;
    if (selectedNode) {
      try {
        const fd = genomeView.filterBySelectedNode(selectedNode);
        if (fd && Array.isArray(fd.domains)) renderedDomains = fd.domains;
      } catch (e) {
        // ignore and use full set
      }
    }
    if (domainSource && domainSource !== 'all') {
      renderedDomains = renderedDomains.filter(d => {
        const s = (d && (d.source || (d.metadata && d.metadata.source))) || null;
        return String(s) === String(domainSource);
      });
    }

    domains = renderedDomains.map(d => {
      // If the domain palette is disabled, ignore any stored domain.fillColor
      // so rendering falls back to theme defaults. When enabled, prefer the
      // stored model fillColor (set by GenomeView.applyDomainPalette) unless
      // overridden by the live domainColorMap mapping.
      let fillColor;
      if (!effectiveDomainPalette || !effectiveDomainPalette.enabled) {
        fillColor = themeColors.domainFill;
      } else {
        fillColor = d.fillColor || themeColors.domainFill;
      }

      if (domainColorMap) {
        const key = (domainColorBy === 'domainName') ? d.domainName : extractDomainField(d, domainColorBy);
        // Only override if mapping provides a valid color; otherwise keep model color.
        if (key !== undefined) {
          const mapped = getColorFromMap(domainColorMap, key, effectiveDomainPalette?.type);
          if (mapped) fillColor = mapped;
        }
      }

      // Create new polygon reference so DeckGL detects the geometry change
      // when gene height or arrowheadHeight changes
      return { ...d, fillColor, polygon: d.polygon ? [...d.polygon] : null };
    });
    if (DEBUG_LOGS) console.log(`📊 domains built in ${(performance.now() - domainsStart).toFixed(1)}ms (${domains.length} domains)`);
    } // End of domains processing block

    // Phylo tree paths (shifted)
    // Create baselines per hood (needed for phylo label positioning)  
    const hoodsStart = performance.now();
    
    // 🚀 PERFORMANCE: Reuse cached baselines - baselines DON'T depend on gene height/arrowhead
    let nucleotideHoods;
    if (DEBUG_LOGS) {
      console.log(`🔍 [baselines] canUseCachedHoods=${canUseCachedHoods}`);
      console.log(`🔍 [baselines] structuralSignature=${structuralSignature}`);
      console.log(`🔍 [baselines] cachedSignature=${cachedHoodsRef.current?.signature}`);
      console.log(`🔍 [baselines] selectedNode=${selectedNode?.name || 'null'}, visibleLeavesSet.size=${visibleLeavesSet.size}`);
      console.log(`🔍 [baselines] geometryUnchanged=${geometryUnchanged}`);
    }
    if (canUseCachedHoods) {
      nucleotideHoods = cachedHoodsRef.current.data;
      if (DEBUG_LOGS) console.log(`⚡ hoods reused from cache (${nucleotideHoods.length} hoods)`);
    } else {
      // Use `visibleLeaves` so baselines for non-selected leaves disappear.
      const buildBaseline = (hood_id) => {
        const hoodBaseline = genomeView.hoodRanges[hood_id];
        const seqid = genomeView.hoodToSeqidMap[hood_id];
        const nuc = genomeView.nucleotidesBySeqid[seqid];
      if (!hoodBaseline || !nuc) return null;

      const offset = genomeView.trackOffset[hood_id] || 0;  
      const flipped = !!genomeView.trackFlipped[hood_id];

      const anchor = hoodBaseline.length / 2; // Center of hood
      const hoodStart = 0;
      const hoodEnd = hoodBaseline.length;

      const transformedStart = genomeView.constructor.getTransformedXUnified(hoodStart, anchor, offset, flipped);
      const transformedEnd = genomeView.constructor.getTransformedXUnified(hoodEnd, anchor, offset, flipped);

      const genomeXScale = (effectiveConfig.genome && typeof effectiveConfig.genome.xScalePercent === 'number') ? effectiveConfig.genome.xScalePercent / 100 : 1;
      const scaledStart = anchor + (transformedStart - anchor) * genomeXScale;
      const scaledEnd = anchor + (transformedEnd - anchor) * genomeXScale;

      const trackY = genomeView.getTrackYByHoodId(hood_id);
      if (trackY == null) return null;

      return {
        hood_id,
        seqid,
        start: scaledStart,
        end: scaledEnd,
        trackY
      };
    };

    // Derive baselines from the currently visible leaves; fallback to all when nothing is selected
    const allHoods = Object.keys(genomeView.hoodRanges || {});
    let visibleHoodIds = selectedNode ? Array.from(visibleLeavesSet) : allHoods;
    // If a clade selection produced an empty set (or no tracks resolved), fall back to all
    if (!visibleHoodIds.length) visibleHoodIds = allHoods;
    nucleotideHoods = visibleHoodIds
      .filter(hood_id => {
        const hoodBaseline = genomeView.hoodRanges[hood_id];
        if (!hoodBaseline) return false;
        if (hiddenHoodSet.size) {
          const key = getHoodKey(hood_id, hoodBaseline);
          if (key && hiddenHoodSet.has(key)) return false;
        }
        return genomeView.getTrackYByHoodId(hood_id) != null;
      })
      .map(buildBaseline)
      .filter(Boolean);

    // If track positions weren’t ready, recompute once to recover
    if (!nucleotideHoods.length && visibleHoodIds.length) {
      try { genomeView.computeTrackPositions(); } catch (e) {}
      nucleotideHoods = visibleHoodIds
        .filter(hood_id => {
          const hoodBaseline = genomeView.hoodRanges[hood_id];
          if (!hoodBaseline) return false;
          if (hiddenHoodSet.size) {
            const key = getHoodKey(hood_id, hoodBaseline);
            if (key && hiddenHoodSet.has(key)) return false;
          }
          return genomeView.getTrackYByHoodId(hood_id) != null;
        })
        .map(buildBaseline)
        .filter(Boolean);
    }
      // Cache with structural signature (doesn't include gene height/arrowhead)
      cachedHoodsRef.current = { data: nucleotideHoods, signature: structuralSignature };
      if (DEBUG_LOGS) console.log(`📊 hoods built in ${(performance.now() - hoodsStart).toFixed(1)}ms (${nucleotideHoods.length} hoods)`);
    }

    // Use edges with metadata for tooltips - use current tree, not baseTree from genomeView
    // Get raw tree edges for direct computation in PathLayer
    // When a clade is selected, only include edges that are part of that
    // subtree so non-descendant tree parts are not shown.
    const treeEdgesStart = performance.now();
    const treeEdges = hasNewick
      ? tree.buildEdges()
        .filter(edge => {
          if (!selectedNode) return true;
          try {
            // Consider an edge part of the selected subtree if the edge's
            // target node's descendant leaves are all within the selected set.
            const targetLeaves = genomeView.getNodeDescendantLeaves(edge.target) || [];
            if (!Array.isArray(targetLeaves) || targetLeaves.length === 0) return false;
            return targetLeaves.every(l => visibleLeavesSet.has(l));
          } catch (e) {
            return false;
          }
        })
        .map(edge => ({
          rawPath: edge.path, // Keep original coordinates for direct computation
          metadata: {
            source: edge.source.name || `internal_${edge.source.id}`,
            target: edge.target.name || `internal_${edge.target.id}`,
            length: edge.target.branchLength || 0,
            type: 'phylo_edge'
          },
          color: themeColors?.treeEdges || config.tree.edgeColor || [85,85,85,255] // Use current themeColors directly
        }))
      : [];
    if (DEBUG_LOGS) console.log(`📊 treeEdges built in ${(performance.now() - treeEdgesStart).toFixed(1)}ms (${treeEdges.length} edges)`);

    // Phylo labels - prepare raw data for direct computation in TextLayer
    const phyloLabelsStart = performance.now();
    const effectivePhyloLabelPosition = phyloLabelPosition || config.tree?.phyloLabelPosition || 'after-tree';
    const effectiveAlignLabels = alignLabels !== undefined ? alignLabels : (config.tree?.alignLabels !== undefined ? config.tree.alignLabels : true);
    let phyloLabels = [];
    let phyloColorSignature = '';
    if (hasNewick) {
      
      // Only include leaf labels that are part of the selected clade when active
      let rawPhyloLabels = tree.leafNodes
        .filter(l => !selectedNode || visibleLeavesSet.has(l.name))
        .map(l => {
        const meta = (typeof getMetaForLeaf === 'function') ? getMetaForLeaf(l.name) : (treeMetadata?.[l.name] || {});
        let label = meta[treeLabelBy];
        if (label === undefined || label === null) label = l.name;
        if (typeof label !== 'string') label = String(label);
        let color;
        if (effectivePhyloPalette && effectivePhyloPalette.enabled) {
          // Use colorBy value for coloring if palette is enabled - only if value exists
          const colorValue = meta[treeColorBy];
          if (colorValue !== null && colorValue !== undefined) {
            color = hashToColor(colorValue);
          } else {
            // Fall back to theme-aware phylo label color
            color = themeColors.phyloLabelFill || [0,0,0,255];
          }
        } else {
          // Always use default color from theme if no palette
          color = themeColors.phyloLabelFill || [0,0,0,255];
        }
        
        // Store raw coordinates and metadata for direct computation in TextLayer
        return {
          rawY: l.y, // Original tree Y coordinate (before scaling/offset)
          x: l.x,    // Tree X coordinate
          text: label,
          color,
          size: effectiveConfig.text.phyloLabelSize,
          textAnchor: 'start',
          alignmentBaseline: 'center',
          leafNode: l,
          labelPosition: effectivePhyloLabelPosition, // Store position mode
          rightmostX: effectivePhyloLabelPosition === 'after-tracks' ? rightmostPositionsByLeaf.get(l.name) : null
        };
      });

      // Helper: parse color from string "R,G,B,A" or "R,G,B" or array
      const parseColorValue = (val) => {
        if (!val) return null;
        if (Array.isArray(val)) return val.length >= 3 ? val : null;
        if (typeof val === 'string') {
          const parts = val.split(',').map(n => parseInt(n.trim(), 10)).filter(v => !isNaN(v));
          if (parts.length >= 3) {
            return parts.length === 3 ? [...parts, 255] : parts.slice(0, 4);
          }
        }
        return null;
      };

      // Apply palette to phylo labels if enabled
      let finalPhyloLabels;
      if (effectivePhyloPalette && effectivePhyloPalette.enabled && treeMetadata) {
        // Pass stableTreeColorMap when useStableTreeColors is enabled
        const stableMap = useStableTreeColors ? stableTreeColorMap : null;
        finalPhyloLabels = applyPhyloPalette(rawPhyloLabels, treeColorBy, treeMetadata, effectivePhyloPalette, stableMap).map(lbl => {
          // HIGHEST PRIORITY: Custom phyloColors map (user-provided prop)
          if (normalizedPhyloColors) {
            const customColor = normalizedPhyloColors.get(lbl.leafNode.name);
            if (customColor) return { ...lbl, color: customColor };
          }
          // SECOND PRIORITY: Color from treeMetadata "color" column
          const meta = getMetaForLeaf(lbl.leafNode.name);
          if (meta?.color) {
            const parsedColor = parseColorValue(meta.color);
            if (parsedColor) return { ...lbl, color: parsedColor };
          }
          // Ensure fallback to themeColors.geneFill for labels without valid metadata
          const colorValue = treeMetadata?.[lbl.leafNode.name]?.[treeColorBy];
          return colorValue !== null && colorValue !== undefined && colorValue !== ''
            ? lbl
            : { ...lbl, color: themeColors.phyloLabelFill };
        });
      } else {
        finalPhyloLabels = rawPhyloLabels.map(lbl => {
          // HIGHEST PRIORITY: Custom phyloColors map (user-provided prop)
          if (normalizedPhyloColors) {
            const customColor = normalizedPhyloColors.get(lbl.leafNode.name);
            if (customColor) return { ...lbl, color: customColor };
          }
          // SECOND PRIORITY: Color from treeMetadata "color" column
          const meta = getMetaForLeaf(lbl.leafNode.name);
          if (meta?.color) {
            const parsedColor = parseColorValue(meta.color);
            if (parsedColor) return { ...lbl, color: parsedColor };
          }
          return { ...lbl, color: themeColors.phyloLabelFill };
        });
      }

      // Only keep valid ones
      phyloLabels = finalPhyloLabels.filter(lbl => {
        const valid = Number.isFinite(lbl.rawY) && Number.isFinite(lbl.x) && typeof lbl.text === 'string' && lbl.text.trim() !== '';
        return valid;
      });
      // If array is empty, add a dummy label (not rendered)
      if (phyloLabels.length === 0) {
        phyloLabels.push({rawY: 0, x: 0, text: '_', color: [0,0,0,0], size: 1, textAnchor: 'start'});
      }
    // Compact signature of assigned colors to force DeckGL updateTriggers when colors change
    phyloColorSignature = phyloLabels.map(d => Array.isArray(d.color) ? d.color.join(',') : String(d.color)).join('|');
      if (DEBUG_LOGS) console.log(`📊 phyloLabels built in ${(performance.now() - phyloLabelsStart).toFixed(1)}ms (${phyloLabels.length} labels)`);
    }

    // Node points - prepare raw node data for direct computation in ScatterplotLayer
    const treeNodesStart = performance.now();
    const nodeRadius = config?.tree?.nodeRadius || { internal: 4, leaf: 2 };
    
    // 🚀 PERFORMANCE: Cache treeNodes - treeNodes DON'T depend on gene height/arrowhead
    // They only depend on tree structure, selection, node radius, ultrametric mode, and ySpacing
    // NOTE: Include effectiveConfig.tree.ySpacing so cache invalidates when ySpacing slider changes
    let treeNodesGeometrySignature = `${tree.allNodes.length}:${selectedNode?.id || 'null'}:${nodeRadius?.internal || 4}:${nodeRadius?.leaf || 2}:${ultrametric}:${effectiveConfig.tree.ySpacing}`;
    // Use structural signature (no gene height) OR geometry signature match
    const canUseCachedTreeNodes = hasNewick && (canUseCachedTreeNodesStructure || canUseCachedGeometry) && 
                                   cachedTreeNodesRef.current && 
                                   cachedTreeNodesRef.current.geometrySignature === treeNodesGeometrySignature;
    
    let treeNodes;
    if (!hasNewick) {
      treeNodes = [];
      treeNodesGeometrySignature = 'no-tree';
    } else if (canUseCachedTreeNodes) {
      // Reuse cached geometry, only update colors
      const leafNameToColorMap = new Map();
      if (phyloLabels && Array.isArray(phyloLabels)) {
        phyloLabels.forEach(label => {
          if (label.leafNode && label.leafNode.name) {
            leafNameToColorMap.set(label.leafNode.name, label.color);
          }
        });
      }
      
      treeNodes = cachedTreeNodesRef.current.nodes.map(cachedNode => {
        // Recompute color based on new palette
        let color;
        const n = cachedNode.node;
        if (n.branchset.length > 0) {
          // Internal node: use theme tree edge color
          color = themeColors.treeEdges || [0, 0, 0, 255];
        } else {
          // Leaf: use the same color as corresponding phylo label
          const leafColor = leafNameToColorMap.get(n.name);
          color = leafColor || themeColors.treeEdges || [100, 100, 100, 255];
        }
        return { ...cachedNode, color };
      });
      // Update the cached nodes ref with new colors (for glow layer color lookup)
      cachedTreeNodesRef.current = {
        ...cachedTreeNodesRef.current,
        nodes: treeNodes
      };
      console.log(`⚡ treeNodes reused from cache, colors updated in ${(performance.now() - treeNodesStart).toFixed(1)}ms (${treeNodes.length} nodes)`);
    } else {
      // Full rebuild required
    const highlightLeaves = selectedNode ? new Set(genomeView.getNodeDescendantLeaves(selectedNode)) : null;
    
    // Create a mapping from leaf names to their phylo label colors
    const leafNameToColorMap = new Map();
    if (phyloLabels && Array.isArray(phyloLabels)) {
      phyloLabels.forEach(label => {
        if (label.leafNode && label.leafNode.name) {
          leafNameToColorMap.set(label.leafNode.name, label.color);
        }
      });
    }
    
    // Only include tree nodes that are under the selected node when a
    // selection exists. This removes ancestors and unrelated nodes.
    treeNodes = tree.allNodes
      .filter(n => {
        if (!selectedNode) return true;
        try {
          const nodeLeaves = genomeView.getNodeDescendantLeaves(n) || [];
          if (nodeLeaves.length === 0) return false;
          // node is under selectedNode if all its leaves are contained in the selected set
          return nodeLeaves.every(l => highlightLeaves.has(l));
        } catch (e) { return false; }
      })
      .map(n => {
      const nodeLeaves = genomeView.getNodeDescendantLeaves(n);
      const isDesc = !selectedNode || nodeLeaves.some(l => highlightLeaves.has(l));
      let color;
      const meta = n.metadata || getMetaForLeaf(n.name) || {};
      const leafId = meta.leaf_id || n.leaf_id;
      if (!n.leaf_id && leafId) n.leaf_id = leafId;
      if (!n.metadata && Object.keys(meta).length) n.metadata = meta;
      if (n.branchset.length > 0) {
        // Internal node: use theme-aware tree/node color
        color = themeColors.treeEdges || [0, 0, 0, 255];
      } else {
        // Leaf: use the same color as the corresponding phylo label
        const leafColor = leafNameToColorMap.get(n.name);
        if (leafColor) {
          color = leafColor;
        } else {
          // Fallback: color by metadata using same logic as phylo labels
          const meta = n.metadata || {};
          const colorValue = meta[treeColorBy];
          if (colorValue && effectivePhyloPalette && effectivePhyloPalette.enabled) {
            // Use palette-based color to match phylo labels
            try {
              const uniqueValues = [...new Set(tree.leafNodes.map(leaf => {
                const m = (treeMetadata && treeMetadata[leaf.name]) || {};
                const val = m[treeColorBy];
                return (val !== null && val !== undefined && val !== '') ? val : null;
              }).filter(v => v !== null))];
              const sortedValues = uniqueValues.sort();
              const valueIndex = sortedValues.indexOf(colorValue);
              if (valueIndex >= 0) {
                const paletteColors = memoGetPalette(
                  effectivePhyloPalette.name,
                  Math.max(sortedValues.length, effectivePhyloPalette.numColors || sortedValues.length),
                  effectivePhyloPalette.reverse || false
                );
                if (paletteColors && paletteColors[valueIndex]) {
                  color = paletteColors[valueIndex];
                } else {
                  color = themeColors.treeEdges || [100, 100, 100, 255];
                }
              } else {
                color = themeColors.treeEdges || [100, 100, 100, 255];
              }
            } catch (e) {
              // Fallback to hash-based color
              const str = String(colorValue);
              let hash = 0;
              for (let i = 0; i < str.length; ++i) hash = str.charCodeAt(i) + ((hash << 5) - hash);
              const r = (hash >> 0) & 0xFF;
              const g = (hash >> 8) & 0xFF;
              const b = (hash >> 16) & 0xFF;
              color = [Math.abs(r), Math.abs(g), Math.abs(b), 255];
            }
          } else {
            // Fallback leaf color uses theme tree edge color for consistency
            color = themeColors.treeEdges || [100, 100, 100, 255];
          }
        }
      }
  // When nodes outside the selected subtree are filtered above they won't
  // be present here; keep normal color for included nodes.
      // Compute node radius; enlarge if this internal node is the selected one
      const isInternalNode = Array.isArray(n.branchset) && n.branchset.length > 0;
      const baseRadius = isInternalNode ? (nodeRadius.internal || 4) : (nodeRadius.leaf || 2);
      const isSelectedInternal = selectedNode && selectedNode.id === n.id && isInternalNode;
      const computedRadius = isSelectedInternal ? Math.max(baseRadius * 2, baseRadius + 8) : baseRadius;

      return {
        id: n.id,
        name: n.name,
        leaf_id: leafId,
        node: n,
        rawY: n.y, // Keep original coordinates for direct computation
        x: n.x,
        color: color,
        radius: computedRadius,
        metadata: {
          ...meta,
          name: n.name,
          id: n.id,
          leaf_id: leafId || meta.leaf_id || n.leaf_id
        }
      };
    });
    
    // Cache the treeNodes for future updates (including when only gene height changes)
    cachedTreeNodesRef.current = {
      nodes: treeNodes,
      geometrySignature: treeNodesGeometrySignature,
      structuralSignature: structuralSignature
    };
    if (DEBUG_LOGS) console.log(`📊 treeNodes built in ${(performance.now() - treeNodesStart).toFixed(1)}ms (${treeNodes.length} nodes)`);
    } // End of full rebuild block

    // Helper function to adjust gene edge color based on theme
  function getGeneEdgeColor(gene) {
      const ensureRgba = (col) => {
        if (Array.isArray(col)) return col.length === 3 ? [col[0], col[1], col[2], 255] : col;
        if (typeof col === 'string') {
          const parts = col.split(',').map(n => parseInt(n.trim(), 10)).filter(v => !isNaN(v));
          if (parts.length === 3) return [parts[0], parts[1], parts[2], 255];
          if (parts.length >= 4) return [parts[0], parts[1], parts[2], parts[3]];
        }
        return Array.isArray(themeColors.geneFill) ? themeColors.geneFill : [150,150,150,255];
      };
      // Resolve live from palette if available. When a palette for a non-cluster
      // metadata field is active, prefer the mapped palette color over any
      // stored per-gene fillColor (which may come from previous cluster palettes).
      let col = null;
      const primaryField = geneColorBy || colorBy || 'cluster';
      if (geneColorMap) {
        let key = gene?.metadata?.[primaryField];
        if (key === null || key === undefined || key === '') {
          if (primaryField === 'cluster') {
            key = gene?.metadata?.clusterId ?? gene?.metadata?.cluster_id ?? gene?.cluster;
          }
        }
        if (key !== null && key !== undefined && key !== '') {
          col = getColorFromMap(geneColorMap, key, effectiveGenePalette?.type) || null;
        }
      }

      let fill;
      if (geneColorMap && primaryField !== 'cluster') {
        // Palette for a non-cluster field is active: ignore stored gene.fillColor
        fill = ensureRgba(col || effectiveConfig.gene.fillColor);
      } else {
        fill = ensureRgba(col || gene.fillColor || effectiveConfig.gene.fillColor);
      }
      const isLightTheme = themeColors.background === '#ffffff';
      const factor = isLightTheme ? 0.7 : 1.3;
      return [
        Math.max(0, Math.min(255, Math.floor(fill[0] * factor))),
        Math.max(0, Math.min(255, Math.floor(fill[1] * factor))),
        Math.max(0, Math.min(255, Math.floor(fill[2] * factor))),
        fill[3] ?? 255
      ];
  }
    
    // Build a fresh, plain-data view of genes from the authoritative GenomeView
    // This ensures DeckGL accessors read current numeric fields (start/end/trackY)
    // even if the GenomeView mutates objects in-place.
    // 🚀 PERFORMANCE OPTIMIZATION: Reuse cached genesData when only colors changed
    // NOTE: Use selectedNode?.id (not name) because internal nodes have empty names!
    // NOTE: Include visibleLeavesSet.size to properly invalidate when selection changes
    const genesDataSignature = `${Object.keys(genomeView.genesById).length}:${effectiveConfig.gene.height}:${selectedNode?.id ?? 'null'}:${alignmentVersion}:${visibleLeavesSet.size}`;
    const genesDataStartTime = performance.now();
    
    if (DEBUG_LOGS) console.log('🔍 [genesData] geometryUnchanged=', geometryUnchanged, 'genesDataSignature=', genesDataSignature, 'cached=', cachedGenesDataSignatureRef.current);
    
    const genesData = (() => {
      // Check if we can reuse cached geometry and just update colors
      if (geometryUnchanged && cachedGenesDataRef.current && cachedGenesDataSignatureRef.current === genesDataSignature) {
        if (DEBUG_LOGS) console.log('⚡ genesData: reusing cached geometry, updating colors only');
        // Just update fillColors in place using geneColorMapMemo
        cachedGenesDataRef.current.forEach(geneData => {
          const customColor = geneColorMapMemo.get(geneData.uniqueId);
          geneData.fillColor = customColor || geneData._originalFillColor || themeColors.geneFill;
        });
        return cachedGenesDataRef.current;
      }
      
      // Full rebuild needed - geometry or structure changed
      if (DEBUG_LOGS) console.log('🔨 genesData: full rebuild (geometry changed)');
      
      // Start from all genes, but when a clade is selected filter to visible leaves
      let entries = Object.entries(genomeView.genesById);
      if (selectedNode) {
        try {
          entries = entries.filter(([uid, g]) => {
            const hood = g.hood_id || genomeView.getHoodIdFromSeqid(g.seqid);
            return hood ? visibleLeavesSet.has(hood) : false;
          });
        } catch (e) {
          // on error fall back to full set
          entries = Object.entries(genomeView.genesById);
        }
      }

      return entries.map(([uniqueId, g]) => {
      // Use geneColorMapMemo which includes custom colors (geneColors prop) and metadata color column
      // Priority: geneColorMapMemo > geneColorMap > gene.fillColor > themeColors.geneFill
      const customColor = geneColorMapMemo.get(uniqueId);
      const finalFill = customColor || g.fillColor || themeColors.geneFill;
      
      return {
  type: 'gene',
        id: g.id || uniqueId,
        uniqueId,
        start: g.start,
        end: g.end,
        trackY: g.trackY,
        strand: g.strand,
        fillColor: finalFill,
        _originalFillColor: g.fillColor, // Cache original for color-only updates
        geneHeight: g.geneHeight || effectiveConfig.gene.height,
        config: g.config || effectiveConfig,
        // 🚀 PERFORMANCE: Reference polygon directly instead of deep copying
        // The polygon was already updated by updatePolygon() above
        polygon: g.polygon,
        metadata: g.metadata
      };
      });
    })();
    
    // Cache the genesData for future color-only updates
    cachedGenesDataRef.current = genesData;
    cachedGenesDataSignatureRef.current = genesDataSignature;
    const genesDataTime = performance.now() - genesDataStartTime;
    if (DEBUG_LOGS) console.log(`📊 genesData built in ${genesDataTime.toFixed(1)}ms (${genesData.length} genes)`);

    // Gene cluster labels (below genes) — build from fresh gene data
  const geneLabels = buildGeneLabels(genesData, geneColorMap, geneColorBy, colorBy, themeColors, effectiveConfig || config, geneLabelPosition);

    // Debug: log gene label sizing/positions to help diagnose why labels might appear static
    try {
      if (typeof console !== 'undefined' && console.debug) {
        console.debug('[HoodiniViz] geneLabels sample:', {
          geneHeight: geneHeight,
          effectiveGeneHeight: effectiveConfig && effectiveConfig.gene ? effectiveConfig.gene.height : null,
          sample: (geneLabels && geneLabels.length) ? geneLabels.slice(0, 6) : []
        });
      }
    } catch (e) {}

    // Compact signature of gene shape-affecting params to force DeckGL updateTriggers
    const genesShapeSignature = genesData.map(g => {
      const gh = (g.geneHeight !== undefined && g.geneHeight !== null) ? g.geneHeight : (effectiveConfig && effectiveConfig.gene ? effectiveConfig.gene.height : 0);
      const ah = (g.config && g.config.gene && g.config.gene.arrowheadHeight) ? g.config.gene.arrowheadHeight : (effectiveConfig && effectiveConfig.gene ? effectiveConfig.gene.arrowheadHeight : 0);
      return `${g.uniqueId || ''}:${gh}:${ah}`;
    }).join('|');

    // Helper: build segmented centerline paths for gradient approximation
    const SEGMENT_COUNT = 8;
    const clamp = (v, a = 0, b = 255) => Math.max(a, Math.min(b, v));
    const adjustBrightness = (col, factor) => {
      return [
        clamp(Math.round(col[0] * factor)),
        clamp(Math.round(col[1] * factor)),
        clamp(Math.round(col[2] * factor)),
        col[3] !== undefined ? clamp(Math.round(col[3])) : 255
      ];
    };

    const lerpColor = (c0, c1, t) => {
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * t),
        Math.round(c0[1] + (c1[1] - c0[1]) * t),
        Math.round(c0[2] + (c1[2] - c0[2]) * t),
        Math.round(( (c0[3] || 255) + ((c1[3] || 255) - (c0[3] || 255)) * t ))
      ];
    };

    const buildSegmentedPathsFromPolygons = (polygons, linkConfig) => {
      if (!polygons || polygons.length === 0) return [];
      if (!linkConfig) return [];

      // Only build gradients when colorBy requests identity_gradient and palette enabled
      if (!(linkConfig.colorBy === 'identity_gradient' && linkConfig.palette && linkConfig.palette.enabled)) {
        return [];
      }

      let palette = [];
      try {
        palette = memoGetPalette(linkConfig.palette.name, linkConfig.palette.numColors || 8, linkConfig.palette.reverse || false);
      } catch (e) {
        palette = [];
      }

      const out = [];
      for (const p of polygons) {
        const ring = p.polygon || [];
        if (!ring || ring.length < 4) continue;

        // quick centerline: pair first half with second half
        const half = Math.floor(ring.length / 2);
        const center = [];
        for (let i = 0; i < half; i++) {
          const a = ring[i];
          const b = ring[i + half] || ring[ring.length - 1];
          center.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
        }
        if (center.length < 2) continue;

        // Determine palette color based on similarity if available
        const sim = (p.metadata && typeof p.metadata.similarity === 'number') ? p.metadata.similarity : 0;
        const idx = palette.length > 0 ? Math.floor(Math.max(0, Math.min(1, sim / 100)) * (palette.length - 1)) : 0;
        const paletteColor = palette.length > 0 ? palette[idx] : (p.fillColor || [150,150,150,255]);

        // Create a slight contrast between ends for visible gradient
        const startColor = adjustBrightness(paletteColor.slice(0,4), 0.9);
        const endColor = adjustBrightness(paletteColor.slice(0,4), 1.1);

        const N = Math.max(2, SEGMENT_COUNT);
        for (let s = 0; s < N - 1; s++) {
          const t0 = s / (N - 1);
          const t1 = (s + 1) / (N - 1);
          // simple interpolation along center polyline
          const interp = (t) => {
            const f = t * (center.length - 1);
            const i = Math.floor(f);
            const a = center[i];
            const b = center[Math.min(center.length - 1, i + 1)];
            const local = f - i;
            return [a[0] + (b[0] - a[0]) * local, a[1] + (b[1] - a[1]) * local];
          };
          const p0 = interp(t0);
          const p1 = interp(t1);
          const c0 = lerpColor(startColor, endColor, t0);
          const c1 = lerpColor(startColor, endColor, t1);
          const avg = lerpColor(c0, c1, 0.5);
          out.push({ path: [p0, p1], color: avg, width: Math.max(1, (linkConfig.strokeWidth || 2)) });
        }
      }
      return out;

    };

    const proteinSegmentedPaths = buildSegmentedPathsFromPolygons(proteinPolygons, proteinLinkConfig);
    const nucleotideSegmentedPaths = buildSegmentedPathsFromPolygons(nucleotidePolygons, nucleotideLinkConfig);
    const nucleotideLinkData = (genomeView.nucleotideLinks || []).map((l, i) => {
      let fill = l.fillColor || themeColors.nucleotideFill;
      try {
        const gA = genomeView.genesById && genomeView.genesById[l.gAId];
        const gB = genomeView.genesById && genomeView.genesById[l.gBId];
        const primaryField = geneColorBy || colorBy || 'cluster';
        const candidate = (gA && geneColorMap?.get(gA.metadata?.[primaryField])) || (gB && geneColorMap?.get(gB.metadata?.[primaryField]));
        if (candidate) fill = candidate;
      } catch (e) {}
      return {
        hoodA: l.hoodA,
        hoodB: l.hoodB,
        hoodStartA: l.hoodStartA,
        hoodEndA: l.hoodEndA,
        hoodStartB: l.hoodStartB,
        hoodEndB: l.hoodEndB,
        seqidA: l.seqidA,
        seqidB: l.seqidB,
        fillColor: fill,
        metadata: l.metadata,
        _k: `${alignmentVersion}_${i}`
      };
    }).filter(d => d.hoodA && d.hoodB);

    // Build lightweight link data for live polygon computation in the layer accessor
    const proteinLinkData = (proteinPolygons || []).map((p, i) => {
      let fill = p.fillColor || themeColors.proteinFill || [200,200,200,255];
      try {
        const gA = genomeView.genesById && genomeView.genesById[p?.metadata?.gAId];
        const gB = genomeView.genesById && genomeView.genesById[p?.metadata?.gBId];
        const primaryField = geneColorBy || colorBy || 'cluster';
        const candidate = (gA && geneColorMap?.get(gA.metadata?.[primaryField])) || (gB && geneColorMap?.get(gB.metadata?.[primaryField]));
        if (candidate) fill = candidate;
      } catch (e) {}
      return {
        gAId: p?.metadata?.gAId,
        gBId: p?.metadata?.gBId,
        fillColor: fill,
        metadata: p.metadata,
        _k: `${alignmentVersion}_${i}`
      };
    }).filter(d => d.gAId && d.gBId);

    // Helper functions to compute protein link polygons from current gene coords
    const bezierCurve = (p0, p1, p2, p3, segments = 20) => {
      const pts = [];
      for (let t = 0; t <= 1; t += 1 / segments) {
        const x = Math.pow(1 - t, 3) * p0[0] + 3 * Math.pow(1 - t, 2) * t * p1[0] + 3 * (1 - t) * t * t * p2[0] + t * t * t * p3[0];
        const y = Math.pow(1 - t, 3) * p0[1] + 3 * Math.pow(1 - t, 2) * t * p1[1] + 3 * (1 - t) * t * t * p2[1] + t * t * t * p3[1];
        pts.push([x, y]);
      }
      return pts;
    };

    const buildProteinPolygonFromGenes = (gA, gB) => {
      if (!gA || !gB) return [];
      const aLeftX = Math.min(gA.start, gA.end);
      const aRightX = Math.max(gA.start, gA.end);
      const bLeftX = Math.min(gB.start, gB.end);
      const bRightX = Math.max(gB.start, gB.end);
      const yA = gA.trackY;
      const yB = gB.trackY;
      let top, bottom;
      if (yA <= yB) {
        top = { left: [aLeftX, yA], right: [aRightX, yA] };
        bottom = { left: [bLeftX, yB], right: [bRightX, yB] };
      } else {
        top = { left: [bLeftX, yB], right: [bRightX, yB] };
        bottom = { left: [aLeftX, yA], right: [aRightX, yA] };
      }
      const midY = (top.left[1] + bottom.right[1]) / 2;
      const curve = (p0, p1) => bezierCurve(p0, [p0[0], midY], [p1[0], midY], p1, 20);
      const topCurve = curve(top.right, bottom.right);
      const bottomCurve = curve(bottom.left, top.left);
      return [top.left, top.right, ...topCurve, bottom.right, bottom.left, ...bottomCurve];
    };

    const getGenePolygon = (d) => {
      const _alignmentVersion = alignmentVersion;
      const trackY = d.trackY;
      if (trackY === null || trackY === undefined) return [];

      const geneHeight = effectiveConfig.gene.height || effectiveConfig.gene.defaultHeight;
      const arrowheadHeight = effectiveConfig.gene.arrowheadHeight || 0;
      const TIP_WIDTH_FACTOR = effectiveConfig.gene.tipWidthFactor || 0.1;

      let start = d.start;
      let end = d.end;
      if (start > end) {
        const temp = start;
        start = end;
        end = temp;
      }

      const length = Math.abs(end - start);
      const tipWidth = length * TIP_WIDTH_FACTOR;
      const halfH = geneHeight / 2;
      const isForward = (d.strand === '+');
      
      // When arrowheadHeight is 0 or very small, use 5-vertex arrow polygon
      // where the tip has the same height as the gene body
      if (arrowheadHeight < 0.1) {
        if (isForward) {
          return [
            [start, trackY - halfH],
            [end - tipWidth, trackY - halfH],
            [end, trackY],  // Tip point
            [end - tipWidth, trackY + halfH],
            [start, trackY + halfH]
          ];
        }
        return [
          [end, trackY - halfH],
          [start + tipWidth, trackY - halfH],
          [start, trackY],  // Tip point
          [start + tipWidth, trackY + halfH],
          [end, trackY + halfH]
        ];
      }
      
      const arrowheadHalfHeight = (halfH + arrowheadHeight / 2);

      if (isForward) {
        return [
          [start, trackY - halfH],
          [end - tipWidth, trackY - halfH],
          [end - tipWidth, trackY - arrowheadHalfHeight],
          [end, trackY],
          [end - tipWidth, trackY + arrowheadHalfHeight],
          [end - tipWidth, trackY + halfH],
          [start, trackY + halfH]
        ];
      }
      return [
        [end, trackY - halfH],
        [start + tipWidth, trackY - halfH],
        [start + tipWidth, trackY - arrowheadHalfHeight],
        [start, trackY],
        [start + tipWidth, trackY + arrowheadHalfHeight],
        [start + tipWidth, trackY + halfH],
        [end, trackY + halfH]
      ];
    };

    const resolveGeneFillColor = (d) => {
      const clampChannel = (n) => Math.min(255, Math.max(0, Math.round(n)));
      const ensureRgba = (col) => {
        if (Array.isArray(col)) return col.length === 3 ? [col[0], col[1], col[2], 255] : col;
        if (typeof col === 'string') {
          const parts = col.split(',').map(n => parseInt(n.trim(), 10)).filter(v => !isNaN(v));
          if (parts.length === 3) return [parts[0], parts[1], parts[2], 255];
          if (parts.length >= 4) return [parts[0], parts[1], parts[2], parts[3]];
        }
        return themeColors.geneFill || [150,150,150,255];
      };

      let col = null;
      const primaryField = geneColorBy || colorBy || 'cluster';
      if (geneColorMap) {
        let key = d?.metadata?.[primaryField];
        if (key === null || key === undefined || key === '') {
          if (primaryField === 'cluster') {
            key = d?.metadata?.clusterId ?? d?.metadata?.cluster_id ?? d?.cluster;
          }
        }
        if (key !== null && key !== undefined && key !== '') {
          col = getColorFromMap(geneColorMap, key, effectiveGenePalette?.type) || null;
        }
      }

      if (geneColorMap && primaryField !== 'cluster') {
        if (!col) col = themeColors.geneFill || effectiveConfig.gene.fillColor;
      } else {
        if (!col) col = d.fillColor || themeColors.geneFill || effectiveConfig.gene.fillColor;
      }

      const base = ensureRgba(col);
      return base.map((c, i) => i < 3 ? clampChannel(c) : c);
    };

    // Create the base layers array
    const buildGenePolygon = (d) => {
      // If gene has pre-computed polygon, use it (ensures consistency with glow)
      if (d.gene && d.gene.polygon && Array.isArray(d.gene.polygon) && d.gene.polygon.length > 0) {
        return d.gene.polygon;
      }
      
      const trackY = d.trackY;
      if (trackY === null || trackY === undefined) return [];

      const geneHeight = effectiveConfig.gene.height || effectiveConfig.gene.defaultHeight;
      const arrowheadHeight = effectiveConfig.gene.arrowheadHeight || 0;
      const TIP_WIDTH_FACTOR = effectiveConfig.gene.tipWidthFactor || 0.1;

      let start = d.start;
      let end = d.end;
      if (start > end) {
        const temp = start;
        start = end;
        end = temp;
      }

      const length = Math.abs(end - start);
      const tipWidth = length * TIP_WIDTH_FACTOR;
      const halfH = geneHeight / 2;
      const isForward = (d.strand === '+');
      const arrowheadHalfHeight = (halfH + arrowheadHeight / 2);

      if (isForward) {
        return [
          [start, trackY - halfH],
          [end - tipWidth, trackY - halfH],
          [end - tipWidth, trackY - arrowheadHalfHeight],
          [end, trackY],
          [end - tipWidth, trackY + arrowheadHalfHeight],
          [end - tipWidth, trackY + halfH],
          [start, trackY + halfH]
        ];
      }
      return [
        [end, trackY - halfH],
        [start + tipWidth, trackY - halfH],
        [start + tipWidth, trackY - arrowheadHalfHeight],
        [start, trackY],
        [start + tipWidth, trackY + arrowheadHalfHeight],
        [start + tipWidth, trackY + halfH],
        [end, trackY + halfH]
      ];
    };

    // Compute a constant-width offset polygon (miter join with clamp)
    const offsetPolygonConstantWidth = (pts, pad) => {
      if (!pts || pts.length < 3) return pts || [];
      const n = pts.length;
      // Signed area to detect winding
      let area = 0;
      for (let i = 0; i < n; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % n];
        area += x1 * y2 - x2 * y1;
      }
      const ccw = area > 0;

      const normals = [];
      for (let i = 0; i < n; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % n];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        // outward normal: right-hand side for CCW, left-hand for CW
        const nx = ccw ? dy / len : -dy / len;
        const ny = ccw ? -dx / len : dx / len;
        normals.push([nx, ny]);
      }

      const out = [];
      const miterLimit = pad * 4;
      for (let i = 0; i < n; i++) {
        const nPrev = normals[(i - 1 + n) % n];
        const nCurr = normals[i];
        const bx = nPrev[0] + nCurr[0];
        const by = nPrev[1] + nCurr[1];
        const blen = Math.hypot(bx, by);
        let offX, offY;
        if (blen === 0) {
          // straight angle; use current normal
          offX = nCurr[0] * pad;
          offY = nCurr[1] * pad;
        } else {
          const bnx = bx / blen;
          const bny = by / blen;
          const cosTheta = bnx * nCurr[0] + bny * nCurr[1];
          const scaleRaw = pad / Math.max(1e-6, cosTheta);
          const scale = Math.min(scaleRaw, miterLimit);
          offX = bnx * scale;
          offY = bny * scale;
        }
        out.push([pts[i][0] + offX, pts[i][1] + offY]);
      }
      return out;
    };

    const cleanPolygon = (pts) => {
      if (!pts || pts.length < 3) return pts || [];
      const dedup = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        if (Math.hypot(x2 - x1, y2 - y1) > 1e-6) {
          dedup.push(pts[i]);
        }
      }
      const out = [];
      const n = dedup.length;
      for (let i = 0; i < n; i++) {
        const prev = dedup[(i - 1 + n) % n];
        const curr = dedup[i];
        const next = dedup[(i + 1) % n];
        const v1x = curr[0] - prev[0];
        const v1y = curr[1] - prev[1];
        const v2x = next[0] - curr[0];
        const v2y = next[1] - curr[1];
        const cross = v1x * v2y - v1y * v2x;
        const dot = v1x * v2x + v1y * v2y;
        if (Math.abs(cross) < 1e-6 && dot > 0) {
          continue; // colinear and same direction
        }
        out.push(curr);
      }
      return out.length >= 3 ? out : dedup;
    };

    // Glow polygon: offset version of the base polygon with constant thickness
    const buildGenePolygonWithPadding = (d) => {
      // Use d.polygon directly if available (already updated with current geneHeight)
      const base = d.polygon ? cleanPolygon(d.polygon) : cleanPolygon(buildGenePolygon(d));
      if (!base || !base.length) return [];
      const pad = (effectiveConfig.gene.height || effectiveConfig.gene.defaultHeight || 10) * 0.25;
      return offsetPolygonConstantWidth(base, pad);
    };

    const glowPadFactor = typeof effectiveConfig.gene.glowPadFactor === 'number'
      ? effectiveConfig.gene.glowPadFactor
      : 0.2; // tweakable padding factor for glow thickness
    const glowBasePad = (effectiveConfig.gene.height || effectiveConfig.gene.defaultHeight || 10) * glowPadFactor;
    const buildGlowPolygon = (d, scale = 1) => {
      // Use d.polygon directly if available (already updated with current geneHeight)
      // This ensures glow matches the actual rendered gene
      const base = d.polygon ? cleanPolygon(d.polygon) : cleanPolygon(buildGenePolygon(d));
      if (!base || !base.length) return [];
      return offsetPolygonConstantWidth(base, glowBasePad * scale);
    };

    const toRgbaColor = (color) => {
      const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
      if (Array.isArray(color)) {
        const [r = 0, g = 0, b = 0, a = 255] = color;
        return [clamp(r), clamp(g), clamp(b), clamp(a ?? 255)];
      }
      if (typeof color === 'string') {
        const parts = color
          .split(',')
          .map((n) => parseInt(n.trim(), 10))
          .filter((v) => !isNaN(v));
        if (parts.length >= 3) {
          const [r, g, b, a = 255] = parts;
          return [clamp(r), clamp(g), clamp(b), clamp(a)];
        }
      }
      return [150, 150, 150, 255];
    };

    // NOTE: Glow layers have been moved to a separate useMemo (glowLayers) for performance
    // They only update when highlight state changes, not when the entire dataset changes

    const ensureRgba = (color, fallback = [100, 100, 100, 255]) => {
      const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
      if (Array.isArray(color)) {
        const [r = 0, g = 0, b = 0, a = 255] = color;
        return [clamp(r), clamp(g), clamp(b), clamp(a)];
      }
      if (typeof color === 'string') {
        const parts = color
          .split(',')
          .map((n) => parseInt(n.trim(), 10))
          .filter((v) => !isNaN(v));
        if (parts.length >= 3) {
          const [r, g, b, a = 255] = parts;
          return [clamp(r), clamp(g), clamp(b), clamp(a)];
        }
      }
      return fallback;
    };

    const hoodColor = ensureRgba(themeColors.hoods || effectiveConfig.colors.darkGray || [85, 85, 85, 255]);
    const hoodWidthPx = effectiveConfig.hood?.width || effectiveConfig.stroke?.hoodWidth || effectiveConfig.stroke?.lineWidth || 2;

    // NOTE: Baseline glow layers have been moved to a separate useMemo (glowLayers) for performance

    const layersCreationStart = performance.now();
    const layers = [
      // NOTE: Baseline glow layers moved to separate useMemo for performance
      new LineLayer({
        id: 'hoods',
        data: nucleotideHoods,
        visible: true, // Always render baselines; visibility is controlled via table hide set
        getSourcePosition: d => [d.start, d.trackY],
        getTargetPosition: d => [d.end, d.trackY],
        getColor: hoodColor,
        getWidth: hoodWidthPx,
        widthUnits: 'meters',
        pickable: false,
        updateTriggers: {
          getSourcePosition: [nucleotideHoods, alignmentVersion, hoodsSignature, ySpacingProp, genomeXScaleProp],
          getTargetPosition: [nucleotideHoods, alignmentVersion, hoodsSignature, ySpacingProp, genomeXScaleProp]
        }
      }),
      // Region polygons (highlighting genomic regions like phage, operons, etc.)
      new PolygonLayer({
        id: 'region-polygons',
        data: regionPolygons,
        visible: showGeneLayer, // Regions are part of the genomic context
        getPolygon: d => d.polygon,
        getFillColor: d => d.fillColor,
        stroked: true,
        filled: false, // Keep fill transparent, show palette colors in stroke
        getLineColor: d => d.strokeColor,
        getLineWidth: d => d.strokeWidth || 2,
        lineWidthUnits: 'pixels',
        autoHighlight: true,
        pickable: true,
        updateTriggers: {
          getPolygon: [regionPolygons, alignmentVersion, ySpacingProp, genomeXScaleProp],
          getFillColor: [regionPolygons, alignmentVersion],
          getLineColor: [regionPolygons, alignmentVersion],
          getLineWidth: [regionPolygons, alignmentVersion]
        }
      }),
      new PolygonLayer({
        id: 'protein-polygons',
        data: proteinLinkData,
        visible: showProteinLinkLayer,
        getPolygon: d => {
          // reference alignmentVersion in closure to ensure recompute
          const _v = alignmentVersion;
          const gv = genomeViewRef.current;
          
          // Filter by selected node - if a clade is selected, only show links within that clade
          if (selectedNode && visibleLeavesSet.size > 0) {
            const gA = gv?.genesById?.[d.gAId];
            const gB = gv?.genesById?.[d.gBId];
            const hoodA = gA?.hood_id;
            const hoodB = gB?.hood_id;
            if (hoodA && hoodB && (!visibleLeavesSet.has(hoodA) || !visibleLeavesSet.has(hoodB))) {
              return []; // Return empty polygon to hide this link
            }
          }
          
          const gA = gv?.genesById?.[d.gAId];
          const gB = gv?.genesById?.[d.gBId];
          return buildProteinPolygonFromGenes(gA, gB);
        },
        getFillColor: d => {
          const gv = genomeViewRef.current;
          // Compute color directly from config and gene color map
          let baseColor = themeColors?.geneFill?.slice(0, 3) || [100, 150, 200];
          let alpha = 255;
          
          const colorBy = proteinLinkConfig?.colorBy;
          
          if (colorBy === 'source_gene') {
            // Use geneColorMapMemo which has the correct computed colors
            const geneColor = geneColorMapMemo.get(d.gAId);
            if (geneColor) baseColor = geneColor.slice(0, 3);
          } else if (colorBy === 'target_gene') {
            const geneColor = geneColorMapMemo.get(d.gBId);
            if (geneColor) baseColor = geneColor.slice(0, 3);
          } else if (colorBy === 'identity_solid') {
            if (proteinLinkConfig?.solidColor) {
              baseColor = proteinLinkConfig.solidColor.slice(0, 3);
            }
          } else if (colorBy === 'identity_gradient' && proteinLinkConfig?.palette?.enabled) {
            try {
              const paletteColors = memoGetPalette(
                proteinLinkConfig.palette.name,
                proteinLinkConfig.palette.numColors,
                proteinLinkConfig.palette.reverse
              );
              const similarity = d.metadata?.similarity ?? 50;
              const normalized = Math.max(0, Math.min(1, similarity / 100));
              const idx = Math.floor(normalized * (paletteColors.length - 1));
              baseColor = paletteColors[idx]?.slice(0, 3) || baseColor;
            } catch (e) {}
          }
          
          // Calculate alpha based on configuration
          const plConfig = proteinLinkConfig || effectiveConfig?.proteinLink || DEFAULT_CONFIG.proteinLink;
          if (plConfig?.useAlpha && d.metadata?.similarity !== undefined) {
            const normalizedSimilarity = d.metadata.similarity / 100;
            const minAlpha = plConfig.minAlpha ?? 0;
            const maxAlpha = plConfig.maxAlpha ?? 0.5;
            const alphaRange = maxAlpha - minAlpha;
            const calculatedAlpha = minAlpha + (normalizedSimilarity * alphaRange);
            alpha = Math.round(calculatedAlpha * 255);
          }
          
          return [...baseColor, alpha];
        },
        stroked: false,
        autoHighlight: true,
        filled: true,
        pickable: true,
        updateTriggers: {
          getPolygon: [proteinLinkData, alignmentVersion, paletteVersion, selectedNode, ySpacingProp, genomeXScaleProp],
          getFillColor: [
            proteinLinkData,
            paletteVersion,
            proteinLinkConfigKey,
            geneColorMapMemo.size,
            geneColorMap,
            effectiveGenePalette?.prevalenceFilter,
            effectiveGenePalette?.name,
            geneColorBy,
            colorBy,
            themeColors?.geneFill,
            selectedNode
          ]
        }
      }),
      // Nucleotide links polygons (computed live from current transforms)
      new PolygonLayer({
        id: 'nucleotide-polygons',
        data: nucleotideLinkData,
        visible: showNucleotideLinkLayer,
        getPolygon: d => {
          const _v = alignmentVersion;
          const gv = genomeViewRef.current;
          if (!gv) return [];
          
          // Filter by selected node - if a clade is selected, only show links within that clade
          if (selectedNode && visibleLeavesSet.size > 0) {
            if (!visibleLeavesSet.has(d.hoodA) || !visibleLeavesSet.has(d.hoodB)) {
              return []; // Return empty polygon to hide this link
            }
          }
          
          const trackYA = gv.getTrackYByHoodId(d.hoodA);
          const trackYB = gv.getTrackYByHoodId(d.hoodB);
          if (trackYA == null || trackYB == null) return [];

          const xScalePercent = (gv.config.genome && typeof gv.config.genome.xScalePercent === 'number') ? gv.config.genome.xScalePercent : 100;
          const xScale = xScalePercent / 100;

          const blA = gv.hoodRanges[d.hoodA];
          const blB = gv.hoodRanges[d.hoodB];
          const anchorA = blA ? blA.length / 2 : 0;
          const anchorB = blB ? blB.length / 2 : 0;
          const offsetA = gv.trackOffset[d.hoodA] || 0;
          const offsetB = gv.trackOffset[d.hoodB] || 0;
          const flippedA = !!gv.trackFlipped[d.hoodA];
          const flippedB = !!gv.trackFlipped[d.hoodB];

          const tx = gv.constructor.getTransformedXUnified;
          let xA1 = tx(d.hoodStartA, anchorA, offsetA, flippedA);
          let xA2 = tx(d.hoodEndA,   anchorA, offsetA, flippedA);
          let xB1 = tx(d.hoodStartB, anchorB, offsetB, flippedB);
          let xB2 = tx(d.hoodEndB,   anchorB, offsetB, flippedB);
          xA1 = anchorA + (xA1 - anchorA) * xScale;
          xA2 = anchorA + (xA2 - anchorA) * xScale;
          xB1 = anchorB + (xB1 - anchorB) * xScale;
          xB2 = anchorB + (xB2 - anchorB) * xScale;

          const pointsA = [[xA1, trackYA], [xA2, trackYA]].sort((a, b) => a[0] - b[0]);
          const pointsB = [[xB1, trackYB], [xB2, trackYB]].sort((a, b) => a[0] - b[0]);
          return [pointsA[0], pointsA[1], pointsB[1], pointsB[0]];
        },
        getFillColor: d => {
          // Compute color directly from config
          let baseColor = [200, 200, 200];
          let alpha = 255;
          
          const colorBy = nucleotideLinkConfig?.colorBy;
          const strandColoring = nucleotideLinkConfig?.strandColoring;
          // Get similarity from multiple possible locations
          const similarity = d.similarity ?? d.metadata?.similarity ?? 50;
          
          // Helper function to determine if link is same strand (considering flips)
          const getIsSameStrand = () => {
            const gv = genomeViewRef.current;
            if (!gv) return true;
            
            const originalLink = gv.nucleotideLinks?.find(nl => 
              nl.hoodA === d.hoodA && 
              nl.hoodB === d.hoodB &&
              nl.hoodStartA === d.hoodStartA
            );
            
            if (!originalLink) return true;
            
            const origStrandA = originalLink.strandA || '+';
            const origStrandB = originalLink.strandB || '+';
            const flippedA = !!gv.trackFlipped[d.hoodA];
            const flippedB = !!gv.trackFlipped[d.hoodB];
            const effectiveStrandA = (origStrandA === '+') !== flippedA ? '+' : '-';
            const effectiveStrandB = (origStrandB === '+') !== flippedB ? '+' : '-';
            return effectiveStrandA === effectiveStrandB;
          };
          
          if (colorBy === 'solid') {
            if (strandColoring) {
              // Use different solid colors for same vs opposite strand
              const isSameStrand = getIsSameStrand();
              if (isSameStrand) {
                baseColor = nucleotideLinkConfig?.sameStrandColor?.slice(0, 3) || [180, 180, 180];
              } else {
                baseColor = nucleotideLinkConfig?.oppositeStrandColor?.slice(0, 3) || [220, 80, 80];
              }
            } else if (nucleotideLinkConfig?.solidColor) {
              baseColor = nucleotideLinkConfig.solidColor.slice(0, 3);
              // For solid, also use the alpha from solidColor if not using identity-dependent alpha
              if (!nucleotideLinkConfig?.useAlpha && nucleotideLinkConfig.solidColor.length > 3) {
                alpha = nucleotideLinkConfig.solidColor[3];
              }
            }
          } else if (colorBy === 'identity_gradient') {
            // For gradient mode, check if strand coloring is enabled
            if (strandColoring) {
              // Use different palettes for same vs opposite strand
              const isSameStrand = getIsSameStrand();
              
              // Select the appropriate palette based on strand
              const paletteConfig = isSameStrand 
                ? nucleotideLinkConfig?.sameStrandPalette 
                : nucleotideLinkConfig?.oppositeStrandPalette;
              
              if (paletteConfig?.enabled) {
                try {
                  const paletteColors = memoGetPalette(
                    paletteConfig.name,
                    paletteConfig.numColors,
                    paletteConfig.reverse
                  );
                  const normalized = Math.max(0, Math.min(1, similarity / 100));
                  const idx = Math.floor(normalized * (paletteColors.length - 1));
                  baseColor = paletteColors[idx]?.slice(0, 3) || baseColor;
                } catch (e) {}
              }
            } else if (nucleotideLinkConfig?.palette?.enabled) {
              // Standard single palette gradient
              try {
                const paletteColors = memoGetPalette(
                  nucleotideLinkConfig.palette.name,
                  nucleotideLinkConfig.palette.numColors,
                  nucleotideLinkConfig.palette.reverse
                );
                const normalized = Math.max(0, Math.min(1, similarity / 100));
                const idx = Math.floor(normalized * (paletteColors.length - 1));
                baseColor = paletteColors[idx]?.slice(0, 3) || baseColor;
              } catch (e) {}
            }
          }
          
          // Calculate alpha based on identity-dependent configuration
          const nlConfig = nucleotideLinkConfig || effectiveConfig?.nucleotideLink || DEFAULT_CONFIG.nucleotideLink;
          if (nlConfig?.useAlpha) {
            const normalizedSimilarity = similarity / 100;
            const minAlpha = nlConfig.minAlpha ?? 0;
            const maxAlpha = nlConfig.maxAlpha ?? 0.5;
            const alphaRange = maxAlpha - minAlpha;
            const calculatedAlpha = minAlpha + (normalizedSimilarity * alphaRange);
            alpha = Math.round(calculatedAlpha * 255);
          }
          
          // Return fresh RGBA array every time config changes
          return [...baseColor, alpha];
        },
        stroked: false,
        filled: true,
        autoHighlight: true,
        pickable: true,
        updateTriggers: {
          getPolygon: [nucleotideLinkData, alignmentVersion, paletteVersion, (genomeViewRef.current && genomeViewRef.current.config && genomeViewRef.current.config.genome && genomeViewRef.current.config.genome.xScalePercent) || null, selectedNode, ySpacingProp, genomeXScaleProp],
          getFillColor: [
            nucleotideLinkData,
            paletteVersion,
            nucleotideLinkConfigKey,
            nucleotideLinkConfig?.useAlpha,
            nucleotideLinkConfig?.minAlpha,
            nucleotideLinkConfig?.maxAlpha,
            nucleotideLinkConfig?.colorBy,
            nucleotideLinkConfig?.strandColoring,
            nucleotideLinkConfig?.sameStrandColor,
            nucleotideLinkConfig?.oppositeStrandColor,
            nucleotideLinkConfig?.sameStrandPalette,
            nucleotideLinkConfig?.oppositeStrandPalette,
            selectedNode,
            // Include flip state to update colors when tracks are flipped
            genomeViewRef.current?.trackFlipped,
            alignmentVersion
          ]
        }
      }),
  // Phylogenetic tree paths
      new PathLayer({
        id: 'phylo-tree',
        data: treeEdges,
        visible: showTreeLayer && hasNewick,
  getPath: d => {
          // Compute path directly in PathLayer with current effectiveConfig values
          const treeXScale = (effectiveConfig.tree && typeof effectiveConfig.tree.xScalePercent === 'number') ? effectiveConfig.tree.xScalePercent / 100 : 1;
          
          // Transform the raw path coordinates with current scaling and offset
          return d.rawPath.map(([y, x]) => [y * treeXScale + treeOffset, x]);
        },
        getColor: d => d.color || themeColors.treeEdges || effectiveConfig.tree.edgeColor,
        autoHighlight: true,
        widthUnits: 'pixels',
        jointRounded: true,
        capRounded: true,
        getWidth: () => effectiveConfig.tree.edgeWidth || 3,
        pickable: true,
        updateTriggers: {
          // Trigger updates when tree scaling or positioning changes
          getPath: [
            treeEdges.length,
            effectiveConfig.tree.xScalePercent,
            treeOffset,
            alignmentVersion
          ],
          getColor: [treeEdges.length, themeColors.treeEdges, effectiveConfig.tree.edgeColor],
          getWidth: effectiveConfig.tree.edgeWidth
        }
      }),
      
      // Glow layer excluded from main DeckGL; rendered in overlay with post-process
      // Genes (placed after domains and links for topmost picking)
      new PolygonLayer({
        id: 'genes',
        data: genesData,
        visible: showGeneLayer,
        getPolygon: buildGenePolygon,
        getFillColor: d => {
          // Resolve color live to avoid relying on precomputed fillColor
          const ensureRgba = (col) => {
            if (Array.isArray(col)) return col.length === 3 ? [col[0], col[1], col[2], 255] : col;
            if (typeof col === 'string') {
              // accept 'r,g,b' or 'r,g,b,a'
              const parts = col.split(',').map(n => parseInt(n.trim(), 10)).filter(v => !isNaN(v));
              if (parts.length === 3) return [parts[0], parts[1], parts[2], 255];
              if (parts.length >= 4) return [parts[0], parts[1], parts[2], parts[3]];
            }
            return themeColors.geneFill || [150,150,150,255];
          };
          const clampChannel = (n) => Math.min(255, Math.max(0, Math.round(n)));

          let col = null;
          const primaryField = geneColorBy || colorBy || 'cluster';
          if (geneColorMap) {
            let key = d?.metadata?.[primaryField];
            if (key === null || key === undefined || key === '') {
              if (primaryField === 'cluster') {
                key = d?.metadata?.clusterId ?? d?.metadata?.cluster_id ?? d?.cluster;
              }
            }
          if (key !== null && key !== undefined && key !== '') {
            col = getColorFromMap(geneColorMap, key, effectiveGenePalette?.type) || null;
          }
        }

        // When palette is disabled (geneColorMap is null), always use theme default
        // Don't fall back to d.fillColor as it may contain stale palette colors
        if (!effectiveGenePalette?.enabled) {
          if (!col) col = themeColors.geneFill || effectiveConfig.gene.fillColor;
        } else if (geneColorMap && primaryField !== 'cluster') {
          // If a palette for a non-cluster field is active, do NOT fall back to
          // stored per-gene fillColor (which may originate from a previous
          // cluster palette). Instead use the mapped color or the theme default.
          if (!col) col = themeColors.geneFill || effectiveConfig.gene.fillColor;
        } else {
          if (!col) col = d.fillColor || themeColors.geneFill || effectiveConfig.gene.fillColor;
        }

          const base = ensureRgba(col);
          return base;
        },
        stroked: effectiveConfig.gene.edgeWidth > 0,
        getLineColor: d => getGeneEdgeColor(d),
        getLineWidth: () => effectiveConfig.gene.edgeWidth,
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 0,
        filled: true,
        pickable: true,
        autoHighlight: true,
        updateTriggers: {
          // Trigger updates when shape-affecting config changes or when underlying
          // GenomeView data was re-derived (genesData identity changes on recompute).
          getPolygon: [
            genesData,
            genesShapeSignature,
            alignmentVersion,
            effectiveConfig.gene.height,
            effectiveConfig.gene.defaultHeight,
            effectiveConfig.gene.arrowheadHeight,
            effectiveConfig.gene.tipWidthFactor,
            arrowheadHeight,
            geneHeight,
            selectedNode,
            ySpacingProp,
            genomeXScaleProp
          ],
          getFillColor: [genesData, geneColorBy, colorBy, paletteVersion, themeColors.geneFill, alignmentVersion, effectiveGenePalette?.enabled],
          // Include resolvedTheme because getGeneEdgeColor uses themeColors.background to decide darken/lighten factor
          getLineColor: [genesData, geneColorBy, colorBy, paletteVersion, themeColors.geneFill, effectiveConfig.gene.edgeWidth, alignmentVersion, resolvedTheme],
          getLineWidth: effectiveConfig.gene.edgeWidth,
          stroked: effectiveConfig.gene.edgeWidth
        }
      }),
      // Domains (render after genes so they appear on top visually but remain non-pickable)
      // NOTE: Include geometry values in layer id to force DeckGL to recreate layer when gene size changes
      new PolygonLayer({
        id: `domains-${effectiveConfig.gene.height}-${effectiveConfig.gene.arrowheadHeight}`,
        data: domains,
        visible: showDomainLayer,
        getPolygon: d => d.polygon,
        getFillColor: d => d.fillColor || themeColors.geneFill || config.colors.gray,
        stroked: true,
        getLineColor: () => config.colors.black,
        getLineWidth: () => effectiveConfig.domain.edgeWidth || 2,
        lineWidthUnits: 'pixels',
        filled: true,
        autoHighlight: true,
        pickable: true, // keep gene picking priority
        updateTriggers: {
          // Include gene.height and gene.arrowheadHeight so domain polygons update when gene size changes
          getPolygon: [domains, alignmentVersion, effectiveConfig.domain.height, effectiveConfig.gene.height, effectiveConfig.gene.arrowheadHeight, effectiveConfig.domain.heightFactor, domainSource, selectedNode, ySpacingProp, genomeXScaleProp],
          getFillColor: [domains.length, domainColorBy, paletteVersion, themeColors.domainFill, domainSource, selectedNode],
          getLineWidth: effectiveConfig.domain.edgeWidth
        }
      }),
      // Gene cluster TextLayer (below genes)
      new TextLayer({
        id: 'gene-labels',
        data: geneLabels,
        visible: showGeneTextLayer,
        getPosition: d => d.position,
        getText: d => d.text,
        getColor: d => d.color,
        getSize: d => d.size * (effectiveConfig.text?.scaleFactors?.gene || 1),
        sizeUnits: 'meters',
        fontFamily: 'sans-serif',
        getTextAnchor: d => d.textAnchor || 'middle',
        getAlignmentBaseline: d => d.alignmentBaseline || 'top',
        pickable: false,
        updateTriggers: {
          getPosition: [geneLabels, alignmentVersion, (effectiveConfig && effectiveConfig.gene ? effectiveConfig.gene.height : null), geneHeight, geneLabelPosition, ySpacingProp, genomeXScaleProp, genesData],
          getText: [geneLabels],
          getColor: [geneLabels, geneColorBy, (effectiveGenePalette && effectiveGenePalette.name) || null, paletteVersion],
          getSize: [effectiveConfig.text?.geneLabelSize, effectiveConfig.text?.scaleFactors?.gene, geneLabels, geneHeight, geneLabelPosition],
          getAlignmentBaseline: [geneLabels, geneLabelPosition, alignmentVersion]
        }
      }),
      // Phylo labels
      new TextLayer({
        id: 'phylo-labels',
        data: phyloLabels,
        visible: showTreeTextLayer && hasNewick,
        getPosition: d => {
          // Compute position directly in TextLayer with current effectiveConfig values
          const treeXScale = (effectiveConfig.tree && typeof effectiveConfig.tree.xScalePercent === 'number') ? effectiveConfig.tree.xScalePercent / 100 : 1;
          
          let xPosition;
          if (d.labelPosition === 'after-tracks') {
            if (effectiveAlignLabels) {
              // When align labels is enabled, find the rightmost position among all labels
              // and align all labels to that position
              const allRightmostPositions = phyloLabels
                .map(label => label.rightmostX)
                .filter(x => isFinite(x));
              const maxRightmostX = allRightmostPositions.length > 0 
                ? Math.max(...allRightmostPositions) 
                : d.rawY * treeXScale + treeOffset + (config.tree?.labelOffset || 10);
              xPosition = maxRightmostX + (config.tree?.labelOffset || 10);
            } else {
              // Use pre-computed rightmost position (O(1) lookup instead of O(M) scan)
              let rightmostX = d.rightmostX;
              
              // If we couldn't find a rightmost position, fallback to tree position
              if (!isFinite(rightmostX)) {
                rightmostX = d.rawY * treeXScale + treeOffset + (effectiveConfig.tree?.labelOffset || 10);
              } else {
                // Add offset after the rightmost genome feature
                rightmostX += (effectiveConfig.tree?.labelOffset || 10);
              }
              
              xPosition = rightmostX;
            }
          } else {
            // Default: position after tree nodes
            if (effectiveAlignLabels) {
              // When align labels is enabled, find the deepest tree node position
              // and align all labels to that position
              const allTreePositions = phyloLabels.map(label => label.rawY * treeXScale);
              const maxTreeX = allTreePositions.length > 0 ? Math.max(...allTreePositions) : d.rawY * treeXScale;
              xPosition = maxTreeX + treeOffset + (effectiveConfig.tree?.labelOffset || 10);
            } else {
              // Default: individual positioning based on tree depth
              xPosition = d.rawY * treeXScale + treeOffset + (effectiveConfig.tree?.labelOffset || 10);
            }
          }
          
          return [xPosition, d.x];
        },
        getText: d => d.text,
        getColor: d => d.color,
        getSize: d => d.size * effectiveConfig.text.scaleFactors.phylo,
        sizeUnits: 'meters',
        fontFamily: 'sans-serif',
        getTextAnchor: d => d.textAnchor || 'start',
        getAlignmentBaseline: d => d.alignmentBaseline || 'center',
        getPixelOffset: d => [5, 0],
        // Add background when connecting lines are active
        background: showConnectingLines,
        getBackgroundColor: () => {
          const isLightTheme = themeColors.background === '#ffffff';
          return showConnectingLines
            ? [isLightTheme ? 255 : 0, isLightTheme ? 255 : 0, isLightTheme ? 255 : 0, 255]
            : [0, 0, 0, 0];
        },
        backgroundPadding: showConnectingLines ? [2, 1, 2, 1] : [0, 0, 0, 0],
        pickable: false,
        updateTriggers: {
          // Trigger updates when tree scaling or positioning changes
          getPosition: [
            phyloLabels.length,
            effectiveConfig.tree.xScalePercent,
            treeOffset,
            alignmentVersion,
            rightmostPositionsByLeaf,
            effectiveAlignLabels  // Add align labels to triggers
          ],
          getText: phyloLabels,
          // Trigger size updates when phyloLabelSize changes
          getSize: [
            effectiveConfig.text.phyloLabelSize,
            effectiveConfig.text.scaleFactors.phylo,
            phyloLabels
          ],
          // Include palette identity, enabled/num/reverse flags and metadata size so
          // changes in the palette controls or metadata force TextLayer color updates.
          getColor: [
            phyloLabels,
            treeColorBy,
            (effectivePhyloPalette ? `${effectivePhyloPalette.name}|${effectivePhyloPalette.numColors||0}|${effectivePhyloPalette.reverse||false}|${effectivePhyloPalette.enabled||false}` : null),
            // include explicit color signature so changes to assigned colors always trigger DeckGL updates
            phyloColorSignature,
            themeColors.phyloLabelFill,
            (treeMetadata ? Object.keys(treeMetadata).length : 0)
          ],
          background: showConnectingLines,
          getBackgroundColor: showConnectingLines,
          backgroundPadding: showConnectingLines
        }
      }),
      // NOTE: Tree glow layers moved to separate useMemo for performance
      // Node points
      new ScatterplotLayer({
        id: 'nodes',
        data: treeNodes,
        visible: showTreeLayer && hasNewick,
        getPosition: d => {
          // Compute position directly in ScatterplotLayer with current effectiveConfig values
          const rawY = Number(d.rawY);
          const rawX = Number(d.x);
          if (!Number.isFinite(rawY) || !Number.isFinite(rawX)) return [0, 0];
          const treeXScale = (effectiveConfig.tree && typeof effectiveConfig.tree.xScalePercent === 'number') ? effectiveConfig.tree.xScalePercent / 100 : 1;
          return [rawY * treeXScale + treeOffset, rawX];
        },
        getFillColor: d => d.color,
        getRadius: d => d.radius,
        lineWidthUnits: 'meters',
        radiusUnits: 'meters',
        autoHighlight: true,
        filled: true,
        stroked: false,
        pickable: true,
        updateTriggers: {
          // Trigger updates when tree scaling or positioning changes
          getPosition: [
            treeNodes.length,
            effectiveConfig.tree.xScalePercent,
            treeOffset,
            alignmentVersion
          ],
          getFillColor: [
            treeNodes.length, 
            themeColors.treeEdges, 
            selectedNode,
            // Include phylo color information so node colors update with phylo label colors
            treeColorBy,
            (effectivePhyloPalette ? `${effectivePhyloPalette.name}|${effectivePhyloPalette.numColors||0}|${effectivePhyloPalette.reverse||false}|${effectivePhyloPalette.enabled||false}` : null),
            phyloColorSignature,
            (treeMetadata ? Object.keys(treeMetadata).length : 0)
          ]
        }
      })
    ];

    // Add connecting lines layer if showConnectingLines is true
    if (showConnectingLines) {
      // Create connecting lines data with raw coordinates for direct computation
      const connectingLinesData = tree.leafNodes
        .filter(leaf => {
          // Only include leaves that are visible under the current clade filter
          if (selectedNode && !visibleLeavesSet.has(leaf.name)) return false;
          // Only include leaves that have corresponding genome tracks
          const trackY = genomeView.getTrackYByHoodId(leaf.name);
          return trackY != null;
        })
        .map(leaf => {
          const trackY = genomeView.getTrackYByHoodId(leaf.name);
          
          // Find the leftmost point of the genome track for this leaf
          let genomeStartX = Infinity;
          
          // Check baselines first - they represent the start of genome tracks
          const hoodForLeaf = nucleotideHoods.find(hood => hood.hood_id === leaf.name);
          if (hoodForLeaf) {
            // Use the leftmost coordinate of the baseline (accounts for flipping)
            genomeStartX = Math.min(hoodForLeaf.start, hoodForLeaf.end);
          } else {
            // Fallback: check genes for this leaf
            Object.values(genomeView.genesById).forEach(gene => {
              if (gene.hood_id === leaf.name || genomeView.getHoodIdFromSeqid(gene.seqid) === leaf.name) {
                genomeStartX = Math.min(genomeStartX, Math.min(gene.start, gene.end));
              }
            });
          }
          
          return {
            rawLeafY: leaf.y, // Store raw coordinates for direct computation
            leafX: leaf.x,
            genomeStartX: isFinite(genomeStartX) ? genomeStartX : null,
            trackY: trackY,
            metadata: {
              leaf_id: leaf.name,
              type: 'connecting_line'
            }
          };
        })
        .filter(d => d.genomeStartX !== null); // Only keep valid connections

      // Only add the layer if we have data
      if (connectingLinesData.length > 0) {
        // Insert connecting lines at the beginning so they render behind everything else
        layers.unshift(
          new LineLayer({
            id: 'connecting-lines',
            data: connectingLinesData,
            getSourcePosition: d => {
              // Compute source position directly with current tree scaling
              const treeXScale = (effectiveConfig.tree && typeof effectiveConfig.tree.xScalePercent === 'number') ? effectiveConfig.tree.xScalePercent / 100 : 1;
              return [d.rawLeafY * treeXScale + treeOffset, d.leafX];
            },
            getTargetPosition: d => [d.genomeStartX, d.trackY],
            getColor: config.connectingLines.color,
            getWidth: config.connectingLines.width,
            widthUnits: 'pixels',
            pickable: true,
            autoHighlight: false,
            updateTriggers: {
              getSourcePosition: [
                connectingLinesData.length,
                effectiveConfig.tree.xScalePercent,
                treeOffset,
                alignmentVersion
              ],
              getTargetPosition: connectingLinesData
            }
          })
        );
      }
    }

    // NOTE: Glow layers have been moved to a separate useMemo for performance
    // They only rebuild when highlighted data changes, not when dataset changes

    /*
    // Tree ticks (for SVG export)
    const treeTicks = tree.leafNodes.map(leaf => {
      const tickLength = 10; // Length of the tick in pixels
      const tickStart = [leaf.y + treeOffset, leaf.x];
      const tickEnd = [leaf.y + treeOffset + tickLength, leaf.x];
      return {
        sourcePosition: tickStart,
        targetPosition: tickEnd,
        metadata: {
          leaf_id: leaf.name,
          type: 'tree_tick'
        }
      };
    });

    layers.push(
      new LineLayer({
        id: 'tree-ticks',
        data: treeTicks,
        getSourcePosition: d => d.sourcePosition,
        getTargetPosition: d => d.targetPosition,
        getColor: config.tree.tickColor || [0, 0, 0, 255],
        getWidth: config.tree.tickWidth || 1,
        widthUnits: 'pixels',
        pickable: false,
        autoHighlight: false,
        updateTriggers: {
          getSourcePosition: treeTicks,
          getTargetPosition: treeTicks
        }
      })
    );
    */

    // --- NCRNA COLORING LOGIC ---
    let ncRNAs = Object.values(genomeView.ncRNAsById || {});
    if (selectedNode) {
      try {
        const fd = genomeView.filterBySelectedNode(selectedNode) || {};
        if (Array.isArray(fd.ncRNAs)) ncRNAs = fd.ncRNAs;
      } catch (e) {}
    }
    // Colors are now applied directly during GenomeView creation if palette is enabled
    ncRNAs = ncRNAs.map(nc => ({
      ...nc,
      fillColor: nc.fillColor || (nc.metadata && nc.metadata.color) || themeColors.geneFill
    }));
    layers.push(
      new PolygonLayer({
        id: 'ncrna-features',
        data: ncRNAs,
        visible: showNcRNALayer,
        getPolygon: d => d.polygon,
        getFillColor: d => d.fillColor,
        stroked: effectiveConfig.gene.edgeWidth > 0,
        getLineColor: d => getGeneEdgeColor(d),
        getLineWidth: () => effectiveConfig.gene.edgeWidth,
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 0,
        filled: true,
        pickable: true,
        autoHighlight: true,
        updateTriggers: {
          getPolygon: [ncRNAs, effectiveConfig.gene.height, effectiveConfig.gene.arrowheadHeight, alignmentVersion, paletteVersion, ySpacingProp, genomeXScaleProp], // Include alignmentVersion so positions update
          getFillColor: [ncRNAs.length, paletteVersion],
          getLineColor: [ncRNAs.length, paletteVersion],
          getLineWidth: effectiveConfig.gene.edgeWidth,
          stroked: effectiveConfig.gene.edgeWidth
        }
      })
    );
    if (DEBUG_LOGS) console.log(`📊 DeckGL layers created in ${(performance.now() - layersCreationStart).toFixed(1)}ms (${layers.length} layers)`);
    
    // Update geometry cache signature for next run
    cachedGeometrySignatureRef.current = geometryCacheKey;

  const layersEndTime = performance.now();
    if (DEBUG_LOGS) console.log('HoodiniViz: layers build total(ms)=', layersEndTime - layersStartTime);
    try { console.groupEnd && console.groupEnd(); } catch(e) {}
  
  return layers;
  }, [
    // ===== PRE-COMPUTED USEMEMOS (extracted for performance) =====
    effectiveConfig,        // Replaces: styleConfig, config.*, geneHeight, arrowheadHeight, effectiveTreeXScale
    visibleLeavesSet,       // Replaces: selectedNode filtering logic
    visibleLeavesSetForBounds, // For filtering bounds calculation when node is selected
    genomeView,             // Core data model - triggers rebuild when structure changes
    bounds,                 // CRITICAL: Must include bounds so layers update when genomeXScale changes bounds
    
    // ===== CORE DATA =====
    alignmentVersion,
    tree, 
    selectedNode,           // Still needed for internal filtering checks
    nucleotideLinkData,
    proteinLinkData,
    
    // ===== COLORS =====
    geneColorMap,
    geneColorMapMemo,  // Contains custom colors from geneColors prop and metadata color column
    domainColorMap, 
    resolvedTheme,
    
    // ===== UI STATE =====
    showConnectingLines,
    phyloLabelPosition,
    alignLabels,
    labelBy,
    treeLabelBy,
    treeColorBy,
    phyloPalette,
    treeMetadata,
    domainSource,
    hoodsSignature,
    
    // ===== LINK CONFIG =====
    proteinLinkConfig,
    nucleotideLinkConfig,
    
    // ===== METADATA =====
    proteinMetadata,
    nonCodingMetadata,
    
    // ===== COLOR FIELDS =====
    colorBy,
    geneColorBy,
    domainColorBy,
    genePalette,
    domainPalette,
    
    // ===== CUSTOM COLOR MAPS =====
    normalizedGeneColors,
    normalizedPhyloColors,
    
    // ===== VISIBILITY =====
    hiddenHoodSet,
    showTreeLayer,
    showGeneLayer,
    showDomainLayer,
    showProteinLinkLayer,
    showNucleotideLinkLayer,
    showNcRNALayer,
    showGeneTextLayer,
    showTreeTextLayer,
    
    // ===== PALETTE SIGNALS =====
    genomeViewRef.current?._paletteVersion,
    effectiveGenePalette?.enabled
  ]);

  // ====== OVERLAY STRATEGY: SEPARATE GLOW LAYERS USEMEMO ======
  // These layers only rebuild when highlighted data changes
  // Static neon-style glow effect (no animation to avoid constant re-renders)
  const glowLayers = React.useMemo(() => {
    const result = [];
    
    // Helper to convert color to RGBA
    const toRgbaColor = (color) => {
      const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
      if (Array.isArray(color)) {
        const [r = 0, g = 0, b = 0, a = 255] = color;
        return [clamp(r), clamp(g), clamp(b), clamp(a ?? 255)];
      }
      if (typeof color === 'string') {
        const parts = color
          .split(',')
          .map((n) => parseInt(n.trim(), 10))
          .filter((v) => !isNaN(v));
        if (parts.length >= 3) {
          const [r, g, b, a = 255] = parts;
          return [clamp(r), clamp(g), clamp(b), clamp(a)];
        }
      }
      return [150, 150, 150, 255];
    };

    // ======= GENE GLOW LAYERS (NEON STYLE) =======
    if (highlightedGeneData && highlightedGeneData.length > 0) {
      const getGeneColor = (gene) => {
        const base =
          gene?.fillColor ||
          themeColors.geneFill ||
          config.gene?.fillColor ||
          [100, 200, 255, 255];
        return toRgbaColor(base);
      };

      // Helper to get or compute polygon for gene glow
      // This ensures glow works even before the effect calculates the polygon
      const getGeneGlowPolygon = (d) => {
        // Use pre-computed polygon if available
        if (d.polygon && Array.isArray(d.polygon) && d.polygon.length > 0) {
          return d.polygon;
        }
        
        // Compute on-the-fly if not available
        const gene = d.gene || d;
        const trackY = d.trackY ?? gene.trackY ?? 0;
        const currentGeneHeight = effectiveConfig.gene?.height || effectiveConfig.gene?.geneHeight || 20;
        const currentArrowheadHeight = effectiveConfig.gene?.arrowheadHeight || 10;
        const genomeXScale = (effectiveConfig.genome?.xScalePercent || 100) / 100;
        
        const start = (d.start ?? gene.start) * genomeXScale;
        const end = (d.end ?? gene.end) * genomeXScale;
        const strand = d.strand ?? gene.strand;
        
        const halfH = currentGeneHeight / 2;
        const arrowH = currentArrowheadHeight / 2;
        const tipWidth = (effectiveConfig.gene?.tipWidthFactor || 0.15) * Math.abs(end - start);
        
        if (strand === '+' || strand === 1) {
          const arrowStart = Math.max(start, end - tipWidth);
          return [
            [start, trackY - halfH],
            [arrowStart, trackY - halfH],
            [arrowStart, trackY - halfH - arrowH],
            [end, trackY],
            [arrowStart, trackY + halfH + arrowH],
            [arrowStart, trackY + halfH],
            [start, trackY + halfH],
          ];
        } else {
          const arrowEnd = Math.min(end, start + tipWidth);
          return [
            [end, trackY - halfH],
            [arrowEnd, trackY - halfH],
            [arrowEnd, trackY - halfH - arrowH],
            [start, trackY],
            [arrowEnd, trackY + halfH + arrowH],
            [arrowEnd, trackY + halfH],
            [end, trackY + halfH],
          ];
        }
      };

      // Outer glow halo (additive blend for light effect)
      result.push(
        new PolygonLayer({
          id: 'genes-glow-outer',
          data: highlightedGeneData,
          getPolygon: getGeneGlowPolygon,
          stroked: true,
          filled: false,
          getLineWidth: 35,
          getLineColor: d => {
            const [r, g, b] = getGeneColor(d);
            return [r, g, b, 70];
          },
          lineWidthUnits: 'pixels',
          lineWidthMinPixels: 8,
          pickable: false,
          parameters: {
            blendFunc: [770, 1], // Additive blending for light effect
            depthTest: false,
            depthMask: false
          }
        })
      );

      // Mid glow (tighter, brighter)
      result.push(
        new PolygonLayer({
          id: 'genes-glow-mid',
          data: highlightedGeneData,
          getPolygon: getGeneGlowPolygon,
          stroked: true,
          filled: false,
          getLineWidth: 18,
          getLineColor: d => {
            const [r, g, b] = getGeneColor(d);
            return [r, g, b, 120];
          },
          lineWidthUnits: 'pixels',
          lineWidthMinPixels: 4,
          pickable: false,
          parameters: {
            blendFunc: [770, 1],
            depthTest: false,
            depthMask: false
          }
        })
      );

      // Core solid line (white/bright)
      result.push(
        new PolygonLayer({
          id: 'genes-glow-core',
          data: highlightedGeneData,
          getPolygon: getGeneGlowPolygon,
          stroked: true,
          filled: true,
          getFillColor: d => {
            const [r, g, b] = getGeneColor(d);
            return [r, g, b, 40]; // Subtle fill
          },
          getLineColor: [255, 255, 255, 255], // Bright white core
          getLineWidth: 3,
          lineWidthUnits: 'pixels',
          lineWidthMinPixels: 2,
          pickable: false,
          parameters: {
            depthTest: false,
            depthMask: false,
            polygonOffset: [-2, -2]
          }
        })
      );
    }

    // ======= TREE LEAF GLOW LAYERS (NEON STYLE) =======
    if (highlightedTreeLeafData && highlightedTreeLeafData.length > 0) {
      // Outer glow
      result.push(
        new ScatterplotLayer({
          id: 'tree-glow-outer',
          data: highlightedTreeLeafData,
          getPosition: d => d.position || [0, 0],
          getRadius: d => (d.radius || 2) * 3.5,
          getFillColor: d => {
            const base = d?.color || themeColors.treeEdges || [255, 200, 100, 255];
            const [r, g, b] = toRgbaColor(base);
            return [r, g, b, 90];
          },
          stroked: false,
          filled: true,
          pickable: false,
          radiusUnits: 'meters',
          radiusMinPixels: 12,
          parameters: {
            blendFunc: [770, 1],
            depthTest: false,
            depthMask: false
          }
        })
      );

      // Core
      result.push(
        new ScatterplotLayer({
          id: 'tree-glow-core',
          data: highlightedTreeLeafData,
          getPosition: d => d.position || [0, 0],
          getRadius: d => (d.radius || 2) * 1.8,
          getFillColor: [255, 255, 255, 255],
          stroked: false,
          filled: true,
          pickable: false,
          radiusUnits: 'meters',
          radiusMinPixels: 6,
          parameters: {
            depthTest: false,
            depthMask: false
          }
        })
      );
    }

    // ======= INTERNAL TREE NODE GLOW LAYERS (NEON STYLE) =======
    if (highlightedTreeNodeData && highlightedTreeNodeData.length > 0) {
      // Outer glow - slightly different color to distinguish from leaf nodes
      result.push(
        new ScatterplotLayer({
          id: 'tree-node-glow-outer',
          data: highlightedTreeNodeData,
          getPosition: d => d.position || [0, 0],
          getRadius: d => (d.radius || 2) * 4,
          getFillColor: d => {
            const base = d?.color || themeColors.treeEdges || [100, 180, 255, 255];
            const [r, g, b] = toRgbaColor(base);
            return [r, g, b, 80];
          },
          stroked: false,
          filled: true,
          pickable: false,
          radiusUnits: 'meters',
          radiusMinPixels: 14,
          parameters: {
            blendFunc: [770, 1],
            depthTest: false,
            depthMask: false
          }
        })
      );

      // Mid glow
      result.push(
        new ScatterplotLayer({
          id: 'tree-node-glow-mid',
          data: highlightedTreeNodeData,
          getPosition: d => d.position || [0, 0],
          getRadius: d => (d.radius || 2) * 2.5,
          getFillColor: d => {
            const base = d?.color || themeColors.treeEdges || [100, 180, 255, 255];
            const [r, g, b] = toRgbaColor(base);
            return [r, g, b, 130];
          },
          stroked: false,
          filled: true,
          pickable: false,
          radiusUnits: 'meters',
          radiusMinPixels: 10,
          parameters: {
            blendFunc: [770, 1],
            depthTest: false,
            depthMask: false
          }
        })
      );

      // Core - bright center
      result.push(
        new ScatterplotLayer({
          id: 'tree-node-glow-core',
          data: highlightedTreeNodeData,
          getPosition: d => d.position || [0, 0],
          getRadius: d => (d.radius || 2) * 1.5,
          getFillColor: [255, 255, 255, 255],
          stroked: false,
          filled: true,
          pickable: false,
          radiusUnits: 'meters',
          radiusMinPixels: 5,
          parameters: {
            depthTest: false,
            depthMask: false
          }
        })
      );
    }

    // ======= BASELINE GLOW LAYERS (NEON STYLE) =======
    if (highlightedHoodData && highlightedHoodData.length > 0) {
      // Outer glow
      result.push(
        new LineLayer({
          id: 'hoods-glow-outer',
          data: highlightedHoodData,
          getSourcePosition: d => [d.start, d.trackY],
          getTargetPosition: d => [d.end, d.trackY],
          getColor: [255, 215, 80, 100],
          getWidth: 28,
          widthUnits: 'pixels',
          pickable: false,
          parameters: {
            blendFunc: [770, 1],
            depthTest: false,
            depthMask: false
          }
        })
      );

      // Core
      result.push(
        new LineLayer({
          id: 'hoods-glow-core',
          data: highlightedHoodData,
          getSourcePosition: d => [d.start, d.trackY],
          getTargetPosition: d => [d.end, d.trackY],
          getColor: [255, 255, 255, 255],
          getWidth: 3,
          widthUnits: 'pixels',
          pickable: false,
          parameters: {
            depthTest: false,
            depthMask: false
          }
        })
      );
    }

    return result;
  }, [
    // Only rebuild when highlighted data changes - no animation dependency
    highlightedGeneData,
    highlightedTreeLeafData,
    highlightedTreeNodeData,
    highlightedHoodData,
    // Minimal styling dependencies
    themeColors.geneFill,
    themeColors.treeEdges,
    config.gene?.fillColor,
    config.stroke?.hoodWidth,
    config.stroke?.lineWidth,
    // Gene geometry dependencies - needed for getGeneGlowPolygon to recalculate
    effectiveConfig.gene?.height,
    effectiveConfig.gene?.geneHeight,
    effectiveConfig.gene?.arrowheadHeight,
    effectiveConfig.genome?.xScalePercent,
    effectiveConfig.gene?.tipWidthFactor,
    // ySpacing affects trackY positions
    effectiveConfig.tree?.ySpacing,
    // genomeXScale and alignment affect gene coordinates
    genomeXScaleProp,
    alignmentVersion
  ]);

  // ========== ANIMATED GLOW EFFECT (BYPASS REACT) ==========
  // This function builds animated glow layers based on tick value
  // Uses 'common' units so glow scales proportionally with zoom
  const buildAnimatedGlowLayers = React.useCallback((tick) => {
    const result = [];
    
    // Animated pulse calculation - smooth sine wave
    const sineWave = Math.sin(tick * 0.2); // Speed of pulse (higher = faster)
    const pulseScale = 1 + (sineWave * 0.15); // 0.85 to 1.15 scale
    
    const toRgbaColor = (color) => {
      const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
      if (Array.isArray(color)) {
        const [r = 0, g = 0, b = 0, a = 255] = color;
        return [clamp(r), clamp(g), clamp(b), clamp(a ?? 255)];
      }
      return [150, 150, 150, 255];
    };

    // Get current gene geometry parameters
    const currentGeneHeight = effectiveConfig.gene?.height || geneHeight || DEFAULT_CONFIG.gene.height;
    const currentArrowheadHeight = effectiveConfig.gene?.arrowheadHeight ?? arrowheadHeight ?? DEFAULT_CONFIG.gene.arrowheadHeight;
    const TIP_WIDTH_FACTOR = effectiveConfig.gene?.tipWidthFactor || DEFAULT_CONFIG.gene.tipWidthFactor;

    // Helper to compute polygon from gene data with current geometry settings
    const computeGenePolygon = (d) => {
      const trackY = d.trackY;
      if (trackY === null || trackY === undefined) return d.polygon || [];

      let start = d.start;
      let end = d.end;
      if (start > end) {
        const temp = start;
        start = end;
        end = temp;
      }

      const length = Math.abs(end - start);
      const tipWidth = length * TIP_WIDTH_FACTOR;
      const halfH = currentGeneHeight / 2;
      const isForward = (d.strand === '+');

      // 5-vertex arrow when arrowheadHeight is 0
      if (currentArrowheadHeight < 0.1) {
        if (isForward) {
          return [
            [start, trackY - halfH],
            [end - tipWidth, trackY - halfH],
            [end, trackY],
            [end - tipWidth, trackY + halfH],
            [start, trackY + halfH]
          ];
        }
        return [
          [end, trackY - halfH],
          [start + tipWidth, trackY - halfH],
          [start, trackY],
          [start + tipWidth, trackY + halfH],
          [end, trackY + halfH]
        ];
      }

      // 7-vertex arrow with extended arrowhead
      const arrowheadHalfHeight = (halfH + currentArrowheadHeight / 2);
      if (isForward) {
        return [
          [start, trackY - halfH],
          [end - tipWidth, trackY - halfH],
          [end - tipWidth, trackY - arrowheadHalfHeight],
          [end, trackY],
          [end - tipWidth, trackY + arrowheadHalfHeight],
          [end - tipWidth, trackY + halfH],
          [start, trackY + halfH]
        ];
      }
      return [
        [end, trackY - halfH],
        [start + tipWidth, trackY - halfH],
        [start + tipWidth, trackY - arrowheadHalfHeight],
        [start, trackY],
        [start + tipWidth, trackY + arrowheadHalfHeight],
        [start + tipWidth, trackY + halfH],
        [end, trackY + halfH]
      ];
    };

    // ======= ANIMATED GENE GLOW =======
    if (highlightedGeneData && highlightedGeneData.length > 0) {
      const getGeneColor = (gene) => {
        const base = gene?.fillColor || themeColors.geneFill || config.gene?.fillColor || [100, 200, 255, 255];
        return toRgbaColor(base);
      };

      // Outer glow (pulsing) - proportional to gene height
      // Pulse width: 30% to 50% of gene height
      const pulseWidthOuter = currentGeneHeight * (0.3 + (sineWave * 0.2));
      const pulseOpacity = 150 + (sineWave * 50);
      
      result.push(
        new PolygonLayer({
          id: 'genes-glow-outer-anim',
          data: highlightedGeneData,
          getPolygon: computeGenePolygon, // Recalculate polygon with current settings
          stroked: true,
          filled: false,
          getLineWidth: pulseWidthOuter,
          getLineColor: d => {
            const [r, g, b] = getGeneColor(d);
            return [r, g, b, pulseOpacity];
          },
          lineWidthUnits: 'common', // Scales with zoom!
          pickable: false,
          parameters: { blendFunc: [770, 1], depthTest: false, depthMask: false }
        })
      );

      // Core (thin white line) - constant, not animated
      result.push(
        new PolygonLayer({
          id: 'genes-glow-core-anim',
          data: highlightedGeneData,
          getPolygon: computeGenePolygon, // Recalculate polygon with current settings
          stroked: true,
          filled: false,
          getLineColor: [255, 255, 255, 255],
          getLineWidth: currentGeneHeight * 0.03, // 3% of gene height
          lineWidthUnits: 'common',
          pickable: false,
          parameters: { depthTest: false, depthMask: false, polygonOffset: [-1, -1] }
        })
      );
    }

    // ======= ANIMATED TREE LEAF GLOW =======
    if (highlightedTreeLeafData && highlightedTreeLeafData.length > 0) {
      // Use gene height as reference for consistent sizing with other glows
      const baseGlowSize = currentGeneHeight * 2; // 200% of gene height as base for bigger glow
      
      // Helper to get valid node color - use the color stored in state (synced by effect on palette change)
      const getNodeColor = (d) => {
        const base = d?.color;
        if (base && Array.isArray(base) && base.some(c => c > 0)) {
          return toRgbaColor(base);
        }
        return [220, 180, 60, 255]; // Golden/amber fallback
      };
      
      // Outer glow halo - large and pulsing
      result.push(
        new ScatterplotLayer({
          id: 'tree-glow-outer-anim',
          data: highlightedTreeLeafData,
          getPosition: d => d.position || [0, 0],
          getRadius: baseGlowSize * (1.5 + sineWave * 0.5) * pulseScale,
          getFillColor: d => {
            const [r, g, b] = getNodeColor(d);
            return [r, g, b, Math.round(60 + sineWave * 30)];
          },
          stroked: false,
          filled: true,
          pickable: false,
          radiusUnits: 'common', // Scales with zoom like genes/baselines
          parameters: { blendFunc: [770, 1], depthTest: false, depthMask: false }
        })
      );

      // Mid glow - tighter, brighter
      result.push(
        new ScatterplotLayer({
          id: 'tree-glow-mid-anim',
          data: highlightedTreeLeafData,
          getPosition: d => d.position || [0, 0],
          getRadius: baseGlowSize * (0.8 + sineWave * 0.3) * pulseScale,
          getFillColor: d => {
            const [r, g, b] = getNodeColor(d);
            return [r, g, b, Math.round(120 + sineWave * 50)];
          },
          stroked: false,
          filled: true,
          pickable: false,
          radiusUnits: 'common',
          parameters: { blendFunc: [770, 1], depthTest: false, depthMask: false }
        })
      );

      // Core - solid center with node color
      result.push(
        new ScatterplotLayer({
          id: 'tree-glow-core-anim',
          data: highlightedTreeLeafData,
          getPosition: d => d.position || [0, 0],
          getRadius: baseGlowSize * 0.4, // 40% of base for solid core
          getFillColor: d => {
            const [r, g, b] = getNodeColor(d);
            return [r, g, b, 255];
          },
          stroked: false,
          filled: true,
          pickable: false,
          radiusUnits: 'common',
          parameters: { depthTest: false, depthMask: false }
        })
      );
    }

    // ======= ANIMATED INTERNAL TREE NODE GLOW =======
    if (highlightedTreeNodeData && highlightedTreeNodeData.length > 0) {
      // Use gene height as reference for consistent sizing with other glows
      const baseGlowSize = currentGeneHeight * 2.2; // Slightly larger for internal nodes
      
      // Helper to get valid node color
      const getInternalNodeColor = (d) => {
        const base = d?.color;
        if (base && Array.isArray(base) && base.some(c => c > 0)) {
          return toRgbaColor(base);
        }
        return [100, 180, 255, 255]; // Blue fallback for internal nodes
      };
      
      // Outer glow halo - large and pulsing
      result.push(
        new ScatterplotLayer({
          id: 'tree-node-glow-outer-anim',
          data: highlightedTreeNodeData,
          getPosition: d => d.position || [0, 0],
          getRadius: baseGlowSize * (1.6 + sineWave * 0.6) * pulseScale,
          getFillColor: d => {
            const [r, g, b] = getInternalNodeColor(d);
            return [r, g, b, Math.round(50 + sineWave * 30)];
          },
          stroked: false,
          filled: true,
          pickable: false,
          radiusUnits: 'common',
          parameters: { blendFunc: [770, 1], depthTest: false, depthMask: false }
        })
      );

      // Mid glow - tighter, brighter
      result.push(
        new ScatterplotLayer({
          id: 'tree-node-glow-mid-anim',
          data: highlightedTreeNodeData,
          getPosition: d => d.position || [0, 0],
          getRadius: baseGlowSize * (0.9 + sineWave * 0.35) * pulseScale,
          getFillColor: d => {
            const [r, g, b] = getInternalNodeColor(d);
            return [r, g, b, Math.round(110 + sineWave * 50)];
          },
          stroked: false,
          filled: true,
          pickable: false,
          radiusUnits: 'common',
          parameters: { blendFunc: [770, 1], depthTest: false, depthMask: false }
        })
      );

      // Core - solid center with node color
      result.push(
        new ScatterplotLayer({
          id: 'tree-node-glow-core-anim',
          data: highlightedTreeNodeData,
          getPosition: d => d.position || [0, 0],
          getRadius: baseGlowSize * 0.35,
          getFillColor: d => {
            const [r, g, b] = getInternalNodeColor(d);
            return [r, g, b, 255];
          },
          stroked: false,
          filled: true,
          pickable: false,
          radiusUnits: 'common',
          parameters: { depthTest: false, depthMask: false }
        })
      );
    }

    // ======= ANIMATED BASELINE GLOW =======
    if (highlightedHoodData && highlightedHoodData.length > 0) {
      const pulseWidthBaseline = 10 + (sineWave * 8);
      result.push(
        new LineLayer({
          id: 'hoods-glow-outer-anim',
          data: highlightedHoodData,
          getSourcePosition: d => [d.start, d.trackY],
          getTargetPosition: d => [d.end, d.trackY],
          getColor: [255, 215, 80, Math.round(150 + sineWave * 50)],
          getWidth: pulseWidthBaseline * pulseScale,
          widthUnits: 'common', // Scales with zoom
          pickable: false,
          parameters: { blendFunc: [770, 1], depthTest: false, depthMask: false }
        })
      );

      result.push(
        new LineLayer({
          id: 'hoods-glow-core-anim',
          data: highlightedHoodData,
          getSourcePosition: d => [d.start, d.trackY],
          getTargetPosition: d => [d.end, d.trackY],
          getColor: [255, 255, 255, 255],
          getWidth: 1,
          widthUnits: 'common',
          pickable: false,
          parameters: { depthTest: false, depthMask: false }
        })
      );
    }

    return result;
  }, [
    highlightedGeneData, 
    highlightedTreeLeafData, 
    highlightedTreeNodeData, 
    highlightedHoodData, 
    themeColors, 
    config.gene?.fillColor, 
    // Gene geometry dependencies - use effectiveConfig values
    effectiveConfig.gene?.height,
    effectiveConfig.gene?.geneHeight,
    effectiveConfig.gene?.arrowheadHeight, 
    effectiveConfig.gene?.tipWidthFactor,
    effectiveConfig.genome?.xScalePercent,
    // ySpacing affects trackY positions
    effectiveConfig.tree?.ySpacing,
    // genomeXScale and alignment affect gene coordinates
    genomeXScaleProp,
    alignmentVersion,
    // Tree/palette dependencies
    treeColorBy, 
    effectivePhyloPalette?.name, 
    effectivePhyloPalette?.enabled, 
    effectivePhyloPalette?.numColors, 
    effectivePhyloPalette?.reverse, 
    layers
  ]);

  // Check if there's any highlighted data
  const hasHighlightedData = highlightedGeneData?.length > 0 || highlightedTreeLeafData?.length > 0 || highlightedTreeNodeData?.length > 0 || highlightedHoodData?.length > 0;
  if (DEBUG_LOGS) console.log('[HoodiniViz] hasHighlightedData:', hasHighlightedData, 'treeLeaf:', highlightedTreeLeafData?.length, 'treeNode:', highlightedTreeNodeData?.length, 'hood:', highlightedHoodData?.length, 'gene:', highlightedGeneData?.length);

  // Animation loop that updates DeckGL directly (bypasses React)
  useEffect(() => {
    // Store base layers in ref for animation loop to access
    baseLayersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    // Cancel any existing animation
    if (glowAnimationRef.current) {
      cancelAnimationFrame(glowAnimationRef.current);
      glowAnimationRef.current = null;
    }

    // Only animate if there's highlighted data AND we have the deck instance
    if (!hasHighlightedData) {
      return;
    }

    // Small delay to ensure DeckGL ref is populated
    const startAnimation = () => {
      // Animation loop - uses requestAnimationFrame at ~30fps to reduce CPU load
      // Updates deck.gl directly via setProps() - NO React setState!
      let lastFrameTime = 0;
      const FRAME_INTERVAL = 33; // ~30fps for smooth but efficient animation
      
      const animate = (currentTime) => {
        // Throttle to ~30fps
        if (currentTime - lastFrameTime < FRAME_INTERVAL) {
          glowAnimationRef.current = requestAnimationFrame(animate);
          return;
        }
        lastFrameTime = currentTime;
        
        glowTickRef.current += 1;
        
        // Build new glow layers
        const newGlowLayers = buildAnimatedGlowLayers(glowTickRef.current);
        
        // Update DeckGL directly via deck.setProps() - bypasses React completely!
        // Access deck instance via ref.current.deck (DeckGL React component exposes it)
        const deckInstance = deckGlRef.current?.deck;
        if (deckInstance) {
          const combinedLayers = [...baseLayersRef.current, ...newGlowLayers];
          deckInstance.setProps({ layers: combinedLayers });
        }
        
        glowAnimationRef.current = requestAnimationFrame(animate);
      };

      // Start animation
      glowAnimationRef.current = requestAnimationFrame(animate);
    };
    
    // Start immediately (no delay needed since we don't use static glow)
    startAnimation();

    // Cleanup
    return () => {
      if (glowAnimationRef.current) {
        cancelAnimationFrame(glowAnimationRef.current);
        glowAnimationRef.current = null;
      }
    };
  }, [hasHighlightedData, buildAnimatedGlowLayers]);

  // Combine base layers - animation loop handles glow via deck.setProps()
  // We don't include static glowLayers to avoid the flash on first click
  const combinedLayers = React.useMemo(() => {
    return layers;
  }, [layers]);

  // Align cluster or set default alignment BEFORE DeckGL is initialized
  const isFirstRun = React.useRef(true);
  const previousAlignCluster = React.useRef(alignCluster);
  const previousDefaultAlign = React.useRef(defaultAlign);
  const previousUseDefaultGeneAlignment = React.useRef(useDefaultGeneAlignment);
  
  // Add protection against rapid re-triggers
  const lastAlignmentTime = React.useRef(0);
  const ALIGNMENT_DEBOUNCE_MS = 100; // Prevent alignment from running more than once per 100ms
  
  useEffect(() => {
    // CRITICAL: Skip ALL alignment effects if the console helper exists
    // The helper handles alignment directly, React effects should not interfere
    const w = window;
    if (typeof w.__hoodini_alignCluster === 'function') {
      if (DEBUG_LOGS) console.log('🚀 SKIPPING REACT ALIGNMENT EFFECT - HELPER EXISTS');
      // Update tracking refs but don't do any alignment
      previousAlignCluster.current = alignCluster;
      previousDefaultAlign.current = defaultAlign;
      previousUseDefaultGeneAlignment.current = useDefaultGeneAlignment;
      if (isFirstRun.current) isFirstRun.current = false;
      return;
    }
    
    const gv = genomeViewRef.current;
    if (!gv) return;
  
    // Skip alignment if we're in manual manipulation mode
    if (isManualManipulation.current) {
      return;
    }

    // Debounce rapid alignment triggers
    const now = performance.now();
    if (now - lastAlignmentTime.current < ALIGNMENT_DEBOUNCE_MS) {
      return;
    }

    // Check if alignment-related props actually changed
    const alignClusterChanged = alignCluster !== previousAlignCluster.current;
    const defaultAlignChanged = defaultAlign !== previousDefaultAlign.current;
    const useDefaultGeneAlignmentChanged = useDefaultGeneAlignment !== previousUseDefaultGeneAlignment.current;

    // Measure the delay between visual config update and alignment effect
    if (window._visualConfigUpdateTime) {
      const delay = performance.now() - window._visualConfigUpdateTime;
      window._visualConfigUpdateTime = null;
    }
  
    // Only run alignment if alignment props changed or first run (NOT on container size changes)
    let alignmentChanged = false;
    if (alignClusterChanged || defaultAlignChanged || useDefaultGeneAlignmentChanged || isFirstRun.current) {
      // On the very first run, skip only if there were no changes; but if a change
      // (e.g. user picked a cluster) happens before first-run completes, apply it.
      const shouldSkipInitial = isFirstRun.current && !alignClusterChanged && !defaultAlignChanged && !useDefaultGeneAlignmentChanged;
      if (!shouldSkipInitial) {
        const alignStartTime = performance.now();
        
        if (alignCluster != null && alignCluster !== '') {
          // alignCluster is set to a specific cluster value
          gv.alignCluster(alignCluster);
          alignmentChanged = true;
        } else {
          // No specific cluster alignment requested
          // Use default gene alignment if enabled and available, otherwise fall back to traditional alignment
          const hasDefaultGenes = Object.values(gv.hoodRanges || {}).some(hoodRange => hoodRange.align_gene);
          
          if (useDefaultGeneAlignment && hasDefaultGenes) {
            gv.alignByDefaultGenes();
            alignmentChanged = true;
          } else {
            // Fall back to traditional alignment
            if (defaultAlign === 'center') {
              gv.alignAllToCenter();
              alignmentChanged = true;
            } else if (defaultAlign === 'end') {
              gv.alignAllToEnd();
              alignmentChanged = true;
            } else {
              gv.alignAllToStart();
              alignmentChanged = true;
            }
          }
        }
        
        lastAlignmentTime.current = alignStartTime;
      }
    }
    
    // Handle view bounds - alignment changes need full recomputation, container changes just need viewport adjustment
    if (alignmentChanged) {
      // Force layer data recomputation since positions changed
      setAlignmentVersion(prev => prev + 1);
    } else if (isFirstRun.current) {
      // On first run, alignment was already applied during GenomeView creation
      // Don't call setAlignmentVersion() - layers will be computed anyway
    }
    
    if (isFirstRun.current) {
      isFirstRun.current = false;
    }
    
    // Always update previous values to prevent repeated triggers
    previousAlignCluster.current = alignCluster;
    previousDefaultAlign.current = defaultAlign;
    previousUseDefaultGeneAlignment.current = useDefaultGeneAlignment;
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alignCluster, defaultAlign, useDefaultGeneAlignment]); // REMOVED tree to prevent circular dependencies
  
  // Separate effect to handle container size changes without triggering alignment
  useEffect(() => {
    const gv = genomeViewRef.current;
    if (!gv) return;
    
    // Check if container size changed significantly (more than 10px in either dimension)
    // Ignore changes from initial {0,0} size - this is just the component mounting
    const isInitialSizeChange = containerSize.width === 0 && containerSize.height === 0;
    if (isInitialSizeChange) return;
    
  }, [containerSize, phyloLabelPosition]); // REMOVED tree dependency
  

  // Track user interaction to prevent fitViewToBounds conflicts
  const isUserInteracting = React.useRef(false);
  const interactionTimeout = React.useRef(null);

  // Reserve deckHeight for the deck.gl canvas when ruler is visible
  const deckHeight = Math.max(0, containerSize.height - (showRuler ? rulerHeight : 0));

  // Create a ref to hold the live viewState so child widgets (ruler/scrollbar)
  // can subscribe without forcing parent re-renders. Initialize it with the
  // current viewState so consumers have a value immediately.
  const viewStateRef = React.useRef(viewState);

  // Keep the ref in sync when the top-level viewState changes explicitly
  React.useEffect(() => {
    viewStateRef.current = viewState;
  }, [viewState]);

  // Expose export functionality via ref
  useImperativeHandle(ref, () => ({
    exportToSVG: () => {
      console.log('🖼️ HoodiniViz.exportToSVG called');
      // Use the latest viewState from the ref, not possibly stale state
      let liveViewState = viewStateRef.current || viewState;
      console.log('🖼️ HoodiniViz.exportToSVG - layers:', layers?.length, 'viewState:', !!liveViewState);
      console.log('🖼️ Scale to format check:', { scaleExportToFormat, cropToGuides, formatGuidePreset: !!formatGuidePreset, bounds: !!bounds });
      console.log(`🖼️ Bounds for export: minX=${bounds.minX?.toFixed(1)} maxX=${bounds.maxX?.toFixed(1)} minY=${bounds.minY?.toFixed(1)} maxY=${bounds.maxY?.toFixed(1)} selectedNode=${selectedNode?.name || 'null'}`);
      if (!layers || !liveViewState) {
        console.warn('🖼️ HoodiniViz.exportToSVG - missing layers or viewState, aborting');
        return;
      }
      
      // Calculate guide bounds in world coordinates if format guides are active AND crop to guides is enabled
      // This allows exporting exactly what's inside the guide rectangle
      let guideBounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;
      
      if (scaleExportToFormat && formatGuidePreset && cropToGuides) {
        console.log('🖼️ Crop to guides ACTIVE - calculating guide bounds');
        
        // Get format dimensions in pixels (same calculation as GuideOverlay)
        const dpi = formatGuidePreset.unit === 'mm' ? 300 : 96;
        const mmToInch = 1 / 25.4;
        let formatWidthPx: number;
        let formatHeightPx: number;
        
        if (formatGuidePreset.unit === 'mm') {
          formatWidthPx = formatGuidePreset.width * mmToInch * dpi;
          formatHeightPx = formatGuidePreset.height * mmToInch * dpi;
        } else {
          formatWidthPx = formatGuidePreset.width;
          formatHeightPx = formatGuidePreset.height;
        }
        
        // Calculate guide position in screen space (same as GuideOverlay)
        const padding = 40;
        const availableWidth = containerSize.width - 2 * padding;
        const availableHeight = deckHeight - 2 * padding;
        const scaleX = availableWidth / formatWidthPx;
        const scaleY = availableHeight / formatHeightPx;
        const guideScale = Math.min(scaleX, scaleY);
        
        const guideWidth = formatWidthPx * guideScale;
        const guideHeight = formatHeightPx * guideScale;
        const guideLeft = (containerSize.width - guideWidth) / 2;
        const guideTop = (deckHeight - guideHeight) / 2;
        const guideRight = guideLeft + guideWidth;
        const guideBottom = guideTop + guideHeight;
        
        // Convert screen coordinates to world coordinates using viewState
        const zoom = Math.pow(2, liveViewState.zoom || 0);
        const centerX = liveViewState.target[0];
        const centerY = liveViewState.target[1];
        
        // Screen to world conversion
        const screenToWorldX = (screenX: number) => centerX + (screenX - containerSize.width / 2) / zoom;
        const screenToWorldY = (screenY: number) => centerY + (deckHeight / 2 - screenY) / zoom; // Y is flipped
        
        guideBounds = {
          minX: screenToWorldX(guideLeft),
          maxX: screenToWorldX(guideRight),
          minY: screenToWorldY(guideBottom), // bottom in screen = min in world (Y flipped)
          maxY: screenToWorldY(guideTop)     // top in screen = max in world (Y flipped)
        };
        
        console.log('🖼️ Guide bounds in world coords:', guideBounds);
        console.log('🖼️ Guide screen coords:', { guideLeft, guideTop, guideRight, guideBottom, guideWidth, guideHeight });
      }
      
      const rulerProps = showRuler ? {
        minX: bounds.minX,
        maxX: bounds.maxX,
        width: containerSize.width,
        height: deckHeight,
        config: {
          ...config,
          tree: {
            ...config.tree,
            xScalePercent: effectiveTreeXScale
          }
        },
        viewState: liveViewState,
        alignmentReferencePoint: getAlignmentReferencePoint(genomeViewRef.current),
        bounds,
        genomeView: genomeViewRef.current,
        precomputedTicks: rulerWidgetRef.current ? rulerWidgetRef.current.getTicks() : undefined
      } : undefined;
      const svg = exportToSVG(
        layers,
        liveViewState,
        { width: containerSize.width, height: deckHeight },
        config,
        showRuler ? rulerProps : undefined,
        themeColors,
        5, // textScale
        1, // nodeScale
        // Pass format options including guide bounds for cropping (only if cropToGuides is enabled)
        scaleExportToFormat && formatGuidePreset ? {
          scaleToFormat: true,
          formatPreset: formatGuidePreset,
          guideBounds: cropToGuides ? guideBounds : null, // Only crop if checkbox is enabled
          scaleRulerWithCrop: scaleRulerWithCrop // Pass ruler scaling preference
        } : undefined
      );
      if (!svg) return;
      
      // If scale to format is active, the SVG was already created with the right dimensions
      // Just set the filename
      let finalSvg = svg;
      let filename = 'hoodini-viz-export.svg';
      
      if (scaleExportToFormat && formatGuidePreset) {
        const timestamp = new Date().toISOString().slice(0,19).replace(/[:-]/g, '');
        filename = `hoodini_${formatGuidePreset.name.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.svg`;
      }
      
      const blob = new Blob([finalSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  genomeView: genomeViewRef.current,
    // Force a re-evaluation of alignment-dependent layers
    forceAlignUpdate: () => {
      try {
        setAlignmentVersion(prev => prev + 1);
        return true;
      } catch (e) { return false; }
    },
    // Safe wrapper to align a cluster and refresh layers
    alignCluster: (clusterId) => {
      try {
        const gv = genomeViewRef.current;
        if (!gv || typeof gv.alignCluster !== 'function') return false;
        gv.alignCluster(clusterId);
        setAlignmentVersion(prev => prev + 1);
        return true;
      } catch (e) {
        
        return false;
      }
    },
    // Expose default-genes alignment for instant application from UI
    alignByDefaultGenes: () => {
      try {
        const gv = genomeViewRef.current;
        if (!gv || typeof gv.alignByDefaultGenes !== 'function') return false;
        gv.alignByDefaultGenes();
        setAlignmentVersion(prev => prev + 1);
        return true;
      } catch (e) { return false; }
    },
    // Zoom to a gene by original id (gene_id)
    focusGeneById: (geneId) => {
      try {
        if (!geneId) return false;
        const gv = genomeViewRef.current;
        if (!gv) return false;
        const idStr = String(geneId);
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
        if (!uniqueId) return false;
        const gene = gv.genesById[uniqueId];
        if (!gene) return false;
        const centerX = (gene.start + gene.end) / 2;
        const centerY = gene.trackY || 0;
        const liveZoom = (viewStateRef.current && viewStateRef.current.zoom !== undefined) ? viewStateRef.current.zoom : (viewState.zoom || -3);
        setViewState((prev) => ({
          ...prev,
          target: [centerX, centerY, 0],
          zoom: liveZoom,
        }));
        viewStateRef.current = { ...(viewStateRef.current || {}), target: [centerX, centerY, 0], zoom: liveZoom };
        // Pass the gene object for the glow layer (needs polygon data)
        triggerGeneFlash(uniqueId, gene);
        return true;
      } catch (e) { return false; }
    },
    // Zoom to a baseline/hood by hood_id
    focusBaselineByHood: (hoodId) => {
      try {
        stopGeneFlash();
        if (!hoodId) return false;
        const gv = genomeViewRef.current;
        if (!gv || !gv.hoodRanges) return false;
        const hood = String(hoodId);
        const b = gv.hoodRanges[hood];
        if (!b) return false;
        const offset = gv.trackOffset ? gv.trackOffset[hood] || 0 : 0;
        const flipped = gv.trackFlipped ? !!gv.trackFlipped[hood] : false;
        const anchor = b.length / 2;
        const hoodStart = 0;
        const hoodEnd = b.length;
        const transformedStart = gv.constructor.getTransformedXUnified(hoodStart, anchor, offset, flipped);
        const transformedEnd = gv.constructor.getTransformedXUnified(hoodEnd, anchor, offset, flipped);
        const genomeXScale = (effectiveConfig.genome && typeof effectiveConfig.genome.xScalePercent === 'number') ? effectiveConfig.genome.xScalePercent / 100 : 1;
        const scaledStart = anchor + (transformedStart - anchor) * genomeXScale;
        const scaledEnd = anchor + (transformedEnd - anchor) * genomeXScale;
        const centerX = (scaledStart + scaledEnd) / 2;
        const centerY = typeof gv.getTrackYByHoodId === 'function' ? (gv.getTrackYByHoodId(hood) || 0) : 0;
        const liveZoom = (viewStateRef.current && viewStateRef.current.zoom !== undefined) ? viewStateRef.current.zoom : (viewState.zoom || -3);
        setViewState((prev) => ({
          ...prev,
          target: [centerX, centerY, 0],
          zoom: liveZoom,
        }));
        viewStateRef.current = { ...(viewStateRef.current || {}), target: [centerX, centerY, 0], zoom: liveZoom };
        // Trigger baseline glow effect (mark as internal so flashHood effect doesn't overwrite)
        internalHoodHighlightRef.current = true;
        const seqid = gv.hoodToSeqidMap ? gv.hoodToSeqidMap[hood] : null;
        const hoodData = [{
          hood_id: hood,
          seqid,
          start: scaledStart,
          end: scaledEnd,
          trackY: centerY
        }];
        setHighlightedHoodData(hoodData);
        // Clear the internal flag after a delay to allow effect to skip
        setTimeout(() => { internalHoodHighlightRef.current = false; }, 100);
        return true;
      } catch (e) { return false; }
    },
    // Zoom to a tree leaf by id/name and trigger node flash
    focusTreeLeafById: (leafId) => {
      try {
        if (!leafId) return false;
        const treeObj = tree;
        if (!treeObj || !Array.isArray(treeObj.leafNodes)) return false;
        const idStr = String(leafId);
        const leaf = treeObj.leafNodes.find((l) => {
          return [l?.leaf_id, l?.metadata?.leaf_id, l?.metadata?.leaf_name, l?.name, l?.metadata?.name]
            .filter(v => v !== null && v !== undefined)
            .some(v => String(v) === idStr);
        });
        if (!leaf) return false;
        const rawY = Number.isFinite(Number(leaf.rawY)) ? Number(leaf.rawY) : Number(leaf.y);
        const rawX = Number.isFinite(Number(leaf.x)) ? Number(leaf.x) : Number(leaf.rawX);
        if (!Number.isFinite(rawY) || !Number.isFinite(rawX)) return false;
        const treeXScale = (config.tree && typeof config.tree.xScalePercent === 'number') ? config.tree.xScalePercent / 100 : 1;
        const treeOffset = bounds.treeOffset || 0;
        const target = [rawY * treeXScale + treeOffset, rawX, 0];
        const liveZoom = (viewStateRef.current && viewStateRef.current.zoom !== undefined) ? viewStateRef.current.zoom : (viewState.zoom || -3);
        setViewState((prev) => ({ ...prev, target, zoom: liveZoom }));
        viewStateRef.current = { ...(viewStateRef.current || {}), target, zoom: liveZoom };
        const targetId = String(leaf.leaf_id || leaf.metadata?.leaf_id || leaf.name || idStr);
        // Force glow even if the same node is requested consecutively
        setFlashTreeLeaf(null);
        setTimeout(() => setFlashTreeLeaf(targetId), 0);
        // Set highlighted tree leaf data for glow effect
        const nodeRadius = config?.tree?.nodeRadius || { internal: 4, leaf: 2 };
        // Get color from cached treeNodes (which have the computed colors)
        let leafColor = themeColors.treeEdges || [220, 180, 60, 255]; // Default fallback
        if (cachedTreeNodesRef.current?.nodes) {
          const cachedNode = cachedTreeNodesRef.current.nodes.find(n => 
            n.leaf_id === targetId || 
            n.name === targetId || 
            n.id === targetId ||
            n.metadata?.leaf_id === targetId
          );
          if (cachedNode?.color && Array.isArray(cachedNode.color) && cachedNode.color.some(c => c > 0)) {
            leafColor = cachedNode.color;
          }
        }
        const treeLeafData = [{
          id: targetId,
          position: [rawY * treeXScale + treeOffset, rawX],
          radius: nodeRadius.leaf || 2,
          color: leafColor
        }];
        if (DEBUG_LOGS) console.log('[focusTreeLeafById] Setting tree leaf highlight:', treeLeafData, 'cachedNodes:', cachedTreeNodesRef.current?.nodes?.length);
        setHighlightedTreeLeafData(treeLeafData);
        return true;
      } catch (e) { return false; }
    },
    // Expose a getter so external components (e.g. Sidebar) can synchronously
    // obtain the legend payload without waiting for onLegendChange propagation.
    getLegendData: () => {
      try {
        // buildLegendData is a memoized callback above
        return buildLegendData();
      } catch (e) {
        return null;
      }
    },
    // Expose current geneColorMap so sidebar can get up-to-date palette colors
    geneColorMap: geneColorMap
  }), [layers, viewState, config, showRuler, bounds, themeColors, effectiveTreeXScale, deckHeight, triggerGeneFlash, stopGeneFlash, scaleExportToFormat, formatGuidePreset, cropToGuides, scaleRulerWithCrop]);

  return (
  <div
      id="phylo-tree-viewer-container"
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100%',
    position: 'relative',
    overflow: 'hidden',
        background: themeColors?.background || 'var(--background, #ffffff)',
        color: themeColors?.text || 'var(--foreground, #222)'
      }}
    >
  {/* Debug HUD removed for production */}
      {/* Overlay buttons (top-right) */}
      
      <DeckGL
        ref={deckGlRef}
        views={[new OrthographicView({ flipY: false })]}
        controller={{
          dragPan: true,
          dragRotate: false,
          scrollZoom: {
            smooth: false,
            speed: 0.01
          },
          doubleClickZoom: false,  // Disable double-click zoom to reduce conflicts
          keyboard: false,         // Disable keyboard to reduce conflicts
          inertia: true,           // Enable inertia for smoother interactions
          transitionDuration: 0, // Short transition for smoother feel
          touchZoom: true,         // Enable touch zoom
          touchRotate: false       // Disable touch rotation
        }}
        // Update the live ref AND React state on camera moves
        // Clamp X/Y position within bounds + padding, and limit zoom dynamically
        onViewStateChange={e => {
          try {
            const vs = e.viewState;
            const paddingY = config?.scrollbar?.panPaddingY ?? 200;
            const paddingX = config?.scrollbar?.panPaddingX ?? 5000;
            
            // Calculate dynamic zoom limits based on data bounds and container size
            // minZoom: allow seeing all data + padding with some margin
            // maxZoom: allow zooming in to see individual genes clearly
            const dataRangeY = (maxY - minY) || 1000;
            const dataRangeX = (bounds.maxX - bounds.minX) || 10000;
            const containerH = containerSize.height || 600;
            const containerW = containerSize.width || 800;
            
            // minZoom: fit all data (Y or X, whichever needs more zoom out) with 50% margin
            const minZoomY = Math.log2(containerH / (dataRangeY * 1.5));
            const minZoomX = Math.log2(containerW / (dataRangeX * 1.5));
            const dynamicMinZoom = Math.min(minZoomY, minZoomX, config?.scrollbar?.minZoom ?? -5);
            
            // maxZoom: reasonable max (configurable, default 2)
            const dynamicMaxZoom = config?.scrollbar?.maxZoom ?? 2;
            
            // Clamp zoom
            if (isFinite(vs.zoom)) {
              vs.zoom = Math.max(dynamicMinZoom, Math.min(dynamicMaxZoom, vs.zoom));
            }
            
            // Clamp Y position if bounds are valid
            const clampedMinY = minY - paddingY;
            const clampedMaxY = maxY + paddingY;
            if (isFinite(clampedMinY) && isFinite(clampedMaxY) && clampedMaxY > clampedMinY) {
              const y = vs.target[1];
              const clampedY = Math.max(clampedMinY, Math.min(clampedMaxY, y));
              if (clampedY !== y) {
                vs.target = [vs.target[0], clampedY, vs.target[2] || 0];
              }
            }
            
            // Clamp X position if bounds are valid
            const clampedMinX = bounds.minX - paddingX;
            const clampedMaxX = bounds.maxX + paddingX;
            if (isFinite(clampedMinX) && isFinite(clampedMaxX) && clampedMaxX > clampedMinX) {
              const x = vs.target[0];
              const clampedX = Math.max(clampedMinX, Math.min(clampedMaxX, x));
              if (clampedX !== x) {
                vs.target = [clampedX, vs.target[1], vs.target[2] || 0];
              }
            }
            
            viewStateRef.current = vs;
          } catch (err) {
            // swallow any errors from rapid unmounting
          }
        }}
        initialViewState={viewState}
        layers={combinedLayers}
        pickingRadius={100}
        style={{ 
          width: '100vw',
          height: showRuler ? `${deckHeight}px` : `${deckHeight}px`,
          position: 'absolute',
          left: '0',
          top: '0',
          backgroundColor: 'transparent' // Ensure no white background shows through
        }}
        getTooltip={getTooltip}
        // Performance optimizations
        useDevicePixels={true}  // Reduce rendering resolution for better performance
        _animate={false}         // Disable internal animations
        // 🚀 ZOOM FIX: Add key to prevent DeckGL from reinitializing with default viewState during re-renders
        onClick={({object, x, y, srcEvent}) => {
          try {
            console.debug('[HoodiniViz] DeckGL onClick event', { objectType: object && object.metadata && object.metadata.type, object, x, y });
            // Get treeOffset from bounds for position calculations
            const treeOffset = bounds?.treeOffset || 0;
            const nodeRadius = effectiveConfig?.tree?.nodeRadius || { internal: 4, leaf: 2 };
            
            // Tree leaf click: flash/glow the leaf node
            const isLeafNode = object && object.node && Array.isArray(object.node.branchset) && object.node.branchset.length === 0;
            if (isLeafNode) {
              const leafId =
                object.node?.leaf_id ||
                object.node?.metadata?.leaf_id ||
                object.node?.metadata?.leaf_name ||
                object.node?.name ||
                object.node?.id;
              if (leafId) {
                setFlashTreeLeaf(null);
                setTimeout(() => setFlashTreeLeaf(String(leafId)), 0);
                // OVERLAY STRATEGY: Build highlighted tree leaf data directly
                // Use object.rawY/object.x from treeNode first, then fallback to nested node
                const rawY = Number.isFinite(Number(object.rawY)) ? Number(object.rawY) :
                             (Number.isFinite(Number(object.node?.y)) ? Number(object.node.y) : Number(object.node?.rawY));
                const rawX = Number.isFinite(Number(object.x)) ? Number(object.x) : Number(object.node?.x);
                const treeXScale = (effectiveConfig.tree && typeof effectiveConfig.tree.xScalePercent === 'number') ? effectiveConfig.tree.xScalePercent / 100 : 1;
                if (Number.isFinite(rawY) && Number.isFinite(rawX)) {
                  setHighlightedTreeLeafData([{
                    id: leafId,
                    position: [rawY * treeXScale + treeOffset, rawX],
                    radius: object.radius || nodeRadius.leaf || 2,
                    // Use object.color (computed treeNode color with palette) first
                    color: object.color || object.node?.color || themeColors.treeEdges || [220, 180, 60, 255]
                  }]);
                }
              }
            }
            const isGeneObject = object && (object.type === 'gene' || object.gene);
            const isHoodObject = object && object.type === 'hood';
            
            if (isGeneObject) {
              // OVERLAY STRATEGY: Pass the full gene object to avoid filtering large arrays
              const geneIdForFlash =
                object.id ||
                object.uniqueId ||
                (object.gene && (object.gene.uniqueId || object.gene.id || object.gene.gene_id || object.gene.originalGeneId));
              if (geneIdForFlash) {
                // Pass both ID and object - the object is stored directly for the glow layer
                triggerGeneFlash(geneIdForFlash, object);
              }
              // Clear other highlights when clicking a gene
              stopHoodFlash();
              stopTreeLeafFlash();
            } else {
              stopGeneFlash();
            }
            
            // Clear baseline highlight when clicking anything that's not a baseline
            if (!isHoodObject) {
              stopHoodFlash();
            }
            
            // Clear tree leaf highlight when clicking anything that's not a leaf node
            if (!isLeafNode) {
              stopTreeLeafFlash();
            }
            
            // If user clicked an internal tree node, toggle selection to filter by clade
            const isInternalNode = object && object.node && object.node.branchset && object.node.branchset.length > 0;
            if (isInternalNode) {
              const clicked = object.node;
              // Toggle: deselect if same node clicked twice
              if (selectedNode && selectedNode.id === clicked.id) {
                console.debug('[HoodiniViz] deselecting node', clicked.id);
                setSelectedNode(null);
                stopTreeNodeFlash(); // Clear glow when deselecting
              } else {
                console.debug('[HoodiniViz] selecting node', clicked.id);
                setSelectedNode(clicked);
                
                // Add glow effect for internal node
                // Use object.rawY/object.x from treeNode, or fallback to clicked (the nested node)
                const rawY = Number.isFinite(Number(object.rawY)) ? Number(object.rawY) : 
                             (Number.isFinite(Number(clicked.y)) ? Number(clicked.y) : Number(clicked.rawY));
                const rawX = Number.isFinite(Number(object.x)) ? Number(object.x) : Number(clicked.x);
                const treeXScale = (effectiveConfig.tree && typeof effectiveConfig.tree.xScalePercent === 'number') ? effectiveConfig.tree.xScalePercent / 100 : 1;
                if (Number.isFinite(rawY) && Number.isFinite(rawX)) {
                  // Use object.color (computed treeNode color) first, then fallback
                  setHighlightedTreeNodeData([{
                    id: clicked.id,
                    position: [rawY * treeXScale + treeOffset, rawX],
                    radius: object.radius || (nodeRadius && nodeRadius.internal) || 4,
                    color: object.color || themeColors.treeEdges || [100, 180, 255, 255]
                  }]);
                }
              }
            }
            // NOTE: Internal node glow is NOT cleared when clicking other objects
            // It stays visible as long as the clade is selected (linked to selectedNode)
          } catch (e) {
            console.warn('[HoodiniViz] onClick handler error', e);
          }
          if (object && onObjectClick) {
            try {
              console.debug('[HoodiniViz] forwarding click to onObjectClick', object && (object.type || object.metadata && object.metadata.type || object.node && 'tree-node'));
            } catch (e) {}
            onObjectClick(object);
          }
          if (!object) {
            stopGeneFlash();
            stopHoodFlash();
            stopTreeLeafFlash();
            // NOTE: Don't stop tree node flash on empty click - keep clade selection visible
          }
        }}
     
      />
  {/* Tree scale and legend are rendered by App for a consolidated control panel */}
  {/* Custom scrollbar removed: deck.gl + ruler area should not show a scrollbar */}
      {/* Ruler widget showing nucleotide coordinates */}
  {showRuler && (
        <div style={{
          position: 'absolute',
          left: '0',
          bottom: '0',
          width: '100%',
          height: `${rulerHeight}px`,
          transform: 'translateX(0)', // Always stay at position 0, let sidebar overlay naturally
          zIndex: 1
        }}>
          <RulerWidget
            ref={rulerWidgetRef}
            minX={bounds.minX}
            maxX={bounds.maxX}
    // Pass the live ref so the ruler can poll camera updates without
    // causing parent re-renders. Backwards-compatible `viewState` is
    // still provided for callers that expect static prop sync.
    viewState={viewState}
    viewStateRef={viewStateRef}
            containerWidth={containerSize.width}
            containerHeight={deckHeight}
            visible={showRuler}
            genomeView={genomeViewRef.current}
            hasNewick={hasNewick}
            alignmentReferencePoint={getAlignmentReferencePoint(genomeViewRef.current)}
            bounds={bounds}
            config={effectiveConfig}
          />
        </div>
      )}
      
      {/* Scrollbar widget */}
      {showScrollbar && (
        <ScrollbarWidget
          minY={scrollMinY}
          maxY={scrollMaxY}
          scrollNorm={scrollNorm}
          setScrollNorm={setScrollNorm}
          visibleFraction={visibleFraction}
          setViewState={setViewState}
          containerHeight={deckHeight}
          viewState={viewState}
          viewStateRef={viewStateRef}
          config={config}
          themeColors={themeColors}
        />
      )}
      
      {/* Format guides overlay */}
      <GuideOverlay
        visible={showFormatGuides}
        formatPreset={formatGuidePreset}
        containerWidth={containerSize.width}
        containerHeight={deckHeight}
        viewState={viewState}
        themeColors={{
          accent: themeColors.accent,
          border: themeColors.border,
        }}
      />
    </div>
  );
});

export default HoodiniViz;
