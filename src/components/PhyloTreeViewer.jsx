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
  treeLabelBy = 'leaf_id',
  treeColorBy = 'leaf_id',
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
  const [manualUpdateTrigger, setManualUpdateTrigger] = useState(0); // Separate trigger for manual updates
  const [alignmentVersion, setAlignmentVersion] = useState(0); // Trigger for alignment changes only
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
      setManualUpdateTrigger(prev => prev + 1);
    }
  }), []);


  // Parse ncRNA metadata once
  const nonCodingMetadata = React.useMemo(() => parseNonCodingMetadata(nonCodingMetadataText), []);

  // Extract primitive values to break dependency on config object reference
  const treeYSpacing = config.tree?.ySpacing;
  const treeYScaleFactor = config.tree?.yScaleFactor;
  const treeGap = config.tree?.gap;
  const geneHeight = config.gene?.height;
  const geneDefaultHeight = config.gene?.defaultHeight;
  const geneTipWidthFactor = config.gene?.tipWidthFactor;
  const genomeXScalePercent = config.genome?.xScalePercent;
  const layoutPadding = config.layout?.padding;
  const layoutGeneOffset = config.layout?.geneOffset;
  const proteinLinkBezierSegments = config.proteinLink?.bezierSegments;

  // Extract and memoize only the structural config values we actually need
  // This prevents recreation when the config object reference changes but values are the same
  const structuralConfigValues = React.useMemo(() => {
    const result = {
      treeYSpacing,
      treeYScaleFactor, 
      treeGap,
      geneHeight,
      geneDefaultHeight,
      geneTipWidthFactor,
      genomeXScalePercent,
      layoutPadding,
      layoutGeneOffset,
      proteinLinkBezierSegments
    };
    
    console.log('🔧 STRUCTURAL CONFIG VALUES MEMOIZATION:', {
      result,
      configReference: config === config, // This should always be true
      arrowheadHeight: config.gene?.arrowheadHeight, // This should NOT trigger recreation
    });
    
    return result;
  }, [
    treeYSpacing,
    treeYScaleFactor, 
    treeGap,
    geneHeight,
    geneDefaultHeight,
    geneTipWidthFactor,
    genomeXScalePercent,
    layoutPadding,
    layoutGeneOffset,
    proteinLinkBezierSegments
  ]);

  // Memoize tree creation separately - ultrametric only affects tree, not genome
  const tree = React.useMemo(() => {
    console.log('🌲 RECREATING TREE - Only for newick changes or ultrametric toggle');
    const newTree = new PhyloTree(newickStr, config, ultrametric);
    const leavesToUse = newTree.getLeafNodes().map(n => n.name);
    newTree.layout(leavesToUse);
    return newTree;
  }, [newickStr, ultrametric, structuralConfigValues]);

  // Create a base tree for GenomeView that doesn't change with ultrametric
  const baseTree = React.useMemo(() => {
    console.log('🌳 RECREATING BASE TREE - Only for newick/structural changes');
    const newTree = new PhyloTree(newickStr, config, false); // Always non-ultrametric for genome
    const leavesToUse = newTree.getLeafNodes().map(n => n.name);
    newTree.layout(leavesToUse);
    return newTree;
  }, [newickStr, structuralConfigValues]);

  // Memoize core data processing to avoid recomputing on style changes
  // Only depend on actual structural data and essential config properties
  const genomeView = React.useMemo(() => {
    console.log('🔥 RECREATING CORE DATA - This should only happen on data changes, not style changes!', {
      newickStr: newickStr?.length,
      gffFeatures: gffFeatures?.length,
      proteinLinks: proteinLinks?.length,
      nucleotideLinks: nucleotideLinks?.length,
      domainsByGene: Object.keys(domainsByGene || {}).length,
      baselines: baselines?.length,
      // Log the extracted structural values to debug what's changing
      structuralValues: structuralConfigValues
    });
    
    // Use the base tree that doesn't change with ultrametric
    const leavesToUse = baseTree.getLeafNodes().map(n => n.name);
    
    // Use full config for model creation but only depend on structural properties in useMemo
    const newGenomeView = new GenomeView(leavesToUse, baseTree, config);
    newGenomeView.addFeatures(gffFeatures);
    if (baselines) newGenomeView.applyBaselines(baselines);
    newGenomeView.initGenes();
    newGenomeView.computeTrackPositions();
    newGenomeView.addDomains(domainsByGene);
    newGenomeView.addProteinLinks(proteinLinks);
    newGenomeView.addNucleotideLinks(nucleotideLinks);

    genomeViewRef.current = newGenomeView;
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

  // Effect to update gene configs when arrowhead height changes (without recreating genome)
  useEffect(() => {
    if (!genomeView) return;

    // Update config on all gene objects
    for (const uniqueGeneId in genomeView.genesById) {
      const gene = genomeView.genesById[uniqueGeneId];
      gene.config = config; // Update with current config including new arrowheadHeight
    }

    // Update config on all ncRNA objects
    for (const uniqueNcId in genomeView.ncRNAsById) {
      const nc = genomeView.ncRNAsById[uniqueNcId];
      nc.config = config; // Update with current config
    }

    // Trigger layer data recomputation to show new arrowhead heights
    setAlignmentVersion(prev => prev + 1);
  }, [config, genomeView]);

  // Effect for attaching metadata and clusters, runs when metadata-related props change
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

    // Attach protein metadata
    if (proteinMetadata) {
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

    // Set clusters if available
    let clustersFromMetadata = null;
    if (proteinMetadata) {
      const entries = Object.values(proteinMetadata);
      if (entries.length > 0 && entries[0] && entries[0][colorBy] !== undefined) {
        clustersFromMetadata = {};
        for (const entry of entries) {
          if (entry.gene_id && entry[colorBy] !== undefined) {
            clustersFromMetadata[entry.gene_id] = entry[colorBy];
          }
        }
      }
    }
    genomeView.setProteinClusters(clustersFromMetadata || {});

    setManualUpdateTrigger(prev => prev + 1);
  }, [proteinMetadata, colorBy, nonCodingMetadata, genomeView]);

  // Effect for theme color updates
  useEffect(() => {
    if (!tree) return;
    tree.themeColors = themeColors;
    setManualUpdateTrigger(prev => prev + 1);
  }, [themeColors, tree]);

  // Reset selection when core data changes
  useEffect(() => {
    setSelectedNode(null);
  }, [tree]);

  // Force update effect for manual track manipulations
  useEffect(() => {
    if (manualUpdateTrigger > 0) {
      // Reset the manual manipulation flag after a short delay
      setTimeout(() => {
        isManualManipulation.current = false;
      }, 100);
    }
  }, [manualUpdateTrigger]);

  // Effect that responds to forceUpdateCounter changes from parent
  useEffect(() => {
    if (forceUpdateCounter > 0) {
      isManualManipulation.current = true;
      setManualUpdateTrigger(prev => prev + 1);
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
  function fitViewToBounds(genomeView, tree, containerSize, setViewState, phyloLabelPosition) {
    if (!genomeView || !tree) return;
    const { width: cw, height: ch } = containerSize;
    if (!cw || !ch) return;
    const bounds = computeBounds(genomeView, tree, phyloLabelPosition);
    const w = bounds.maxX - bounds.minX;
    const h = bounds.maxY - bounds.minY;
    const padding = config.layout.padding;
    const scale = Math.min(
      (cw - padding) / w,
      (ch - padding) / h
    );
    const zoom = Math.log2(scale > 0 ? scale : 1);
    setViewState({
      target: [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2, 0],
      zoom,
      treeOffset: bounds.treeOffset,
      geneOffset: bounds.geneOffset
    });
  }

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
  const alignmentReferencePoint = getAlignmentReferencePoint(genomeViewRef.current);
  // Normalized scrollbar state (0-100)
  const [scrollNorm, setScrollNorm] = React.useState(0);
  // Compute minY/maxY from bounds
  // When viewState changes, update normalized scroll position
  React.useEffect(() => {
    if (viewState && isFinite(viewState.target[1]) && isFinite(minY) && isFinite(maxY) && maxY > minY) {
      const norm = ((maxY - viewState.target[1]) / (maxY - minY)) * 100;
      setScrollNorm(norm);
    }
  }, [viewState, minY, maxY]); 

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

  const layers = React.useMemo(() => {
    const genomeView = genomeViewRef.current;
    if (!genomeView || !tree) return [];
    
    // Use styleConfig if available, otherwise fall back to config and individual palette props
    const effectiveConfig = styleConfig || config;
    const effectiveGenePalette = genePalette || effectiveConfig.colorPalettes?.genePalette;
    const effectiveDomainPalette = domainPalette || effectiveConfig.colorPalettes?.domainPalette;
    const effectivePhyloPalette = phyloPalette || effectiveConfig.colorPalettes?.phyloPalette;
    const effectiveNcRNAPalette = ncRNAPalette || effectiveConfig.colorPalettes?.ncRNAPalette;
    
    // Use treeOffset and geneOffset for all tree-related and genome-related X shifts
    const bounds = computeBounds(genomeView, tree, phyloLabelPosition);
    const treeOffset = bounds.treeOffset || 0;
    // Genes
    let genes = Object.values(genomeView.genesById);
    // Domains
    let domains = genomeView.getAllDomains();
    // Protein links
    let proteinPolygons = genomeView.getProteinPolygons();
    // Nucleotide links
    let nucleotidePolygons = genomeView.getNucleotidePolygons();

    // --- FILTER LINKS TO ONLY CONSECUTIVE HOODS (ORDER-INSENSITIVE) ---
    // Build a set of valid consecutive hood pairs (order-insensitive)
    const leaves = genomeView.leaves;
    // Debug: Check the structure of leaves array and mapping
    // console.log('Leaves array:', leaves);
    // console.log('Hood to seqid mapping:', genomeView.hoodToSeqidMap);
    const consecutivePairs = new Set();
    for (let i = 0; i < leaves.length - 1; ++i) {
      const a = leaves[i];
      const b = leaves[i + 1];
      consecutivePairs.add([a, b].sort().join('__'));
    }
    // For proteinPolygons, check metadata for hood/gene info if available
    proteinPolygons = proteinPolygons.filter(p => {
      if (!p.metadata) return false;
      const { gAId, gBId, hoodA, hoodB, seqids } = p.metadata;
      let hood1 = hoodA || (gAId && genomeView.genesById[gAId]?.hood_id) || (seqids && seqids[0]);
      let hood2 = hoodB || (gBId && genomeView.genesById[gBId]?.hood_id) || (seqids && seqids[1]);
      if (!hood1 || !hood2) return false;
      const key = [hood1, hood2].sort().join('__');
      return consecutivePairs.has(key);
    });
    // --- STRICT NEIGHBOR FILTER FOR NUCLEOTIDE LINKS ---
    // First, identify which consecutive pairs should have links
    const validConsecutivePairs = [];
    for (let i = 0; i < leaves.length - 1; ++i) {
      const hoodA = leaves[i];
      const hoodB = leaves[i + 1];
      const seqidA = genomeView.hoodToSeqidMap[hoodA];
      const seqidB = genomeView.hoodToSeqidMap[hoodB];
      if (seqidA && seqidB && seqidA !== seqidB) {
        // Create both orderings to handle links in either direction
        validConsecutivePairs.push(`${seqidA}-${seqidB}`);
        validConsecutivePairs.push(`${seqidB}-${seqidA}`);
      }
    }
    // console.log('Valid consecutive pairs (by seqid):', validConsecutivePairs);
    
    // Track which consecutive pairs have already been assigned a link
    const assignedPairs = new Set();
    
    nucleotidePolygons = nucleotidePolygons.filter((p, idx) => {
      // console.log(`Nucleotide link ${idx}:`, p);
      
      // Try to get the actual hoods (by hood ID) this link connects
      let hoodA = p.hoodA || (p.metadata && p.metadata.hoodA);
      let hoodB = p.hoodB || (p.metadata && p.metadata.hoodB);
      // console.log(`  hoodA: ${hoodA}, hoodB: ${hoodB}`);
      
      if (hoodA && hoodB) {
        // Only allow if hoodA and hoodB are direct neighbors in leaves
        for (let i = 0; i < leaves.length - 1; ++i) {
          if ((leaves[i] === hoodA && leaves[i + 1] === hoodB) || (leaves[i] === hoodB && leaves[i + 1] === hoodA)) {
            // console.log(`  Link ${idx}: KEEPING - ${hoodA} and ${hoodB} are neighbors at positions ${i} and
          }
        }
        // console.log(`  Link ${idx}: REMOVING - ${hoodA} and ${hoodB} are not neighbors`);
        return false;
      }
      
      // If no explicit hoodA/hoodB, infer from seqids
      if (p.seqids && p.seqids.length === 2) {
        const seqid1 = p.seqids[0];
        const seqid2 = p.seqids[1];
        const linkKey = `${seqid1}-${seqid2}`;
        const linkKeyReverse = `${seqid2}-${seqid1}`;
        
        // console.log(`  seqids: ${seqid1}, ${seqid2}, linkKey: ${linkKey}`);
        
        // Check if this seqid pair corresponds to a valid consecutive pair
        if (validConsecutivePairs.includes(linkKey) || validConsecutivePairs.includes(linkKeyReverse)) {
          // Check if we've already assigned a link to this consecutive pair
          if (assignedPairs.has(linkKey) || assignedPairs.has(linkKeyReverse)) {
            // console.log(`  Link ${idx}: REMOVING - pair ${linkKey} already assigned`);
            return false;
          }
          
          // Assign this link to the consecutive pair
          assignedPairs.add(linkKey);
          assignedPairs.add(linkKeyReverse);
          // console.log(`  Link ${idx}: KEEPING - first link for consecutive pair ${linkKey}`);
          return true;
        } else {
          // console.log(`  Link ${idx}: REMOVING - ${linkKey} is not a valid consecutive pair`);
          return false;
        }
      }
      
      return false;
    });
    // --- GENE PALETTE LOGIC ---
    if (!effectiveGenePalette || !effectiveGenePalette.enabled) {
      genes = genes.map(g => {
        return { ...g, fillColor: themeColors.geneFill };
      });
    } else {
      // Use cluster (or colorBy) as the key for coloring
      const geneKeyField = colorBy || 'cluster';
      // Only include genes that have valid (non-null/undefined/empty) values for the color field in metadata
      const genesWithValidKeys = genes.filter(g => {
        const key = g.metadata && g.metadata[geneKeyField];
        return key !== null && key !== undefined && key !== '';
      });
      const geneKeys = Array.from(new Set(genesWithValidKeys.map(g => g.metadata[geneKeyField])));
      const geneColors = getPaletteColors(
        effectiveGenePalette.name,
        Math.max(geneKeys.length, effectiveGenePalette.numColors || geneKeys.length),
        effectiveGenePalette.reverse || false
      );
      const geneKeyToColor = {};
      geneKeys.forEach((key, i) => { geneKeyToColor[key] = geneColors[i % geneColors.length]; });
      genes = genes.map(g => {
        // Only check metadata for the key - no fallback to gene properties
        const key = g.metadata && g.metadata[geneKeyField];
        // Only apply palette color if key is valid, otherwise use themeColors.geneFill
        if (key !== null && key !== undefined && key !== '') {
          return { ...g, fillColor: geneKeyToColor[key] };
        } else {
          return { ...g, fillColor: themeColors.geneFill }; // Use themeColors.geneFill for genes without a cluster
        }
      });
    }

    // --- DOMAIN PALETTE LOGIC ---
    if (!effectiveDomainPalette || !effectiveDomainPalette.enabled) {
      domains = domains.map(d => {
        return { ...d, fillColor: themeColors.domainFill };
      });
    } else {
      // Use the selected domain color field instead of hardcoded domainName
      // Only include domains that have valid (non-null/undefined/empty) values for the color field
      const domainsWithValidKeys = domains.filter(d => {
        const key = (() => {
          switch(domainColorBy) {
            case 'domainName': return d.domainName;
            case 'start': return d.start;
            case 'end': return d.end;
            case 'evalue': return d.evalue;
            default: return d.domainName;
          }
        })();
        return key !== null && key !== undefined && key !== '';
      });
      const domainKeys = Array.from(new Set(domainsWithValidKeys.map(d => {
        switch(domainColorBy) {
          case 'domainName': return d.domainName;
          case 'start': return d.start;
          case 'end': return d.end;
          case 'evalue': return d.evalue;
          default: return d.domainName;
        }
      })));
      
      const domainColors = getPaletteColors(
        effectiveDomainPalette.name,
        Math.max(domainKeys.length, effectiveDomainPalette.numColors || domainKeys.length),
        effectiveDomainPalette.reverse || false
      );
      
      const domainKeyToColor = {};
      domainKeys.forEach((key, i) => { 
        domainKeyToColor[key] = domainColors[i % domainColors.length]; 
      });
      
      domains = domains.map(d => {
        const key = (() => {
          switch(domainColorBy) {
            case 'domainName': return d.domainName;
            case 'start': return d.start;
            case 'end': return d.end;
            case 'evalue': return d.evalue;
            default: return d.domainName;
          }
        })();
        // Apply palette color if key is valid, otherwise use themeColors.geneFill
        return {
          ...d,
          fillColor: key !== null && key !== undefined && key !== '' ? domainKeyToColor[key] : themeColors.domainFill
        };
      });
    }
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
    const phyloPaths = tree.buildEdges().map(edge => ({
      path: edge.path.map(([y, x]) => [y + treeOffset, x]),
      metadata: {
        source: edge.source.name || `internal_${edge.source.id}`,
        target: edge.target.name || `internal_${edge.target.id}`,
        length: edge.target.branchLength || 0,
        type: 'phylo_edge'
      },
      color: edge.color
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
          getPolygon: genes,
          getFillColor: genes,
          getLineColor: genes,
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
          getPolygon: domains,
          getFillColor: domains,
          getLineWidth: config.domain.edgeWidth
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
        stroked: config.gene.edgeWidth > 0,
        getLineColor: d => getGeneEdgeColor(d),
        getLineWidth: () => config.gene.edgeWidth,
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 0,
        filled: true,
        pickable: true,
        autoHighlight: true,
        updateTriggers: {
          getPolygon: ncRNAs,
          getFillColor: ncRNAs,
          getLineColor: ncRNAs,
          getLineWidth: config.gene.edgeWidth,
          stroked: config.gene.edgeWidth
        }
      })
    );

    return layers;
  }, [manualUpdateTrigger, alignmentVersion, tree, selectedNode, treeLabelPadding, treeMetadata, treeLabelBy, treeColorBy, showConnectingLines, phyloLabelPosition, alignLabels, styleConfig, geneColorBy, geneLabelBy, domainColorBy, themeColors]);

  // Align cluster or set default alignment BEFORE DeckGL is initialized
  const isFirstRun = React.useRef(true);
  const previousContainerSize = React.useRef(containerSize);
  const previousAlignCluster = React.useRef(alignCluster);
  const previousDefaultAlign = React.useRef(defaultAlign);
  const previousUseDefaultGeneAlignment = React.useRef(useDefaultGeneAlignment);
  
  useEffect(() => {
    const gv = genomeViewRef.current;
    if (!gv || !tree) return;
  
    // Skip alignment if we're in manual manipulation mode
    if (isManualManipulation.current) {
      console.log('Alignment effect: Skipping due to manual manipulation mode');
      return;
    }

    // Check if alignment-related props actually changed
    const alignClusterChanged = alignCluster !== previousAlignCluster.current;
    const defaultAlignChanged = defaultAlign !== previousDefaultAlign.current;
    const useDefaultGeneAlignmentChanged = useDefaultGeneAlignment !== previousUseDefaultGeneAlignment.current;
    
    // Check if container size changed significantly (more than 10px in either dimension)
    const containerSizeChanged = Math.abs(containerSize.width - previousContainerSize.current.width) > 10 ||
                                 Math.abs(containerSize.height - previousContainerSize.current.height) > 10;

    console.log('Alignment effect triggered:', {
      alignClusterChanged,
      defaultAlignChanged, 
      useDefaultGeneAlignmentChanged,
      containerSizeChanged,
      isFirstRun: isFirstRun.current,
      alignCluster,
      defaultAlign,
      useDefaultGeneAlignment,
      containerSize: {width: containerSize.width, height: containerSize.height},
      previousContainerSize: {width: previousContainerSize.current.width, height: previousContainerSize.current.height}
    });
  
    // Only run alignment if alignment props changed or first run
    let alignmentChanged = false;
    if (alignClusterChanged || defaultAlignChanged || useDefaultGeneAlignmentChanged || isFirstRun.current) {
      if (alignCluster != null && alignCluster !== '') {
        // alignCluster is set to a specific cluster number
        gv.alignCluster(alignCluster);
        alignmentChanged = true;
        console.log('Applied cluster alignment:', alignCluster);
      } else {
        // No specific cluster alignment requested
        // Use default gene alignment if enabled and available, otherwise fall back to traditional alignment
        const hasDefaultGenes = Object.values(gv.hoodBaselines || {}).some(baseline => baseline.align_gene);
        
        if (useDefaultGeneAlignment && hasDefaultGenes) {
          gv.alignByDefaultGenes();
          alignmentChanged = true;
          console.log('Applied default gene alignment');
        } else {
          // Fall back to traditional alignment
          if (defaultAlign === 'center') {
            gv.alignAllToCenter();
            alignmentChanged = true;
            console.log('Applied center alignment');
          } else if (defaultAlign === 'end') {
            gv.alignAllToEnd();
            alignmentChanged = true;
            console.log('Applied end alignment');
          } else {
            gv.alignAllToStart();
            alignmentChanged = true;
            console.log('Applied start alignment');
          }
        }
      }
    }
    
    // Only reset view bounds if alignment changed or significant container size change or first run
    if (alignmentChanged || containerSizeChanged || isFirstRun.current) {
      console.log('Calling fitViewToBounds due to:', {alignmentChanged, containerSizeChanged, isFirstRun: isFirstRun.current});
      fitViewToBounds(gv, tree, containerSize, setViewState, phyloLabelPosition);
      
      // Force layer data recomputation if alignment changed (positions changed)
      if (alignmentChanged) {
        setAlignmentVersion(prev => prev + 1);
      }
    } else {
      console.log('Skipping fitViewToBounds - no significant changes detected');
    }
    
    if (isFirstRun.current) {
      isFirstRun.current = false;
    }
    
    // Update previous values
    previousContainerSize.current = containerSize;
    previousAlignCluster.current = alignCluster;
    previousDefaultAlign.current = defaultAlign;
    previousUseDefaultGeneAlignment.current = useDefaultGeneAlignment;
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alignCluster, defaultAlign, useDefaultGeneAlignment, tree, containerSize]);
  

  const [rulerTicks, setRulerTicks] = React.useState([]);

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
          genomeView: genomeViewRef.current,
          precomputedTicks: rulerTicks // <-- pass ticks to SVG export
        } : undefined}
      />
      {/* Overlay buttons (top-left) */}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: '10px' }}>
        {/* ...other overlay buttons can go here... */}
      </div>
      <DeckGL
        views={[new OrthographicView({ flipY: false })]}
        controller={true}
        viewState={viewState}
        layers={layers}
        pickingRadius={10}
        style={{ width: '100%', height: '100%' }}
        onViewStateChange={({ viewState: vs }) => setViewState(vs)}
        getTooltip={getTooltip}
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
          onTicksComputed={setRulerTicks} // <-- capture ticks
        />
      )}
    </div>
  );
});

export default PhyloTreeViewer;
