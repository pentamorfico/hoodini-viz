// Gene.js
import GFFFeature from './GFFFeature';

class Gene extends GFFFeature {
  constructor(seqid, start, end, strand, attributes) {
    super(seqid, start, end, strand, 'gene', attributes);
    this.origStart = start;
    this.origEnd = end;
    this.origStrand = strand;
    this.domains = [];
    this.fillColor = [Math.random() * 255, Math.random() * 255, Math.random() * 255, 255];
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
    this.polygon = this.getBasePolygon(this.trackY, this.geneHeight);
    this.centerLine = this.computeCenterLine();
    // Debug: log center line after update
    for (let d of this.domains) {
      d.updatePolygon();
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
