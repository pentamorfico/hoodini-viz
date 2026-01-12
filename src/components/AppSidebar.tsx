import * as React from "react"
import { Info, Settings, Palette, BookOpen, Crop } from "lucide-react"
import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { DEFAULT_CONFIG } from '@/config/visualizationConfig.js';

import {
  Sidebar,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// Load raw domain metadata header for dynamic dropdown options
// Text fallback removed; leave empty since data now comes from parquet.
const defaultDomainsMetadata = '';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiSelect } from "@/components/ui/multi-select"
import { isEmptyValue, normalizeKey } from '@/utils/valueUtils';
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import UnifiedPaletteWidget from '@/widgets/UnifiedPaletteWidget';
import LinkColorWidget from '@/widgets/LinkColorWidget';
import LegendWidget from '@/widgets/LegendWidget';
import GuideControlsWidget from '@/widgets/GuideControlsWidget';
import { ThemeToggle } from '@/components/ThemeToggle';
import ProteinViewer from '@/components/ProteinViewer3DMol';
import ErrorBoundary from '@/components/ErrorBoundary';
// Inline the SVG logo as raw text so the single-file build can embed it
import hoodiniLogoRaw from '@/assets/hoodini_logo.svg?raw';

// Convert raw SVG text to a data URL (base64) for use as image src.
// We keep this lazy so it only encodes when the module is evaluated in the browser.
const hoodiniLogoUrl = (() => {
  try {
    if (!hoodiniLogoRaw) return '';
    // Encode as base64 to ensure safe embedding
    if (typeof btoa === 'function') {
      return `data:image/svg+xml;base64,${btoa(hoodiniLogoRaw)}`;
    }
    // Node fallback
    return `data:image/svg+xml;utf8,${encodeURIComponent(hoodiniLogoRaw)}`;
  } catch (e) {
    return '';
  }
})();

// A permissive props type so this sidebar can be used with minimal props in TS
type AppSidebarProps = {
  [key: string]: any;
  variant?: any;
  className?: string;
  style?: React.CSSProperties;
};

// Viridis color palette interpolation function
const getViridisColor = (value: number): string => {
  // Coerce input to a finite number
  let num = Number(value);
  if (!isFinite(num)) num = 0;

  // Normalize value to 0-1 range
  const t = Math.max(0, Math.min(1, num / 100));

  // Viridis color interpolation (approximate values)
  const colors = [
    [68, 1, 84],    // Dark purple (0%)
    [59, 82, 139],  // Blue-purple (25%)
    [33, 144, 140], // Teal (50%)
    [93, 201, 99],  // Green (75%)
    [253, 231, 37]  // Yellow (100%)
  ];

  const scaledT = t * (colors.length - 1);
  // Ensure index is a valid integer within range
  let index = Math.floor(scaledT);
  if (!isFinite(index) || index < 0) index = 0;
  if (index >= colors.length - 1) {
    return `rgb(${colors[colors.length - 1].join(', ')})`;
  }

  const fraction = scaledT - index;

  const c1 = colors[index] || colors[0];
  const c2 = colors[index + 1] || colors[colors.length - 1];
  const [r1, g1, b1] = c1;
  const [r2, g2, b2] = c2;

  const r = Math.round(r1 + (r2 - r1) * fraction);
  const g = Math.round(g1 + (g2 - g1) * fraction);
  const b = Math.round(b1 + (b2 - b1) * fraction);

  return `rgb(${r}, ${g}, ${b})`;
};

// Semaphore palette: red -> orange -> yellow -> light green -> green
const getSemaphoreColor = (percent: number): string => {
  const p = Number(percent) || 0;
  if (!isFinite(p)) return 'transparent';
  if (p >= 90) return '#006400'; // dark green
  if (p >= 70) return '#7CFC00'; // light green (lime)
  if (p >= 50) return '#FFD700'; // yellow/gold
  if (p >= 30) return '#FFA500'; // orange
  return '#DC143C'; // red
};

