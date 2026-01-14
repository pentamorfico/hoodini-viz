// visualizationConfig.js
// Configuration object for all hard-coded parameters in the hoodini-viz application

/** Type for the complete visualization configuration */
export type VisualizationConfig = typeof DEFAULT_CONFIG;

export const DEFAULT_CONFIG = {
  // Phylogenetic Tree Layout Parameters
  tree: {
    ySpacing: 150,           // Vertical spacing between tree leaves
    yScaleFactor: 1000,       // Base scale factor for tree Y coordinates (will be divided by maxDist)
    xScalePercent: 100,      // X scale of the tree section (100 = actual, 50 = compress, 200 = stretch)
    fixedCoordinateWidth: 2000, // Fixed coordinate width for all trees (normalized before xScale is applied)
    nodeRadius: {
  internal: 12,          // Radius for internal nodes (was 0 — set >0 so internal nodes are visible/pickable)
      leaf: 20              // Radius for leaf nodes
    },
    edgeColor: [40, 40, 4, 255],  // Color for tree edges (gray)
    edgeWidth: 0.5,            // Edge width for phylogenetic tree edges
    gap: 100,               // Gap between phylogenetic tree and genome tracks
    labelPadding: {
      charWidth: 50        // Approximate pixels per character for label width calculations
    },
    phyloLabelPosition: 'after-tree', // 'after-tree' (default) or 'after-tracks'
    labelOffset: 10,         // Offset for phylo labels from tree nodes or tracks
    alignLabels: true        // Whether to align all phylo labels to the same X coordinate
  },

  // Gene Visualization Parameters
  gene: {
    height: 60,             // Height of gene features on tracks (used in GenomeView)
    defaultHeight: 60,      // Default gene height (used in Gene constructor) - should match height
    fillColor: [230, 230, 230, 255],  // Default gray color for genes
    tipWidthFactor: 0.1,   // Factor for gene arrow tip width (3% of gene length)
    strokeWidthFactor: 0.9, // Factor for darkening stroke color
    edgeWidth: 1,           // Edge width for gene polygons
    arrowheadHeight: 0,     // Height of the arrowhead (0 = no arrowhead, > 0 = true arrow)
    prevalenceThreshold: 10 // Default prevalence threshold percentage for gene filtering
  },

  // Genome-wide (non-tree) X scaling
  genome: {
    xScalePercent: 30 // X scale of the entire genome section (100 = actual, 0 = collapse, >100 = stretch)
  },

  // Theme Configuration
  theme: {
    mode: 'light', // 'light' or 'dark'
    light: {
      background: '#ffffff',
      text: '#222222',
      treeEdges: [0, 0, 0, 255],         // Black tree edges
      phyloLabelFill: [0, 0, 0, 255],    // Default phylo label color (black in light)
      hoods: [100, 100, 100, 255],   // Dark gray hoods
      rulerBackground: '#ffffff',
      rulerText: '#222222',
      rulerTicks: '#666666',
      buttonBackground: '#ffffff',
      buttonText: '#222222',
      buttonBorder: '#cccccc',
      tooltipBackground: '#ffffff',
      tooltipText: '#222222',
      tooltipBorder: '#cccccc',
      widgetBackground: '#f8f9fa',
      border: '#dee2e6',
      textSecondary: '#6c757d',
      sliderTrack: '#e9ecef'
    },
    dark: {
      background: '#000000',
      text: '#ffffff',
      treeEdges: [255, 255, 255, 255],   // White tree edges
  phyloLabelFill: [255, 255, 255, 255], // Default phylo label color (white in dark)
      hoods: [200, 200, 200, 255],   // Light gray hoods
      rulerBackground: '#000000',
      rulerText: '#ffffff',
      rulerTicks: '#cccccc',
      buttonBackground: '#333333',
      buttonText: '#ffffff',
      buttonBorder: '#555555',
      tooltipBackground: '#333333',
      tooltipText: '#ffffff',
      tooltipBorder: '#555555',
      widgetBackground: '#212529',
      border: '#495057',
      textSecondary: '#adb5bd',
      sliderTrack: '#495057'
    }
  },

  // Domain Visualization Parameters
  domain: {
  edgeWidth: 0.01,           // Edge width for domain polygons
  // Height factor relative to gene half-height. 0.6 means domains will be
  // 60% of the half-gene height (i.e. visibly smaller than genes).
  heightFactor: 0.7
  },

  // Hood Parameters
  hood: {
    width: 2.0,               // Width of hood lines
    color: [100, 100, 100, 255] // Default color for hoods
  },

  // Region Feature Parameters
  region: {
    padding: 5,               // Padding around genes within regions
    fillOpacity: 0.2,         // Opacity of region fill color
    strokeOpacity: 0.6,       // Opacity of region stroke color
    strokeWidth: 2,           // Width of region outline
    colors: {                 // Default colors by region type
      phage: [255, 0, 0, 255],        // Red for phage regions
      prophage: [255, 165, 0, 255],   // Orange for prophage regions
      operon: [0, 128, 0, 255],       // Green for operons
      cluster: [0, 0, 255, 255],      // Blue for gene clusters
      island: [255, 255, 0, 255],     // Yellow for genomic islands
      region: [1, 1, 1, 255],   // Gray for generic regions
      default: [128, 128, 128, 255],   // Gray fallback
      crispr: [255, 0, 0, 255],
      
    }
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
    borderRadius: '0',      // Border radius for scrollbar elements (no rounding)
    panPaddingY: 50,        // Allowed padding (in world units) beyond Y bounds when panning
    panPaddingX: 500,       // Allowed padding (in world units) beyond X bounds when panning
    minZoom: -5,            // Minimum zoom level (zoomed out)
    maxZoom: 2              // Maximum zoom level (zoomed in)
  },

  // Protein Link Parameters
  proteinLink: {
    bezierSegments: 120,    // Number of segments for Bézier curve rendering
    color: [100, 0, 220, 255],  // Default blue color for protein links
    colorBy: 'source_gene', // 'source_gene', 'target_gene', 'identity_solid', 'identity_gradient'
    solidColor: [100, 0, 220, 255],
  useAlpha: true,
  // Alpha expressed as fraction (0..1). To get final alpha in 0..255 range
  // of approx 0..50, set maxAlpha = 50/255 (~0.1961). minAlpha=0 -> fully transparent.
  minAlpha: 0,
  maxAlpha: 0.5,
    palette: {
      type: 'sequential',
      name: 'Blues',
      numColors: 9,
      reverse: false,
      enabled: true
    }
  },

  // Nucleotide Link Parameters
  nucleotideLink: {
    color: [200, 200, 200, 255],    // Default gray color for nucleotide links
    colorBy: 'solid', // 'solid', 'identity_gradient'
    solidColor: [200, 200, 200, 255],
    // Strand-based coloring (works with both solid and gradient modes)
    strandColoring: true,  // When true, use different colors/palettes for same vs opposite strand
    sameStrandColor: [180, 180, 180, 255],      // Color for same strand alignments (+/+ or -/-)
    oppositeStrandColor: [220, 80, 80, 255],    // Color for opposite strand alignments (+/- or -/+)
    // Separate palettes for strand-based gradient coloring
    sameStrandPalette: {
      type: 'sequential',
      name: 'Greys',
      numColors: 9,
      reverse: false,
      enabled: true
    },
    oppositeStrandPalette: {
      type: 'sequential',
      name: 'Reds',
      numColors: 9,
      reverse: false,
      enabled: true
    },
  useAlpha: true,
  // Keep same convention as protein links: fractional alpha values in 0..1
  minAlpha: 0,
  maxAlpha: 0.5,
    palette: {
      type: 'sequential',
      name: 'Reds',
      numColors: 9,
      reverse: false,
      enabled: true
    }
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
      name: 'Bold',           // Dicopal palette name
      numColors: 8,           // Number of colors to use
      reverse: false,         // Whether to reverse the palette
  enabled: true,          // Whether to use palette coloring
  desaturateByPrevalence: true
    },
    domainPalette: {
  type: 'sequential',
  name: 'Gray',
  numColors: 9,
  reverse: true,
  enabled: true,
  // Alpha range for sequential numeric palettes. Values can be in 0-1 (fraction)
  // or 0-255. The viewer will accept either form. Default uses 0.1 -> 0.5 opacity.
  alphaRange: [0.1, 0.5]
    },
    phyloPalette: {
      type: 'qualitative',
      name: 'Vivid',
      numColors: 9,
      reverse: false,
      enabled: true           // For coloring phylo labels by species/metadata
    },
    ncRNAPalette: {
      type: 'qualitative',
      name: 'Prism',
      numColors: 8,
      reverse: false,
      enabled: true           // For coloring ncRNAs by type
    },
    regionPalette: {
      type: 'qualitative',
      name: 'Margot2',
      numColors: 8,
      reverse: false,
      enabled: true           // Enable palette coloring for regions by default
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
  nucleotideLink: NUCLEOTIDE_LINK_CONFIG,
  colors: COLORS_CONFIG,
  animation: ANIMATION_CONFIG,
  export: EXPORT_CONFIG
} = DEFAULT_CONFIG;
