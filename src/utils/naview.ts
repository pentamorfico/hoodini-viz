/**
 * NAView RNA Secondary Structure Layout Algorithm
 * Ported from ViennaRNA/fornac (https://github.com/ViennaRNA/fornac)
 * Original algorithm by Robert E. Bruccoleri and Heinrich, 1988
 */

// ============================================================================
// Helper Classes
// ============================================================================

class Region {
  start1: number = 0;
  end1: number = 0;
  start2: number = 0;
  end2: number = 0;
}

class Base {
  mate: number = 0;
  x: number = 0;
  y: number = 0;
  extracted: boolean = false;
  region: Region | null = null;
}

class Connection {
  loop: Loop | null = null;
  region: Region | null = null;
  start: number = 0;
  end: number = 0;
  xrad: number = 0;
  yrad: number = 0;
  angle: number = 0;
  extruded: boolean = false;
  broken: boolean = false;
  isNull: boolean = false;
}

class Loop {
  nconnection: number = 0;
  connections: (Connection | null)[] = [];
  number: number = 0;
  depth: number = 0;
  mark: boolean = false;
  x: number = 0;
  y: number = 0;
  radius: number = 0;

  getConnection(i: number): Connection | null {
    if (!this.connections[i]) {
      this.connections[i] = new Connection();
      this.connections[i]!.isNull = true;
    }
    const c = this.connections[i];
    return c?.isNull ? null : c;
  }

  setConnection(i: number, c: Connection | null) {
    if (c !== null) {
      this.connections[i] = c;
    } else {
      if (!this.connections[i]) {
        this.connections[i] = new Connection();
      }
      this.connections[i]!.isNull = true;
    }
  }
}

// ============================================================================
// NAView Layout Algorithm
// ============================================================================

export interface NAViewResult {
  x: number[];
  y: number[];
  nbase: number;
}

export class NAView {
  private ANUM = 9999.0;
  private MAXITER = 500;
  private bases: Base[] = [];
  private nbase: number = 0;
  private nregion: number = 0;
  private loopCount: number = 0;
  private root: Loop = new Loop();
  private loops: Loop[] = [];
  private regions: Region[] = [];
  private lencut = 0.8;
  private RADIUS_REDUCTION_FACTOR = 1.4;
  private HELIX_FACTOR = 0.6;
  private BACKBONE_DISTANCE = 20;
  private angleinc: number = 0;
  private _h: number = 0;

  naviewXyCoordinates(pairTable: number[]): NAViewResult {
    const x: number[] = [];
    const y: number[] = [];

    if (pairTable.length === 0 || pairTable[0] === 0) {
      return { x: [], y: [], nbase: 0 };
    }

    this.nbase = pairTable[0];
    this.bases = [];
    this.regions = [];
    this.loops = [];

    for (let i = 0; i <= this.nbase; i++) {
      this.bases.push(new Base());
      this.regions.push(new Region());
      this.loops.push(new Loop());
    }

    this.readInBases(pairTable);
    this.findRegions();
    this.loopCount = 0;
    this.constructLoop(0);
    this.findCentralLoop();
    this.traverseLoop(this.root, null);

    for (let i = 0; i < this.nbase; i++) {
      x.push(100 + this.BACKBONE_DISTANCE * this.bases[i + 1].x);
      y.push(100 + this.BACKBONE_DISTANCE * this.bases[i + 1].y);
    }

    return { x, y, nbase: this.nbase };
  }

  private readInBases(pairTable: number[]) {
    // Set up an origin
    this.bases[0].mate = 0;
    this.bases[0].extracted = false;
    this.bases[0].x = this.ANUM;
    this.bases[0].y = this.ANUM;

    let npairs = 0;
    for (let i = 1; i <= this.nbase; i++) {
      this.bases[i].extracted = false;
      this.bases[i].x = this.ANUM;
      this.bases[i].y = this.ANUM;
      this.bases[i].mate = pairTable[i];
      if (pairTable[i] > i) npairs++;
    }

    // Must have at least 1 pair to avoid issues
    if (npairs === 0) {
      this.bases[1].mate = this.nbase;
      this.bases[this.nbase].mate = 1;
    }
  }

