# 🎨 Hoodini-viz

> Interactive phylogenetic and genomic visualization tool

Hoodini-viz provides **three ways to use** the same powerful visualization:

1. 🌐 **Standalone HTML** - Single-file web application (no installation needed)
2. 📦 **npm Package** - Install `HoodiniVizDash` component in your React app
3. 🎨 **Component Library** - Use `HoodiniViz` for custom integrations

## 🚀 Three Usage Modes

### Mode 1: Standalone HTML (Zero Installation)

**Best for:** Quick visualization, sharing with colleagues, embedding in websites

```bash
# Build single HTML file
npm run build:html

# Output: dist-html/index.html (3.3 MB, self-contained)
# Open directly in browser - no server needed!
```

**Usage:**
1. Download `dist-html/index.html`
2. Open in browser
3. Load your data files (Parquet or TSV)

### Mode 2: npm Package - Dashboard Component

**Best for:** Integrating visualization into existing React applications

```bash
npm install hoodini-viz
```

```tsx
import { HoodiniVizDash, ThemeProvider } from 'hoodini-viz';
import 'hoodini-viz/dist/hoodini-viz.css';

export default function App() {
  return (
    <ThemeProvider>
      <HoodiniVizDash
        newickUrl="/data/tree.nwk"
        gffUrl="/data/genes.parquet"
      />
    </ThemeProvider>
  );
}
```

> **Note:** Wrapping with `ThemeProvider` is optional but recommended for theme switching support. Components work without it using default light theme.

### Mode 3: npm Package - Visualization Component

**Best for:** Custom data loading, advanced integrations

```bash
npm install hoodini-viz
```

```tsx
import { HoodiniViz, DEFAULT_CONFIG } from 'hoodini-viz';
import 'hoodini-viz/dist/hoodini-viz.css';

export default function MyVisualization() {
  return (
    <HoodiniViz
      newickStr={treeData}
      gffFeatures={genes}
      domainsByGene={domains}
      proteinLinks={[]}
      hoods={[]}
      config={DEFAULT_CONFIG}
    />
  );
}
```

## 🚀 Quick Start

### Option 1: Full Dashboard with Data Loading (Recommended)

The dashboard component handles data loading, parsing, and provides a complete UI with controls.

**Minimum Required:** Phylogenetic tree + Gene features

```tsx
import { HoodiniVizDash } from 'hoodini-viz';

export default function App() {
  return (
    <HoodiniVizDash
      newickUrl="/data/tree.nwk"              // Required: Phylogenetic tree
      gffUrl="/data/genes.parquet"            // Required: Gene annotations
    />
  );
}
```

**Full Featured:** All data layers

```tsx
import { HoodiniVizDash } from 'hoodini-viz';

export default function App() {
  return (
    <HoodiniVizDash
      // Required data
      newickUrl="/data/tree.nwk"              // Phylogenetic tree
      gffUrl="/data/genes.parquet"            // Gene annotations
      
      // Optional data layers
      parquetUrls={{
        hoods: "/data/hoods.parquet",         // Gene neighborhoods
        domains: "/data/domains.parquet",     // Protein domains
        proteinLinks: "/data/protein_links.parquet",  // Homology links
        nucleotideLinks: "/data/nucleotide_links.parquet",  // DNA similarity
        proteinMetadata: "/data/protein_metadata.parquet",   // Additional info
        domainMetadata: "/data/domain_metadata.parquet",     // Domain info
        treeMetadata: "/data/tree_metadata.parquet"          // Tree node info
      }}
      
      // Optional configuration
      config={customConfig}                   // Visualization settings
    />
  );
}
```

### Option 2: Visualization Component Only (Advanced)

Use when you have your own data loading/parsing logic. This component is **props-driven** and doesn't fetch data.

**Minimum Required:**

