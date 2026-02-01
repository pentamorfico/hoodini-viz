import { DEFAULT_CONFIG, calculateTipWidth } from '../config/visualizationConfig';

// Fast Sutherland-Hodgman polygon clipping algorithm
// Much faster than polygon-clipping library for simple convex polygons
function clipPolygon(subjectPolygon: number[][], clipPolygon: number[][]): number[][] | null {
  if (!subjectPolygon || subjectPolygon.length < 3) return null;
  if (!clipPolygon || clipPolygon.length < 3) return subjectPolygon;

  let outputList = subjectPolygon.slice();

  for (let i = 0; i < clipPolygon.length; i++) {
    if (outputList.length === 0) return null;
    
    const inputList = outputList;
    outputList = [];
    
    const edgeStart = clipPolygon[i];
    const edgeEnd = clipPolygon[(i + 1) % clipPolygon.length];
    
    for (let j = 0; j < inputList.length; j++) {
      const current = inputList[j];
      const previous = inputList[(j + inputList.length - 1) % inputList.length];
      
      const currentInside = isInside(current, edgeStart, edgeEnd);
      const previousInside = isInside(previous, edgeStart, edgeEnd);
      
      if (currentInside) {
        if (!previousInside) {
          const intersection = lineIntersection(previous, current, edgeStart, edgeEnd);
          if (intersection) outputList.push(intersection);
        }
        outputList.push(current);
      } else if (previousInside) {
        const intersection = lineIntersection(previous, current, edgeStart, edgeEnd);
        if (intersection) outputList.push(intersection);
      }
    }
  }
  
  return outputList.length >= 3 ? outputList : null;
}

function isInside(point: number[], edgeStart: number[], edgeEnd: number[]): boolean {
  return (edgeEnd[0] - edgeStart[0]) * (point[1] - edgeStart[1]) - 
         (edgeEnd[1] - edgeStart[1]) * (point[0] - edgeStart[0]) >= 0;
}

function lineIntersection(p1: number[], p2: number[], p3: number[], p4: number[]): number[] | null {
  const d1x = p2[0] - p1[0];
  const d1y = p2[1] - p1[1];
  const d2x = p4[0] - p3[0];
  const d2y = p4[1] - p3[1];
  
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return null;
  
  const dx = p3[0] - p1[0];
  const dy = p3[1] - p1[1];
  const t = (dx * d2y - dy * d2x) / cross;
  
  return [p1[0] + t * d1x, p1[1] + t * d1y];
}

// Domain.js
class Domain {
  constructor(geneId, domainName, start, end, source, evalue, coverage, config = DEFAULT_CONFIG) {
    this.geneId = geneId;
    this.domainName = domainName;
    this.origStart = start;
    this.origEnd = end;
    this.start = start;
    this.end = end;
    this.source = source;
    // Convert evalue to number (may come as string from Parquet)
    this.evalue = typeof evalue === 'number' ? evalue : (evalue != null ? parseFloat(evalue) : 0);
    // Convert coverage to number (may come as string from Parquet)
    this.coverage = typeof coverage === 'number' ? coverage : (coverage != null ? parseFloat(coverage) : 0);
    this.parentGene = null;
    this.polygon = null;
    
    // Format evalue for display (already converted to number above)
    let evalueDisplay: string | number = this.evalue;
    if (!isNaN(this.evalue) && this.evalue > 0) {
      evalueDisplay = this.evalue < 0.001 ? this.evalue.toExponential(2) : this.evalue.toFixed(6);
    }
    
    // Format coverage as percentage (already converted to number above)
    let coverageDisplay: string | number = this.coverage;
    if (!isNaN(this.coverage)) {
      coverageDisplay = `${(this.coverage * 100).toFixed(1)}%`;
    }
    
    this.metadata = { 
      geneId, 
      domainName, 
      start, 
      end, 
      source, 
      evalue: evalueDisplay, 
      coverage: coverageDisplay 
    };
    this.config = config || DEFAULT_CONFIG;
  }

