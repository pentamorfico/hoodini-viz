// ProteinLink.js
import Link from './Link';

class ProteinLink extends Link {
  constructor(gAId, gBId, similarity, color = [50, 100, 220]) {
    super();
    this.gAId = gAId;
    this.gBId = gBId;
    this.similarity = similarity;
    // Use provided color, alpha based on similarity
    const alpha = Math.round(255 * (similarity / 100));
    // Take only RGB values from color (first 3 elements) and add similarity-based alpha
    const baseColor = Array.isArray(color) && color.length >= 3 ? color.slice(0, 3) : [50, 100, 220];
    this.fillColor = [...baseColor, alpha];
    this.metadata = { gAId, gBId, similarity };
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
    // Get left/right x for each gene
    const aLeftX = Math.min(gA.start, gA.end);
    const aRightX = Math.max(gA.start, gA.end);
    const bLeftX = Math.min(gB.start, gB.end);
    const bRightX = Math.max(gB.start, gB.end);
    // Get center Y for each gene
    const yA = gA.trackY;
    const yB = gB.trackY;
    // Determine which gene is visually on top
    let top, bottom;
    if (yA <= yB) {
      top = { left: [aLeftX, yA], right: [aRightX, yA] };
      bottom = { left: [bLeftX, yB], right: [bRightX, yB] };
    } else {
      top = { left: [bLeftX, yB], right: [bRightX, yB] };
      bottom = { left: [aLeftX, yA], right: [aRightX, yA] };
    }
    // Always go top.right -> bottom.right for the top curve
    // and bottom.left -> top.left for the bottom curve
    const midY = (top.left[1] + bottom.right[1]) / 2;
    const curve = (p0, p1) => this.bezierCurve(p0, [p0[0], midY], [p1[0], midY], p1, 20);
    const topCurve = curve(top.right, bottom.right); // top to bottom
    const bottomCurve = curve(bottom.left, top.left); // bottom to top
    // Clockwise: top.left, top.right, ...topCurve, bottom.right, bottom.left, ...bottomCurve
    return [top.left, top.right, ...topCurve, bottom.right, bottom.left, ...bottomCurve];
  }
}

export default ProteinLink;