```tsx
import { HoodiniViz } from 'hoodini-viz';
import { DEFAULT_CONFIG } from 'hoodini-viz';

export default function MyVisualization() {
  // Your data loading logic here
  const treeNewick = "((A:0.1,B:0.2):0.3,C:0.15);";
  const genes = [
    { id: 'gene1', seqid: 'A', start: 1000, end: 2000, strand: '+', metadata: {} }
  ];
  
  return (
    <HoodiniViz
      newickStr={treeNewick}                  // Required: Newick tree string
      gffFeatures={genes}                     // Required: Array of gene features
      domainsByGene={{}}                      // Required: Map or empty object
      proteinLinks={[]}                       // Required: Array or empty
      hoods={[]}                              // Required: Array or empty
      config={DEFAULT_CONFIG}                 // Required: Config object
    />
  );
}
```

**With All Data Layers:**

```tsx
import { HoodiniViz } from 'hoodini-viz';

export default function MyVisualization() {
  return (
    <HoodiniViz
      // Required props
      newickStr={newickData}
      gffFeatures={genes}
      domainsByGene={domainsMap}
      proteinLinks={proteinLinkArray}
      hoods={neighborhoodsArray}
      config={DEFAULT_CONFIG}
      
      // Optional data
      nucleotideLinks={nucleotideLinkArray}
      visibleGeneIds={filteredGeneSet}
      hiddenHoodIds={hiddenNeighborhoods}
      
      // Optional customization
      genePalette={{ type: 'qualitative', name: 'Set2' }}
      phyloPalette={{ type: 'sequential', name: 'Blues' }}
      
      // Optional callbacks
      onObjectClick={(obj) => console.log('Clicked:', obj)}
      onLegendChange={(config) => console.log('Legend updated:', config)}
    />
  );
}
```

## ✨ Features

### Core Visualization
- 🌳 **Phylogenetic Trees** - Interactive visualization with deck.gl, ultrametric support
- 🧬 **Gene Neighborhoods** - Browse genomic regions across species with alignment
- 🔗 **Multi-layer Analysis** - Protein domains, protein links, nucleotide links
- 🧫 **ncRNA Tracks** - Non-coding RNA annotations (tRNA, sRNA, tmRNA, etc.)
- 📍 **Genomic Regions** - CRISPR arrays, prophage regions, genomic islands

### Visual Customization
- 🎨 **Color Palettes** - 50+ qualitative, sequential, and diverging palettes
  - Genes: Bold (default), Vivid, Set1, etc.
  - Tree: Vivid (default), Okabe-Ito, Tableau, etc.
  - Regions: Margot2 (default), Dark2, etc.
  - ncRNAs: Prism (default), Set3, etc.
  - Domains: Gray sequential (default)
- 🎚️ **Visual Settings** - Y spacing, genome scale, label sizes, stroke widths
- 🌙 **Theme Support** - Light and dark mode with full customization

### Interactive Controls
- 📐 **Format Guides** - A4, A3, Letter, PowerPoint presets for export
- 📤 **SVG Export** - High-quality publication-ready figures with crop to guides
- 📈 **Prevalence Filtering** - Filter genes by cluster prevalence percentage
- 🔍 **Layer Toggles** - Show/hide tree, genes, domains, links, ncRNAs, regions

### Data & UI
- 📊 **Data Grid** - Browse, filter, and search genomic data
- 📱 **Responsive UI** - Works on desktop and tablets
- 🎯 **Full TypeScript** - Complete type safety and IDE support

## � Data Formats

Hoodini-viz supports **two data formats** with automatic fallback:

### 1. Parquet (Recommended) ⚡
- **Binary format** for fast loading (10-100x faster than text)
- **Compressed** - smaller file sizes
- **Preferred** for production use

### 2. TSV/Text (Fallback) 📄
- **Human-readable** - easy to inspect and edit
- **Automatic detection** - if Parquet fails, falls back to TSV
- **Development friendly** - simpler to generate

### Required Data Files

#### Phylogenetic Tree (Required)
**Format:** Newick (`.nwk`)

```newick
((speciesA:0.1,speciesB:0.2):0.3,(speciesC:0.15,speciesD:0.25):0.35);
```

**What it does:** Defines the evolutionary relationships between species/genomes.

**Requirements:**
- Valid Newick format with branch lengths
- Leaf names must match `seqid` field in GFF data

#### Gene Features (Required)
**Format:** GFF3 (`.gff` or `.gff.parquet`)

