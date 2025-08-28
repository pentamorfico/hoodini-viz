import Gene from './Gene';
import Domain from './Domain';
import ProteinLink from './ProteinLink';
import NucleotideLink from './NucleotideLink';
import Nucleotide from './Nucleotide';
import Baseline from './Baseline';
import NonCodingFeature from './NonCodingFeature';
import RegionFeature from './RegionFeature';
import { DEFAULT_CONFIG } from '../config/visualizationConfig';

class GenomeView {
  constructor(leaves, tree, config = DEFAULT_CONFIG) {
    this.leaves = leaves; // Now contains hood_ids instead of seqids
    this.tree = tree;
    this.config = config || DEFAULT_CONFIG;
    this.featuresBySeqid = {};
    this.genesById = {};
    this.ncRNAsById = {}; // Store ncRNA features by unique ID
    this.regionsById = {}; // Store region features by unique ID
    this.globalMin = Infinity;
    this.globalMax = -Infinity;
    this.proteinLinks = [];
    this.nucleotideLinks = [];
    this.domainsByGene = {};
    // Use config for gene height
    this.geneHeight = this.config?.gene?.height || DEFAULT_CONFIG.gene.height;
    this.trackFlipped = {}; // Track flip state per hood_id
    this.trackOffset = {};  // Track offset per hood_id
    this.nucleotidesBySeqid = {}; // New: map of seqid -> Nucleotide
    this.hoodToSeqidMap = {}; // Map hood_id to seqid
    this.seqidToHoodsMap = {}; // Map seqid to array of hood_ids (one-to-many)
    this.hoodBaselines = {}; // Map hood_id to baseline info
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
    // Now iterate through seqids (from the mapping) instead of leaves directly
    for (let hood_id of this.leaves) {
      const seqid = this.hoodToSeqidMap[hood_id];
      if (!seqid) continue; // Skip if no mapping found
      
      // Get hood baseline range from the stored baseline info
      const hoodBaseline = this.hoodBaselines[hood_id];
      if (!hoodBaseline) continue; // Skip if no baseline info
      
      const hoodStart = hoodBaseline.origStart; // Use .origStart for GFF coordinate
      const hoodEnd = hoodBaseline.origEnd;     // Use .origEnd for GFF coordinate
      
      const feats = this.featuresBySeqid[seqid] || [];
      for (let f of feats) {
        if (f.type === 'gene') {
          // Only include genes that are COMPLETELY within the hood's GFF range
          const geneCompletelyWithinHood = (f.start >= hoodStart && f.end <= hoodEnd);
          if (!geneCompletelyWithinHood) continue;
          
          // Adjust gene GFF coordinates to be relative to hood's GFF start
          // These will be stored as g.origStart and g.origEnd by the Gene constructor
          const adjustedStart = f.start - hoodStart;
          const adjustedEnd = f.end - hoodStart;
          
          // Create a unique gene ID that includes the hood_id to avoid conflicts
          const originalGeneId = this.getGeneIdFromAttributes(f.attributes);
          const uniqueGeneId = `${hood_id}_${originalGeneId}`;
          
          let g = new Gene(f.seqid, adjustedStart, adjustedEnd, f.strand, f.attributes, this.config);
          g.hood_id = hood_id; // Associate gene with hood_id
          g.originalGeneId = originalGeneId; // Keep reference to original gene ID
          this.genesById[uniqueGeneId] = g;
          // Add gene to corresponding Nucleotide
          if (this.nucleotidesBySeqid[seqid]) {
            this.nucleotidesBySeqid[seqid].addGene(g);
          }
        } else if (f.type === 'ncRNA') {
          // Only include ncRNAs that are COMPLETELY within the hood's GFF range
          const ncRNACompletelyWithinHood = (f.start >= hoodStart && f.end <= hoodEnd);
          if (!ncRNACompletelyWithinHood) continue;
          const adjustedStart = f.start - hoodStart;
          const adjustedEnd = f.end - hoodStart;
          const originalId = this.getGeneIdFromAttributes(f.attributes);
          const uniqueId = `${hood_id}_${originalId}`;
          let nc = new NonCodingFeature(f.seqid, adjustedStart, adjustedEnd, f.strand, f.type, f.attributes, this.config);
          nc.hood_id = hood_id;
          nc.originalId = originalId;
          // Ensure origStart, origEnd, and origStrand are set for transformation
          nc.origStart = adjustedStart;
          nc.origEnd = adjustedEnd;
          nc.origStrand = f.strand;
          this.ncRNAsById[uniqueId] = nc;
        } else if (f.type === 'region') {
          // Only include regions that are COMPLETELY within the hood's GFF range
          const regionCompletelyWithinHood = (f.start >= hoodStart && f.end <= hoodEnd);
          if (!regionCompletelyWithinHood) continue;
          const adjustedStart = f.start - hoodStart;
          const adjustedEnd = f.end - hoodStart;
          const originalId = this.getGeneIdFromAttributes(f.attributes);
          const uniqueId = `${hood_id}_${originalId}`;
          let region = new RegionFeature(f.seqid, adjustedStart, adjustedEnd, f.strand, f.type, f.attributes, this.config);
          region.hood_id = hood_id;
          region.originalId = originalId;
          // Ensure origStart, origEnd, and origStrand are set for transformation
          region.origStart = adjustedStart;
          region.origEnd = adjustedEnd;
          region.origStrand = f.strand;
          this.regionsById[uniqueId] = region;
        }
      }
    }
  }

  getGeneIdFromAttributes(attrs) {
    const match = attrs.match(/ID=([^;]+)/);
    return match ? match[1] : null;
  }

