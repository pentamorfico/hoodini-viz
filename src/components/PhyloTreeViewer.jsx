// PhyloTreeViewer.jsx
import React, { useEffect, useRef, useState } from 'react';
import PhyloTree from '../models/PhyloTree';
import GenomeView from '../models/GenomeView';
import { parseGFF } from '../utils/parseGFF';
import { parseLinks } from '../utils/parseLinks';
import { parseNucleotideLinks } from '../utils/parseNucleotideLinks';
import { parseDomains } from '../utils/parseDomains';
import { parseProteinClusters } from '../utils/parseProteinClusters';

// You will need to install deck.gl and polygon-clipping for this to work
import DeckGL from '@deck.gl/react';
import { LineLayer, PolygonLayer, PathLayer, TextLayer, ScatterplotLayer } from '@deck.gl/layers';
import {OrthographicView} from '@deck.gl/core';

const defaultNewick =
  "(((((B:0.1,A:0.2):0.3,(C:0.2,D:0.3):0.4):0.5,((E:0.2,F:0.1):0.3,(G:0.2,H:0.3):0.4):0.5):0.6,(I:0.5,J:0.4):0.7):0.5,((((K:0.1,L:0.2):0.2,(M:0.3,N:0.2):0.3):0.4,((O:0.4,P:0.5):0.3,(Q:0.2,R:0.1):0.2):0.5):0.6,((S:0.4,T:0.3):0.3):0.7):0.5);";
const defaultLeaves = [
  "A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T"
];

