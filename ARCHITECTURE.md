# Hoodini-viz Architecture

Complete guide to the structure, design patterns, and component hierarchy of the hoodini-viz library.

## Project Overview

**Hoodini-viz** is a React library for interactive phylogenetic and genomic visualization. It provides two primary entry points:

1. **`HoodiniViz`** - Core visualization component (props-driven, no data loading)
2. **`HoodiniVizDash`** - Full-featured dashboard with UI and data loading

## Component Hierarchy

```
┌─ HoodiniVizDash ─────────────────────────────────────┐
│  Dashboard container with full UI                     │
│  Responsibilities:                                     │
│  • Data loading (Parquet/TSV)                         │
│  • Data parsing via Web Workers                       │
│  • State management (colors, visibility, etc.)        │
│  • Sidebar controls & data grid                       │
│                                                        │
│  ┌─ AppSidebar ────────────────────┐                 │
│  │ Control panel & settings        │                 │
│  │                                  │                 │
│  └──────────────────────────────────┘                 │
│                                                        │
│  ┌─ HoodiniViz ─────────────────────┐                │
│  │ Core visualization (deck.gl)     │                │
│  │ Props-driven, no data loading    │                │
│  │                                   │                │
│  │ ┌─ Deck GL Layers ──────────┐   │                │
│  │ │ • LineLayer (tree edges)  │   │                │
│  │ │ • PolygonLayer (genes)    │   │                │
│  │ │ • ScatterplotLayer (tree) │   │                │
│  │ │ • TextLayer (labels)      │   │                │
│  │ └────────────────────────────┘   │                │
│  │                                   │                │
│  │ ┌─ Widgets ──────────────────┐   │                │
│  │ │ • RulerWidget             │   │                │
│  │ │ • ScrollbarWidget         │   │                │
│  │ │ • TreeScaleWidget         │   │                │
│  │ └─────────────────────────────┘   │                │
│  │                                   │                │
│  └───────────────────────────────────┘                │
│                                                        │
│  ┌─ DataGridView ─────────────────┐                  │
│  │ Data browser (glide-data-grid) │                  │
│  │                                 │                  │
│  └─────────────────────────────────┘                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Data Flow

### HoodiniVizDash (with data loading)

```
1. Component Mount
   └─ loadData() effect triggered
      ├─ Create Web Worker for parsing
      ├─ Fetch Parquet files (via hyparquet)
      │  └─ If failed → fetch TSV fallback
      ├─ Parse data (Worker or main thread)
      ├─ Normalize & convert (BigInt → Number)
      ├─ Set state (setParsedGFF, setParsedDomains, etc.)
      └─ Pass normalized data to HoodiniViz

2. User Interaction
   ├─ Sidebar: Update colors, visibility
   ├─ DataGrid: Filter, select rows
   ├─ Canvas: Click gene/tree node
   └─ Widgets: Adjust zoom, scale

3. Re-render & Sync
   └─ HoodiniViz receives new props
      └─ Recalculate layers (memoized)
         └─ Deck.gl updates canvas
```

### HoodiniViz (visualization only)

```
Props In
  ├─ newickStr: Newick tree string
  ├─ gffFeatures: Gene array
  ├─ domainsByGene: Map of genes → domains
  ├─ proteinLinks: Homology links
  ├─ hoods: Gene neighborhoods
  ├─ genePalette, phyloPalette: Color configs
  └─ ... (50+ configuration props)
      │
      ├─ Create Models
      │  ├─ PhyloTree (from Newick)
      │  └─ GenomeView (from GFF, links, domains)
      │
      ├─ Generate Layers
      │  ├─ Tree visualization (LineLayer, ScatterplotLayer)
      │  ├─ Gene tracks (PolygonLayer)
      │  ├─ Domain highlights
      │  ├─ Link overlays
      │  └─ Text labels (TextLayer)
      │
      └─ Render Canvas
         └─ DeckGL component
            └─ WebGL context
