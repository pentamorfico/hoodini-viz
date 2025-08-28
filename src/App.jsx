import React, { useState, useEffect, useRef } from 'react'
import './App.css'
import PhyloTreeViewer from './components/PhyloTreeViewer';
import ThemeToggle from './components/ThemeToggle';
import ColorPaletteWidget from './widgets/ColorPaletteWidget';
import { ThemeProvider, useTheme } from './contexts/ThemeContext.jsx';
import { parseGFF } from './utils/parseGFF';
import { parseLinks } from './utils/parseLinks';
import { parseNucleotideLinks } from './utils/parseNucleotideLinks';
import { parseDomains } from './utils/parseDomains';
import parseBaselines from './utils/parseBaselines';
import parseProteinMetadata from './utils/parseProteinMetadata';
import parseTreeMetadata from './utils/parseTreeMetadata';
import { 
  parseProteinMetadataOptimized, 
  parseTreeMetadataOptimized, 
  parseGFFOptimized,
  parseProteinLinksOptimized,
  parseNucleotideLinksOptimized,
  parseDomainsOptimized,
  parseBaselinesOptimized,
  parseNonCodingMetadataOptimized
} from './utils/loadersGLUtils';
import { DEFAULT_CONFIG } from './config/visualizationConfig';

import defaultNewick from './data/defaultNewick.txt?raw';
import defaultGFFStr from './data/defaultGFF.gff?raw';
import defaultProteinLinks from './data/defaultProteinLinks.txt?raw';
import defaultNucleotideLinks from './data/defaultNucleotideLinks.txt?raw';
import defaultDomains from './data/defaultDomains.txt?raw';
import defaultBaselines from './data/defaultBaselines.txt?raw';
import defaultProteinMetadata from './data/defaultProteinMetadata.txt?raw';
import defaultTreeMetadata from './data/defaultTreeMetadata.txt?raw';
import defaultNonCodingMetadata from './data/defaultNonCodingMetadata.txt?raw';


