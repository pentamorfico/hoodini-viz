# 🎨 Hoodini-viz

> Interactive phylogenetic and genomic visualization library for React applications.

Hoodini-viz is a React component library for visualizing phylogenetic trees, genomic sequences, protein domains, and homology relationships. It provides both a full-featured dashboard and a composable visualization component.

## 📦 Installation

```bash
npm install hoodini-viz
```

## 🚀 Quick Start

### Option 1: Full Dashboard (With Data Loading & UI)

```tsx
import { HoodiniVizDash } from 'hoodini-viz';

export default function MyApp() {
  return (
    <HoodiniVizDash
      gffUrl="/data/genes.parquet"
      parquetUrls={{
        gff: "/data/genes.parquet",
        hoods: "/data/hoods.parquet",
        domains: "/data/domains.parquet",
        proteinLinks: "/data/protein_links.parquet"
      }}
      newickUrl="/data/tree.nwk"
    />
  );
}
```

### Option 2: Visualization Component (Props-Driven)

```tsx
import { HoodiniViz } from 'hoodini-viz';

export default function MyVisualization() {
  const newick = "((A:0.1,B:0.2):0.3,(C:0.15,D:0.25):0.35);";
  const genes = [
    { id: 'g1', seqid: 'A', start: 100, end: 500, strand: '+' },
    // ... more genes
  ];
  const domains = {
    'g1': [{ id: 'd1', start: 150, end: 400, name: 'PfamA' }]
  };

  return (
    <HoodiniViz
      newickStr={newick}
      gffFeatures={genes}
      domainsByGene={domains}
      proteinLinks={[]}
      hoods={[]}
      config={defaultConfig}
    />
  );
}
```

## ✨ Features

- 🌳 **Phylogenetic Trees** - Interactive tree visualization with clustering
- 🧬 **Genomic Data** - Gene annotations, domains, neighborhoods
- 🔗 **Relationships** - Protein homology, nucleotide links
- 🎨 **Customizable Colors** - Multiple palette systems
- 📊 **Data Browser** - Integrated data grid with filtering
- 🎯 **Full Type Safety** - Written in TypeScript with full type definitions
- 📱 **Responsive** - Works on desktop and tablets

## 📚 Documentation

### Components

#### `HoodiniViz`

Core visualization component (props-driven, no data loading).

**Props:**
```tsx
interface HoodiniVizProps {
  newickStr: string;                          // Newick tree format
  gffFeatures: GFFFeature[];                  // Gene features
  domainsByGene: Map<string, Domain[]>;       // Domain annotations
  proteinLinks: ProteinLink[];                // Homology links
  nucleotideLinks?: NucleotideLink[];         // Sequence links
  hoods: Hood[];                              // Gene neighborhoods
  visibleGeneIds?: Set<string>;               // Filtered genes
  showScrollbar?: boolean;                    // Show ruler/scrollbar
  genePalette?: PaletteConfig;                // Gene colors
  phyloPalette?: PaletteConfig;               // Tree colors
  config?: VisualizationConfig;               // Custom config
  onObjectClick?: (obj: any) => void;         // Click handler
  // ... 40+ additional configuration props
}
```

#### `HoodiniVizDash`

Full dashboard with data loading, UI controls, and state management.

**Props:**
```tsx
interface HoodiniVizDashProps {
  gffUrl?: string;                            // GFF file URL
  parquetUrls?: {                             // Parquet file URLs
    gff?: string;
    hoods?: string;
    domains?: string;
    proteinLinks?: string;
    nucleotideLinks?: string;
  };
  newickUrl?: string;                         // Tree file URL
  config?: VisualizationConfig;               // Custom config
  // ... additional configuration props
}
```

### Data Types

```tsx
import {
  Gene,
  Domain,
  Hood,
  PhyloTree,
  GenomeView,
  PhyloNode,
  Link,
  ProteinLink,
  NucleotideLink
} from 'hoodini-viz';
```

### Utilities

```tsx
import {
  getPaletteColors,
  getQualitativePalettes,
  getSequentialPalettes,
  DEFAULT_CONFIG
} from 'hoodini-viz';

// Get colors for palette
const colors = getPaletteColors('Set2', 10);

// Custom palette
const palette = {
  type: 'qualitative',
  name: 'MyPalette',
  colors: ['#FF0000', '#00FF00', '#0000FF']
};
```

## 🎨 Customization

### Custom Colors

```tsx
<HoodiniViz
  genePalette={{
    type: 'qualitative',
    name: 'MyColors',
    colors: ['#e41a1c', '#377eb8', '#4daf4a']
  }}
  phyloPalette={{
    type: 'sequential',
    name: 'Blues'
  }}
/>
```

### Custom Configuration

```tsx
import { DEFAULT_CONFIG } from 'hoodini-viz';

const customConfig = {
  ...DEFAULT_CONFIG,
  gene: {
    ...DEFAULT_CONFIG.gene,
    height: 100,
    arrowheadHeight: 20
  },
  tree: {
    ...DEFAULT_CONFIG.tree,
    nodeSize: 8
  }
};

<HoodiniViz config={customConfig} />
```

### Event Handlers

```tsx
<HoodiniViz
  onObjectClick={(obj) => {
    console.log('Clicked:', obj.type, obj.id);
    // Handle selection
  }}
  onLegendChange={(config) => {
    // Handle legend updates
  }}
/>
```

## 🔧 Development

### Local Development

```bash
npm install
npm run dev
# Opens http://localhost:5173
```

### Building the Library

```bash
npm run build
# Outputs:
# - dist/hoodini-viz.js (ESM module)
# - dist/hoodini-viz.umd.js (UMD bundle)
# - dist/hoodini-viz.css (Styles)
```

### Linting

```bash
npm run lint
```

## 📊 Data Format

### Newick Format (Tree)

```
((A:0.1,B:0.2):0.3,(C:0.15,D:0.25):0.35);
```

### GFF3 Format (Genes)

```
seqid  source  type  start  end  score  strand  phase  attributes
chr1   .       gene  1000   2000  .      +       .      ID=g1;Name=GeneA
chr1   .       gene  3000   4000  .      -       .      ID=g2;Name=GeneB
```

### Parquet Format (Data)

Binary columnar format for fast loading. Same schema as GFF3 but in parquet format.

### TSV Format (Fallback)

Human-readable tab-separated values with header row.

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires WebGL support for deck.gl visualization.

## 📄 License

MIT

## 🔗 References

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed component architecture
- [deck.gl Documentation](https://deck.gl)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

Contributions welcome! Please see the architecture documentation before making changes.

## 📞 Support

For issues and questions, please open an issue on the repository.