  setParentGene(gene) {
    this.parentGene = gene;
    this.updatePolygon();
  }

  updatePolygon() {
    if (!this.parentGene || !this.parentGene.polygon) return;
    const g = this.parentGene;
    // Use original domain coordinates (origStart/origEnd) and let the
    // creation routine decide whether to flip based on original vs visual
    // gene strand. This avoids duplicated flipping/scale logic elsewhere.
    const domainPoly = this.createDomainPolygon(g, this.origStart, this.origEnd);
    
    if (domainPoly && g.polygon) {
      // Build a CONVEX 5-vertex arrow polygon for clipping.
      // The 7-vertex gene polygon (with arrowhead) is CONCAVE and 
      // Sutherland-Hodgman doesn't work correctly with concave clip polygons.
      // Using a 5-vertex arrow covers the full gene area and is convex.
      const convexClipPoly = this.getConvexGenePolygon(g);
      this.polygon = clipPolygon(domainPoly, convexClipPoly);
    } else {
      this.polygon = domainPoly;
    }
  }

  // Build a convex 5-vertex arrow polygon for clipping
  // This covers the full gene area (body + tip) and works with Sutherland-Hodgman
  getConvexGenePolygon(g) {
    const geneHeight = g.geneHeight || g.config?.gene?.height || 60;
    const halfH = geneHeight / 2;
    const trackY = g.trackY;
    
    let start = Math.min(g.start, g.end);
    let end = Math.max(g.start, g.end);
    const length = end - start;
    const tipWidth = calculateTipWidth(length, g.config?.gene);
    const isForward = g.strand === '+';
    
    // When tipWidth is 0 or very small, return a simple rectangle for clipping
    // Clockwise order for Sutherland-Hodgman algorithm
    if (tipWidth < 1) {
      return [
        [start, trackY - halfH],
        [end, trackY - halfH],
        [end, trackY + halfH],
        [start, trackY + halfH]
      ];
    }
    
    // 5-vertex convex arrow polygon in CLOCKWISE order
    // This is required for the Sutherland-Hodgman clipping algorithm to work correctly.
    // Use gene body height (halfH) for all vertices to ensure domains
    // don't extend beyond the gene body. The arrowheadHeight only affects
    // the visual gene rendering, not the clipping area for domains.
    if (isForward) {
      // Forward arrow: tip on right
      // Clockwise: top-left → top-right-body → tip → bottom-right-body → bottom-left
      return [
        [start, trackY - halfH],
        [end - tipWidth, trackY - halfH],
        [end, trackY],  // tip
        [end - tipWidth, trackY + halfH],
        [start, trackY + halfH]
      ];
    } else {
      // Reverse arrow: tip on left
      // Clockwise: top-left → top-right → bottom-right → bottom-left-body → tip → top-left-body
      // Wait, that's 6 points. Let me reconsider.
      // For a 5-vertex arrow pointing left, clockwise order is:
      // top-right-body → top-left-body → tip → bottom-left-body → bottom-right-body
      // But we need to start from a consistent point. Let's reverse the anticlockwise order.
      // Original (anticlockwise): [end,-H], [start+tw,-H], [start,0], [start+tw,+H], [end,+H]
      // Reversed (clockwise):     [end,+H], [start+tw,+H], [start,0], [start+tw,-H], [end,-H]
      return [
        [end, trackY + halfH],
        [start + tipWidth, trackY + halfH],
        [start, trackY],  // tip
        [start + tipWidth, trackY - halfH],
        [end, trackY - halfH]
      ];
    }
  }

