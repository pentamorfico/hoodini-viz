// PhyloTree.js
import PhyloNode from './PhyloNode';
import { DEFAULT_CONFIG } from '../config/visualizationConfig';

class PhyloTree {
  /**
   * Create a PhyloTree from a Newick string or from a flat list of leaf names.
   * @param {string|string[]} newickStrOrLeaves - Newick string OR array of hood_ids for no-tree mode
   * @param {object} config
   * @param {boolean} ultrametric
   * @param {object} themeColors
   */
  constructor(newickStrOrLeaves, config = DEFAULT_CONFIG, ultrametric = false, themeColors = null) {
    this.config = config;
    this.themeColors = themeColors;
    this.allNodes = [];
    this.leafNodes = [];
    
    // Check if we have a Newick string or a flat list of leaves (no-tree mode)
    if (Array.isArray(newickStrOrLeaves)) {
      // No-tree mode: create a flat structure with only leaves
      this.hasTree = false;
      this.root = this._createFlatRoot(newickStrOrLeaves);
    } else if (!newickStrOrLeaves || newickStrOrLeaves.trim() === '') {
      // Empty newick: create empty root
      this.hasTree = false;
      this.root = new PhyloNode();
      this.root.id = 0;
    } else {
      // Normal Newick parsing with safety fallback
      try {
        this.root = this.parseNewick(newickStrOrLeaves);
        this.hasTree = true;
      } catch (e) {
        console.warn('[PhyloTree] failed to parse Newick; using empty tree', e?.message || e);
        this.hasTree = false;
        this.root = new PhyloNode();
        this.root.id = 0;
      }
    }
    
    this.collectAll();
    
    // Apply ultrametric conversion if requested (only for actual trees)
    if (ultrametric && this.hasTree) {
      this.makeUltrametric();
    }
  }

  /**
   * Create a flat "fake" tree root with all leaves as direct children.
   * This enables GenomeView to work without a phylogenetic tree.
   * @param {string[]} leaves - Array of hood_ids
   */
  _createFlatRoot(leaves) {
    const root = new PhyloNode();
    root.id = 0;
    root.branchLength = 0;
    root.name = '_root';
    
    leaves.forEach((leafName, idx) => {
      const leaf = new PhyloNode();
      leaf.id = idx + 1;
      leaf.name = String(leafName);
      leaf.branchLength = 1; // Uniform branch length
      root.branchset.push(leaf);
    });
    
    return root;
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
    const spacing = this.config.tree.ySpacing;
    for (let i=0;i<leaves.length;i++) {
      leaves[i].x = i * spacing;
    }
  }

  assignInternalX(node) {
    if(node.branchset.length===0) return node.x;
    const xs=node.branchset.map(ch=>this.assignInternalX(ch));
    node.x=xs.reduce((a,b)=>a+b,0)/xs.length;
    return node.x;
  }

  scaleY() {
    const rootDists = this.allNodes.map(n => n.rootDist);
    const maxDist = Math.max(...rootDists);
    
    // Use fixed coordinate width instead of yScaleFactor for normalization
    // All trees will span from 0 to fixedCoordinateWidth, regardless of their evolutionary distance range
    const fixedWidth = this.config.tree.fixedCoordinateWidth || 2000;
    const yScaleFactor = maxDist > 0 ? fixedWidth / maxDist : 1;
    
    // Store maxEvolutionaryDistance for ruler calculations
    this.maxEvolutionaryDistance = maxDist;
    
    for (let n of this.allNodes) {
      n.y = n.rootDist * yScaleFactor;
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
    
    // Use theme colors if available, otherwise fall back to config or default
    const edgeColor = this.themeColors?.treeEdges || this.config.tree.edgeColor || [85,85,85,255];
    
    const build=(node)=>{
      for(let ch of node.branchset) {
        const path=[
          [node.y,node.x],
          [node.y,ch.x],
          [ch.y,ch.x]
        ];
        edges.push({path:path,color:edgeColor,source:node,target:ch});
        build(ch);
      }
    };
    build(this.root);
    return edges;
  }

    /**
   * Convert tree to ultrametric format where all leaves are equidistant from the root
   * This adjusts branch lengths to make the tree ultrametric while preserving topology
   */
  makeUltrametric() {
    if (!this.allNodes || this.allNodes.length === 0) {
      this.collectAll();
    }
    
    // First, ensure we have parent pointers and root distances
    this.setParents();
    this.computeDistances();
    
    // Find the maximum distance from root to any leaf
    const leafNodes = this.getLeafNodes();
    const maxRootDist = Math.max(...leafNodes.map(leaf => leaf.rootDist));
    
    // For each internal node, calculate the distance it should be from the root
    // to maintain ultrametricity
    const adjustBranchLengths = (node) => {
      if (node.branchset.length === 0) {
        // Leaf node: ensure its distance to root equals maxRootDist
        node.rootDist = maxRootDist;
        return;
      }
      
      // Internal node: process children first
      for (let child of node.branchset) {
        adjustBranchLengths(child);
      }
      
      // For internal nodes, set the rootDist to the minimum of children's rootDist
      // minus their branch length to this node
      const childDistances = node.branchset.map(child => child.rootDist);
      const minChildDist = Math.min(...childDistances);
      
      // Adjust this node's position to maintain ultrametricity
      // All children should have the same distance from this node to their tips
      node.rootDist = minChildDist - Math.max(...node.branchset.map(child => 
        child.branchLength || 0
      ));
      
      // Ensure we don't go negative
      if (node.rootDist < 0) {
        node.rootDist = 0;
      }
    };
    
    // Start from leaves and work backwards
    adjustBranchLengths(this.root);
    
    // Now recalculate branch lengths based on the adjusted root distances
    const recalculateBranchLengths = (node) => {
      for (let child of node.branchset) {
        // Branch length is the difference in root distances
        child.branchLength = child.rootDist - node.rootDist;
        recalculateBranchLengths(child);
      }
    };
    
    // Root should have rootDist of 0
    this.root.rootDist = 0;
    recalculateBranchLengths(this.root);
    
    // Recompute distances to ensure consistency
    this.computeDistances();
  }
}

export default PhyloTree;
