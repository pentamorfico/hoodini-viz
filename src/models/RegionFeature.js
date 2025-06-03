// RegionFeature.js
import GFFFeature from './GFFFeature';

class RegionFeature extends GFFFeature {
  constructor(seqid, start, end, strand, type, attributes, config) {
    super(seqid, start, end, strand, type, attributes);
    this.config = config;
    this.line = null; // Store line coordinates instead of polygon
    this.trackY = null;
    this.lineWidth = config?.region?.lineWidth || 3;
    this.metadata = { seqid, start, end, strand, type, attributes };
  }

  setTrackY(y) {
    this.trackY = y;
    this.updateLine();
  }

  updateLine() {
    this.line = this._buildLine(this.trackY);
  }

  // Returns line coordinates for rendering as a line on top of genes
  _buildLine(trackY) {
    const start = this.start;
    const end = this.end;
    
    // Return line coordinates as two points
    return [
      [start, trackY],
      [end, trackY]
    ];
  }
}

export default RegionFeature;