```

## Core Models

### `PhyloTree`

Represents a phylogenetic tree parsed from Newick format.

```typescript
class PhyloTree {
  root: PhyloNode;
  nodeMap: Map<string, PhyloNode>;
  leafNames: string[];
  
  constructor(newickStr: string);
  getLeafByName(name: string): PhyloNode | null;
  getNodesByCluster(clusterId: string): PhyloNode[];
}
```

**Key methods:**
- `constructor(newickStr)` - Parse Newick string
- `getLeafByName(name)` - Look up leaf node
- `getNodesByCluster(id)` - Get nodes with matching cluster metadata

### `GenomeView`

Manages all visual elements: genes, domains, links, neighborhoods.

```typescript
class GenomeView {
  genesById: Map<string, Gene>;
  hoodRanges: Map<string, Hood>;
  domainsByGene: Map<string, Domain[]>;
  proteinClusters: Map<string, ProteinLink[]>;
  
  addGene(gene: Gene): void;
  shiftTrackPlus1kb(hoodId: string): void;
  flipTrackToggle(hoodId: string): void;
  applyDomainPalette(palette: PaletteConfig): void;
}
```

**Key methods:**
- `addGene(gene)` - Register gene for rendering
- `shiftTrackPlus1kb(hoodId)` - Scroll neighborhood window
- `flipTrackToggle(hoodId)` - Reverse strand direction
- `applyDomainPalette(palette)` - Update domain colors

### `Gene`

Represents a single gene feature.

```typescript
class Gene {
  id: string;
  seqid: string;
  start: number;
  end: number;
  strand: '+' | '-';
  metadata: Record<string, any>;
  fillColor: [r, g, b, a];
  hoodId?: string;
}
```

### `Domain`

Represents a protein domain annotation.

```typescript
class Domain {
  id: string;
  start: number;
  end: number;
  evalue: number;
  domainName: string;
  fillColor: [r, g, b, a];
}
```

## File Organization

```
src/
├── index.ts                        # 📦 Library entry point
│
├── App.tsx                         # 🚀 Demo app entry point
├── main.tsx                        # Entry for dev/build
├── HoodiniVizDash.tsx              # 📊 Full dashboard component
│
├── components/
│   ├── HoodiniViz.tsx              # ⭐ Core visualization (props-driven)
│   ├── AppSidebar.tsx              # Control panel
│   ├── DataGridView.tsx            # Data browser
│   ├── ProteinFoldViewer.tsx       # 🧬 Protein folding (ESMFold/Boltz2)
│   ├── ProteinViewer3DMol.tsx      # 🔬 3D structure viewer (3Dmol.js)
│   ├── RNAStructureViewer.tsx      # RNA secondary structure viewer
│   ├── ErrorBoundary.tsx           # Error handler
│   └── ui/                         # shadcn/ui components (Button, Card, etc.)
│
├── widgets/                        # 🎨 Visualization widgets
│   ├── ColorPaletteWidget.tsx
│   ├── RulerWidget.tsx
│   ├── ScrollbarWidget.tsx
│   ├── TreeScaleWidget.tsx
│   ├── LegendWidget.tsx
│   └── ExportSVGWidget.tsx
│
├── models/                         # 📐 Data models
│   ├── PhyloTree.ts               # Phylogenetic tree
│   ├── GenomeView.ts              # Visualization state
│   ├── Gene.ts
│   ├── Domain.ts
│   ├── Hood.ts
│   ├── PhyloNode.ts
│   ├── Link.ts
│   └── ...
│
├── utils/
│   ├── parsers/
│   │   ├── parseGFF.ts            # GFF3 parser
│   │   ├── parseHoods.ts          # Hood neighborhoods
│   │   ├── parseDomains.ts        # Domain annotations
│   │   └── ...
│   ├── loadersGLUtils.ts          # loaders.gl optimized parsers
│   ├── colorPalettes.ts           # Palette generation
│   ├── paletteCache.ts            # Memoized palettes
│   ├── exportToSVG.ts             # SVG export
│   └── ...
│
├── config/
│   └── visualizationConfig.ts      # Global config
│
├── contexts/
│   └── ThemeContext.tsx            # Theme provider
│
├── data/                           # 📁 Sample data
│   ├── parquet/                    # Binary data files
│   ├── tsv/                        # Text fallbacks
│   └── tree.nwk                    # Newick tree
│
└── workers/
    └── parser.worker.js            # Web Worker for parsing
