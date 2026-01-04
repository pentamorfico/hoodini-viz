import { useState, useRef, useEffect } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { DataTable } from '@/components/data-table';
import { SectionCards } from '@/components/section-cards';
import { SiteHeader } from '@/components/site-header';
import { SVGExportButton } from '@/components/svg-export-button';
import ThemeToggle from '@/components/ThemeToggle.jsx';
import { Button } from '@/components/ui/button';
import { Table as TableIcon } from 'lucide-react';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import AppPhylo from './AppPhylo.jsx';
import { ThemeProvider } from '@/contexts/ThemeContext.jsx';
import { DEFAULT_CONFIG } from '@/config/visualizationConfig.js';

function App() {
  // Shared sidebar/AppPhylo state
  const [ultrametric, setUltrametric] = useState(false);
  const [showConnectingLines, setShowConnectingLines] = useState(false);
  const [showScrollbar, setShowScrollbar] = useState(false);
  const [alignLabels, setAlignLabels] = useState(false);
  const [alignCluster, setAlignCluster] = useState(null);
  const [useDefaultGeneAlignment, setUseDefaultGeneAlignment] = useState(true);
  const [defaultAlign, setDefaultAlign] = useState('start');
  const [phyloLabelPosition, setPhyloLabelPosition] = useState('after-tree');
  const [arrowheadHeightDisplay, setArrowheadHeightDisplay] = useState(DEFAULT_CONFIG.gene.arrowheadHeight);
  const [geneLabelPosition, setGeneLabelPosition] = useState('bottom');
  const [geneHeightDisplay, setGeneHeightDisplay] = useState(DEFAULT_CONFIG.gene.height);
  // Provide defaults matching AppPhylo so the top-level controls are enabled by default
  const [domainColorBy, setDomainColorBy] = useState('evalue');
  const [geneColorBy, setGeneColorBy] = useState('cluster');
  const [treeColorBy, setTreeColorBy] = useState('species');
  const [treeLabelBy, setTreeLabelBy] = useState('species');
  const [geneLabelBy, setGeneLabelBy] = useState('cluster');
  const [genePalette, setGenePalette] = useState({ type: 'qualitative', name: 'Bold', numColors: 8, reverse: false, enabled: true });
  const [phyloPalette, setPhyloPalette] = useState({ type: 'qualitative', name: 'Prism', numColors: 8, reverse: false, enabled: true });
  const [domainPalette, setDomainPalette] = useState({ type: 'sequential', name: 'Gray', numColors: 9, reverse: false, enabled: true, alphaRange: [0.2, 0.5] });
  const [ncRNAPalette, setNcRNAPalette] = useState({ type: 'qualitative', name: 'Set3', numColors: 8, reverse: false, enabled: true });
  const [regionPalette, setRegionPalette] = useState({ type: 'qualitative', name: 'Dark2', numColors: 8, reverse: false, enabled: true });
  const [showDataTable, setShowDataTable] = useState(false);
  // Initialize link configs from visualization defaults so widgets use the
  // same defaults as the app config instead of their internal fallbacks.
  const [proteinLinkConfig, setProteinLinkConfig] = useState(DEFAULT_CONFIG.proteinLink);
  const [nucleotideLinkConfig, setNucleotideLinkConfig] = useState(DEFAULT_CONFIG.nucleotideLink);
  const [treeXScale, setTreeXScale] = useState(DEFAULT_CONFIG.tree.xScalePercent);
  
  // Layer visibility states
  const [showTreeLayer, setShowTreeLayer] = useState(true);
  const [showGeneLayer, setShowGeneLayer] = useState(true);
  const [showDomainLayer, setShowDomainLayer] = useState(true);
  const [showProteinLinkLayer, setShowProteinLinkLayer] = useState(true);
  const [showNucleotideLinkLayer, setShowNucleotideLinkLayer] = useState(true);
  const [showNcRNALayer, setShowNcRNALayer] = useState(true);
  const [showGeneTextLayer, setShowGeneTextLayer] = useState(true);
  const [showTreeTextLayer, setShowTreeTextLayer] = useState(true);

  // Data availability states for conditional switch rendering
  const [hasGeneData, setHasGeneData] = useState(false);
  const [hasDomainData, setHasDomainData] = useState(false);
  const [hasProteinLinkData, setHasProteinLinkData] = useState(false);
  const [hasNucleotideLinkData, setHasNucleotideLinkData] = useState(false);
  const [hasNcRNAData, setHasNcRNAData] = useState(false);
  
  // viewerLegend should be an object (legend payload) or null when empty.
  // It was previously initialized to the string "true" which makes the
  // LegendWidget receive an invalid type and show "No legend entries available".
  const [viewerLegend, setViewerLegend] = useState(null);
  // Debug: log when viewerLegend changes to verify legend emission
  useEffect(() => {
    try {
      
    } catch (e) {}
  }, [viewerLegend]);
  const [styleConfig, setStyleConfig] = useState(null);
  const phyloTreeViewerRef = useRef(null);
  // Dev helper: expose a safe sync getter so you can inspect legend from the
  // browser console by running `window.__hoodini_getLegend()`.
  // This is only set when the ref becomes available and can be removed later.
  useEffect(() => {
    // Always attach wrapper helpers on window. They will resolve the
    // viewer/ref at call time so timing doesn't matter. Cast window to any
    // to avoid TypeScript property errors in development builds.
    try {
      const w = window as any;
      w.__hoodini_getLegend = () => {
        try { return phyloTreeViewerRef.current?.getLegendData?.() ?? null; } catch (e) { return null; }
      };
      w.__hoodini_getClusters = () => {
        try {
          const gv = phyloTreeViewerRef.current?.genomeView ?? phyloTreeViewerRef.current?.getGenomeView?.();
          if (!gv) return null;
          return Array.from(new Set(Object.values(gv.proteinClusters || {})));
        } catch (e) { return null; }
      };
      w.__hoodini_alignCluster = (clusterId) => {
        try {
          console.log('🚀 HELPER CALLED WITH:', clusterId, 'typeof:', typeof clusterId);
          const gv = phyloTreeViewerRef.current?.genomeView ?? phyloTreeViewerRef.current?.getGenomeView?.();
          if (!gv || typeof gv.alignCluster !== 'function') {
            console.log('🚀 NO GENOMEVIEW OR ALIGNCLUSTER FUNCTION');
            return null;
          }
          console.log('🚀 CALLING gv.alignCluster WITH:', clusterId);
          gv.alignCluster(clusterId);
          console.log('🚀 CALLING forceAlignUpdate');
          // If viewer provides a refresh hook, call it; harmless if missing
          if (phyloTreeViewerRef.current?.forceAlignUpdate) {
            phyloTreeViewerRef.current.forceAlignUpdate();
            console.log('🚀 forceAlignUpdate CALLED');
          }
          
          // NUCLEAR OPTION: Force bounds recalculation and container re-measure
          console.log('🚀 FORCING AGGRESSIVE REFRESH');
          setTimeout(() => {
            try {
              // Force the viewer to recalculate everything
              if (phyloTreeViewerRef.current?.forceAlignUpdate) {
                phyloTreeViewerRef.current.forceAlignUpdate();
              }
              // Trigger a window resize event to force deck.gl to redraw
              window.dispatchEvent(new Event('resize'));
              console.log('🚀 AGGRESSIVE REFRESH COMPLETE');
            } catch (e) {
              console.log('🚀 AGGRESSIVE REFRESH ERROR:', e);
            }
          }, 10);
          
          return true;
  } catch (e) { 
          console.log('🚀 HELPER ERROR:', e);
          return false; 
        }
      };
      // Dev helpers for deeper inspection from the browser console
      w.__hoodini_getGenomeView = () => {
        try { return phyloTreeViewerRef.current?.genomeView ?? null; } catch (e) { return null; }
      };
      w.__hoodini_inspectGene = (uniqueGeneId) => {
        try {
          const gv = phyloTreeViewerRef.current?.genomeView;
          if (!gv || !gv.genesById) return null;
          return gv.genesById[uniqueGeneId] || null;
        } catch (e) { return null; }
      };
    } catch (e) {}

    // cleanup when component unmounts
    return () => {
      try {
        const w = window as any;
        if (w.__hoodini_getLegend) delete w.__hoodini_getLegend;
        if (w.__hoodini_getClusters) delete w.__hoodini_getClusters;
        if (w.__hoodini_alignCluster) delete w.__hoodini_alignCluster;
  if (w.__hoodini_getGenomeView) delete w.__hoodini_getGenomeView;
  if (w.__hoodini_inspectGene) delete w.__hoodini_inspectGene;
      } catch (e) {}
    };
  }, [phyloTreeViewerRef]);

  // Polling fallback: periodically check for legend data from the viewer
  // (either via the ref getter or the window helper) and show an on-screen
  // overlay so the user sees the legend even if the viewer didn't emit.
  // Polling overlay removed — use window.__hoodini_getLegend() or console logs for debugging
  // Metadata columns for select options (stateful so parsed data can update them)
  const [geneMetadataColumnsState, setGeneMetadataColumns] = useState(['cluster', 'species', 'geneType']);
  const [treeMetadataColumnsState, setTreeMetadataColumns] = useState(['species', 'branchLength', 'support']);
  const [domainMetadataColumnsState, setDomainMetadataColumns] = useState([]);
  // Domain source filter state ("all" means no filtering)
  const [domainSource, setDomainSource] = useState('all');

  // Set a sensible default domain source when genome data becomes available:
  // prefer 'pfam' if present, otherwise choose the source with the most domains.
  useEffect(() => {
    if (domainSource !== 'all') return; // don't override an explicit selection

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12; // poll briefly for genomeView availability

    const trySetDefault = () => {
      try {
        const gv = phyloTreeViewerRef.current?.genomeView ?? phyloTreeViewerRef.current?.getGenomeView?.();
        if (!gv || typeof gv.getAllDomains !== 'function') return false;
        const domains = gv.getAllDomains() || [];
        if (!domains.length) return false;

        // Count domains by source (coerce to lowercase string keys)
        const counts = {};
        for (const d of domains) {
          const raw = d?.source ?? (d?.metadata?.source ?? d?.metadata?.Source) ?? 'unknown';
          const key = String(raw).toLowerCase();
          counts[key] = (counts[key] || 0) + 1;
        }

        // Prefer 'pfam' if present (case-insensitive)
        if (counts['pfam']) {
          if (!cancelled) setDomainSource('pfam');
          return true;
        }

        // Otherwise pick the source with the highest count
  const entries = Object.entries(counts).map(([k, v]) => [k, Number(v)] as [string, number]);
  if (entries.length === 0) return false;
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries[0][0];
        if (!cancelled) setDomainSource(top);
        return true;
      } catch (e) {
        return false;
      }
    };

    const interval = setInterval(() => {
      attempts += 1;
      if (cancelled) {
        clearInterval(interval);
        return;
      }
      const done = trySetDefault();
      if (done || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [phyloTreeViewerRef, domainSource]);
  // Selected gene state for info panel
  const [selectedGene, setSelectedGene] = useState(null);
  // Dummy track handlers
  const handleTrackShiftMinus1kb = (hoodId) => {};
  const handleTrackShiftPlus1kb = (hoodId) => {};
  const handleTrackFlip = (hoodId) => {};
  const handleArrowheadHeightChange = (val) => setArrowheadHeightDisplay(val);
  const handleGeneHeightChange = (val) => setGeneHeightDisplay(val);

  return (
    <ThemeProvider>
      <SidebarProvider
      style={{
        '--sidebar-width': 'calc(var(--spacing) * 85)',
        '--header-height': 'calc(var(--spacing) * 12)',
      } as React.CSSProperties}
    >
      <AppSidebar
        variant="inset"
        ultrametric={ultrametric}
        setUltrametric={setUltrametric}
        showConnectingLines={showConnectingLines}
        setShowConnectingLines={setShowConnectingLines}
        showScrollbar={showScrollbar}
        setShowScrollbar={setShowScrollbar}
        alignLabels={alignLabels}
        setAlignLabels={setAlignLabels}
        alignCluster={alignCluster}
        setAlignCluster={setAlignCluster}
        useDefaultGeneAlignment={useDefaultGeneAlignment}
        setUseDefaultGeneAlignment={setUseDefaultGeneAlignment}
        defaultAlign={defaultAlign}
        setDefaultAlign={setDefaultAlign}
        phyloLabelPosition={phyloLabelPosition}
        setPhyloLabelPosition={setPhyloLabelPosition}
        arrowheadHeightDisplay={arrowheadHeightDisplay}
        setArrowheadHeightDisplay={setArrowheadHeightDisplay}
        geneHeightDisplay={geneHeightDisplay}
        setGeneHeightDisplay={setGeneHeightDisplay}
  geneLabelPosition={geneLabelPosition}
  setGeneLabelPosition={setGeneLabelPosition}
        geneColorBy={geneColorBy}
        setGeneColorBy={setGeneColorBy}
        treeColorBy={treeColorBy}
        setTreeColorBy={setTreeColorBy}
        domainColorBy={domainColorBy}
        setDomainColorBy={setDomainColorBy}
        treeLabelBy={treeLabelBy}
        setTreeLabelBy={setTreeLabelBy}
        geneLabelBy={geneLabelBy}
        setGeneLabelBy={setGeneLabelBy}
        genePalette={genePalette}
        setGenePalette={setGenePalette}
        phyloPalette={phyloPalette}
        setPhyloPalette={setPhyloPalette}
        domainPalette={domainPalette}
        setDomainPalette={setDomainPalette}
  domainSource={domainSource}
  setDomainSource={setDomainSource}
        ncRNAPalette={ncRNAPalette}
        setNcRNAPalette={setNcRNAPalette}
        regionPalette={regionPalette}
        setRegionPalette={setRegionPalette}
        proteinLinkConfig={proteinLinkConfig}
        setProteinLinkConfig={setProteinLinkConfig}
        nucleotideLinkConfig={nucleotideLinkConfig}
        setNucleotideLinkConfig={setNucleotideLinkConfig}
        treeXScale={treeXScale}
        setTreeXScale={setTreeXScale}
        viewerLegend={viewerLegend}
        setViewerLegend={setViewerLegend}
        styleConfig={styleConfig}
        setStyleConfig={setStyleConfig}
        phyloTreeViewerRef={phyloTreeViewerRef}
        geneMetadataColumns={geneMetadataColumnsState}
        treeMetadataColumns={treeMetadataColumnsState}
        domainMetadataColumns={domainMetadataColumnsState}
        setGeneMetadataColumns={setGeneMetadataColumns}
        setTreeMetadataColumns={setTreeMetadataColumns}
        setDomainMetadataColumns={setDomainMetadataColumns}
        selectedGene={selectedGene}
        handleTrackShiftMinus1kb={handleTrackShiftMinus1kb}
        handleTrackShiftPlus1kb={handleTrackShiftPlus1kb}
        handleTrackFlip={handleTrackFlip}
        handleArrowheadHeightChange={handleArrowheadHeightChange}
        handleGeneHeightChange={handleGeneHeightChange}
        showTreeLayer={showTreeLayer}
        setShowTreeLayer={setShowTreeLayer}
        showGeneLayer={showGeneLayer}
        setShowGeneLayer={setShowGeneLayer}
        showDomainLayer={showDomainLayer}
        setShowDomainLayer={setShowDomainLayer}
        showProteinLinkLayer={showProteinLinkLayer}
        setShowProteinLinkLayer={setShowProteinLinkLayer}
        showNucleotideLinkLayer={showNucleotideLinkLayer}
        setShowNucleotideLinkLayer={setShowNucleotideLinkLayer}
        showNcRNALayer={showNcRNALayer}
        setShowNcRNALayer={setShowNcRNALayer}
        showGeneTextLayer={showGeneTextLayer}
        setShowGeneTextLayer={setShowGeneTextLayer}
        showTreeTextLayer={showTreeTextLayer}
        setShowTreeTextLayer={setShowTreeTextLayer}
        hasGeneData={hasGeneData}
        hasDomainData={hasDomainData}
        hasProteinLinkData={hasProteinLinkData}
        hasNucleotideLinkData={hasNucleotideLinkData}
        hasNcRNAData={hasNcRNAData}
      />
      <SidebarInset>
        {/* Sidebar toggle button and SVG export button - always visible */}
        <div style={{ 
          position: 'absolute', 
          top: '10px', 
          left: '10px', 
          zIndex: 1000,
          background: 'transparent',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0)',
          display: 'flex',
          gap: '4px',
          padding: '4px'
        }}>
          <SidebarTrigger 
            className="size-7 flex items-center justify-center border"
            style={{ position: 'static' }} 
          />
          <SVGExportButton phyloTreeViewerRef={phyloTreeViewerRef} />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowDataTable((v) => !v)}
            aria-label={showDataTable ? 'Hide table view' : 'Show table view'}
            className="size-7 border bg-transparent"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
          <ThemeToggle />
        </div>
         <AppPhylo
           ultrametric={ultrametric}
           showConnectingLines={showConnectingLines}
           showScrollbar={showScrollbar}
           alignLabels={alignLabels}
           alignCluster={alignCluster}
           useDefaultGeneAlignment={useDefaultGeneAlignment}
           defaultAlign={defaultAlign}
           phyloLabelPosition={phyloLabelPosition}
           arrowheadHeightDisplay={arrowheadHeightDisplay}
           geneHeightDisplay={geneHeightDisplay}
           geneColorBy={geneColorBy}
           treeColorBy={treeColorBy}
           domainColorBy={domainColorBy}
           treeLabelBy={treeLabelBy}
           geneLabelBy={geneLabelBy}
           genePalette={genePalette}
           phyloPalette={phyloPalette}
           domainPalette={domainPalette}
          domainSource={domainSource}
          setDomainSource={setDomainSource}
           ncRNAPalette={ncRNAPalette}
           regionPalette={regionPalette}
           proteinLinkConfig={proteinLinkConfig}
           nucleotideLinkConfig={nucleotideLinkConfig}
           treeXScale={treeXScale}
           viewerLegend={viewerLegend}
           styleConfig={styleConfig}
           phyloTreeViewerRef={phyloTreeViewerRef}
           geneMetadataColumns={geneMetadataColumnsState}
           treeMetadataColumns={treeMetadataColumnsState}
           domainMetadataColumns={domainMetadataColumnsState}
           setGeneMetadataColumns={setGeneMetadataColumns}
           setTreeMetadataColumns={setTreeMetadataColumns}
           setDomainMetadataColumns={setDomainMetadataColumns}
           setSelectedGene={setSelectedGene}
           handleTrackShiftMinus1kb={handleTrackShiftMinus1kb}
           handleTrackShiftPlus1kb={handleTrackShiftPlus1kb}
           handleTrackFlip={handleTrackFlip}
           handleArrowheadHeightChange={handleArrowheadHeightChange}
           handleGeneHeightChange={handleGeneHeightChange}
           showTreeLayer={showTreeLayer}
           showGeneLayer={showGeneLayer}
           showDomainLayer={showDomainLayer}
           showProteinLinkLayer={showProteinLinkLayer}
           showNucleotideLinkLayer={showNucleotideLinkLayer}
           showNcRNALayer={showNcRNALayer}
           showGeneTextLayer={showGeneTextLayer}
           showTreeTextLayer={showTreeTextLayer}
           showDataTable={showDataTable}
          geneLabelPosition={geneLabelPosition}
           setHasGeneData={setHasGeneData}
           setHasDomainData={setHasDomainData}
           setHasProteinLinkData={setHasProteinLinkData}
           setHasNucleotideLinkData={setHasNucleotideLinkData}
           setHasNcRNAData={setHasNcRNAData}
         />
      </SidebarInset>
    </SidebarProvider>
  </ThemeProvider>
  );
}

export default App;
