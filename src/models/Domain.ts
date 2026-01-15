import polygonClipping from 'polygon-clipping';
import { DEFAULT_CONFIG } from '../config/visualizationConfig';

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
    this.evalue = evalue;
    this.coverage = coverage;
    this.parentGene = null;
    this.polygon = null;
    
    // Format evalue for display - use scientific notation if very small
    const evalueDisplay = (evalue && evalue > 0) ? 
      (evalue < 0.001 ? evalue.toExponential(2) : evalue.toFixed(6)) : 
      evalue;
    
    // Format coverage as percentage
    const coverageDisplay = coverage ? `${(coverage * 100).toFixed(1)}%` : coverage;
    
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
  let domainPoly = this.createDomainPolygon(g, this.origStart, this.origEnd);
    if (domainPoly && g.polygon) {
      // Clip domain polygon to gene polygon
      const genePoly = [g.polygon];
      const domainPolyArr = [domainPoly];
      const clipped = polygonClipping.intersection(genePoly, domainPolyArr);
      if (clipped && clipped.length > 0) {
        // polygon-clipping may return nested arrays for multipolygons or rings.
        // Try to pick the first coordinate ring we can render (array of [x,y]).
        let chosen = null;
        for (const part of clipped) {
          if (!Array.isArray(part) || part.length === 0) continue;
          // part may be a ring ([[x,y],...]) or an array of rings ([[[x,y],...], ...])
          if (Array.isArray(part[0]) && Array.isArray(part[0][0]) && typeof part[0][0][0] === 'number') {
            // part[0] is a ring
            chosen = part[0];
            break;
          }
          if (Array.isArray(part[0]) && typeof part[0][0] === 'number') {
            chosen = part;
            break;
          }
        }
        this.polygon = chosen || null;
      } else {
        this.polygon = null;
      }
    } else {
      this.polygon = domainPoly;
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

  // Domain coordinates are in amino acids/nucleotides relative to gene start
  // We need to convert them to proportions along the visual gene length.
  // Assume domain coordinates are in amino acids, so we need the gene length in the same units
  const geneOrigLength = Math.abs(g.origEnd - g.origStart); // Original gene length in nucleotides
  const geneAALength = geneOrigLength / 3; // Convert to amino acids (approximate)
  
  // Calculate domain positions as fractions of the gene length.
  // CenterLine already accounts for visual strand orientation, so no manual flip needed.
  let domainRelStart = domainStart / geneAALength;
  let domainRelEnd = domainEnd / geneAALength;
  
  // Clamp to [0,1] to ensure domains stay within gene bounds
  domainRelStart = Math.max(0, Math.min(1, domainRelStart));
  domainRelEnd = Math.max(0, Math.min(1, domainRelEnd));

  const startPos = this.interpolateOnLine(g.centerLine, domainRelStart);
  const endPos = this.interpolateOnLine(g.centerLine, domainRelEnd);
  const perp = this.perpVector(g.centerLine[0], g.centerLine[1]);
  const normPerp = this.normalize(perp);
  // Compute half-height accounting for arrowhead height so domains are sized
  // relative to the visual gene polygon (which includes arrowhead extension).
  const geneHalfH = (typeof g.geneHeight === 'number' ? g.geneHeight : (g.config && g.config.gene && g.config.gene.height ? g.config.gene.height : 10)) / 2;
  const arrowheadHeight = (g.config && g.config.gene && typeof g.config.gene.arrowheadHeight === 'number') ? g.config.gene.arrowheadHeight : 0;
  const arrowheadHalfHeight = geneHalfH + (arrowheadHeight / 2);
  const domainFactor = (g.config && g.config.domain && typeof g.config.domain.heightFactor === 'number') ? g.config.domain.heightFactor : (this.config && this.config.domain && this.config.domain.heightFactor) || 0.6;
  const halfH = arrowheadHalfHeight * domainFactor;
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