  private findRegions() {
    const mark: boolean[] = new Array(this.nbase + 1).fill(false);
    this.nregion = 0;

    for (let i = 0; i <= this.nbase; i++) {
      const mate = this.bases[i].mate;
      if (mate !== 0 && !mark[i]) {
        this.regions[this.nregion].start1 = i;
        this.regions[this.nregion].end2 = mate;
        mark[i] = true;
        mark[mate] = true;
        this.bases[i].region = this.regions[this.nregion];
        this.bases[mate].region = this.regions[this.nregion];

        let ii = i + 1;
        let mm = mate - 1;
        while (ii < mm && this.bases[ii].mate === mm) {
          mark[mm] = true;
          mark[ii] = true;
          this.bases[ii].region = this.regions[this.nregion];
          this.bases[mm].region = this.regions[this.nregion];
          ii++;
          mm--;
        }

        this.regions[this.nregion].end1 = ii - 1;
        this.regions[this.nregion].start2 = mm + 1;
        this.nregion++;
      }
    }
  }

  private constructLoop(ibase: number): Loop {
    const retloop = this.loops[this.loopCount++];
    retloop.nconnection = 0;
    retloop.depth = 0;
    retloop.number = this.loopCount;
    retloop.radius = 0.0;

    let i = ibase;
    do {
      const mate = this.bases[i].mate;
      if (mate !== 0) {
        const rp = this.bases[i].region;
        if (rp && !this.bases[rp.start1].extracted) {
          let lp: Loop;
          if (i === rp.start1) {
            this.bases[rp.start1].extracted = true;
            this.bases[rp.end1].extracted = true;
            this.bases[rp.start2].extracted = true;
            this.bases[rp.end2].extracted = true;
            lp = this.constructLoop(rp.end1 < this.nbase ? rp.end1 + 1 : 0);
          } else if (i === rp.start2) {
            this.bases[rp.start2].extracted = true;
            this.bases[rp.end2].extracted = true;
            this.bases[rp.start1].extracted = true;
            this.bases[rp.end1].extracted = true;
            lp = this.constructLoop(rp.end2 < this.nbase ? rp.end2 + 1 : 0);
          } else {
            lp = new Loop();
          }

          retloop.nconnection++;
          const cp = new Connection();
          retloop.setConnection(retloop.nconnection - 1, cp);
          retloop.setConnection(retloop.nconnection, null);
          cp.loop = lp;
          cp.region = rp;

          if (i === rp.start1) {
            cp.start = rp.start1;
            cp.end = rp.end2;
          } else {
            cp.start = rp.start2;
            cp.end = rp.end1;
          }
          cp.extruded = false;
          cp.broken = false;

          lp.nconnection++;
          const cp2 = new Connection();
          lp.setConnection(lp.nconnection - 1, cp2);
          lp.setConnection(lp.nconnection, null);
          cp2.loop = retloop;
          cp2.region = rp;

          if (i === rp.start1) {
            cp2.start = rp.start2;
            cp2.end = rp.end1;
          } else {
            cp2.start = rp.start1;
            cp2.end = rp.end2;
          }
          cp2.extruded = false;
          cp2.broken = false;
        }
        i = mate;
      }
      i++;
      if (i > this.nbase) i = 0;
    } while (i !== ibase);

    return retloop;
  }

  private findCentralLoop() {
    this.determineDepths();
    let maxconn = 0;
    let maxdepth = -1;

    for (let i = 0; i < this.loopCount; i++) {
      const lp = this.loops[i];
      if (lp.nconnection > maxconn) {
        maxdepth = lp.depth;
        maxconn = lp.nconnection;
        this.root = lp;
      } else if (lp.depth > maxdepth && lp.nconnection === maxconn) {
        maxdepth = lp.depth;
        this.root = lp;
      }
    }
  }