// Static mock GFF data
const defaultGFFStr = `
A	.	gene	350	1146	.	-	.	ID=gene_A_1
A	.	gene	1328	2594	.	+	.	ID=gene_A_2
A	.	gene	2771	4187	.	+	.	ID=gene_A_3
A	.	gene	4238	5376	.	+	.	ID=gene_A_4
A	.	gene	5534	6710	.	+	.	ID=gene_A_5
A	.	gene	6871	8083	.	+	.	ID=gene_A_6
A	.	gene	8198	9931	.	+	.	ID=gene_A_7
A	.	gene	10009	10760	.	+	.	ID=gene_A_8
B	.	gene	250	1065	.	+	.	ID=gene_B_1
B	.	gene	1231	2606	.	+	.	ID=gene_B_2
B	.	gene	2688	4142	.	+	.	ID=gene_B_3
B	.	gene	4237	5855	.	+	.	ID=gene_B_4
B	.	gene	5983	7657	.	+	.	ID=gene_B_5
C	.	gene	50	1561	.	+	.	ID=gene_C_1
C	.	gene	1685	2685	.	+	.	ID=gene_C_2
C	.	gene	2737	3409	.	+	.	ID=gene_C_3
C	.	gene	3526	5199	.	+	.	ID=gene_C_4
C	.	gene	5275	6155	.	+	.	ID=gene_C_5
C	.	gene	6220	7473	.	+	.	ID=gene_C_6
C	.	gene	7670	8513	.	+	.	ID=gene_C_7
C	.	gene	8675	9314	.	+	.	ID=gene_C_8
C	.	gene	9430	10557	.	+	.	ID=gene_C_9
C	.	gene	10728	11387	.	+	.	ID=gene_C_10
D	.	gene	50	1389	.	+	.	ID=gene_D_1
D	.	gene	1526	2855	.	+	.	ID=gene_D_2
D	.	gene	2997	4561	.	+	.	ID=gene_D_3
D	.	gene	4726	6217	.	+	.	ID=gene_D_4
D	.	gene	6353	7062	.	+	.	ID=gene_D_5
D	.	gene	7192	8165	.	+	.	ID=gene_D_6
D	.	gene	8347	9056	.	+	.	ID=gene_D_7
E	.	gene	50	1635	.	+	.	ID=gene_E_1
E	.	gene	1713	2326	.	+	.	ID=gene_E_2
E	.	gene	2469	3383	.	+	.	ID=gene_E_3
E	.	gene	3542	4220	.	+	.	ID=gene_E_4
E	.	gene	4415	5142	.	+	.	ID=gene_E_5
E	.	gene	5265	6534	.	+	.	ID=gene_E_6
E	.	gene	6677	8330	.	+	.	ID=gene_E_7
E	.	gene	8395	9786	.	+	.	ID=gene_E_8
E	.	gene	9924	10561	.	+	.	ID=gene_E_9
E	.	gene	10719	11402	.	+	.	ID=gene_E_10
F	.	gene	50	947	.	+	.	ID=gene_F_1
F	.	gene	1070	2638	.	+	.	ID=gene_F_2
F	.	gene	2761	4337	.	+	.	ID=gene_F_3
F	.	gene	4519	5250	.	+	.	ID=gene_F_4
G	.	gene	50	1824	.	+	.	ID=gene_G_1
G	.	gene	1884	3659	.	+	.	ID=gene_G_2
G	.	gene	3814	4612	.	+	.	ID=gene_G_3
G	.	gene	4687	5924	.	+	.	ID=gene_G_4
H	.	gene	50	851	.	+	.	ID=gene_H_1
H	.	gene	936	2464	.	+	.	ID=gene_H_2
H	.	gene	2617	4039	.	+	.	ID=gene_H_3
H	.	gene	4136	5098	.	+	.	ID=gene_H_4
H	.	gene	5231	6127	.	+	.	ID=gene_H_5
H	.	gene	6256	7289	.	+	.	ID=gene_H_6
H	.	gene	7367	8368	.	+	.	ID=gene_H_7
H	.	gene	8424	9241	.	+	.	ID=gene_H_8
H	.	gene	9429	11085	.	+	.	ID=gene_H_9
I	.	gene	50	1836	.	+	.	ID=gene_I_1
I	.	gene	2031	3583	.	+	.	ID=gene_I_2
I	.	gene	3700	4433	.	+	.	ID=gene_I_3
I	.	gene	4517	5424	.	+	.	ID=gene_I_4
I	.	gene	5582	7009	.	+	.	ID=gene_I_5
I	.	gene	7152	7794	.	+	.	ID=gene_I_6
I	.	gene	7906	8654	.	+	.	ID=gene_I_7
J	.	gene	50	1724	.	+	.	ID=gene_J_1
J	.	gene	1819	2727	.	+	.	ID=gene_J_2
J	.	gene	2819	4312	.	+	.	ID=gene_J_3
J	.	gene	4388	5374	.	+	.	ID=gene_J_4
K	.	gene	50	1725	.	+	.	ID=gene_K_1
K	.	gene	1903	2720	.	+	.	ID=gene_K_2
K	.	gene	2818	3730	.	+	.	ID=gene_K_3
K	.	gene	3804	4986	.	+	.	ID=gene_K_4
K	.	gene	5110	6846	.	+	.	ID=gene_K_5
K	.	gene	6948	7569	.	+	.	ID=gene_K_6
L	.	gene	50	1260	.	+	.	ID=gene_L_1
L	.	gene	1369	2318	.	+	.	ID=gene_L_2
L	.	gene	2419	3194	.	+	.	ID=gene_L_3
L	.	gene	3375	4106	.	+	.	ID=gene_L_4
L	.	gene	4262	5394	.	+	.	ID=gene_L_5
L	.	gene	5557	6271	.	+	.	ID=gene_L_6
L	.	gene	6416	7806	.	+	.	ID=gene_L_7
L	.	gene	7931	8926	.	+	.	ID=gene_L_8
M	.	gene	50	1224	.	+	.	ID=gene_M_1
M	.	gene	1321	2155	.	+	.	ID=gene_M_2
M	.	gene	2287	3036	.	+	.	ID=gene_M_3
M	.	gene	3194	4402	.	+	.	ID=gene_M_4
M	.	gene	4463	5551	.	+	.	ID=gene_M_5
M	.	gene	5669	6929	.	+	.	ID=gene_M_6
N	.	gene	50	683	.	+	.	ID=gene_N_1
N	.	gene	796	1922	.	+	.	ID=gene_N_2
N	.	gene	1972	2753	.	+	.	ID=gene_N_3
N	.	gene	2817	4053	.	+	.	ID=gene_N_4
N	.	gene	4166	5325	.	+	.	ID=gene_N_5
N	.	gene	5395	6655	.	+	.	ID=gene_N_6
N	.	gene	6742	8210	.	+	.	ID=gene_N_7
N	.	gene	8348	9081	.	+	.	ID=gene_N_8
O	.	gene	50	816	.	+	.	ID=gene_O_1
O	.	gene	926	1588	.	+	.	ID=gene_O_2
O	.	gene	1667	3293	.	+	.	ID=gene_O_3
O	.	gene	3429	4742	.	+	.	ID=gene_O_4
O	.	gene	4803	6048	.	+	.	ID=gene_O_5
O	.	gene	6220	7996	.	+	.	ID=gene_O_6
O	.	gene	8082	9755	.	+	.	ID=gene_O_7
P	.	gene	50	1206	.	+	.	ID=gene_P_1
P	.	gene	1395	2852	.	+	.	ID=gene_P_2
P	.	gene	2959	3967	.	+	.	ID=gene_P_3
P	.	gene	4033	5582	.	+	.	ID=gene_P_4
P	.	gene	5767	6823	.	+	.	ID=gene_P_5
Q	.	gene	50	1360	.	+	.	ID=gene_Q_1
Q	.	gene	1533	2306	.	+	.	ID=gene_Q_2
Q	.	gene	2491	4262	.	+	.	ID=gene_Q_3
Q	.	gene	4312	5351	.	+	.	ID=gene_Q_4
Q	.	gene	5539	6325	.	+	.	ID=gene_Q_5
R	.	gene	50	713	.	+	.	ID=gene_R_1
R	.	gene	779	2195	.	+	.	ID=gene_R_2
R	.	gene	2267	2928	.	+	.	ID=gene_R_3
R	.	gene	3021	4766	.	+	.	ID=gene_R_4
S	.	gene	50	1264	.	+	.	ID=gene_S_1
S	.	gene	1413	2772	.	+	.	ID=gene_S_2
S	.	gene	2967	4412	.	+	.	ID=gene_S_3
S	.	gene	4512	5262	.	+	.	ID=gene_S_4
S	.	gene	5410	6393	.	+	.	ID=gene_S_5
S	.	gene	6506	7738	.	+	.	ID=gene_S_6
T	.	gene	50	1012	.	+	.	ID=gene_T_1
T	.	gene	1145	2245	.	+	.	ID=gene_T_2
T	.	gene	2332	3472	.	+	.	ID=gene_T_3
T	.	gene	3549	4766	.	+	.	ID=gene_T_4
T	.	gene	4964	5736	.	+	.	ID=gene_T_5
T	.	gene	5914	7705	.	+	.	ID=gene_T_6
`;

