import Gene from './Gene';
import Domain from './Domain';
import ProteinLink from './ProteinLink';
import NucleotideLink from './NucleotideLink';
import Nucleotide from './Nucleotide';

class GenomeView {
  constructor(leaves, tree) {
    this.leaves = leaves;
    this.tree = tree;
    this.featuresBySeqid = {};
    this.genesById = {};
    this.globalMin = Infinity;
    this.globalMax = -Infinity;
    this.proteinLinks = [];
    this.nucleotideLinks = [];
    this.domainsByGene = {};
    this.GENE_HEIGHT = 100;
    this.trackFlipped = {}; // Track flip state per seqid
    this.trackOffset = {};  // Track offset per seqid
    this.nucleotidesBySeqid = {}; // New: map of seqid -> Nucleotide
  }

  addFeatures(gffFeatures) {
    for (let f of gffFeatures) {
      if (!this.featuresBySeqid[f.seqid]) {
        this.featuresBySeqid[f.seqid] = [];
        // Store original minStart/maxEnd for robust shifting/flipping
        this.featuresBySeqid[f.seqid].origMinStart = f.start;
        this.featuresBySeqid[f.seqid].origMaxEnd = f.end;
      } else {
        if (f.start < this.featuresBySeqid[f.seqid].origMinStart) {
          this.featuresBySeqid[f.seqid].origMinStart = f.start;
        }
        if (f.end > this.featuresBySeqid[f.seqid].origMaxEnd) {
          this.featuresBySeqid[f.seqid].origMaxEnd = f.end;
        }
      }
      this.featuresBySeqid[f.seqid].push(f);
      // If this is the first feature for this seqid, create a Nucleotide
      if (!this.nucleotidesBySeqid[f.seqid]) {
        // Find all features for this seqid to determine region bounds
        const feats = this.featuresBySeqid[f.seqid];
        const minStart = Math.min(...feats.map(ff => ff.start));
        const maxEnd = Math.max(...feats.map(ff => ff.end));
        // Use strand of first gene or default '+'
        const strand = (feats.find(ff => ff.type === 'gene')?.strand) || '+';
        this.nucleotidesBySeqid[f.seqid] = new Nucleotide(f.seqid, minStart, maxEnd, strand);
      }
    }
  }

  initGenes() {
    for (let seqid of this.leaves) {
      const feats = this.featuresBySeqid[seqid] || [];
      for (let f of feats) {
        if (f.type === 'gene') {
          let g = new Gene(f.seqid, f.start, f.end, f.strand, f.attributes);
          this.genesById[this.getGeneIdFromAttributes(g.attributes)] = g;
          // Add gene to corresponding Nucleotide
          if (this.nucleotidesBySeqid[seqid]) {
            this.nucleotidesBySeqid[seqid].addGene(g);
          }
        }
      }
    }
  }

  getGeneIdFromAttributes(attrs) {
    const match = attrs.match(/ID=([^;]+)/);
    return match ? match[1] : null;
  }

  // General flip function: flip x around anchor
  static flipCoordinate(x, anchor) {
    return 2 * anchor - x;
  }

  // Unified transformation: always apply offset first, then flip if needed, using anchor
  static getTransformedXUnified(x, anchor, offset, flipped) {
    let shifted = x + offset;
    if (flipped) {
      return GenomeView.flipCoordinate(shifted, anchor);
    }
    return shifted;
  }

  computeTrackPositions() {
    for (let seqid of this.leaves) {
      const leafNode = this.tree.leafNodes.find(d => d.name === seqid);
      if (!leafNode) continue;
      const trackY = leafNode.x;
      const feats = this.featuresBySeqid[seqid] || [];
      // Always use the current baseline center as anchor for flipping, but do not mutate offset or baseline
      let anchor;
      const nuc = this.nucleotidesBySeqid[seqid];
      const offset = this.trackOffset[seqid] || 0;
      if (nuc && nuc.baseline) {
        // Compute anchor from original baseline + offset (not from already-flipped baseline)
        anchor = ((nuc.baseline.origStart + offset) + (nuc.baseline.origEnd + offset)) / 2;
      } else {
        anchor = ((this.featuresBySeqid[seqid].origMinStart + offset) + (this.featuresBySeqid[seqid].origMaxEnd + offset)) / 2;
      }
      const flipped = !!this.trackFlipped[seqid];
      for (let f of feats) {
        if (f.type === 'gene') {
          const gid = this.getGeneIdFromAttributes(f.attributes);
          const g = this.genesById[gid];
          if (g) {
            g.trackY = trackY;
            g.geneHeight = this.GENE_HEIGHT;
            g.start = GenomeView.getTransformedXUnified(g.origStart, anchor, offset, flipped);
            g.end = GenomeView.getTransformedXUnified(g.origEnd, anchor, offset, flipped);
            g.strand = flipped ? (g.origStrand === '+' ? '-' : '+') : g.origStrand;
            for (let d of g.domains) {
              d.start = d.origStart;
              d.end = d.origEnd;
            }
            g.updatePolygon();
          }
        }
      }
      // Baseline
      if (nuc && nuc.baseline) {
        nuc.baseline.start = GenomeView.getTransformedXUnified(nuc.baseline.origStart, anchor, offset, flipped);
        nuc.baseline.end = GenomeView.getTransformedXUnified(nuc.baseline.origEnd, anchor, offset, flipped);
      }
    }
    this.updateLinkPositions();
  }

