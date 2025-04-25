import { useState, useEffect } from 'react'
import './App.css'
import PhyloTreeViewer from './components/PhyloTreeViewer';
import { parseGFF } from './utils/parseGFF';
import { parseLinks } from './utils/parseLinks';
import { parseNucleotideLinks } from './utils/parseNucleotideLinks';
import { parseDomains } from './utils/parseDomains';
import parseBaselines from './utils/parseBaselines';
import parseProteinMetadata from './utils/parseProteinMetadata';
import parseTreeMetadata from './utils/parseTreeMetadata';

import defaultNewick from './data/defaultNewick.txt?raw';
import defaultGFFStr from './data/defaultGFF.gff?raw';
import defaultProteinLinks from './data/defaultProteinLinks.txt?raw';
import defaultNucleotideLinks from './data/defaultNucleotideLinks.txt?raw';
import defaultDomains from './data/defaultDomains.txt?raw';
import defaultBaselines from './data/defaultBaselines.txt?raw';
import defaultProteinMetadata from './data/defaultProteinMetadata.txt?raw';
import defaultTreeMetadata from './data/defaultTreeMetadata.txt?raw';


function App() {
  const [newickStr, setNewickStr] = useState(defaultNewick);
  const [showScrollbar, setShowScrollbar] = useState(true);
  const [alignCluster, setAlignCluster] = useState(null); // Add this state
  const [treeLabelBy, setTreeLabelBy] = useState("leaf_id");
  const [treeColorBy, setTreeColorBy] = useState("species");

  // Extract columns from tree metadata header for dropdowns
  const treeMetadataColumns = defaultTreeMetadata.trim().split(/\r?\n/)[0].split(/\t/);

  const handleObjectClick = (object) => {
    // object contains all metadata, etc.
    console.log('Clicked object:', object);
    // You can store it in state if needed
  };

  // Parse all data up front
  const parsedGFF = parseGFF(defaultGFFStr);
  const parsedProteinLinks = parseLinks(defaultProteinLinks);
  const parsedNucleotideLinks = parseNucleotideLinks(defaultNucleotideLinks);
  const parsedDomains = parseDomains(defaultDomains);
  const parsedBaselines = parseBaselines(defaultBaselines);
  const parsedProteinMetadata = parseProteinMetadata(defaultProteinMetadata);
  const parsedTreeMetadata = parseTreeMetadata(defaultTreeMetadata);

  return (
    <div className="App" >
      <div style={{display: 'flex', gap: '1em', marginBottom: '1em'}}>
        <label>
          Tree leaf label:
          <select value={treeLabelBy} onChange={e => setTreeLabelBy(e.target.value)}>
            {treeMetadataColumns.map(col => <option key={col} value={col}>{col}</option>)}
          </select>
        </label>
        <label>
          Tree leaf color:
          <select value={treeColorBy} onChange={e => setTreeColorBy(e.target.value)}>
            {treeMetadataColumns.map(col => <option key={col} value={col}>{col}</option>)}
          </select>
        </label>
      </div>
      <PhyloTreeViewer
        newickStr={newickStr}
        gffFeatures={parsedGFF}
        proteinLinks={parsedProteinLinks}
        nucleotideLinks={parsedNucleotideLinks}
        domainsByGene={parsedDomains}
        baselines={parsedBaselines}
        showScrollbar={showScrollbar}
        alignCluster={alignCluster} // Pass the cluster
        defaultAlign='start'
        onObjectClick={handleObjectClick}
        showSVGWidget={true}
        proteinMetadata={parsedProteinMetadata}
        colorBy="cluster"
        labelBy="description"
        treeMetadata={parsedTreeMetadata}
        treeLabelBy={treeLabelBy}
        treeColorBy={treeColorBy}
        colorLeavesBy="species"
        labelLeavesBy="ecosystem"
      />
    </div>
  );
}

export default App