  createDomainPolygon(g, domainStart, domainEnd) {
    // Use the true gene start: lower for +, higher for -
  const geneStartCoord = g.start;
  const geneEndCoord = g.end;
  const geneMin = Math.min(geneStartCoord, geneEndCoord);
  const geneMax = Math.max(geneStartCoord, geneEndCoord);
  const geneLength = geneMax - geneMin;

  // Guard against degenerate gene length or missing centerLine
  if (!g.centerLine || !Array.isArray(g.centerLine) || g.centerLine.length < 2) return null;
  if (!isFinite(geneLength) || geneLength <= 0) return null;

  // Domain coordinates are in amino acids relative to the START of the protein (5' end of mRNA).
  // For '+' strand genes: protein starts at gene start (lower genomic coordinate)
  // For '-' strand genes: protein starts at gene end (higher genomic coordinate)
  //
  // The centerLine goes from centerLine[0] (t=0) to centerLine[1] (t=1).
  // For '+' strand: t=0 is at the gene start (where protein starts) - no flip needed
  // For '-' strand: t=0 is at the gene visual start (arrow body), but protein starts at arrow tip (t=1)
  //                 So we need to flip domain coordinates: t' = 1 - t
  
  const geneOrigLength = Math.abs(g.origEnd - g.origStart); // Original gene length in nucleotides
  const geneAALength = geneOrigLength / 3; // Convert to amino acids (approximate)
  
  // Calculate domain positions as fractions of the gene length
  let domainRelStart = domainStart / geneAALength;
  let domainRelEnd = domainEnd / geneAALength;
  
  // Clamp to [0,1] to ensure domains stay within gene bounds
  domainRelStart = Math.max(0, Math.min(1, domainRelStart));
  domainRelEnd = Math.max(0, Math.min(1, domainRelEnd));
  
  // For '-' strand genes, flip the domain positions
  // because protein starts at the opposite end of the centerLine
  if (g.strand === '-') {
    const flippedStart = 1 - domainRelEnd;
    const flippedEnd = 1 - domainRelStart;
    domainRelStart = flippedStart;
    domainRelEnd = flippedEnd;
  }

  const startPos = this.interpolateOnLine(g.centerLine, domainRelStart);
  const endPos = this.interpolateOnLine(g.centerLine, domainRelEnd);
  
  const perp = this.perpVector(g.centerLine[0], g.centerLine[1]);
  const normPerp = this.normalize(perp);
  // Compute half-height based on the gene BODY height (not arrowhead height).
  // Domains should fit within the gene body, not extend to the arrowhead tip.
  // Using arrowheadHeight here would cause domains to be clipped out when
  // the arrowheadHeight is large and the domain is not at the tip.
  const geneHalfH = (typeof g.geneHeight === 'number' ? g.geneHeight : (g.config && g.config.gene && g.config.gene.height ? g.config.gene.height : 10)) / 2;
  const domainFactor = (g.config && g.config.domain && typeof g.config.domain.heightFactor === 'number') ? g.config.domain.heightFactor : (this.config && this.config.domain && this.config.domain.heightFactor) || 0.6;
  const halfH = geneHalfH * domainFactor;
  const p1 = [startPos[0] - normPerp[0] * halfH, startPos[1] - normPerp[1] * halfH];
  const p2 = [endPos[0] - normPerp[0] * halfH, endPos[1] - normPerp[1] * halfH];
  const p3 = [endPos[0] + normPerp[0] * halfH, endPos[1] + normPerp[1] * halfH];
  const p4 = [startPos[0] + normPerp[0] * halfH, startPos[1] + normPerp[1] * halfH];
  
    return [p1, p2, p3, p4];
  }

  interpolateOnLine(line, t) {
    const [p0, p1] = line;
    return [
      p0[0] + (p1[0] - p0[0]) * t,
      p0[1] + (p1[1] - p0[1]) * t
    ];
  }

  perpVector(p0, p1) {
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    return [-dy, dx];
  }

  normalize(v) {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    if (len === 0) return [0, 1];
    return [v[0] / len, v[1] / len];
  }
}

export default Domain;