```gff
# Tab-separated values
seqid  source  type  start  end  score  strand  phase  attributes
chr1   maker   gene  1000   2000  .     +       .      ID=gene1;Name=GeneA;cluster=1
chr1   maker   gene  3000   4000  .     -       .      ID=gene2;Name=GeneB;cluster=1
```

**Parquet columns:**
```
seqid: string          // Species/genome identifier (matches tree leaf)
source: string         // Source database (optional)
type: string           // Feature type (usually "gene" or "CDS")
start: int64          // Start position (1-based, inclusive)
end: int64            // End position (1-based, inclusive)
strand: string         // '+' or '-'
attributes: string     // Key=Value pairs (ID, Name, cluster, etc.)
```

**What it does:** Defines genes, their positions, and basic metadata.

**Requirements:**
- `seqid` must match phylogenetic tree leaf names
- `ID` attribute is required for linking to other data
- `start` < `end` always (even for reverse strand)

### Optional Data Files

#### Gene Neighborhoods (Optional)
**Format:** TSV (`.hoods.txt` or `.hoods.parquet`)

```tsv
# Tab-separated
hood_id  gene_id  seqid  start_bp  end_bp
hood1    gene1    chr1   500       2500
hood1    gene2    chr1   500       2500
hood2    gene3    chr2   1000      3000
```

**What it does:** Groups genes into genomic regions ("neighborhoods") for synchronized visualization.

**Requirements:**
- `gene_id` must match gene feature IDs
- Multiple genes can share the same `hood_id`
- `start_bp` and `end_bp` define the visible window

#### Protein Domains (Optional)
**Format:** TSV (`.domains.txt` or `.domains.parquet`)

```tsv
# Tab-separated
gene_id  domain_id  start  end  evalue      domain_name
gene1    PF00001   150    400  1.2e-15     Kinase
gene1    PF00002   500    650  3.4e-10     SH3
gene2    PF00001   200    450  5.6e-20     Kinase
```

**What it does:** Annotates protein domains within genes (visual highlights on gene arrows).

**Requirements:**
- `gene_id` must match gene feature IDs
- `start`/`end` are positions **relative to gene start** (not absolute)
- `domain_name` is used for coloring and legend

#### Protein Links (Optional)
**Format:** TSV (`.protein_links.txt` or `.protein_links.parquet`)

```tsv
# Tab-separated
source_gene  target_gene  identity  evalue     cluster_id
gene1        gene3        85.5      1.2e-50    cluster_A
gene2        gene4        92.1      3.4e-80    cluster_A
```

**What it does:** Shows homology relationships between genes (visual connecting lines).

**Requirements:**
- `source_gene` and `target_gene` must match gene IDs
- Used for gene coloring when `colorBy="cluster"`

#### Nucleotide Links (Optional)
**Format:** TSV (`.nucleotide_links.txt` or `.nucleotide_links.parquet`)

```tsv
# Tab-separated
source_gene  target_gene  identity  start1  end1  start2  end2
gene1        gene3        95.2      100     500   150     550
```

**What it does:** Shows DNA sequence similarity between genomic regions.

#### Metadata Files (Optional)
**Format:** TSV (`.metadata.txt` or `.metadata.parquet`)

```tsv
# Protein metadata
gene_id  annotation         function           go_terms
gene1    Protein kinase     Phosphorylation    GO:0004672
gene2    DNA helicase       DNA unwinding      GO:0003678

# Domain metadata
domain_name  description              family
PF00001      Protein kinase domain    Kinase superfamily
PF00002      SH3 domain               Signal transduction

# Tree metadata
leaf_id   organism              strain     isolation_date
chr1      E. coli K-12          MG1655     1922
chr2      E. coli O157:H7       EDL933     1982
```

**What it does:** Adds custom fields for filtering, coloring, and tooltips.

**Requirements:**
- First column must be an ID field matching other data
- Additional columns are free-form (any name/content)

## 📁 Data Loading Examples

### Example 1: Parquet Files (Fast)

```tsx
<HoodiniVizDash
  newickUrl="/api/tree.nwk"
  parquetUrls={{
    gff: "/api/data/genes.parquet",
    hoods: "/api/data/hoods.parquet",
    domains: "/api/data/domains.parquet",
    proteinLinks: "/api/data/protein_links.parquet"
  }}
/>
```

