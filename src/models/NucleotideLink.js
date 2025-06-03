// NucleotideLink.js
import Link from './Link';

class NucleotideLink extends Link {
  constructor(seqidA, startA, endA, seqidB, startB, endB, similarity, color = [220, 50, 50]) {
    super();
    this.seqidA = seqidA;
    this.seqidB = seqidB;
    // Ensure startA < endA
    if (startA > endA) {
      [startA, endA] = [endA, startA];
    }
    // Ensure startB < endB
    if (startB > endB) {
      [startB, endB] = [endB, startB];
    }
    this.origStartA = startA;
    this.origEndA = endA;
    this.origStartB = startB;
    this.origEndB = endB;
    this.startA = startA;
    this.endA = endA;
    this.startB = startB;
    this.endB = endB;
    this.similarity = similarity;
    // Use provided color, alpha based on similarity
    const alpha = Math.round(255 * (similarity / 100));
    this.fillColor = [...color, alpha];
  }

  buildPolygon(yA, yB) {
    // Compute all four corners
    const xs = [this.startA, this.endA, this.startB, this.endB];
    const ys = [yA, yA, yB, yB];
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    // Rectangle: (minX, maxY), (maxX, maxY), (maxX, minY), (minX, minY)
    return [
      [minX, maxY],
      [maxX, maxY],
      [maxX, minY],
      [minX, minY]
    ];
  }

  // Build an axis-aligned rectangle polygon from any four x/y values
  buildPolygonFromCoords(xA1, xA2, xB1, xB2, yA, yB) {
    // Use the original four points, but order them: minX at yA, maxX at yA, maxX at yB, minX at yB
    // Collect the two points for yA and two for yB
    const pointsA = [ [xA1, yA], [xA2, yA] ];
    const pointsB = [ [xB1, yB], [xB2, yB] ];
    // Sort by x
    pointsA.sort((a, b) => a[0] - b[0]);
    pointsB.sort((a, b) => a[0] - b[0]);
    // Order: minX at yA, maxX at yA, maxX at yB, minX at yB
    return [
      pointsA[0],
      pointsA[1],
      pointsB[1],
      pointsB[0]
    ];
  }
}

export default NucleotideLink;
