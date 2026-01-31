// Gene.js
import GFFFeature from './GFFFeature';
import { DEFAULT_CONFIG, calculateTipWidth } from '../config/visualizationConfig';

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
    this.geneHeight = this.config.gene.height || this.config.gene.defaultHeight;
    this.centerLine = [];
    this.metadata = { seqid, start, end, strand, attributes };
  }

  setTrackY(y) {
    this.trackY = y;
    this.updatePolygon();
  }

  updatePolygon() {
    this.polygon = this._buildPolygon(this.trackY, this.geneHeight);
    this.centerLine = this.computeCenterLine();
    for (let d of this.domains) {
      d.updatePolygon();
    }
  }

  // Gene-specific polygon construction (was getBasePolygon)
  _buildPolygon(trackY, geneHeight) {
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
    const tipWidth = calculateTipWidth(length, this.config);
    const halfH = geneHeight / 2;
    const isForward = (this.strand === '+');
    const arrowheadHeight = this.config.gene.arrowheadHeight || 0;
    
    // When tipWidth is 0 or very small, draw a simple rectangle (no arrow tip)
    if (tipWidth < 1) {
      return [
        [start, trackY - halfH],
        [end, trackY - halfH],
        [end, trackY + halfH],
        [start, trackY + halfH]
      ];
    }
    
    // When arrowheadHeight is 0 or very small, use 5-vertex arrow polygon
    // where the tip has the same height as the gene body
    if (arrowheadHeight < 0.1) {
      if (isForward) {
        return [
          [start, trackY - halfH],
          [end - tipWidth, trackY - halfH],
          [end, trackY],  // Tip point
          [end - tipWidth, trackY + halfH],
          [start, trackY + halfH]
        ];
      } else {
        return [
          [end, trackY - halfH],
          [start + tipWidth, trackY - halfH],
          [start, trackY],  // Tip point
          [start + tipWidth, trackY + halfH],
          [end, trackY + halfH]
        ];
      }
    }
    
    // 7-vertex arrow polygon when arrowheadHeight > 0
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
    
    if (poly.length === 5) {
      // 5-vertex arrow polygon (arrowheadHeight = 0)
      const startPoint = [(poly[0][0] + poly[4][0]) / 2, (poly[0][1] + poly[4][1]) / 2];
      const tipPoint = poly[2]; // The tip is at index 2
      return [startPoint, tipPoint];
    } else if (poly.length === 7) {
      // 7-vertex polygon with extended arrowhead
      const startPoint = [(poly[0][0] + poly[6][0]) / 2, (poly[0][1] + poly[6][1]) / 2];
      const tipPoint = poly[3]; // The tip is at index 3
      return [startPoint, tipPoint];
    } else if (poly.length === 4) {
      // 4-vertex rectangle (legacy fallback)
      const isForward = (this.strand === '+');
      const startPoint = [(poly[0][0] + poly[3][0]) / 2, (poly[0][1] + poly[3][1]) / 2];
      const endPoint = [(poly[1][0] + poly[2][0]) / 2, (poly[1][1] + poly[2][1]) / 2];
      return isForward ? [startPoint, endPoint] : [endPoint, startPoint];
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