const defaultProteinLinks = `
gene_A_10 gene_B_1 155,150,150,50
gene_C_2 gene_D_2 155,150,150,50
gene_B_2 gene_C_3 155,150,150,50
gene_D_1 gene_E_1 155,150,150,50
gene_F_1 gene_G_1 155,150,150,50
gene_H_3 gene_I_5 155,150,150,50
gene_J_1 gene_K_1 155,150,150,50
gene_L_1 gene_M_1 155,150,150,50
gene_N_1 gene_O_1 155,150,150,50
gene_P_1 gene_Q_1 155,150,150,50
gene_R_1 gene_S_1 155,150,150,50
`;

const defaultNucleotideLinks = `
A 2000 2700 B 2500 3200 150,50,50,150
C 4000 4500 D 4100 4600 150,50,50,150
F 1200 1800 G 1300 1900 150,50,50,150
`;

const defaultDomains = `
gene_A_1 DomainX 10 100 1e-5
gene_A_1 DomainY 120 200 2e-10
gene_B_2 DomainV 100 400 1e-6 
gene_C_2 DomainZ 210 300 1e-3
gene_C_2 DomainW 310 400 5e-4
`;

// Static mock protein cluster assignments
const defaultProteinClustersStr = `
gene_A_1 1
gene_A_2 2
gene_A_3 3
gene_A_4 4
gene_B_1 1
gene_B_2 2
gene_B_3 3
gene_B_4 4
gene_C_1 1
gene_C_2 2
gene_C_3 3
gene_C_4 4
gene_D_1 1
gene_D_2 2
gene_D_3 3
gene_D_4 4
gene_E_1 1
gene_E_2 2
gene_E_3 3
gene_E_4 4
gene_F_1 1
gene_F_2 2
gene_F_3 3
gene_F_4 4
gene_G_1 1
gene_G_2 2
gene_G_3 3
gene_G_4 4
gene_H_1 1
gene_H_2 2
gene_H_3 3
gene_H_4 4
gene_I_1 1
gene_I_2 2
gene_I_3 3
gene_I_4 4
gene_J_1 1
gene_J_2 2
gene_J_3 3
gene_J_4 4
gene_K_1 1
gene_K_2 2
gene_K_3 3
gene_K_4 4
gene_L_1 1
gene_L_2 2
gene_L_3 3
gene_L_4 4
gene_M_1 1
gene_M_2 2
gene_M_3 3
gene_M_4 4
gene_N_1 1
gene_N_2 2
gene_N_3 3
gene_N_4 4
gene_O_1 1
gene_O_2 2
gene_O_3 3
gene_O_4 4
gene_P_1 1
gene_P_2 2
gene_P_3 3
gene_P_4 4
gene_Q_1 1
gene_Q_2 2
gene_Q_3 3
gene_Q_4 4
gene_R_1 1
gene_R_2 2
gene_R_3 3
gene_R_4 4
gene_S_1 1
gene_S_2 2
gene_S_3 3
gene_S_4 4
gene_T_1 1
gene_T_2 2
gene_T_3 3
gene_T_4 4
`;

