// visualizationConfig.js
// Configuration object for all hard-coded parameters in the hoodini-viz application

export const DEFAULT_CONFIG = {
  // Phylogenetic Tree Layout Parameters
  tree: {
    ySpacing: 200,           // Vertical spacing between tree leaves
    yScaleFactor: 1000,       // Base scale factor for tree Y coordinates (will be divided by maxDist)
    xScalePercent: 100,      // X scale of the tree section (100 = actual, 50 = compress, 200 = stretch)
    fixedCoordinateWidth: 2000, // Fixed coordinate width for all trees (normalized before xScale is applied)
    nodeRadius: {
      internal: 0,          // Radius for internal nodes
      leaf: 20              // Radius for leaf nodes
    },
    edgeColor: [0, 0, 0, 255],  // Color for tree edges (gray)
    edgeWidth: 0.5,            // Edge width for phylogenetic tree edges
    gap: 100,               // Gap between phylogenetic tree and genome tracks
    labelPadding: {
      charWidth: 80        // Approximate pixels per character for label width calculations
    },
    phyloLabelPosition: 'after-tree', // 'after-tree' (default) or 'after-tracks'
    labelOffset: 10,         // Offset for phylo labels from tree nodes or tracks
    alignLabels: true        // Whether to align all phylo labels to the same X coordinate
  },

  // Gene Visualization Parameters
  gene: {
    height: 60,             // Height of gene features on tracks (used in GenomeView)
    defaultHeight: 550,     // Default gene height (used in Gene constructor)
    fillColor: [230, 230, 230, 255],  // Default gray color for genes
    tipWidthFactor: 0.1,   // Factor for gene arrow tip width (3% of gene length)
    strokeWidthFactor: 0.9, // Factor for darkening stroke color
    edgeWidth: 1,           // Edge width for gene polygons
    arrowheadHeight: 0      // Height of the arrowhead (0 = no arrowhead, > 0 = true arrow)
  },

  // Genome-wide (non-tree) X scaling
  genome: {
    xScalePercent: 20 // X scale of the entire genome section (100 = actual, 0 = collapse, >100 = stretch)
  },

  // Theme Configuration
  theme: {
    mode: 'light', // 'light' or 'dark'
    light: {
      background: '#ffffff',
      text: '#222222',
      treeEdges: [0, 0, 0, 255],         // Black tree edges
      baselines: [100, 100, 100, 255],   // Dark gray baselines
      rulerBackground: '#ffffff',
      rulerText: '#222222',
      rulerTicks: '#666666',
      buttonBackground: '#ffffff',
      buttonText: '#222222',
      buttonBorder: '#cccccc',
      tooltipBackground: '#ffffff',
      tooltipText: '#222222',
      tooltipBorder: '#cccccc'
    },
    dark: {
      background: '#000000',
      text: '#ffffff',
      treeEdges: [255, 255, 255, 255],   // White tree edges
      baselines: [200, 200, 200, 255],   // Light gray baselines
      rulerBackground: '#000000',
      rulerText: '#ffffff',
      rulerTicks: '#cccccc',
      buttonBackground: '#333333',
      buttonText: '#ffffff',
      buttonBorder: '#555555',
      tooltipBackground: '#333333',
      tooltipText: '#ffffff',
      tooltipBorder: '#555555'
    }
  },

  // Domain Visualization Parameters
  domain: {
    edgeWidth: 0.01            // Edge width for domain polygons
  },

  // Baseline Parameters
  baseline: {
    width: 1.0,               // Width of baseline lines
    color: [100, 100, 100, 255] // Default color for baselines
  },

  // UI Layout and Spacing
  layout: {
    padding: 0,           // General padding for view bounds calculations
    geneOffset: 0,        // Offset to position genes (genes positioned at x=geneOffset)
    containerFallback: {    // Fallback bounds when no data
      minX: 0,
      minY: 0,
      maxX: 1000,
      maxY: 1000,
      treeOffset: 0,
      geneOffset: 0
    }
  },

  // Text and Label Sizing
  text: {
    geneLabelSize: 12,      // Size for gene metadata labels
    phyloLabelSize: 20,     // Size for phylogenetic labels
    scaleFactors: {
      gene: 5,              // Scale factor for gene label sizing (size * 5)
      phylo: 5,            // Scale factor for phylo label sizing (size * 10)
    },
    rulerLabelSize: 14      // Size for ruler labels
  },

  // Line and Stroke Parameters
  stroke: {
    lineWidth: 0.1,           // Default line width for edges (fallback)
    fadeAlpha: 0.1,         // Alpha factor for fading non-selected nodes
    darkenFactor: 0.7       // Factor for darkening colors
  },

  // Ruler Widget Parameters
  ruler: {
    height: 30,             // Height of the ruler widget
    tickHeight: 10,         // Height of ruler tick marks
    labelOffset: 22,        // Vertical offset for ruler labels
    targetTicks: 35         // Target number of ticks on ruler (increased for better resolution)
  },

  // Scrollbar Widget Parameters
  scrollbar: {
    width: 32,              // Width of scrollbar container
    barWidth: 3,           // Width of the scrollbar itself
    minThumbHeight: 24,     // Minimum height for scrollbar thumb
    margin: '2%',           // Margin around scrollbar
    borderRadius: '0'     // Border radius for scrollbar elements (no rounding)
  },

  // Protein Link Parameters
  proteinLink: {
    bezierSegments: 120     // Number of segments for Bézier curve rendering
  },

  // Connecting Lines Parameters (between tree leaves and genome tracks)
  connectingLines: {
    width: 0.5,             // Width of connecting lines
    color: [128, 128, 128, 255]  // Gray color for connecting lines
  },

  // Color Palette Configuration
  colorPalettes: {
    // Default palette settings
    genePalette: {
      type: 'qualitative',    // 'qualitative', 'sequential', 'diverging'
      name: 'Set2',           // Dicopal palette name
      numColors: 8,           // Number of colors to use
      reverse: false,         // Whether to reverse the palette
      enabled: false          // Whether to use palette coloring (false = use default gray)
    },
    domainPalette: {
      type: 'qualitative',
      name: 'Set3',
      numColors: 12,
      reverse: false,
      enabled: false
    },
    phyloPalette: {
      type: 'qualitative',
      name: 'Set1',
      numColors: 9,
      reverse: false,
      enabled: false          // For coloring phylo labels by species/metadata
    }
  },

  // Default Colors
  colors: {
    black: [0, 0, 0, 255],
    gray: [100, 100, 100, 255],
    lightGray: [230, 230, 230, 255],
    darkGray: [85, 85, 85, 255],
    transparent: [0, 0, 0, 0]
  },

  // Animation and Interaction
  animation: {
    transitionDuration: '0.1s',  // CSS transition duration
    hoverTransition: '0.25s'     // CSS hover transition duration
  },

  // Export Parameters
  export: {
    svg: {
      minFontSize: 0,         // Minimum font size for SVG export
      fontSizeScale: 1000     // Scale factor for font size calculation
    }
  }
};

// Helper function to merge user config with defaults
export function createConfig(userConfig = {}) {
  return mergeDeep(DEFAULT_CONFIG, userConfig);
}

// Deep merge function to combine configuration objects
function mergeDeep(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

// Export individual config sections for convenience
export const {
  tree: TREE_CONFIG,
  gene: GENE_CONFIG,
  layout: LAYOUT_CONFIG,
  text: TEXT_CONFIG,
  stroke: STROKE_CONFIG,
  ruler: RULER_CONFIG,
  scrollbar: SCROLLBAR_CONFIG,
  proteinLink: PROTEIN_LINK_CONFIG,
  colors: COLORS_CONFIG,
  animation: ANIMATION_CONFIG,
  export: EXPORT_CONFIG
} = DEFAULT_CONFIG;