  private determineDepths() {
    for (let i = 0; i < this.loopCount; i++) {
      const lp = this.loops[i];
      for (let j = 0; j < this.loopCount; j++) {
        this.loops[j].mark = false;
      }
      lp.depth = this.depth(lp);
    }
  }

  private depth(lp: Loop): number {
    if (lp.nconnection <= 1) return 0;
    if (lp.mark) return -1;
    lp.mark = true;

    let count = 0;
    let ret = 0;

    for (let i = 0; lp.getConnection(i) !== null; i++) {
      const conn = lp.getConnection(i);
      if (conn?.loop) {
        const d = this.depth(conn.loop);
        if (d >= 0) {
          if (++count === 1) {
            ret = d;
          } else if (ret > d) {
            ret = d;
          }
        }
      }
    }

    lp.mark = false;
    return ret + 1;
  }

  private traverseLoop(lp: Loop, anchorConnection: Connection | null) {
    const angleinc = (2 * Math.PI) / (this.nbase + 1);
    let acp: Connection | null = null;
    let icroot = -1;

    // Calculate angles for connections
    for (let ic = 0; lp.getConnection(ic) !== null; ic++) {
      const cp = lp.getConnection(ic)!;
      const xs = -Math.sin(angleinc * cp.start);
      const ys = Math.cos(angleinc * cp.start);
      const xe = -Math.sin(angleinc * cp.end);
      const ye = Math.cos(angleinc * cp.end);

      const xn = ye - ys;
      const yn = xs - xe;
      const r = Math.sqrt(xn * xn + yn * yn);

      cp.xrad = xn / r;
      cp.yrad = yn / r;
      cp.angle = Math.atan2(yn, xn);
      if (cp.angle < 0) cp.angle += 2 * Math.PI;

      if (anchorConnection !== null && anchorConnection.region === cp.region) {
        acp = cp;
        icroot = ic;
      }
    }

    // Main layout loop
    this.determineRadius(lp, this.lencut);
    const radius = lp.radius / this.RADIUS_REDUCTION_FACTOR;

    let xc: number, yc: number;
    if (anchorConnection === null) {
      xc = yc = 0.0;
    } else if (acp) {
      const xo = (this.bases[acp.start].x + this.bases[acp.end].x) / 2.0;
      const yo = (this.bases[acp.start].y + this.bases[acp.end].y) / 2.0;
      xc = xo - radius * acp.xrad;
      yc = yo - radius * acp.yrad;
    } else {
      xc = yc = 0.0;
    }

    // Place connections on the circle
    for (let ic = 0; lp.getConnection(ic) !== null; ic++) {
      const cp = lp.getConnection(ic)!;
      if (anchorConnection === null || (acp && acp !== cp)) {
        const astart = cp.angle - Math.asin(1.0 / 2.0 / radius);
        const aend = cp.angle + Math.asin(1.0 / 2.0 / radius);

        this.bases[cp.start].x = xc + radius * Math.cos(astart);
        this.bases[cp.start].y = yc + radius * Math.sin(astart);
        this.bases[cp.end].x = xc + radius * Math.cos(aend);
        this.bases[cp.end].y = yc + radius * Math.sin(aend);
      }
    }

    // Place nucleotides between connections
    for (let ic = 0; lp.getConnection(ic) !== null; ic++) {
      const cp = lp.getConnection(ic)!;
      let j = ic + 1;
      if (lp.getConnection(j) === null) j = 0;
      const cpnext = lp.getConnection(j);
      if (!cpnext) continue;

      const dx = this.bases[cp.end].x - xc;
      const dy = this.bases[cp.end].y - yc;
      const rc = Math.sqrt(dx * dx + dy * dy);
      let ac = Math.atan2(dy, dx);
      if (ac < 0) ac += 2 * Math.PI;

      const dx2 = this.bases[cpnext.start].x - xc;
      const dy2 = this.bases[cpnext.start].y - yc;
      const rcn = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      let acn = Math.atan2(dy2, dx2);
      if (acn < 0) acn += 2 * Math.PI;
      if (acn < ac) acn += 2 * Math.PI;

      const dan = acn - ac;
      let n = cpnext.start - cp.end;
      if (n < 0) n += this.nbase + 1;

      const angleStep = dan / n;
      for (let k = 1; k < n; k++) {
        let idx = cp.end + k;
        if (idx > this.nbase) idx -= this.nbase + 1;
        const a = ac + k * angleStep;
        const rr = rc + (rcn - rc) * (a - ac) / dan;
        this.bases[idx].x = xc + rr * Math.cos(a);
        this.bases[idx].y = yc + rr * Math.sin(a);
      }
    }

    // Generate regions (stems)
    for (let ic = 0; lp.getConnection(ic) !== null; ic++) {
      if (icroot !== ic) {
        const cp = lp.getConnection(ic)!;
        this.generateRegion(cp);
        if (cp.loop) {
          this.traverseLoop(cp.loop, cp);
        }
      }
    }

    // Calculate loop center
    let n = 0;
    let sx = 0.0;
    let sy = 0.0;

    for (let ic = 0; lp.getConnection(ic) !== null; ic++) {
      const cp = lp.getConnection(ic)!;
      n += 2;
      sx += this.bases[cp.start].x + this.bases[cp.end].x;
      sy += this.bases[cp.start].y + this.bases[cp.end].y;
    }

    if (n > 0) {
      lp.x = sx / n;
      lp.y = sy / n;
    }
  }

