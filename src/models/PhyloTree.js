// PhyloTree.js
import PhyloNode from './PhyloNode';

// Configurable vertical spacing for tree leaves
const TREE_Y_SPACING = 200;

class PhyloTree {
  constructor(newickStr) {
    this.root = this.parseNewick(newickStr);
    this.allNodes = [];
    this.leafNodes = [];
    this.collectAll();
  }

  parseNewick(s) {
    var ancestors = [];
    var tree = new PhyloNode();
    var tokens = s.split(/\s*(;|\(|\)|,|:)\s*/);
    var cid=0;
    for (var i=0; i<tokens.length; i++) {
      var token = tokens[i];
      switch (token) {
        case '(': {
          var subtree = new PhyloNode();
          subtree.id = cid++;
          tree.branchset = [subtree];
          ancestors.push(tree);
          tree = subtree;
          break;
        }
        case ',': {
          var subtree = new PhyloNode();
          subtree.id = cid++;
          ancestors[ancestors.length-1].branchset.push(subtree);
          tree = subtree;
          break;
        }
        case ')':
          tree = ancestors.pop();
          break;
        case ':':
          break;
        default: {
          var x = tokens[i-1];
          if (x == ')' || x == '(' || x == ',') {
            tree.name = token;
          } else if (x == ':') {
            tree.branchLength = parseFloat(token);
          }
          tree.id = (tree.id !== null) ? tree.id : cid++;
        }
      }
    }
    return tree;
  }

  collectAll() {
    this.allNodes = [];
    const collect=(node)=>{
      this.allNodes.push(node);
      for(let ch of node.branchset) collect(ch);
    };
    collect(this.root);
  }

  setParents() {
    const setP=(node,p=null)=>{
      node.parent=p;
      for(let ch of node.branchset) setP(ch,node);
    };
    setP(this.root,null);
  }

  computeDistances() {
    const preOrderComputeDist=(node)=>{
      node.rootDist=(node.parent?node.parent.rootDist:0)+(node.branchLength||0);
      for(let ch of node.branchset) preOrderComputeDist(ch);
    };
    preOrderComputeDist(this.root);
  }

  getLeafNodes() {
    return this.root.getLeaves();
  }

  assignX(leaves) {
    for (let i=0;i<leaves.length;i++) {
      leaves[i].x = i * TREE_Y_SPACING;
    }
  }

  assignInternalX(node) {
    if(node.branchset.length===0) return node.x;
    const xs=node.branchset.map(ch=>this.assignInternalX(ch));
    node.x=xs.reduce((a,b)=>a+b,0)/xs.length;
    return node.x;
  }

  scaleY() {
    const rootDists=this.allNodes.map(n=>n.rootDist);
    const maxDist=Math.max(...rootDists);
    const yScaleFactor=800/(maxDist>0?maxDist:1);
    for(let n of this.allNodes) {
      n.y=n.rootDist*yScaleFactor;
    }
  }

  layout(leavesOrder) {
    this.setParents();
    if(leavesOrder) {
      this.leafNodes=this.getLeafNodes();
      this.leafNodes.sort((a,b)=> leavesOrder.indexOf(a.name)-leavesOrder.indexOf(b.name));
      this.assignX(this.leafNodes);
    } else {
      this.leafNodes=this.getLeafNodes();
      this.assignX(this.leafNodes);
    }
    this.assignInternalX(this.root);
    this.computeDistances();
    this.scaleY();
  }

  buildEdges() {
    const edges=[];
    const build=(node)=>{
      for(let ch of node.branchset) {
        const path=[
          [node.y,node.x],
          [node.y,ch.x],
          [ch.y,ch.x]
        ];
        edges.push({path:path,color:[85,85,85,255],source:node,target:ch});
        build(ch);
      }
    };
    build(this.root);
    return edges;
  }
}

export default PhyloTree;
