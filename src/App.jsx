import { useState, useEffect } from 'react'
import './App.css'
import PhyloTreeViewer from './components/PhyloTreeViewer';
import { parseGFF } from './utils/parseGFF';
import { parseLinks } from './utils/parseLinks';
import { parseNucleotideLinks } from './utils/parseNucleotideLinks';
import { parseDomains } from './utils/parseDomains';
import { parseProteinClusters } from './utils/parseProteinClusters';
import parseBaselines from './utils/parseBaselines';

import defaultNewick from './data/defaultNewick.txt?raw';
import defaultGFFStr from './data/defaultGFF.gff?raw';
import defaultProteinLinks from './data/defaultProteinLinks.txt?raw';
import defaultNucleotideLinks from './data/defaultNucleotideLinks.txt?raw';
import defaultDomains from './data/defaultDomains.txt?raw';
import defaultProteinClusters from './data/defaultProteinClusters.txt?raw';
import defaultBaselines from './data/defaultBaselines.txt?raw';

function App() {
  const [newickStr, setNewickStr] = useState(defaultNewick);
  const [showScrollbar, setShowScrollbar] = useState(true);
  const [alignCluster, setAlignCluster] = useState(null); // Add this state

  // Parse all data up front
  const parsedGFF = parseGFF(defaultGFFStr);
  const parsedProteinLinks = parseLinks(defaultProteinLinks);
  const parsedNucleotideLinks = parseNucleotideLinks(defaultNucleotideLinks);
  const parsedDomains = parseDomains(defaultDomains);
  const parsedProteinClusters = parseProteinClusters(defaultProteinClusters);
  const parsedBaselines = parseBaselines(defaultBaselines);

  return (
    <div className="App" >
      <div style={{margin: '1em'}}>
        <button onClick={() => setAlignCluster(3)}>
          Align all genes in cluster 3
        </button>
      </div>
      <button onClick={() => setShowScrollbar(s => !s)}>
        {showScrollbar ? 'Hide' : 'Show'} Scrollbar
      </button>
      <PhyloTreeViewer
        newickStr={newickStr}
        gffFeatures={parsedGFF}
        proteinLinks={parsedProteinLinks}
        nucleotideLinks={parsedNucleotideLinks}
        domainsByGene={parsedDomains}
        proteinClusters={parsedProteinClusters}
        baselines={parsedBaselines}
        showScrollbar={showScrollbar}
        alignCluster={alignCluster} // Pass the cluster
        defaultAlign='start'
        
      />
    </div>
  );
}

export default App