  // Static method to calculate the visual X coordinate of a gene's starting edge
  // Takes into account hood-relative position, track offset, flip state, hood anchor, and global X-axis scaling
  static getGeneVisualX(gene, genomeView) {
    const hood_id = gene.hood_id;
    const hoodBaseline = genomeView.hoodBaselines[hood_id];
    if (!hoodBaseline) return null;
    
    // Get transformation parameters
    const offset = genomeView.trackOffset[hood_id] || 0;
    const flipped = !!genomeView.trackFlipped[hood_id];
    const anchor = hoodBaseline.length / 2; // Center of hood
    
    // Get scale factor
    const xScalePercent = (genomeView.config.genome && typeof genomeView.config.genome.xScalePercent === 'number') ? genomeView.config.genome.xScalePercent : 100;
    const xScale = xScalePercent / 100;
    
    // Gene coordinates are already hood-relative (converted in initGenes)
    const geneStartHood = gene.origStart;
    const geneEndHood = gene.origEnd;
    
    // For alignment purposes, we want the gene's "functional start" position
    // For plus strand genes: functional start = leftmost edge
    // For minus strand genes: functional start = rightmost edge
    // But when tracks are flipped, the coordinate system changes
    let alignmentPoint;
    
    if (gene.origStrand === '+') {
      // Plus strand gene: functional start is at the leftmost position
      alignmentPoint = Math.min(geneStartHood, geneEndHood);
    } else {
      // Minus strand gene: functional start is at the rightmost position
      alignmentPoint = Math.max(geneStartHood, geneEndHood);
    }
    
    // Apply transformation: offset first, then flip, then scale
    const transformedX = GenomeView.getTransformedXUnified(alignmentPoint, anchor, offset, flipped);
    const scaledX = anchor + (transformedX - anchor) * xScale;
    
    return scaledX;
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
    let processedGenes = 0;
    let processedNcRNAs = 0;
    
    // 🚀 OPTIMIZATION: Pre-group genes and ncRNAs by hood_id to avoid O(n×m) complexity
    const genesByHood = {};
    const ncRNAsByHood = {};
    
    for (const gene of Object.values(this.genesById)) {
      if (!genesByHood[gene.hood_id]) genesByHood[gene.hood_id] = [];
      genesByHood[gene.hood_id].push(gene);
    }
    
    for (const nc of Object.values(this.ncRNAsById)) {
      if (!ncRNAsByHood[nc.hood_id]) ncRNAsByHood[nc.hood_id] = [];
      ncRNAsByHood[nc.hood_id].push(nc);
    }
    
    for (let hood_id of this.leaves) {
      const leafNode = this.tree.leafNodes.find(d => d.name === hood_id);
      if (!leafNode) continue;
      const trackY = leafNode.x + (this.config?.layout?.geneOffset || 0);
      const seqid = this.hoodToSeqidMap[hood_id];
      if (!seqid) continue;
      const nuc = this.nucleotidesBySeqid[seqid];
      const offset = this.trackOffset[hood_id] || 0;
      let anchor;
      if (nuc && nuc.baseline) {
        const hoodBaseline = this.hoodBaselines[hood_id];
        anchor = hoodBaseline ? hoodBaseline.length / 2 : (nuc.baseline.origEnd - nuc.baseline.origStart) / 2;
      } else {
        anchor = (this.featuresBySeqid[seqid].origMaxEnd - this.featuresBySeqid[seqid].origMinStart) / 2;
      }
      const flipped = !!this.trackFlipped[hood_id];
      const xScalePercent = (this.config.genome && typeof this.config.genome.xScalePercent === 'number') ? this.config.genome.xScalePercent : 100;
      const xScale = xScalePercent / 100;
      
      // 🚀 OPTIMIZATION: Process only genes that belong to this hood
      const hoodGenes = genesByHood[hood_id] || [];
      for (const gene of hoodGenes) {
        gene.trackY = trackY;
        gene.geneHeight = this.geneHeight;
        const hoodBaseline = this.hoodBaselines[hood_id];
        let geneStartHood = gene.origStart;
        let geneEndHood = gene.origEnd;
        let startX = GenomeView.getTransformedXUnified(geneStartHood, anchor, offset, flipped);
        let endX = GenomeView.getTransformedXUnified(geneEndHood, anchor, offset, flipped);
        startX = anchor + (startX - anchor) * xScale;
        endX = anchor + (endX - anchor) * xScale;
        gene.start = startX;
        gene.end = endX;
        gene.strand = flipped ? (gene.origStrand === '+' ? '-' : '+') : gene.origStrand;
        for (let d of gene.domains) {
          let domainStartHood = geneStartHood + d.origStart;
          let domainEndHood = geneStartHood + d.origEnd;
          let domainStartX = GenomeView.getTransformedXUnified(domainStartHood, anchor, offset, flipped);
          let domainEndX = GenomeView.getTransformedXUnified(domainEndHood, anchor, offset, flipped);
          domainStartX = anchor + (domainStartX - anchor) * xScale;
          domainEndX = anchor + (domainEndX - anchor) * xScale;
          d.start = domainStartX - gene.start;
          d.end = domainEndX - gene.start;
        }
        gene.updatePolygon();
        processedGenes++;
      }
      
      // 🚀 OPTIMIZATION: Process only ncRNAs that belong to this hood
      const hoodNcRNAs = ncRNAsByHood[hood_id] || [];
      for (const nc of hoodNcRNAs) {
        nc.trackY = trackY;
        nc.featureHeight = this.geneHeight;
        // Always use origStart/origEnd as the source for transformation
        const ncStartHood = nc.origStart;
        const ncEndHood = nc.origEnd;
        let startX = GenomeView.getTransformedXUnified(ncStartHood, anchor, offset, flipped);
        let endX = GenomeView.getTransformedXUnified(ncEndHood, anchor, offset, flipped);
        startX = anchor + (startX - anchor) * xScale;
        endX = anchor + (endX - anchor) * xScale;
        nc.start = startX;
        nc.end = endX;
        nc.strand = flipped ? (nc.origStrand === '+' ? '-' : '+') : nc.origStrand;
        nc.updatePolygon();
        processedNcRNAs++;
      }
      // Baseline and nucleotide region
      if (nuc && nuc.baseline) {
        const hoodBaseline = this.hoodBaselines[hood_id];
        const baseStartHood = 0;
        const baseEndHood = hoodBaseline ? hoodBaseline.length : (nuc.baseline.origEnd - nuc.baseline.origStart);
        let baseStart = GenomeView.getTransformedXUnified(baseStartHood, anchor, offset, flipped);
        let baseEnd = GenomeView.getTransformedXUnified(baseEndHood, anchor, offset, flipped);
        baseStart = anchor + (baseStart - anchor) * xScale;
        baseEnd = anchor + (baseEnd - anchor) * xScale;
        nuc.baseline.start = baseStart;
        nuc.baseline.end = baseEnd;
      }
      if (nuc) {
        const hoodBaseline = this.hoodBaselines[hood_id];
        let regionStart = GenomeView.getTransformedXUnified(0, anchor, offset, flipped);
        let regionEnd = GenomeView.getTransformedXUnified(hoodBaseline ? hoodBaseline.length : 0, anchor, offset, flipped);
        regionStart = anchor + (regionStart - anchor) * xScale;
        regionEnd = anchor + (regionEnd - anchor) * xScale;
        nuc.start = regionStart;
        nuc.end = regionEnd;
      }
    }
    this.updateLinkPositions();
    this.updateGlobalBounds();
    
  }

