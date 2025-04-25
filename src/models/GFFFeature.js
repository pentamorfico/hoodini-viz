class GFFFeature {
  constructor(seqid, start, end, strand, type, attributes) {
    this.seqid = seqid;
    this.start = start;
    this.end = end;
    this.strand = strand;
    this.type = type;
    this.attributes = attributes;
  }

  getBasePolygon(trackY, geneHeight, TIP_WIDTH_FACTOR = 0.03) {
    let start = this.start;
    let end = this.end;
    // if start > end, switch them
    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }
    console.log('Creating base polygon for feature:', this.attributes, start, end, this.strand);
    // direction 1 if strand is +, -1 if strand is -
    const direction = (end > start) ? 1 : 0;
    const length = Math.abs(end - start);
    const tipWidth = length * TIP_WIDTH_FACTOR;
    const halfH = geneHeight / 2;
    //if direction is 1, switch the strand:
    //if direction is -1, switch the strand:
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
}

export default GFFFeature;
