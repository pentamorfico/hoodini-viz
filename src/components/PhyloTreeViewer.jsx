// PhyloTreeViewer.jsx
import React, { useEffect, useRef, useState, useImperativeHandle } from 'react';
import PhyloTree from '../models/PhyloTree';
import GenomeView from '../models/GenomeView';
import DeckGL from '@deck.gl/react';
import { LineLayer, PolygonLayer, PathLayer, TextLayer, ScatterplotLayer } from '@deck.gl/layers';
import {OrthographicView} from '@deck.gl/core';
import ScrollbarWidget from '../widgets/ScrollbarWidget';
import RulerWidget from '../widgets/RulerWidget';
import TreeScaleWidget from '../widgets/TreeScaleWidget';
import { DEFAULT_CONFIG } from '../config/visualizationConfig';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { getPaletteColors } from '../utils/colorPalettes';
import { exportToSVG } from '../utils/exportToSVG';
import { parseNonCodingMetadata } from '../utils/parseNonCodingMetadata';

const PhyloTreeViewer = React.forwardRef(({
  newickStr,
  gffFeatures,
  proteinLinks,
  nucleotideLinks,
  domainsByGene,
  baselines,
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
  // Immediate display overrides from sidebar sliders (update instantly while dragging)
  arrowheadHeightDisplay,
  geneHeightDisplay,
  genePalette,
  domainPalette,
  phyloPalette,
  ncRNAPalette,
  regionPalette,
  geneColorBy,
  geneLabelBy,
  domainColorBy = 'domainName', // Add this prop
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
}, ref) => {
  // Theme context — use resolvedTheme so we react to system resolution immediately
  const { getThemeColors, theme, resolvedTheme } = useTheme();
  const themeColors = React.useMemo(() => getThemeColors(resolvedTheme), [resolvedTheme]);
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
  const [treeLabelPadding, setTreeLabelPadding] = React.useState(100);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const [treeXScalePercent, setTreeXScalePercent] = useState(config?.tree?.xScalePercent || 100);
  const effectiveTreeXScale = (treeXScale !== undefined && treeXScale !== null) ? treeXScale : treeXScalePercent;
  const [viewState, setViewState] = useState({
    target: [0, 0, 0],
    zoom: -3
  });

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
      const gid = entry?.gene_id || entry?.geneId || entry?.id;
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

  // Memoize tree creation separately - ultrametric only affects tree, not genome
  const tree = React.useMemo(() => {
  const newTree = new PhyloTree(newickStr, config, ultrametric);
  const leavesToUse = newTree.getLeafNodes().map(n => n.name);
  newTree.layout(leavesToUse);
  return newTree;
  }, [newickStr, ultrametric, structuralConfigValues]);

  // Create a base tree for GenomeView that doesn't change with ultrametric
  const baseTree = React.useMemo(() => {
  const newTree = new PhyloTree(newickStr, config, false); // Always non-ultrametric for genome
  const leavesToUse = newTree.getLeafNodes().map(n => n.name);
  newTree.layout(leavesToUse);
  return newTree;
  }, [newickStr, structuralConfigValues]);

  // Memoize core data processing to avoid recomputing on style changes
  // Only depend on actual structural data and essential config properties
  const genomeView = React.useMemo(() => {
    
    // Use the base tree that doesn't change with ultrametric
    const leavesToUse = baseTree.getLeafNodes().map(n => n.name);
    
    // Use full config for model creation but only depend on structural properties in useMemo
    const newGenomeView = new GenomeView(leavesToUse, baseTree, config);
    
    newGenomeView.addFeatures(gffFeatures);
    
    if (baselines) {
      newGenomeView.applyBaselines(baselines);
    }
    
    newGenomeView.initGenes();
    
    // Compute initial track positions so genes have valid polygons
    newGenomeView.computeTrackPositions();
    
    // Apply initial alignment immediately to avoid double render
    if (alignCluster != null && alignCluster !== '') {
      newGenomeView.alignCluster(String(alignCluster));
    } else {
      const hasDefaultGenes = Object.values(newGenomeView.hoodBaselines || {}).some(baseline => baseline.align_gene);
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
      
      // Set protein clusters once from strictClusterMap; assign palette colors if enabled
      if (strictClusterMap) {
        const paletteCfg = (genePalette || config?.colorPalettes?.genePalette);
        if (paletteCfg?.enabled) {
          newGenomeView.setProteinClustersWithPalette(strictClusterMap, paletteCfg);
        } else {
          // When palette disabled, only set cluster metadata, no colors
          newGenomeView.proteinClusters = {};
          if (!newGenomeView._genesIndexReady) newGenomeView._buildGeneIndex();
          
          for (const originalGeneId of Object.keys(strictClusterMap)) {
            const cluster = strictClusterMap[originalGeneId];
            const normCluster = (cluster === undefined || cluster === null) ? null : String(cluster).trim();
            const ids = newGenomeView._genesByOriginalId.get(originalGeneId) || [];
            for (const uid of ids) newGenomeView.proteinClusters[uid] = normCluster;
          }
          
          // Set cluster metadata without colors
          for (const uniqueGeneId in newGenomeView.genesById) {
            const gene = newGenomeView.genesById[uniqueGeneId];
            const cluster = newGenomeView.proteinClusters[uniqueGeneId];
            if (!gene.metadata) gene.metadata = {};
            gene.metadata.clusterId = cluster || null;
            // Explicitly don't set gene.fillColor here
          }
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

  // Apply ncRNA palette colors if enabled
  const effectiveNcRNAPalette = ncRNAPalette || config?.colorPalettes?.ncRNAPalette;
  if (effectiveNcRNAPalette?.enabled) {
    newGenomeView.setNcRNAColorsWithPalette(effectiveNcRNAPalette);
  }

  // Apply region palette colors if enabled
  const effectiveRegionPalette = regionPalette || config?.colorPalettes?.regionPalette;
  if (effectiveRegionPalette?.enabled) {
    newGenomeView.setRegionColorsWithPalette(effectiveRegionPalette);
  }

  // No default non-coding metadata to attach here — derive from GFF when needed

    // NOTE: Link coloring moved back to layer rendering since it depends on gene fillColor
    // which is calculated from geneColorMap in the layers section

    genomeViewRef.current = newGenomeView;
    
  const genomeViewEndTime = performance.now();
    return newGenomeView;
  }, [
    // Only structural data dependencies - prefer stable scalar signatures instead of raw references
    baseTree,
    // Use counts/signatures so identical data passed as new references doesn't trigger recreation
    (gffFeatures ? gffFeatures.length : 0),
    (proteinLinks ? proteinLinks.length : 0),
    (nucleotideLinks ? nucleotideLinks.length : 0),
    (domainsByGene ? Object.keys(domainsByGene).length : 0),
    (baselines ? baselines.length : 0),
    // Metadata dependencies - essential for immediate gene coloring
    (proteinMetadata ? Object.keys(proteinMetadata).length : 0),
  (strictClusterMap ? Object.keys(strictClusterMap).length : 0),
    (nonCodingMetadata ? Object.keys(nonCodingMetadata).length : 0),
    // Alignment dependencies - essential for proper gene alignment
    alignCluster,
    useDefaultGeneAlignment,
    defaultAlign,
    // Palette dependencies - essential for proper cluster color setup
    JSON.stringify(genePalette || config?.colorPalettes?.genePalette || {}),
    JSON.stringify(ncRNAPalette || config?.colorPalettes?.ncRNAPalette || {}),
    JSON.stringify(regionPalette || config?.colorPalettes?.regionPalette || {}),
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

  // Effect that responds to forceUpdateCounter changes from parent
  useEffect(() => {
    if (forceUpdateCounter > 0) {
      isManualManipulation.current = true;
      setAlignmentVersion(prev => prev + 1);
    }
  }, [forceUpdateCounter]);

  // Recompute treeLabelPadding based on the longest leaf label length
  React.useEffect(() => {
    if (!tree) return;
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
    setTreeLabelPadding(maxLen * charWidth);
  }, [tree, treeMetadata, treeLabelBy, config]);

  // Utility to compute bounding box from all polygons/paths
  function computeBounds(genomeView, tree, phyloLabelPosition = 'after-tree', treeXScaleOverride = null) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let minBaselineX = Infinity;
    if (!genomeView) return config.layout.containerFallback; // Use configurable fallback
    
    // Use GenomeView's authoritative global bounds for X coordinates if available
    if (genomeView.globalMin !== Infinity && genomeView.globalMax !== -Infinity) {
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
    
    // Calculate Y bounds from genes, ncRNAs, and domains (still needed for vertical layout)
    Object.values(genomeView.genesById).forEach(g => {
      if (g.polygon) g.polygon.forEach(([x, y]) => {
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      });
    });
    Object.values(genomeView.ncRNAsById).forEach(nc => {
      if (nc.polygon) nc.polygon.forEach(([x, y]) => {
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      });
    });
    genomeView.getAllDomains().forEach(d => {
      if (d.polygon) d.polygon.forEach(([x, y]) => {
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      });
    });
    
    // Baselines (for tree offset calculation - but use actual minX from all features)
    Object.values(genomeView.nucleotidesBySeqid).forEach(nuc => {
      if (nuc.baseline) {
        minBaselineX = Math.min(minBaselineX, nuc.baseline.start, nuc.baseline.end);
      }
    });
    // Tree paths: get maxX with scaling
    let treeMaxX = -Infinity;
    const treeXScale = treeXScaleOverride !== null ? treeXScaleOverride / 100 : 
                      (config.tree && typeof config.tree.xScalePercent === 'number') ? config.tree.xScalePercent / 100 : 1;
    if (tree) tree.buildEdges().forEach(e => {
      e.path.forEach(([x, y]) => {
        treeMaxX = Math.max(treeMaxX, x * treeXScale);
      });
    });
    // Set geneOffset so that minX is at configurable position
    const geneOffset = isFinite(minX) ? (config.layout.geneOffset - minX) : 0;
    // Compute offset to align tree's maxX to the leftmost genome feature (not just baseline)
    // Use the actual minX from all genome features, not just baselines
    // Always keep tree to the left of genome features by a configurable gap
    const treeGap = config.tree.gap;
    const leftmostGenomeX = isFinite(minX) ? minX : minBaselineX;
    
    // Only apply treeLabelPadding when phylo labels are positioned after tree
    const effectivePhyloLabelPosition = phyloLabelPosition || config.tree?.phyloLabelPosition || 'after-tree';
    const labelPadding = effectivePhyloLabelPosition === 'after-tree' ? treeLabelPadding : 0;
    
    const treeOffset = isFinite(treeMaxX) && isFinite(leftmostGenomeX)
      ? (leftmostGenomeX - treeMaxX - treeGap - labelPadding)
      : 0;
    // Fallback
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      const fallback = config.layout.containerFallback;
      minX = fallback.minX; minY = fallback.minY; maxX = fallback.maxX; maxY = fallback.maxY;
    }
    return { minX, minY, maxX, maxY, treeOffset, geneOffset };
  }

  // External function to fit view to bounds
  // Update container size on mount and resize
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(el);
    // initial
    setContainerSize({ width: el.clientWidth || 0, height: el.clientHeight || 0 });
    return () => ro.disconnect();
  }, [containerRef.current]);

  // Function to detect alignment and find the actual alignment reference point
  function getAlignmentReferencePoint(genomeView) {
    if (!genomeView) return null;
    
    // Check if any track has been offset (indicating alignment has occurred)
    const hasOffsets = genomeView.leaves.some(hood_id => 
      genomeView.trackOffset && genomeView.trackOffset[hood_id] !== undefined && genomeView.trackOffset[hood_id] !== 0
    );
    
    // For traditional alignments, even if all offsets are 0, we still have alignment
    const hasTraditionalAlignment = (defaultAlign === 'start' || defaultAlign === 'center' || defaultAlign === 'end') &&
      genomeView.leaves.some(hood_id => genomeView.trackOffset && genomeView.trackOffset[hood_id] !== undefined);
    
    if (!hasOffsets && !hasTraditionalAlignment) {
      // No alignment detected 
      return null;
    }
    
    // Alignment is detected - find the actual visual coordinate where genes are aligned
    
    // For cluster alignment, find the visual X coordinate of aligned genes (takes precedence over default alignment)
    if (alignCluster != null && alignCluster !== '') {
        // Find genes in the aligned cluster
        const clusterGenes = Object.entries(genomeView.genesById || {})
          .filter(([uniqueGeneId, gene]) => {
            const clusterValue = genomeView.proteinClusters && genomeView.proteinClusters[uniqueGeneId];
            return String(clusterValue) === String(alignCluster);
          })
          .map(([uniqueGeneId, gene]) => gene);
      
        if (clusterGenes.length > 0) {
          // Use the first gene's visual X coordinate as the alignment reference
          const referenceGene = clusterGenes[0];
          const visualX = GenomeView.getGeneVisualX(referenceGene, genomeView);
          return visualX;
        }
    }
    
    // For traditional alignments (start/center/end), the alignment point is coordinate 0
    if (defaultAlign === 'start' || defaultAlign === 'center' || defaultAlign === 'end') {
      return 0;
    }
    
    // For default gene alignment, find the visual X coordinate of aligned default genes
    if (useDefaultGeneAlignment) {
      // Find genes that are default alignment genes
      const defaultGenes = [];
      for (const hood_id of genomeView.leaves) {
        const hoodBaseline = genomeView.hoodBaselines[hood_id];
        if (hoodBaseline && hoodBaseline.align_gene) {
          const uniqueGeneId = `${hood_id}_${hoodBaseline.align_gene}`;
          const gene = genomeView.genesById[uniqueGeneId];
          if (gene) {
            defaultGenes.push(gene);
          }
        }
      }
      
      if (defaultGenes.length > 0) {
        // Use the first default gene's visual X coordinate as the alignment reference
        const referenceGene = defaultGenes[0];
        const visualX = GenomeView.getGeneVisualX(referenceGene, genomeView);
        return visualX;
      }
    }
    
    // Fallback: find the most common visual X coordinate among all genes
    const visualXGroups = {};
    let totalGenes = 0;
    
    Object.values(genomeView.genesById).forEach(gene => {
      const visualX = GenomeView.getGeneVisualX(gene, genomeView);
      if (visualX !== null) {
        const roundedX = Math.round(visualX); // Round to handle floating point precision
        
        if (!visualXGroups[roundedX]) {
          visualXGroups[roundedX] = 0;
        }
        visualXGroups[roundedX]++;
        totalGenes++;
      }
    });
    
    // Find the visual X coordinate that has the most genes aligned to it
    let maxCount = 0;
    let alignmentPoint = null;
    
    for (const [visualX, count] of Object.entries(visualXGroups)) {
      if (count > maxCount && count > 1) { // Must have at least 2 genes aligned
        maxCount = count;
        alignmentPoint = parseFloat(visualX);
      }
    }
    
    return alignmentPoint;
  }
  
  // Add after viewState and bounds are available
  const bounds = computeBounds(genomeViewRef.current, tree, phyloLabelPosition, effectiveTreeXScale);
  const minY = bounds.minY;
  const maxY = bounds.maxY;
  // Normalized scrollbar state (0-100)
  const [scrollNorm, setScrollNorm] = React.useState(0);
  // Compute minY/maxY from bounds
  // When viewState changes, update normalized scroll position (but only when not actively scrolling)
  React.useEffect(() => {
    // Add a small delay to avoid updating scroll position during active user interaction
    const timer = setTimeout(() => {
      if (viewState && isFinite(viewState.target[1]) && isFinite(minY) && isFinite(maxY) && maxY > minY) {
        const norm = ((maxY - viewState.target[1]) / (maxY - minY)) * 100;
        setScrollNorm(norm);
      }
    }, 50); // 50ms delay to avoid conflicts with rapid scrolling
    
    return () => clearTimeout(timer);
  }, [viewState?.target?.[1], minY, maxY]); // Only track Y position, not entire viewState 

  // Compute visible Y range for DeckGL (based on zoom and container height)
  let visibleFraction = 1;
  if (viewState && containerSize.height && maxY > minY) {
    // OrthographicView: 1 unit = 1 px at zoom=0, zoom is log2 scale
    const scale = Math.pow(2, viewState.zoom || 0);
    const visibleY = containerSize.height / scale;
    visibleFraction = Math.min(1, visibleY / (maxY - minY));
  }

  // Tooltip handler for DeckGL
  const getTooltip = ({object, layer}) => {
    if (!object) return null;
    // Show metadata for nodes (tree), genes, domains, protein links, nucleotide links
    if (object.metadata) {
      // Format metadata as HTML table, but exclude 'sequence' field and 'attributes' (case-insensitive),
      // and skip any values that are objects to avoid '[object Object]' rendering.
      const meta = object.metadata || {};
      const entries = Object.entries(meta).filter(([k, v]) => {
        if (!k) return false;
        const key = String(k).toLowerCase();
        if (key === 'sequence' || key === 'attributes') return false;
        if (v === null || v === undefined) return false;
        // skip complex objects/arrays to avoid ugly stringification
        const t = typeof v;
        return (t === 'string' || t === 'number' || t === 'boolean');
      });
      if (entries.length === 0) return null;
      const html = `<table>${entries.map(([k, v]) => `<tr><td><b>${k}</b></td><td style="width:10px"></td><td>${String(v)}</td></tr>`).join('')}</table>`;
      return { html };
    }
    // Fallback for legacy or missing metadata
    if (object.name) return { text: object.name };
    if (object.gene_id) return { text: object.gene_id };
    return null;
  };

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
      if (geneColorMap && key !== null && key !== undefined && key !== '') {
        col = geneColorMap.get(key) || null;
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

  // Function to apply color palette to phylogenetic labels
  function applyPhyloPalette(treeLabels, treeColorBy, treeMetadata, phyloPalette) {
    if (!phyloPalette || !phyloPalette.enabled) {
      // Ensure no colors are applied if phyloPalette is null or not enabled
      return treeLabels.map(label => ({
        ...label,
        color: [0, 0, 0, 255] // Default to black or uncolored
      }));
    }

    // Collect unique values for the color-by field
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
    if (phyloPalette.name) {
      try {
        paletteColors = getPaletteColors(
          phyloPalette.name,
          Math.max(sortedColorValues.length, phyloPalette.numColors || sortedColorValues.length),
          phyloPalette.reverse || false
        );
      } catch (error) {
        // Handle error
      }
    }

    // Create color mapping
    const colorValueToColor = {};
    sortedColorValues.forEach((value, i) => {
      colorValueToColor[value] = paletteColors[i % paletteColors.length];
    });
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

  // 🚀 PERFORMANCE: Pre-compute and memoize color mappings
  const geneColorMap = React.useMemo(() => {
    if (!genomeView || !effectiveGenePalette?.enabled) return null;
    const primaryField = geneColorBy || colorBy || 'cluster';
    const genes = Object.values(genomeView.genesById);

    const extractKey = (g) => {
      let key = g?.metadata?.[primaryField];
      if (key === null || key === undefined || key === '') {
        // Common fallbacks when using clusters
        if (primaryField === 'cluster') {
          key = g?.metadata?.clusterId ?? g?.metadata?.cluster_id ?? g?.cluster;
        }
      }
      return key;
    };

    const validKeys = genes
      .map(extractKey)
      .filter(key => key !== null && key !== undefined && key !== '');
    
    const uniqueKeys = [...new Set(validKeys)];
    if (uniqueKeys.length === 0) return null;

    const colors = getPaletteColors(
      effectiveGenePalette.name,
      Math.max(uniqueKeys.length, effectiveGenePalette.numColors || uniqueKeys.length),
      effectiveGenePalette.reverse || false
    );
    
    const colorMap = new Map();
    uniqueKeys.forEach((key, i) => {
      colorMap.set(key, colors[i % colors.length]);
    });
    return colorMap;
  }, [
    genomeView,
    // depend on primitive palette properties so toggling/enabling recomputes reliably
    effectiveGenePalette?.enabled,
    effectiveGenePalette?.name,
    effectiveGenePalette?.numColors,
    effectiveGenePalette?.reverse,
    colorBy,
    geneColorBy,
    alignmentVersion
  ]);

  // 🚀 CRITICAL: Apply gene colors and link colors BEFORE filtering polygons
  // This ensures link colors are applied with proper gene colors available
  React.useMemo(() => {
    if (!genomeView) return null;
    
    // If palette disabled, explicitly reset gene fill colors to theme default
    if (!effectiveGenePalette?.enabled) {
      Object.values(genomeView.genesById).forEach(g => {
        g.fillColor = themeColors.geneFill;
      });
    } else {
      // Apply gene colors first when palette enabled
      const effectiveGeneColorField = geneColorBy || colorBy || 'cluster';
      Object.values(genomeView.genesById).forEach(g => {
        let fillColor = themeColors.geneFill;
        if (geneColorMap) {
          let key = g.metadata?.[effectiveGeneColorField];
          if (key === null || key === undefined || key === '') {
            if (effectiveGeneColorField === 'cluster') {
              key = g?.metadata?.clusterId ?? g?.metadata?.cluster_id ?? g?.cluster;
            }
          }
          if (key !== null && key !== undefined && key !== '') {
            const mappedColor = geneColorMap.get(key);
            fillColor = mappedColor || themeColors.geneFill;
          }
        }
        g.fillColor = fillColor;
      });
    }

    // Now apply link colors with proper gene colors available
    if (proteinLinkConfig && proteinLinkConfig.colorBy) {
      try { genomeView.applyProteinLinkColors(proteinLinkConfig); } catch (e) {}
    }
    
    if (nucleotideLinkConfig && nucleotideLinkConfig.colorBy) {
      try { genomeView.applyNucleotideLinkColors(nucleotideLinkConfig); } catch (e) {}
    }
    
    return true; // Just return something for the memoization
  }, [
    genomeView,
    geneColorMap,
    proteinLinkConfig,
    nucleotideLinkConfig,
    colorBy,
    geneColorBy,
    themeColors.geneFill,
    alignmentVersion,
    // ensure palette toggles and changes force recompute
    effectiveGenePalette?.enabled,
    effectiveGenePalette?.name,
    effectiveGenePalette?.numColors,
    effectiveGenePalette?.reverse
  ]);

  // 🚀 PERFORMANCE: Get fresh polygons AFTER colors are applied
  const { filteredProteinPolygons, filteredNucleotidePolygons } = React.useMemo(() => {
    if (!genomeView) return { filteredProteinPolygons: [], filteredNucleotidePolygons: [] };
    
    
    
    const leaves = genomeView.leaves;
    // Get fresh polygons after colors have been applied
    const proteinPolygons = genomeView.getProteinPolygons();
    const nucleotidePolygons = genomeView.getNucleotidePolygons();
    
    // Log first few protein polygon coordinates to see if they're updating
    
    
    // NOTE: Link colors are now already applied above
    
    // TEMPORARILY DISABLE FILTERING TO DEBUG
    // Just return all polygons to see if they appear
    return { 
      filteredProteinPolygons: proteinPolygons, 
      filteredNucleotidePolygons: nucleotidePolygons 
    };
    
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
  }, [genomeView, proteinLinks, nucleotideLinks, alignmentVersion, proteinLinkConfig, nucleotideLinkConfig, geneColorMap, effectiveGenePalette]);

  // 🚀 CRITICAL: Extract genes AFTER pre-filtering applies colors
  const genes = React.useMemo(() => {
    if (!genomeView) return [];
    return Object.values(genomeView.genesById).map(g => {
      // Gene colors already applied in pre-filtering section above
      return { ...g, fillColor: g.fillColor || themeColors.geneFill };
    });
  }, [genomeView, geneColorMap, geneColorBy, colorBy, themeColors.geneFill, alignmentVersion]);

  // 🚀 CRITICAL: Build legend data AFTER gene coloring is complete
  const buildLegendData = React.useCallback(() => {
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
        // Use genes with colors already applied
        genes.forEach(g => {
          const val = (g.metadata && g.metadata[field]) ? g.metadata[field] : null;
          if (val !== null && val !== undefined) {
            const key = String(val);
            if (!geneVals.has(key)) {
              geneVals.set(key, { value: key, color: g.fillColor, stroke: g.strokeColor || (Array.isArray(g.fillColor) ? darkenColor(g.fillColor) : null) });
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
            paletteColors = getPaletteColors(
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
          try { palette = getPaletteColors(cfg.palette.name, cfg.palette.numColors || 8, cfg.palette.reverse || false); } catch(e) { palette = []; }
          legend.proteinLinks = { mode: 'identity_gradient', minSim, maxSim, palette };
        } else if (cfg.colorBy === 'source_gene' || cfg.colorBy === 'target_gene') {
          const list = [];
          gv.proteinLinks.forEach(l => {
            const gA = gv.genesById && gv.genesById[l.gAId];
            const gB = gv.genesById && gv.genesById[l.gBId];
            if (cfg.colorBy === 'source_gene' && gA) {
                list.push({ id: l.gAId, label: gA.metadata ? gA.metadata[geneColorBy || colorBy] : gA.id, color: gA.fillColor, stroke: gA.strokeColor || (Array.isArray(gA.fillColor) ? darkenColor(gA.fillColor) : null) });
            }
            if (cfg.colorBy === 'target_gene' && gB) {
                list.push({ id: l.gBId, label: gB.metadata ? gB.metadata[geneColorBy || colorBy] : gB.id, color: gB.fillColor, stroke: gB.strokeColor || (Array.isArray(gB.fillColor) ? darkenColor(gB.fillColor) : null) });
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
          try { palette = getPaletteColors(cfg.palette.name, cfg.palette.numColors || 8, cfg.palette.reverse || false); } catch(e) { palette = []; }
          legend.nucleotideLinks = { mode: 'identity_gradient', minSim, maxSim, palette };
        } else if (cfg.colorBy === 'source_gene' || cfg.colorBy === 'target_gene') {
          const list = [];
          gv.nucleotideLinks.forEach(l => {
            const gA = gv.genesById && gv.genesById[l.gAId];
            const gB = gv.genesById && gv.genesById[l.gBId];
            if (cfg.colorBy === 'source_gene' && gA) {
                list.push({ id: l.gAId, label: gA.metadata ? gA.metadata[geneColorBy || colorBy] : gA.id, color: gA.fillColor, stroke: gA.strokeColor || (Array.isArray(gA.fillColor) ? darkenColor(gA.fillColor) : null) });
            }
            if (cfg.colorBy === 'target_gene' && gB) {
                list.push({ id: l.gBId, label: gB.metadata ? gB.metadata[geneColorBy || colorBy] : gB.id, color: gB.fillColor, stroke: gB.strokeColor || (Array.isArray(gB.fillColor) ? darkenColor(gB.fillColor) : null) });
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
  }, [genomeView, genes, geneColorMap, geneColorBy, colorBy, proteinLinkConfig, nucleotideLinkConfig, treeColorBy, phyloPalette, treeMetadata, treeLabelBy, tree, effectivePhyloPalette]);

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
  React.useEffect(() => {
    if (!genomeView) return;
    
    
    setAlignmentVersion(prev => prev + 1);
  }, [genomeView, proteinMetadata, nonCodingMetadata, proteinLinkConfig, nucleotideLinkConfig, geneColorBy, colorBy, arrowheadHeightDisplay, geneHeightDisplay]);

  // When live slider overrides change (arrowhead/gene height) we also want to
  // force an immediate polygon / layer recompute so the UI updates while
  // the user is dragging. This is kept intentionally small and only bumps
  // the alignmentVersion which is included in layer updateTriggers.
  React.useEffect(() => {
    const gv = genomeViewRef.current;
    if (!gv) return;
    // Bump alignmentVersion to force layers to recompute accessors and
    // re-read polygon shapes generated above.
    setAlignmentVersion(prev => prev + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrowheadHeightDisplay, geneHeightDisplay]);

  const domainColorMap = React.useMemo(() => {
    if (!genomeView || !effectiveDomainPalette?.enabled) return null;
    
    const domains = genomeView.getAllDomains();
    const validKeys = domains
      .map(d => {
        switch(domainColorBy) {
          case 'domainName': return d.domainName;
          case 'start': return d.start;
          case 'end': return d.end;
          case 'evalue': return d.evalue;
          default: return d.domainName;
        }
      })
      .filter(key => key !== null && key !== undefined && key !== '');
    
    const uniqueKeys = [...new Set(validKeys)];
    if (uniqueKeys.length === 0) return null;
    
    const colors = getPaletteColors(
      effectiveDomainPalette.name,
      Math.max(uniqueKeys.length, effectiveDomainPalette.numColors || uniqueKeys.length),
      effectiveDomainPalette.reverse || false
    );
    
    const colorMap = new Map();
    uniqueKeys.forEach((key, i) => {
      colorMap.set(key, colors[i % colors.length]);
    });
    return colorMap;
  }, [genomeView, effectiveDomainPalette, domainColorBy]);

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
    if (geneColorMap && geneColorMap.size > 0) {
      const items = Array.from(geneColorMap.entries()).slice(0, 20).map(([k, color]) => ({ label: String(k), color }));
      entries.push({ id: 'genes', title: 'Gene families', items });
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
          paletteColors = getPaletteColors(
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
          pal = getPaletteColors(
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
          pal = getPaletteColors(
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

  // REMOVED: link coloring effect - now integrated into genomeView creation during construction

  // 🚀 PERFORMANCE: Pre-compute rightmost positions for 'after-tracks' mode (O(N+M) instead of O(N×M))
  const rightmostPositionsByLeaf = React.useMemo(() => {
    const genomeView = genomeViewRef.current;
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
    const nucleotideBaselines = genomeView.nucleotideLinks.filter(link => link.baseline);
    nucleotideBaselines.forEach(baseline => {
      if (baseline.hood_id && positions.has(baseline.hood_id)) {
        const currentMax = positions.get(baseline.hood_id);
        positions.set(baseline.hood_id, Math.max(currentMax, Math.max(baseline.start, baseline.end)));
      }
    });
    
    return positions;
  }, [genomeViewRef.current, tree, phyloLabelPosition, config.tree?.phyloLabelPosition, alignmentVersion, effectiveTreeXScale, phyloPalette, treeColorBy, treeMetadata, treeLabelBy]);

  const layers = React.useMemo(() => {
  const layersStartTime = performance.now();
    
    const genomeView = genomeViewRef.current;
    if (!genomeView || !tree) {
      return [];
    }
    
    // Use styleConfig if available, otherwise fall back to config
    const baseConfig = styleConfig || config;
    
    // Create effectiveConfig with tree X-scale override from state
    const effectiveConfig = {
      ...baseConfig,
      tree: {
        ...baseConfig.tree,
        xScalePercent: effectiveTreeXScale
      },
      // Allow live slider overrides to take precedence for immediate feedback
      gene: {
        ...baseConfig.gene,
        height: typeof geneHeightDisplay === 'number' ? geneHeightDisplay : baseConfig.gene.height,
        arrowheadHeight: typeof arrowheadHeightDisplay === 'number' ? arrowheadHeightDisplay : baseConfig.gene.arrowheadHeight
      }
    };
    
    // 🚀 POLYGON UPDATES FOR NON-GENE FEATURES
    // Gene polygons are now computed directly in Deck.gl layer for better performance
    
  const polygonUpdateStart = performance.now();
  
    
    // Update ncRNA polygons synchronously  
    for (const uniqueNcId in genomeView.ncRNAsById) {
      const nc = genomeView.ncRNAsById[uniqueNcId];
  nc.config = effectiveConfig;
  // Ensure the instance feature height matches live display config
  if (typeof effectiveConfig?.gene?.height === 'number') nc.featureHeight = effectiveConfig.gene.height;
  if (nc.updatePolygon) nc.updatePolygon();
    }
    
    // Update domain polygons synchronously
    genomeView.getAllDomains().forEach(domain => {
      domain.config = effectiveConfig;
      if (domain.updatePolygon) domain.updatePolygon();
    });

    // Update protein links polygons synchronously
    if (genomeView.proteinLinks) {
      genomeView.proteinLinks.forEach(link => {
        link.config = effectiveConfig;
        if (link.updatePolygon) link.updatePolygon();
      });
    }

    // Update nucleotide links polygons synchronously
    if (genomeView.nucleotideLinks) {
      genomeView.nucleotideLinks.forEach(link => {
        link.config = effectiveConfig;
        if (link.updatePolygon) link.updatePolygon();
      });
    }

    // Update region polygons synchronously
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

    // Ensure gene instances reflect the live gene height so downstream
    // label computations and any other per-gene sizing read the current value.
    try {
      if (typeof effectiveConfig?.gene?.height === 'number') {
        for (const gid in genomeView.genesById) {
          const gg = genomeView.genesById[gid];
          if (gg) gg.geneHeight = effectiveConfig.gene.height;
        }
      }
    } catch (e) {}
    
  const polygonUpdateTime = performance.now() - polygonUpdateStart;
  
    
    // Use treeOffset and geneOffset for all tree-related and genome-related X shifts
  const bounds = computeBounds(genomeView, tree, phyloLabelPosition, effectiveTreeXScale);
    const treeOffset = bounds.treeOffset || 0;
    
    // Use pre-filtered and pre-computed data but create fresh copies so
    // DeckGL receives new object identities when underlying geometry changes.
    const proteinPolygons = (filteredProteinPolygons || []).map((p, index) => ({
      // shallow copy metadata and ensure polygon array identity is new
      ...p,
      polygon: (p.polygon || []).map(pt => [pt[0], pt[1]]),
      fillColor: p.fillColor || themeColors.proteinFill || p.fillColor,
      // Add a unique key that changes when alignmentVersion changes to force identity change
      _alignmentKey: `${alignmentVersion}_${index}`
    }));

    const nucleotidePolygons = (filteredNucleotidePolygons || []).map((p, index) => ({
      ...p,
      polygon: (p.polygon || []).map(pt => [pt[0], pt[1]]),
      fillColor: p.fillColor || themeColors.nucleotideFill || p.fillColor,
      _alignmentKey: `${alignmentVersion}_${index}`
    }));
    
    // --- OPTIMIZED REGION COLORING ---
    const regionPolygons = genomeView.getAllRegions().map(r => {
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
    // --- GENE EXTRACTION MOVED AFTER COLORING ---
    // Genes will be extracted after pre-filtering section applies colors

    // --- OPTIMIZED DOMAIN COLORING ---
    const domains = genomeView.getAllDomains().map(d => {
      let fillColor = themeColors.domainFill;
      
      if (domainColorMap) {
        const key = (() => {
          switch(domainColorBy) {
            case 'domainName': return d.domainName;
            case 'start': return d.start;
            case 'end': return d.end;
            case 'evalue': return d.evalue;
            default: return d.domainName;
          }
        })();
        fillColor = domainColorMap.get(key) || themeColors.domainFill;
      }
      
      return { ...d, fillColor };
    });
    // Phylo tree paths (shifted)
    // Create baselines per hood (needed for phylo label positioning)  
    const nucleotideBaselines = genomeView.leaves
      .filter(hood_id => genomeView.hoodBaselines[hood_id] && genomeView.getTrackYByHoodId(hood_id) != null)
      .map(hood_id => {
        const hoodBaseline = genomeView.hoodBaselines[hood_id];
        const seqid = genomeView.hoodToSeqidMap[hood_id];
        const nuc = genomeView.nucleotidesBySeqid[seqid];
        
        // Get the current transformed baseline coordinates for this hood
        // We need to compute the baseline coordinates using the same logic as computeTrackPositions
        const offset = genomeView.trackOffset[hood_id] || 0;
        const flipped = !!genomeView.trackFlipped[hood_id];
        
        let anchor;
        // Use hood-relative coordinates for anchor to match GenomeView.computeTrackPositions
        if (hoodBaseline) {
          anchor = hoodBaseline.length / 2; // Center of hood
        } else {
          anchor = (nuc.baseline.origEnd - nuc.baseline.origStart) / 2; // Fallback
        }
        
        // Transform hood coordinates (0 to hood_length) using the same transformation logic
        const hoodStart = 0; // Hood coordinates always start at 0
        const hoodEnd = hoodBaseline.length; // Hood length
        
        const transformedStart = genomeView.constructor.getTransformedXUnified(hoodStart, anchor, offset, flipped);
        const transformedEnd = genomeView.constructor.getTransformedXUnified(hoodEnd, anchor, offset, flipped);
        
        // Apply global genome x scale around the anchor point (same as GenomeView.computeTrackPositions)
        const genomeXScale = (config.genome && typeof config.genome.xScalePercent === 'number') ? config.genome.xScalePercent / 100 : 1;
        const scaledStart = anchor + (transformedStart - anchor) * genomeXScale;
        const scaledEnd = anchor + (transformedEnd - anchor) * genomeXScale;
        return {
          hood_id: hood_id,
          seqid: seqid,
          start: scaledStart,
          end: scaledEnd,
          trackY: genomeView.getTrackYByHoodId(hood_id)
        };
      });

    // Use edges with metadata for tooltips - use current tree, not baseTree from genomeView
    // Get raw tree edges for direct computation in PathLayer
    const treeEdges = tree.buildEdges().map(edge => ({
      rawPath: edge.path, // Keep original coordinates for direct computation
      metadata: {
        source: edge.source.name || `internal_${edge.source.id}`,
        target: edge.target.name || `internal_${edge.target.id}`,
        length: edge.target.branchLength || 0,
        type: 'phylo_edge'
      },
      color: themeColors?.treeEdges || config.tree.edgeColor || [85,85,85,255] // Use current themeColors directly
    }));

    // Phylo labels - prepare raw data for direct computation in TextLayer
    const effectivePhyloLabelPosition = phyloLabelPosition || config.tree?.phyloLabelPosition || 'after-tree';
    const effectiveAlignLabels = alignLabels !== undefined ? alignLabels : (config.tree?.alignLabels !== undefined ? config.tree.alignLabels : true);
    
    let rawPhyloLabels = tree.leafNodes.map(l => {
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
        size: config.text.phyloLabelSize,
        textAnchor: 'start',
        alignmentBaseline: 'center',
        leafNode: l,
        labelPosition: effectivePhyloLabelPosition, // Store position mode
        rightmostX: effectivePhyloLabelPosition === 'after-tracks' ? rightmostPositionsByLeaf.get(l.name) : null
      };
    });

    // Apply palette to phylo labels if enabled
    let finalPhyloLabels;
    if (effectivePhyloPalette && effectivePhyloPalette.enabled && treeMetadata) {
      finalPhyloLabels = applyPhyloPalette(rawPhyloLabels, treeColorBy, treeMetadata, effectivePhyloPalette).map(lbl => {
        // Ensure fallback to themeColors.geneFill for labels without valid metadata
        const colorValue = treeMetadata?.[lbl.leafNode.name]?.[treeColorBy];
        return colorValue !== null && colorValue !== undefined && colorValue !== ''
          ? lbl
          : { ...lbl, color: themeColors.phyloLabelFill };
      });
    } else {
      finalPhyloLabels = rawPhyloLabels.map(lbl => {
        return { ...lbl, color: themeColors.phyloLabelFill };
      });
    }

    // Only keep valid ones
    const phyloLabels = finalPhyloLabels.filter(lbl => {
      const valid = Number.isFinite(lbl.rawY) && Number.isFinite(lbl.x) && typeof lbl.text === 'string' && lbl.text.trim() !== '';
      return valid;
    });
    // If array is empty, add a dummy label (not rendered)
    if (phyloLabels.length === 0) {
      phyloLabels.push({rawY: 0, x: 0, text: '_', color: [0,0,0,0], size: 1, textAnchor: 'start'});
    }
  // Compact signature of assigned colors to force DeckGL updateTriggers when colors change
  const phyloColorSignature = phyloLabels.map(d => Array.isArray(d.color) ? d.color.join(',') : String(d.color)).join('|');

    // Node points - prepare raw node data for direct computation in ScatterplotLayer
    const highlightLeaves = selectedNode ? new Set(genomeView.getNodeDescendantLeaves(selectedNode)) : null;
    const nodeRadius = config?.tree?.nodeRadius || { internal: 4, leaf: 2 };
    
    // Create a mapping from leaf names to their phylo label colors
    const leafNameToColorMap = new Map();
    if (phyloLabels && Array.isArray(phyloLabels)) {
      phyloLabels.forEach(label => {
        if (label.leafNode && label.leafNode.name) {
          leafNameToColorMap.set(label.leafNode.name, label.color);
        }
      });
    }
    
    const treeNodes = tree.allNodes.map(n => {
      const nodeLeaves = genomeView.getNodeDescendantLeaves(n);
      const isDesc = !selectedNode || nodeLeaves.some(l => highlightLeaves.has(l));
      let color;
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
                const paletteColors = getPaletteColors(
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
      if (selectedNode && !isDesc) {
        // Fade color for non-descendants
        color = color.map((c, i) => i === 3 ? c : Math.floor(c * 0.1));
      }
      return {
        id: n.id,
        node: n,
        rawY: n.y, // Keep original coordinates for direct computation
        x: n.x,
        color: color,
        radius: n.branchset.length > 0 ? nodeRadius.internal : nodeRadius.leaf,
        metadata: n.metadata || { name: n.name, id: n.id }
      };
    });

    // Helper function to adjust gene edge color based on theme
    const getGeneEdgeColor = (gene) => {
      const ensureRgba = (col) => {
        if (Array.isArray(col)) return col.length === 3 ? [col[0], col[1], col[2], 255] : col;
        if (typeof col === 'string') {
          const parts = col.split(',').map(n => parseInt(n.trim(), 10)).filter(v => !isNaN(v));
          if (parts.length === 3) return [parts[0], parts[1], parts[2], 255];
          if (parts.length >= 4) return [parts[0], parts[1], parts[2], parts[3]];
        }
        return Array.isArray(themeColors.geneFill) ? themeColors.geneFill : [150,150,150,255];
      };
      // Resolve live from palette if available
      let col = null;
      if (geneColorMap) {
        const primaryField = geneColorBy || colorBy || 'cluster';
        let key = gene?.metadata?.[primaryField];
        if (key === null || key === undefined || key === '') {
          if (primaryField === 'cluster') {
            key = gene?.metadata?.clusterId ?? gene?.metadata?.cluster_id ?? gene?.cluster;
          }
        }
        if (key !== null && key !== undefined && key !== '') {
          col = geneColorMap.get(key) || null;
        }
      }
      const fill = ensureRgba(col || gene.fillColor || effectiveConfig.gene.fillColor);
      const isLightTheme = themeColors.background === '#ffffff';
      const factor = isLightTheme ? 0.7 : 1.3;
      return [
        Math.max(0, Math.min(255, Math.floor(fill[0] * factor))),
        Math.max(0, Math.min(255, Math.floor(fill[1] * factor))),
        Math.max(0, Math.min(255, Math.floor(fill[2] * factor))),
        fill[3] ?? 255
      ];
    };
    
    // Build a fresh, plain-data view of genes from the authoritative GenomeView
    // This ensures DeckGL accessors read current numeric fields (start/end/trackY)
    // even if the GenomeView mutates objects in-place.
    // Build a fresh, plain-data view of genes from the authoritative GenomeView
    // Include both `id` and `uniqueId` and compute a final fillColor using any
    // available geneColorMap so DeckGL's getFillColor sees a concrete value.
    const genesData = Object.entries(genomeView.genesById).map(([uniqueId, g]) => {
      // Use the same key resolution logic as geneColorMap creation
      const effectiveGeneColorField = geneColorBy || colorBy || 'cluster';
      let mappedColor = null;
      try {
        if (geneColorMap && typeof geneColorMap.get === 'function') {
          let key = g.metadata?.[effectiveGeneColorField];
          if (key === null || key === undefined || key === '') {
            if (effectiveGeneColorField === 'cluster') {
              key = g?.metadata?.clusterId ?? g?.metadata?.cluster_id ?? g?.cluster;
            }
          }
          if (key !== null && key !== undefined && key !== '') {
            mappedColor = geneColorMap.get(key);
          }
        }
      } catch (e) {
        mappedColor = null;
      }

      // Priority: g.fillColor (already applied in memo above) > mappedColor > theme default
      const finalFill = g.fillColor || mappedColor || themeColors.geneFill;
      
      // Debug: log first few genes to see if coordinates are updating
      if (['gene_1', 'gene_2'].includes(g.id) || uniqueId.includes('gene_1') || uniqueId.includes('gene_2')) {
        
      }

      return {
  type: 'gene',
        id: g.id || uniqueId,
        uniqueId,
        start: g.start,
        end: g.end,
        trackY: g.trackY,
        strand: g.strand,
        fillColor: finalFill,
        geneHeight: g.geneHeight || effectiveConfig.gene.height,
        config: g.config || effectiveConfig,
        // keep polygon if other code reads it, but don't rely on it for rendering
        polygon: (g.polygon || []).map(pt => [pt[0], pt[1]]),
        metadata: g.metadata
      };
    });

    // Gene cluster labels (below genes) — build from fresh gene data
  const geneLabels = buildGeneLabels(genesData, geneColorMap, geneColorBy, colorBy, themeColors, effectiveConfig || config, geneLabelPosition);

    // Debug: log gene label sizing/positions to help diagnose why labels might appear static
    try {
      if (typeof console !== 'undefined' && console.debug) {
        console.debug('[PhyloTreeViewer] geneLabels sample:', {
          geneHeightDisplay: geneHeightDisplay,
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
        palette = getPaletteColors(linkConfig.palette.name, linkConfig.palette.numColors || 8, linkConfig.palette.reverse || false);
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
    const nucleotideLinkData = (genomeView.nucleotideLinks || []).map((l, i) => ({
      hoodA: l.hoodA,
      hoodB: l.hoodB,
      hoodStartA: l.hoodStartA,
      hoodEndA: l.hoodEndA,
      hoodStartB: l.hoodStartB,
      hoodEndB: l.hoodEndB,
      seqidA: l.seqidA,
      seqidB: l.seqidB,
      fillColor: l.fillColor,
      metadata: l.metadata,
      _k: `${alignmentVersion}_${i}`
    })).filter(d => d.hoodA && d.hoodB);

    // Build lightweight link data for live polygon computation in the layer accessor
    const proteinLinkData = (proteinPolygons || []).map((p, i) => ({
      gAId: p?.metadata?.gAId,
      gBId: p?.metadata?.gBId,
      fillColor: p.fillColor,
      metadata: p.metadata,
      _k: `${alignmentVersion}_${i}`
    })).filter(d => d.gAId && d.gBId);

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

    // Create the base layers array
    const layers = [
      new LineLayer({
        id: 'baselines',
        data: nucleotideBaselines,
        visible: showGeneLayer, // Baselines are part of the gene visualization
        getSourcePosition: d => [d.start, d.trackY],
        getTargetPosition: d => [d.end, d.trackY],
        getColor: themeColors.baselines || effectiveConfig.colors.darkGray || [85, 85, 85, 255],
        getWidth: effectiveConfig.stroke.baselineWidth || effectiveConfig.stroke.lineWidth,
        pickable: false
        ,
        updateTriggers: {
          getSourcePosition: [nucleotideBaselines, alignmentVersion],
          getTargetPosition: [nucleotideBaselines, alignmentVersion]
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
          getPolygon: [regionPolygons, alignmentVersion],
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
          const gA = gv?.genesById?.[d.gAId];
          const gB = gv?.genesById?.[d.gBId];
          return buildProteinPolygonFromGenes(gA, gB);
        },
        getFillColor: d => d.fillColor,
        stroked: false,
        autoHighlight: true,
        filled: true,
        pickable: true,
        updateTriggers: {
          getPolygon: [proteinLinkData.length, alignmentVersion],
          getFillColor: [proteinLinkData.length, proteinLinkConfig, geneColorMap, alignmentVersion]
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
          const trackYA = gv.getTrackYByHoodId(d.hoodA);
          const trackYB = gv.getTrackYByHoodId(d.hoodB);
          if (trackYA == null || trackYB == null) return [];

          const xScalePercent = (gv.config.genome && typeof gv.config.genome.xScalePercent === 'number') ? gv.config.genome.xScalePercent : 100;
          const xScale = xScalePercent / 100;

          const blA = gv.hoodBaselines[d.hoodA];
          const blB = gv.hoodBaselines[d.hoodB];
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
        getFillColor: d => d.fillColor,
        stroked: false,
        filled: true,
        autoHighlight: true,
        pickable: true,
        updateTriggers: {
          getPolygon: [nucleotideLinkData.length, alignmentVersion, (genomeViewRef.current && genomeViewRef.current.config && genomeViewRef.current.config.genome && genomeViewRef.current.config.genome.xScalePercent) || null],
          getFillColor: [nucleotideLinkData.length, nucleotideLinkConfig, alignmentVersion]
        }
      }),
  // Phylogenetic tree paths
      new PathLayer({
        id: 'phylo-tree',
        data: treeEdges,
        visible: showTreeLayer,
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
      // Domains (render below genes so genes are clickable on top)
      new PolygonLayer({
        id: 'domains',
        data: domains,
        visible: showDomainLayer,
        getPolygon: d => d.polygon,
        getFillColor: d => d.fillColor || themeColors.geneFill || config.colors.gray,
        stroked: true,
        getLineColor: () => config.colors.black,
        getLineWidth: () => config.domain.edgeWidth || 2,
        lineWidthUnits: 'pixels',
        filled: true,
        autoHighlight: true,
        pickable: true,
        updateTriggers: {
          getPolygon: [domains.length, alignmentVersion, effectiveConfig.domain.height], // Use effectiveConfig
          getFillColor: [domains.length, domainColorMap, domainColorBy, themeColors.domainFill],
          getLineWidth: effectiveConfig.domain.edgeWidth
        }
      }),
      // Genes (placed after domains and links for topmost picking)
      new PolygonLayer({
        id: 'genes',
        data: genesData,
        visible: showGeneLayer,
  getPolygon: d => {
          // Compute polygon directly in Deck.gl layer with current effectiveConfig values
          // reference alignmentVersion so closure captures it (helps ensure re-evaluation semantics)
          const _alignmentVersion = alignmentVersion;
          const trackY = d.trackY;
          if (trackY === null || trackY === undefined) return [];
          
          // Use current config values (including live slider overrides)
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
          
          // Build 7-vertex arrow polygon directly
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
          } else {
            return [
              [end, trackY - halfH],
              [start + tipWidth, trackY - halfH],
              [start + tipWidth, trackY - arrowheadHalfHeight],
              [start, trackY],
              [start + tipWidth, trackY + arrowheadHalfHeight],
              [start + tipWidth, trackY + halfH],
              [end, trackY + halfH]
            ];
          }
        },
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

          let col = null;
          if (geneColorMap) {
            const primaryField = geneColorBy || colorBy || 'cluster';
            let key = d?.metadata?.[primaryField];
            if (key === null || key === undefined || key === '') {
              if (primaryField === 'cluster') {
                key = d?.metadata?.clusterId ?? d?.metadata?.cluster_id ?? d?.cluster;
              }
            }
            if (key !== null && key !== undefined && key !== '') {
              col = geneColorMap.get(key) || null;
            }
          }
          if (!col) col = d.fillColor || themeColors.geneFill || effectiveConfig.gene.fillColor;
          return ensureRgba(col);
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
            genesData.length,
            genesShapeSignature,
            alignmentVersion,
            effectiveConfig.gene.height,
            effectiveConfig.gene.defaultHeight,
            effectiveConfig.gene.arrowheadHeight,
            effectiveConfig.gene.tipWidthFactor,
            arrowheadHeightDisplay,
            geneHeightDisplay
          ],
          getFillColor: [
            genesData.length,
            geneColorMap,
            geneColorBy,
            colorBy,
            proteinMetadata,
            themeColors.geneFill,
            alignmentVersion
          ],
          getLineColor: [genesData.length, themeColors.geneFill, effectiveConfig.gene.edgeWidth, alignmentVersion],
          getLineWidth: effectiveConfig.gene.edgeWidth,
          stroked: effectiveConfig.gene.edgeWidth
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
  getSize: d => d.size * (config.text?.scaleFactors?.gene || 1),
  sizeUnits: 'meters',
        fontFamily: 'sans-serif',
        getTextAnchor: d => d.textAnchor || 'middle',
        getAlignmentBaseline: d => d.alignmentBaseline || 'top',
        pickable: false,
        updateTriggers: {
          getPosition: [geneLabels, alignmentVersion, (effectiveConfig && effectiveConfig.gene ? effectiveConfig.gene.height : null), geneHeightDisplay, geneLabelPosition],
          getText: [geneLabels],
          getColor: [geneLabels, geneColorBy, (effectiveGenePalette && effectiveGenePalette.name) || null],
          getSize: [(effectiveConfig && effectiveConfig.gene ? effectiveConfig.gene.height : null), geneLabels, geneHeightDisplay, geneLabelPosition],
          getAlignmentBaseline: [geneLabels, geneLabelPosition, alignmentVersion]
        }
      }),
      // Phylo labels
      new TextLayer({
        id: 'phylo-labels',
        data: phyloLabels,
        visible: showTreeTextLayer,
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
                rightmostX = d.rawY * treeXScale + treeOffset + (config.tree?.labelOffset || 10);
              } else {
                // Add offset after the rightmost genome feature
                rightmostX += (config.tree?.labelOffset || 10);
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
              xPosition = maxTreeX + treeOffset + (config.tree?.labelOffset || 10);
            } else {
              // Default: individual positioning based on tree depth
              xPosition = d.rawY * treeXScale + treeOffset + (config.tree?.labelOffset || 10);
            }
          }
          
          return [xPosition, d.x];
        },
        getText: d => d.text,
        getColor: d => d.color,
        getSize: d => d.size * config.text.scaleFactors.phylo,
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
      // Node points
      new ScatterplotLayer({
        id: 'nodes',
        data: treeNodes,
        visible: showTreeLayer,
        getPosition: d => {
          // Compute position directly in ScatterplotLayer with current effectiveConfig values
          const treeXScale = (effectiveConfig.tree && typeof effectiveConfig.tree.xScalePercent === 'number') ? effectiveConfig.tree.xScalePercent / 100 : 1;
          return [d.rawY * treeXScale + treeOffset, d.x];
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
          // Only include leaves that have corresponding genome tracks
          const trackY = genomeView.getTrackYByHoodId(leaf.name);
          return trackY != null;
        })
        .map(leaf => {
          const trackY = genomeView.getTrackYByHoodId(leaf.name);
          
          // Find the leftmost point of the genome track for this leaf
          let genomeStartX = Infinity;
          
          // Check baselines first - they represent the start of genome tracks
          const baselineForLeaf = nucleotideBaselines.find(baseline => baseline.hood_id === leaf.name);
          if (baselineForLeaf) {
            // Use the leftmost coordinate of the baseline (accounts for flipping)
            genomeStartX = Math.min(baselineForLeaf.start, baselineForLeaf.end);
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
    let ncRNAs = Object.values(genomeView.ncRNAsById);
    // Colors are now applied directly during GenomeView creation if palette is enabled
    ncRNAs = ncRNAs.map(nc => {
      return {
        ...nc,
        fillColor: nc.fillColor || (nc.metadata && nc.metadata.color) || themeColors.geneFill
      };
    });
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
          getPolygon: [ncRNAs.length, effectiveConfig.gene.height, effectiveConfig.gene.arrowheadHeight, alignmentVersion], // Include alignmentVersion so positions update
          getFillColor: [ncRNAs, alignmentVersion],
          getLineColor: [ncRNAs, alignmentVersion],
          getLineWidth: effectiveConfig.gene.edgeWidth,
          stroked: effectiveConfig.gene.edgeWidth
        }
      })
    );

  const layersEndTime = performance.now();
    
  return layers;
  }, [
    // Core data dependencies only
    alignmentVersion,
    tree, 
    selectedNode, 
    // Color-specific dependencies
    geneColorMap,
    domainColorMap, 
  // Effective theme (resolved) — use this so memo updates when the active theme changes
  resolvedTheme,
    // Essential UI state
    showConnectingLines,
    phyloLabelPosition,
    alignLabels,
    // Label dependencies
    labelBy,
    treeLabelBy,
  // Tree coloring dependencies - force recompute of phylo label data when controls change
  treeColorBy,
  phyloPalette,
  treeMetadata,
    // Include styleConfig to capture debounced visual property changes (takes precedence)
    styleConfig,
  // Live slider overrides - ensure immediate polygon/shape updates while dragging
  arrowheadHeightDisplay,
  geneHeightDisplay,
    // Include specific config properties for instant updates
    config.gene.height,
    config.gene.defaultHeight, 
    config.gene.arrowheadHeight,
    config.gene.tipWidthFactor,
    config.domain.height,
    config.tree.edgeWidth,
    config.gene.edgeWidth,
  effectiveTreeXScale,
    // Link coloring dependencies
    proteinLinkConfig,
    nucleotideLinkConfig,
    // Metadata dependencies - critical for gene/link coloring
    proteinMetadata,
    nonCodingMetadata,
    // Color field dependencies
    colorBy,
    geneColorBy,
    domainColorBy,
    // Palette dependencies
    genePalette,
    domainPalette,
    proteinLinkConfig,
    nucleotideLinkConfig
  ,
    // geneColorBy affects geneColorMap and rendering
    geneColorBy,
    // Layer visibility dependencies
    showTreeLayer,
    showGeneLayer,
    showDomainLayer,
    showProteinLinkLayer,
    showNucleotideLinkLayer,
    showNcRNALayer,
    showGeneTextLayer,
    showTreeTextLayer
  ]);

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
      console.log('🚀 SKIPPING REACT ALIGNMENT EFFECT - HELPER EXISTS');
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
          const hasDefaultGenes = Object.values(gv.hoodBaselines || {}).some(baseline => baseline.align_gene);
          
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

  // Expose export functionality via ref
  useImperativeHandle(ref, () => ({
    exportToSVG: () => {
      if (!layers || !viewState) {
        return;
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
        viewState,
        alignmentReferencePoint: getAlignmentReferencePoint(genomeViewRef.current),
  bounds,
  genomeView: genomeViewRef.current,
        precomputedTicks: rulerWidgetRef.current ? rulerWidgetRef.current.getTicks() : undefined
      } : undefined;
      
      const svg = exportToSVG(
        layers, 
        viewState, 
  { width: containerSize.width, height: deckHeight }, 
        config, 
        showRuler ? rulerProps : undefined, 
        themeColors, 
        5
      );
      
      if (!svg) return;
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hoodini-viz-export.svg';
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
  }), [layers, viewState, config, showRuler, bounds, themeColors, effectiveTreeXScale, deckHeight]);

  return (
  <div
      id="phylo-tree-viewer-container"
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
    position: 'relative',
    overflow: 'hidden',
        background: themeColors?.background || 'var(--background, #ffffff)',
        color: themeColors?.text || 'var(--foreground, #222)'
      }}
    >
      {/* Debug overlay: visible to help diagnose live updates */}
      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 9999, background: 'rgba(255,255,255,0.9)', color: '#111', padding: '6px 8px', borderRadius: 6, fontSize: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>HUD</div>
        <div>alignmentVersion: {alignmentVersion}</div>
        <div>geneHeightDisplay: {String(geneHeightDisplay)}</div>
        <div>styleConfig.gene.height: {String(styleConfig?.gene?.height ?? (config && config.gene ? config.gene.height : 'n/a'))}</div>
        <div>showGeneTextLayer: {String(!!showGeneTextLayer)}</div>
  <div style={{ marginTop: 6 }}>
          <div style={{ fontWeight: 600 }}>Sample gene</div>
          {(() => {
            try {
              const gv = genomeViewRef.current;
              if (!gv || !gv.genesById) return <div>no genomeView</div>;
              const keys = Object.keys(gv.genesById || {});
              if (!keys || keys.length === 0) return <div>no genes</div>;
              const g = gv.genesById[keys[0]];
              return (
                <div>
                  <div>id: {g.id || keys[0]}</div>
                  <div>trackY: {String(g.trackY)}</div>
                  <div>gene.geneHeight: {String(g.geneHeight ?? g.featureHeight ?? 'n/a')}</div>
                  <div>polygonPts: {(g.polygon && g.polygon.length) ? g.polygon.length : 0}</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                    <button onClick={() => { try { setAlignmentVersion(v => v + 1); } catch (e) {} }} style={{ padding: '4px 6px', fontSize: 11 }}>Force refresh</button>
                    <button onClick={() => { try { console.debug('[PhyloTreeViewer] geneLabels log', geneLabels); } catch (e) {} }} style={{ padding: '4px 6px', fontSize: 11 }}>Log labels</button>
                  </div>
                </div>
              );
            } catch (e) { return <div>err</div>; }
          })()}
        </div>
      </div>
      {/* Overlay buttons (top-right) */}
      
  <DeckGL
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
        onViewStateChange={e => setViewState(e.viewState)}
        //if showScrollBar is true, define viewState. if switching back to false, reset viewState
        viewState={showScrollbar ? viewState : undefined}
        layers={layers}
        initialViewState={viewState}
        pickingRadius={10}
        style={{ 
          width: '100%',
          height: showRuler ? `${deckHeight}px` : `${deckHeight}px`,
          position: 'absolute',
          left: '0',
          top: '0',
          transform: 'translateX(0)', // Always stay at position 0, let sidebar overlay naturally
          backgroundColor: 'transparent' // Ensure no white background shows through
        }}
        getTooltip={getTooltip}
        // Performance optimizations
        useDevicePixels={true}  // Reduce rendering resolution for better performance
        _animate={false}         // Disable internal animations
        // 🚀 ZOOM FIX: Add key to prevent DeckGL from reinitializing with default viewState during re-renders
        onClick={({object}) => {
          if (object && onObjectClick) onObjectClick(object);
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
            viewState={viewState}
            containerWidth={containerSize.width}
            containerHeight={deckHeight}
            visible={showRuler}
            genomeView={genomeViewRef.current}
            alignmentReferencePoint={getAlignmentReferencePoint(genomeViewRef.current)}
            bounds={bounds}
            config={{
              ...config,
              tree: {
                ...config.tree,
                xScalePercent: effectiveTreeXScale
              }
            }}
          />
        </div>
      )}
      
      {/* Scrollbar widget */}
      {showScrollbar && (
        <ScrollbarWidget
          minY={minY}
          maxY={maxY}
          scrollNorm={scrollNorm}
          setScrollNorm={setScrollNorm}
          visibleFraction={visibleFraction}
          setViewState={setViewState}
          containerHeight={deckHeight}
          viewState={viewState}
          config={config}
          themeColors={themeColors}
        />
      )}
    </div>
  );
});

export default PhyloTreeViewer;
