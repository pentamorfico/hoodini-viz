// Gene.js
import GFFFeature from './GFFFeature';

class Gene extends GFFFeature {
  constructor(seqid, start, end, strand, attributes) {
    super(seqid, start, end, strand, 'gene', attributes);
    this.origStart = start;
    this.origEnd = end;
    this.origStrand = strand;
    this.domains = [];
    this.fillColor = [230, 230, 230, 255]; // Default color for all genes
    this.polygon = null;
    this.trackY = null;
    this.geneHeight = 550; // GENE_HEIGHT default
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
  _buildPolygon(trackY, geneHeight, TIP_WIDTH_FACTOR = 0.03) {
    let start = this.start;
    let end = this.end;
    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }
    const length = Math.abs(end - start);
    const tipWidth = length * TIP_WIDTH_FACTOR;
    const halfH = geneHeight / 2;
    const isForward = (this.strand === '+');
    if (isForward) {
      return [
        [start, trackY - halfH],
        [end - tipWidth, trackY - halfH],
        [end, trackY],
        [end - tipWidth, trackY + halfH],
        [start, trackY + halfH]
      ];
    } else {
      return [
        [end, trackY - halfH],
        [start + tipWidth, trackY - halfH],
        [start, trackY],
        [start + tipWidth, trackY + halfH],
        [end, trackY + halfH]
      ];
    }
  }

  computeCenterLine() {
    const poly = this.polygon;
    const startPoint = [(poly[0][0] + poly[4][0]) / 2, (poly[0][1] + poly[4][1]) / 2];
    const tipPoint = poly[2];
    return [startPoint, tipPoint];
  }

  addDomain(domain) {
    domain.setParentGene(this);
    this.domains.push(domain);
  }
}

export default Gene;
