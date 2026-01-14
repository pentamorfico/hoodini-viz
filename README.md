# 🧬 Hoodini-viz

<p align="center">
  <img src="src/assets/hoodini-viz_logo_github.svg" alt="Hoodini Logo" width="200"/>
</p>

<p align="center">
  <strong>GPU-Accelerated Visualization Library for Comparative Genomics & Phylogenomics</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#api-reference">API</a> •
  <a href="#data-formats">Data Formats</a>
</p>

---

## Overview

**Hoodini-viz** is a high-performance React library for interactive visualization of phylogenetic trees, gene neighborhoods (synteny), protein domains, and homology relationships at genomic scale. Built on [deck.gl](https://deck.gl/) and WebGL, it enables fluid exploration of datasets with thousands of genes and complex evolutionary relationships.

Designed for computational biologists, bioinformaticians, and researchers working with:
- **Comparative genomics** and synteny analysis
- **Gene neighborhood/cluster visualization** (genomic islands, operons, gene clusters)
- **Phylogenomics** and evolutionary studies
- **Protein domain architecture** visualization
- **Multi-scale genome browsers**

## 🎯 Key Features

### GPU-Powered Rendering with deck.gl

Hoodini-viz leverages deck.gl's WebGL rendering pipeline for handling large-scale genomic data:

- **LineLayer** - Phylogenetic tree edges with configurable styling
- **PolygonLayer** - Gene arrows, protein domains, and synteny blocks
- **PathLayer** - Bezier curves for protein homology links
- **ScatterplotLayer** - Tree nodes with hover/click interactions
- **TextLayer** - Gene labels, phylogenetic names, taxonomic annotations

Performance optimizations include:
- **Memoized layer generation** - Expensive calculations cached across renders
- **Web Worker parsing** - Parquet/TSV parsing offloaded to background threads
- **Virtualized data grid** - Only visible rows rendered in the data browser
- **Orthographic camera** - Optimized 2D rendering with smooth pan/zoom

### Phylogenetic Tree Visualization

```
                    ┌─── Leaf A
              ┌─────┤
              │     └─── Leaf B
        ──────┤
              │     ┌─── Leaf C
              └─────┤
                    └─── Leaf D
```

- **Newick format** parsing with support for branch lengths
- **Ultrametric conversion** - Normalize all leaves to same distance from root
- **No-tree mode** - Flat layout when phylogeny is unavailable
- **Customizable styling** - Edge colors, widths, node sizes
- **Interactive** - Click nodes, hover for tooltips

### Gene Neighborhood (Hood) Visualization

```
Hood 1:  ◄────  ────►  ◄────  ────►  ────►
Hood 2:        ────►  ◄────  ────►  ◄────
Hood 3:  ────►  ────►        ────►  ◄────
           │      │      │      │
         Aligned by cluster/gene
```

- **GFF3 format** support for gene annotations
- **Directional arrows** showing strand orientation (+/-)
- **Track alignment** - Align neighborhoods by gene cluster, gene ID, or position
- **Track operations** - Flip strand, shift window, zoom to region
- **Configurable arrow geometry** - Height, arrowhead style

### Protein Domain Architecture

```
Gene:    ┌──────────────────────────────────────┐
         │  ████ Domain A  ████  ████ Domain B ████  │
         └──────────────────────────────────────┘
```

- **Multiple annotation sources** - Pfam, InterPro, CDD, custom
- **Domain overlap handling** - Automatic polygon clipping
- **E-value filtering** - Filter by significance threshold
- **Coverage visualization** - Domain coverage as fraction of gene

### Homology Link Visualization

#### Protein-Protein Links (Bézier Curves)

```
Gene A  ────►
         ╲
          ╲   Similarity: 85%
           ╲
Gene B      ────►
```

- **Bézier curve rendering** - Smooth, aesthetically pleasing connections
- **Configurable coloring** - By source gene, target gene, identity gradient
- **Alpha transparency** - Opacity scaled by similarity score
- **Identity filtering** - Show only links above threshold

#### Nucleotide-Level Synteny Blocks

```
Seq A:  ════════════════════
            ╱         ╲
           ╱           ╲
Seq B:  ════════════════════
```

- **Synteny polygon rendering** - Parallelogram/trapezoid blocks
- **Strand-aware coloring** - Different colors for same vs inverted orientation
- **Identity gradient** - Color intensity by sequence similarity

### Interactive Data Browser

Built with [@glideapps/glide-data-grid](https://github.com/glideapps/glide-data-grid):

- **Virtualized rendering** - Handle millions of rows efficiently
- **Multi-dataset tabs** - Switch between genes, domains, links, metadata
- **Column filtering** - Search across all columns
- **Zoom-to-feature** - Click to navigate to gene/hood in visualization
- **Export capabilities** - Copy data to clipboard

### Color Palette System

Powered by [dicopal](https://github.com/riatelab/dicopal) for scientifically accurate color schemes:

| Palette Type | Use Case | Examples |
|--------------|----------|----------|
| **Qualitative** | Categorical data (clusters, species) | Set1, Dark2, Paired, Bold |
| **Sequential** | Continuous data (identity, e-value) | viridis, plasma, Blues |
| **Diverging** | Comparative data (+/- deviation) | RdBu, RdYlBu, PRGn |

Features:
- **Colorblind-friendly palettes** - viridis, cividis
- **Palette preview** - Visual swatches in UI
- **Reverse palettes** - Invert color order
- **Alpha ranges** - Configurable transparency for sequential palettes

### Protein Structure Prediction Integration

Built-in 3D protein structure prediction and visualization:

#### ESMFold (Meta AI)
- **Direct API access** - No API key required
- **Sequence limit** - ≤400 amino acids
- **Output format** - PDB
- **pLDDT coloring** - Confidence score visualization

#### Boltz2 (NVIDIA)
- **Longer sequences** - >400 amino acids
- **API key required** - Stored locally in browser
- **Output format** - mmCIF
- **CORS proxy fallback** - Multiple proxy options for reliability

#### 3DMol.js Viewer
- **Interactive 3D** - Rotate, zoom, pan
- **Confidence coloring** - pLDDT rainbow gradient (blue=high, red=low)
- **Surface rendering** - Toggle molecular surface
- **Responsive design** - Adapts to panel size

### RNA Secondary Structure Viewer

- **NAview-inspired layout** - Optimized 2D structure positioning
- **Dot-bracket parsing** - Standard RNA structure notation
- **Nucleotide coloring** - A=red, U=blue, G=green, C=orange
- **Base pair visualization** - Connected pairs shown as arcs
- **Interactive zoom/pan** - Wheel zoom centered on cursor

### SVG Export for Publication

High-quality vector export for publications and presentations:

```javascript
// Export current view as SVG
exportToSVG(layers, bounds, config, options);
```

- **Format presets** - A4, Letter, custom dimensions
- **DPI control** - 300 DPI for print, 96 DPI for screen
- **Theme-aware** - Light/dark background export
- **Cross-application compatible** - Works with Adobe Illustrator, Affinity Designer, Inkscape
- **Manual text positioning** - Uses Y-offset instead of `dominant-baseline` for maximum compatibility
- **All layers included** - Tree, genes, domains, links, labels

### Theme Support

- **Light mode** - White background, dark text
- **Dark mode** - Black background, light text
- **System preference** - Automatic detection
- **CSS variables** - Customizable via CSS

---

## Installation

### npm

```bash
npm install hoodini-viz
```

### yarn

```bash
yarn add hoodini-viz
```

### pnpm

```bash
pnpm add hoodini-viz
```

### Peer Dependencies

Ensure these are installed in your project:

```json
{
  "react": "^18.0.0 || ^19.0.0",
  "react-dom": "^18.0.0 || ^19.0.0"
}
```

---

## Quick Start

### Basic Usage (Dashboard with Data Loading)

```tsx
import { HoodiniDashboard } from 'hoodini-viz';

function App() {
  return (
    <HoodiniDashboard
      dataPaths={{
        gffParquet: '/data/genes.parquet',
        hoodsParquet: '/data/hoods.parquet',
        newick: '/data/tree.nwk',
        proteinLinksParquet: '/data/links.parquet',
        domainsParquet: '/data/domains.parquet',
        proteinMetadataParquet: '/data/protein_metadata.parquet',
        treeMetadataParquet: '/data/tree_metadata.parquet',
      }}
      initialState={{
        ultrametric: true,
        colorBy: 'cluster',
        showDomains: true,
      }}
      showSidebar={true}
      showDataGrid={true}
    />
  );
}
```

### Core Visualization (Props-Driven)

For custom data loading or embedding in existing applications:

```tsx
import { HoodiniViz } from 'hoodini-viz';

function CustomViewer({ newick, genes, links, domains }) {
  return (
    <HoodiniViz
      newickStr={newick}
      gffFeatures={genes}
      proteinLinks={links}
      domainsByGene={domains}
      genePalette={{
        type: 'qualitative',
        name: 'Set1',
        numColors: 8,
        enabled: true,
      }}
      showTreeLayer={true}
      showGeneLayer={true}
      showProteinLinkLayer={true}
      showDomainLayer={true}
      ultrametric={false}
      onObjectClick={(info) => {
        console.log('Clicked:', info.object);
      }}
    />
  );
}
```

---

## Architecture

### Component Hierarchy

```
┌─ HoodiniDashboard ─────────────────────────────────────┐
│  Full-featured dashboard with data loading & UI        │
│                                                         │
│  ┌─ AppSidebar ──────────────────────────┐             │
│  │  • Layer visibility controls          │             │
│  │  • Color palette selection            │             │
│  │  • Alignment options                  │             │
│  │  • Label configuration                │             │
│  │  • Export options                     │             │
│  │  • Protein structure viewer           │             │
│  └───────────────────────────────────────┘             │
│                                                         │
│  ┌─ HoodiniViz ─────────────────────────────────────┐  │
│  │  Core deck.gl visualization engine               │  │
│  │                                                   │  │
│  │  ┌─ deck.gl Layers ────────────────────────┐    │  │
│  │  │ LineLayer      - Tree edges             │    │  │
│  │  │ ScatterplotLayer - Tree nodes           │    │  │
│  │  │ PolygonLayer   - Genes, domains, links  │    │  │
│  │  │ PathLayer      - Protein link curves    │    │  │
│  │  │ TextLayer      - Labels                 │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  │                                                   │  │
│  │  ┌─ Widgets ───────────────────────────────┐    │  │
│  │  │ RulerWidget    - Genomic scale ruler    │    │  │
│  │  │ ScrollbarWidget - Y-axis navigation     │    │  │
│  │  │ TreeScaleWidget - Phylo distance ruler  │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ DataGridView ──────────────────────────────────┐   │
│  │  Virtualized data browser (glide-data-grid)     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   Data Sources   │────▶│   Web Worker      │────▶│   React State   │
│                  │     │   (Parsing)       │     │                 │
│  • Parquet files │     │                   │     │  • parsedGFF    │
│  • TSV fallbacks │     │  parseGFF()       │     │  • parsedLinks  │
│  • Newick tree   │     │  parseLinks()     │     │  • parsedDomains│
│                  │     │  parseDomains()   │     │  • tree         │
└──────────────────┘     │  parseHoods()     │     └────────┬────────┘
                         └───────────────────┘              │
                                                            ▼
┌──────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   User Actions   │────▶│   State Updates   │────▶│   HoodiniViz    │
│                  │     │                   │     │                 │
│  • Pan/zoom      │     │  setGenePalette() │     │  PhyloTree      │
│  • Click gene    │     │  setColorBy()     │     │  GenomeView     │
│  • Toggle layer  │     │  setAlignCluster()│     │  deck.gl layers │
│  • Change palette│     │  setVisibility()  │     │  WebGL canvas   │
└──────────────────┘     └───────────────────┘     └─────────────────┘
```

### Core Data Models

#### PhyloTree

Represents the phylogenetic tree structure:

```typescript
class PhyloTree {
  root: PhyloNode;           // Root node
  allNodes: PhyloNode[];     // All nodes (internal + leaves)
  leafNodes: PhyloNode[];    // Only leaf nodes
  hasTree: boolean;          // True if Newick was provided
  
  // Methods
  parseNewick(s: string): PhyloNode;
  makeUltrametric(): void;   // Convert to ultrametric
  assignX(leaves): void;     // Layout X coordinates
  assignY(node): void;       // Layout Y coordinates
}
```

#### GenomeView

Manages the genomic visualization state:

```typescript
class GenomeView {
  genesById: Record<string, Gene>;
  ncRNAsById: Record<string, NonCodingFeature>;
  regionsById: Record<string, RegionFeature>;
  hoodRanges: Record<string, Hood>;
  proteinLinks: ProteinLink[];
  nucleotideLinks: NucleotideLink[];
  domainsByGene: Record<string, Domain[]>;
  
  // Layout state
  trackFlipped: Record<string, boolean>;
  trackOffset: Record<string, number>;
  
  // Methods
  addGene(gene: Gene): void;
  flipTrackToggle(hoodId: string): void;
  shiftTrackPlus1kb(hoodId: string): void;
  applyGenePalette(palette, colorBy, metadata): void;
}
```

#### Gene

Represents a gene feature with arrow geometry:

```typescript
class Gene extends GFFFeature {
  seqid: string;
  start: number;
  end: number;
  strand: '+' | '-';
  attributes: Record<string, string>;
  fillColor: [number, number, number, number];
  polygon: number[][];       // Arrow vertices
  trackY: number;            // Y position on track
  domains: Domain[];         // Associated domains
  
  // Methods
  setTrackY(y: number): void;
  updatePolygon(): void;
}
```

---

## API Reference

### HoodiniDashboard Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dataPaths` | `DataPaths` | required | Paths to data files |
| `initialState` | `InitialState` | `{}` | Initial visualization state |
| `showSidebar` | `boolean` | `true` | Show control sidebar |
| `showDataGrid` | `boolean` | `true` | Show data browser |
| `onDataLoaded` | `(data) => void` | - | Callback when data loads |
| `ref` | `Ref<HoodiniDashboardRef>` | - | Imperative handle |

### HoodiniViz Props

#### Data Props

| Prop | Type | Description |
|------|------|-------------|
| `newickStr` | `string` | Newick format phylogenetic tree |
| `gffFeatures` | `GFFFeature[]` | Gene annotations array |
| `proteinLinks` | `ProteinLink[]` | Protein homology links |
| `nucleotideLinks` | `NucleotideLink[]` | Nucleotide synteny blocks |
| `domainsByGene` | `Record<string, Domain[]>` | Domain annotations |
| `hoods` | `Hood[]` | Genomic neighborhood definitions |
| `proteinMetadata` | `Record<string, object>` | Gene metadata (clusters, etc.) |
| `treeMetadata` | `Record<string, object>` | Leaf metadata (taxonomy, etc.) |

#### Visualization Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `ultrametric` | `boolean` | `false` | Ultrametric tree layout |
| `alignCluster` | `string \| null` | `null` | Cluster ID to align by |
| `colorBy` | `string` | `'cluster'` | Gene coloring field |
| `labelBy` | `string` | - | Gene labeling field |
| `treeColorBy` | `string` | - | Tree label coloring field |
| `treeLabelBy` | `string` | - | Tree label field |
| `domainColorBy` | `string` | `'domainName'` | Domain coloring field |
| `domainSource` | `string` | `'all'` | Filter domains by source |

#### Palette Props

| Prop | Type | Description |
|------|------|-------------|
| `genePalette` | `PaletteConfig` | Gene color palette |
| `domainPalette` | `PaletteConfig` | Domain color palette |
| `phyloPalette` | `PaletteConfig` | Tree label color palette |
| `ncRNAPalette` | `PaletteConfig` | ncRNA color palette |
| `regionPalette` | `PaletteConfig` | Region color palette |

#### Layer Visibility Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showTreeLayer` | `boolean` | `true` | Show phylogenetic tree |
| `showGeneLayer` | `boolean` | `true` | Show gene arrows |
| `showDomainLayer` | `boolean` | `true` | Show protein domains |
| `showProteinLinkLayer` | `boolean` | `true` | Show protein links |
| `showNucleotideLinkLayer` | `boolean` | `true` | Show synteny blocks |
| `showNcRNALayer` | `boolean` | `true` | Show ncRNA features |
| `showGeneTextLayer` | `boolean` | `true` | Show gene labels |
| `showTreeTextLayer` | `boolean` | `true` | Show tree labels |

#### Callback Props

| Prop | Type | Description |
|------|------|-------------|
| `onObjectClick` | `(info) => void` | Click handler for features |
| `onLegendChange` | `(data) => void` | Legend data change handler |
| `setGenomeViewRef` | `(gv) => void` | Receive GenomeView instance |

---

## Data Formats

### Parquet (Recommended)

Hoodini-viz uses [hyparquet](https://github.com/hyparam/hyparquet) for blazing-fast Parquet loading directly in the browser. Convert your TSV files to Parquet for optimal performance:

```bash
# Using the included conversion script
python scripts/convert_to_parquet.py

# Or using polars directly
import polars as pl
df = pl.read_csv("genes.tsv", separator="\t")
df.write_parquet("genes.parquet", compression="zstd")
```

### GFF3 (Gene Features)

Standard GFF3 format for gene annotations:

```
##gff-version 3
NC_000001.1	RefSeq	gene	1000	2000	.	+	.	ID=gene001;Name=geneA;cluster=1
NC_000001.1	RefSeq	gene	2500	3500	.	-	.	ID=gene002;Name=geneB;cluster=2
```

### Newick (Phylogenetic Tree)

Standard Newick format with branch lengths:

```
((species_A:0.1,species_B:0.2):0.3,(species_C:0.15,species_D:0.25):0.35);
```

### Hoods (Gene Neighborhoods)

Tab-separated file defining genomic windows:

```
hood_id	seqid	start	end	align_gene
hood_001	NC_000001.1	1000	50000	gene001
hood_002	NC_000002.1	25000	75000	gene050
```

### Protein Links

Tab-separated file for protein homology:

```
geneA	geneB	similarity
gene001	gene050	85.5
gene002	gene051	72.3
```

### Domains

Tab-separated domain annotations:

```
geneId	domainName	start	end	source	evalue	coverage
gene001	PF00001	10	150	Pfam	1e-50	0.85
gene001	PF00002	200	300	Pfam	1e-30	0.65
```

### Protein Metadata

Tab-separated metadata for genes:

```
id	cluster	product	sequence
gene001	cluster_1	hypothetical protein	MKFLIL...
gene002	cluster_2	kinase	MTLSPA...
```

### Tree Metadata

Tab-separated metadata for tree leaves:

```
leaf_id	species	genus	family	phylum
hood_001	Escherichia coli	Escherichia	Enterobacteriaceae	Proteobacteria
hood_002	Bacillus subtilis	Bacillus	Bacillaceae	Firmicutes
```

---

## Configuration

### Default Configuration

```typescript
import { DEFAULT_CONFIG } from 'hoodini-viz';

// Tree parameters
DEFAULT_CONFIG.tree.ySpacing = 150;        // Vertical spacing between leaves
DEFAULT_CONFIG.tree.xScalePercent = 100;   // Tree X-axis scale
DEFAULT_CONFIG.tree.edgeWidth = 0.5;       // Edge line width

// Gene parameters
DEFAULT_CONFIG.gene.height = 60;           // Gene arrow height
DEFAULT_CONFIG.gene.arrowheadHeight = 0;   // Arrowhead height (0 = flat tip)
DEFAULT_CONFIG.gene.tipWidthFactor = 0.1;  // Arrow tip as fraction of length

// Domain parameters
DEFAULT_CONFIG.domain.heightFactor = 0.7;  // Domain height relative to gene

// Link parameters
DEFAULT_CONFIG.proteinLink.bezierSegments = 120;  // Curve smoothness
DEFAULT_CONFIG.proteinLink.minAlpha = 0;          // Min opacity
DEFAULT_CONFIG.proteinLink.maxAlpha = 0.5;        // Max opacity
```

### Custom Configuration

```typescript
import { createConfig, HoodiniDashboard } from 'hoodini-viz';

const customConfig = createConfig({
  gene: {
    height: 80,
    arrowheadHeight: 15,
  },
  tree: {
    ySpacing: 200,
  },
});

<HoodiniDashboard
  dataPaths={...}
  config={customConfig}
/>
```

---

## Development

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Setup

```bash
git clone https://github.com/your-org/hoodini-viz.git
cd hoodini-viz
npm install
```

### Development Server

```bash
npm run dev
# Open http://localhost:5173
```

### Build Library

```bash
npm run build
# Outputs:
#   dist/hoodini-viz.js (ESM)
#   dist/hoodini-viz.umd.js (UMD)
#   dist/index.d.ts (TypeScript types)
```

### Build Single-File HTML

```bash
npm run build:html
# Outputs: dist-html/index.html (self-contained)
```

### Storybook

```bash
npm run storybook
# Open http://localhost:6006
```

### Convert Data to Parquet

```bash
# Requires polars: pip install polars
python scripts/convert_to_parquet.py
```

---

## Performance Considerations

### Large Dataset Recommendations

| Dataset Size | Genes | Links | Recommendation |
|--------------|-------|-------|----------------|
| Small | <1,000 | <5,000 | Default settings |
| Medium | 1,000-10,000 | 5,000-50,000 | Enable Parquet loading |
| Large | 10,000-100,000 | 50,000-500,000 | Filter links by identity, reduce bezier segments |
| Very Large | >100,000 | >500,000 | Consider server-side filtering |

### Optimization Tips

1. **Use Parquet format** - 3-10x faster than TSV
2. **Filter protein links** - Show only links above identity threshold
3. **Reduce bezier segments** - `proteinLinkConfig.bezierSegments: 60`
4. **Disable unused layers** - `showNucleotideLinkLayer: false`
5. **Limit domain sources** - Filter by single source (e.g., Pfam only)

---

## Browser Support

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 90+ | Full support |
| Firefox | 88+ | Full support |
| Safari | 14+ | Full support |
| Edge | 90+ | Full support |

Requires WebGL 2.0 support.

---

## Dependencies

### Core

| Package | Purpose |
|---------|---------|
| deck.gl | WebGL rendering |
| @luma.gl | WebGL utilities |
| hyparquet | Parquet file loading |
| react | UI framework |

### UI Components

| Package | Purpose |
|---------|---------|
| @radix-ui/* | Accessible UI primitives |
| @glideapps/glide-data-grid | Virtualized data grid |
| tailwindcss | Styling |
| lucide-react | Icons |

### Visualization

| Package | Purpose |
|---------|---------|
| dicopal | Color palettes |
| 3dmol | Protein 3D viewer |
| polygon-clipping | Domain clipping |
| recharts | Charts |

---

## Citation

If you use Hoodini-viz in your research, please cite:

```bibtex
@software{hoodini-viz,
  title = {Hoodini-viz: GPU-Accelerated Visualization for Comparative Genomics},
  author = {Your Name},
  year = {2025},
  url = {https://github.com/your-org/hoodini-viz}
}
```

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [deck.gl](https://deck.gl/) - GPU-powered visualization framework
- [hyparquet](https://github.com/hyparam/hyparquet) - Browser-native Parquet reader
- [dicopal](https://github.com/riatelab/dicopal) - Color palette library
- [3Dmol.js](https://3dmol.org/) - Molecular visualization
- [ESMFold](https://esmatlas.com/) - Protein structure prediction
- [shadcn/ui](https://ui.shadcn.com/) - UI component system