### Example 2: TSV Files (Readable)

```tsx
<HoodiniVizDash
  newickUrl="/data/tree.nwk"
  gffUrl="/data/genes.gff"              // Will use text parser
  parquetUrls={{
    hoods: "/data/hoods.txt",           // .txt extension = TSV
    domains: "/data/domains.txt"
  }}
/>
```

### Example 3: Mixed Formats (Auto-fallback)

```tsx
<HoodiniVizDash
  newickUrl="/data/tree.nwk"
  gffUrl="/data/genes.parquet"          // Try Parquet first
  parquetUrls={{
    gff: "/data/genes.parquet",         // Primary
    domains: "/data/domains.parquet"    // If fails → tries domains.txt
  }}
/>
```

### Example 4: Dynamic Data (Fetch Yourself)

```tsx
import { HoodiniViz, DEFAULT_CONFIG } from 'hoodini-viz';

function MyComponent() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    async function loadData() {
      const treeRes = await fetch('/api/tree');
      const tree = await treeRes.text();
      
      const genesRes = await fetch('/api/genes');
      const genes = await genesRes.json();
      
      setData({ tree, genes });
    }
    loadData();
  }, []);
  
  if (!data) return <div>Loading...</div>;
  
  return (
    <HoodiniViz
      newickStr={data.tree}
      gffFeatures={data.genes}
      domainsByGene={{}}
      proteinLinks={[]}
      hoods={[]}
      config={DEFAULT_CONFIG}
    />
  );
}
```

## 🎨 Customization Examples

### Color Schemes

```tsx
<HoodiniViz
  genePalette={{
    type: 'qualitative',              // 'qualitative' or 'sequential'
    name: 'Set2',                     // Palette name (Set1, Set2, Blues, etc.)
    colors: ['#e41a1c', '#377eb8']   // Or custom colors
  }}
  colorBy="cluster"                   // Color genes by: cluster, name, strand
/>
```

### Event Handlers

```tsx
<HoodiniViz
  onObjectClick={(obj) => {
    if (obj.type === 'gene') {
      console.log('Gene clicked:', obj.id, obj.metadata);
    } else if (obj.type === 'tree-node') {
      console.log('Tree node clicked:', obj.name);
    }
  }}
/>
```

### Custom Configuration

```tsx
import { DEFAULT_CONFIG } from 'hoodini-viz';

const myConfig = {
  ...DEFAULT_CONFIG,
  gene: {
    ...DEFAULT_CONFIG.gene,
    height: 120,                      // Gene arrow height
    arrowheadHeight: 25,              // Arrow tip height
    opacity: 0.9                      // Transparency
  },
  tree: {
    ...DEFAULT_CONFIG.tree,
    nodeSize: 10,                     // Tree node radius
    lineWidth: 3                      // Tree edge thickness
  }
};

<HoodiniViz config={myConfig} />
```

## �📚 Documentation

For complete documentation, see [README_LIBRARY.md](./README_LIBRARY.md).

### Key Concepts

**HoodiniVizDash vs HoodiniViz:**
- **HoodiniVizDash**: Complete application with data loading, UI controls, sidebar, data grid
  - ✅ Use when you want everything out-of-the-box
  - ✅ Handles Parquet/TSV loading automatically
  - ✅ Includes all widgets and controls
  
- **HoodiniViz**: Core visualization component only
  - ✅ Use when you have custom data loading
  - ✅ Props-driven (no internal state)
  - ✅ Composable with your own UI

**Data Flow:**
1. Load tree (Newick) + genes (GFF) → minimum viable visualization
2. Add domains → protein domain annotations appear on genes
3. Add protein links → homology relationships drawn as curves
4. Add hoods → genes grouped into synchronized neighborhoods
5. Add metadata → custom filtering/coloring/labels

### Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for:
- Component hierarchy and data flow
- Model classes (PhyloTree, GenomeView, Gene, Domain)
- Design patterns and extension points
- Performance optimizations
- Development guidelines

### Project Structure

