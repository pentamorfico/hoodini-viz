// NucleotideLink.js
import Link from './Link';

class NucleotideLink extends Link {
  constructor(seqidA, startA, endA, seqidB, startB, endB, similarity, color = [220, 50, 50]) {
    super();
    this.seqidA = seqidA;
    this.seqidB = seqidB;
    
    // Determine original strand BEFORE normalization
    // positive strand (+) if start < end, negative strand (-) if start > end
    this.strandA = startA <= endA ? '+' : '-';
    this.strandB = startB <= endB ? '+' : '-';
    
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
    // Store original color for later use
    this.baseColor = Array.isArray(color) && color.length >= 3 ? color.slice(0, 3) : [220, 50, 50];
    // Use provided color, alpha based on similarity
    const alpha = Math.round(255 * (similarity / 100));
    this.fillColor = [...this.baseColor, alpha];
  }

  // Method to update color based on coloring configuration
  updateColor(colorConfig, paletteColor = null) {
    if (!colorConfig) {
      // Default behavior - use similarity-based alpha
      const alpha = Math.round(255 * (this.similarity / 100));
      this.fillColor = [...this.baseColor, alpha];
      return;
    }

    let baseColor = this.baseColor;
    let alpha = 255;

    switch (colorConfig.colorBy) {
      case 'solid':
        baseColor = colorConfig.solidColor ? colorConfig.solidColor.slice(0, 3) : this.baseColor;
        // For solid color mode, use the configured alpha if useAlpha is false, otherwise calculate it
        if (!colorConfig.useAlpha) {
          alpha = colorConfig.solidColor && colorConfig.solidColor.length > 3 ? colorConfig.solidColor[3] : 255;
        }
        break;
      case 'identity_gradient':
        if (paletteColor) {
          baseColor = paletteColor.slice(0, 3);
        }
        alpha = 255; // Start with full alpha, will be modified by useAlpha logic
        break;
      default:
        baseColor = this.baseColor;
        alpha = Math.round(255 * (this.similarity / 100));
    }

    // Calculate alpha based on configuration (applies to both solid and gradient modes)
    if (colorConfig.useAlpha) {
      // Interpolate alpha based on similarity
      const normalizedSimilarity = this.similarity / 100; // 0-1 range
      const alphaRange = colorConfig.maxAlpha - colorConfig.minAlpha;
      const calculatedAlpha = colorConfig.minAlpha + (normalizedSimilarity * alphaRange);
      alpha = Math.round(calculatedAlpha * 255);
    }

    this.fillColor = [...baseColor, alpha];
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
