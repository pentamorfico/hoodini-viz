import Gene from './Gene';
import Domain from './Domain';
import ProteinLink from './ProteinLink';
import NucleotideLink from './NucleotideLink';
import Nucleotide from './Nucleotide';
import Hood from './Hood';
import NonCodingFeature from './NonCodingFeature';
import RegionFeature from './RegionFeature';
import { DEFAULT_CONFIG } from '../config/visualizationConfig';
import { getPaletteColors } from '../utils/colorPalettes';
import { memoGetPalette } from '../utils/paletteCache';
import { isEmptyValue, normalizeKey } from '@/utils/valueUtils';

class GenomeView {
  constructor(leaves, tree, config = DEFAULT_CONFIG) {
    this.leaves = leaves; // hood_ids
    this.tree = tree;
    this.config = config || DEFAULT_CONFIG;

    // Core stores
    this.featuresBySeqid = {};
    this.genesById = {};
    this.ncRNAsById = {};
    this.regionsById = {};
    this.nucleotidesBySeqid = {};

    // Layout/global
    this.globalMin = Infinity;
    this.globalMax = -Infinity;
    this.geneHeight = this.config?.gene?.height || DEFAULT_CONFIG.gene.height;

    // Tracks transforms
    this.trackFlipped = {}; // hood_id -> bool
    this.trackOffset  = {}; // hood_id -> offset
    this.hoodRanges = {}; // hood_id -> { seqid, origStart, origEnd, start, end, length, align_gene }

    // Mappings hood<->seqid
    this.hoodToSeqidMap = {}; // hood_id -> seqid
    this.seqidToHoodsMap = {}; // seqid -> [hood_id, ...]

    // Links
    this.proteinLinks = [];
    this.nucleotideLinks = [];

    // Domains
    this.domainsByGene = {};

    // Caches / indexes (lazily filled)
    this._genesByOriginalId = new Map(); // originalGeneId -> [uniqueGeneId]
    this._genesIndexReady = false;

    this._leafIndex = null; // Map(hood_id -> idx)
    this._hoodIndex = null; // Map(seqid -> [{start,end,hood_id}] sorted by start)
    this._regionsByHood = null; // Map(hood_id -> [RegionFeature])
    this._rightmostByHood = new Map(); // hood_id -> rightmost x
  // Internal palette version counter used as a change signal when stored
  // gene color state is mutated (bumped whenever colors are cleared or applied)
  this._paletteVersion = 0;
  }

  // ---------- helpers: indexes / caches ----------

  _ensureLeafIndex() {
    if (this._leafIndex) return;
    if (!this.tree?.leafNodes) {
      this._leafIndex = new Map();
      return;
    }
    this._leafIndex = new Map(this.tree.leafNodes.map((n, i) => [n.name, i]));
  }

  _buildGeneIndex() {
    this._genesByOriginalId = new Map();
    for (const [uid, g] of Object.entries(this.genesById)) {
      const og = g.originalGeneId;
      if (!og) continue;
      if (!this._genesByOriginalId.has(og)) this._genesByOriginalId.set(og, []);
      this._genesByOriginalId.get(og).push(uid);
    }
    this._genesIndexReady = true;
  }

  _addOrUpdateGeneIndex(uniqueId, gene) {
    if (!gene?.originalGeneId) return;
    if (!this._genesByOriginalId.has(gene.originalGeneId)) {
      this._genesByOriginalId.set(gene.originalGeneId, []);
    }
    this._genesByOriginalId.get(gene.originalGeneId).push(uniqueId);
    this._genesIndexReady = true;
  }

  _invalidateGeneIndex() {
    this._genesIndexReady = false;
  }

  _rebuildRegionsByHood() {
    this._regionsByHood = new Map();
    for (const region of Object.values(this.regionsById)) {
      if (!this._regionsByHood.has(region.hood_id)) this._regionsByHood.set(region.hood_id, []);
      this._regionsByHood.get(region.hood_id).push(region);
    }
  }

  _buildHoodIntervalIndex() {
    this._hoodIndex = new Map(); // seqid -> [{start,end,hood_id}] sorted by start
    for (const [hood_id, bl] of Object.entries(this.hoodRanges || {})) {
      const arr = this._hoodIndex.get(bl.seqid) || [];
      arr.push({ start: bl.origStart, end: bl.origEnd, hood_id });
      this._hoodIndex.set(bl.seqid, arr);
    }
    for (const arr of this._hoodIndex.values()) arr.sort((a, b) => a.start - b.start);
  }

