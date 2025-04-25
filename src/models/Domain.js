import polygonClipping from 'polygon-clipping';

// Domain.js
class Domain {
  constructor(geneId, domainName, start, end, evalue) {
    this.geneId = geneId;
    this.domainName = domainName;
    this.origStart = start;
    this.origEnd = end;
    this.start = start;
    this.end = end;
    this.evalue = evalue;
    this.fillColor = [50 + Math.random() * 205, 50 + Math.random() * 205, 50 + Math.random() * 205, 255];
    this.parentGene = null;
    this.polygon = null;
    this.metadata = { geneId, domainName, start, end, evalue };
  }

  setParentGene(gene) {
    this.parentGene = gene;
    this.updatePolygon();
  }

  updatePolygon() {
    if (!this.parentGene || !this.parentGene.polygon) return;
    const g = this.parentGene;
    let domainPoly = this.createDomainPolygon(g, this.start, this.end, g.strand);
    if (domainPoly && g.polygon) {
      // Clip domain polygon to gene polygon
      const genePoly = [g.polygon];
      const domainPolyArr = [domainPoly];
      const clipped = polygonClipping.intersection(genePoly, domainPolyArr);
      if (clipped && clipped.length > 0) {
        this.polygon = clipped[0];
      } else {
        this.polygon = null;
      }
    } else {
      this.polygon = domainPoly;
    }
  }

  createDomainPolygon(g, domainStart, domainEnd, strand) {
    // console.log('Creating domain polygon for gene:', g.attributes, domainStart, domainEnd, strand);
    // Use the true gene start: lower for +, higher for -
    const isPlus = strand === '+';
    const geneStartCoord = g.start;
    const geneEndCoord = g.end;
    const geneLength = Math.abs(geneEndCoord - geneStartCoord);
    const domainRelStart = domainStart / geneLength;
    const domainRelEnd = domainEnd / geneLength;
    const startPos = this.interpolateOnLine(g.centerLine, domainRelStart);
    const endPos = this.interpolateOnLine(g.centerLine, domainRelEnd);
    const perp = this.perpVector(g.centerLine[0], g.centerLine[1]);
    const normPerp = this.normalize(perp);
    const halfWidth = g.geneHeight; // DOMAIN_HEIGHT_FACTOR, DOMAIN_MAX_WIDTH
    const p1 = [startPos[0] - normPerp[0] * halfWidth, startPos[1] - normPerp[1] * halfWidth];
    const p2 = [endPos[0] - normPerp[0] * halfWidth, endPos[1] - normPerp[1] * halfWidth];
    const p3 = [endPos[0] + normPerp[0] * halfWidth, endPos[1] + normPerp[1] * halfWidth];
    const p4 = [startPos[0] + normPerp[0] * halfWidth, startPos[1] + normPerp[1] * halfWidth];
    return [p1, p2, p3, p4];
  }

  interpolateOnLine(line, t) {
    const [p0, p1] = line;
    return [
      p0[0] + (p1[0] - p0[0]) * t,
      p0[1] + (p1[1] - p0[1]) * t
    ];
  }

  perpVector(p0, p1) {
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    return [-dy, dx];
  }

  normalize(v) {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    if (len === 0) return [0, 1];
    return [v[0] / len, v[1] / len];
  }
}

export default Domain;
