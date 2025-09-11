import { useState, useRef, useEffect } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { DataTable } from '@/components/data-table';
import { SectionCards } from '@/components/section-cards';
import { SiteHeader } from '@/components/site-header';
import { SVGExportButton } from '@/components/svg-export-button';
import ThemeToggle from '@/components/ThemeToggle.jsx';
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
  const [domainColorBy, setDomainColorBy] = useState('domainName');
  const [geneColorBy, setGeneColorBy] = useState('cluster');
  const [treeColorBy, setTreeColorBy] = useState('species');
  const [treeLabelBy, setTreeLabelBy] = useState('species');
  const [geneLabelBy, setGeneLabelBy] = useState('cluster');
  const [genePalette, setGenePalette] = useState({ type: 'qualitative', name: 'Set2', numColors: 8, reverse: false, enabled: true });
  const [phyloPalette, setPhyloPalette] = useState({ type: 'qualitative', name: 'Set2', numColors: 8, reverse: false, enabled: true });
  const [domainPalette, setDomainPalette] = useState({ type: 'qualitative', name: 'Set2', numColors: 8, reverse: false, enabled: true });
  const [ncRNAPalette, setNcRNAPalette] = useState({ type: 'qualitative', name: 'Set3', numColors: 8, reverse: false, enabled: true });
  const [regionPalette, setRegionPalette] = useState({ type: 'qualitative', name: 'Dark2', numColors: 8, reverse: false, enabled: true });
  const [proteinLinkConfig, setProteinLinkConfig] = useState(null);
  const [nucleotideLinkConfig, setNucleotideLinkConfig] = useState(null);
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