  updateLinkPositions() {
    // Nucleotide links
    for (let l of this.nucleotideLinks) {
      // No mutation needed, handled at render time
      l.startA = l.origStartA;
      l.endA = l.origEndA;
      l.startB = l.origStartB;
      l.endB = l.origEndB;
    }
    // Protein links: nothing to update, they use gene objects
  }

  addDomains(domainsByGene) {
    this.domainsByGene = domainsByGene;
    for (let gId in domainsByGene) {
      let g = this.genesById[gId];
      if (!g) {
        console.warn(`Gene not found for domain: ${gId}`);
        continue;
      }
      for (let d of domainsByGene[gId]) {
        let dom = new Domain(gId, d.domainName, d.start, d.end, d.evalue);
        g.addDomain(dom);
      }
    }
  }

  addProteinLinks(links) {
    this.proteinLinks = links.map(l => new ProteinLink(l[0], l[1], l[2]));
  }

  addNucleotideLinks(links) {
    this.nucleotideLinks = links.map(l =>
      new NucleotideLink(l.seqidA, l.startA, l.endA, l.seqidB, l.startB, l.endB, l.color)
    );
  }

  getTrackY(seqid) {
    const ln = this.tree.leafNodes.find(d => d.name === seqid);
    return ln ? ln.x : null;
  }

  filterBySelectedNode(selectedNode) {
    if (!selectedNode) return {
      genes: Object.values(this.genesById),
      proteinPolygons: this.getProteinPolygons(),
      nucleotidePolygons: this.getNucleotidePolygons(),
      domains: this.getAllDomains()
    };
    const leavesSet = new Set(this.getNodeDescendantLeaves(selectedNode));
    const filteredGenes = Object.values(this.genesById).filter(g => leavesSet.has(g.seqid));
    const filteredProtein = this.getProteinPolygons().filter(p => p.seqids.every(s => leavesSet.has(s)));
    const filteredNucleotide = this.getNucleotidePolygons().filter(p => p.seqids.every(s => leavesSet.has(s)));
    const filteredDomains = this.getAllDomains().filter(d => leavesSet.has(this.genesById[d.geneId].seqid));
    return { genes: filteredGenes, proteinPolygons: filteredProtein, nucleotidePolygons: filteredNucleotide, domains: filteredDomains };
  }

  getProteinPolygons() {
    let polys = [];
    for (let pl of this.proteinLinks) {
      const gA = this.genesById[pl.gAId];
      const gB = this.genesById[pl.gBId];
      if (!gA || !gB) continue;
      // gA and gB are already flipped if needed by computeTrackPositions
      const poly = pl.buildPolygon(gA, gB);
      if (poly) polys.push({
        polygon: poly,
        fillColor: pl.color,
        metadata: pl.metadata // Attach metadata for tooltip
      });
    }
    return polys;
  }

  getNucleotidePolygons() {
    // For each track, use baseline middle as anchor if available, else fallback to original min/max midpoint
    const trackInfo = {};
    for (let seqid of this.leaves) {
      const feats = this.featuresBySeqid[seqid] || [];
      if (feats.length === 0) continue;
      let anchor;
      const nuc = this.nucleotidesBySeqid[seqid];
      if (nuc && nuc.baseline) {
        anchor = (nuc.baseline.start + nuc.baseline.end) / 2;
      } else {
        anchor = (this.featuresBySeqid[seqid].origMinStart + this.featuresBySeqid[seqid].origMaxEnd) / 2;
      }
      const flipped = !!this.trackFlipped[seqid];
      const offset = this.trackOffset[seqid] || 0;
      trackInfo[seqid] = { anchor, flipped, offset };
    }
    let polys = [];
    for (let l of this.nucleotideLinks) {
      const trackYA = this.getTrackY(l.seqidA);
      const trackYB = this.getTrackY(l.seqidB);
      if (trackYA == null || trackYB == null) continue;
      const infoA = trackInfo[l.seqidA];
      const infoB = trackInfo[l.seqidB];
      if (!infoA || !infoB) continue;
      const xA1 = GenomeView.getTransformedXUnified(l.origStartA, infoA.anchor, infoA.offset, infoA.flipped);
      const xA2 = GenomeView.getTransformedXUnified(l.origEndA, infoA.anchor, infoA.offset, infoA.flipped);
      const xB1 = GenomeView.getTransformedXUnified(l.origStartB, infoB.anchor, infoB.offset, infoB.flipped);
      const xB2 = GenomeView.getTransformedXUnified(l.origEndB, infoB.anchor, infoB.offset, infoB.flipped);
      const poly = l.buildPolygonFromCoords(xA1, xA2, xB1, xB2, trackYA, trackYB);
      polys.push({
        polygon: poly,
        fillColor: l.color,
        metadata: l.metadata // Attach metadata for tooltip
      });
    }
    return polys;
  }

