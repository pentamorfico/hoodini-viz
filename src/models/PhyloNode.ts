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
    const leaves: PhyloNode[] = [];
    const stack: PhyloNode[] = [this];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (node.branchset.length === 0) {
        leaves.push(node);
      } else {
        // Push in reverse order so leftmost child is processed first
        for (let i = node.branchset.length - 1; i >= 0; i--) {
          stack.push(node.branchset[i]);
        }
      }
    }
    return leaves;
  }
}

export default PhyloNode;
