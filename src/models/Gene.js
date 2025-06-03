// Gene.js
import GFFFeature from './GFFFeature';
import { DEFAULT_CONFIG } from '../config/visualizationConfig';

class Gene extends GFFFeature {
  constructor(seqid, start, end, strand, attributes, config = DEFAULT_CONFIG) {
    super(seqid, start, end, strand, 'gene', attributes);
    this.origStart = start;
    this.origEnd = end;
    this.origStrand = strand;
    this.domains = [];
    this.config = config || DEFAULT_CONFIG;
    this.fillColor = this.config.gene.fillColor;
    this.polygon = null;
    this.trackY = null;
    this.geneHeight = this.config.gene.defaultHeight;
    this.centerLine = [];
    this.metadata = { seqid, start, end, strand, attributes };
  }

  setTrackY(y) {
    this.trackY = y;
    this.updatePolygon();
  }

  updatePolygon() {
    this.polygon = this._buildPolygon(this.trackY, this.geneHeight, this.config.gene.tipWidthFactor);
    this.centerLine = this.computeCenterLine();
    for (let d of this.domains) {
      d.updatePolygon();
    }
  }

  // Gene-specific polygon construction (was getBasePolygon)
  _buildPolygon(trackY, geneHeight, TIP_WIDTH_FACTOR = this.config.gene.tipWidthFactor) {
    let start = this.start;
    let end = this.end;
    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }
    // --- Removed xScalePercent logic; handled globally in GenomeView ---
    // ---
    const length = Math.abs(end - start);
    const tipWidth = length * TIP_WIDTH_FACTOR;
    const halfH = geneHeight / 2;
    const isForward = (this.strand === '+');
    const arrowheadHeight = this.config.gene.arrowheadHeight || 0;
    
    // Always use 7-vertex polygon, but when arrowheadHeight = 0, 
    // the arrowhead height equals the gene body height (looks like 5-vertex)
    const arrowheadHalfHeight = (halfH + arrowheadHeight / 2);
    
    if (isForward) {
      return [
        [start, trackY - halfH],
        [end - tipWidth, trackY - halfH],
        [end - tipWidth, trackY - arrowheadHalfHeight],
        [end, trackY],
        [end - tipWidth, trackY + arrowheadHalfHeight],
        [end - tipWidth, trackY + halfH],
        [start, trackY + halfH]
      ];
    } else {
      return [
        [end, trackY - halfH],
        [start + tipWidth, trackY - halfH],
        [start + tipWidth, trackY - arrowheadHalfHeight],
        [start, trackY],
        [start + tipWidth, trackY + arrowheadHalfHeight],
        [start + tipWidth, trackY + halfH],
        [end, trackY + halfH]
      ];
    }
  }

  computeCenterLine() {
    const poly = this.polygon;
    if (!poly || poly.length === 0) return [];
    
    // Always handle 7-vertex polygons now
    if (poly.length === 7) {
      // 7-vertex polygon with arrowhead
      const startPoint = [(poly[0][0] + poly[6][0]) / 2, (poly[0][1] + poly[6][1]) / 2];
      const tipPoint = poly[3]; // The tip is at index 3
      return [startPoint, tipPoint];
    } else if (poly.length === 5) {
      // Legacy 5-vertex polygon (shouldn't happen anymore, but kept for safety)
      const startPoint = [(poly[0][0] + poly[4][0]) / 2, (poly[0][1] + poly[4][1]) / 2];
      const tipPoint = poly[2];
      return [startPoint, tipPoint];
    } else {
      // Fallback for unexpected polygon sizes
      const startPoint = [(poly[0][0] + poly[poly.length-1][0]) / 2, (poly[0][1] + poly[poly.length-1][1]) / 2];
      const tipPoint = poly[Math.floor(poly.length / 2)];
      return [startPoint, tipPoint];
    }
  }

  addDomain(domain) {
    domain.setParentGene(this);
    this.domains.push(domain);
  }
}

export default Gene;