```

## Key Design Patterns

### 1. Props-Driven HoodiniViz

**HoodiniViz** accepts all configuration as props, no internal state modification:

```tsx
<HoodiniViz
  newickStr={newickData}
  gffFeatures={genes}
  domainsByGene={domains}
  genePalette={palette}
  onObjectClick={handleClick}
/>
```

**Benefits:**
- Reusable in any React app
- Predictable rendering
- Easy to test

### 2. Stateful HoodiniVizDash

**HoodiniVizDash** manages application state:

```tsx
const [genePalette, setGenePalette] = useState({...});
const [geneColorBy, setGeneColorBy] = useState('cluster');
// ... pass down to HoodiniViz as props
```

**Responsibilities:**
- Data loading & parsing
- User interaction state
- Palette & visibility management

### 3. Web Worker for Heavy Parsing

Parquet/TSV parsing happens in a background worker to keep UI responsive:

```typescript
const parserWorker = new ParserWorker();
parserWorker.postMessage({ 
  id: 'parse-gff-1',
  type: 'gff',
  text: gffData,
  config: coreConfig
});
parserWorker.onmessage = (e) => {
  setParsedGFF(e.data.result);
};
```

### 4. Memoized Layer Generation

Expensive layer calculations are memoized:

```typescript
const treeLayers = useMemo(() => {
  return [
    new LineLayer({
      id: 'tree-edges',
      data: tree.edges,
      getSourcePosition: ...
    }),
    ...
  ];
}, [tree, ultrametric, config]);
```

## Data Loading Strategy

### Parquet First, Text Fallback

```typescript
async function tryLoadParquet(url: string) {
  try {
    const arr = await hyparquet.parquetReadObjects(url);
    return arr;  // Success
  } catch (e) {
    return null;  // Fall back to text
  }
}

// In data loading effect:
const p = await tryLoadParquet(gffParquetUrl);
if (Array.isArray(p)) {
  return p;  // Use parquet
}
const txt = await fetchText(gffTextUrl);
return parseGFF(txt);  // Use text parser
```

**Benefits:**
- Fast binary format when available
- Human-readable fallback
- Auto-detection (same filename, different extension)

## Performance Optimizations

1. **Web Worker Parsing** - Parquet/TSV parsing non-blocking
2. **Memoization** - Layer generation, palette lookup
3. **Virtualized Grid** - DataGridView only renders visible rows
4. **Lazy Loading** - Tree nodes expanded on demand
5. **WebGL Rendering** - Deck.gl handles efficient canvas updates
6. **CSS Modules** - No runtime style recalculation

## Protein Structure Prediction

The library integrates two protein folding APIs for 3D structure prediction:

### ESMFold (Meta AI)
- **URL:** `https://api.esmatlas.com/foldSequence/v1/pdb/`
- **Limit:** ≤400 amino acids
- **Output:** PDB format
- **CORS:** Supported (direct browser access)
- **No API key required**

### Boltz2 (NVIDIA)
- **URL:** `https://health.api.nvidia.com/v1/biology/mit/boltz2/predict`
- **Limit:** >400 amino acids (longer sequences)
- **Output:** mmCIF format
- **CORS:** Not supported (requires proxy)
- **API key required** (stored in localStorage)

### Architecture

