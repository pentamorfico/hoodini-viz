
---
<p align="center">
  <img src="src/assets/hoodini-viz_logo_github.svg" alt="Hoodini Logo" width="500"/>
</p>

<p align="center">
  <strong>GPU-powered, feature-rich, highly customizable, fully interactive visualization library for comparative genomics</strong>
</p>
<p align="center">
    Written in TypeScript + React, powered by WebGL
</p>

<div align = center>

[<kbd> <br> Click here for an interactive demo <br> </kbd>][KBD]

</div>


[KBD]: https://github.com/pentamorfico/hoodini


<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#data-formats">Data Formats</a> •
  <a href="#api-reference">API</a>
</p>

--- 



## Overview

**Hoodini-viz** is a GPU-accelerated React library for interactive visualization of phylogenetic trees, gene neighborhoods, protein domains, and homology relationships. Built on [deck.gl](https://deck.gl/).

**Fully portable**: Import as React component, embed via CDN, or deploy as a self-contained HTML file.


<p align="center">
    <img src="src/assets/hoodini-viz-export - 2026-01-14T051133.869.svg" alt="Hoodini Visualization Example" width="800"/>
</p>



## Installation

### npm / yarn / pnpm

```bash
npm install hoodini-viz
```

### CDN (UMD)

```html
<script src="https://unpkg.com/hoodini-viz/dist/hoodini-viz.umd.js"></script>
```

### Self-Contained HTML

Build a single portable HTML file with all assets inlined:

```bash
npm run build:html
# → dist-html/index.html (zero external dependencies)
```

---

## Quick Start

### React Integration

```tsx
import { HoodiniDashboard } from 'hoodini-viz';

<HoodiniDashboard
  dataPaths={{
    gffParquet: '/data/genes.parquet',
    hoodsParquet: '/data/hoods.parquet',
    newick: '/data/tree.nwk',
    proteinLinksParquet: '/data/links.parquet',
  }}
  initialState={{ ultrametric: true, colorBy: 'cluster' }}
/>
```

### Props-Driven (Custom Data Loading)

```tsx
import { HoodiniViz } from 'hoodini-viz';

<HoodiniViz
  newickStr={newick}
  gffFeatures={genes}
  proteinLinks={links}
  domainsByGene={domains}
  showTreeLayer={true}
  showGeneLayer={true}
  showProteinLinkLayer={true}
/>
```

---

## Features

### GPU-Powered Rendering

WebGL rendering via deck.gl enables smooth interaction with **100,000+ genes** and complex homology networks. Pan, zoom, and explore datasets that would freeze traditional SVG-based viewers.

### Fully Interactive

- **Click** any gene, domain, or link to inspect details
- **Hover** for tooltips with metadata
- **Pan & zoom** fluidly across the entire dataset
- **Flip tracks** to reverse strand orientation
- **Shift windows** to explore flanking regions
- **Align by cluster** to compare gene neighborhoods

### Real-Time Customization

Every visual parameter is adjustable without reloading:

| Layer | Customizable Properties |
|-------|------------------------|
| **Genes** | Height, arrowhead style, color-by field, label position |
| **Domains** | Source filter, color palette, coverage display |
| **Protein Links** | Identity threshold, coloring mode, alpha range |
| **Synteny Blocks** | Strand coloring, gradient intensity |
| **Tree** | Ultrametric toggle, scale, label alignment |

### 50+ Color Palettes

Qualitative, sequential, and diverging palettes from [dicopal](https://github.com/riatelab/dicopal). Includes colorblind-safe options (viridis, cividis, Okabe-Ito).

### Integrated Data Browser

Virtualized data grid (millions of rows) with:
- Multi-tab navigation (genes, domains, links, metadata)
- Click-to-zoom navigation
- Column filtering and search

### Protein Structure Prediction

Built-in 3D structure viewer with on-demand folding:
- **ESMFold** (≤400 aa, no API key)
- **Boltz2** (>400 aa, NVIDIA API)
- **3Dmol.js** interactive viewer with pLDDT confidence coloring

### Publication-Ready SVG Export

Vector export with format presets (A4, Letter, PowerPoint). Compatible with Illustrator, Affinity Designer, Inkscape.

---

## Data Formats

### Parquet (Recommended)

3-10x faster loading via [hyparquet](https://github.com/hyparam/hyparquet). Convert with:

```bash
python scripts/convert_to_parquet.py
```

### Supported Formats

| File | Format | Required Columns |
|------|--------|------------------|
| **Genes** | GFF3 / Parquet | seqid, start, end, strand, attributes |
| **Hoods** | TSV / Parquet | hood_id, seqid, start, end |
| **Tree** | Newick | Standard Newick with branch lengths |
| **Protein Links** | TSV / Parquet | geneA, geneB, similarity |
| **Nucleotide Links** | TSV / Parquet | seqidA, startA, endA, seqidB, startB, endB |
| **Domains** | TSV / Parquet | geneId, domainName, start, end, source |
| **Metadata** | TSV / Parquet | id + any additional columns |

---

## API Reference

### HoodiniDashboard

Full dashboard with sidebar, data loading, and data grid.

```tsx
<HoodiniDashboard
  dataPaths={{ ... }}
  initialState={{ ... }}
  showSidebar={true}
  showDataGrid={true}
/>
```

### HoodiniViz

Core visualization component (50+ props for full control).

| Category | Key Props |
|----------|-----------|
| **Data** | `newickStr`, `gffFeatures`, `proteinLinks`, `domainsByGene`, `hoods` |
| **Visual** | `geneHeight`, `treeXScale`, `ultrametric`, `phyloLabelPosition` |
| **Coloring** | `geneColorBy`, `domainColorBy`, `treeColorBy`, `genePalette` |
| **Layers** | `showTreeLayer`, `showGeneLayer`, `showDomainLayer`, `showProteinLinkLayer` |
| **Alignment** | `alignCluster`, `useDefaultGeneAlignment`, `defaultAlign` |
| **Links** | `proteinLinkConfig`, `nucleotideLinkConfig` |

---

## Configuration

```typescript
import { createConfig } from 'hoodini-viz';

const config = createConfig({
  gene: { height: 80, arrowheadHeight: 15 },
  tree: { ySpacing: 200 },
  proteinLink: { bezierSegments: 60, maxAlpha: 0.6 },
});
```

---

## Performance

| Dataset | Genes | Links | Notes |
|---------|-------|-------|-------|
| Small | <1K | <5K | Default settings |
| Medium | 1K-10K | 5K-50K | Use Parquet |
| Large | 10K-100K | 50K-500K | Filter links, reduce bezier segments |

**Tips**: Use Parquet format • Filter by identity threshold • Disable unused layers • Reduce `bezierSegments` to 60

---

## Development

```bash
npm run dev          # Dev server (localhost:5173)
npm run build        # Library build (ESM + UMD + types)
npm run build:html   # Self-contained HTML
npm run storybook    # Component docs (localhost:6006)
```

---

## Browser Support

Chrome 90+ • Firefox 88+ • Safari 14+ • Edge 90+ (requires WebGL 2.0)

---

## License

MIT License

---

## Acknowledgments

[deck.gl](https://deck.gl/) • [hyparquet](https://github.com/hyparam/hyparquet) • [dicopal](https://github.com/riatelab/dicopal) • [3Dmol.js](https://3dmol.org/) • [ESMFold](https://esmatlas.com/)