  getAllDomains() {
    let alld = [];
    for (let gId in this.genesById) {
      const g = this.genesById[gId];
      for (let d of g.domains) {
        let poly = d.polygon;
        if (Array.isArray(poly) && poly.length === 1 && Array.isArray(poly[0])) {
          poly = poly[0]; // Unwrap extra array layer
        }
        if (isValidPolygon(poly)) {
          alld.push({
            polygon: poly,
            fillColor: d.fillColor,
            metadata: d.metadata // Attach metadata for tooltip
          });
        }
      }
    }
    return alld;
  }

  getNodeDescendantLeaves(node) {
    if (!node) return [];
    function getLeafNames(n) {
      if (n.branchset.length === 0 && n.name) return [n.name];
      return n.branchset.flatMap(getLeafNames);
    }
    return getLeafNames(node);
  }

  buildScaleBar() {
    const SCALE_Y = (this.tree.leafNodes[this.tree.leafNodes.length - 1].x) + 150;
    return [[{ path: [[this.globalMin, SCALE_Y], [this.globalMax, SCALE_Y]], color: [0, 0, 0, 255] }], SCALE_Y];
  }

  buildPhyloLabels() {
    return this.tree.leafNodes.map(l => {
      return {
        position: [l.y + 10, l.x],
        text: l.name,
        color: [0, 0, 0, 255],
        size: 14,
        textAnchor: 'start'
      };
    });
  }

  buildNodePoints(selectedNode) {
    const highlightLeaves = selectedNode ? new Set(this.getNodeDescendantLeaves(selectedNode)) : null;
    return this.tree.allNodes.map(n => {
      const nodeLeaves = this.getNodeDescendantLeaves(n);
      const isDesc = !selectedNode || nodeLeaves.some(l => highlightLeaves.has(l));
      const baseColor = n.branchset.length > 0 ? [0, 0, 0, 255] : [100, 100, 100, 255];
      const color = selectedNode ? (isDesc ? baseColor : this.fadeColor(baseColor, 0.1)) : baseColor;
      return {
        id: n.id,
        node: n,
        position: [n.y, n.x],
        color: color,
        radius: n.branchset.length > 0 ? 10 : 22,
        metadata: n.metadata || { name: n.name, id: n.id } // Attach metadata for tooltip
      };
    });
  }

  // Add metadata to tree path segments for tooltips
  buildEdgesWithMetadata() {
    return this.tree.buildEdges().map(e => ({
      ...e,
      metadata: {
        source: e.source?.name,
        target: e.target?.name,
        branchLength: e.source?.branchLength,
        id: e.source?.id
      }
    }));
  }

  fadeColor(color, factor) {
    return [color[0], color[1], color[2], Math.floor(color[3] * factor)];
  }

  setProteinClusters(clusterMap) {
    this.proteinClusters = clusterMap;
    // Assign a color to each cluster
    this.clusterColors = {};
    const clusterIds = Array.from(new Set(Object.values(clusterMap)));
    clusterIds.forEach((cluster, i) => {
      // Use HSL for visually distinct colors
      const color = hslToRgb(i / clusterIds.length, 0.6, 0.5).concat(255);
      this.clusterColors[cluster] = color;
    });
    // Update gene colors
    for (const geneId in this.genesById) {
      const gene = this.genesById[geneId];
      const cluster = clusterMap[geneId];
      if (cluster && this.clusterColors[cluster]) {
        gene.fillColor = this.clusterColors[cluster];
      } else {
        gene.fillColor = [211,211,211,255]; // Light gray if no cluster
      }
    }
  }

  toggleTrackFlip(seqid) {
    this.trackFlipped[seqid] = !this.trackFlipped[seqid];
  }

  flipTrack(seqid) {
    // Only update the flip state; do not mutate any feature data
    this.trackFlipped[seqid] = !this.trackFlipped[seqid];
    // After flipping, recompute all positions from original values
    this.computeTrackPositions();
  }

  shiftTrack(seqid, delta) {
    // Shift the track offset by delta (e.g., +1000 for +1kb)
    if (!this.trackOffset[seqid]) this.trackOffset[seqid] = 0;
    // change the sign of delta if the track is flipped
    if (this.trackFlipped[seqid]) {
      delta = -delta;
    }
    this.trackOffset[seqid] += delta;
  }

}

// Helper: HSL to RGB
function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Helper to check if a polygon is valid (at least 3 points, not all the same)
function isValidPolygon(polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return false;
  // Check if all points are the same
  const [x0, y0] = polygon[0];
  if (polygon.every(([x, y]) => x === x0 && y === y0)) return false;
  return true;
}

// Utility: get transformed X for a genome track
// If flipped, x' = trackEnd - (x - trackStart); else x' = x
export function getTransformedX(x, trackStart, trackEnd, flipped) {
  if (flipped) {
    return trackEnd - (x - trackStart);
  }
  return x;
}

export default GenomeView;