  // Static method to calculate the visual X coordinate of a gene's starting edge
  // Takes into account hood-relative position, track offset, flip state, hood anchor, and global X-axis scaling
  static getGeneVisualX(gene, genomeView) {
    const hood_id = gene.hood_id;
    const hoodBaseline = genomeView.hoodBaselines[hood_id];
    if (!hoodBaseline) return null;
    
    // Get transformation parameters
    const offset = genomeView.trackOffset[hood_id] || 0;
    const flipped = !!genomeView.trackFlipped[hood_id];
    const anchor = hoodBaseline.length / 2; // Center of hood
    
    // Get scale factor
    const xScalePercent = (genomeView.config.genome && typeof genomeView.config.genome.xScalePercent === 'number') ? genomeView.config.genome.xScalePercent : 100;
    const xScale = xScalePercent / 100;
    
    // Gene coordinates are already hood-relative (converted in initGenes)
    const geneStartHood = gene.origStart;
    const geneEndHood = gene.origEnd;
    
    // For alignment purposes, we want the gene's "functional start" position
    // For plus strand genes: functional start = leftmost edge
    // For minus strand genes: functional start = rightmost edge
    // But when tracks are flipped, the coordinate system changes
    let alignmentPoint;
    
    if (gene.origStrand === '+') {
      // Plus strand gene: functional start is at the leftmost position
      alignmentPoint = Math.min(geneStartHood, geneEndHood);
    } else {
      // Minus strand gene: functional start is at the rightmost position
      alignmentPoint = Math.max(geneStartHood, geneEndHood);
    }
    
    // Apply transformation: offset first, then flip, then scale
    const transformedX = GenomeView.getTransformedXUnified(alignmentPoint, anchor, offset, flipped);
    const scaledX = anchor + (transformedX - anchor) * xScale;
    
    return scaledX;
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

  // Method to update global bounds based on transformed feature positions
  updateGlobalBounds() {
    let minX = Infinity;
    let maxX = -Infinity;
    
    // Check all gene positions
    Object.values(this.genesById).forEach(gene => {
      if (gene.polygon) {
        gene.polygon.forEach(([x, y]) => {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        });
      } else if (gene.start !== undefined && gene.end !== undefined) {
        // Fallback to start/end coordinates if polygon not available
        minX = Math.min(minX, gene.start, gene.end);
        maxX = Math.max(maxX, gene.start, gene.end);
      }
    });
    
    // Check all ncRNA positions
    Object.values(this.ncRNAsById).forEach(ncRNA => {
      if (ncRNA.polygon) {
        ncRNA.polygon.forEach(([x, y]) => {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        });
      } else if (ncRNA.start !== undefined && ncRNA.end !== undefined) {
        // Fallback to start/end coordinates if polygon not available
        minX = Math.min(minX, ncRNA.start, ncRNA.end);
        maxX = Math.max(maxX, ncRNA.start, ncRNA.end);
      }
    });
    
    // Check all domain positions
    this.getAllDomains().forEach(domain => {
      if (domain.polygon) {
        domain.polygon.forEach(([x, y]) => {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        });
      }
    });
    
    // Check baseline positions
    Object.values(this.nucleotidesBySeqid).forEach(nuc => {
      if (nuc.baseline) {
        minX = Math.min(minX, nuc.baseline.start, nuc.baseline.end);
        maxX = Math.max(maxX, nuc.baseline.start, nuc.baseline.end);
      }
      // Check nucleotide region bounds
      if (nuc.start !== undefined && nuc.end !== undefined) {
        minX = Math.min(minX, nuc.start, nuc.end);
        maxX = Math.max(maxX, nuc.start, nuc.end);
      }
    });
    
    // Update global bounds if valid values found
    if (isFinite(minX) && isFinite(maxX)) {
      this.globalMin = minX;
      this.globalMax = maxX;
    }
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
    for (let originalGeneId in domainsByGene) {
      // Find all genes with this original gene ID (could be multiple due to different hoods)
      const matchingGenes = Object.entries(this.genesById)
        .filter(([uniqueId, gene]) => gene.originalGeneId === originalGeneId)
        .map(([uniqueId, gene]) => ({ uniqueId, gene }));
      
      for (const { uniqueId, gene } of matchingGenes) {
        for (let d of domainsByGene[originalGeneId]) { // d.start, d.end are GFF domain coords
          // Adjust domain coordinates relative to the hood (same as gene coordinates)
          const hoodBaseline = this.hoodBaselines[gene.hood_id];
          if (hoodBaseline) {
            // Adjust domain GFF coordinates to be relative to hood's GFF start
            // These will be stored as Domain.origStart/End
            const adjustedStart = d.start - hoodBaseline.origStart; // Use .origStart
            const adjustedEnd = d.end - hoodBaseline.origStart;   // Use .origStart
            let dom = new Domain(uniqueId, d.domainName, adjustedStart, adjustedEnd, d.evalue);
            gene.addDomain(dom);
          } else {
            // Fallback for backwards compatibility
            let dom = new Domain(uniqueId, d.domainName, d.start, d.end, d.evalue);
            gene.addDomain(dom);
          }
        }
        // Add domains summary string to gene metadata
        if (!gene.metadata) gene.metadata = {};
        if (gene.domains && gene.domains.length > 0) {
          gene.metadata.domainsSummary = gene.domains.map(dom => `${dom.domainName}(${dom.start}-${dom.end})`).join(';');
        } else {
          gene.metadata.domainsSummary = '';
        }
      }
    }
  }

  addProteinLinks(links, color = [50, 100, 220]) {
    this.proteinLinks = [];
    for (let l of links) {
      const originalGeneIdA = l[0];
      const originalGeneIdB = l[1];
      const similarity = l[2];
      // Find all genes with these original gene IDs
      const genesA = Object.entries(this.genesById)
        .filter(([uniqueId, gene]) => gene.originalGeneId === originalGeneIdA)
        .map(([uniqueId, gene]) => uniqueId);
      const genesB = Object.entries(this.genesById)
        .filter(([uniqueId, gene]) => gene.originalGeneId === originalGeneIdB)
        .map(([uniqueId, gene]) => uniqueId);
      // Create links between all combinations
      for (const geneIdA of genesA) {
        for (const geneIdB of genesB) {
          this.proteinLinks.push(new ProteinLink(geneIdA, geneIdB, similarity, color));
        }
      }
    }
  }

  addNucleotideLinks(links, color = [220, 50, 50]) {
    this.nucleotideLinks = [];
    for (let l of links) {
      const seqidA = l.seqidA;
      const seqidB = l.seqidB;
      const startA = l.startA;
      const endA = l.endA;
      const startB = l.startB;
      const endB = l.endB;
      const similarity = l.similarity;
      // Get all hoods for each sequence
      const hoodsA = this.getHoodIdsFromSeqid(seqidA);
      const hoodsB = this.getHoodIdsFromSeqid(seqidB);
      // Create links between all combinations of hoods that contain the link coordinates
      for (const hoodA of hoodsA) {
        const baselineA = this.hoodBaselines[hoodA];
        if (!baselineA) continue;
        // Only allow if link coordinates are fully within the hood's genomic range
        if (!(startA >= baselineA.origStart && endA <= baselineA.origEnd)) continue;
        for (const hoodB of hoodsB) {
          const baselineB = this.hoodBaselines[hoodB];
          if (!baselineB) continue;
          if (!(startB >= baselineB.origStart && endB <= baselineB.origEnd)) continue;
          const link = new NucleotideLink(seqidA, startA, endA, seqidB, startB, endB, similarity, color);
          // Set hood and hood-relative coordinates for rendering
          link.hoodA = hoodA;
          link.hoodB = hoodB;
          link.hoodStartA = startA - baselineA.origStart;
          link.hoodEndA = endA - baselineA.origStart;
          link.hoodStartB = startB - baselineB.origStart;
          link.hoodEndB = endB - baselineB.origStart;
          this.nucleotideLinks.push(link);
        }
      }
    }
  }

  getTrackY(seqid) {
    // For backwards compatibility, try to get the first hood_id from seqid
    const hood_ids = this.getHoodIdsFromSeqid(seqid);
    if (hood_ids.length > 0) {
      const hood_id = hood_ids[0];
      const ln = this.tree.leafNodes.find(d => d.name === hood_id);
      return ln ? ln.x : null;
    }
    return null;
  }

  getTrackYByHoodId(hood_id) {
    const ln = this.tree.leafNodes.find(d => d.name === hood_id);
    return ln ? ln.x : null;
  }

  filterBySelectedNode(selectedNode) {
    if (!selectedNode) return {
      genes: Object.values(this.genesById),
      proteinPolygons: this.getProteinPolygons(),
      nucleotidePolygons: this.getNucleotidePolygons(),
      domains: this.getAllDomains(),
      ncRNAs: Object.values(this.ncRNAsById)
    };
    const leavesSet = new Set(this.getNodeDescendantLeaves(selectedNode));
    // Filter by hood_id instead of seqid
    const filteredGenes = Object.values(this.genesById).filter(g => leavesSet.has(g.hood_id || this.getHoodIdFromSeqid(g.seqid)));
    const filteredProtein = this.getProteinPolygons().filter(p => p.seqids.every(s => leavesSet.has(this.getHoodIdFromSeqid(s))));
    const filteredNucleotide = this.getNucleotidePolygons().filter(p => p.seqids.every(s => leavesSet.has(this.getHoodIdFromSeqid(s))));
    const filteredDomains = this.getAllDomains().filter(d => leavesSet.has(this.genesById[d.geneId]?.hood_id || this.getHoodIdFromSeqid(this.genesById[d.geneId]?.seqid)));
    const filteredNcRNAs = Object.values(this.ncRNAsById).filter(nc => leavesSet.has(nc.hood_id || this.getHoodIdFromSeqid(nc.seqid)));
    return { genes: filteredGenes, proteinPolygons: filteredProtein, nucleotidePolygons: filteredNucleotide, domains: filteredDomains, ncRNAs: filteredNcRNAs };
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
        fillColor: pl.fillColor, // FIX: use fillColor with alpha
        metadata: pl.metadata // Attach metadata for tooltip
      });
    }
    return polys;
  }

  getNucleotidePolygons() {
    // Pre-compute transformation parameters for each hood (consistent with computeTrackPositions)
    const trackInfo = {};
    const xScalePercent = (this.config.genome && typeof this.config.genome.xScalePercent === 'number') ? this.config.genome.xScalePercent : 100;
    const xScale = xScalePercent / 100;
    
    for (let hood_id of this.leaves) {
      const seqid = this.hoodToSeqidMap[hood_id];
      if (!seqid) continue;
      
      const hoodBaseline = this.hoodBaselines[hood_id];
      const offset = this.trackOffset[hood_id] || 0;
      const flipped = !!this.trackFlipped[hood_id];
      
      // Use hood-relative coordinates for anchor to match alignment methods
      let anchor;
      if (hoodBaseline) {
        anchor = hoodBaseline.length / 2; // Center of hood
      } else {
        anchor = 0; // Fallback
      }
      
      trackInfo[hood_id] = { anchor, flipped, offset, xScale };
    }
    
    let polys = [];
    for (let l of this.nucleotideLinks) {
      // Use the stored hood information
      const hoodA = l.hoodA;
      const hoodB = l.hoodB;
      
      if (!hoodA || !hoodB) continue;
      
      const trackYA = this.getTrackYByHoodId(hoodA);
      const trackYB = this.getTrackYByHoodId(hoodB);
      if (trackYA == null || trackYB == null) continue;
      
      const infoA = trackInfo[hoodA];
      const infoB = trackInfo[hoodB];
      if (!infoA || !infoB) continue;
      
      // Use hood-relative coordinates and apply transformations
      let xA1 = GenomeView.getTransformedXUnified(l.hoodStartA, infoA.anchor, infoA.offset, infoA.flipped);
      let xA2 = GenomeView.getTransformedXUnified(l.hoodEndA, infoA.anchor, infoA.offset, infoA.flipped);
      let xB1 = GenomeView.getTransformedXUnified(l.hoodStartB, infoB.anchor, infoB.offset, infoB.flipped);
      let xB2 = GenomeView.getTransformedXUnified(l.hoodEndB, infoB.anchor, infoB.offset, infoB.flipped);
      
      // Apply genome x scale around the anchor points
      xA1 = infoA.anchor + (xA1 - infoA.anchor) * infoA.xScale;
      xA2 = infoA.anchor + (xA2 - infoA.anchor) * infoA.xScale;
      xB1 = infoB.anchor + (xB1 - infoB.anchor) * infoB.xScale;
      xB2 = infoB.anchor + (xB2 - infoB.anchor) * infoB.xScale;
      
      const poly = l.buildPolygonFromCoords(xA1, xA2, xB1, xB2, trackYA, trackYB);
      polys.push({
        polygon: poly,
        fillColor: l.fillColor, // FIX: use fillColor with alpha
        metadata: l.metadata, // Attach metadata for tooltip
        seqids: [l.seqidA, l.seqidB] // For filtering
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
            domainName: d.domainName, // Include domainName for palette logic
            metadata: d.metadata // Attach metadata for tooltip
          });
        }
      }
    }
    return alld;
  }

  getAllNcRNAs() {
    return Object.values(this.ncRNAsById);
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
    // Use config.layout.scaleBarOffset if present, else fallback to config.layout.padding or 150
    const scaleBarOffset = this.config?.layout?.scaleBarOffset ?? this.config?.layout?.padding ?? 150;
    const SCALE_Y = (this.tree.leafNodes[this.tree.leafNodes.length - 1].x) + scaleBarOffset;
    return [[{ path: [[this.globalMin, SCALE_Y], [this.globalMax, SCALE_Y]], color: this.config?.colors?.black || [0, 0, 0, 255] }], SCALE_Y];
  }

  buildPhyloLabels(phyloLabelPosition = 'after-tree') {
    const labelOffset = this.config?.tree?.labelOffset || 10;
    const labelColor = this.config?.colors?.black || [10, 10, 10, 255];
    const labelSize = this.config?.text?.phyloLabelSize || 14;
    
    return this.tree.leafNodes.map(l => {
      let position;
      
      if (phyloLabelPosition === 'after-tracks') {
        // Position phylo labels after the rightmost edge of genome tracks
        const hood_id = l.name;
        let rightmostX = -Infinity;
        
        // Check all genes for this leaf to find the rightmost position
        Object.values(this.genesById).forEach(gene => {
          if (gene.hood_id === hood_id) {
            rightmostX = Math.max(rightmostX, Math.max(gene.start, gene.end));
          }
        });
        
        // Check all ncRNAs for this leaf to find the rightmost position
        Object.values(this.ncRNAsById).forEach(ncRNA => {
          if (ncRNA.hood_id === hood_id) {
            rightmostX = Math.max(rightmostX, Math.max(ncRNA.start, ncRNA.end));
          }
        });
        
        // Check baselines for this leaf
        const seqid = this.hoodToSeqidMap[hood_id];
        const nuc = this.nucleotidesBySeqid[seqid];
        if (nuc && nuc.baseline) {
          rightmostX = Math.max(rightmostX, Math.max(nuc.baseline.start, nuc.baseline.end));
        }
        
        // If we couldn't find a rightmost position, fallback to tree position
        if (!isFinite(rightmostX)) {
          rightmostX = l.y + labelOffset;
        } else {
          // Add offset after the rightmost genome feature
          rightmostX += labelOffset;
        }
        
        position = [rightmostX, l.x];
      } else {
        // Default: position after tree nodes (current behavior)
        position = [l.y + labelOffset, l.x];
      }
      
      return {
        position,
        text: l.name,
        color: labelColor,
        size: labelSize,
        textAnchor: 'start',
        leafNode: l // Add reference to the leaf node for palette coloring
      };
    });
  }

  buildNodePoints(selectedNode, colorLeavesBy) {
    const highlightLeaves = selectedNode ? new Set(this.getNodeDescendantLeaves(selectedNode)) : null;
    const nodeRadius = this.config?.tree?.nodeRadius || DEFAULT_CONFIG.tree.nodeRadius;
    return this.tree.allNodes.map(n => {
      const nodeLeaves = this.getNodeDescendantLeaves(n);
      const isDesc = !selectedNode || nodeLeaves.some(l => highlightLeaves.has(l));
      let color;
      if (n.branchset.length > 0) {
        // Internal node: black
        color = [0, 0, 0, 255];
      } else {
        // Leaf: color by metadata
        const meta = n.metadata || {};
        if (meta[colorLeavesBy]) {
          // Simple hash to color
          const str = String(meta[colorLeavesBy]);
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
        color = this.fadeColor(color, 0.1);
      }
      return {
        id: n.id,
        node: n,
        position: [n.y, n.x],
        color: color,
        radius: n.branchset.length > 0 ? nodeRadius.internal : nodeRadius.leaf,
        metadata: n.metadata || { name: n.name, id: n.id }
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

    
    // Early return if no cluster data
    if (!clusterMap || Object.keys(clusterMap).length === 0) {
      this.proteinClusters = {};
      return;
    }
    
    this.proteinClusters = {};
    
    // OPTIMIZATION 1: Build reverse index once instead of filtering for each cluster entry
    // This changes complexity from O(n*m) to O(m) where n=clusters, m=genes
    const genesByOriginalId = {};
    const genesById = this.genesById; // Cache reference to avoid repeated property access
    
    for (const uniqueId in genesById) {
      const gene = genesById[uniqueId];
      const originalId = gene.originalGeneId;
      if (originalId) {
        if (!genesByOriginalId[originalId]) {
          genesByOriginalId[originalId] = [];
        }
        genesByOriginalId[originalId].push(uniqueId);
      }
    }
    
    
    // OPTIMIZATION 2: Process clusters using the reverse index (much faster!)
    // Also cache cluster keys to avoid repeated Object.keys() calls
    const clusterKeys = Object.keys(clusterMap);
    for (let i = 0; i < clusterKeys.length; i++) {
      const originalGeneId = clusterKeys[i];
      const cluster = clusterMap[originalGeneId];
      const matchingGenes = genesByOriginalId[originalGeneId];

      if (matchingGenes) {
        for (let j = 0; j < matchingGenes.length; j++) {
          this.proteinClusters[matchingGenes[j]] = cluster;
        }
      }
    }
    

    // OPTIMIZATION 3: Skip color assignment if no palette is provided
    if (!this.clusterColors) {
      return;
    }

    // OPTIMIZATION 4: Batch color and metadata updates with minimal iterations
    // Use for...in loop which is faster for object iteration than Object.keys()
    const clusterColors = this.clusterColors; // Cache reference
    for (const uniqueGeneId in genesById) {
      const gene = genesById[uniqueGeneId];
      const cluster = this.proteinClusters[uniqueGeneId];
      
      // Update fillColor
      gene.fillColor = (cluster && clusterColors[cluster]) ? clusterColors[cluster] : null;
      
      // Update metadata (create if needed, but avoid unnecessary object creation)
      if (!gene.metadata) gene.metadata = {};
      gene.metadata.clusterId = cluster || null;
    }
    
  }

  // Enhanced method to set protein clusters with color palette support
  setProteinClustersWithPalette(clusterMap, paletteConfig = null) {
    this.proteinClusters = {};
    // Convert original gene IDs to unique gene IDs
    for (const originalGeneId in clusterMap) {
      const cluster = clusterMap[originalGeneId];
      const matchingGenes = Object.entries(this.genesById)
        .filter(([uniqueId, gene]) => gene.originalGeneId === originalGeneId);

      for (const [uniqueId, gene] of matchingGenes) {
        this.proteinClusters[uniqueId] = cluster;
      }
    }

    // Skip assigning colors if no palette is provided or enabled
    if (!paletteConfig || !paletteConfig.enabled) {
      return;
    }

    // Assign colors to each cluster
    this.clusterColors = {};
    const clusterIds = Array.from(new Set(Object.values(this.proteinClusters))).sort();

    let clusterColors = [];

    // Try to use palette if enabled and available
    if (paletteConfig.name) {
      try {
        const { getPaletteColors } = require('../utils/colorPalettes');
        clusterColors = getPaletteColors(
          paletteConfig.name,
          Math.max(clusterIds.length, paletteConfig.numColors || clusterIds.length),
          paletteConfig.reverse || false
        );
      } catch (error) {
        clusterColors = [];
      }
    }

    // Fallback to HSL colors if palette not available or failed
    if (clusterColors.length === 0) {
      clusterColors = clusterIds.map((cluster, i) => 
        hslToRgb(i / clusterIds.length, 0.6, 0.5).concat(255)
      );
    }

    clusterIds.forEach((cluster, i) => {
      this.clusterColors[cluster] = clusterColors[i % clusterColors.length];
    });

    // Update gene colors and metadata
    for (const uniqueGeneId in this.genesById) {
      const gene = this.genesById[uniqueGeneId];
      const cluster = this.proteinClusters[uniqueGeneId];
      if (cluster && this.clusterColors[cluster]) {
        gene.fillColor = this.clusterColors[cluster];
      } else {
        gene.fillColor = null; // Do not assign any fallback color
      }
      if (!gene.metadata) gene.metadata = {};
      gene.metadata.clusterId = cluster || null;
    }
  }

  toggleTrackFlip(hood_id) {
    this.trackFlipped[hood_id] = !this.trackFlipped[hood_id];
  }

  flipTrack(hood_id) {
    // Only update the flip state; do not mutate any feature data
    this.trackFlipped[hood_id] = !this.trackFlipped[hood_id];
    // After flipping, recompute all positions from original values
    this.computeTrackPositions();
  }

  // Method to flip track state without immediately recomputing positions
  // Useful for batch operations where multiple tracks need to be flipped
  flipTrackState(hood_id) {
    this.trackFlipped[hood_id] = !this.trackFlipped[hood_id];
  }

  shiftTrack(hood_id, delta) {
    // Shift the track offset by delta (e.g., +1000 for +1kb)
    if (!this.trackOffset[hood_id]) this.trackOffset[hood_id] = 0;
    // change the sign of delta if the track is flipped
    if (this.trackFlipped[hood_id]) {
      delta = -delta;
    }
    this.trackOffset[hood_id] += delta;
    this.computeTrackPositions();
  }

  // Method to shift a track by +1kb
  shiftTrackPlus1kb(hood_id) {
    this.shiftTrack(hood_id, 1000);
  }

  // Method to shift a track by -1kb  
  shiftTrackMinus1kb(hood_id) {
    this.shiftTrack(hood_id, -1000);
  }

  // Method to flip a track
  flipTrackToggle(hood_id) {
    this.flipTrack(hood_id);
  }  alignCluster(clusterId) {
    // Get scale factor
    const xScalePercent = (this.config.genome && typeof this.config.genome.xScalePercent === 'number') ? this.config.genome.xScalePercent : 100;
    const xScale = xScalePercent / 100;
    
    // 1. Find all genes in the cluster using unique gene IDs
    const allClusterGenes = Object.entries(this.genesById)
      .filter(([uniqueGeneId, gene]) => this.proteinClusters && this.proteinClusters[uniqueGeneId] == clusterId)
      .map(([uniqueGeneId, gene]) => gene);
    
    if (allClusterGenes.length === 0) {
      return;
    }

    // 2. Group genes by track (hood_id) and randomly select one per track
    const genesByTrack = {};
    for (const gene of allClusterGenes) {
      const hood_id = gene.hood_id || this.getHoodIdFromSeqid(gene.seqid);
      if (!genesByTrack[hood_id]) {
        genesByTrack[hood_id] = [];
      }
      genesByTrack[hood_id].push(gene);
    }

    // Deterministically select one gene per track that has cluster genes (sorted by originalGeneId)
    const selectedGenes = [];
    for (const hood_id in genesByTrack) {
      const trackGenes = genesByTrack[hood_id];
      // Sort genes by originalGeneId for deterministically selection
      trackGenes.sort((a, b) => a.originalGeneId.localeCompare(b.originalGeneId));
      const firstGene = trackGenes[0]; // Take the first gene after sorting
      selectedGenes.push(firstGene);
    }

    if (selectedGenes.length === 0) {
      return;
    }
    
    // 3. Deterministically pick the first gene (sorted by hood_id) as the reference gene for alignment
    // This ensures consistent alignment results across multiple runs
    selectedGenes.sort((a, b) => a.hood_id.localeCompare(b.hood_id));
    const referenceGene = selectedGenes[0];

    // 4. BATCH OPERATION: For each selected gene, ensure its track is on the positive strand (flip if needed)
    // Do this without calling computeTrackPositions() after each flip to avoid race conditions
    for (const gene of selectedGenes) {
      const hood_id = gene.hood_id || this.getHoodIdFromSeqid(gene.seqid);
      const flipped = !!this.trackFlipped[hood_id];
      const origStrand = gene.origStrand;
      // If gene is negative strand after current flip state, flip the track
      const effectiveStrand = flipped ? (origStrand === '+' ? '-' : '+') : origStrand;
      if (effectiveStrand === '-') {
        // Flip without recomputing positions immediately
        this.flipTrackState(hood_id);
      }
    }

    // 5. DON'T reset offsets - preserve manual track manipulations
    // for (const gene of selectedGenes) {
    //   const hood_id = gene.hood_id || this.getHoodIdFromSeqid(gene.seqid);
    //   this.trackOffset[hood_id] = 0;
    // }

    // 6. Recompute positions ONCE after all flipping is done
    this.computeTrackPositions();
    
    // 7. Calculate the reference gene's visual X coordinate AFTER all flipping is done
    const referenceVisualX = GenomeView.getGeneVisualX(referenceGene, this);

    // 8. For each selected gene, calculate the required offset to align its visual X to the reference
    for (const gene of selectedGenes) {
      const hood_id = gene.hood_id || this.getHoodIdFromSeqid(gene.seqid);
      
      // Calculate this gene's current visual X position
      const currentVisualX = GenomeView.getGeneVisualX(gene, this);
      if (currentVisualX === null) continue;
      
      // Calculate the visual shift needed
      const requiredVisualShift = referenceVisualX - currentVisualX;
      
      // Convert visual shift to data offset shift
      // For non-flipped tracks: finalX = anchor + (dataX + offset - anchor) * scale
      // For flipped tracks: finalX = anchor + (2*anchor - (dataX + offset) - anchor) * scale
      //                           = anchor + (anchor - dataX - offset) * scale
      // So for flipped tracks, increasing offset decreases finalX
      let offsetAdjustment = requiredVisualShift / xScale;
      const isFlipped = !!this.trackFlipped[hood_id];
      
      // For flipped tracks, we need to reverse the direction of the offset adjustment
      if (isFlipped) {
        offsetAdjustment = -offsetAdjustment;
      }
      
      // Apply the offset adjustment (preserve any existing manual offset)
      const currentOffset = this.trackOffset[hood_id] || 0;
      this.trackOffset[hood_id] = currentOffset + offsetAdjustment;
    }

    // 9. Handle tracks that don't contain the alignment cluster - center them at the reference point
    const tracksWithCluster = new Set(Object.keys(genesByTrack));
    for (const hood_id of this.leaves) {
      if (!tracksWithCluster.has(hood_id)) {
        // This track doesn't have any genes from the alignment cluster
        // Center it at the same visual X position as the reference gene
        const seqid = this.hoodToSeqidMap[hood_id];
        if (!seqid) continue;
        
        const nuc = this.nucleotidesBySeqid[seqid];
        if (nuc && nuc.baseline) {
          // Calculate current anchor using hood coordinates (consistent with computeTrackPositions)
          let anchor;
          const hoodBaseline = this.hoodBaselines[hood_id];
          if (hoodBaseline) {
            anchor = hoodBaseline.length / 2; // Center of hood
          } else {
            anchor = (nuc.baseline.origEnd - nuc.baseline.origStart) / 2; // Fallback
          }
          
          // Center the track so its midpoint aligns with the reference gene's visual X
          // We want: anchor + (hoodCenter + offset - anchor) * xScale = referenceVisualX
          // Solving for offset: offset = (referenceVisualX - anchor) / xScale + anchor - hoodCenter
          const hoodCenter = hoodBaseline ? hoodBaseline.length / 2 : anchor;
          const requiredOffset = (referenceVisualX - anchor) / xScale + anchor - hoodCenter;
          
          this.trackOffset[hood_id] = requiredOffset;
        }
      }
    }

    // 10. Recompute positions after setting offsets
    this.computeTrackPositions();
  }

  alignAllToStart() {
    // Get scale factor
    const xScalePercent = (this.config.genome && typeof this.config.genome.xScalePercent === 'number') ? this.config.genome.xScalePercent : 100;
    const xScale = xScalePercent / 100;
    
    // Define global alignment target (coordinate 0 for start alignment)
    const globalAlignmentTarget = 0;
    
    // For each track, set to original strand and shift so baseline start aligns to globalAlignmentTarget
    for (const hood_id of this.leaves) {
      const seqid = this.hoodToSeqidMap[hood_id];
      if (!seqid) continue;
      
      // 1. Flip to original strand if needed
      const flipped = !!this.trackFlipped[hood_id];
      const nuc = this.nucleotidesBySeqid[seqid];
      if (nuc && nuc.strand && flipped) {
        this.flipTrack(hood_id); // flip back to original
      }
      
      // 2. Calculate the offset needed to align baseline start to globalAlignmentTarget after scaling
      if (nuc && nuc.baseline) {
        // Calculate current anchor using hood coordinates (consistent with computeTrackPositions)
        let anchor;
        const hoodBaseline = this.hoodBaselines[hood_id];
        if (hoodBaseline) {
          anchor = hoodBaseline.length / 2; // Center of hood
        } else {
          anchor = (nuc.baseline.origEnd - nuc.baseline.origStart) / 2; // Fallback
        }
        
        // Baseline start in hood coordinates is 0
        const baselineStart = 0;
        
        // After transformation: transformedStart = anchor + (baselineStart + offset - anchor) * xScale
        // We want: transformedStart = globalAlignmentTarget
        // So: globalAlignmentTarget = anchor + (baselineStart + offset - anchor) * xScale
        // Solving for offset: offset = (globalAlignmentTarget - anchor) / xScale + anchor - baselineStart
        const requiredOffset = (globalAlignmentTarget - anchor) / xScale + anchor - baselineStart;
        
        this.trackOffset[hood_id] = requiredOffset;
      }
    }
    this.computeTrackPositions();
  }

  alignAllToEnd() {
    // Get scale factor
    const xScalePercent = (this.config.genome && typeof this.config.genome.xScalePercent === 'number') ? this.config.genome.xScalePercent : 100;
    const xScale = xScalePercent / 100;
    
    // Define global alignment target (coordinate 0 for end alignment)
    const globalAlignmentTarget = 0;
    
    // For each track, set to original strand and shift so baseline end aligns to globalAlignmentTarget
    for (const hood_id of this.leaves) {
      const seqid = this.hoodToSeqidMap[hood_id];
      if (!seqid) continue;
      
      // 1. Flip to original strand if needed
      const flipped = !!this.trackFlipped[hood_id];
      const nuc = this.nucleotidesBySeqid[seqid];
      if (nuc && nuc.strand && flipped) {
        this.flipTrack(hood_id); // flip back to original
      }
      
      // 2. Calculate the offset needed to align baseline end to globalAlignmentTarget after scaling
      if (nuc && nuc.baseline) {
        // Calculate current anchor using hood coordinates (consistent with computeTrackPositions)
        let anchor;
        const hoodBaseline = this.hoodBaselines[hood_id];
        if (hoodBaseline) {
          anchor = hoodBaseline.length / 2; // Center of hood
        } else {
          anchor = (nuc.baseline.origEnd - nuc.baseline.origStart) / 2; // Fallback
        }
        
        // Baseline end in hood coordinates
        const baselineEnd = hoodBaseline ? hoodBaseline.length : (nuc.baseline.origEnd - nuc.baseline.origStart);
        
        // After transformation: transformedEnd = anchor + (baselineEnd + offset - anchor) * xScale
        // We want: transformedEnd = globalAlignmentTarget
        // Solving for offset: offset = (globalAlignmentTarget - anchor) / xScale + anchor - baselineEnd
        const requiredOffset = (globalAlignmentTarget - anchor) / xScale + anchor - baselineEnd;
        
        this.trackOffset[hood_id] = requiredOffset;
      }
    }
    this.computeTrackPositions();
  }

  alignAllToCenter() {
    // Get scale factor
    const xScalePercent = (this.config.genome && typeof this.config.genome.xScalePercent === 'number') ? this.config.genome.xScalePercent : 100;
    const xScale = xScalePercent / 100;
    
    // Define global alignment target (coordinate 0 for center alignment)
    const globalAlignmentTarget = 0;
    
    // For each track, set to original strand and shift so baseline center aligns to globalAlignmentTarget
    for (const hood_id of this.leaves) {
      const seqid = this.hoodToSeqidMap[hood_id];
      if (!seqid) continue;
      
      // 1. Flip to original strand if needed
      const flipped = !!this.trackFlipped[hood_id];
      const nuc = this.nucleotidesBySeqid[seqid];
      if (nuc && nuc.strand && flipped) {
        this.flipTrack(hood_id); // flip back to original
      }
      
      // 2. Calculate the offset needed to align baseline center to globalAlignmentTarget after scaling
      if (nuc && nuc.baseline) {
        // Calculate current anchor using hood coordinates (consistent with computeTrackPositions)
        let anchor;
        const hoodBaseline = this.hoodBaselines[hood_id];
        if (hoodBaseline) {
          anchor = hoodBaseline.length / 2; // Center of hood
        } else {
          anchor = (nuc.baseline.origEnd - nuc.baseline.origStart) / 2; // Fallback
        }
        
        // Baseline center in hood coordinates (which equals the anchor)
        const baselineCenter = anchor;
        
        // After transformation: transformedCenter = anchor + (baselineCenter + offset - anchor) * xScale
        // We want: transformedCenter = globalAlignmentTarget
        // Solving for offset: offset = (globalAlignmentTarget - anchor) / xScale + anchor - baselineCenter
        const requiredOffset = (globalAlignmentTarget - anchor) / xScale + anchor - baselineCenter;
        
        this.trackOffset[hood_id] = requiredOffset;
      }
    }
    this.computeTrackPositions();
  }

  applyBaselines(baselines) {
    for (const b of baselines) {
      // Set up hood to seqid mapping
      if (b.hood_id && b.seqid) {
        this.hoodToSeqidMap[b.hood_id] = b.seqid;
        
        // Support multiple hoods per seqid
        if (!this.seqidToHoodsMap[b.seqid]) {
          this.seqidToHoodsMap[b.seqid] = [];
        }
        this.seqidToHoodsMap[b.seqid].push(b.hood_id);
        
        // Store the baseline information for this hood_id - KEEP ORIGINAL GFF COORDINATES
        if (!this.hoodBaselines) this.hoodBaselines = {};
        this.hoodBaselines[b.hood_id] = {
          seqid: b.seqid,
          origStart: b.start,    // Keep original GFF coordinates
          origEnd: b.end,        // Keep original GFF coordinates  
          start: b.start,        // This will be transformed coordinates
          end: b.end,            // This will be transformed coordinates
          length: b.end - b.start,
          align_gene: b.align_gene // Store the default alignment gene
        };
      }
      
      // Apply baseline to nucleotide with coordinates in GFF system initially
      // (will be transformed to hood coordinates in computeTrackPositions)
      if (this.nucleotidesBySeqid[b.seqid]) {
        this.nucleotidesBySeqid[b.seqid].setBaseline(b.start, b.end);
      }
    }
  }

  // New method to get hood_ids from seqid (returns array since one seqid can have multiple hoods)
  getHoodIdsFromSeqid(seqid) {
    return this.seqidToHoodsMap[seqid] || [seqid]; // Fallback to seqid for backwards compatibility
  }

  // New method to get first hood_id from seqid (for backwards compatibility)
  getHoodIdFromSeqid(seqid) {
    const hoods = this.getHoodIdsFromSeqid(seqid);
    return hoods[0]; // Return first hood for backwards compatibility
  }

  // New method to get seqid from hood_id
  getSeqidFromHoodId(hood_id) {
    return this.hoodToSeqidMap[hood_id] || hood_id; // Fallback to hood_id for backwards compatibility
  }

  alignByDefaultGenes() {
    // Get scale factor
    const xScalePercent = (this.config.genome && typeof this.config.genome.xScalePercent === 'number') ? this.config.genome.xScalePercent : 100;
    const xScale = xScalePercent / 100;
    
    // 1. Collect genes to align from baselines
    const genesToAlign = [];
    for (const hood_id of this.leaves) {
      const hoodBaseline = this.hoodBaselines[hood_id];
      if (!hoodBaseline || !hoodBaseline.align_gene) continue;
      
      // Find the gene with the specified original gene ID in this hood
      const uniqueGeneId = `${hood_id}_${hoodBaseline.align_gene}`;
      const gene = this.genesById[uniqueGeneId];
      if (gene) {
        genesToAlign.push(gene);
      }
    }
    
    if (genesToAlign.length === 0) return;
    
    // 2. Deterministically pick the first gene (sorted by hood_id) as reference for alignment
    // This ensures consistent alignment results across multiple runs
    genesToAlign.sort((a, b) => a.hood_id.localeCompare(b.hood_id));
    const referenceGene = genesToAlign[0];

    // 3. BATCH OPERATION: For each gene, ensure its track is on the positive strand (flip if needed)
    // Do this without calling computeTrackPositions() after each flip to avoid race conditions
    for (const gene of genesToAlign) {
      const hood_id = gene.hood_id;
      const flipped = !!this.trackFlipped[hood_id];
      const origStrand = gene.origStrand;
      // If gene is negative strand after current flip state, flip the track
      const effectiveStrand = flipped ? (origStrand === '+' ? '-' : '+') : origStrand;
      if (effectiveStrand === '-') {
        // Flip without recomputing positions immediately
        this.flipTrackState(hood_id);
      }
    }
    
    // 4. DON'T reset offsets - preserve manual track manipulations
    // for (const gene of genesToAlign) {
    //   this.trackOffset[gene.hood_id] = 0;
    // }
    
    // 5. Recompute positions ONCE after all flipping is done
    this.computeTrackPositions();
    
    // 6. For default gene alignment, we want all alignment genes to appear at coordinate 0
    // This is consistent with traditional alignments (start/center/end) that also align to coordinate 0
    const targetVisualX = 0;
    
    // 7. For each gene, calculate the required offset to align its visual X to coordinate 0
    for (const gene of genesToAlign) {
      const hood_id = gene.hood_id;
      
      // Calculate this gene's current visual X position
      const currentVisualX = GenomeView.getGeneVisualX(gene, this);
      if (currentVisualX === null) continue;
      
      // Calculate the visual shift needed to move gene to coordinate 0
      const requiredVisualShift = targetVisualX - currentVisualX;
      
      // Convert visual shift to data offset shift
      // For non-flipped tracks: finalX = anchor + (dataX + offset - anchor) * scale
      // For flipped tracks: finalX = anchor + (2*anchor - (dataX + offset) - anchor) * scale
      //                           = anchor + (anchor - dataX - offset) * scale
      // So for flipped tracks, increasing offset decreases finalX
      const offsetAdjustment = requiredVisualShift / xScale;
      const isFlipped = !!this.trackFlipped[hood_id];
      
      // For flipped tracks, we need to reverse the direction of the offset adjustment
      const adjustedOffsetAdjustment = isFlipped ? -offsetAdjustment : offsetAdjustment;
      
      // Apply the offset adjustment (preserve any existing manual offset)
      const currentOffset = this.trackOffset[hood_id] || 0;
      this.trackOffset[hood_id] = currentOffset + adjustedOffsetAdjustment;
    }
    
    // 8. Handle tracks that don't have default alignment genes - center them at coordinate 0
    const tracksWithAlignGenes = new Set(genesToAlign.map(gene => gene.hood_id));
    for (const hood_id of this.leaves) {
      if (!tracksWithAlignGenes.has(hood_id)) {
        // This track doesn't have a default alignment gene
        // Center it at coordinate 0 to prevent excessive offset
        const seqid = this.hoodToSeqidMap[hood_id];
        if (!seqid) continue;
        
        const nuc = this.nucleotidesBySeqid[seqid];
        if (nuc && nuc.baseline) {
          // Calculate current anchor using hood coordinates (consistent with computeTrackPositions)
          let anchor;
          const hoodBaseline = this.hoodBaselines[hood_id];
          if (hoodBaseline) {
            anchor = hoodBaseline.length / 2; // Center of hood
          } else {
            anchor = (nuc.baseline.origEnd - nuc.baseline.origStart) / 2; // Fallback
          }
          
          // For visual centering at coordinate 0, we want the center of the hood to appear at x=0
          // The offset should shift the visual representation so that coordinate 0 is at the center
          const hoodCenter = hoodBaseline ? hoodBaseline.length / 2 : anchor;
          const requiredOffset = -hoodCenter;
          
          this.trackOffset[hood_id] = requiredOffset;
        }
      }
    }
    
    // 9. Recompute positions after setting offsets
    this.computeTrackPositions();
  }

  // Method to update global bounds based on transformed feature positions
  updateGlobalBounds() {
    let minX = Infinity;
    let maxX = -Infinity;
    
    // Check all gene positions
    Object.values(this.genesById).forEach(gene => {
      if (gene.polygon) {
        gene.polygon.forEach(([x, y]) => {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        });
      } else if (gene.start !== undefined && gene.end !== undefined) {
        // Fallback to start/end coordinates if polygon not available
        minX = Math.min(minX, gene.start, gene.end);
        maxX = Math.max(maxX, gene.start, gene.end);
      }
    });
    
    // Check all ncRNA positions
    Object.values(this.ncRNAsById).forEach(ncRNA => {
      if (ncRNA.polygon) {
        ncRNA.polygon.forEach(([x, y]) => {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        });
      } else if (ncRNA.start !== undefined && ncRNA.end !== undefined) {
        // Fallback to start/end coordinates if polygon not available
        minX = Math.min(minX, ncRNA.start, ncRNA.end);
        maxX = Math.max(maxX, ncRNA.start, ncRNA.end);
      }
    });
    
    // Check all domain positions
    this.getAllDomains().forEach(domain => {
      if (domain.polygon) {
        domain.polygon.forEach(([x, y]) => {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        });
      }
    });
    
    // Check baseline positions
    Object.values(this.nucleotidesBySeqid).forEach(nuc => {
      if (nuc.baseline) {
        minX = Math.min(minX, nuc.baseline.start, nuc.baseline.end);
        maxX = Math.max(maxX, nuc.baseline.start, nuc.baseline.end);
      }
      // Check nucleotide region bounds
      if (nuc.start !== undefined && nuc.end !== undefined) {
        minX = Math.min(minX, nuc.start, nuc.end);
        maxX = Math.max(maxX, nuc.start, nuc.end);
      }
    });
    
    // Update global bounds if valid values found
    if (isFinite(minX) && isFinite(maxX)) {
      this.globalMin = minX;
      this.globalMax = maxX;
    }
  }

  // Method to apply domain colors using a color palette
  applyDomainPalette(paletteConfig = null) {
    if (!paletteConfig || !paletteConfig.enabled) {
      // Do not apply any fallback colors if no palette is passed
      return;
    }

    // Collect all unique domain names
    const domainNames = new Set();
    for (const geneId in this.genesById) {
      const gene = this.genesById[geneId];
      for (const domain of gene.domains) {
        domainNames.add(domain.domainName);
      }
    }

    const sortedDomainNames = Array.from(domainNames).sort();
    let domainColors = [];

    // Try to use palette if available
    if (paletteConfig.name) {
      try {
        const { getPaletteColors } = require('../utils/colorPalettes');
        domainColors = getPaletteColors(
          paletteConfig.name,
          Math.max(sortedDomainNames.length, paletteConfig.numColors || sortedDomainNames.length),
          paletteConfig.reverse || false
        );
      } catch (error) {
        domainColors = [];
      }
    }

    // Create domain name to color mapping
    const domainColorMap = {};
    sortedDomainNames.forEach((domainName, i) => {
      domainColorMap[domainName] = domainColors[i % domainColors.length];
    });

    // Apply colors to all domains
    for (const geneId in this.genesById) {
      const gene = this.genesById[geneId];
      for (const domain of gene.domains) {
        domain.fillColor = domainColorMap[domain.domainName] || [128, 128, 128, 255];
      }
    }
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
