// PhyloTreeViewer.jsx
import React, { useEffect, useRef, useState } from 'react';
import PhyloTree from '../models/PhyloTree';
import GenomeView from '../models/GenomeView';
import DeckGL from '@deck.gl/react';
import { LineLayer, PolygonLayer, PathLayer, TextLayer, ScatterplotLayer } from '@deck.gl/layers';
import {OrthographicView} from '@deck.gl/core';
import ScrollbarWidget from '../widgets/ScrollbarWidget';
import ExportSVGWidget from '../widgets/ExportSVGWidget';
import RulerWidget from '../widgets/RulerWidget';
import { DEFAULT_CONFIG } from '../config/visualizationConfig';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { getPaletteColors } from '../utils/colorPalettes';
import { parseNonCodingMetadata } from '../utils/parseNonCodingMetadata';
import nonCodingMetadataText from '../data/defaultNonCodingMetadata.txt?raw';

const PhyloTreeViewer = React.forwardRef(({
  newickStr,
  gffFeatures,
  proteinLinks,
  nucleotideLinks,
  domainsByGene,
  baselines,
  showScrollbar,
  setGenomeViewRef,
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
  forceUpdateCounter = 0,
  phyloLabelPosition = 'after-tree',
  alignLabels = true,
  genePalette,
  domainPalette,
  phyloPalette,
  ncRNAPalette,
  geneColorBy,
  geneLabelBy,
  domainColorBy = 'domainName', // Add this prop
  styleConfig, // Add styleConfig prop for layers
}, ref) => {
  // Theme context
  const { getThemeColors, theme } = useTheme();
  const themeColors = React.useMemo(() => getThemeColors(), [theme]);
  
  // Visualization state
  const [selectedNode, setSelectedNode] = useState(null);
  const [alignmentVersion, setAlignmentVersion] = useState(0); // Trigger for alignment changes only
  const [metadataVersion, setMetadataVersion] = useState(0); // Trigger when metadata is attached
  const [metadataAttached, setMetadataAttached] = useState(false); // Track when metadata is ready
  const containerRef = React.useRef(null);
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });
  const [treeLabelPadding, setTreeLabelPadding] = React.useState(100);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const [viewState, setViewState] = useState({
    target: [0, 0, 0],
    zoom: -10
  });

  // Use a ref for genomeView so it persists across renders
  const genomeViewRef = useRef(null);
  
  // Track whether we're in manual manipulation mode to prevent alignment reset
  const isManualManipulation = useRef(false);

  // Expose genomeView and forceManualUpdate method to parent
  React.useImperativeHandle(ref, () => ({
    get genomeView() { return genomeViewRef.current; },
    forceManualUpdate: () => {
      isManualManipulation.current = true;
      setAlignmentVersion(prev => prev + 1);
    }
  }), []);


  // Parse ncRNA metadata once
  const nonCodingMetadata = React.useMemo(() => parseNonCodingMetadata(nonCodingMetadataText), []);

  // 🚀 PERFORMANCE: Memoize expensive proteinMetadata operations
  const proteinMetadataEntries = React.useMemo(() => {
    if (!proteinMetadata) return [];
    return Object.values(proteinMetadata);
  }, [proteinMetadata]);

  // 🚀 PERFORMANCE: Memoize cluster building to avoid expensive recomputation on every colorBy change
  const clustersFromMetadata = React.useMemo(() => {
    if (!proteinMetadata) return null;
    
    const entries = proteinMetadataEntries; // Use memoized entries
    
    if (entries.length > 0 && entries[0] && entries[0][colorBy] !== undefined) {
      const clusters = {};
      // Pre-filter valid entries for better performance
      const validEntries = entries.filter(entry => entry.gene_id && entry[colorBy] !== undefined);
      
      for (const entry of validEntries) {
        clusters[entry.gene_id] = entry[colorBy];
      }
      
      return clusters;
    }
    
    return null;
  }, [proteinMetadataEntries, colorBy]);

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
    const treeStartTime = performance.now();
    const newTree = new PhyloTree(newickStr, config, ultrametric);
    const leavesToUse = newTree.getLeafNodes().map(n => n.name);
    newTree.layout(leavesToUse);
    const treeEndTime = performance.now();
    return newTree;
  }, [newickStr, ultrametric, structuralConfigValues]);

  // Create a base tree for GenomeView that doesn't change with ultrametric
  const baseTree = React.useMemo(() => {
    const baseTreeStartTime = performance.now();
    const newTree = new PhyloTree(newickStr, config, false); // Always non-ultrametric for genome
    const leavesToUse = newTree.getLeafNodes().map(n => n.name);
    newTree.layout(leavesToUse);
    const baseTreeEndTime = performance.now();
    return newTree;
  }, [newickStr, structuralConfigValues]);

  // Memoize core data processing to avoid recomputing on style changes
  // Only depend on actual structural data and essential config properties
  const genomeView = React.useMemo(() => {
    const genomeViewStartTime = performance.now();
    
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
      newGenomeView.alignCluster(alignCluster);
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
    newGenomeView.addProteinLinks(proteinLinks);
    newGenomeView.addNucleotideLinks(nucleotideLinks);

    genomeViewRef.current = newGenomeView;
    
    const genomeViewEndTime = performance.now();
    return newGenomeView;
  }, [
    // Only structural data dependencies - Use baseTree instead of tree
    baseTree,
    gffFeatures, 
    proteinLinks, 
    nucleotideLinks, 
    domainsByGene, 
    baselines, 
    // Use the memoized structural config values instead of direct config access
    structuralConfigValues
  ]);

  // Separate effect to handle metadata attachment without recreating genomeView
  useEffect(() => {
    if (!genomeView) return;
    
    // Attach protein metadata
    if (proteinMetadata && Object.keys(proteinMetadata).length > 0) {
      for (const uniqueGeneId in genomeView.genesById) {
        const gene = genomeView.genesById[uniqueGeneId];
        const originalGeneId = gene.originalGeneId;
        if (originalGeneId && proteinMetadata[originalGeneId]) {
          gene.metadata = proteinMetadata[originalGeneId];
        } else {
          gene.metadata = {}; // Clear old metadata
        }
      }
    }

    // Set protein clusters
    if (clustersFromMetadata) {
      genomeView.setProteinClusters(clustersFromMetadata);
    }

    // Trigger color map recalculation after metadata attachment
    setMetadataVersion(prev => prev + 1);
  }, [genomeView, proteinMetadata, clustersFromMetadata]);

  // REMOVED INEFFICIENT EFFECT: Polygon updates now happen synchronously inside layers memoization
  // This eliminates the timing issues and makes shape changes as instant as color changes

  // Effect for attaching ncRNA metadata only (protein metadata is handled in genomeView creation)
  useEffect(() => {
    if (!genomeView) return;
    
    // Attach ncRNA metadata
    for (const uniqueNcId in genomeView.ncRNAsById) {
      const nc = genomeView.ncRNAsById[uniqueNcId];
      if (nc && nonCodingMetadata[nc.originalId]) {
        nc.metadata = { ...nc.metadata, ...nonCodingMetadata[nc.originalId] };
        if (nonCodingMetadata[nc.originalId].color) {
          nc.fillColor = nonCodingMetadata[nc.originalId].color;
        }
      }
    }
  }, [nonCodingMetadata, genomeView]);

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
    const labels = tree.leafNodes.map(l => {
      const meta = treeMetadata?.[l.name] || {};
      let label = meta[treeLabelBy];
      if (label === undefined || label === null) label = l.name;
      return String(label);
    });
    const maxLen = labels.reduce((max, txt) => Math.max(max, txt.length), 0);
    const charWidth = config.tree.labelPadding.charWidth; // Use configurable char width
    setTreeLabelPadding(maxLen * charWidth);
  }, [tree, treeMetadata, treeLabelBy, config]);

  // Utility to compute bounding box from all polygons/paths
  function computeBounds(genomeView, tree, phyloLabelPosition = 'after-tree') {
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
    // Tree paths: get maxX
    let treeMaxX = -Infinity;
    if (tree) tree.buildEdges().forEach(e => {
      e.path.forEach(([x, y]) => {
        treeMaxX = Math.max(treeMaxX, x);
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
    function updateSize() {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

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
          return clusterValue == alignCluster;
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
  const bounds = computeBounds(genomeViewRef.current, tree, phyloLabelPosition);
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
      // Format metadata as HTML table
      const meta = object.metadata;
      const html = `<table>${Object.entries(meta).map(([k,v]) => `<tr><td><b>${k}</b></td><td>${v}</td></tr>`).join('')}</table>`;
      return { html };
    }
    // Fallback for legacy or missing metadata
    if (object.name) return { text: object.name };
    if (object.gene_id) return { text: object.gene_id };
    return null;
  };

  // Helper to build gene metadata labels (e.g., protein cluster) below each gene
  function buildGeneLabels(genes) {
    return genes.map(gene => {
      const labelKey = labelBy || colorBy;
      const labelValue = gene.metadata && gene.metadata[labelKey] !== undefined ? gene.metadata[labelKey] : null;
      if (labelValue === null || labelValue === undefined) return null;
      if (!gene.polygon || gene.polygon.length === 0) return null;
      const centerX = (gene.start + gene.end) / 2;
      const ys = gene.polygon.map(([_, y]) => y);
      const minY = Math.min(...ys);
      // Use the gene stroke color for the label
      const strokeColor = darkenColor(gene.fillColor);
      return {
        position: [centerX, minY],
        text: String(labelValue),
        color: strokeColor,
        size: config.text.geneLabelSize,
        textAnchor: 'middle',
        alignmentBaseline: 'top',
      };
    }).filter(Boolean);
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
      const metadata = treeMetadata[label.leafNode.name] || {};
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
      const metadata = treeMetadata[label.leafNode.name] || {};
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

  // 🚀 PERFORMANCE: Memoize expensive filtering operations
  const { filteredProteinPolygons, filteredNucleotidePolygons } = React.useMemo(() => {
    if (!genomeView) return { filteredProteinPolygons: [], filteredNucleotidePolygons: [] };
    
    const leaves = genomeView.leaves;
    const proteinPolygons = genomeView.getProteinPolygons();
    const nucleotidePolygons = genomeView.getNucleotidePolygons();
    
    console.log('🔍 Debug links - Total protein polygons:', proteinPolygons.length);
    console.log('🔍 Debug links - Total nucleotide polygons:', nucleotidePolygons.length);
    console.log('🔍 Debug links - Sample protein polygon:', proteinPolygons[0]);
    console.log('🔍 Debug links - Sample nucleotide polygon:', nucleotidePolygons[0]);
    console.log('🔍 Debug links - Tree leaves:', leaves);
    
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
      if (!hood1 || !hood2) return false;
      const key = [hood1, hood2].sort().join('__');
      return consecutivePairs.has(key);
    });
    
    // Build valid consecutive pairs for nucleotide links
    const validConsecutivePairs = new Set();
    for (let i = 0; i < leaves.length - 1; i++) {
      const hoodA = leaves[i];
      const hoodB = leaves[i + 1];
      const seqidA = genomeView.hoodToSeqidMap[hoodA];
      const seqidB = genomeView.hoodToSeqidMap[hoodB];
      if (seqidA && seqidB && seqidA !== seqidB) {
        validConsecutivePairs.add(`${seqidA}-${seqidB}`);
        validConsecutivePairs.add(`${seqidB}-${seqidA}`);
      }
    }
    
    // Filter nucleotide polygons
    const assignedPairs = new Set();
    const filteredNucleotide = nucleotidePolygons.filter(p => {
      if (!p.seqids || p.seqids.length !== 2) return false;
      
      const [seqid1, seqid2] = p.seqids;
      const linkKey = `${seqid1}-${seqid2}`;
      const linkKeyReverse = `${seqid2}-${seqid1}`;
      
      if ((validConsecutivePairs.has(linkKey) || validConsecutivePairs.has(linkKeyReverse)) &&
          !assignedPairs.has(linkKey) && !assignedPairs.has(linkKeyReverse)) {
        assignedPairs.add(linkKey);
        assignedPairs.add(linkKeyReverse);
        return true;
      }
      return false;
    });
    
    return { 
      filteredProteinPolygons: filteredProtein, 
      filteredNucleotidePolygons: filteredNucleotide 
    };
  }, [genomeView, proteinLinks, nucleotideLinks, alignmentVersion]);

  // Define effective palettes first
  const effectiveGenePalette = genePalette || config?.colorPalettes?.genePalette;
  const effectiveDomainPalette = domainPalette || config?.colorPalettes?.domainPalette;
  const effectivePhyloPalette = phyloPalette || config?.colorPalettes?.phyloPalette;
  const effectiveNcRNAPalette = ncRNAPalette || config?.colorPalettes?.ncRNAPalette;

  // 🚀 PERFORMANCE: Pre-compute and memoize color mappings
  const geneColorMap = React.useMemo(() => {
    if (!genomeView || !effectiveGenePalette?.enabled) return null;
    
    const geneKeyField = colorBy || 'cluster';
    const genes = Object.values(genomeView.genesById);
    const validKeys = genes
      .map(g => g.metadata?.[geneKeyField])
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
  }, [genomeView, effectiveGenePalette, colorBy, metadataVersion]);

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

  const layers = React.useMemo(() => {
    const layersStartTime = performance.now();
    
    const genomeView = genomeViewRef.current;
    if (!genomeView || !tree) {
      return [];
    }
    
    // Use styleConfig if available, otherwise fall back to config
    const effectiveConfig = styleConfig || config;
    
    // 🚀 SYNCHRONOUS POLYGON UPDATES - This ensures fresh polygons are always available!
    // Update all feature polygons directly here instead of using a separate effect
    console.log('🔧 Synchronous polygon updates started - effectiveConfig.gene.height:', effectiveConfig.gene.height, 'effectiveConfig.gene.arrowheadHeight:', effectiveConfig.gene.arrowheadHeight);
    
    const polygonUpdateStart = performance.now();
    
    // Update gene polygons synchronously
    for (const uniqueGeneId in genomeView.genesById) {
      const gene = genomeView.genesById[uniqueGeneId];
      gene.config = effectiveConfig;
      gene.geneHeight = effectiveConfig.gene.height || effectiveConfig.gene.defaultHeight;
      gene.updatePolygon(); // Fresh polygon immediately available
    }
    
    // Update ncRNA polygons synchronously  
    for (const uniqueNcId in genomeView.ncRNAsById) {
      const nc = genomeView.ncRNAsById[uniqueNcId];
      nc.config = effectiveConfig;
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
    
    const polygonUpdateTime = performance.now() - polygonUpdateStart;
    console.log(`🔧 Synchronous polygon updates completed: ${Object.keys(genomeView.genesById).length + Object.keys(genomeView.ncRNAsById).length + genomeView.getAllDomains().length} features in ${polygonUpdateTime.toFixed(2)}ms`);
    
    // Use treeOffset and geneOffset for all tree-related and genome-related X shifts
    const bounds = computeBounds(genomeView, tree, phyloLabelPosition);
    const treeOffset = bounds.treeOffset || 0;
    
    // Use pre-filtered and pre-computed data
    const proteinPolygons = filteredProteinPolygons;
    const nucleotidePolygons = filteredNucleotidePolygons;
    // --- OPTIMIZED GENE COLORING ---
    const genes = Object.values(genomeView.genesById).map(g => {
      let fillColor = themeColors.geneFill;
      
      if (geneColorMap) {
        const key = g.metadata?.[colorBy || 'cluster'];
        fillColor = geneColorMap.get(key) || themeColors.geneFill;
      }
      
      return { ...g, fillColor };
    });

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
    // Apply current theme colors directly instead of relying on tree.themeColors
    const phyloPaths = tree.buildEdges().map(edge => ({
      path: edge.path.map(([y, x]) => [y + treeOffset, x]),
      metadata: {
        source: edge.source.name || `internal_${edge.source.id}`,
        target: edge.target.name || `internal_${edge.target.id}`,
        length: edge.target.branchLength || 0,
        type: 'phylo_edge'
      },
      color: themeColors?.treeEdges || config.tree.edgeColor || [85,85,85,255] // Use current themeColors directly
    }));

    // Phylo labels (shift X by treeOffset or position after tracks)
    const effectivePhyloLabelPosition = phyloLabelPosition || config.tree?.phyloLabelPosition || 'after-tree';
    const effectiveAlignLabels = alignLabels !== undefined ? alignLabels : (config.tree?.alignLabels !== undefined ? config.tree.alignLabels : true);
    
    let rawPhyloLabels = tree.leafNodes.map(l => {
      const meta = treeMetadata?.[l.name] || {};
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
          color = [0,0,0,255]; // Default black for null/undefined values
        }
      } else {
        // Always use default color if no palette
        color = [0,0,0,255];
      }
      let position;
      if (effectivePhyloLabelPosition === 'after-tracks') {
        // Position phylo labels after the rightmost edge of genome tracks
        // Find the rightmost X coordinate for this leaf's track
        const trackY = genomeView.getTrackYByHoodId(l.name);
        let rightmostX = -Infinity;
        
        // Check all genes for this leaf to find the rightmost position
        Object.values(genomeView.genesById).forEach(gene => {
          if (gene.hood_id === l.name || genomeView.getHoodIdFromSeqid(gene.seqid) === l.name) {
            rightmostX = Math.max(rightmostX, Math.max(gene.start, gene.end));
          }
        });
        
        // Check all ncRNAs for this leaf to find the rightmost position
        Object.values(genomeView.ncRNAsById).forEach(ncRNA => {
          if (ncRNA.hood_id === l.name || genomeView.getHoodIdFromSeqid(ncRNA.seqid) === l.name) {
            rightmostX = Math.max(rightmostX, Math.max(ncRNA.start, ncRNA.end));
          }
        });
        
        // Check baselines for this leaf
        const baselineForLeaf = nucleotideBaselines.find(baseline => baseline.hood_id === l.name);
        if (baselineForLeaf) {
          rightmostX = Math.max(rightmostX, Math.max(baselineForLeaf.start, baselineForLeaf.end));
        }
        
        // If we couldn't find a rightmost position, fallback to tree position
        if (!isFinite(rightmostX)) {
          rightmostX = l.y + treeOffset + (config.tree?.labelOffset || 10);
        } else {
          // Add offset after the rightmost genome feature
          rightmostX += (config.tree?.labelOffset || 10);
        }
        
        position = [rightmostX, l.x];
      } else {
        // Default: position after tree nodes (current behavior)
        position = [l.y + treeOffset + (config.tree?.labelOffset || 10), l.x];
      }
      
      return {
        position,
        text: label,
        color,
        size: config.text.phyloLabelSize,
        textAnchor: 'start',
        alignmentBaseline: 'center',
        leafNode: l
      };
    });

    // Apply alignment if enabled
    if (effectiveAlignLabels && rawPhyloLabels.length > 0) {
      // Find the maximum X coordinate among all labels
      const maxX = Math.max(...rawPhyloLabels.map(lbl => lbl.position[0]));
      
      // Align all labels to the maximum X coordinate
      rawPhyloLabels.forEach(lbl => {
        lbl.position[0] = maxX;
      });
    }

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
      const valid = Number.isFinite(lbl.position[0]) && Number.isFinite(lbl.position[1]) && typeof lbl.text === 'string' && lbl.text.trim() !== '';
      return valid;
    });
    // If array is empty, add a dummy label (not rendered)
    if (phyloLabels.length === 0) {
      phyloLabels.push({position: [0,0], text: '_', color: [0,0,0,0], size: 1, textAnchor: 'start'});
    }
    // Prune extra properties: meta and leaf removed
    const finalPhyloLabelsPruned = phyloLabels.map(({position,text,color,size,textAnchor}) => ({position,text,color,size,textAnchor}));

    // Node points (shift X by treeOffset) - use current tree, not baseTree from genomeView
    const highlightLeaves = selectedNode ? new Set(genomeView.getNodeDescendantLeaves(selectedNode)) : null;
    const nodeRadius = config?.tree?.nodeRadius || { internal: 4, leaf: 2 };
    const nodePoints = tree.allNodes.map(n => {
      const nodeLeaves = genomeView.getNodeDescendantLeaves(n);
      const isDesc = !selectedNode || nodeLeaves.some(l => highlightLeaves.has(l));
      let color;
      if (n.branchset.length > 0) {
        // Internal node: black
        color = [0, 0, 0, 255];
      } else {
        // Leaf: color by metadata
        const meta = n.metadata || {};
        const colorValue = meta[treeColorBy];
        if (colorValue) {
          // Simple hash to color
          const str = String(colorValue);
          let hash = 0;
          for (let i = 0; i < str.length; ++i) hash = str.charCodeAt(i) + ((hash << 5) - hash);
          const r = (hash >> 0) & 0xFF;
          const g = (hash >> 8) & 0xFF;
          const b = (hash >> 16) & 0xFF;
          color = [Math.abs(r), Math.abs(g), Math.abs(b), 255];
        } else {
          color = [100, 100, 100, 255];
        }
      }
      if (selectedNode && !isDesc) {
        // Fade color for non-descendants
        color = color.map((c, i) => i === 3 ? c : Math.floor(c * 0.1));
      }
      return {
        id: n.id,
        node: n,
        position: [n.y + treeOffset, n.x], // Use current tree coordinates + offset
        color: color,
        radius: n.branchset.length > 0 ? nodeRadius.internal : nodeRadius.leaf,
        metadata: n.metadata || { name: n.name, id: n.id }
      };
    });

    // Helper function to adjust gene edge color based on theme
    const getGeneEdgeColor = (gene) => {
      const fillColor = gene.fillColor || effectiveConfig.gene.fillColor;
      if (!Array.isArray(fillColor) || fillColor.length < 3) return fillColor;

      // Dynamically adjust color based on theme
      const isLightTheme = themeColors.background === '#ffffff';
      const factor = isLightTheme ? 0.7 : 1.3; // light theme = darken, dark theme = lighten

      return [
        Math.max(0, Math.min(255, Math.floor(fillColor[0] * factor))),
        Math.max(0, Math.min(255, Math.floor(fillColor[1] * factor))),
        Math.max(0, Math.min(255, Math.floor(fillColor[2] * factor))),
        fillColor.length > 3 ? fillColor[3] : 255
      ];
    };
    
    // Gene cluster labels (below genes)
    const geneLabels = buildGeneLabels(genes);

    // Create the base layers array
    const layers = [
      new LineLayer({
        id: 'baselines',
        data: nucleotideBaselines,
        getSourcePosition: d => [d.start, d.trackY],
        getTargetPosition: d => [d.end, d.trackY],
        getColor: themeColors.baselines || effectiveConfig.colors.darkGray || [85, 85, 85, 255],
        getWidth: effectiveConfig.stroke.baselineWidth || effectiveConfig.stroke.lineWidth,
        pickable: false
      }),
      new PolygonLayer({
        id: 'protein-polygons',
        data: proteinPolygons,
        getPolygon: d => d.polygon,
        getFillColor: d => d.fillColor,
        stroked: false,
        autoHighlight: true,
        filled: true,
        pickable: true, // changed from false
        updateTriggers: {
          getPolygon: proteinPolygons,
          getFillColor: proteinPolygons
        }
      }),
      // Nucleotide links polygons
      new PolygonLayer({
        id: 'nucleotide-polygons',
        data: nucleotidePolygons,
        getPolygon: d => d.polygon,
        getFillColor: d => d.fillColor,
        stroked: false,
        filled: true,
        autoHighlight: true,
        pickable: true, // changed from false
        updateTriggers: {
          getPolygon: nucleotidePolygons,
          getFillColor: nucleotidePolygons
        }
      }),
      // Phylogenetic tree paths
      new PathLayer({
        id: 'phylo-tree',
        data: phyloPaths,
        getPath: d => d.path,
        getColor: d => d.color || themeColors.treeEdges || effectiveConfig.tree.edgeColor,
        autoHighlight: true,
        widthUnits: 'pixels',
        jointRounded: true,
        capRounded: true,
        getWidth: () => effectiveConfig.tree.edgeWidth || 3,
        pickable: true,
        updateTriggers: {
          getPath: phyloPaths,
          getColor: phyloPaths,
          getWidth: config.tree.edgeWidth
        }
      }),
      // Genes
      new PolygonLayer({
        id: 'genes',
        data: genes,
        getPolygon: d => d.polygon,
        getFillColor: d => d.fillColor || themeColors.geneFill || effectiveConfig.gene.fillColor,
        stroked: effectiveConfig.gene.edgeWidth > 0,
        getLineColor: d => getGeneEdgeColor(d),
        getLineWidth: () => effectiveConfig.gene.edgeWidth,
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 0,
        filled: true,
        pickable: true,
        autoHighlight: true,
        updateTriggers: {
          getPolygon: [genes.length, alignmentVersion, effectiveConfig.gene.height, effectiveConfig.gene.defaultHeight, effectiveConfig.gene.arrowheadHeight, effectiveConfig.gene.tipWidthFactor], // Use effectiveConfig for current values
          getFillColor: [genes.length, genePalette, geneColorBy, themeColors.geneFill],
          getLineColor: [genes.length, themeColors.geneFill, effectiveConfig.gene.edgeWidth, alignmentVersion],
          getLineWidth: effectiveConfig.gene.edgeWidth,
          stroked: effectiveConfig.gene.edgeWidth
        }
      }),
      // Domains
      new PolygonLayer({
        id: 'domains',
        data: domains,
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
          getFillColor: [domains.length, domainPalette, domainColorBy, themeColors.domainFill],
          getLineWidth: effectiveConfig.domain.edgeWidth
        }
      }),
      // Gene cluster TextLayer (below genes)
      new TextLayer({
        id: 'gene-labels',
        data: geneLabels,
        getPosition: d => d.position,
        getText: d => d.text,
        getColor: d => d.color,
        getSize: d => d.size * config.text.scaleFactors.gene,
        sizeUnits: 'meters',
        fontFamily: 'sans-serif',
        getTextAnchor: d => d.textAnchor || 'middle',
        getAlignmentBaseline: d => d.alignmentBaseline || 'top',
        pickable: false,
        updateTriggers: {
          getPosition: geneLabels,
          getText: geneLabels
        }
      }),
      // Phylo labels
      new TextLayer({
        id: 'phylo-labels',
        data: finalPhyloLabelsPruned,
        getPosition: d => d.position,
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
          getPosition: finalPhyloLabelsPruned,
          getText: finalPhyloLabelsPruned,
          getColor: finalPhyloLabelsPruned,
          background: showConnectingLines,
          getBackgroundColor: showConnectingLines,
          backgroundPadding: showConnectingLines
        }
      }),
      // Node points
      new ScatterplotLayer({
        id: 'nodes',
        data: nodePoints,
        getPosition: d => d.position,
        getFillColor: d => d.color,
        getRadius: d => d.radius,
        lineWidthUnits: 'meters',
        radiusUnits: 'meters',
        autoHighlight: true,
        filled: true,
        stroked: false,
        pickable: true,
        updateTriggers: {
          getPosition: nodePoints,
          getFillColor: nodePoints
        }
      })
    ];

    // Add connecting lines layer if showConnectingLines is true
    if (showConnectingLines) {
      // Create connecting lines data - simple lines from tree leaf nodes to genome track starts
      const connectingLinesData = tree.leafNodes
        .filter(leaf => {
          // Only include leaves that have corresponding genome tracks
          const trackY = genomeView.getTrackYByHoodId(leaf.name);
          return trackY != null;
        })
        .map(leaf => {
          const trackY = genomeView.getTrackYByHoodId(leaf.name);
          const leafX = leaf.y + treeOffset;
          const leafY = leaf.x;
          
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
          
          // If we couldn't find a genome start, use a default position
          if (!isFinite(genomeStartX)) {
            genomeStartX = leafX + 100; // Default offset from tree
          }
          
          return {
            sourcePosition: [leafX, leafY],
            targetPosition: [genomeStartX, trackY],
            metadata: {
              leaf_id: leaf.name,
              type: 'connecting_line'
            }
          };
        });

      // Only add the layer if we have data
      if (connectingLinesData.length > 0) {
        // Insert connecting lines at the beginning so they render behind everything else
        layers.unshift(
          new LineLayer({
            id: 'connecting-lines',
            data: connectingLinesData,
            getSourcePosition: d => d.sourcePosition,
            getTargetPosition: d => d.targetPosition,
            getColor: config.connectingLines.color,
            getWidth: config.connectingLines.width,
            widthUnits: 'pixels',
            pickable: true,
            autoHighlight: false,
            updateTriggers: {
              getSourcePosition: connectingLinesData,
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
    if (effectiveNcRNAPalette && effectiveNcRNAPalette.enabled) {
      // Use 'type' field from metadata for palette coloring
      const ncRNAsWithValidTypes = ncRNAs.filter(nc => {
        const key = nc.metadata && nc.metadata.type;
        return key !== null && key !== undefined && key !== '';
      });
      const ncRNATypeKeys = Array.from(new Set(ncRNAsWithValidTypes.map(nc => nc.metadata.type)));
      const ncRNAColors = getPaletteColors(
        effectiveNcRNAPalette.name,
        Math.max(ncRNATypeKeys.length, effectiveNcRNAPalette.numColors || ncRNATypeKeys.length),
        effectiveNcRNAPalette.reverse || false
      );
      const ncRNATypeToColor = {};
      ncRNATypeKeys.forEach((key, i) => { ncRNATypeToColor[key] = ncRNAColors[i % ncRNAColors.length]; });
      ncRNAs = ncRNAs.map(nc => {
        const key = nc.metadata && nc.metadata.type;
        if (key !== null && key !== undefined && key !== '') {
          return { ...nc, fillColor: ncRNATypeToColor[key] };
        } else {
          return { ...nc, fillColor: themeColors.geneFill };
        }
      });
    } else {
      // Fallback: use fillColor from metadata or theme color
      ncRNAs = ncRNAs.map(nc => {
        return {
          ...nc,
          fillColor: nc.fillColor || (nc.metadata && nc.metadata.color) || themeColors.geneFill
        };
      });
    }
    layers.push(
      new PolygonLayer({
        id: 'ncrna-features',
        data: ncRNAs,
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
          getPolygon: [ncRNAs.length, effectiveConfig.gene.height, effectiveConfig.gene.arrowheadHeight], // Include shape-affecting config
          getFillColor: ncRNAs,
          getLineColor: ncRNAs,
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
    // Theme colors
    themeColors,
    // Essential UI state
    showConnectingLines,
    phyloLabelPosition,
    alignLabels,
    // Include styleConfig to capture debounced visual property changes (takes precedence)
    styleConfig,
    // Include specific config properties for instant updates
    config.gene.height,
    config.gene.defaultHeight, 
    config.gene.arrowheadHeight,
    config.gene.tipWidthFactor,
    config.domain.height,
    config.tree.edgeWidth,
    config.gene.edgeWidth
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
      // Check if the alignment we want to apply is already applied during GenomeView creation
      if (isFirstRun.current) {
        // Alignment was already applied during GenomeView creation, so skip it
        alignmentChanged = false;
      } else {
        const alignStartTime = performance.now();
        
        if (alignCluster != null && alignCluster !== '') {
          // alignCluster is set to a specific cluster number
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

  return (
    <div id="phylo-tree-viewer-container" ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Camera export button in top-right corner */}
      <ExportSVGWidget
        layers={layers}
        viewState={viewState}
        containerSize={containerSize}
        config={config}
        showRuler={showRuler}
        rulerProps={showRuler ? {
          minX: bounds.minX,
          maxX: bounds.maxX,
          width: containerSize.width,
          height: containerSize.height,
          config,
          viewState,
          alignmentReferencePoint: getAlignmentReferencePoint(genomeViewRef.current),
          bounds,
          genomeView: genomeViewRef.current
        } : undefined}
      />
      {/* Overlay buttons (top-left) */}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: '10px' }}>
        {/* Debug button to test manual update trigger */}
        <button
          onClick={() => {
            setAlignmentVersion(prev => prev + 1);
            requestAnimationFrame(() => {
            });
          }}
          style={{
            padding: '6px 8px',
            backgroundColor: '#ff4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
          title="Test alignment version trigger performance"
        >
          Force Update
        </button>
        <button
          onClick={() => {
            const genomeView = genomeViewRef.current;
            if (!genomeView || !proteinMetadata) {
              return;
            }
            
            const startTime = performance.now();
            
            for (const uniqueGeneId in genomeView.genesById) {
              const gene = genomeView.genesById[uniqueGeneId];
              const originalGeneId = gene.originalGeneId;
              if (originalGeneId && proteinMetadata[originalGeneId]) {
                gene.metadata = proteinMetadata[originalGeneId];
              } else {
                gene.metadata = {};
              }
            }
            
            const endTime = performance.now();
          }}
          style={{
            padding: '6px 8px',
            backgroundColor: '#ffaa00',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
          title="Test protein metadata attachment performance"
        >
          Protein Metadata
        </button>
        <button
          onClick={() => {
            const genomeView = genomeViewRef.current;
            if (!genomeView || !proteinMetadata) {
              return;
            }
            
            const startTime = performance.now();
            
            const entries = Object.values(proteinMetadata);
            let clustersFromMetadata = null;
            if (entries.length > 0 && entries[0] && entries[0][colorBy] !== undefined) {
              clustersFromMetadata = {};
              for (const entry of entries) {
                if (entry.gene_id && entry[colorBy] !== undefined) {
                  clustersFromMetadata[entry.gene_id] = entry[colorBy];
                }
              }
            }
            
            const endTime = performance.now();
          }}
          style={{
            padding: '6px 8px',
            backgroundColor: '#00aa44',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
          title="Test cluster building performance"
        >
          Build Clusters
        </button>
        <button
          onClick={() => {
            const genomeView = genomeViewRef.current;
            if (!genomeView || !proteinMetadata) {
              return;
            }
            
            const startTime = performance.now();
            
            // Build clusters first (same as colorBy effect)
            const entries = Object.values(proteinMetadata);
            let clustersFromMetadata = null;
            if (entries.length > 0 && entries[0] && entries[0][colorBy] !== undefined) {
              clustersFromMetadata = {};
              for (const entry of entries) {
                if (entry.gene_id && entry[colorBy] !== undefined) {
                  clustersFromMetadata[entry.gene_id] = entry[colorBy];
                }
              }
            }
            
            // Call setProteinClusters
            genomeView.setProteinClusters(clustersFromMetadata || {});
            
            const endTime = performance.now();
          }}
          style={{
            padding: '6px 8px',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
          title="Test setProteinClusters performance"
        >
          Set Clusters
        </button>
        <button
          onClick={() => {
            const genomeView = genomeViewRef.current;
            if (!genomeView) {
              return;
            }
            const startTime = performance.now();
            
            // Force layers to rebuild by updating alignmentVersion 
            // (this is what happens after setManualUpdateTrigger)
            setAlignmentVersion(prev => prev + 1);
            
            requestAnimationFrame(() => {
              const endTime = performance.now();
            });
          }}
          style={{
            padding: '6px 8px',
            backgroundColor: '#aa00cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
          title="Test layers rebuild performance"
        >
          Layers Rebuild
        </button>
        {/* ...other overlay buttons can go here... */}
      </div>
      <DeckGL
        views={[new OrthographicView({ flipY: false })]}
        controller={{
          dragPan: true,
          dragRotate: false,
          scrollZoom: {
            smooth: true,
            speed: 0.1
          },
          doubleClickZoom: false,  // Disable double-click zoom to reduce conflicts
          keyboard: false,         // Disable keyboard to reduce conflicts
          inertia: true,           // Enable inertia for smoother interactions
          transitionDuration: 10, // Short transition for smoother feel
          touchZoom: true,         // Enable touch zoom
          touchRotate: false       // Disable touch rotation
        }}
        //viewState={viewState}
        layers={layers}
        initialViewState={{
          target: [0, 0, 0],
          zoom: -10
        }}
        pickingRadius={10}
        style={{ width: '100%', height: '100%' }}
        onViewStateChange={e => setViewState(e.viewState)}
        getTooltip={getTooltip}
        // Performance optimizations
        useDevicePixels={true}  // Reduce rendering resolution for better performance
        _animate={false}         // Disable internal animations
        // 🚀 ZOOM FIX: Add key to prevent DeckGL from reinitializing with default viewState during re-renders
        key="stable-deckgl-instance"
        onClick={({object}) => {
          if (object && onObjectClick) onObjectClick(object);
        }}
     
      />
      {/* Custom CSS vertical scrollbar overlay, now as a widget */}
      {showScrollbar && isFinite(minY) && isFinite(maxY) && (
        <ScrollbarWidget
          minY={minY}
          maxY={maxY}
          scrollNorm={scrollNorm}
          setScrollNorm={setScrollNorm}
          visibleFraction={visibleFraction}
          setViewState={setViewState}
          containerHeight={containerSize.height}
          viewState={viewState}
          config={config}
        />
      )}
      {/* Ruler widget showing nucleotide coordinates */}
      {showRuler && (
        <RulerWidget
          minX={bounds.minX}
          maxX={bounds.maxX}
          viewState={viewState}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
          visible={showRuler}
          genomeView={genomeViewRef.current}
          alignmentReferencePoint={getAlignmentReferencePoint(genomeViewRef.current)}
          bounds={bounds}
          config={config}
        />
      )}
    </div>
  );
});

export default PhyloTreeViewer;
