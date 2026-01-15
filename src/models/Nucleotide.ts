// Nucleotide.js
// Represents a nucleotide region/track, containing genes and methods for transformation and visualization

import Hood from './Hood';

class Nucleotide {
  constructor(seqid, start, end, strand = '+') {
    this.seqid = seqid;
    this.start = start;
    this.end = end;
    this.strand = strand;
    this.genes = [];
    this.metadata = { seqid, start, end, strand };
    // Optionally, store domains or other features here
    this.hood = null; // Add hood property
  }

  addGene(gene) {
    this.genes.push(gene);
  }

  // Flip the nucleotide region and all its genes
  flip() {
    const origStart = this.start;
    const origEnd = this.end;
    this.start = -origEnd;
    this.end = -origStart;
    this.strand = (this.strand === '+') ? '-' : '+';
    for (const gene of this.genes) {
      gene.start = -gene.end;
      gene.end = -gene.start;
      gene.strand = (gene.strand === '+') ? '-' : '+';
      if (typeof gene.updatePolygon === 'function') gene.updatePolygon();
    }
  }

  // Shift the nucleotide region and all its genes by a given offset
  shift(offset) {
    this.start += offset;
    this.end += offset;
    for (const gene of this.genes) {
      gene.start += offset;
      gene.end += offset;
      if (typeof gene.updatePolygon === 'function') gene.updatePolygon();
    }
  }

  // Generate polygons for all genes (for visualization)
  getGenePolygons() {
    return this.genes.map(g => g.polygon).filter(Boolean);
  }

  setHood(start, end) {
    if (this.hood) {
      this.hood.set(start, end);
    } else {
      // If not present, create a new Hood instance
      this.hood = new Hood(this.seqid, start, end);
    }
  }

  getHood() {
    return this.hood ? this.hood.get() : null;
  }

  updateHood(start, end) {
    if (this.hood) {
      this.hood.update(start, end);
    } else {
      this.setHood(start, end);
    }
  }
}

export default Nucleotide;