const defaultBaselinesStr = `
A 0 10760
B 0 7657
C 0 11387
D 0 9056
E 0 11402
F 0 5250
G 0 5924
H 0 11085
I 0 8654
J 0 5374
K 0 7569
L 0 8926
M 0 6929
N 0 9081
O 0 9755
P 0 6823
Q 0 6325
R 0 4766
S 0 7738
T 0 7705
`;

const PhyloTreeViewer = ({
  newickStr = defaultNewick,
  leaves = defaultLeaves,
  gffStr = defaultGFFStr, // Use static mock GFF data
  proteinLinksStr = defaultProteinLinks,
  nucleotideLinksStr = defaultNucleotideLinks,
  domainsStr = defaultDomains,
  proteinClustersStr = defaultProteinClustersStr, // Use static mock data by default
  baselinesStr = null // new prop, optional
}) => {
  // Visualization state
  const [tree, setTree] = useState(null);
  const [genomeView, setGenomeView] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const containerRef = React.useRef(null);
  const [viewState, setViewState] = React.useState(null);
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });
  // Allow external padding for tree offset
  const [treeLabelPadding, setTreeLabelPadding] = React.useState(160); // default 60px, can be changed externally

  // Setup tree and genomeView on mount or when data changes
  useEffect(() => {
    const tree = new PhyloTree(newickStr);
    tree.layout(leaves);
    // Compute maxY (horizontal axis for tree)
    const allYs = tree.allNodes ? tree.allNodes.map(n => n.y) : [];
    const treeMaxY = allYs.length ? Math.max(...allYs) : 0;
    tree._treeOffset = -treeMaxY - treeLabelPadding; // Add extra padding
    const gffFeatures = parseGFF(gffStr);
    const proteinConnections = parseLinks(proteinLinksStr);
    const nucleotideConnections = parseNucleotideLinks(nucleotideLinksStr);
    const domainsByGene = parseDomains(domainsStr);
    const genomeView = new GenomeView(leaves, tree);
    genomeView.addFeatures(gffFeatures);
    genomeView.initGenes();
    genomeView.computeTrackPositions();
    // Log gene polygons before adding domains
    genomeView.addDomains(domainsByGene);
    genomeView.addProteinLinks(proteinConnections);
    genomeView.addNucleotideLinks(nucleotideConnections);
    if (proteinClustersStr) {
      const clusterMap = parseProteinClusters(proteinClustersStr);
      genomeView.setProteinClusters(clusterMap);
    }
    // Attach baselines to nucleotides
    let baselines;
    if (defaultBaselinesStr) {
      baselines = defaultBaselinesStr.split('\n').map(l => l.trim()).filter(l => l).map(line => {
        const [seqid, start, end] = line.split(/\s+/);
        return { seqid, start: Number(start), end: Number(end) };
      });
      for (const b of baselines) {
        if (genomeView.nucleotidesBySeqid[b.seqid]) {
          // Set origStart/origEnd only once, at creation
          genomeView.nucleotidesBySeqid[b.seqid].baseline = {
            start: b.start,
            end: b.end,
            origStart: b.start,
            origEnd: b.end
          };
        }
      }
    } 

    setTree(tree);
    setGenomeView(genomeView);
    setSelectedNode(null);
    // LOG 2: After genomeView is set up
  }, [newickStr, leaves, gffStr, proteinLinksStr, nucleotideLinksStr, domainsStr, proteinClustersStr, treeLabelPadding, defaultBaselinesStr]);

  // Utility to compute bounding box from all polygons/paths
  function computeBounds(genomeView, tree) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
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
    // Tree paths: get maxX
    let treeMaxX = -Infinity;
    if (tree) tree.buildEdges().forEach(e => {
      e.path.forEach(([x, y]) => {
        treeMaxX = Math.max(treeMaxX, x);
      });
    });
    // Set geneOffset so that minX is at e.g. 100
    const geneOffset = isFinite(minX) ? (100 - minX) : 0;
    // Compute offset to align tree's maxX to gene minX (after geneOffset applied)
    const treeOffset = isFinite(treeMaxX) && isFinite(minX) ? (100 - treeMaxX) : 0;
    // Fallback
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      minX = 0; minY = 0; maxX = 1000; maxY = 1000;
    }
    return { minX, minY, maxX, maxY, treeOffset, geneOffset };
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
      treeOffset: 0,
      geneOffset: 0
    });
  }, [genomeView, tree, containerSize]);

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

  // UI: Flip buttons for each genome track
  const handleFlip = (seqid) => {
    if (genomeView) {
      genomeView.flipTrack(seqid);
      // Only force re-render, do not call updatePolygon again (already handled in flipTrack)
      setGenomeView(Object.assign(Object.create(Object.getPrototypeOf(genomeView)), genomeView));
    }
  };

  const layers = React.useMemo(() => {
    if (!genomeView || !tree) return [];
    // Use tree._treeOffset (which includes treeLabelPadding) for all tree-related X shifts
    const treeOffset = tree._treeOffset || 0;
    const bounds = computeBounds(genomeView, tree);
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

  // Only render DeckGL when viewState and containerSize are valid
  if (
    !viewState ||
    !Array.isArray(viewState.target) ||
    viewState.target.some(v => !isFinite(v)) ||
    !isFinite(viewState.zoom) ||
    !containerSize.width ||
    !containerSize.height
  ) {
    return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
  }

  return (
    <div id="phylo-tree-viewer-container" ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 10,
        background: 'rgba(255,255,255,0.85)',
        padding: 6,
        borderRadius: 4,
        margin: 8,
        display: 'inline-block',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <b>Flip/Shift D track:</b>{' '}
        {genomeView && genomeView.leaves.filter(seqid => seqid === 'A').map(seqid => (
          <span key={seqid} style={{marginRight: 8}}>
            <button onClick={() => handleFlip(seqid)} style={{marginRight: 4}}>
              {genomeView.trackFlipped[seqid] ? `Unflip ${seqid}` : `Flip ${seqid}`}
            </button>
            <button onClick={() => {
              const flipped = genomeView.trackFlipped[seqid];
              const delta = flipped ? -1000 : 1000;
              genomeView.shiftTrack(seqid, delta);
              genomeView.computeTrackPositions();
              setGenomeView(Object.assign(Object.create(Object.getPrototypeOf(genomeView)), genomeView));
            }} style={{marginRight: 4}}>
              Shift {seqid} +1kb
            </button>
            <button onClick={() => {
              const flipped = genomeView.trackFlipped[seqid];
              const delta = flipped ? 1000 : -1000;
              genomeView.shiftTrack(seqid, delta);
              genomeView.computeTrackPositions();
              setGenomeView(Object.assign(Object.create(Object.getPrototypeOf(genomeView)), genomeView));
            }}>
              Shift {seqid} -1kb
            </button>
          </span>
        ))}
      </div>
      <DeckGL
        views={[new OrthographicView({ flipY: true })]}
        controller={true}
        viewState={viewState}
        layers={layers}
        style={{ width: '100%', height: '100%' }}
        onViewStateChange={({viewState: vs}) => setViewState(prev => prev ? { ...prev, target: vs.target, zoom: vs.zoom } : prev)}
        getTooltip={getTooltip}
      />
    </div>
  );
};

export default PhyloTreeViewer;