function App() {
  const [newickStr, setNewickStr] = useState(defaultNewick);
  const [showScrollbar, setShowScrollbar] = useState(true);
  const [alignCluster, setAlignCluster] = useState(null); // Set to null by default - no cluster alignment
  const [useDefaultGeneAlignment, setUseDefaultGeneAlignment] = useState(true); // Enable default gene alignment by default
  const [showRuler, setShowRuler] = useState(true); // New state to control ruler visibility
  const [treeLabelBy, setTreeLabelBy] = useState("species");
  const [treeColorBy, setTreeColorBy] = useState("species");
  const [ultrametric, setUltrametric] = useState(false); // New state to control ultrametric tree conversion
  const [showConnectingLines, setShowConnectingLines] = useState(true); // New state to control connecting lines
  const [defaultAlign, setDefaultAlign] = useState('start'); // Add state for default alignment
  const [phyloLabelPosition, setPhyloLabelPosition] = useState('after-tree'); // New state to control phylo label positioning
  const [alignLabels, setAlignLabels] = useState(true); // New state to control phylo label alignment
  const [arrowheadHeight, setArrowheadHeight] = useState(0); // New state to control gene arrowhead height
  const [geneHeight, setGeneHeight] = useState(60); // New state to control gene height
  
  // Gene and domain selection states
  const [geneColorBy, setGeneColorBy] = useState('cluster'); // Gene coloring field selection
  const [geneLabelBy, setGeneLabelBy] = useState('cluster'); // Gene labeling field selection
  const [domainColorBy, setDomainColorBy] = useState('domainName'); // Domain coloring field selection
  
  // Color palette states - configured for Set2 palette
  const [genePalette, setGenePalette] = useState({
    type: 'qualitative',
    name: 'Set2',
    numColors: 8,
    reverse: false,
    enabled: true
  });
  const [domainPalette, setDomainPalette] = useState({
    type: 'qualitative', 
    name: 'Set2',
    numColors: 8,
    reverse: false,
    enabled: true
  });
  const [phyloPalette, setPhyloPalette] = useState({
    type: 'qualitative',
    name: 'Set2', 
    numColors: 8,
    reverse: false,
    enabled: true
  });
  
  // ncRNA Palette state  
  const [ncRNAPalette, setNcRNAPalette] = useState({
    type: 'qualitative',
    name: 'Set3',
    numColors: 8,
    reverse: false,
    enabled: true
  });
  
  // Handler for domain palette changes that updates enabled state
  const handleDomainPaletteChange = (newPalette) => {
    setDomainPalette(newPalette);
  };
  
  // Reference to the PhyloTreeViewer to access genomeView for track manipulation
  const phyloTreeViewerRef = useRef(null);

  // Always use DEFAULT_CONFIG directly, but merge with dynamic settings
  // Split config into core (affects data processing) and style (affects rendering only)
  const coreConfig = React.useMemo(() => ({
    ...DEFAULT_CONFIG
  }), []);

  const styleConfig = React.useMemo(() => {
    return {
      ...coreConfig,
      gene: {
        ...coreConfig.gene,
        arrowheadHeight: arrowheadHeight,
        height: geneHeight
      },
      colorPalettes: {
        genePalette,
        domainPalette,
        phyloPalette,
        ncRNAPalette
      }
    };
  }, [coreConfig, arrowheadHeight, geneHeight, genePalette, domainPalette, phyloPalette, ncRNAPalette]);

  // Extract columns from tree metadata header for dropdowns
  const treeMetadataColumns = defaultTreeMetadata.trim().split(/\r?\n/)[0].split(/\t/);
  
  // Extract gene metadata columns for dropdowns (from protein metadata)
  const geneMetadataColumns = React.useMemo(() => {
    const headerLine = defaultProteinMetadata.trim().split(/\r?\n/)[0];
    return headerLine.split(/\t/).filter(col => col !== 'gene_id'); // Exclude gene_id from options
  }, []);

  const handleObjectClick = (object) => {
    // object contains all metadata, etc.
    console.log('Clicked object:', object);
    // You can store it in state if needed
  };

  // Track manipulation functions
  const handleTrackShiftPlus1kb = (hoodId) => {
    if (phyloTreeViewerRef.current && phyloTreeViewerRef.current.genomeView) {
      phyloTreeViewerRef.current.genomeView.shiftTrackPlus1kb(hoodId);
      phyloTreeViewerRef.current.forceManualUpdate();
    }
  };
  const handleTrackShiftMinus1kb = (hoodId) => {
    if (phyloTreeViewerRef.current && phyloTreeViewerRef.current.genomeView) {
      phyloTreeViewerRef.current.genomeView.shiftTrackMinus1kb(hoodId);
      phyloTreeViewerRef.current.forceManualUpdate();
    }
  };
  const handleTrackFlip = (hoodId) => {
    if (phyloTreeViewerRef.current && phyloTreeViewerRef.current.genomeView) {
      phyloTreeViewerRef.current.genomeView.flipTrackToggle(hoodId);
      phyloTreeViewerRef.current.forceManualUpdate();
    }
  };

  // Parse all data up front - memoize to prevent recreation on every render
  // Use optimized loaders.gl parsing for ALL TSV/CSV files
  
  // Store all parsed data in state with loading indicator
  const [parsedGFF, setParsedGFF] = React.useState([]);
  const [parsedProteinLinks, setParsedProteinLinks] = React.useState([]);
  const [parsedNucleotideLinks, setParsedNucleotideLinks] = React.useState([]);
  const [parsedDomains, setParsedDomains] = React.useState({});
  const [parsedBaselines, setParsedBaselines] = React.useState([]);
  const [parsedProteinMetadata, setParsedProteinMetadata] = React.useState({});
  const [parsedTreeMetadata, setParsedTreeMetadata] = React.useState({});
  const [parsedNonCodingMetadata, setParsedNonCodingMetadata] = React.useState({});
  const [dataLoading, setDataLoading] = React.useState(true);
  
  React.useEffect(() => {
    const loadData = async () => {
      setDataLoading(true);

      
      try {
        // Load all files in parallel for maximum performance

        
        const [gff, proteinLinks, nucleotideLinks, domains, baselines, proteinMeta, treeMeta, nonCodingMeta] = await Promise.all([
          parseGFFOptimized(defaultGFFStr),
          parseProteinLinksOptimized(defaultProteinLinks),
          parseNucleotideLinksOptimized(defaultNucleotideLinks),
          parseDomainsOptimized(defaultDomains),
          parseBaselinesOptimized(defaultBaselines),
          parseProteinMetadataOptimized(defaultProteinMetadata),
          parseTreeMetadataOptimized(defaultTreeMetadata),
          parseNonCodingMetadataOptimized(defaultNonCodingMetadata || '')
        ]);
        

        
        setParsedGFF(gff);
        setParsedProteinLinks(proteinLinks);
        setParsedNucleotideLinks(nucleotideLinks);
        setParsedDomains(domains);
        setParsedBaselines(baselines);
        setParsedProteinMetadata(proteinMeta);
        setParsedTreeMetadata(treeMeta);
        setParsedNonCodingMetadata(nonCodingMeta);
        
       
        // Add a slight delay to measure the render trigger timing
        setTimeout(() => {
        }, 0);
        
      } catch (error) {
        console.error('❌ Data loading failed:', error);
        // Fallback to synchronous parsing
        setParsedGFF(parseGFF(defaultGFFStr));
        setParsedProteinLinks(parseLinks(defaultProteinLinks));
        setParsedNucleotideLinks(parseNucleotideLinks(defaultNucleotideLinks));
        setParsedDomains(parseDomains(defaultDomains));
        setParsedBaselines(parseBaselines(defaultBaselines));
        setParsedProteinMetadata(parseProteinMetadata(defaultProteinMetadata));
        setParsedTreeMetadata(parseTreeMetadata(defaultTreeMetadata));
        setParsedNonCodingMetadata({}); // Default empty
      } finally {
        setDataLoading(false);
      }
    };
    
    loadData();
  }, []);

  return (
    <div className="App" >
      {/* Loading indicator */}
      {dataLoading && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          background: 'rgba(255,255,255,0.9)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 10000,
          fontSize: '18px',
          color: '#666'
        }}>
          <div>
            <div>🚀 Loading all data with optimized loaders.gl parsers...</div>
            <div style={{ fontSize: '14px', marginTop: '10px', opacity: 0.7 }}>
              Processing GFF (764KB), protein metadata (554KB), and all other TSV/CSV files in parallel
            </div>
          </div>
        </div>
      )}
      
      
      
      {/* Only render PhyloTreeViewer when data is loaded */}
      {!dataLoading && (
        <PhyloTreeViewer
          ref={phyloTreeViewerRef}
          newickStr={newickStr}
          gffFeatures={parsedGFF}
          proteinLinks={parsedProteinLinks}
          nucleotideLinks={parsedNucleotideLinks}
          domainsByGene={parsedDomains}
          baselines={parsedBaselines}
          showScrollbar={showScrollbar}
          alignCluster={alignCluster}
          defaultAlign={defaultAlign}
          useDefaultGeneAlignment={useDefaultGeneAlignment}
          showRuler={showRuler}
          onObjectClick={handleObjectClick}
          showSVGWidget={true}
          proteinMetadata={parsedProteinMetadata}
          colorBy={geneColorBy}
          labelBy={geneLabelBy}
          domainColorBy={domainColorBy}
          treeMetadata={parsedTreeMetadata}
          treeLabelBy={treeLabelBy}
          treeColorBy={treeColorBy}
          config={styleConfig}
          ultrametric={ultrametric}
        showConnectingLines={showConnectingLines}
        phyloLabelPosition={phyloLabelPosition}
        alignLabels={alignLabels}
        genePalette={genePalette}
        domainPalette={domainPalette}
        phyloPalette={phyloPalette}
        ncRNAPalette={ncRNAPalette}
        styleConfig={styleConfig}
      />
      )}
      <ThemeToggle />
    </div>
  );
}

// Wrapper component with ThemeProvider
function AppWithTheme() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

export default AppWithTheme;
