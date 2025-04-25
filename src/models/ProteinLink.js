// ProteinLink.js
import Link from './Link';

class ProteinLink extends Link {
  constructor(gAId, gBId, color) {
    super();
    this.gAId = gAId;
    this.gBId = gBId;
    this.color = color;
    this.metadata = { gAId, gBId, color };
  }

  bezierCurve(p0, p1, p2, p3, segments = 120) {
    const points = [];
    for (let t = 0; t <= 1; t += 1 / segments) {
      const x = Math.pow((1 - t), 3) * p0[0] + 3 * Math.pow((1 - t), 2) * t * p1[0] + 3 * (1 - t) * t * t * p2[0] + t * t * t * p3[0];
      const y = Math.pow((1 - t), 3) * p0[1] + 3 * Math.pow((1 - t), 2) * t * p1[1] + 3 * (1 - t) * t * t * p2[1] + t * t * t * p3[1];
      points.push([x, y]);
    }
    return points;
  }

  buildPolygon(gA, gB) {
    if (!gA || !gB) return null;
    const geneHeightA = gA.geneHeight;
    const geneHeightB = gB.geneHeight;
    const halfH = Math.min(geneHeightA, geneHeightB) / 2;
    const trackYA = gA.trackY;
    const trackYB = gB.trackY;
    if (trackYA == null || trackYB == null) return null;
    const strandA = gA.strand;
    const strandB = gB.strand;
    let adjustedHalfStartA, adjustedHalfEndA, adjustedHalfStartB, adjustedHalfEndB;
    if (trackYA > trackYB) {
      adjustedHalfStartA = strandA === '+' ? -halfH : 0;
      adjustedHalfEndA = strandA === '+' ? 0 : -halfH;
      adjustedHalfStartB = strandB === '+' ? 0 : +halfH;
      adjustedHalfEndB = strandB === '+' ? -halfH : 0;
    } else {
      adjustedHalfStartA = strandA === '+' ? halfH : 0;
      adjustedHalfEndA = strandA === '+' ? 0 : +halfH;
      adjustedHalfStartB = strandB === '+' ? 0 : -halfH;
      adjustedHalfEndB = strandB === '+' ? halfH : 0;
    }
    const topLeft = [gA.start, trackYA + adjustedHalfStartA];
    const topRight = [gA.end, trackYA + adjustedHalfEndA];
    const bottomRight = [gB.end, trackYB + adjustedHalfStartB];
    const bottomLeft = [gB.start, trackYB - adjustedHalfEndB];
    const midYLeft = (topLeft[1] + bottomLeft[1]) / 2;
    const leftP0 = topLeft;
    const leftP3 = bottomLeft;
    const leftP1 = [leftP0[0] - 50, midYLeft];
    const leftP2 = [leftP3[0] - 50, midYLeft];
    const leftCurve = this.bezierCurve(leftP0, leftP1, leftP2, leftP3, 20);
    const midYRight = (topRight[1] + bottomRight[1]) / 2;
    const rightP0 = topRight;
    const rightP3 = bottomRight;
    const rightP1 = [rightP0[0] + 50, midYRight];
    const rightP2 = [rightP3[0] + 50, midYRight];
    const rightCurve = this.bezierCurve(rightP0, rightP1, rightP2, rightP3, 20);
    return [
      ...[topLeft], ...[topRight],
      ...rightCurve, ...[bottomRight],
      ...[bottomLeft], ...leftCurve.reverse()
    ];
  }
}

export default ProteinLink;