  private determineRadius(lp: Loop, lencut: number) {
    const rt2_2 = 0.7071068;
    let mindit: number;

    do {
      mindit = 1.0e10;
      let sumd = 0.0;
      let sumn = 0.0;

      for (let i = 0; i < lp.nconnection; i++) {
        const cp = lp.getConnection(i);
        if (!cp) continue;

        let j = i + 1;
        if (j >= lp.nconnection) j = 0;
        const cpnext = lp.getConnection(j);
        if (!cpnext) continue;

        const end = cp.end;
        let start = cpnext.start;
        if (start < end) start += this.nbase + 1;

        let dt = cpnext.angle - cp.angle;
        if (dt <= 0) dt += 2 * Math.PI;

        let ci: number;
        if (!cp.extruded) {
          ci = start - end;
        } else {
          ci = dt <= Math.PI / 2 ? 2.0 : 1.5;
        }

        sumn += dt * (1.0 / ci + 1.0);
        sumd += (dt * dt) / ci;

        const dit = dt / ci;
        if (dit < mindit && !cp.extruded && ci > 1.0) {
          mindit = dit;
        }
      }

      let radius = sumn / sumd;
      if (radius < rt2_2) radius = rt2_2;

      if (lp.radius > 0) {
        radius = lp.radius;
      } else {
        lp.radius = radius;
      }

      if (mindit * radius >= lencut) break;

      // Find connection to extrude
      for (let i = 0; i < lp.nconnection; i++) {
        const cp = lp.getConnection(i);
        if (cp && !cp.extruded) {
          cp.extruded = true;
          break;
        }
      }
    } while (mindit * lp.radius < lencut);
  }

  private generateRegion(cp: Connection) {
    const rp = cp.region;
    if (!rp) return;

    let start: number, end: number;
    if (cp.start === rp.start1) {
      start = rp.start1;
      end = rp.end1;
    } else {
      start = rp.start2;
      end = rp.end2;
    }

    let l = 0;
    for (let i = start + 1; i <= end; i++) {
      l++;
      this.bases[i].x = this.bases[cp.start].x + this.HELIX_FACTOR * l * cp.xrad;
      this.bases[i].y = this.bases[cp.start].y + this.HELIX_FACTOR * l * cp.yrad;

      const mate = this.bases[i].mate;
      this.bases[mate].x = this.bases[cp.end].x + this.HELIX_FACTOR * l * cp.xrad;
      this.bases[mate].y = this.bases[cp.end].y + this.HELIX_FACTOR * l * cp.yrad;
    }
  }
}

// ============================================================================
// Public API
// ============================================================================

export function naviewXyCoordinates(pairTable: number[]): NAViewResult {
  const naview = new NAView();
  return naview.naviewXyCoordinates(pairTable);
}