```
src/
├── index.ts                 # Library entry point
├── HoodiniViz.tsx          # Core visualization component
├── HoodiniVizDash.tsx      # Full-featured dashboard
├── components/             # UI components
├── models/                 # Data models (Gene, Domain, etc.)
├── utils/                  # Utility functions and parsers
├── widgets/                # Visualization widgets
├── config/                 # Configuration defaults
├── contexts/               # React contexts (Theme)
└── workers/                # Web Workers for parsing
```

## 🔧 Development

### Prerequisites

- **Node.js 18+** - JavaScript runtime
- **npm 9+** - Package manager
- **WebGL-enabled browser** - Chrome, Firefox, Safari, or Edge

### Local Development

```bash
# Clone repository
git clone <your-repo-url>
cd hoodini-viz

# Install dependencies
npm install

# Start dev server
npm run dev
# Opens http://localhost:5173
```

### Building - Three Options

#### 1. Build Everything
```bash
npm run build:all
# Outputs:
# - dist/ (library for npm)
# - dist-html/ (standalone HTML)
```

#### 2. Build Library Only (for npm)
```bash
npm run build
# Output: dist/
# - hoodini-viz.js       → ES module (361 bytes entry + chunks)
# - hoodini-viz.umd.js   → UMD bundle (2.1 MB, standalone)
# - hoodini-viz.css      → Styles (13 KB)
```

#### 3. Build HTML Template Only
```bash
npm run build:html
# Output: dist-html/
# - index.html           → Single file (3.3 MB, all-in-one)
```

### Testing Your Build Locally

**Test HTML template:**
```bash
npm run build:html
# Open dist-html/index.html in browser
```

**Test npm package:**
```bash
# Build the library
npm run build

# Link it globally
npm link

# In another project
npm link hoodini-viz

# Test import
import { HoodiniViz } from 'hoodini-viz';
```

### Linting

```bash
npm run lint
```

## 🚨 Common Issues & Solutions

### Issue 1: "Cannot find module 'hoodini-viz'"

**Solution:** Make sure you've installed the package:
```bash
npm install hoodini-viz
```

### Issue 2: Tree doesn't render

**Cause:** Leaf names in Newick don't match `seqid` in GFF data

**Solution:** Ensure exact match:
```newick
(speciesA:0.1,speciesB:0.2);  ← Leaf names
```
```gff
speciesA  ...  ← Must match exactly
speciesB  ...
```

### Issue 3: Genes not appearing

**Checklist:**
1. ✅ GFF file loaded successfully?
2. ✅ `seqid` matches tree leaf names?
3. ✅ `start` < `end` in GFF?
4. ✅ Valid `strand` ('+' or '-')?

### Issue 4: Domains not showing

**Cause:** Domain positions outside gene boundaries

**Solution:** Domain coordinates are **relative to gene start**:
```
Gene:   start=1000, end=2000 (length 1000)
Domain: start=100, end=400   ← position 100-400 within gene
```

### Issue 5: Performance issues with large datasets

**Solutions:**
1. ✅ Use Parquet format (10-100x faster than TSV)
2. ✅ Reduce visible genes with `visibleGeneIds` prop
3. ✅ Hide neighborhoods with `hiddenHoodIds`
4. ✅ Limit protein links to high-confidence only

## 📤 Publishing to npm

### First-time Setup

```bash
# Login to npm (one time only)
npm login

# Update package.json with your info
{
  "name": "hoodini-viz",
  "version": "0.1.0",
  "repository": "github:username/hoodini-viz",
  "homepage": "https://github.com/username/hoodini-viz",
  "author": "Your Name <you@example.com>",
  "license": "MIT"
}
```

### Publishing

```bash
# Test before publishing (dry run)
npm publish --dry-run

# Publish to npm
npm publish

# Publish with tag (for beta versions)
npm publish --tag beta
```

The `files` field in package.json ensures only the `dist/` directory is published.

### Version Bumping

```bash
# Patch version (0.1.0 → 0.1.1)
npm version patch

# Minor version (0.1.0 → 0.2.0)
npm version minor

# Major version (0.1.0 → 1.0.0)
npm version major

# Then publish
npm publish
```

## 💡 Usage Tips

### Tip 1: Start Simple, Add Layers