  _queryHoodsCovering(seqid, qStart, qEnd) {
    const arr = this._hoodIndex?.get(seqid) || [];
    // binary search first item with start > qStart
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].start <= qStart) lo = mid + 1; else hi = mid;
    }
    const out = [];
    // scan to left while start <= qStart
    for (let i = lo - 1; i >= 0 && arr[i].start <= qStart; --i) {
      if (arr[i].end >= qEnd) out.push(arr[i].hood_id);
    }
    // scan to right while start <= qStart
    for (let i = lo; i < arr.length && arr[i].start <= qStart; ++i) {
      if (arr[i].end >= qEnd) out.push(arr[i].hood_id);
    }
    return out;
  }

  // ---------- geometry helpers (unique) ----------

  static flipCoordinate(x, anchor) {
    return 2 * anchor - x;
  }

  static getTransformedXUnified(x, anchor, offset, flipped) {
    let shifted = x + (offset || 0);
    if (flipped) return GenomeView.flipCoordinate(shifted, anchor);
    return shifted;
  }

  static getGeneVisualX(gene, genomeView) {
    const hood_id = gene.hood_id;
    const hoodRange = genomeView.hoodRanges[hood_id];
    if (!hoodRange) return null;

    const offset = genomeView.trackOffset[hood_id] || 0;
    const flipped = !!genomeView.trackFlipped[hood_id];
    const anchor = (hoodRange.length || 0) / 2;

    const xScalePercent = (genomeView.config.genome && typeof genomeView.config.genome.xScalePercent === 'number')
      ? genomeView.config.genome.xScalePercent : 100;
    const xScale = xScalePercent / 100;

    const geneStartHood = gene.origStart || 0;
    const geneEndHood = gene.origEnd || 0;

    const alignmentPoint = (gene.origStrand === '+')
      ? Math.min(geneStartHood, geneEndHood)
      : Math.max(geneStartHood, geneEndHood);

    const transformedX = GenomeView.getTransformedXUnified(alignmentPoint, anchor, offset, flipped);
    const scaledX = anchor + (transformedX - anchor) * xScale;
    return scaledX;
  }

  // ---------- data ingestion ----------

  addFeatures(gffFeatures) {
    for (let f of gffFeatures) {
      if (!f.seqid || typeof f.start !== 'number' || isNaN(f.start) || typeof f.end !== 'number' || isNaN(f.end)) {
        
        continue;
      }
      if (!this.featuresBySeqid[f.seqid]) {
        this.featuresBySeqid[f.seqid] = [];
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

      if (!this.nucleotidesBySeqid[f.seqid]) {
        const feats = this.featuresBySeqid[f.seqid];
        const minStart = Math.min(...feats.map(ff => typeof ff.start === 'bigint' ? Number(ff.start) : ff.start));
        const maxEnd   = Math.max(...feats.map(ff => typeof ff.end   === 'bigint' ? Number(ff.end)   : ff.end));
        const strandFeature = feats.find(ff => ff.type === 'gene' || ff.type === 'CDS');
        const strand = (strandFeature && strandFeature.strand) ? strandFeature.strand : '+';
        this.nucleotidesBySeqid[f.seqid] = new Nucleotide(f.seqid, minStart, maxEnd, strand);
      }
    }
  }

  initGenes() {
    // any new genes invalidate index
    this._invalidateGeneIndex();

    for (let hood_id of this.leaves) {
      const seqid = this.hoodToSeqidMap[hood_id];
      if (!seqid) continue;

      const hoodRange = this.hoodRanges[hood_id];
      if (!hoodRange) continue;

      const hoodStart = hoodRange.origStart || 0;
      const hoodEnd   = hoodRange.origEnd || 0;

      const feats = this.featuresBySeqid[seqid] || [];
      for (let f of feats) {
        if (f.type === 'gene' || f.type === 'CDS') {
          const fStart = f.start || 0;
          const fEnd = f.end || 0;
          const geneCompletelyWithinHood = (fStart >= hoodStart && fEnd <= hoodEnd);
          if (!geneCompletelyWithinHood) continue;

          const adjustedStart = fStart - hoodStart;
          const adjustedEnd   = fEnd   - hoodStart;

          // PRIORITIZE EXPLICIT ID FIELDS OVER ATTRIBUTES
          // This matches the logic used in the data loading/table (HoodiniDashboard getGeneKey)
          let originalGeneId = f.gene_id || f.id || f.protein_id || f.originalGeneId;
          
          if (!originalGeneId && f.attributes) {
             originalGeneId = this.getGeneIdFromAttributes(f.attributes);
          }
          // If still no ID, fallback to something unique? Or skip? 
          // Existing code might rely on it being null if not found.
          
          const uniqueGeneId = `${hood_id}_${originalGeneId}`;

          let g = new Gene(f.seqid, adjustedStart, adjustedEnd, f.strand, f.attributes, this.config);
          g.hood_id = hood_id;
          g.originalGeneId = originalGeneId;
          this.genesById[uniqueGeneId] = g;

          this._addOrUpdateGeneIndex(uniqueGeneId, g);

          if (this.nucleotidesBySeqid[seqid]) {
            this.nucleotidesBySeqid[seqid].addGene(g);
          }
    } else if (typeof f.type === 'string' && f.type.toLowerCase().includes('ncrna')) {
          const fStartNc = f.start || 0;
          const fEndNc = f.end || 0;
          const within = (fStartNc >= hoodStart && fEndNc <= hoodEnd);
          if (!within) continue;
          const adjustedStart = fStartNc - hoodStart;
          const adjustedEnd   = fEndNc   - hoodStart;
          const originalId = this.getGeneIdFromAttributes(f.attributes);
          // Use coordinates in uniqueId to avoid collisions when multiple ncRNAs have same ID (e.g., all "tracrRNA")
          const uniqueId = `${hood_id}_${originalId}_${fStartNc}_${fEndNc}`;
      let nc = new NonCodingFeature(f.seqid, adjustedStart, adjustedEnd, f.strand, f.type, f.attributes, this.config);
              nc.hood_id = hood_id;
              nc.id = uniqueId; // Unique ID for tracking
              nc.originalId = originalId;
              // origStart/origEnd: RELATIVE to hood (for visualization/transforms)
              nc.origStart = adjustedStart;
              nc.origEnd = adjustedEnd;
              // genomicStart/genomicEnd: ABSOLUTE genome coordinates (for metadata matching)
              nc.genomicStart = fStartNc;
              nc.genomicEnd = fEndNc;
              nc.origStrand = f.strand;
              // Normalize ncRNA subtype / display name from attributes (prefer attributes.ncrna_type then ID)
              let ncrnaType = null;
              try {
                const attrs = f.attributes || {};
                if (attrs && typeof attrs === 'object') {
                  ncrnaType = attrs.ncrna_type || attrs.ncrnaType || attrs.ID || attrs.id || attrs.Name || null;
                }
                if (typeof ncrnaType === 'object') ncrnaType = String(ncrnaType);
                if (ncrnaType) ncrnaType = String(ncrnaType).replace(/^ID=/, '').replace(/;$/, '').trim();
                // Treat "null", "none", empty strings as null
                if (ncrnaType && (ncrnaType.toLowerCase() === 'null' || ncrnaType.toLowerCase() === 'none' || ncrnaType === '')) {
                  ncrnaType = null;
                }
              } catch (e) {
                ncrnaType = null;
              }
              // Set a simple name and metadata.type so UI/legend/coloring sees a primitive string
              // Use f.type (e.g. 'ncRNA') as fallback to avoid "null" appearing in legend
              const effectiveType = ncrnaType || originalId || f.type || 'ncRNA';
              nc.name = effectiveType;
              if (!nc.metadata || typeof nc.metadata !== 'object') nc.metadata = {};
              nc.metadata.type = effectiveType;
              // Keep attributes accessible under metadata.attributes for downstream consumers
              nc.metadata.attributes = f.attributes;
              this.ncRNAsById[uniqueId] = nc;
        } else if (f.type === 'region') {
          const fStartReg = f.start || 0;
          const fEndReg = f.end || 0;
          const within = (fStartReg >= hoodStart && fEndReg <= hoodEnd);
          if (!within) continue;
          const adjustedStart = fStartReg - hoodStart;
          const adjustedEnd   = fEndReg   - hoodStart;
          const originalId = this.getGeneIdFromAttributes(f.attributes);
          const uniqueId = `${hood_id}_${originalId}`;
          let region = new RegionFeature(f.seqid, adjustedStart, adjustedEnd, f.strand, f.type, f.attributes, this.config);
          region.id = uniqueId; // Unique ID for tracking
          region.hood_id = hood_id;
          region.originalId = originalId;
          region.origStart = adjustedStart;
          region.origEnd = adjustedEnd;
          region.origStrand = f.strand;
          this.regionsById[uniqueId] = region;
        }
      }
    }
  }

  getGeneIdFromAttributes(attrs) {
    if (typeof attrs === 'string') {
      const match = attrs.match(/ID=([^;]+)/);
      return match ? match[1] : null;
    } else if (typeof attrs === 'object' && attrs !== null) {
      return attrs.ID || null;
    }
    return null;
  }

  // ---------- transforms ----------

  computeTrackPositions() {
    let processedGenes = 0;
    let processedNcRNAs = 0;

    // group once
    const genesByHood = {};
    const ncRNAsByHood = {};
    for (const gene of Object.values(this.genesById)) {
      (genesByHood[gene.hood_id] ||= []).push(gene);
    }
    for (const nc of Object.values(this.ncRNAsById)) {
      (ncRNAsByHood[nc.hood_id] ||= []).push(nc);
    }

    // regions pre-group
    this._rebuildRegionsByHood();

    // x scale
    const xScalePercent = (this.config.genome && typeof this.config.genome.xScalePercent === 'number')
      ? this.config.genome.xScalePercent : 100;
    const xScale = xScalePercent / 100;

    this._rightmostByHood.clear();

    for (let hood_id of this.leaves) {
      const leafNode = this.tree.leafNodes.find(d => d.name === hood_id);
      if (!leafNode) continue;

      // Use the layout Y coordinate (stored in leafNode.x) so genome tracks align with the tree rows
      const treeY = (typeof leafNode?.x === 'number') ? leafNode.x : (leafNode?.y || 0);
      const trackY = treeY + (this.config?.layout?.geneOffset || 0);
      const seqid = this.hoodToSeqidMap[hood_id];
      if (!seqid) continue;

      const nuc = this.nucleotidesBySeqid[seqid];
      const offset = this.trackOffset[hood_id] || 0;
      const hoodRange = this.hoodRanges[hood_id];
      const hoodLength = hoodRange?.length || 0;
      const anchor = hoodLength / 2;
      const flipped = !!this.trackFlipped[hood_id];

      let rightmostX = -Infinity;

      // genes
      const hoodGenes = genesByHood[hood_id] || [];
      for (const gene of hoodGenes) {
        gene.trackY = trackY;
        gene.geneHeight = this.geneHeight;

        const geneStartHood = gene.origStart || 0;
        const geneEndHood = gene.origEnd || 0;

        let startX = GenomeView.getTransformedXUnified(geneStartHood, anchor, offset, flipped);
        let endX   = GenomeView.getTransformedXUnified(geneEndHood,   anchor, offset, flipped);
        startX = anchor + (startX - anchor) * xScale;
        endX   = anchor + (endX   - anchor) * xScale;

        gene.start = startX;
        gene.end   = endX;
        gene.strand = flipped ? (gene.origStrand === '+' ? '-' : '+') : gene.origStrand;

        // Debug: log first few gene coordinate updates
        if (['gene_1', 'gene_2'].includes(gene.id) || gene.originalGeneId?.includes('gene_1') || gene.originalGeneId?.includes('gene_2')) {
          
        }

        rightmostX = Math.max(rightmostX, startX, endX);

        // Domains compute their polygons from original domain coords and the
        // visual gene polygon/centerLine. Update each domain's polygon now that
        // gene polygon/centerLine/strand are up-to-date.
        for (let d of gene.domains) {
          d.updatePolygon();
        }
        gene.updatePolygon();
        processedGenes++;
      }

      // ncRNAs
      const hoodNcRNAs = ncRNAsByHood[hood_id] || [];
      for (const nc of hoodNcRNAs) {
        nc.trackY = trackY;
        nc.featureHeight = this.geneHeight;

        const ncStartHood = nc.origStart || 0;
        const ncEndHood   = nc.origEnd || 0;

        let startX = GenomeView.getTransformedXUnified(ncStartHood, anchor, offset, flipped);
        let endX   = GenomeView.getTransformedXUnified(ncEndHood,   anchor, offset, flipped);
        startX = anchor + (startX - anchor) * xScale;
        endX   = anchor + (endX   - anchor) * xScale;

        nc.start = startX;
        nc.end   = endX;
        nc.strand = flipped ? (nc.origStrand === '+' ? '-' : '+') : nc.origStrand;
        nc.updatePolygon();

        rightmostX = Math.max(rightmostX, startX, endX);
        processedNcRNAs++;
      }

      // regions
      const hoodRegions = this._regionsByHood?.get(hood_id) || [];
      for (const region of hoodRegions) {
        region.trackY = trackY;
        const regionStartHood = region.origStart || 0;
        const regionEndHood   = region.origEnd || 0;

        let startX = GenomeView.getTransformedXUnified(regionStartHood, anchor, offset, flipped);
        let endX   = GenomeView.getTransformedXUnified(regionEndHood,   anchor, offset, flipped);
        startX = anchor + (startX - anchor) * xScale;
        endX   = anchor + (endX   - anchor) * xScale;

        region.start = startX;
        region.end   = endX;
        region.strand = flipped ? (region.origStrand === '+' ? '-' : '+') : region.origStrand;

        const genesInRegion = hoodGenes.filter(gene => region.containsGene(gene));
        region.updatePolygon(genesInRegion, trackY);

        rightmostX = Math.max(rightmostX, startX, endX);
      }

      // Baseline and nucleotide region
      if (nuc && nuc.hood) {
        const baseStartHood = 0;
        const baseEndHood   = hoodRange ? (hoodRange.length || 0)
                                           : ((nuc.hood.origEnd || 0) - (nuc.hood.origStart || 0));
        let baseStart = GenomeView.getTransformedXUnified(baseStartHood, anchor, offset, flipped);
        let baseEnd   = GenomeView.getTransformedXUnified(baseEndHood,   anchor, offset, flipped);
        baseStart = anchor + (baseStart - anchor) * xScale;
        baseEnd   = anchor + (baseEnd   - anchor) * xScale;
        nuc.hood.start = baseStart;
        nuc.hood.end   = baseEnd;

        rightmostX = Math.max(rightmostX, baseStart, baseEnd);
      }
      if (nuc) {
        let regionStart = GenomeView.getTransformedXUnified(0, anchor, offset, flipped);
        let regionEnd   = GenomeView.getTransformedXUnified(hoodRange ? (hoodRange.length || 0) : 0, anchor, offset, flipped);
        regionStart = anchor + (regionStart - anchor) * xScale;
        regionEnd   = anchor + (regionEnd   - anchor) * xScale;
        nuc.start = regionStart;
        nuc.end   = regionEnd;

        rightmostX = Math.max(rightmostX, regionStart, regionEnd);
      }

      if (isFinite(rightmostX)) this._rightmostByHood.set(hood_id, rightmostX);
    }

    this.updateLinkPositions();
    this.updateGlobalBounds();
  }

  // ---------- bounds ----------

  updateGlobalBounds() {
    let minX = Infinity;
    let maxX = -Infinity;
    let minGene = null;
    let maxGene = null;

    // Build sets of valid hood_ids and seqids to filter out orphan data
    // Only include entities that belong to hoods in this.leaves
    // If leaves is empty, include everything (no filtering)
    const hasLeafFilter = this.leaves && this.leaves.length > 0;
    const validHoodIds = hasLeafFilter ? new Set(this.leaves.map(id => String(id))) : null;
    const validSeqids = hasLeafFilter ? new Set() : null;
    if (hasLeafFilter) {
      for (const hoodId of validHoodIds) {
        const seqid = this.hoodToSeqidMap[hoodId];
        if (seqid) validSeqids.add(seqid);
      }
    }

    // genes - only filter if we have a valid leaf filter
    for (const gene of Object.values(this.genesById)) {
      // Skip genes not in valid hoods (only if filter is active)
      if (validHoodIds && gene.hood_id && !validHoodIds.has(String(gene.hood_id))) continue;
      
      if (gene.polygon) {
        for (const [x] of gene.polygon) {
          if (x < minX) { minX = x; minGene = gene; }
          if (x > maxX) { maxX = x; maxGene = gene; }
        }
      } else if (gene.start !== undefined && gene.end !== undefined) {
        if (gene.start < minX) { minX = gene.start; minGene = gene; }
        if (gene.end < minX) { minX = gene.end; minGene = gene; }
        if (gene.start > maxX) { maxX = gene.start; maxGene = gene; }
        if (gene.end > maxX) { maxX = gene.end; maxGene = gene; }
      }
    }

    // ncRNAs - only filter if we have a valid leaf filter
    for (const nc of Object.values(this.ncRNAsById)) {
      // Skip ncRNAs not in valid hoods (only if filter is active)
      if (validHoodIds && nc.hood_id && !validHoodIds.has(String(nc.hood_id))) continue;
      
      if (nc.polygon) {
        for (const [x] of nc.polygon) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
      } else if (nc.start !== undefined && nc.end !== undefined) {
        minX = Math.min(minX, nc.start, nc.end);
        maxX = Math.max(maxX, nc.start, nc.end);
      }
    }

    // domains - only filter if we have a valid leaf filter
    for (const domain of this.getAllDomains()) {
      const parentGene = domain.parentGene;
      if (validHoodIds && parentGene?.hood_id && !validHoodIds.has(String(parentGene.hood_id))) continue;
      
      const poly = domain.polygon;
      if (!poly) continue;
      for (const [x] of poly) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
    }

    // nucleotides (baseline) are excluded from bounds to avoid offset/flip skew;
    // bounds are driven by genes/domains only.

    if (isFinite(minX) && isFinite(maxX)) {
      this.globalMin = minX;
      this.globalMax = maxX;
    }
  }

  // ---------- links ----------

  updateLinkPositions() {
    // Nucleotide link raw coords are preserved; rendering uses hood-relative
    for (let l of this.nucleotideLinks) {
      l.startA = l.origStartA;
      l.endA   = l.origEndA;
      l.startB = l.origStartB;
      l.endB   = l.origEndB;
    }
  }

  addDomains(domainsByGene) {
    this.domainsByGene = domainsByGene;
    this._cachedAllDomains = undefined; // Invalidate cache
    if (!this._genesIndexReady) this._buildGeneIndex();

    for (const originalGeneId in domainsByGene) {
      const matchingUniqueIds = this._genesByOriginalId.get(originalGeneId) || [];
      
      for (const uniqueId of matchingUniqueIds) {
        const gene = this.genesById[uniqueId];
        if (!gene) continue;

        for (let d of domainsByGene[originalGeneId]) {
          const hoodRange = this.hoodRanges[gene.hood_id];
          // Domain coordinates are relative to gene start, not absolute genomic coordinates
          // So we don't need to adjust them by baseline - the gene coordinates are already adjusted
          let dom = new Domain(uniqueId, d.domainName, d.start, d.end, d.source, d.evalue, d.coverage);
          gene.addDomain(dom);
        }

        if (!gene.metadata) gene.metadata = {};
        gene.metadata.domainsSummary = (gene.domains && gene.domains.length > 0)
          ? gene.domains.map(dom => `${dom.domainName}(${dom.start}-${dom.end})`).join(';')
          : '';
      }
    }
  }

  addDomainMetadata(domainMetadata) {
    if (!domainMetadata) return;
    this._cachedAllDomains = undefined; // Invalidate cache
    
    // Convert array format to keyed object if needed
    let metadataMap = domainMetadata;
    if (Array.isArray(domainMetadata)) {
      metadataMap = {};
      for (const entry of domainMetadata) {
        // Try multiple possible key fields
        const key = entry.domain_id || entry.domain || entry.domainName || entry.domain_name || entry.id;
        if (key) {
          metadataMap[key] = entry;
        }
      }
    }
    
    let attachedCount = 0;
    let attemptedCount = 0;
    
    // Iterate through all genes and their domains
    for (const geneId in this.genesById) {
      const gene = this.genesById[geneId];
      if (!gene.domains || gene.domains.length === 0) continue;
      
      for (const domain of gene.domains) {
        attemptedCount++;
        const domainId = domain.domainName; // e.g., "PF03773"
        
        // Try to find metadata for this domain
        const metadata = metadataMap[domainId];
        if (metadata) {
          domain.metadata = { ...domain.metadata, ...metadata };
          attachedCount++;
        }
      }
    }
    
    // Log attachment stats
  }

  addProteinLinks(links, color = [50, 100, 220], adjacencyN = Infinity) {
    if (!this._genesIndexReady) this._buildGeneIndex();
    this._ensureLeafIndex();

    this.proteinLinks.length = 0;
    const seen = new Set(); // de-dup uidA|uidB

    for (let l of links) {
      let originalGeneIdA, originalGeneIdB, similarity;
      if (Array.isArray(l)) {
        originalGeneIdA = l[0]; originalGeneIdB = l[1]; similarity = l[2];
      } else if (l && typeof l === 'object') {
        originalGeneIdA = l.geneA ?? l.gAId;
        originalGeneIdB = l.geneB ?? l.gBId;
        similarity = l.score ?? l.similarity;
      }

      const genesA = this._genesByOriginalId.get(originalGeneIdA) || [];
      const genesB = this._genesByOriginalId.get(originalGeneIdB) || [];

      for (const uidA of genesA) {
        for (const uidB of genesB) {
          const gA = this.genesById[uidA];
          const gB = this.genesById[uidB];
          if (!gA || !gB) continue;

          const ia = this._leafIndex.get(gA.hood_id);
          const ib = this._leafIndex.get(gB.hood_id);

          if (ia == null || ib == null || Math.abs(ia - ib) <= adjacencyN) {
            const key = uidA < uidB ? `${uidA}|${uidB}` : `${uidB}|${uidA}`;
            if (seen.has(key)) continue;
            seen.add(key);
            this.proteinLinks.push(new ProteinLink(uidA, uidB, similarity, color));
          }
        }
      }
    }
  }

  addNucleotideLinks(links, color = [220, 50, 50], adjacencyN = Infinity) {
    if (!this._hoodIndex) this._buildHoodIntervalIndex();
    this._ensureLeafIndex();

    this.nucleotideLinks.length = 0;

    for (let l of links) {
      const { seqidA, seqidB, startA, endA, startB, endB, similarity } = l;

      const hoodsA = this._queryHoodsCovering(seqidA, startA, endA);
      const hoodsB = this._queryHoodsCovering(seqidB, startB, endB);

      for (const hoodA of hoodsA) {
        const blA = this.hoodRanges[hoodA];
        if (!blA) continue;
        for (const hoodB of hoodsB) {
          const blB = this.hoodRanges[hoodB];
          if (!blB) continue;

          const ia = this._leafIndex.get(hoodA);
          const ib = this._leafIndex.get(hoodB);
          if (ia == null || ib == null || Math.abs(ia - ib) <= adjacencyN) {
            const link = new NucleotideLink(seqidA, startA, endA, seqidB, startB, endB, similarity, color);
            link.hoodA = hoodA; link.hoodB = hoodB;
            link.hoodStartA = startA - blA.origStart; link.hoodEndA = endA - blA.origStart;
            link.hoodStartB = startB - blB.origStart; link.hoodEndB = endB - blB.origStart;
            this.nucleotideLinks.push(link);
          }
        }
      }
    }
  }

  // ---------- coloring ----------

  applyProteinLinkColors(colorConfig, defaultGeneColor = null) {
    if (!this.proteinLinks?.length) return;

    let paletteColors = null;
    if (colorConfig?.colorBy === 'identity_gradient' && colorConfig?.palette?.enabled) {
      try {
        paletteColors = memoGetPalette(
          colorConfig.palette.name,
          colorConfig.palette.numColors,
          colorConfig.palette.reverse
        );
      } catch {
        paletteColors = null;
      }
    }

    for (const link of this.proteinLinks) {
      const geneA = this.genesById[link.gAId];
      const geneB = this.genesById[link.gBId];

      // Use gene's fillColor if available, otherwise fall back to defaultGeneColor
      const sourceGeneColor = (colorConfig?.colorBy === 'source_gene') 
        ? (geneA?.fillColor || defaultGeneColor) 
        : null;
      const targetGeneColor = (colorConfig?.colorBy === 'target_gene') 
        ? (geneB?.fillColor || defaultGeneColor) 
        : null;

      let paletteColor = null;
      if (colorConfig?.colorBy === 'identity_gradient' && paletteColors) {
        const normalized = Math.max(0, Math.min(1, link.similarity / 100));
        const idx = Math.floor(normalized * (paletteColors.length - 1));
        paletteColor = paletteColors[idx];
      }

      link.updateColor(colorConfig, sourceGeneColor, targetGeneColor, paletteColor, defaultGeneColor);
    }
  }

  applyNucleotideLinkColors(colorConfig) {
    if (!this.nucleotideLinks?.length) return;

    let paletteColors = null;
    if (colorConfig?.colorBy === 'identity_gradient' && colorConfig?.palette?.enabled) {
      try {
        paletteColors = memoGetPalette(
          colorConfig.palette.name,
          colorConfig.palette.numColors,
          colorConfig.palette.reverse
        );
      } catch {
        paletteColors = null;
      }
    }

    for (const link of this.nucleotideLinks) {
      let paletteColor = null;
      if (colorConfig?.colorBy === 'identity_gradient' && paletteColors) {
        const normalized = Math.max(0, Math.min(1, link.similarity / 100));
        const idx = Math.floor(normalized * (paletteColors.length - 1));
        paletteColor = paletteColors[idx];
      }
      link.updateColor(colorConfig, paletteColor);
    }
  }

  // ---------- readouts ----------

  getTrackY(seqid) {
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
    const filteredGenes = Object.values(this.genesById).filter(g =>
      leavesSet.has(g.hood_id || this.getHoodIdFromSeqid(g.seqid))
    );
    const filteredProtein = this.getProteinPolygons().filter(p =>
      p.seqids ? p.seqids.every(s => leavesSet.has(this.getHoodIdFromSeqid(s))) : true
    );
    const filteredNucleotide = this.getNucleotidePolygons().filter(p =>
      p.seqids.every(s => leavesSet.has(this.getHoodIdFromSeqid(s)))
    );
    const filteredDomains = this.getAllDomains().filter(d => {
      const gid = d.geneId ? this.genesById[d.geneId] : null;
      const hood = gid?.hood_id || this.getHoodIdFromSeqid(gid?.seqid);
      return hood ? leavesSet.has(hood) : true;
    });
    const filteredNcRNAs = Object.values(this.ncRNAsById).filter(nc =>
      leavesSet.has(nc.hood_id || this.getHoodIdFromSeqid(nc.seqid))
    );
    return { genes: filteredGenes, proteinPolygons: filteredProtein, nucleotidePolygons: filteredNucleotide, domains: filteredDomains, ncRNAs: filteredNcRNAs };
  }

  getProteinPolygons() {
    const polys = [];
    for (let pl of this.proteinLinks) {
      const gA = this.genesById[pl.gAId];
      const gB = this.genesById[pl.gBId];
      if (!gA || !gB) continue;
      const poly = pl.buildPolygon(gA, gB);
      if (poly) polys.push({ polygon: poly, fillColor: pl.fillColor, metadata: pl.metadata });
    }
    return polys;
  }

  getNucleotidePolygons() {
    const polys = [];

    const xScalePercent = (this.config.genome && typeof this.config.genome.xScalePercent === 'number')
      ? this.config.genome.xScalePercent : 100;
    const xScale = xScalePercent / 100;

    const trackInfo = {};
    for (let hood_id of this.leaves) {
      const seqid = this.hoodToSeqidMap[hood_id];
      if (!seqid) continue;
      const hoodRange = this.hoodRanges[hood_id];
      const offset = this.trackOffset[hood_id] || 0;
      const flipped = !!this.trackFlipped[hood_id];
      const anchor = hoodRange ? (hoodRange.length || 0) / 2 : 0;
      trackInfo[hood_id] = { anchor, flipped, offset, xScale };
    }

    for (let l of this.nucleotideLinks) {
      const hoodA = l.hoodA;
      const hoodB = l.hoodB;
      if (!hoodA || !hoodB) continue;

      const trackYA = this.getTrackYByHoodId(hoodA);
      const trackYB = this.getTrackYByHoodId(hoodB);
      if (trackYA == null || trackYB == null) continue;

      const infoA = trackInfo[hoodA];
      const infoB = trackInfo[hoodB];
      if (!infoA || !infoB) continue;

      let xA1 = GenomeView.getTransformedXUnified(l.hoodStartA || 0, infoA.anchor, infoA.offset, infoA.flipped);
      let xA2 = GenomeView.getTransformedXUnified(l.hoodEndA || 0,   infoA.anchor, infoA.offset, infoA.flipped);
      let xB1 = GenomeView.getTransformedXUnified(l.hoodStartB || 0, infoB.anchor, infoB.offset, infoB.flipped);
      let xB2 = GenomeView.getTransformedXUnified(l.hoodEndB || 0,   infoB.anchor, infoB.offset, infoB.flipped);

      xA1 = infoA.anchor + (xA1 - infoA.anchor) * infoA.xScale;
      xA2 = infoA.anchor + (xA2 - infoA.anchor) * infoA.xScale;
      xB1 = infoB.anchor + (xB1 - infoB.anchor) * infoB.xScale;
      xB2 = infoB.anchor + (xB2 - infoB.anchor) * infoB.xScale;

      const poly = l.buildPolygonFromCoords(xA1, xA2, xB1, xB2, trackYA, trackYB);
      polys.push({ polygon: poly, fillColor: l.fillColor, metadata: l.metadata, seqids: [l.seqidA, l.seqidB] });
    }
    return polys;
  }

  getAllDomains() {
    // 🚀 PERFORMANCE: Cache domains list to avoid O(n) iteration on every call
    if (this._cachedAllDomains !== undefined) {
      return this._cachedAllDomains;
    }
    
  const alld = [];
  let totalDomains = 0;
  let validDomains = 0;
    for (const gId in this.genesById) {
      const g = this.genesById[gId];
      for (let d of g.domains) {
    totalDomains++;
        let poly = d.polygon;
        if (Array.isArray(poly) && poly.length === 1 && Array.isArray(poly[0])) {
          poly = poly[0];
        }

        if (isValidPolygon(poly)) {
          validDomains++;
          alld.push({ polygon: poly, fillColor: d.fillColor, domainName: d.domainName, metadata: d.metadata, geneId: d.geneId });
        }
      }
    }
    try {
      if (typeof window !== 'undefined' && window.__hoodini_debug) {
        console.debug(`GenomeView.getAllDomains: total=${totalDomains}, valid=${validDomains}`);
      }
    } catch (e) {}
    
    // Cache the result
    this._cachedAllDomains = alld;
    return alld;
  }

  getAllNcRNAs() { return Object.values(this.ncRNAsById); }
  getAllRegions() { 
    return Object.values(this.regionsById);
  }

  // Backwards-compatible alias: some components call getAllNonCodingFeatures()
  // Keep this as a simple delegating wrapper to avoid missing-method errors
  getAllNonCodingFeatures() { return this.getAllNcRNAs(); }

  getRegionPolygons() {
    const all = [];
    for (const region of Object.values(this.regionsById)) {
      if (region.polygon && Array.isArray(region.polygon) && region.polygon.length > 0) {
        all.push({
          polygon: region.polygon,
          fillColor: region.getFillColor(),
          strokeColor: region.getStrokeColor(),
          strokeWidth: region.strokeWidth,
          metadata: region.metadata
        });
      }
    }
    return all;
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
    const scaleBarOffset = this.config?.layout?.scaleBarOffset ?? this.config?.layout?.padding ?? 150;
    const SCALE_Y = (this.tree.leafNodes[this.tree.leafNodes.length - 1].x) + scaleBarOffset;
    return [[{ path: [[this.globalMin, SCALE_Y], [this.globalMax, SCALE_Y]], color: this.config?.colors?.black || [0, 0, 0, 255] }], SCALE_Y];
    }

  buildPhyloLabels(phyloLabelPosition = 'after-tree') {
    const labelOffset = this.config?.tree?.labelOffset || 10;
    const labelColor  = this.config?.colors?.black || [10, 10, 10, 255];
    const labelSize   = this.config?.text?.phyloLabelSize || 14;

    return this.tree.leafNodes.map(l => {
      let position;
      if (phyloLabelPosition === 'after-tracks') {
        const hood_id = l.name;
        let rightmostX = this._rightmostByHood.get(hood_id);
        if (!isFinite(rightmostX)) {
          rightmostX = l.y + labelOffset;
        } else {
          rightmostX += labelOffset;
        }
        position = [rightmostX, l.x];
      } else {
        position = [l.y + labelOffset, l.x];
      }
      return { position, text: l.name, color: labelColor, size: labelSize, textAnchor: 'start', leafNode: l };
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
        color = [0, 0, 0, 255];
      } else {
        const meta = n.metadata || {};
        if (meta[colorLeavesBy]) {
          const str = String(meta[colorLeavesBy]);
          let hash = 0;
          for (let i = 0; i < str.length; ++i) hash = str.charCodeAt(i) + ((hash << 5) - hash);
          const r = (hash >> 0) & 0xFF, g = (hash >> 8) & 0xFF, b = (hash >> 16) & 0xFF;
          color = [Math.abs(r), Math.abs(g), Math.abs(b), 255];
        } else {
          color = [100, 100, 100, 255];
        }
      }
      if (selectedNode && !isDesc) color = this.fadeColor(color, 0.1);
      return { id: n.id, node: n, position: [n.y, n.x], color, radius: n.branchset.length > 0 ? nodeRadius.internal : nodeRadius.leaf, metadata: n.metadata || { name: n.name, id: n.id } };
    });
  }

  buildEdgesWithMetadata() {
    return this.tree.buildEdges().map(e => ({
      ...e,
      metadata: { source: e.source?.name, target: e.target?.name, branchLength: e.source?.branchLength, id: e.source?.id }
    }));
  }

  fadeColor(color, factor) {
    return [color[0], color[1], color[2], Math.floor(color[3] * factor)];
  }

  // ---------- clusters / palettes ----------

  setProteinClusters(clusterMap) {
    if (!clusterMap || Object.keys(clusterMap).length === 0) {
      this.proteinClusters = {};
      // Invalidate cluster summary cache
      this._clusterSummary = null;
      return;
    }
    this.proteinClusters = {};
    if (!this._genesIndexReady) this._buildGeneIndex();

    // Use reverse index
    for (const originalGeneId of Object.keys(clusterMap)) {
      const cluster = clusterMap[originalGeneId];
      const normCluster = (cluster === undefined || cluster === null) ? null : String(cluster).trim();
      const ids = this._genesByOriginalId.get(originalGeneId) || [];
      for (const uid of ids) this.proteinClusters[uid] = normCluster;
    }

    // Invalidate cluster summary cache when clusters change
    this._clusterSummary = null;

    if (!this.clusterColors) return;

    const genesById = this.genesById;
    const clusterColors = this.clusterColors;

    for (const uniqueGeneId in genesById) {
      const gene = genesById[uniqueGeneId];
  const cluster = this.proteinClusters[uniqueGeneId];
  gene.fillColor = (cluster && clusterColors[cluster]) ? clusterColors[cluster] : null;
      if (!gene.metadata) gene.metadata = {};
  gene.metadata.clusterId = cluster || null;
    }
  }

  setProteinClustersWithPalette(clusterMap, paletteConfig = null) {
    this.proteinClusters = {};
    if (!this._genesIndexReady) this._buildGeneIndex();

    for (const originalGeneId in clusterMap) {
      const cluster = clusterMap[originalGeneId];
      const normCluster = (cluster === undefined || cluster === null) ? null : String(cluster).trim();
      const ids = this._genesByOriginalId.get(originalGeneId) || [];
      for (const uid of ids) this.proteinClusters[uid] = normCluster;
    }

    // Invalidate cluster summary cache when clusters change
    this._clusterSummary = null;

    // If palette disabled, clear any stored per-gene fillColor so renderers
    // fall back to default coloring. Bump _paletteVersion as a stable
    // signal for memo/trigger updates elsewhere.
    if (!paletteConfig || !paletteConfig.enabled) {
      for (const uniqueGeneId in this.genesById) {
        const gene = this.genesById[uniqueGeneId];
        if (gene && gene.fillColor) gene.fillColor = null;
      }
      this._paletteVersion++;
      return;
    }

    // Assign colors
    this.clusterColors = {};
  // Sort cluster IDs: numerically if all are numeric, otherwise alphabetically
  const clusterIds = Array.from(new Set(Object.values(this.proteinClusters)))
    .filter(id => id != null)
    .sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      // If both are valid numbers, sort numerically
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      // Otherwise sort as strings
      return String(a).localeCompare(String(b));
    });

    let clusterColors = [];
    if (paletteConfig.name) {
      try {
        clusterColors = memoGetPalette(
          paletteConfig.name,
          Math.max(clusterIds.length, paletteConfig.numColors || clusterIds.length),
          paletteConfig.reverse || false
        );
      } catch {
        clusterColors = [];
      }
    }
    if (clusterColors.length === 0) {
      clusterColors = clusterIds.map((cluster, i) => hslToRgb(i / clusterIds.length, 0.6, 0.5).concat(255));
    }
    clusterIds.forEach((cluster, i) => {
      this.clusterColors[cluster] = clusterColors[i % clusterColors.length];
    });

    // Apply desaturation by prevalence if enabled
    if (paletteConfig.desaturateByPrevalence) {
      const prevalenceMap = this.computeGenePrevalence('cluster');
      for (const cluster in this.clusterColors) {
        const prevalence = prevalenceMap.get(cluster) || 0;
        this.clusterColors[cluster] = this._desaturateColorByPrevalence(
          this.clusterColors[cluster], 
          prevalence
        );
      }
    }

  // Invalidate cluster summary cache
  this._clusterSummary = null;
    for (const uniqueGeneId in this.genesById) {
      const gene = this.genesById[uniqueGeneId];
  const cluster = this.proteinClusters[uniqueGeneId];
      gene.fillColor = (cluster && this.clusterColors[cluster]) ? this.clusterColors[cluster] : null;
      if (!gene.metadata) gene.metadata = {};
      gene.metadata.clusterId = cluster || null;
    }
  // Bump palette version to signal stored per-gene colors updated
  this._paletteVersion++;
  }

  // Calculate prevalence of gene categories across baselines
  // Returns a Map: category -> prevalence (0-1, where 1 = present in all baselines)
  computeGenePrevalence(categoryField = 'cluster') {
    const totalHoods = Object.keys(this.hoodRanges).length;
    if (totalHoods === 0) return new Map();

    // Track which hoods contain each category
    const categoryToHoods = new Map(); // category -> Set(hood_ids)
    
    for (const gene of Object.values(this.genesById)) {
      if (!gene.hood_id) continue;
      
      // Get category from gene metadata or cluster
      let category = null;
      if (categoryField === 'cluster') {
        category = gene.metadata?.cluster ?? gene.metadata?.clusterId ?? gene.cluster;
      } else {
        category = gene.metadata?.[categoryField];
      }
      
      if (category === null || category === undefined || category === '') continue;
      
      const categoryKey = String(category);
      if (!categoryToHoods.has(categoryKey)) {
        categoryToHoods.set(categoryKey, new Set());
      }
      categoryToHoods.get(categoryKey).add(gene.hood_id);
    }
    
    // Calculate prevalence for each category
    const prevalenceMap = new Map();
    for (const [category, hoods] of categoryToHoods) {
      const prevalence = hoods.size / totalHoods;
      prevalenceMap.set(category, prevalence);
    }
    
    return prevalenceMap;
  }

  // Apply desaturation to a color based on prevalence
  // prevalence: 0-1 (0 = not present, 1 = present in all baselines)
  // Lower prevalence = more desaturated
  _desaturateColorByPrevalence(color, prevalence) {
    if (!color || !Array.isArray(color) || prevalence >= 1) return color;
    
    const [r, g, b, a = 255] = color;
    
    // Convert RGB to HSL for desaturation
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;
    
    // Calculate lightness
    const lightness = (max + min) / 2;
    
    // Calculate saturation
    let saturation = 0;
    if (delta !== 0) {
      saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    }
    
    // Calculate hue
    let hue = 0;
    if (delta !== 0) {
      if (max === rNorm) hue = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) / 6;
      else if (max === gNorm) hue = ((bNorm - rNorm) / delta + 2) / 6;
      else hue = ((rNorm - gNorm) / delta + 4) / 6;
    }
    
    // Desaturate based on prevalence
    // Low prevalence (rare) = high desaturation
    // High prevalence (common) = low desaturation
    const desaturationFactor = 1 - prevalence; // 0 = no desaturation, 1 = full desaturation
    const newSaturation = saturation * (1 - desaturationFactor * 0.8); // Max 80% desaturation
    
    // Convert back to RGB
    const c = (1 - Math.abs(2 * lightness - 1)) * newSaturation;
    const x = c * (1 - Math.abs(((hue * 6) % 2) - 1));
    const m = lightness - c / 2;
    
    let rPrime = 0, gPrime = 0, bPrime = 0;
    const hueSegment = Math.floor(hue * 6);
    
    if (hueSegment === 0) { rPrime = c; gPrime = x; bPrime = 0; }
    else if (hueSegment === 1) { rPrime = x; gPrime = c; bPrime = 0; }
    else if (hueSegment === 2) { rPrime = 0; gPrime = c; bPrime = x; }
    else if (hueSegment === 3) { rPrime = 0; gPrime = x; bPrime = c; }
    else if (hueSegment === 4) { rPrime = x; gPrime = 0; bPrime = c; }
    else { rPrime = c; gPrime = 0; bPrime = x; }
    
    return [
      Math.round((rPrime + m) * 255),
      Math.round((gPrime + m) * 255),
      Math.round((bPrime + m) * 255),
      a
    ];
  }

  // Apply alpha transparency to a color based on prevalence
  // prevalence: 0-1 (0 = not present, 1 = present in all baselines)
  // Lower prevalence = more transparent, higher prevalence = more opaque
  _transparentByPrevalence(color, prevalence, minAlpha = 0.1) {
    if (!color || !Array.isArray(color)) return color;
    
    const [r, g, b] = color;
    
    // Scale alpha from minAlpha (at prevalence 0) to 255 (at prevalence 1)
    // Using minAlpha to ensure even rare items are slightly visible
    const alpha = Math.round(minAlpha * 255 + prevalence * (255 - minAlpha * 255));
    
    return [r, g, b, alpha];
  }

  // Cached cluster summary: { items: [{id, size, label}], ids: [id,...] }
  _computeClusterSummary() {
    const clustersMap = this.proteinClusters || {};
    const counts = Object.values(clustersMap).reduce((acc, cid) => {
      const key = String(cid);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const items = Object.entries(counts)
      .map(([id, size]) => ({ id, size: Number(size), label: `Cluster ${id} (${size} genes)` }))
      .sort((a, b) => b.size - a.size);
    return { items, ids: items.map(it => it.id) };
  }

  getClusterSummary() {
    if (this._clusterSummary) return this._clusterSummary;
    this._clusterSummary = this._computeClusterSummary();
    return this._clusterSummary;
  }

  setNcRNAColorsWithPalette(paletteConfig = null) {
    const ncRNAs = Object.values(this.ncRNAsById);
    
    // If palette is disabled or null, clear colors to default
    if (!paletteConfig || !paletteConfig.enabled) {
      for (const ncRNA of ncRNAs) {
        ncRNA.fillColor = this.config?.gene?.fillColor || [200, 200, 200, 255];
      }
      return;
    }
    
    const ncRNAsWithValidTypes = ncRNAs.filter(nc => {
      const key = nc.metadata && nc.metadata.type;
      const isEmpty = isEmptyValue(key);
      return !isEmpty;
    });
    
    if (ncRNAsWithValidTypes.length === 0) return;

  const ncRNATypeKeys = Array.from(new Set(ncRNAsWithValidTypes.map(nc => normalizeKey(nc.metadata.type))));
    let ncRNAColors = [];
    
    if (paletteConfig.name) {
      try {
        ncRNAColors = memoGetPalette(
          paletteConfig.name,
          Math.max(ncRNATypeKeys.length, paletteConfig.numColors || ncRNATypeKeys.length),
          paletteConfig.reverse || false
        );
      } catch {
        ncRNAColors = [];
      }
    }
    
    if (ncRNAColors.length === 0) {
      // Fallback to HSL colors
      ncRNAColors = ncRNATypeKeys.map((type, i) => {
        const hue = i / ncRNATypeKeys.length;
        return hslToRgb(hue, 0.6, 0.5).concat(255);
      });
    }

    const ncRNATypeToColor = {};
    ncRNATypeKeys.forEach((key, i) => {
      ncRNATypeToColor[key] = ncRNAColors[i % ncRNAColors.length];
    });

    // Apply colors to ncRNAs
    for (const ncRNAId in this.ncRNAsById) {
      const ncRNA = this.ncRNAsById[ncRNAId];
      const key = ncRNA.metadata && ncRNA.metadata.type;
      if (!isEmptyValue(key)) {
        ncRNA.fillColor = ncRNATypeToColor[normalizeKey(key)];
      }
    }
  }

  setRegionColorsWithPalette(paletteConfig = null) {
    const regions = Object.values(this.regionsById);
    if (regions.length === 0) return;
    
    // If palette is disabled or null, clear colors to default (transparent fill, gray stroke)
    if (!paletteConfig || !paletteConfig.enabled) {
      for (const region of regions) {
        region.fillColor = [0, 0, 0, 0]; // Transparent
        region.strokeColor = [100, 100, 100, 255]; // Gray stroke
      }
      return;
    }

    const validKeys = regions
      .map(r => r.getColorKey())
      .map(k => normalizeKey(k))
      .filter(key => !isEmptyValue(key));
    
    const uniqueKeys = [...new Set(validKeys)];
    if (uniqueKeys.length === 0) return;

    let regionColors = [];
    if (paletteConfig.name) {
      try {
        regionColors = memoGetPalette(
          paletteConfig.name,
          Math.max(uniqueKeys.length, paletteConfig.numColors || uniqueKeys.length),
          paletteConfig.reverse || false
        );
      } catch {
        regionColors = [];
      }
    }

    if (regionColors.length === 0) {
      // Fallback to HSL colors
      regionColors = uniqueKeys.map((key, i) => {
        const hue = i / uniqueKeys.length;
        return hslToRgb(hue, 0.6, 0.5).concat(255);
      });
    }

    const regionKeyToColor = {};
    uniqueKeys.forEach((key, i) => {
      regionKeyToColor[key] = regionColors[i % regionColors.length];
    });

    // Apply colors to regions
    for (const regionId in this.regionsById) {
      const region = this.regionsById[regionId];
      const key = region.getColorKey();
      if (!isEmptyValue(key)) {
        region.fillColor = regionKeyToColor[normalizeKey(key)];
      }
    }
  }

  // ---------- track controls ----------

  toggleTrackFlip(hood_id) {
    this.trackFlipped[hood_id] = !this.trackFlipped[hood_id];
  }

  flipTrack(hood_id) {
    const currentOffset = this.trackOffset[hood_id] || 0;
    const anchor = this.getTrackAnchor(hood_id);
    const wasFlipped = !!this.trackFlipped[hood_id];
    const currentCenter = wasFlipped
      ? GenomeView.flipCoordinate(anchor + currentOffset, anchor)
      : anchor + currentOffset;

    this.trackFlipped[hood_id] = !this.trackFlipped[hood_id];
    const nowFlipped = !!this.trackFlipped[hood_id];

    let newOffset;
    if (nowFlipped) newOffset = anchor - currentCenter;
    else newOffset = currentCenter - anchor;

    this.trackOffset[hood_id] = newOffset;
    this.computeTrackPositions();
  }

  flipTrackState(hood_id) {
    this.trackFlipped[hood_id] = !this.trackFlipped[hood_id];
  }

  flipTrackStateWithCentering(hood_id) {
    const currentOffset = this.trackOffset[hood_id] || 0;
    const anchor = this.getTrackAnchor(hood_id);
    const wasFlipped = !!this.trackFlipped[hood_id];
    const currentCenter = wasFlipped
      ? GenomeView.flipCoordinate(anchor + currentOffset, anchor)
      : anchor + currentOffset;

    this.trackFlipped[hood_id] = !this.trackFlipped[hood_id];
    const nowFlipped = !!this.trackFlipped[hood_id];

    let newOffset;
    if (nowFlipped) newOffset = anchor - currentCenter;
    else newOffset = currentCenter - anchor;

    this.trackOffset[hood_id] = newOffset;
  }

  shiftTrack(hood_id, delta) {
    if (!this.trackOffset[hood_id]) this.trackOffset[hood_id] = 0;
    if (this.trackFlipped[hood_id]) delta = -delta;
    this.trackOffset[hood_id] += delta;
    this.computeTrackPositions();
  }

  shiftTrackPlus1kb(hood_id)  { this.shiftTrack(hood_id, 1000); }
  shiftTrackMinus1kb(hood_id) { this.shiftTrack(hood_id, -1000); }

  flipTrackToggle(hood_id) { this.flipTrack(hood_id); }

  // ---------- alignment helpers ----------

  getTrackAnchor(hood_id) {
    const seqid = this.hoodToSeqidMap[hood_id];
    if (!seqid) return 0;

    const nuc = this.nucleotidesBySeqid[seqid];
    const hoodRange = this.hoodRanges[hood_id];

    if (hoodRange) return hoodRange.length / 2;
    else if (nuc && nuc.hood) return (nuc.hood.origEnd - nuc.hood.origStart) / 2;
    else if (this.featuresBySeqid[seqid]) {
      return (this.featuresBySeqid[seqid].origMaxEnd - this.featuresBySeqid[seqid].origMinStart) / 2;
    }
    return 0;
  }

  alignCluster(clusterId) {
    const target = (clusterId === undefined || clusterId === null) ? null : String(clusterId).trim();
    const xScalePercent = (this.config.genome && typeof this.config.genome.xScalePercent === 'number') ? this.config.genome.xScalePercent : 100;
    const xScale = xScalePercent / 100;

    const allClusterGenes = Object.entries(this.genesById)
      .filter(([uid, gene]) => this.proteinClusters && this.proteinClusters[uid] === target)
      .map(([_, gene]) => gene);
    if (allClusterGenes.length === 0) {
      return;
    }

    const genesByTrack = {};
    for (const gene of allClusterGenes) (genesByTrack[gene.hood_id] ||= []).push(gene);

    const selectedGenes = [];
    for (const hood_id in genesByTrack) {
      const arr = genesByTrack[hood_id];
      arr.sort((a, b) => a.originalGeneId.localeCompare(b.originalGeneId));
      selectedGenes.push(arr[0]);
    }
    if (!selectedGenes.length) return;

    selectedGenes.sort((a, b) => a.hood_id.localeCompare(b.hood_id));
    const referenceGene = selectedGenes[0];

    for (const gene of selectedGenes) {
      const hood_id = gene.hood_id;
      const flipped = !!this.trackFlipped[hood_id];
      const effectiveStrand = flipped ? (gene.origStrand === '+' ? '-' : '+') : gene.origStrand;
      if (effectiveStrand === '-') this.flipTrackStateWithCentering(hood_id);
    }

    this.computeTrackPositions();

  // Define a common alignment axis at X=0 so all tracks align consistently
  const targetVisualX = 0;

    for (const gene of selectedGenes) {
      const hood_id = gene.hood_id;
      const currentVisualX = GenomeView.getGeneVisualX(gene, this);
      if (currentVisualX === null) continue;

  // Move this selected gene's visual X to the common target X (0)
  let offsetAdjustment = (targetVisualX - currentVisualX) / xScale;
      const isFlipped = !!this.trackFlipped[hood_id];
      if (isFlipped) offsetAdjustment = -offsetAdjustment;

      const currentOffset = this.trackOffset[hood_id] || 0;
      this.trackOffset[hood_id] = currentOffset + offsetAdjustment;
    }

    // After adjusting selected tracks, also set sensible offsets for tracks
    // that did not contain a selected gene so the whole view shifts like
    // the start/center/end alignment helpers do. This makes cluster alignment
    // mirror the global align operations and ensures genes, links and labels
    // all move consistently.
    const tracksWithSelectedGenes = new Set(selectedGenes.map(g => g.hood_id));

    for (const hood_id of this.leaves) {
      if (tracksWithSelectedGenes.has(hood_id)) continue; // preserve selected-track offsets
      const hoodRange = this.hoodRanges[hood_id];
      const seqid = this.hoodToSeqidMap[hood_id];
      const nuc = this.nucleotidesBySeqid[seqid];
      if (!hoodRange && !nuc?.hood) continue;

      const anchor = hoodRange ? hoodRange.length / 2 : (nuc.hood.origEnd - nuc.hood.origStart) / 2;
      // Place the hood center (anchor) at the common target X (0). Account for flip state.
      const isFlipped = !!this.trackFlipped[hood_id];
      // scaledAnchor = anchor + sgn*offset*xScale == targetVisualX
      // => offset = (targetVisualX - anchor) / (sgn * xScale)
      const sgn = isFlipped ? -1 : 1;
      const requiredOffset = (targetVisualX - anchor) / (sgn * xScale);
      this.trackOffset[hood_id] = requiredOffset;
    }

    // Recompute positions for all tracks after applying offsets
    this.computeTrackPositions();
  }

  alignAllToStart() {
    const xScalePercent = (this.config.genome && typeof this.config.genome.xScalePercent === 'number') ? this.config.genome.xScalePercent : 100;
    const xScale = xScalePercent / 100;

    // Simplified: Reset all flips to false and calculate offsets so baseline.start lands at X=0
    // Formula derivation for scaled(0) = 0 with flip=false:
    //   scaled(x) = anchor + (x + offset - anchor) * xScale
    //   scaled(0) = anchor + (offset - anchor) * xScale = 0
    //   => offset = anchor - anchor/xScale = anchor * (1 - 1/xScale)
    for (const hood_id of this.leaves) {
      this.trackFlipped[hood_id] = false; // Reset flip state
      const seqid = this.hoodToSeqidMap[hood_id];
      if (!seqid) continue;
      const nuc = this.nucleotidesBySeqid[seqid];
      if (nuc?.hood) {
        const hoodRange = this.hoodRanges[hood_id];
        const hoodLength = hoodRange?.length || (nuc.hood.origEnd - nuc.hood.origStart) || 0;
        const anchor = hoodLength / 2;
        this.trackOffset[hood_id] = anchor * (1 - 1 / xScale);
      }
    }
    this.computeTrackPositions();

    // Debug: log per-hood alignment results and baseline extremes
    try {
      const dbg = this.config?.debug?.alignment;
      if (dbg) {
        const baselineStarts = [];
        const baselineEnds = [];
        console.debug(`[GenomeView] alignAllToStart xScale=${xScalePercent}`);
        for (const hood_id of this.leaves) {
          const seqid = this.hoodToSeqidMap[hood_id];
          const nuc = seqid ? this.nucleotidesBySeqid[seqid] : null;
          const flipped = !!this.trackFlipped[hood_id];
          const offset = this.trackOffset[hood_id] || 0;
          const hoodRange = this.hoodRanges[hood_id];
          const len = hoodRange?.length || (nuc?.hood ? (nuc.hood.origEnd - nuc.hood.origStart) : 0) || 0;
          const bStart = nuc?.hood?.start;
          const bEnd = nuc?.hood?.end;
          if (typeof bStart === 'number' && isFinite(bStart)) baselineStarts.push([hood_id, bStart]);
          if (typeof bEnd === 'number' && isFinite(bEnd)) baselineEnds.push([hood_id, bEnd]);
          console.debug(`[start] hood=${hood_id} flipped=${flipped} len=${len} offset=${offset} baseline=(${bStart ?? 'n/a'}, ${bEnd ?? 'n/a'})`);
        }
        baselineStarts.sort((a, b) => a[1] - b[1]);
        baselineEnds.sort((a, b) => a[1] - b[1]);
        const minStart = baselineStarts[0]?.[1];
        const minStartHood = baselineStarts[0]?.[0];
        const maxEnd = baselineEnds[baselineEnds.length - 1]?.[1];
        const maxEndHood = baselineEnds[baselineEnds.length - 1]?.[0];
        console.debug(`[start] baselineMinStart=${minStart} (hood=${minStartHood}) baselineMaxEnd=${maxEnd} (hood=${maxEndHood})`);
        console.debug(`[start] global bounds: minX=${this.globalMin} maxX=${this.globalMax}`);
      }
    } catch {}
  }

  alignAllToEnd() {
    const xScalePercent = (this.config.genome && typeof this.config.genome.xScalePercent === 'number') ? this.config.genome.xScalePercent : 100;
    const xScale = xScalePercent / 100;

    // Simplified: Reset all flips to false and calculate offsets so baseline.end lands at X=0
    // Formula derivation for scaled(hoodLength) = 0 with flip=false, where hoodLength=2*anchor:
    //   scaled(L) = anchor + (L + offset - anchor) * xScale = anchor + (anchor + offset) * xScale = 0
    //   => offset = -anchor/xScale - anchor = -anchor * (1 + 1/xScale)
    for (const hood_id of this.leaves) {
      this.trackFlipped[hood_id] = false; // Reset flip state
      const seqid = this.hoodToSeqidMap[hood_id];
      if (!seqid) continue;
      const nuc = this.nucleotidesBySeqid[seqid];
      if (nuc?.hood) {
        const hoodRange = this.hoodRanges[hood_id];
        const hoodLength = hoodRange?.length || (nuc.hood.origEnd - nuc.hood.origStart) || 0;
        const anchor = hoodLength / 2;
        this.trackOffset[hood_id] = -anchor * (1 + 1 / xScale);
      }
    }
    this.computeTrackPositions();
  }

  alignAllToCenter() {
    const xScalePercent = (this.config.genome && typeof this.config.genome.xScalePercent === 'number') ? this.config.genome.xScalePercent : 100;
    const xScale = xScalePercent / 100;

    // Simplified: Reset all flips to false and calculate offsets so baseline center lands at X=0
    // Formula derivation for scaled(anchor) = 0 with flip=false:
    //   scaled(anchor) = anchor + (anchor + offset - anchor) * xScale = anchor + offset * xScale = 0
    //   => offset = -anchor/xScale
    for (const hood_id of this.leaves) {
      this.trackFlipped[hood_id] = false; // Reset flip state
      const seqid = this.hoodToSeqidMap[hood_id];
      if (!seqid) continue;
      const nuc = this.nucleotidesBySeqid[seqid];
      if (nuc?.hood) {
        const hoodRange = this.hoodRanges[hood_id];
        const hoodLength = hoodRange?.length || (nuc.hood.origEnd - nuc.hood.origStart) || 0;
        const anchor = hoodLength / 2;
        this.trackOffset[hood_id] = -anchor / xScale;
      }
    }
    this.computeTrackPositions();

    // Debug: log per-hood alignment results and baseline extremes
    try {
      const dbg = this.config?.debug?.alignment;
      if (dbg) {
        const baselineStarts = [];
        const baselineEnds = [];
        console.debug(`[GenomeView] alignAllToCenter xScale=${xScalePercent}`);
        for (const hood_id of this.leaves) {
          const seqid = this.hoodToSeqidMap[hood_id];
          const nuc = seqid ? this.nucleotidesBySeqid[seqid] : null;
          const flipped = !!this.trackFlipped[hood_id];
          const offset = this.trackOffset[hood_id] || 0;
          const hoodRange = this.hoodRanges[hood_id];
          const len = hoodRange?.length || (nuc?.hood ? (nuc.hood.origEnd - nuc.hood.origStart) : 0) || 0;
          const bStart = nuc?.hood?.start;
          const bEnd = nuc?.hood?.end;
          if (typeof bStart === 'number' && isFinite(bStart)) baselineStarts.push([hood_id, bStart]);
          if (typeof bEnd === 'number' && isFinite(bEnd)) baselineEnds.push([hood_id, bEnd]);
          console.debug(`[center] hood=${hood_id} flipped=${flipped} len=${len} offset=${offset} baseline=(${bStart ?? 'n/a'}, ${bEnd ?? 'n/a'})`);
        }
        baselineStarts.sort((a, b) => a[1] - b[1]);
        baselineEnds.sort((a, b) => a[1] - b[1]);
        const minStart = baselineStarts[0]?.[1];
        const minStartHood = baselineStarts[0]?.[0];
        const maxEnd = baselineEnds[baselineEnds.length - 1]?.[1];
        const maxEndHood = baselineEnds[baselineEnds.length - 1]?.[0];
        console.debug(`[center] baselineMinStart=${minStart} (hood=${minStartHood}) baselineMaxEnd=${maxEnd} (hood=${maxEndHood})`);
        console.debug(`[center] global bounds: minX=${this.globalMin} maxX=${this.globalMax}`);
      }
    } catch {}
  }

  applyHoods(hoods) {
    const validHoodIds = new Set(this.leaves.map(id => String(id)));
    const filteredHoods = [];
    let orphanCount = 0;

    for (const b of hoods) {
      const rawHood = b.hood_id != null ? String(b.hood_id).trim() : null;
      const rawSeqid = b.seqid != null ? String(b.seqid).trim() : null;

      let matchedHood = null;
      if (rawHood && validHoodIds.has(rawHood)) matchedHood = rawHood;
      else if (rawSeqid && validHoodIds.has(rawSeqid)) matchedHood = rawSeqid;

      if (matchedHood) {
        b.hood_id = matchedHood;
        filteredHoods.push(b);
      } else {
        orphanCount++;
      }
    }


    for (const b of filteredHoods) {
      if (b.hood_id && b.seqid) {
        this.hoodToSeqidMap[b.hood_id] = b.seqid;
        (this.seqidToHoodsMap[b.seqid] ||= []).push(b.hood_id);

        const hoodRange = {
          seqid: b.seqid,
          origStart: b.start,
          origEnd: b.end,
          start: b.start,
          end: b.end,
          length: b.end - b.start,
          align_gene: b.align_gene
        };
        // Store region-based alignment coordinates if provided
        if (typeof b.align_start === 'number' && isFinite(b.align_start) &&
            typeof b.align_end === 'number' && isFinite(b.align_end)) {
          hoodRange.align_start = b.align_start - b.start; // Convert to hood-relative coords
          hoodRange.align_end = b.align_end - b.start;
          hoodRange.align_strand = b.align_strand || '+';
        }
        this.hoodRanges[b.hood_id] = hoodRange;
      }
      if (this.nucleotidesBySeqid[b.seqid]) {
        this.nucleotidesBySeqid[b.seqid].setHood(b.start, b.end);
      }
    }

    // intervals depend on baselines — rebuild
    this._buildHoodIntervalIndex();
  }

  getHoodIdsFromSeqid(seqid) { return this.seqidToHoodsMap[seqid] || [seqid]; }
  getHoodIdFromSeqid(seqid)  { const h = this.getHoodIdsFromSeqid(seqid); return h[0]; }
  getSeqidFromHoodId(hood_id){ return this.hoodToSeqidMap[hood_id] || hood_id; }

  alignByDefaultGenes() {
    const xScalePercent = (this.config.genome && typeof this.config.genome.xScalePercent === 'number') ? this.config.genome.xScalePercent : 100;
    const xScale = xScalePercent / 100;

    const genesToAlign = [];
    const regionsToAlign = []; // { hood_id, midpoint, strand }
    for (const hood_id of this.leaves) {
      const hoodRange = this.hoodRanges[hood_id];
      if (!hoodRange) continue;
      // Prefer align_gene if available
      if (hoodRange.align_gene) {
        const uniqueGeneId = `${hood_id}_${hoodRange.align_gene}`;
        const gene = this.genesById[uniqueGeneId];
        if (gene) { genesToAlign.push(gene); continue; }
      }
      // Fall back to region-based alignment
      if (typeof hoodRange.align_start === 'number' && typeof hoodRange.align_end === 'number') {
        const strand = hoodRange.align_strand || '+';
        regionsToAlign.push({
          hood_id,
          // For '+' strand, align at start (5' end); for '-' strand, align at end (5' end)
          alignPoint: strand === '-' ? hoodRange.align_end : hoodRange.align_start,
          strand
        });
      }
    }
    if (!genesToAlign.length && !regionsToAlign.length) return;

    genesToAlign.sort((a, b) => a.hood_id.localeCompare(b.hood_id));
    const targetVisualX = 0;

    // --- Phase 1: Flip tracks so alignment targets face '+' direction ---
    for (const gene of genesToAlign) {
      const hood_id = gene.hood_id;
      const flipped = !!this.trackFlipped[hood_id];
      const effectiveStrand = flipped ? (gene.origStrand === '+' ? '-' : '+') : gene.origStrand;
      if (effectiveStrand === '-') this.flipTrackStateWithCentering(hood_id);
    }
    for (const region of regionsToAlign) {
      const hood_id = region.hood_id;
      const flipped = !!this.trackFlipped[hood_id];
      const effectiveStrand = flipped ? (region.strand === '+' ? '-' : '+') : region.strand;
      if (effectiveStrand === '-') this.flipTrackStateWithCentering(hood_id);
    }
    this.computeTrackPositions();

    // --- Phase 2: Shift gene-based tracks to target X ---
    for (const gene of genesToAlign) {
      const hood_id = gene.hood_id;
      const currentVisualX = GenomeView.getGeneVisualX(gene, this);
      if (currentVisualX === null) continue;

      const visualShift = targetVisualX - currentVisualX;
      const isFlipped = !!this.trackFlipped[hood_id];
      const offsetAdj = (isFlipped ? -1 : 1) * (visualShift / xScale);

      const currentOffset = this.trackOffset[hood_id] || 0;
      this.trackOffset[hood_id] = currentOffset + offsetAdj;
    }

    // --- Phase 3: Shift region-based tracks to target X ---
    for (const region of regionsToAlign) {
      const hood_id = region.hood_id;
      const hoodRange = this.hoodRanges[hood_id];
      if (!hoodRange) continue;

      const offset = this.trackOffset[hood_id] || 0;
      const isFlipped = !!this.trackFlipped[hood_id];
      const anchor = (hoodRange.length || 0) / 2;

      // Compute the visual X of the alignment point (same formula as getGeneVisualX)
      const transformedX = GenomeView.getTransformedXUnified(region.alignPoint, anchor, offset, isFlipped);
      const currentVisualX = anchor + (transformedX - anchor) * xScale;

      const visualShift = targetVisualX - currentVisualX;
      const offsetAdj = (isFlipped ? -1 : 1) * (visualShift / xScale);

      const currentOffset = this.trackOffset[hood_id] || 0;
      this.trackOffset[hood_id] = currentOffset + offsetAdj;
    }

    // --- Phase 4: Center remaining tracks without alignment targets ---
    const tracksWithAlignment = new Set([
      ...genesToAlign.map(g => g.hood_id),
      ...regionsToAlign.map(r => r.hood_id)
    ]);
    for (const hood_id of this.leaves) {
      if (tracksWithAlignment.has(hood_id)) continue;
      const seqid = this.hoodToSeqidMap[hood_id];
      if (!seqid) continue;
      const nuc = this.nucleotidesBySeqid[seqid];
      if (nuc?.hood) {
        const hoodRange = this.hoodRanges[hood_id];
        const anchor = hoodRange ? hoodRange.length / 2 : (nuc.hood.origEnd - nuc.hood.origStart) / 2;
        // Place the hood center (anchor) at the common target X (0). Account for flip state and scale.
        const isFlipped = !!this.trackFlipped[hood_id];
        const sgn = isFlipped ? -1 : 1;
        const requiredOffset = (targetVisualX - anchor) / (sgn * xScale);
        this.trackOffset[hood_id] = requiredOffset;
      }
    }

    this.computeTrackPositions();
  }

  applyDomainPalette(paletteConfig = null) {
    this._cachedAllDomains = undefined; // Invalidate cache when colors change
    // If palette is disabled or null, clear any stored per-domain fillColor so
    // rendering falls back to theme/default colors. Bump _paletteVersion as a
    // stable signal for memoization/update triggers elsewhere.
    if (!paletteConfig || !paletteConfig.enabled) {
      for (const gene of Object.values(this.genesById)) {
        for (const domain of gene.domains) {
          if (domain && domain.fillColor) domain.fillColor = null;
        }
      }
      this._paletteVersion++;
      return;
    }

    const domainNames = new Set();
    for (const gene of Object.values(this.genesById)) {
      for (const domain of gene.domains) domainNames.add(domain.domainName);
    }
    const sorted = Array.from(domainNames).sort();
    let domainColors = [];
    if (paletteConfig.name) {
      try {
        domainColors = memoGetPalette(
          paletteConfig.name,
          Math.max(sorted.length, paletteConfig.numColors || sorted.length),
          paletteConfig.reverse || false
        );
      } catch {
        domainColors = [];
      }
    }
    const map = {};
    sorted.forEach((name, i) => { map[name] = domainColors[i % domainColors.length]; });

    for (const gene of Object.values(this.genesById)) {
      for (const domain of gene.domains) {
        domain.fillColor = map[domain.domainName] || [128, 128, 128, 255];
      }
    }
  }
}

// ---------- utilities ----------

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
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

function isValidPolygon(polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return false;
  const [x0, y0] = polygon[0];
  if (polygon.every(([x, y]) => x === x0 && y === y0)) return false;
  return true;
}

// Legacy export used elsewhere
export function getTransformedX(x, trackStart, trackEnd, flipped) {
  if (flipped) return trackEnd - (x - trackStart);
  return x;
}

export default GenomeView;
