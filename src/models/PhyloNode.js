// PhyloNode.js
class PhyloNode {
  constructor() {
    this.id = null;
    this.name = null;
    this.branchLength = 0;
    this.parent = null;
    this.branchset = [];
    this.x = 0;
    this.y = 0;
    this.rootDist = 0;
  }
  getLeaves() {
    if (this.branchset.length === 0) return [this];
    return this.branchset.flatMap(ch => ch.getLeaves());
  }
}

export default PhyloNode;