```tsx
// Step 1: Minimum viable (tree + genes)
<HoodiniVizDash
  newickUrl="/data/tree.nwk"
  gffUrl="/data/genes.parquet"
/>

// Step 2: Add domains for protein annotations
<HoodiniVizDash
  newickUrl="/data/tree.nwk"
  gffUrl="/data/genes.parquet"
  parquetUrls={{ domains: "/data/domains.parquet" }}
/>

// Step 3: Add protein links for homology
<HoodiniVizDash
  newickUrl="/data/tree.nwk"
  gffUrl="/data/genes.parquet"
  parquetUrls={{
    domains: "/data/domains.parquet",
    proteinLinks: "/data/protein_links.parquet"
  }}
/>
```

### Tip 2: Parquet Format for Production

**Development:** Use TSV for easy editing
```bash
# Easy to create and inspect
echo -e "seqid\ttype\tstart\tend" > genes.tsv
echo -e "chr1\tgene\t1000\t2000" >> genes.tsv
```

**Production:** Convert to Parquet for performance
```python
import pandas as pd

# Convert TSV to Parquet
df = pd.read_csv('genes.tsv', sep='\t')
df.to_parquet('genes.parquet', compression='snappy')
```

### Tip 3: CSS Styling

Import the CSS file in your app:

```tsx
// Option 1: Import in your component
import 'hoodini-viz/dist/hoodini-viz.css';

// Option 2: Import in your main CSS file
@import 'hoodini-viz/dist/hoodini-viz.css';

// Option 3: Add to HTML
<link rel="stylesheet" href="node_modules/hoodini-viz/dist/hoodini-viz.css">
```

### Tip 4: TypeScript Support

The library exports full TypeScript definitions:

```tsx
import type { 
  HoodiniVizProps,
  Gene,
  Domain,
  PhyloTree,
  PaletteConfig
} from 'hoodini-viz';

// Full type safety
const genes: Gene[] = [
  { id: 'g1', seqid: 'chr1', start: 100, end: 500, strand: '+', metadata: {} }
];

const config: PaletteConfig = {
  type: 'qualitative',
  name: 'Set2'
};
```

## 🌐 Browser Support

**Minimum Requirements:**
- **Chrome 90+** / **Edge 90+** - Full support
- **Firefox 88+** - Full support
- **Safari 14+** - Full support

**Critical:** Requires **WebGL** support for deck.gl visualization.

**Check WebGL support:** Visit [get.webgl.org](https://get.webgl.org)

**Mobile/Tablet:**
- ✅ iPad Pro / iPad Air - Full support
- ⚠️ Small phones - Limited (UI optimized for larger screens)

## 🛠️ Tech Stack

- **React 19** - UI framework with latest features
- **TypeScript 5.8** - Type safety and developer experience
- **deck.gl 9.1** - High-performance WebGL visualization engine
- **Vite 7** - Lightning-fast build tool and dev server
- **shadcn/ui** - Accessible, customizable UI components
- **Tailwind CSS 4** - Utility-first styling
- **Radix UI** - Unstyled, accessible component primitives
- **hyparquet** - Fast Parquet file parsing in browser
- **loaders.gl** - Optimized data loading utilities

## 🔗 Related Projects

- **deck.gl** - [deck.gl](https://deck.gl) - WebGL visualization framework
- **React** - [react.dev](https://react.dev) - UI library
- **Vite** - [vitejs.dev](https://vitejs.dev) - Build tool
- **Parquet** - [parquet.apache.org](https://parquet.apache.org) - Columnar storage format

## 📖 Additional Resources

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Deep dive into component architecture
- **[README_LIBRARY.md](./README_LIBRARY.md)** - Complete API reference
- **[LIBRARY_TRANSFORMATION.md](./LIBRARY_TRANSFORMATION.md)** - Project transformation notes

## 🎓 Learning Path

1. **Beginner:** Start with `HoodiniVizDash` + minimal data (tree + genes)
2. **Intermediate:** Add domains and protein links, customize colors
3. **Advanced:** Use `HoodiniViz` directly with custom data loading
4. **Expert:** Extend with custom layers, widgets, and parsers

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Start by reading the [ARCHITECTURE.md](./ARCHITECTURE.md).

## 📞 Support

For issues and questions, please open an issue on the repository.
