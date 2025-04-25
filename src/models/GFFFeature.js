class GFFFeature {
  constructor(seqid, start, end, strand, type, attributes) {
    this.seqid = seqid;
    this.start = start;
    this.end = end;
    this.strand = strand;
    this.type = type;
    this.attributes = attributes;
  }
}

export default GFFFeature;
