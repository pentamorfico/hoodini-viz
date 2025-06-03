// NonCodingFeature.js
import GFFFeature from './GFFFeature';

class NonCodingFeature extends GFFFeature {
  constructor(seqid, start, end, strand, type, attributes, config) {
    super(seqid, start, end, strand, type, attributes);
    this.config = config;
    this.polygon = null;
    this.trackY = null;
    this.featureHeight = config?.gene?.height || 60;
    this.metadata = { seqid, start, end, strand, type, attributes };
  }

  setTrackY(y) {
    this.trackY = y;
    this.updatePolygon();
  }

  updatePolygon() {
    this.polygon = this._buildHalfArrowPolygon(this.trackY, this.featureHeight);
  }

  // Returns a polygon for a half-arrow (upper or lower body)
  _buildHalfArrowPolygon(trackY, featureHeight) {
    const start = this.start;
    const end = this.end;
    const length = Math.abs(end - start);
    // Use config tipWidthFactor if available, else default to 0.2
    const tipWidth = length * (this.config?.gene?.tipWidthFactor ?? 0.2);
    const halfH = featureHeight / 4;
    const isForward = (this.strand === '+');
    const arrowheadHeight = this.config?.gene?.arrowheadHeight || 0;
    const arrowheadHalfHeight = (halfH + arrowheadHeight / 2);

    if (isForward) {
      // Flip: Lower half arrow (right, but use lower half instead of upper)
      return [
        [start, trackY],
        [start, trackY + halfH],
        [end - tipWidth, trackY + halfH],
        [end - tipWidth, trackY + arrowheadHalfHeight],
        [end, trackY],
      ];
    } else {
      // Flip: Upper half arrow (left, but use upper half instead of lower)
      return [
        [end, trackY],
        [end, trackY - halfH],
        [start + tipWidth, trackY - halfH],
        [start + tipWidth, trackY - arrowheadHalfHeight],
        [start, trackY],
      ];
    }
  }
}

export default NonCodingFeature;
