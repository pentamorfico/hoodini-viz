// PhyloTreeViewer.jsx
import React, { useEffect, useRef, useState } from 'react';
import PhyloTree from '../models/PhyloTree';
import GenomeView from '../models/GenomeView';
import DeckGL from '@deck.gl/react';
import { LineLayer, PolygonLayer, PathLayer, TextLayer, ScatterplotLayer } from '@deck.gl/layers';
import {OrthographicView} from '@deck.gl/core';
import ScrollbarWidget from '../widgets/ScrollbarWidget';

const PhyloTreeViewer = ({
  newickStr,
  gffFeatures,
  proteinLinks,
  nucleotideLinks,
  domainsByGene,
  proteinClusters,
  baselines,
  showScrollbar,
  setGenomeViewRef,
  alignCluster,
  defaultAlign = 'start', // new prop, default to 'start'
}) => {
  // Visualization state
  const [tree, setTree] = useState(null);
  const [genomeView, setGenomeView] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const containerRef = React.useRef(null);
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });
  const [treeLabelPadding, setTreeLabelPadding] = React.useState(100);
  const [viewState, setViewState] = useState({
    target: [0, 0, 0],
    zoom: -10
  });

  // Build tree and genomeView from parsed props
  useEffect(() => {
    const tree = new PhyloTree(newickStr);
    const leavesToUse = tree.getLeafNodes().map(n => n.name);
    tree.layout(leavesToUse);
    const genomeView = new GenomeView(leavesToUse, tree);
    genomeView.addFeatures(gffFeatures);
    genomeView.initGenes();
    genomeView.computeTrackPositions();
    genomeView.addDomains(domainsByGene);
    genomeView.addProteinLinks(proteinLinks);
    genomeView.addNucleotideLinks(nucleotideLinks);
    if (proteinClusters) {
      genomeView.setProteinClusters(proteinClusters);
    }
    if (baselines) {
      genomeView.applyBaselines(baselines);
    }
    setTree(tree);
    setGenomeView(genomeView);
    setSelectedNode(null);
    if (typeof setGenomeViewRef === 'function') {
      setGenomeViewRef(genomeView);
    }
  }, [newickStr, gffFeatures, proteinLinks, nucleotideLinks, domainsByGene, proteinClusters, baselines, treeLabelPadding]);

  // Utility to compute bounding box from all polygons/paths
  function computeBounds(genomeView, tree) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let minBaselineX = Infinity;
    if (!genomeView) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000, treeOffset: 0, geneOffset: 0 };
    // Genes
    Object.values(genomeView.genesById).forEach(g => {
      if (g.polygon) g.polygon.forEach(([x, y]) => {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      });
    });
    // Domains
    genomeView.getAllDomains().forEach(d => {
      if (d.polygon) d.polygon.forEach(([x, y]) => {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      });
    });
    // Baselines (for tree offset)
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
    // Set geneOffset so that minX is at e.g. 100
    const geneOffset = isFinite(minX) ? (100 - minX) : 0;
    // Compute offset to align tree's maxX to min baseline X (after geneOffset applied)
    // Always keep tree to the left of genome features by a fixed gap (e.g. 40px)
    const treeGap = 140;
    const treeOffset = isFinite(treeMaxX) && isFinite(minBaselineX)
      ? (minBaselineX - treeMaxX - treeGap - treeLabelPadding)
      : 0;
    // Fallback
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      minX = 0; minY = 0; maxX = 1000; maxY = 1000;
    }
    return { minX, minY, maxX, maxY, treeOffset, geneOffset };
  }

  // External function to fit view to bounds
  function fitViewToBounds(genomeView, tree, containerSize, setViewState) {
    if (!genomeView || !tree) return;
    const { width: cw, height: ch } = containerSize;
    if (!cw || !ch) return;
    const bounds = computeBounds(genomeView, tree);
    const w = bounds.maxX - bounds.minX;
    const h = bounds.maxY - bounds.minY;
    const padding = 100;
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
    fitViewToBounds(genomeView, tree, containerSize, setViewState);
  }, [containerSize]);

  // Add after viewState and bounds are available
  const bounds = computeBounds(genomeView, tree);
  const minY = bounds.minY;
  const maxY = bounds.maxY;
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
    // For each gene, position label at the center X between start and end, just below min Y
    return genes.map(gene => {
      const clusterId = gene.metadata && gene.metadata.clusterId ? gene.metadata.clusterId : null;
      if (!clusterId) return null; // Only show if clusterId exists
      if (!gene.polygon || gene.polygon.length === 0) return null;
      // Use the center between gene.start and gene.end for X
      const centerX = (gene.start + gene.end) / 2;
      // Use the minimum Y of the polygon for vertical position
      const ys = gene.polygon.map(([_, y]) => y);
      const minY = Math.min(...ys);
      const labelY = minY; // 30 units below the gene (adjust as needed)
      return {
        position: [centerX, labelY],
        text: String(clusterId),
        color: [0, 0, 0, 255],
        size: 12,
        textAnchor: 'middle',
        alignmentBaseline: 'top',
      };
    }).filter(Boolean);
  }

  const layers = React.useMemo(() => {
    if (!genomeView || !tree) return [];
    // Use treeOffset and geneOffset for all tree-related and genome-related X shifts
    const bounds = computeBounds(genomeView, tree);
    const treeOffset = bounds.treeOffset || 0;
    // Genes
    const genes = Object.values(genomeView.genesById);
    // Domains
    const domains = genomeView.getAllDomains();
    // Protein links
    const proteinPolygons = genomeView.getProteinPolygons();
    // Nucleotide links
    const nucleotidePolygons = genomeView.getNucleotidePolygons();
    // Phylo tree paths (shifted)
    // Use edges with metadata for tooltips
    const phyloPaths = genomeView.buildEdgesWithMetadata().map(e => ({
      ...e,
      path: e.path.map(([y, x]) => [y + treeOffset, x]),
      metadata: e.metadata
    }));
    // Phylo labels (shift X by treeOffset)
    const phyloLabels = genomeView.buildPhyloLabels().map(l => ({
      ...l,
      position: [l.position[0] + treeOffset, l.position[1]]
    }));
    // Node points (shift X by treeOffset)
    const nodePoints = genomeView.buildNodePoints(selectedNode).map(n => ({
      ...n,
      position: [n.position[0] + treeOffset, n.position[1]]
    }));

    const nucleotideBaselines = Object.values(genomeView.nucleotidesBySeqid)
      .filter(nuc => nuc.baseline && genomeView.getTrackY(nuc.seqid) != null)
      .map(nuc => ({
        seqid: nuc.seqid,
        start: nuc.baseline.start,
        end: nuc.baseline.end,
        trackY: genomeView.getTrackY(nuc.seqid)
      }));
    
    // Gene cluster labels (below genes)
    const geneLabels = buildGeneLabels(genes);

    return [
      new LineLayer({
        id: 'baselines',
        data: nucleotideBaselines,
        getSourcePosition: d => [d.start, d.trackY],
        getTargetPosition: d => [d.end, d.trackY],
        getColor: [0, 0, 0, 255],
        getWidth: 2,
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
        getColor: d => d.color,
        autoHighlight: true,
        widthUnits: 'meters',
        jointRounded: true,
        capRounded: true,
        widthMinPixels: 2,
        pickable: true,
        updateTriggers: {
          getPath: phyloPaths.map(p => p.path),
          getColor: phyloPaths.map(p => p.color)
        }
      }),
      // Genes
      new PolygonLayer({
        id: 'genes',
        data: genes,
        getPolygon: d => d.polygon,
        getFillColor: d => d.fillColor,
        stroked: true,
        getLineColor: [50, 50, 50],
        lineWidthMinPixels: 1,
        filled: true,
        pickable: true, // changed from false
        autoHighlight: true,
        updateTriggers: {
          getPolygon: genes.map(g => g.polygon),
          getFillColor: genes.map(g => g.fillColor)
        }
      }),
      // Domains
      new PolygonLayer({
        id: 'domains',
        data: domains,
        getPolygon: d => d.polygon,
        getFillColor: d => d.fillColor,
        stroked: true,
        getLineColor: [0,0,0,255],
        lineWidthMinPixels: 1,
        filled: true,
        autoHighlight: true,
        pickable: true, // changed from false
        updateTriggers: {
          getPolygon: domains.map(d => d.polygon),
          getFillColor: domains.map(d => d.fillColor)
        }
      }),
      // Gene cluster TextLayer (below genes)
      new TextLayer({
        id: 'gene-labels',
        data: geneLabels,
        getPosition: d => d.position,
        getText: d => d.text,
        getColor: d => d.color,
        getSize: d => d.size * 5,
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
        data: phyloLabels,
        getPosition: d => d.position,
        getText: d => d.text,
        getColor: d => d.color,
        getSize: d => d.size*5,
        sizeUnits: 'meters',
        fontFamily: 'sans-serif',
        getTextAnchor: d => d.textAnchor || 'start',
        getAlignmentBaseline: 'middle',
        getPixelOffset: d => [5, 0],
        pickable: false,
        updateTriggers: {
          getPosition: phyloLabels.map(l => l.position),
          getText: phyloLabels.map(l => l.text)
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
  }, [genomeView, tree, selectedNode, viewState, treeLabelPadding]);

  // Align cluster or set default alignment BEFORE DeckGL is initialized
  const isFirstRun = React.useRef(true);
  useEffect(() => {
    if (!genomeView) return;
    if (alignCluster != null) {
      genomeView.alignCluster(alignCluster);
      setViewState(vs => vs ? { ...vs } : vs);
      if (isFirstRun.current) {
        fitViewToBounds(genomeView, tree, containerSize, setViewState);
        isFirstRun.current = false;
      // You can add any first-run-only logic here if needed
    }
    } else {
      if (defaultAlign === 'center') {
        genomeView.alignAllToCenter();
        setViewState(vs => vs ? { ...vs } : vs);
      } else if (defaultAlign === 'end') {
        genomeView.alignAllToEnd();
        setViewState(vs => vs ? { ...vs } : vs);
      } else {
        genomeView.alignAllToStart();
        setViewState(vs => vs ? { ...vs } : vs);
      }
      if (isFirstRun.current) {
        console.log('First run, aligning to default:', defaultAlign);
        fitViewToBounds(genomeView, tree, containerSize, setViewState);
        isFirstRun.current = false;
      }
    }
    // No setViewState here; just mutate genomeView before DeckGL uses it
    // eslint-disable-next-line
  }, [genomeView, alignCluster, defaultAlign]);

  

  return (
    <div id="phylo-tree-viewer-container" ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
      </div>
      <DeckGL
        views={[new OrthographicView({ flipY: false })]}
        controller={true}
        viewState={viewState}
        layers={layers}
        style={{ width: '100%', height: '100%' }}
        onViewStateChange={({ viewState: vs }) => setViewState(vs)}
        getTooltip={getTooltip}
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
        />
      )}
    </div>
  );
};

export default PhyloTreeViewer;