export function AppSidebar({
  variant,
  // pass-through controlled props from App.tsx (optional)
  ultrametric: ultrametricProp,
  setUltrametric: setUltrametricProp,
  showConnectingLines: showConnectingLinesProp,
  setShowConnectingLines: setShowConnectingLinesProp,
  showScrollbar: showScrollbarProp,
  setShowScrollbar: setShowScrollbarProp,
  alignLabels: alignLabelsProp,
  setAlignLabels: setAlignLabelsProp,
  alignCluster: alignClusterProp,
  setAlignCluster: setAlignClusterProp,
  useDefaultGeneAlignment: useDefaultGeneAlignmentProp,
  setUseDefaultGeneAlignment: setUseDefaultGeneAlignmentProp,
  defaultAlign: defaultAlignProp,
  setDefaultAlign: setDefaultAlignProp,
  phyloLabelPosition: phyloLabelPositionProp,
  setPhyloLabelPosition: setPhyloLabelPositionProp,
  geneLabelPosition: geneLabelPositionProp,
  setGeneLabelPosition: setGeneLabelPositionProp,
  geneColorBy: geneColorByProp,
  setGeneColorBy: setGeneColorByProp,
  treeColorBy: treeColorByProp,
  setTreeColorBy: setTreeColorByProp,
  domainColorBy: domainColorByProp,
  setDomainColorBy: setDomainColorByProp,
  treeLabelBy: treeLabelByProp,
  setTreeLabelBy: setTreeLabelByProp,
  geneLabelBy: geneLabelByProp,
  setGeneLabelBy: setGeneLabelByProp,
  genePalette: genePaletteProp,
  setGenePalette: setGenePaletteProp,
  phyloPalette: phyloPaletteProp,
  setPhyloPalette: setPhyloPaletteProp,
  domainPalette: domainPaletteProp,
  setDomainPalette: setDomainPaletteProp,
  domainSource: domainSourceProp,
  setDomainSource: setDomainSourceProp,
  ncRNAPalette: ncRNAPaletteProp,
  setNcRNAPalette: setNcRNAPaletteProp,
  regionPalette: regionPaletteProp,
  setRegionPalette: setRegionPaletteProp,
  proteinLinkConfig: proteinLinkConfigProp,
  setProteinLinkConfig: setProteinLinkConfigProp,
  nucleotideLinkConfig: nucleotideLinkConfigProp,
  setNucleotideLinkConfig: setNucleotideLinkConfigProp,
  treeXScale: treeXScaleProp,
  setTreeXScale: setTreeXScaleProp,
  viewerLegend: viewerLegendProp,
  setViewerLegend: setViewerLegendProp,
  styleConfig: styleConfigProp,
  setStyleConfig: setStyleConfigProp,
  phyloTreeViewerRef: phyloTreeViewerRefProp,
  geneMetadataColumns: geneMetadataColumnsProp,
  setGeneMetadataColumns: setGeneMetadataColumnsProp,
  treeMetadataColumns: treeMetadataColumnsProp,
  setTreeMetadataColumns: setTreeMetadataColumnsProp,
  domainMetadataColumns: domainMetadataColumnsProp,
  setDomainMetadataColumns: setDomainMetadataColumnsProp,
  selectedGene: selectedGeneProp,
  handleTrackShiftMinus1kb: handleTrackShiftMinus1kbProp,
  handleTrackShiftPlus1kb: handleTrackShiftPlus1kbProp,
  handleTrackFlip: handleTrackFlipProp,
  handleArrowheadHeightChange: handleArrowheadHeightChangeProp,
  handleGeneHeightChange: handleGeneHeightChangeProp,
  showTreeLayer: showTreeLayerProp,
  setShowTreeLayer: setShowTreeLayerProp,
  showGeneLayer: showGeneLayerProp,
  setShowGeneLayer: setShowGeneLayerProp,
  showDomainLayer: showDomainLayerProp,
  setShowDomainLayer: setShowDomainLayerProp,
  showProteinLinkLayer: showProteinLinkLayerProp,
  setShowProteinLinkLayer: setShowProteinLinkLayerProp,
  showNucleotideLinkLayer: showNucleotideLinkLayerProp,
  setShowNucleotideLinkLayer: setShowNucleotideLinkLayerProp,
  showNcRNALayer: showNcRNALayerProp,
  setShowNcRNALayer: setShowNcRNALayerProp,
  showGeneTextLayer: showGeneTextLayerProp,
  setShowGeneTextLayer: setShowGeneTextLayerProp,
  showTreeTextLayer: showTreeTextLayerProp,
  setShowTreeTextLayer: setShowTreeTextLayerProp,
  hasGeneData,
  hasDomainData,
  hasProteinLinkData,
  hasNucleotideLinkData,
  hasNcRNAData,
  // Format guide props
  showFormatGuides: showFormatGuidesProp,
  setShowFormatGuides: setShowFormatGuidesProp,
  formatGuidePreset: formatGuidePresetProp,
  setFormatGuidePreset: setFormatGuidePresetProp,
  scaleExportToFormat: scaleExportToFormatProp,
  setScaleExportToFormat: setScaleExportToFormatProp,
  cropToGuides: cropToGuidesProp,
  setCropToGuides: setCropToGuidesProp,
  scaleRulerWithCrop: scaleRulerWithCropProp,
  setScaleRulerWithCrop: setScaleRulerWithCropProp,
  // New visual settings props
  ySpacing: ySpacingProp,
  setYSpacing: setYSpacingProp,
  phyloLabelSize: phyloLabelSizeProp,
  setPhyloLabelSize: setPhyloLabelSizeProp,
  geneLabelSize: geneLabelSizeProp,
  setGeneLabelSize: setGeneLabelSizeProp,
  strokeLineWidth: strokeLineWidthProp,
  setStrokeLineWidth: setStrokeLineWidthProp,
  genomeXScale: genomeXScaleProp,
  setGenomeXScale: setGenomeXScaleProp,
  // Filter custom props that shouldn't pass to DOM
  arrowheadHeight: _arrowheadHeight,
  geneHeight: _geneHeight,
  ...props
}: AppSidebarProps) {
  // Theme context for logo styling and background colors
  const { resolvedTheme, getThemeColors } = useTheme();
  const themeColors = React.useMemo(() => getThemeColors(resolvedTheme), [resolvedTheme]);
  
  // Active section state - controls which content is shown
  const [activeSection, setActiveSection] = useState('info'); // 'info', 'settings', 'palette', 'legend'
  
  // Local fallback state for controls when parent doesn't provide them
  const [localUltrametric, setLocalUltrametric] = useState(false);
  const ultrametric = typeof ultrametricProp !== 'undefined' ? ultrametricProp : localUltrametric;
  const setUltrametric = typeof setUltrametricProp === 'function' ? setUltrametricProp : setLocalUltrametric;

  const [localShowConnectingLines, setLocalShowConnectingLines] = useState(false);
  const showConnectingLines = typeof showConnectingLinesProp !== 'undefined' ? showConnectingLinesProp : localShowConnectingLines;
  const setShowConnectingLines = typeof setShowConnectingLinesProp === 'function' ? setShowConnectingLinesProp : setLocalShowConnectingLines;

  const [localShowScrollbar, setLocalShowScrollbar] = useState(false);
  const showScrollbar = typeof showScrollbarProp !== 'undefined' ? showScrollbarProp : localShowScrollbar;
  const setShowScrollbar = typeof setShowScrollbarProp === 'function' ? setShowScrollbarProp : setLocalShowScrollbar;

  const [localAlignLabels, setLocalAlignLabels] = useState(false);
  const alignLabels = typeof alignLabelsProp !== 'undefined' ? alignLabelsProp : localAlignLabels;
  const setAlignLabels = typeof setAlignLabelsProp === 'function' ? setAlignLabelsProp : setLocalAlignLabels;

  const [localAlignCluster, setLocalAlignCluster] = useState(null);
  const alignCluster = typeof alignClusterProp !== 'undefined' ? alignClusterProp : localAlignCluster;
  const setAlignCluster = typeof setAlignClusterProp === 'function' ? setAlignClusterProp : setLocalAlignCluster;

  const [localUseDefaultGeneAlignment, setLocalUseDefaultGeneAlignment] = useState(false);
  const useDefaultGeneAlignment = typeof useDefaultGeneAlignmentProp !== 'undefined' ? useDefaultGeneAlignmentProp : localUseDefaultGeneAlignment;
  const setUseDefaultGeneAlignment = typeof setUseDefaultGeneAlignmentProp === 'function' ? setUseDefaultGeneAlignmentProp : setLocalUseDefaultGeneAlignment;

  const [localDefaultAlign, setLocalDefaultAlign] = useState('start');
  const defaultAlign = typeof defaultAlignProp !== 'undefined' ? defaultAlignProp : localDefaultAlign;
  const setDefaultAlign = typeof setDefaultAlignProp === 'function' ? setDefaultAlignProp : setLocalDefaultAlign;

  const [localPhyloLabelPosition, setLocalPhyloLabelPosition] = useState('after-tree');
  const phyloLabelPosition = typeof phyloLabelPositionProp !== 'undefined' ? phyloLabelPositionProp : localPhyloLabelPosition;
  const setPhyloLabelPosition = typeof setPhyloLabelPositionProp === 'function' ? setPhyloLabelPositionProp : setLocalPhyloLabelPosition;

  // Local display state for sliders - only updates during drag, doesn't trigger expensive recalculations
  // The committed value (what PhyloTreeViewer uses) is managed by parent via handleArrowheadHeightChangeProp/handleGeneHeightChangeProp
  const [arrowheadHeightDisplay, setArrowheadHeightDisplay] = useState(DEFAULT_CONFIG.gene.arrowheadHeight);
  const [geneHeightDisplay, setGeneHeightDisplay] = useState(DEFAULT_CONFIG.gene.height);

  const [localGeneLabelPosition, setLocalGeneLabelPosition] = useState('bottom');
  const geneLabelPosition = typeof geneLabelPositionProp !== 'undefined' ? geneLabelPositionProp : localGeneLabelPosition;
  const setGeneLabelPosition = typeof setGeneLabelPositionProp === 'function' ? setGeneLabelPositionProp : setLocalGeneLabelPosition;

  const [localGeneColorBy, setLocalGeneColorBy] = useState('');
  const geneColorBy = typeof geneColorByProp !== 'undefined' ? geneColorByProp : localGeneColorBy;
  const setGeneColorBy = typeof setGeneColorByProp === 'function' ? setGeneColorByProp : setLocalGeneColorBy;

  const [localTreeColorBy, setLocalTreeColorBy] = useState('');
  const treeColorBy = typeof treeColorByProp !== 'undefined' ? treeColorByProp : localTreeColorBy;
  const setTreeColorBy = typeof setTreeColorByProp === 'function' ? setTreeColorByProp : setLocalTreeColorBy;

  const [localDomainColorBy, setLocalDomainColorBy] = useState('domainName');
  const domainColorBy = typeof domainColorByProp !== 'undefined' ? domainColorByProp : localDomainColorBy;
  const setDomainColorBy = typeof setDomainColorByProp === 'function' ? setDomainColorByProp : setLocalDomainColorBy;

  const [localTreeLabelBy, setLocalTreeLabelBy] = useState('');
  const treeLabelBy = typeof treeLabelByProp !== 'undefined' ? treeLabelByProp : localTreeLabelBy;
  const setTreeLabelBy = typeof setTreeLabelByProp === 'function' ? setTreeLabelByProp : setLocalTreeLabelBy;

  const [localGeneLabelBy, setLocalGeneLabelBy] = useState('');
  const geneLabelBy = typeof geneLabelByProp !== 'undefined' ? geneLabelByProp : localGeneLabelBy;
  const setGeneLabelBy = typeof setGeneLabelByProp === 'function' ? setGeneLabelByProp : setLocalGeneLabelBy;

  const [localGenePalette, setLocalGenePalette] = useState({ enabled: false });
  const genePalette = typeof genePaletteProp !== 'undefined' ? genePaletteProp : localGenePalette;
  const setGenePalette = typeof setGenePaletteProp === 'function' ? setGenePaletteProp : setLocalGenePalette;

  const [localPhyloPalette, setLocalPhyloPalette] = useState({ enabled: false });
  const phyloPalette = typeof phyloPaletteProp !== 'undefined' ? phyloPaletteProp : localPhyloPalette;
  const setPhyloPalette = typeof setPhyloPaletteProp === 'function' ? setPhyloPaletteProp : setLocalPhyloPalette;

  const [localDomainPalette, setLocalDomainPalette] = useState({ enabled: false });
  const domainPalette = typeof domainPaletteProp !== 'undefined' ? domainPaletteProp : localDomainPalette;
  const setDomainPalette = typeof setDomainPaletteProp === 'function' ? setDomainPaletteProp : setLocalDomainPalette;

  const [localDomainSource, setLocalDomainSource] = useState('all');
  const domainSource = typeof domainSourceProp !== 'undefined' ? domainSourceProp : localDomainSource;
  const setDomainSource = typeof setDomainSourceProp === 'function' ? setDomainSourceProp : setLocalDomainSource;

  const [localNcRNAPalette, setLocalNcRNAPalette] = useState({ enabled: false });
  const ncRNAPalette = typeof ncRNAPaletteProp !== 'undefined' ? ncRNAPaletteProp : localNcRNAPalette;
  const setNcRNAPalette = typeof setNcRNAPaletteProp === 'function' ? setNcRNAPaletteProp : setLocalNcRNAPalette;

  const [localRegionPalette, setLocalRegionPalette] = useState({ enabled: false });
  const regionPalette = typeof regionPaletteProp !== 'undefined' ? regionPaletteProp : localRegionPalette;
  const setRegionPalette = typeof setRegionPaletteProp === 'function' ? setRegionPaletteProp : setLocalRegionPalette;

  const [localProteinLinkConfig, setLocalProteinLinkConfig] = useState(null);
  const proteinLinkConfig = typeof proteinLinkConfigProp !== 'undefined' ? proteinLinkConfigProp : localProteinLinkConfig;
  const setProteinLinkConfig = typeof setProteinLinkConfigProp === 'function' ? setProteinLinkConfigProp : setLocalProteinLinkConfig;

  const [localNucleotideLinkConfig, setLocalNucleotideLinkConfig] = useState(null);
  const nucleotideLinkConfig = typeof nucleotideLinkConfigProp !== 'undefined' ? nucleotideLinkConfigProp : localNucleotideLinkConfig;
  const setNucleotideLinkConfig = typeof setNucleotideLinkConfigProp === 'function' ? setNucleotideLinkConfigProp : setLocalNucleotideLinkConfig;

  // Local display state for treeXScale slider - only updates during drag
  const [treeXScaleDisplay, setTreeXScaleDisplay] = useState(DEFAULT_CONFIG.tree.xScalePercent);

  const [localViewerLegend, setLocalViewerLegend] = useState(null);
  const viewerLegend = typeof viewerLegendProp !== 'undefined' ? viewerLegendProp : localViewerLegend;
  const setViewerLegend = typeof setViewerLegendProp === 'function' ? setViewerLegendProp : setLocalViewerLegend;

  const [localStyleConfig, setLocalStyleConfig] = useState(null);
  const styleConfig = typeof styleConfigProp !== 'undefined' ? styleConfigProp : localStyleConfig;
  const setStyleConfig = typeof setStyleConfigProp === 'function' ? setStyleConfigProp : setLocalStyleConfig;

  // Format guide states
  const [localShowFormatGuides, setLocalShowFormatGuides] = useState(false);
  const showFormatGuides = typeof showFormatGuidesProp !== 'undefined' ? showFormatGuidesProp : localShowFormatGuides;
  const setShowFormatGuides = typeof setShowFormatGuidesProp === 'function' ? setShowFormatGuidesProp : setLocalShowFormatGuides;

  const [localFormatGuidePreset, setLocalFormatGuidePreset] = useState(null);
  const formatGuidePreset = typeof formatGuidePresetProp !== 'undefined' ? formatGuidePresetProp : localFormatGuidePreset;
  const setFormatGuidePreset = typeof setFormatGuidePresetProp === 'function' ? setFormatGuidePresetProp : setLocalFormatGuidePreset;

  const [localScaleExportToFormat, setLocalScaleExportToFormat] = useState(false);
  const scaleExportToFormat = typeof scaleExportToFormatProp !== 'undefined' ? scaleExportToFormatProp : localScaleExportToFormat;
  const setScaleExportToFormat = typeof setScaleExportToFormatProp === 'function' ? setScaleExportToFormatProp : setLocalScaleExportToFormat;

  const [localCropToGuides, setLocalCropToGuides] = useState(true); // Default to true
  const cropToGuides = typeof cropToGuidesProp !== 'undefined' ? cropToGuidesProp : localCropToGuides;
  const setCropToGuides = typeof setCropToGuidesProp === 'function' ? setCropToGuidesProp : setLocalCropToGuides;

  const [localScaleRulerWithCrop, setLocalScaleRulerWithCrop] = useState(true); // Default to true
  const scaleRulerWithCrop = typeof scaleRulerWithCropProp !== 'undefined' ? scaleRulerWithCropProp : localScaleRulerWithCrop;
  const setScaleRulerWithCrop = typeof setScaleRulerWithCropProp === 'function' ? setScaleRulerWithCropProp : setLocalScaleRulerWithCrop;

  // New visual settings states with display states for responsive sliders
  const [ySpacingDisplay, setYSpacingDisplay] = useState(DEFAULT_CONFIG.tree.ySpacing);
  const [localYSpacing, setLocalYSpacing] = useState(DEFAULT_CONFIG.tree.ySpacing);
  const ySpacing = typeof ySpacingProp !== 'undefined' ? ySpacingProp : localYSpacing;
  const setYSpacing = typeof setYSpacingProp === 'function' ? setYSpacingProp : setLocalYSpacing;

  const [phyloLabelSizeDisplay, setPhyloLabelSizeDisplay] = useState(DEFAULT_CONFIG.text.phyloLabelSize);
  const [localPhyloLabelSize, setLocalPhyloLabelSize] = useState(DEFAULT_CONFIG.text.phyloLabelSize);
  const phyloLabelSize = typeof phyloLabelSizeProp !== 'undefined' ? phyloLabelSizeProp : localPhyloLabelSize;
  const setPhyloLabelSize = typeof setPhyloLabelSizeProp === 'function' ? setPhyloLabelSizeProp : setLocalPhyloLabelSize;

  const [geneLabelSizeDisplay, setGeneLabelSizeDisplay] = useState(DEFAULT_CONFIG.text.geneLabelSize);
  const [localGeneLabelSize, setLocalGeneLabelSize] = useState(DEFAULT_CONFIG.text.geneLabelSize);
  const geneLabelSize = typeof geneLabelSizeProp !== 'undefined' ? geneLabelSizeProp : localGeneLabelSize;
  const setGeneLabelSize = typeof setGeneLabelSizeProp === 'function' ? setGeneLabelSizeProp : setLocalGeneLabelSize;

  const [strokeLineWidthDisplay, setStrokeLineWidthDisplay] = useState(DEFAULT_CONFIG.gene.edgeWidth);
  const [localStrokeLineWidth, setLocalStrokeLineWidth] = useState(DEFAULT_CONFIG.gene.edgeWidth);
  const strokeLineWidth = typeof strokeLineWidthProp !== 'undefined' ? strokeLineWidthProp : localStrokeLineWidth;
  const setStrokeLineWidth = typeof setStrokeLineWidthProp === 'function' ? setStrokeLineWidthProp : setLocalStrokeLineWidth;

  const [genomeXScaleDisplay, setGenomeXScaleDisplay] = useState(DEFAULT_CONFIG.genome?.xScalePercent || 30);
  const [localGenomeXScale, setLocalGenomeXScale] = useState(DEFAULT_CONFIG.genome?.xScalePercent || 30);
  const genomeXScale = typeof genomeXScaleProp !== 'undefined' ? genomeXScaleProp : localGenomeXScale;
  const setGenomeXScale = typeof setGenomeXScaleProp === 'function' ? setGenomeXScaleProp : setLocalGenomeXScale;

  const phyloTreeViewerRef = phyloTreeViewerRefProp || useRef(null);

  // Use layer visibility props when provided, fall back to local state
  const [localShowTreeLayer, setLocalShowTreeLayer] = useState(true);
  const [localShowGeneLayer, setLocalShowGeneLayer] = useState(true);
  const [localShowDomainLayer, setLocalShowDomainLayer] = useState(true);
  const [localShowProteinLinkLayer, setLocalShowProteinLinkLayer] = useState(true);
  const [localShowNucleotideLinkLayer, setLocalShowNucleotideLinkLayer] = useState(true);
  const [localShowNcRNALayer, setLocalShowNcRNALayer] = useState(true);
  const [localShowGeneTextLayer, setLocalShowGeneTextLayer] = useState(true);
  const [localShowTreeTextLayer, setLocalShowTreeTextLayer] = useState(true);
  
  const showTreeLayer = showTreeLayerProp !== undefined ? showTreeLayerProp : localShowTreeLayer;
  const setShowTreeLayer = setShowTreeLayerProp || setLocalShowTreeLayer;
  const showGeneLayer = showGeneLayerProp !== undefined ? showGeneLayerProp : localShowGeneLayer;
  const setShowGeneLayer = setShowGeneLayerProp || setLocalShowGeneLayer;
  const showDomainLayer = showDomainLayerProp !== undefined ? showDomainLayerProp : localShowDomainLayer;
  const setShowDomainLayer = setShowDomainLayerProp || setLocalShowDomainLayer;
  const showProteinLinkLayer = showProteinLinkLayerProp !== undefined ? showProteinLinkLayerProp : localShowProteinLinkLayer;
  const setShowProteinLinkLayer = setShowProteinLinkLayerProp || setLocalShowProteinLinkLayer;
  const showNucleotideLinkLayer = showNucleotideLinkLayerProp !== undefined ? showNucleotideLinkLayerProp : localShowNucleotideLinkLayer;
  const setShowNucleotideLinkLayer = setShowNucleotideLinkLayerProp || setLocalShowNucleotideLinkLayer;
  const showNcRNALayer = showNcRNALayerProp !== undefined ? showNcRNALayerProp : localShowNcRNALayer;
  const setShowNcRNALayer = setShowNcRNALayerProp || setLocalShowNcRNALayer;
  const showGeneTextLayer = showGeneTextLayerProp !== undefined ? showGeneTextLayerProp : localShowGeneTextLayer;
  const setShowGeneTextLayer = setShowGeneTextLayerProp || setLocalShowGeneTextLayer;
  const showTreeTextLayer = showTreeTextLayerProp !== undefined ? showTreeTextLayerProp : localShowTreeTextLayer;
  const setShowTreeTextLayer = setShowTreeTextLayerProp || setLocalShowTreeTextLayer;
  
  // Protein folding states
  const [foldingSequence, setFoldingSequence] = useState(null);
  const [foldingStatus, setFoldingStatus] = useState('idle'); // 'idle', 'folding', 'success', 'error'
  const [foldedStructure, setFoldedStructure] = useState(null);
  // Track which gene the viewer is currently associated with
  const [lastViewerGeneId, setLastViewerGeneId] = useState<string | null>(null);
  
  // Live cluster options computed from GenomeView at runtime
  const [availableClusters, setAvailableClusters] = useState<Array<{ id: string, size: number, label: string }>>([]);

  // Live clusters discovered from the viewer (if available)
  const [liveClusters, setLiveClusters] = useState<Array<string|number>>([]);

  const refreshClusters = React.useCallback(() => {
    try {
      const gv = (phyloTreeViewerRefProp && phyloTreeViewerRefProp.current) ? phyloTreeViewerRefProp.current.genomeView : null;
      
      if (!gv) {
        setLiveClusters([]);
        setAvailableClusters([]);
        return;
      }
      
      // Use cached summary on GenomeView (cheap) - don't invalidate cache
      const summary = (typeof gv.getClusterSummary === 'function') ? gv.getClusterSummary() : null;
      
      if (summary && Array.isArray(summary.items) && summary.items.length > 0) {
        setAvailableClusters([...summary.items]);
        setLiveClusters([...(summary.ids || [])]);
      } else {
        setAvailableClusters([]);
        setLiveClusters([]);
      }
    } catch (e) {
      setLiveClusters([]);
      setAvailableClusters([]);
    }
  }, [phyloTreeViewerRefProp]);

  // Compute clusters once after mount (use cached summary from GenomeView)
  useEffect(() => {
    refreshClusters();
    // Intentionally only run once on mount — the model will update its own cache when clusters change.
  }, []);

  // Also refresh clusters when the viewer reference changes or when gene data becomes available
  useEffect(() => {
    if (phyloTreeViewerRefProp?.current?.genomeView) {
      // Small delay to ensure GenomeView is fully initialized
      setTimeout(() => {
        refreshClusters();
      }, 100);
    }
  }, [phyloTreeViewerRefProp?.current?.genomeView, hasGeneData]);

  // Additional refresh when protein metadata or clusters are attached
  useEffect(() => {
    const gv = phyloTreeViewerRefProp?.current?.genomeView;
    if (gv && gv.proteinClusters && Object.keys(gv.proteinClusters).length > 0) {
      refreshClusters();
    }
  }, [phyloTreeViewerRefProp?.current?.genomeView?.proteinClusters]);

  // Debug: expose cluster refresh globally for console testing
  useEffect(() => {
    const w = window as any;
    w.__hoodini_refreshClusters = () => {
      refreshClusters();
      return { availableClusters, liveClusters };
    };
    w.__hoodini_clusterState = () => ({ availableClusters, liveClusters });
    
    // Also expose the GenomeView for direct inspection
    w.__hoodini_getGenomeView = () => {
      return (phyloTreeViewerRefProp && phyloTreeViewerRefProp.current) ? phyloTreeViewerRefProp.current.genomeView : null;
    };
    
    return () => {
      delete w.__hoodini_refreshClusters;
      delete w.__hoodini_clusterState;
      delete w.__hoodini_getGenomeView;
    };
  }, [availableClusters, liveClusters, refreshClusters]);

  // Auto-refresh clusters periodically when in settings mode and no clusters are found
  useEffect(() => {
    if (activeSection !== 'settings') return;
    if (availableClusters.length > 0) return; // Already have clusters
    
    const interval = setInterval(() => {
      refreshClusters();
    }, 5000); // Check every 5 seconds (reduced for performance)
    
    return () => clearInterval(interval);
  }, [activeSection, availableClusters.length, refreshClusters]);

  // Limit clusters shown in dropdown to top 50 (sorted by size, largest first)
  // This prevents rendering 3000+ SelectItems which is extremely slow
  const MAX_CLUSTERS_IN_DROPDOWN = 50;
  const limitedClusters = React.useMemo(() => {
    // availableClusters is already sorted by size (largest first) from getClusterSummary
    return availableClusters.slice(0, MAX_CLUSTERS_IN_DROPDOWN);
  }, [availableClusters]);

  // Memoize SelectItem nodes to avoid re-creating many React nodes on every render
  const clusterSelectItems = React.useMemo(() => {
    const items = limitedClusters.map(cluster => (
      <SelectItem key={cluster.id} value={String(cluster.id)}>
        {cluster.label}
      </SelectItem>
    ));
    return items;
  }, [limitedClusters]);

  // Metadata column fallbacks and dynamic extraction
  const geneMetadataColumns = (geneMetadataColumnsProp && geneMetadataColumnsProp.length > 0) ? geneMetadataColumnsProp : ['cluster', 'species', 'geneType'];
  const treeMetadataColumns = (treeMetadataColumnsProp && treeMetadataColumnsProp.length > 0) ? treeMetadataColumnsProp : ['species', 'branchLength', 'support'];
  // Domain metadata columns: read header line from raw file to include all metadata fields
  const headerLine = (defaultDomainsMetadata || '').trim().split(/\r?\n/)[0] || '';
  // Trim and filter out empty names and the raw 'domain_id' field if present
  const metadataFields = headerLine.split(/\t/)
    .map(col => (col || '').trim())
    .filter(col => col !== '' && col.toLowerCase() !== 'domain_id');
  const builtInFields = ['domainName', 'start', 'end', 'evalue', 'coverage'];
  // Use props when available, otherwise use header-based fields
  const domainMetadataColumns = (Array.isArray(domainMetadataColumnsProp) && domainMetadataColumnsProp.length > 0)
    ? domainMetadataColumnsProp.map(col => (col || '').toString().trim()).filter(col => col !== '' && col.toLowerCase() !== 'domain_id')
    : [...builtInFields, ...metadataFields];

  // Selected gene information
  const selectedGene = selectedGeneProp;

  // Reset folding states when selected gene changes (close the 3D viewer)
  useEffect(() => {
    setFoldingSequence(null);
    setFoldingStatus('idle');
    setFoldedStructure(null);
    setViewerSequence(null);
    setViewerError(null);
  setLastViewerGeneId(null);
  }, [selectedGene]);

  // Dummy track handlers
  const handleTrackShiftMinus1kb = typeof handleTrackShiftMinus1kbProp === 'function' ? handleTrackShiftMinus1kbProp : (hoodId) => {};
  const handleTrackShiftPlus1kb = typeof handleTrackShiftPlus1kbProp === 'function' ? handleTrackShiftPlus1kbProp : (hoodId) => {};
  const handleTrackFlip = typeof handleTrackFlipProp === 'function' ? handleTrackFlipProp : (hoodId) => {};
  const handleArrowheadHeightChange = typeof handleArrowheadHeightChangeProp === 'function' ? handleArrowheadHeightChangeProp : (val) => setArrowheadHeightDisplay(val);
  const handleGeneHeightChange = typeof handleGeneHeightChangeProp === 'function' ? handleGeneHeightChangeProp : (val) => setGeneHeightDisplay(val);

  // Protein folding handler
  const handleFoldSequence = async (sequence) => {
    if (!sequence || sequence.length >= 400) return;
    
    // Check if we're already folding this sequence
    if (foldingSequence === sequence && foldingStatus !== 'idle') {
      return;
    }
    
    // Check if this sequence is already folded
    if (foldedStructure && foldingSequence === sequence && foldingStatus === 'success') {
      return;
    }
    
    const currentFoldingSequence = sequence; // Store the sequence we're folding
    setFoldingSequence(sequence);
    setFoldingStatus('folding');
    setFoldedStructure(null); // Clear any previous structure
    // Remember which gene this structure belongs to
    try {
      const gid = (selectedGene && (selectedGene as any).id) || (selectedGene && (selectedGene as any).geneId) || null;
      setLastViewerGeneId(gid);
    } catch (e) {
      setLastViewerGeneId(null);
    }
    
    try {
      // Hand off the sequence to the viewer to fetch/process the PDB
      // Viewer will call back via onStructureReady when done
      setViewerSequence(sequence);
      setFoldingStatus('folding');
    } catch (error) {
      setFoldingStatus('error');
    }
  };

  // Debug: log when structure ready is called
  const debugHandleStructureReady = (payload) => { handleStructureReady(payload); };

  // Sequence passed to the viewer to trigger fetching + processing
  const [viewerSequence, setViewerSequence] = useState(null);
  const [viewerError, setViewerError] = useState(null);

  // Callback for viewer to report back processed structure
  const handleStructureReady = ({ pdb, sequenceLength, confidence }) => {
  // Viewer handles fetching and download; just store the results and update status
  setFoldedStructure({ pdb, sequenceLength, confidence });
  setFoldingStatus('success');
  setViewerError(null);
  setFoldingSequence(null);
  setViewerSequence(null);
  };

  // Only show the structure viewer when explicitly folding, not just when gene has sequence
  const selectedGeneId = (selectedGene && (selectedGene as any).id) || (selectedGene && (selectedGene as any).geneId) || null;
  const hasSequence = selectedGene?.metadata?.sequence && selectedGene.metadata.sequence.length > 0;
  const showStructureViewer = !!(
    selectedGeneId &&
    lastViewerGeneId &&
    selectedGeneId === lastViewerGeneId &&
    (viewerSequence || (foldingStatus === 'success' && foldedStructure))
  );

  // Viewer error handler
  const handleViewerError = (message) => {
  // Mark as error but keep the foldedStructure so the viewer remains mounted for inspection
  setFoldingStatus('error');
  setViewerError(message || 'Unknown viewer error');
  };

  // Log viewer mount-condition and key state changes for debugging
  useEffect(() => {
  }, [viewerSequence, foldingStatus, foldedStructure, viewerError]);
  
  // Removed ESM Atlas API call function

  return (
    <Sidebar collapsible="offcanvas" variant={variant} {...props}>
      {/* Header Container (simplified to avoid nesting issues) */}
      <div
        className="mx-3 my-2 p-2.5 bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm"
        style={{ backgroundColor: themeColors.background || undefined }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', width: '100%' }}>
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
            <Button
              variant={activeSection === 'info' ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 w-7 p-0 rounded-md transition-all ${activeSection === 'info' ? 'shadow-sm' : 'hover:bg-accent/80'}`}
              onClick={() => setActiveSection('info')}
              title="Show Info"
            >
              <Info className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={activeSection === 'settings' ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 w-7 p-0 rounded-md transition-all ${activeSection === 'settings' ? 'shadow-sm' : 'hover:bg-accent/80'}`}
              onClick={() => setActiveSection('settings')}
              title="Show Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={activeSection === 'palette' ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 w-7 p-0 rounded-md transition-all ${activeSection === 'palette' ? 'shadow-sm' : 'hover:bg-accent/80'}`}
              onClick={() => setActiveSection('palette')}
              title="Show Palette"
            >
              <Palette className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={activeSection === 'legend' ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 w-7 p-0 rounded-md transition-all ${activeSection === 'legend' ? 'shadow-sm' : 'hover:bg-accent/80'}`}
              onClick={() => setActiveSection('legend')}
              title="Show Legend"
            >
              <BookOpen className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={activeSection === 'guides' ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 w-7 p-0 rounded-md transition-all ${activeSection === 'guides' ? 'shadow-sm' : 'hover:bg-accent/80'}`}
              onClick={() => setActiveSection('guides')}
              title="Show Format Guides"
            >
              <Crop className="h-3.5 w-3.5" />
            </Button>
          </div>

          <a href="#" className="font-title text-xs font-medium mr-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img
              src={hoodiniLogoUrl}
              alt="Hoodini Logo"
              className="!size-5"
              style={{
                width: '200px',
                height: '100px',
                filter: resolvedTheme === 'dark' ? 'brightness(0) invert(1)' : 'none'
              }}
            />
          </a>
        </div>
      </div>

      {/* Content Container */}
      <div 
        className="mx-3 mb-4 p-3 bg-card/60 backdrop-blur-sm rounded-xl border border-border/40 overflow-y-auto scrollbar-hide"
        style={{ backgroundColor: themeColors.background || undefined, scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Info Section */}
        {activeSection === 'info' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="soft" className="text-xs font-medium">
                <Info className="h-3 w-3 mr-1" />
                Information
              </Badge>
            </div>
            
            {/* Gene Information Display */}
            <div className="space-y-2">
              {selectedGene ? (
                <div className="bg-muted/30 p-3 rounded-lg border border-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="info" className="text-xs">Gene Details</Badge>
                  </div>
                  <div className="space-y-3">
                    {selectedGene.metadata && Object.keys(selectedGene.metadata).length > 0 ? (
                      <>

                          
                          {(() => {
                            // Helper function to get current gene color using the same logic as PhyloTreeViewer
                            const getGeneColor = () => {
                              // Get the current palette configuration and color field
                              const currentGeneColorBy = geneColorBy || 'cluster';
                              const currentGenePalette = genePalette;
                              
                              // If palette is enabled and we have viewer access, try to get current color
                              if (currentGenePalette?.enabled && phyloTreeViewerRef?.current) {
                                try {
                                  // Get the same key extraction logic as PhyloTreeViewer
                                  let key = selectedGene?.metadata?.[currentGeneColorBy];
                                  if (key === null || key === undefined || key === '') {
                                    if (currentGeneColorBy === 'cluster') {
                                      key = selectedGene?.metadata?.clusterId ?? selectedGene?.metadata?.cluster_id ?? selectedGene?.cluster;
                                    }
                                  }
                                  
                                  // If we have a valid key, try to get the viewer's color map
                  if (!isEmptyValue(key) && typeof phyloTreeViewerRef.current.geneColorMap !== 'undefined') {
                                    const viewerColorMap = phyloTreeViewerRef.current.geneColorMap;
                                    if (viewerColorMap && typeof viewerColorMap.get === 'function') {
                    const paletteColor = viewerColorMap.get(normalizeKey(key));
                                      if (paletteColor && Array.isArray(paletteColor)) {
                                        const [r, g, b, a] = paletteColor;
                                        return `rgba(${r}, ${g}, ${b}, ${a !== undefined ? a/255 : 1})`;
                                      }
                                    }
                                  }
                                } catch (e) {
                                  // Fall through to original color logic
                                }
                              }
                              
                              // Fallback to original gene fillColor
                              if (selectedGene.fillColor && Array.isArray(selectedGene.fillColor)) {
                                const [r, g, b, a] = selectedGene.fillColor;
                                return `rgba(${r}, ${g}, ${b}, ${a !== undefined ? a/255 : 1})`;
                              }
                              return selectedGene.color || '#666';
                            };
                            
                            // Store the color for use in the components below
                            const geneColorForBadge = getGeneColor();
                            
                            return (
                              <>
                                {/* Product - show first if available and not an empty/placeholder value */}
                                {!isEmptyValue(selectedGene.metadata.product) && (
                                <div className="flex items-start gap-2">
                                    <Badge 
                                      variant={geneColorBy === 'product' ? "default" : "outline"} 
                                      className={`text-xs flex-shrink-0 ${geneColorBy === 'product' ? 'border-0' : ''}`}
                                      style={geneColorBy === 'product' ? {
                                        backgroundColor: geneColorForBadge,
                                        border: 'none'
                                      } : {}}
                                    >
                                      Product
                                    </Badge>
                                    <p className="text-xs break-all leading-relaxed flex-1">{String(selectedGene.metadata.product)}</p>
                                  </div>
                                )}
                                
                                {/* Protein Cluster - show second with color if available */}
                                {!isEmptyValue(selectedGene.metadata.cluster) && (
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant={geneColorBy === 'cluster' ? "default" : "outline"} 
                                      className={`text-xs flex-shrink-0 ${geneColorBy === 'cluster' ? 'border-0' : ''}`}
                                      style={geneColorBy === 'cluster' ? {
                                        backgroundColor: geneColorForBadge,
                                        color: 'white',
                                        border: 'none'
                                      } : {}}
                                    >
                                      Cluster
                                    </Badge>
                                    <p className="text-xs break-all leading-relaxed flex-1">{String(selectedGene.metadata.cluster)}</p>
                                  </div>
                                )}
                                
                                {/* Show any other metadata fields not already displayed (excluding sequence) */}
                                {Object.entries(selectedGene.metadata)
                                  .filter(([key, value]) => !['product', 'cluster', 'sequence'].includes(key) && !isEmptyValue(value))
                                  .map(([key, value]) => {
                                    // Check if this field is the one being used for gene coloring
                                    const isColorField = geneColorBy === key;
                                    
                                    return (
                                      <div key={key} className="flex items-start gap-2">
                                        <Badge 
                                          variant={isColorField ? "default" : "outline"} 
                                          className={`text-xs capitalize flex-shrink-0 ${isColorField ? 'border-0' : ''}`}
                                          style={isColorField ? {
                                            backgroundColor: geneColorForBadge,
                                            color: 'white',
                                            border: 'none'
                                          } : {}}
                                        >
                                          {key.replace(/_/g, ' ')}
                                        </Badge>
                                        <p className="text-xs break-all leading-relaxed flex-1">{String(value)}</p>
                                      </div>
                                    );
                                  })}
                                
                                {/* Protein Sequence - show at the very end if available */}
                                {selectedGene.metadata.sequence && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">Protein Sequence</Badge>
                                      {(() => {
                                        // Clean sequence by removing trailing "*" from prodigal
                                        const cleanSequence = selectedGene.metadata.sequence.replace(/\*+$/, '');
                                        const isEligibleForFolding = cleanSequence.length < 400;
                                        
                                        return isEligibleForFolding ? (
                                          <Badge 
                                            variant={foldingStatus === 'folding' ? "default" : foldingStatus === 'success' ? "default" : foldingStatus === 'error' ? "destructive" : "secondary"} 
                                            className={`text-xs ${foldingStatus === 'folding' ? 'animate-pulse' : foldingStatus === 'idle' ? 'cursor-pointer hover:bg-secondary/80' : ''}`}
                                            onClick={() => {
                                              if (foldingStatus === 'idle') {
                                                setViewerError(null);
                                                handleFoldSequence(cleanSequence);
                                              } else if (foldingStatus === 'success' || foldingStatus === 'error') {
                                                // Allow re-folding by resetting state
                                                setFoldingStatus('idle');
                                                setFoldedStructure(null);
                                                setFoldingSequence(null);
                                              }
                                            }}
                                          >
                                            {foldingStatus === 'idle' && 'Fold Sequence'}
                                            {foldingStatus === 'folding' && 'Folding...'}
                                            {foldingStatus === 'success' && 'View Structure'}
                                            {foldingStatus === 'error' && 'Retry Folding'}
                                          </Badge>
                                        ) : null;
                                      })()}
                                    </div>
                                    <div className="mt-1 p-2 bg-muted rounded text-xs font-mono break-all leading-relaxed">
                                      {/* Display clean sequence without trailing "*" */}
                                      {selectedGene.metadata.sequence.replace(/\*+$/, '')}
                                    </div>
                                    {(() => {
                                      const cleanSequence = selectedGene.metadata.sequence.replace(/\*+$/, '');
                                      return cleanSequence.length < 400 ? (
                                        <p className="text-xs text-muted-foreground">
                                          Sequence length: {cleanSequence.length} aa (eligible for folding)
                                        </p>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">
                                          Sequence length: {cleanSequence.length} aa (too long for folding)
                                        </p>
                                      );
                                    })()}
                                    
                                    {/* 3D Structure Viewer - only shown when actively folding/viewing */}
                                    {showStructureViewer && (
                                      <div className="mt-2 p-3 bg-accent/10 rounded-md border">
                                        <div className="flex items-center justify-between mb-2">
                                          <h5 className="font-title text-xs font-medium">3D Structure</h5>
                                          {(() => {
                                            const rawConf = foldedStructure && typeof foldedStructure.confidence === 'number' ? foldedStructure.confidence : null;
                                            const displayConf = rawConf !== null ? rawConf * 100 : null;
                                            const bg = displayConf !== null ? getSemaphoreColor(displayConf) : 'transparent';
                                            const fg = displayConf !== null ? (displayConf > 50 ? '#000' : '#fff') : '#fff';
                                            return (
                                              <Badge
                                                variant="outline"
                                                className="text-xs font-medium text-white border-0"
                                                style={{ backgroundColor: bg, color: fg, border: displayConf === null ? '1px dashed rgba(255,255,255,0.12)' : undefined }}
                                              >
                                                avg pLDDT: {displayConf !== null ? `${displayConf.toFixed(0)}%` : (foldingStatus === 'folding' ? 'loading...' : 'n/a')}
                                              </Badge>
                                            );
                                          })()}
                                        </div>
                                        <ErrorBoundary>
                                          <ProteinViewer 
                                            key={`${selectedGene?.id || selectedGene?.geneId || 'selected'}`}
                                            // New flow: viewer accepts a sequence prop and will fetch/process PDB itself.
                                            sequence={viewerSequence}
                                            // Back-compat: if we already have a pdb, still pass it
                                            pdbData={foldedStructure?.pdb}
                                            confidence={foldedStructure?.confidence}
                                            sequenceLength={foldedStructure?.sequenceLength}
                                            onStructureReady={handleStructureReady}
                                            onError={handleViewerError}
                                            // Theme background is passed so viewer can match its BG
                                            themeBackground={themeColors.background}
                                          />
                                        </ErrorBoundary>
                                        {viewerError ? (
                                          <div className="mt-2 p-2 bg-destructive/10 rounded border border-destructive/20 text-xs text-destructive">
                                            <div className="font-medium text-xs">Viewer error</div>
                                            <div className="text-xs mt-1">{String(viewerError)}</div>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-muted-foreground mt-2">
                                            Structure predicted using ESMFold • {foldedStructure?.sequenceLength || viewerSequence?.length || '...'} residues
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        <div className="text-muted-foreground text-xs">No metadata available for this gene</div>
                      )}
                    </div>
                  </div>
                ) : (
                <div className="p-4 bg-gradient-to-br from-muted/40 to-accent/20 rounded-xl border border-border/30 text-sm leading-relaxed">
                  <div className="text-center mb-4">
                    <span className="text-lg font-semibold">Hoodini 🦉🎩</span>
                    <p className="text-xs text-muted-foreground mt-1">Gene Neighborhood Visualization</p>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2 p-2 bg-background/50 rounded-md">
                      <Badge variant="info" className="text-xs shrink-0 mt-0.5">Settings</Badge>
                      <span className="text-muted-foreground">Configure tree and gene display</span>
                    </div>
                    <div className="flex items-start gap-2 p-2 bg-background/50 rounded-md">
                      <Badge variant="success" className="text-xs shrink-0 mt-0.5">Palette</Badge>
                      <span className="text-muted-foreground">Customize colors and styling</span>
                    </div>
                    <div className="flex items-start gap-2 p-2 bg-background/50 rounded-md">
                      <Badge variant="warning" className="text-xs shrink-0 mt-0.5">Legend</Badge>
                      <span className="text-muted-foreground">Understand visualization elements</span>
                    </div>
                  </div>
                  <div className="mt-4 p-2 bg-primary/5 rounded-lg text-center border border-primary/10">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground/80">Click on a gene</strong> to see its details
                    </p>
                  </div>
                </div>
                )}
            </div>
          </div>
        )}

        {/* Settings Section */}
        {activeSection === 'settings' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="soft" className="text-xs font-medium">
                <Settings className="h-3 w-3 mr-1" />
                Settings
              </Badge>
            </div>
            
            {/* Deck.gl Layer Controls */}
            <div className="bg-muted/30 p-3 rounded-lg border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="muted" className="text-xs">Layer Visibility</Badge>
              </div>
              <div className="space-y-2 mt-2">
                {/* Tree layer is always shown as it's core data */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="tree-layer" className="text-xs">Tree Layer</Label>
                  <Switch
                    id="tree-layer"
                    checked={showTreeLayer}
                    onCheckedChange={setShowTreeLayer}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="tree-text-layer" className="text-xs">Tree Text</Label>
                  <Switch
                    id="tree-text-layer"
                    checked={showTreeTextLayer}
                    onCheckedChange={setShowTreeTextLayer}
                  />
                </div>
                {/* Gene layer - show if gene data exists */}
                {hasGeneData && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="gene-layer" className="text-xs">Gene Layer</Label>
                      <Switch
                        id="gene-layer"
                        checked={showGeneLayer}
                        onCheckedChange={setShowGeneLayer}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="gene-text-layer" className="text-xs">Gene Text</Label>
                      <Switch
                        id="gene-text-layer"
                        checked={showGeneTextLayer}
                        onCheckedChange={setShowGeneTextLayer}
                      />
                    </div>
                  </>
                )}
                {/* Domain layer - show if domain data exists */}
                {hasDomainData && (
                  <div className="flex items-center justify-between">
                    <Label htmlFor="domain-layer" className="text-xs">Domain Layer</Label>
                    <Switch
                      id="domain-layer"
                      checked={showDomainLayer}
                      onCheckedChange={setShowDomainLayer}
                    />
                  </div>
                )}
                {/* Protein links - show if protein link data exists */}
                {hasProteinLinkData && (
                  <div className="flex items-center justify-between">
                    <Label htmlFor="protein-link-layer" className="text-xs">Protein Links</Label>
                    <Switch
                      id="protein-link-layer"
                      checked={showProteinLinkLayer}
                      onCheckedChange={setShowProteinLinkLayer}
                    />
                  </div>
                )}
                {/* Nucleotide links - show if nucleotide link data exists */}
                {hasNucleotideLinkData && (
                  <div className="flex items-center justify-between">
                    <Label htmlFor="nucleotide-link-layer" className="text-xs">Nucleotide Links</Label>
                    <Switch
                      id="nucleotide-link-layer"
                      checked={showNucleotideLinkLayer}
                      onCheckedChange={setShowNucleotideLinkLayer}
                    />
                  </div>
                )}
                {/* ncRNA layer - show if ncRNA data exists */}
                {hasNcRNAData && (
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ncrna-layer" className="text-xs">ncRNA Layer</Label>
                    <Switch
                      id="ncrna-layer"
                      checked={showNcRNALayer}
                      onCheckedChange={setShowNcRNALayer}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Gene Settings */}
            <div className="bg-muted/30 p-3 rounded-lg border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="muted" className="text-xs">Gene Settings</Badge>
              </div>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="arrowhead-height" className="text-xs mb-1 block">
                    Arrowhead Height: {arrowheadHeightDisplay}
                  </Label>
                  <Slider
                    id="arrowhead-height"
                    min={0}
                    max={100}
                    value={[arrowheadHeightDisplay]}
                    onValueChange={(value) => {
                      // Update display immediately for responsive UI
                      setArrowheadHeightDisplay(value[0]);
                    }}
                    onValueCommit={(value) => {
                      // Only trigger expensive recalculation when slider is released
                      if (typeof handleArrowheadHeightChangeProp === 'function') {
                        handleArrowheadHeightChangeProp(value[0]);
                      }
                    }}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="gene-height" className="text-xs mb-1 block">
                    Gene Height: {geneHeightDisplay}
                  </Label>
                  <Slider
                    id="gene-height"
                    min={10}
                    max={200}
                    value={[geneHeightDisplay]}
                    onValueChange={(value) => {
                      // Update display immediately for responsive UI
                      setGeneHeightDisplay(value[0]);
                    }}
                    onValueCommit={(value) => {
                      // Only trigger expensive recalculation when slider is released
                      if (typeof handleGeneHeightChangeProp === 'function') {
                        handleGeneHeightChangeProp(value[0]);
                      }
                    }}
                    className="w-full"
                  />
                </div>
                <div className="mt-1">
                  <Label htmlFor="gene-label-position" className="text-xs mb-1 block">Gene Label Position:</Label>
                  <Select value={geneLabelPosition} onValueChange={setGeneLabelPosition}>
                    <SelectTrigger id="gene-label-position" className="w-full text-xs" style={{ height: '20px', minHeight: '20px' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom">Bottom</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="top">Top</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-2">
                  <Label htmlFor="gene-label-size" className="text-xs mb-1 block">
                    Gene Label Size: {geneLabelSizeDisplay}px
                  </Label>
                  <Slider
                    id="gene-label-size"
                    min={6}
                    max={30}
                    value={[geneLabelSizeDisplay]}
                    onValueChange={(value) => setGeneLabelSizeDisplay(value[0])}
                    onValueCommit={(value) => {
                      if (typeof setGeneLabelSize === 'function') setGeneLabelSize(value[0]);
                    }}
                    className="w-full"
                  />
                </div>
                <div className="mt-1">
                  <Label htmlFor="gene-label-by" className="text-xs mb-1 block">Gene Label By:</Label>
                  <MultiSelect
                    options={['gene_id', ...geneMetadataColumns].map(col => ({ label: col, value: col }))}
                    value={geneLabelBy ? geneLabelBy.split(',').filter(Boolean) : []}
                    onValueChange={(values) => setGeneLabelBy(values.length > 0 ? values.join(',') : '')}
                    placeholder="Select columns..."
                    maxCount={2}
                    className="text-xs"
                  />
                </div>
                <div className="mt-2">
                  <Label htmlFor="stroke-line-width" className="text-xs mb-1 block">
                    Stroke Width: {strokeLineWidthDisplay.toFixed(1)}
                  </Label>
                  <Slider
                    id="stroke-line-width"
                    min={0.1}
                    max={3}
                    step={0.1}
                    value={[strokeLineWidthDisplay]}
                    onValueChange={(value) => setStrokeLineWidthDisplay(value[0])}
                    onValueCommit={(value) => {
                      if (typeof setStrokeLineWidth === 'function') setStrokeLineWidth(value[0]);
                    }}
                    className="w-full"
                  />
                </div>
                <div className="mt-2">
                  <Label htmlFor="genome-x-scale" className="text-xs mb-1 block">
                    Genome X-Scale: {genomeXScaleDisplay}%
                  </Label>
                  <Slider
                    id="genome-x-scale"
                    min={1}
                    max={100}
                    value={[genomeXScaleDisplay]}
                    onValueChange={(value) => setGenomeXScaleDisplay(value[0])}
                    onValueCommit={(value) => {
                      if (typeof setGenomeXScale === 'function') setGenomeXScale(value[0]);
                    }}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Basic Tree Settings */}
            <div className="bg-muted/30 p-3 rounded-lg border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="muted" className="text-xs">Tree Settings</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ultrametric" className="text-xs">Ultrametric Tree</Label>
                  <Switch
                    id="ultrametric"
                    checked={ultrametric} 
                    onCheckedChange={setUltrametric}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="connecting-lines" className="text-xs">Connecting Lines</Label>
                  <Switch
                    id="connecting-lines"
                    checked={showConnectingLines} 
                    onCheckedChange={setShowConnectingLines}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="scrollbar" className="text-xs">Show Scrollbar</Label>
                  <Switch
                    id="scrollbar"
                    checked={showScrollbar} 
                    onCheckedChange={setShowScrollbar}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="align-labels" className="text-xs">Align Labels</Label>
                  <Switch
                    id="align-labels"
                    checked={alignLabels} 
                    onCheckedChange={setAlignLabels}
                  />
                </div>
                <div className="mt-2">
                  <Label htmlFor="phylo-position" className="text-xs mb-1 block">Phylo Label Position:</Label>
                  <Select value={phyloLabelPosition} onValueChange={setPhyloLabelPosition}>
                    <SelectTrigger id="phylo-position" className="w-full text-xs" style={{ height: '20px', minHeight: '20px' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="after-tree">After Tree</SelectItem>
                      <SelectItem value="after-tracks">After Tracks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-2">
                  <Label htmlFor="tree-x-scale" className="text-xs mb-1 block">
                    Tree X-Scale: {treeXScaleDisplay}%
                  </Label>
                  <Slider
                    id="tree-x-scale"
                    min={10}
                    max={300}
                    value={[treeXScaleDisplay]}
                    onValueChange={(value) => {
                      // Update display immediately for responsive UI
                      setTreeXScaleDisplay(value[0]);
                    }}
                    onValueCommit={(value) => {
                      // Only trigger expensive recalculation when slider is released
                      if (typeof setTreeXScaleProp === 'function') setTreeXScaleProp(value[0]);
                    }}
                    className="w-full"
                  />
                </div>
                <div className="mt-2">
                  <Label htmlFor="y-spacing" className="text-xs mb-1 block">
                    Y Spacing: {ySpacingDisplay}px
                  </Label>
                  <Slider
                    id="y-spacing"
                    min={50}
                    max={500}
                    step={10}
                    value={[ySpacingDisplay]}
                    onValueChange={(value) => setYSpacingDisplay(value[0])}
                    onValueCommit={(value) => {
                      if (typeof setYSpacing === 'function') setYSpacing(value[0]);
                    }}
                    className="w-full"
                  />
                </div>
                <div className="mt-2">
                  <Label htmlFor="phylo-label-size" className="text-xs mb-1 block">
                    Phylo Label Size: {phyloLabelSizeDisplay}px
                  </Label>
                  <Slider
                    id="phylo-label-size"
                    min={8}
                    max={40}
                    value={[phyloLabelSizeDisplay]}
                    onValueChange={(value) => setPhyloLabelSizeDisplay(value[0])}
                    onValueCommit={(value) => {
                      if (typeof setPhyloLabelSize === 'function') setPhyloLabelSize(value[0]);
                    }}
                    className="w-full"
                  />
                </div>
                <div className="mt-1">
                  <Label htmlFor="tree-label-by" className="text-xs mb-1 block">Tree Label By:</Label>
                  <MultiSelect
                    options={['name', ...treeMetadataColumns].map(col => ({ label: col, value: col }))}
                    value={treeLabelBy ? treeLabelBy.split(',').filter(Boolean) : []}
                    onValueChange={(values) => setTreeLabelBy(values.length > 0 ? values.join(',') : '')}
                    placeholder="Select columns..."
                    maxCount={2}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Alignment Controls */}
            <div className="bg-muted/30 p-3 rounded-lg border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="muted" className="text-xs">Alignment Controls</Badge>
              </div>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="hoods-alignment" className="text-xs mb-1 block">Hoods Alignment:</Label>
                  <Select 
                    value={useDefaultGeneAlignment ? 'default' : defaultAlign} 
                    onValueChange={(value) => {
                      if (value === 'default') {
                        setUseDefaultGeneAlignment(true);
                        setAlignCluster(null);
                      } else {
                        setUseDefaultGeneAlignment(false);
                        setDefaultAlign(value);
                        setAlignCluster(null);
                      }
                    }}
                  >
                    <SelectTrigger id="hoods-alignment" className="w-full text-xs" style={{ height: '20px', minHeight: '20px' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="start">Start</SelectItem>
                      <SelectItem value="end">End</SelectItem>
                      <SelectItem value="default">Default</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="gene-alignment" className="text-xs mb-1 block">
                      Gene Alignment: {availableClusters.length > MAX_CLUSTERS_IN_DROPDOWN 
                        ? `top ${MAX_CLUSTERS_IN_DROPDOWN} of ${availableClusters.length}` 
                        : `${availableClusters.length} clusters`}
                    </Label>
                    <Button size="sm" variant="ghost" onClick={refreshClusters} style={{ height: '20px', minHeight: '20px' }}>Refresh</Button>
                  </div>
                  <Select 
                    value={alignCluster != null ? String(alignCluster) : 'none'} 
                    onValueChange={(value) => {
                      const newVal = (value === 'none' || value === '__more__') ? null : String(value);
                      
                      // Skip ALL React state, use ONLY the console helper
                      const w: any = window as any;
                      if (typeof w.__hoodini_alignCluster === 'function') {
                        // DON'T set any React state AT ALL - just call the helper like console
                        if (newVal !== null) {
                          w.__hoodini_alignCluster(newVal);
                        }
                        // DO NOT UPDATE ANY REACT STATE - it triggers effects that undo alignment!
                      } else {
                        // Fallback: use React state path if helper not available
                        setAlignCluster(newVal as any);
                        if (newVal !== null) setUseDefaultGeneAlignment(false);
                        try {
                          const viewer = (phyloTreeViewerRef as any)?.current || null;
                          if (newVal === null) {
                            if (viewer?.alignByDefaultGenes) viewer.alignByDefaultGenes();
                          } else {
                            if (viewer?.alignCluster) viewer.alignCluster(newVal);
                            else viewer?.genomeView?.alignCluster?.(newVal);
                          }
                          viewer?.forceAlignUpdate?.();
                        } catch {}
                      }
                    }}
                  >
                    <SelectTrigger id="gene-alignment" className="w-full text-xs" style={{ height: '20px', minHeight: '20px' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Cluster</SelectItem>
                      {clusterSelectItems}
                      {availableClusters.length > MAX_CLUSTERS_IN_DROPDOWN && (
                        <SelectItem value="__more__" disabled>
                          ... and {availableClusters.length - MAX_CLUSTERS_IN_DROPDOWN} more (use console)
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Palette Section */}
        {activeSection === 'palette' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="soft" className="text-xs font-medium">
                <Palette className="h-3 w-3 mr-1" />
                Color & Palette
              </Badge>
            </div>
            
            {/* Field Selection Controls */}
            <div className="bg-muted/30 p-3 rounded-lg border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="muted" className="text-xs">Color Fields</Badge>
              </div>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="gene-colors" className="text-xs mb-1 block">Gene Colors:</Label>
                  <Select value={geneColorBy} onValueChange={setGeneColorBy}>
                    <SelectTrigger id="gene-colors" className="w-full text-xs" style={{ height: '20px', minHeight: '20px' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {geneMetadataColumns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tree-colors" className="text-xs mb-1 block">Tree Colors:</Label>
                  <Select value={treeColorBy} onValueChange={setTreeColorBy}>
                    <SelectTrigger id="tree-colors" className="w-full text-xs" style={{ height: '20px', minHeight: '20px' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {treeMetadataColumns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="domain-colors" className="text-xs mb-1 block">Domain Colors:</Label>
                  <Select value={domainColorBy} onValueChange={setDomainColorBy}>
                    <SelectTrigger id="domain-colors" className="w-full text-xs" style={{ height: '20px', minHeight: '20px' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {domainMetadataColumns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="domain-source" className="text-xs mb-1 block">Domain Source:</Label>
                  <Select
                    value={domainSource || 'all'}
                    onValueChange={(val) => {
                      try {
                        if (typeof setDomainSource === 'function') setDomainSource(val);
                        else if (props && typeof props.setDomainSource === 'function') props.setDomainSource(val);
                      } catch (e) {}
                    }}
                  >
                    <SelectTrigger id="domain-source" className="w-full text-xs" style={{ height: '20px', minHeight: '20px' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">all</SelectItem>
                      {(() => {
                        try {
                          const gv = (phyloTreeViewerRefProp && phyloTreeViewerRefProp.current) ? phyloTreeViewerRefProp.current.genomeView : null;
                          if (!gv) return null;
                          const domains = gv.getAllDomains ? gv.getAllDomains() : [];
                          const sources = Array.from(new Set(domains.map(d => String((d && (d.source || (d.metadata && d.metadata.source))) || 'unknown')))).sort();
                          return sources.map(s => <SelectItem key={String(s)} value={String(s)}>{String(s)}</SelectItem>);
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Separator className="my-2" />
            
            {/* Unified Color Palette Selection */}
            <div className="mb-3">
              <UnifiedPaletteWidget
                genePalette={genePalette}
                setGenePalette={setGenePalette}
                phyloPalette={phyloPalette}
                setPhyloPalette={setPhyloPalette}
                domainPalette={domainPalette}
                setDomainPalette={setDomainPalette}
                ncRNAPalette={ncRNAPalette}
                setNcRNAPalette={setNcRNAPalette}
                regionPalette={regionPalette}
                setRegionPalette={setRegionPalette}
                availableData={{
                  // Show layers based on typical data availability
                  parsedGFF: [1], // Genes from GFF - always show
                  // Domains: provide a non-empty marker when domain data exists so the
                  // UnifiedPaletteWidget will include the domain layer in the selector.
                  parsedDomains: hasDomainData ? [1] : [],
                  phyloData: [1], // Tree data - always show
                  ncRNAFeatures: [1], // Show ncRNA layer - colors derived from GFF
                  regionFeatures: [1] // Show region layer - from GFF region features
                }}
              />
            </div>

            {/* alpha controls moved into UnifiedPaletteWidget; no duplicate inputs here */}

            <Separator className="my-2" />

            {/* Links Color Selection */}
            <div className="mb-3">
              <Label className="text-xs font-medium mb-1 block">Links Color Selection:</Label>
              <div className="space-y-1">
                <LinkColorWidget 
                  proteinLinkConfig={proteinLinkConfig} 
                  nucleotideLinkConfig={nucleotideLinkConfig}
                  onProteinLinkConfigChange={setProteinLinkConfig}
                  onNucleotideLinkConfigChange={setNucleotideLinkConfig}
                />
              </div>
            </div>
          </div>
        )}

        {/* Legend Section */}
        {activeSection === 'legend' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="soft" className="text-xs font-medium">
                <BookOpen className="h-3 w-3 mr-1" />
                Legend
              </Badge>
            </div>
            
            {/* Legend Display */}
            <div className="bg-muted/30 p-3 rounded-lg border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="muted" className="text-xs">Visualization Legend</Badge>
              </div>
              <div className="space-y-2">
                {(() => {
                  
                  const getterLegend = (phyloTreeViewerRef && phyloTreeViewerRef.current && typeof phyloTreeViewerRef.current.getLegendData === 'function') ? phyloTreeViewerRef.current.getLegendData() : null;
                  const legendToShow = viewerLegend || getterLegend || null;
                  if (legendToShow) {
                    return (
                      <LegendWidget
                        legend={legendToShow}
                        genePalette={genePalette}
                        phyloPalette={phyloPalette}
                        regionPalette={regionPalette}
                        proteinLinkConfig={proteinLinkConfig}
                        nucleotideLinkConfig={nucleotideLinkConfig}
                        styleConfig={styleConfig}
                        className=""
                        style={{}}
                      />
                    );
                  }
                  return (
                    <div className="p-3 bg-accent/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground mb-1">No legend data available yet</p>
                      <p className="text-xs text-muted-foreground">Legend will appear once data is loaded</p>
                    </div>
                  );
                })()}
              </div>
            </div>
            
            {/* Legend Information */}
            <div className="bg-muted/30 p-3 rounded-lg border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="muted" className="text-xs">Guide</Badge>
              </div>
              <div className="text-xs space-y-2 text-muted-foreground">
                <div className="p-2 bg-accent/20 rounded-md">
                  <p className="font-medium mb-1 text-foreground/80">Gene Tracks:</p>
                  <p>• Arrows indicate gene direction and boundaries</p>
                  <p>• Colors represent different metadata categories</p>
                </div>
                <div className="p-2 bg-accent/20 rounded-md">
                  <p className="font-medium mb-1 text-foreground/80">Phylogenetic Tree:</p>
                  <p>• Branch lengths show evolutionary distance</p>
                  <p>• Node colors represent tree metadata</p>
                </div>
                <div className="p-2 bg-accent/20 rounded-md">
                  <p className="font-medium mb-1 text-foreground/80">Protein Domains:</p>
                  <p>• Colored regions within genes</p>
                  <p>• Represent functional protein domains</p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="font-medium mb-1">Links:</p>
                  <p>• Connect related elements across tracks</p>
                  <p>• Show protein or nucleotide relationships</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Format Guides Section */}
        {activeSection === 'guides' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="soft" className="text-xs font-medium">
                <Crop className="h-3 w-3 mr-1" />
                Format Guides
              </Badge>
            </div>
            
            <div className="bg-muted/30 p-3 rounded-lg border border-border/30">
              <GuideControlsWidget
                guidesVisible={showFormatGuides}
                selectedFormat={formatGuidePreset}
                onGuidesVisibleChange={setShowFormatGuides}
                onFormatChange={setFormatGuidePreset}
                scaleToFormat={scaleExportToFormat}
                onScaleToFormatChange={setScaleExportToFormat}
                cropToGuides={cropToGuides}
                onCropToGuidesChange={setCropToGuides}
                scaleRulerWithCrop={scaleRulerWithCrop}
                onScaleRulerWithCropChange={setScaleRulerWithCrop}
              />
            </div>
          </div>
        )}
      </div>
      

    </Sidebar>
  )
}
