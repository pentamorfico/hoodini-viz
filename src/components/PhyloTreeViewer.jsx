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
  geneColorBy,
  geneLabelBy,
  domainColorBy = 'domainName', // Add this prop
  proteinLinkColor = [50, 100, 220],
  nucleotideLinkColor = [220, 50, 50],
}, ref) => {
  // Theme context
  const { getThemeColors } = useTheme();
  const themeColors = getThemeColors();
  
  // Visualization state
  const [tree, setTree] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [manualUpdateTrigger, setManualUpdateTrigger] = useState(0); // Separate trigger for manual updates
  const containerRef = React.useRef(null);
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });
  const [treeLabelPadding, setTreeLabelPadding] = React.useState(100);
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

  // Only create genomeView when data changes
  useEffect(() => {
    const tree = new PhyloTree(newickStr, config, ultrametric, themeColors);
    const leavesToUse = tree.getLeafNodes().map(n => n.name);
    tree.layout(leavesToUse);
    const genomeView = new GenomeView(leavesToUse, tree, config);
    genomeView.addFeatures(gffFeatures);
    if (baselines) genomeView.applyBaselines(baselines);
    genomeView.initGenes();
    genomeView.computeTrackPositions();
    genomeView.addDomains(domainsByGene);
    genomeView.addProteinLinks(proteinLinks, proteinLinkColor);
    genomeView.addNucleotideLinks(nucleotideLinks, nucleotideLinkColor);
    // Attach protein metadata to gene objects
    if (proteinMetadata) {
      for (const uniqueGeneId in genomeView.genesById) {
        const gene = genomeView.genesById[uniqueGeneId];
        const originalGeneId = gene.originalGeneId;
        if (originalGeneId && proteinMetadata[originalGeneId]) {
          gene.metadata = proteinMetadata[originalGeneId];
        }
      }
    }
    // Set clusters if available
    let clustersFromMetadata = null;
    if (proteinMetadata) {
      const entries = Object.values(proteinMetadata);
      if (entries.length && entries[0][colorBy] !== undefined) {
        clustersFromMetadata = {};
        for (const entry of entries) {
          if (entry.gene_id && entry[colorBy] !== undefined) {
            clustersFromMetadata[entry.gene_id] = entry[colorBy];
          }
        }
      }
    }
    if (clustersFromMetadata) {
      genomeView.setProteinClusters(clustersFromMetadata);
    }
    genomeViewRef.current = genomeView;
    setTree(tree);
    setSelectedNode(null);
  }, [newickStr, gffFeatures, proteinLinks, nucleotideLinks, domainsByGene, baselines, proteinMetadata, colorBy, config, ultrametric, themeColors, proteinLinkColor, nucleotideLinkColor]);

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
      // Fallback: manually calculate X bounds from genes and domains
      Object.values(genomeView.genesById).forEach(g => {
        if (g.polygon) g.polygon.forEach(([x, y]) => {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        });
      });
      genomeView.getAllDomains().forEach(d => {
        if (d.polygon) d.polygon.forEach(([x, y]) => {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        });
      });
    }
    
    // Calculate Y bounds from genes and domains (still needed for vertical layout)
    Object.values(genomeView.genesById).forEach(g => {
      if (g.polygon) g.polygon.forEach(([x, y]) => {
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

  // Automatically fit view to bounds on data or container size changes
  React.useEffect(() => {
    fitViewToBounds(genomeViewRef.current, tree, containerSize, setViewState, phyloLabelPosition);
  }, [containerSize, tree, phyloLabelPosition]);

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
      if (colorValue !== undefined && colorValue !== null) {
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
        paletteColors = [];
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
      const colorValue = String(metadata[treeColorBy] || '');
      return {
        ...label,
        color: colorValueToColor[colorValue] || [0, 0, 0, 255]
      };
    });
  }

  const layers = React.useMemo(() => {
    const genomeView = genomeViewRef.current;
    if (!genomeView || !tree) return [];
    // Use treeOffset and geneOffset for all tree-related and genome-related X shifts
    const bounds = computeBounds(genomeView, tree, phyloLabelPosition);
    const treeOffset = bounds.treeOffset || 0;
    // Genes
    let genes = Object.values(genomeView.genesById);
    // Domains
    let domains = genomeView.getAllDomains();
    // Protein links
    const proteinPolygons = genomeView.getProteinPolygons();
    // Nucleotide links
    const nucleotidePolygons = genomeView.getNucleotidePolygons();
    // --- GENE PALETTE LOGIC ---
    if (genePalette && genePalette.enabled) {
      // Use cluster (or colorBy) as the key for coloring
      const geneKeyField = colorBy || 'cluster';
      const geneKeys = Array.from(new Set(genes.map(g => g.metadata && g.metadata[geneKeyField] !== undefined ? g.metadata[geneKeyField] : g[geneKeyField] || g.hood_id || g.gene_id || g.id || g.name)));
      const geneColors = getPaletteColors(
        genePalette.name,
        Math.max(geneKeys.length, genePalette.numColors || geneKeys.length),
        genePalette.reverse || false
      );
      const geneKeyToColor = {};
      geneKeys.forEach((key, i) => { geneKeyToColor[key] = geneColors[i % geneColors.length]; });
      genes = genes.map(g => {
        const key = g.metadata && g.metadata[geneKeyField] !== undefined ? g.metadata[geneKeyField] : g[geneKeyField] || g.hood_id || g.gene_id || g.id || g.name;
        return { ...g, fillColor: geneKeyToColor[key] };
      });
    }

    // --- DOMAIN PALETTE LOGIC ---
    if (domainPalette && domainPalette.enabled) {
      // Use the selected domain color field instead of hardcoded domainName
      const domainKeys = Array.from(new Set(domains.map(d => {
        switch(domainColorBy) {
          case 'domainName': return d.domainName;
          case 'start': return d.start;
          case 'end': return d.end;
          case 'evalue': return d.evalue;
          default: return d.domainName;
        }
      })));
      
      const domainColors = getPaletteColors(
        domainPalette.name,
        Math.max(domainKeys.length, domainPalette.numColors || domainKeys.length),
        domainPalette.reverse || false
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
        return { ...d, fillColor: domainKeyToColor[key] };
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

    // Use edges with metadata for tooltips
    const phyloPaths = genomeView.buildEdgesWithMetadata().map(e => ({
      ...e,
      path: e.path.map(([y, x]) => [y + treeOffset, x]),
      metadata: e.metadata
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
      if (phyloPalette && phyloPalette.enabled) {
        // Use colorBy value for coloring if palette is enabled
        const colorValue = meta[treeColorBy] || '';
        color = colorValue ? hashToColor(colorValue) : [0,0,0,255];
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
    let finalPhyloLabels = rawPhyloLabels;
    if (phyloPalette && phyloPalette.enabled && treeMetadata) {
      finalPhyloLabels = applyPhyloPalette(rawPhyloLabels, treeColorBy, treeMetadata, phyloPalette);
    } else {
      // Remove leafNode property for DeckGL
      finalPhyloLabels = rawPhyloLabels.map(({position,text,color,size,textAnchor}) => ({position,text,color,size,textAnchor}));
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

    // Node points (shift X by treeOffset)
    const nodePoints = genomeView.buildNodePoints(selectedNode).map(n => ({
      ...n,
      position: [n.position[0] + treeOffset, n.position[1]]
    }));

    // Helper function to adjust gene edge color based on theme
    const getGeneEdgeColor = (gene) => {
      const fillColor = gene.fillColor || config.gene.fillColor;
      if (!Array.isArray(fillColor) || fillColor.length < 3) return fillColor;
      
      // For light theme: darken the color (multiply by factor < 1)
      // For dark theme: lighten the color (multiply by factor > 1) 
      const factor = themeColors.background === '#ffffff' ? 0.7 : 1.3; // light theme = darken, dark theme = lighten
      
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
        getColor: themeColors.baselines || config.colors.darkGray || [85, 85, 85, 255],
        getWidth: config.stroke.baselineWidth || config.stroke.lineWidth,
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
          getPolygon: proteinPolygons.map(p => p.polygon),
          getFillColor: proteinPolygons.map(p => p.fillColor)
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
          getPolygon: nucleotidePolygons.map(p => p.polygon),
          getFillColor: nucleotidePolygons.map(p => p.fillColor)
        }
      }),
      // Phylogenetic tree paths
      new PathLayer({
        id: 'phylo-tree',
        data: phyloPaths,
        getPath: d => d.path,
        getColor: d => d.color || themeColors.treeEdges || config.tree.edgeColor,
        autoHighlight: true,
        widthUnits: 'pixels',
        jointRounded: true,
        capRounded: true,
        getWidth: () => config.tree.edgeWidth || 3,
        pickable: true,
        updateTriggers: {
          getPath: phyloPaths.map(p => p.path),
          getColor: phyloPaths.map(p => p.color),
          getWidth: config.tree.edgeWidth
        }
      }),
      // Genes
      new PolygonLayer({
        id: 'genes',
        data: genes,
        getPolygon: d => d.polygon,
        getFillColor: d => d.fillColor || config.gene.fillColor,
        stroked: config.gene.edgeWidth > 0,
        getLineColor: d => getGeneEdgeColor(d),
        getLineWidth: () => config.gene.edgeWidth,
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 0,
        filled: true,
        pickable: true,
        autoHighlight: true,
        updateTriggers: {
          getPolygon: genes.map(g => g.polygon),
          getFillColor: genes.map(g => g.fillColor),
          getLineColor: genes.map(g => getGeneEdgeColor(g)),
          getLineWidth: config.gene.edgeWidth,
          stroked: config.gene.edgeWidth
        }
      }),
      // Domains
      new PolygonLayer({
        id: 'domains',
        data: domains,
        getPolygon: d => d.polygon,
        getFillColor: d => d.fillColor || config.colors.gray,
        stroked: true,
        getLineColor: () => config.colors.black,
        getLineWidth: () => config.domain.edgeWidth || 2,
        lineWidthUnits: 'pixels',
        filled: true,
        autoHighlight: true,
        pickable: true,
        updateTriggers: {
          getPolygon: domains.map(d => d.polygon),
          getFillColor: domains.map(d => d.fillColor),
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
          getPosition: geneLabels.map(l => l.position),
          getText: geneLabels.map(l => l.text)
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
        getAlignmentBaseline: 'center',
        getPixelOffset: d => [5, 0],
        // Add background when connecting lines are active
        background: showConnectingLines,
        getBackgroundColor: showConnectingLines ? [themeColors.background === '#ffffff' ? 255 : 0, themeColors.background === '#ffffff' ? 255 : 0, themeColors.background === '#ffffff' ? 255 : 0, 255] : [0, 0, 0, 0],
        backgroundPadding: showConnectingLines ? [2, 1, 2, 1] : [0, 0, 0, 0],
        pickable: false,
        updateTriggers: {
          getPosition: finalPhyloLabels.map(l => l.position),
          getText: finalPhyloLabels.map(l => l.text),
          getColor: finalPhyloLabels.map(l => l.color),
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
          getPosition: nodePoints.map(n => n.position),
          getFillColor: nodePoints.map(n => n.color)
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
              getSourcePosition: connectingLinesData.map(d => d.sourcePosition),
              getTargetPosition: connectingLinesData.map(d => d.targetPosition)
            }
          })
        );
      }
    }

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
          getSourcePosition: treeTicks.map(d => d.sourcePosition),
          getTargetPosition: treeTicks.map(d => d.targetPosition)
        }
      })
    );

    return layers;
  }, [manualUpdateTrigger, tree, selectedNode, viewState, treeLabelPadding, treeMetadata, treeLabelBy, treeColorBy, showConnectingLines, phyloLabelPosition, alignLabels, config, genePalette, domainPalette, phyloPalette, geneColorBy, geneLabelBy, domainColorBy]);

  // Align cluster or set default alignment BEFORE DeckGL is initialized
  const isFirstRun = React.useRef(true);
  useEffect(() => {
    const genomeView = genomeViewRef.current;
    if (!genomeView) return;
    
    // Skip alignment if we're in manual manipulation mode
    if (isManualManipulation.current) {
      return;
    }
    
    if (alignCluster != null && alignCluster !== '') {
      // alignCluster is set to a specific cluster number
      genomeView.alignCluster(alignCluster);
      // Recompute bounds and refit view after alignment
      fitViewToBounds(genomeView, tree, containerSize, setViewState);
    } else {
      // No specific cluster alignment requested
      // Use default gene alignment if enabled and available, otherwise fall back to traditional alignment
      const hasDefaultGenes = Object.values(genomeView.hoodBaselines || {}).some(baseline => baseline.align_gene);
      
      if (useDefaultGeneAlignment && hasDefaultGenes) {
        genomeView.alignByDefaultGenes();
        // Recompute bounds and refit view after alignment
        fitViewToBounds(genomeView, tree, containerSize, setViewState);
      } else {
        // Fall back to traditional alignment
        if (defaultAlign === 'center') {
          genomeView.alignAllToCenter();
          // Recompute bounds and refit view after alignment
          fitViewToBounds(genomeView, tree, containerSize, setViewState);
        } else if (defaultAlign === 'end') {
          genomeView.alignAllToEnd();
          // Recompute bounds and refit view after alignment
          fitViewToBounds(genomeView, tree, containerSize, setViewState);
        } else {
          genomeView.alignAllToStart();
          // Recompute bounds and refit view after alignment
          fitViewToBounds(genomeView, tree, containerSize, setViewState);
        }
      }
    }
    
    if (isFirstRun.current) {
      fitViewToBounds(genomeView, tree, containerSize, setViewState);
      isFirstRun.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualUpdateTrigger, genomeViewRef, alignCluster, defaultAlign, useDefaultGeneAlignment, tree, containerSize, config]);
  

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
