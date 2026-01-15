// Hood.js
// Handles parsing and representing hood data for nucleotides

class Hood {
  constructor(seqid, start, end) {
    this.seqid = seqid;
    this.start = start;
    this.end = end;
    this.origStart = start;
    this.origEnd = end;
  }

  set(start, end) {
    this.start = start;
    this.end = end;
    this.origStart = start;
    this.origEnd = end;
  }

  update(start, end) {
    this.start = start;
    this.end = end;
  }

  get() {
    return {
      seqid: this.seqid,
      start: this.start,
      end: this.end,
      origStart: this.origStart,
      origEnd: this.origEnd
    };
  }
}

export default Hood;