```
┌─ AppSidebar ─────────────────────────────────────────┐
│  User clicks "Fold Sequence" or "Fold with Boltz2"   │
│  └─ Stores NVIDIA API key in localStorage            │
│                                                        │
│  ┌─ ProteinViewer3DMol ──────────────────────────┐   │
│  │  Determines folding method based on length:   │   │
│  │  • ≤400 aa → ESMFold (direct)                 │   │
│  │  • >400 aa → Boltz2 (via CORS proxy)          │   │
│  │                                                │   │
│  │  CORS Proxy Fallback Chain:                   │   │
│  │  1. corsproxy.io                              │   │
│  │  2. cors.sh                                   │   │
│  │  3. thingproxy.freeboard.io                   │   │
│  │                                                │   │
│  │  ┌─ 3Dmol.js Viewer ───────────────────┐     │   │
│  │  │  Renders PDB or mmCIF structure     │     │   │
│  │  │  Colors by pLDDT confidence score   │     │   │
│  │  └─────────────────────────────────────┘     │   │
│  └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

### Key Components

**`ProteinViewer3DMol.tsx`** - Handles API calls and 3D rendering:
- Automatic format detection (PDB vs mmCIF)
- pLDDT confidence coloring
- CORS proxy fallback system

**`AppSidebar.tsx`** - User interface:
- API key management (save/clear)
- Folding status indicators
- Method display (ESMFold vs Boltz2)

### Storage

```typescript
// NVIDIA API key stored in localStorage
const NVIDIA_API_KEY_STORAGE = 'hoodini_nvidia_api_key';
localStorage.setItem(NVIDIA_API_KEY_STORAGE, apiKey);
```

## Adding New Layers

To add a new visualization layer:

1. **Define data model** in `src/models/`
2. **Add layer generation** in `src/components/HoodiniViz.tsx`
3. **Create widget** (if needed) in `src/widgets/`
4. **Add palette config** in `src/config/visualizationConfig.ts`

Example: Adding a new annotation layer

```typescript
// 1. Model (src/models/Annotation.ts)
class Annotation {
  id: string;
  start: number;
  end: number;
  type: string;
}

// 2. Layer generation (in HoodiniViz.tsx)
const annotationLayer = new PolygonLayer({
  id: 'annotations',
  data: annotations,
  getPolygon: (d) => [[d.start, y], [d.end, y], ...],
  getFillColor: (d) => annotationColors[d.type],
});

// 3. Add to layers array
const layers = [treeLayers, geneLayer, annotationLayer, ...];
```

## Extension Points

### Custom Color Palettes

```typescript
import { getPaletteColors } from 'hoodini-viz';

const myPalette = {
  type: 'qualitative',
  name: 'MyColors',
  colors: ['#FF0000', '#00FF00', '#0000FF']
};

<HoodiniViz 
  genePalette={myPalette}
/>
```

### Custom Click Handlers

```typescript
<HoodiniViz
  onObjectClick={(obj) => {
    console.log('Clicked:', obj);
    // Update external state
    updateMyApp(obj);
  }}
/>
```

### Custom Configuration

```typescript
import { DEFAULT_CONFIG } from 'hoodini-viz';

const customConfig = {
  ...DEFAULT_CONFIG,
  gene: {
    ...DEFAULT_CONFIG.gene,
    arrowheadHeight: 15,
    height: 80
  }
};

<HoodiniVizDash config={customConfig} />
```

## Development

### Running the dev server

```bash
npm install
npm run dev
# Visit http://localhost:5173
```

### Building the library

```bash
npm run build
# Outputs:
# - dist/hoodini-viz.js (ESM)
# - dist/hoodini-viz.umd.js (UMD)
# - dist/index.d.ts (TypeScript types)
```

### Publishing to npm

```bash
npm publish
```

Users can then install with:

```bash
npm install hoodini-viz
```

And use:

```tsx
import { HoodiniViz, HoodiniVizDash } from 'hoodini-viz';
```

## Type Safety

The library provides TypeScript definitions for all components and utilities:

```typescript
// Import types
import type { HoodiniVizProps, PaletteConfig } from 'hoodini-viz';

// Use in your app
const props: HoodiniVizProps = {
  newickStr: '...',
  gffFeatures: [...],
  // Full type checking
};
```

## Browser Support

- Modern browsers with WebGL support (Chrome, Firefox, Safari, Edge)
- ES2020+ (requires transpilation for older browsers)
- Tested on:
  - Chrome 90+
  - Firefox 88+
  - Safari 14+
  - Edge 90+
