
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


[KBD]: https://storage.hoodini.bio/hoodini-demo.html

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

This library is the **visualization engine** behind [Hoodini](https://github.com/pentamorfico/hoodini), the command-line tool for comparative genomics analysis. If you are a biologist looking to visualize gene neighborhoods, you probably want to use Hoodini directly, which handles all data processing and generates ready-to-use interactive visualizations.

Hoodini-viz is designed for developers who want to integrate genomic visualizations into their own web applications, or for advanced users who need fine-grained control over the visualization parameters.

<p align="center">
    <img src="src/assets/hoodini-viz-export - 2026-01-14T051133.869.svg" alt="Hoodini Visualization Example" width="800"/>
</p>

---

## For Biologists: Use Hoodini Instead

If you want to visualize gene neighborhoods without writing code, use **[Hoodini](https://github.com/pentamorfico/hoodini)**, the command-line tool that automates the entire workflow. Hoodini takes your genome files as input, performs all the necessary analyses (homology detection, domain annotation, phylogenetic inference), and generates a self-contained HTML file with an interactive Hoodini-viz visualization.

With Hoodini, you provide your genome sequences and the tool handles everything else: gene calling, protein clustering, domain annotation, tree building, and visualization. The output is a single HTML file that you can open in any browser, share with collaborators, or embed in publications.

Visit the [Hoodini repository](https://github.com/pentamorfico/hoodini) for installation instructions and usage examples.

---

## For Developers:  (IN DEVELOPMENT, NOT IMPLEMENTED YET)

Hoodini-viz is distributed as an npm package. Install it in your React project with npm, yarn, or pnpm:

```bash
npm install hoodini-viz
```

The library exports two main components. `HoodiniDashboard` is a complete solution that includes the visualization canvas, a sidebar with controls, and a data browser panel. It handles data loading from URLs and provides a ready-to-use interface. `HoodiniViz` is the core visualization component for developers who want full control over data loading and the user interface.

You can also load Hoodini-viz via CDN for quick prototyping:

```html
<script src="https://unpkg.com/hoodini-viz/dist/hoodini-viz.umd.js"></script>
```

---

## Quick Start

The simplest way to get started is with `HoodiniDashboard`. This component loads data from URLs and provides a complete interface with sidebar controls and a data browser:

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
      }}
      initialState={{ ultrametric: true, colorBy: 'cluster' }}
    />
  );
}
```

For custom integrations where you handle data loading yourself, use `HoodiniViz` directly. This gives you full control over the data flow and allows you to integrate the visualization into existing applications:

```tsx
import { HoodiniViz } from 'hoodini-viz';

function CustomViewer({ newick, genes, links, domains }) {
  return (
    <HoodiniViz
      newickStr={newick}
      gffFeatures={genes}
      proteinLinks={links}
      domainsByGene={domains}
      showTreeLayer={true}
      showGeneLayer={true}
      showProteinLinkLayer={true}
    />
  );
}
```

---

## Features

### GPU-Powered Rendering

Traditional genome browsers use SVG or Canvas rendering, which works fine for small datasets but becomes sluggish or crashes entirely when visualizing thousands of genes. Hoodini-viz uses WebGL through the deck.gl framework, offloading rendering to the GPU. This allows smooth, real-time interaction with datasets containing over 100,000 genes and complex homology networks with millions of pairwise relationships.

### Interactive Exploration

The visualization responds instantly to user input. Scroll to zoom in on specific regions or zoom out to see the entire dataset. Click and drag to pan across the visualization. Hover over any element to see detailed information in a tooltip. Click on genes, domains, or homology links to select them and view their properties in the data browser.

Each genomic track can be manipulated independently. Right-click on a track to flip its orientation, which is useful when comparing genes on opposite strands. Shift the genomic window left or right to explore flanking regions. Align all tracks by a specific protein cluster to compare gene neighborhood conservation.

### Visual Customization

Every visual parameter can be adjusted in real-time through the sidebar controls. Change the height of gene arrows, the thickness of homology links, or the scale of the phylogenetic tree. Switch between different coloring schemes: color genes by protein cluster, by functional annotation, or by any metadata field in your dataset.

The library includes over 50 color palettes from the dicopal collection, organized into qualitative palettes for categorical data, sequential palettes for continuous values, and diverging palettes for data with a meaningful midpoint. Several colorblind-safe palettes are available, including viridis, cividis, and Okabe-Ito.

### Data Browser

A virtualized data grid displays all your data in tabular form. Browse genes, protein domains, homology links, and metadata across multiple tabs. The grid handles millions of rows efficiently through virtualization, loading only the visible portion into memory. Filter columns, search across the dataset, and click on any row to zoom the visualization to that feature.

### Protein Structure Prediction

Select any gene to predict its 3D protein structure on demand. For proteins up to 400 amino acids, Hoodini-viz uses ESMFold, which requires no API key. For longer proteins, it connects to the Boltz2 service from NVIDIA. Predicted structures are displayed in an interactive 3Dmol.js viewer with confidence coloring based on pLDDT scores.

### Publication-Ready Export

Export the current view as a scalable vector graphic (SVG) file suitable for publications and presentations. Choose from preset formats including A4, Letter, and PowerPoint slide dimensions. The exported SVG files are compatible with Adobe Illustrator, Affinity Designer, Inkscape, and other vector graphics editors.

---

## Data Formats

Hoodini-viz accepts data in several formats. For optimal performance with large datasets, use Parquet files, which load 3-10x faster than TSV files. The included conversion script transforms your existing TSV files to Parquet format:

```bash
python scripts/convert_to_parquet.py
```

### Detailed Format Specifications

The genes file follows the standard GFF3 format used by genome annotation tools. Each line represents a genomic feature with columns for sequence ID, source, feature type, coordinates, strand, and attributes. The attributes column contains key-value pairs including the gene ID, name, and product description.

The hoods file defines the genomic windows displayed in the visualization. Each row corresponds to one track in the output. The hood_id column provides a unique identifier, seqid specifies the source sequence, and start/end define the coordinate range. An optional align_gene column indicates which gene should serve as the alignment anchor for that track.

Protein links represent pairwise homology relationships between genes. Each row contains two gene IDs and a similarity score, typically percent identity from BLAST or Diamond results. These links are rendered as curved lines connecting homologous genes across tracks.

Nucleotide links represent synteny blocks between genomic regions. Each row specifies coordinates on two sequences along with a similarity score. These are rendered as colored polygons connecting conserved regions.

The domains file contains protein domain annotations with gene ID, domain name, start and end positions in amino acids, and the source database such as Pfam or TIGRFAM. Multiple domains per gene are supported and rendered as colored boxes within the gene arrows.

Metadata files contain additional information about genes or tree leaves. Any column beyond the ID can be used for coloring or labeling in the visualization.

---

## API Reference

### HoodiniDashboard

The `HoodiniDashboard` component provides a complete visualization environment. It accepts a `dataPaths` object specifying URLs or paths to data files, an `initialState` object for default visualization settings, and boolean flags to show or hide the sidebar and data grid panels:

```tsx
<HoodiniDashboard
  dataPaths={{
    gffParquet: '/data/genes.parquet',
    hoodsParquet: '/data/hoods.parquet',
    newick: '/data/tree.nwk',
    proteinLinksParquet: '/data/links.parquet',
  }}
  initialState={{ ultrametric: true, colorBy: 'cluster' }}
  showSidebar={true}
  showDataGrid={true}
/>
```

### HoodiniViz

The `HoodiniViz` component is the core visualization engine with over 50 configurable props. Data props accept pre-parsed data objects rather than file paths. Visual props control dimensions, scales, and label positions. Coloring props determine how features are colored and labeled. Layer visibility props toggle individual visualization layers. Alignment props control how genomic tracks are positioned relative to each other. Link configuration props customize the appearance of homology connections:

```tsx
<HoodiniViz
  newickStr={newick}
  gffFeatures={genes}
  proteinLinks={links}
  domainsByGene={domains}
  hoods={hoods}
  ultrametric={true}
  geneHeight={60}
  geneColorBy="cluster"
  genePalette={{ type: 'qualitative', name: 'Bold', numColors: 10, enabled: true }}
  showTreeLayer={true}
  showGeneLayer={true}
  showProteinLinkLayer={true}
  onObjectClick={(info) => console.log(info.object)}
/>
```

---

## Configuration

The `createConfig` function generates a configuration object with custom visualization parameters. Override specific values while keeping defaults for everything else:

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

Performance depends primarily on the number of protein links rendered. Datasets with fewer than 1,000 genes and 5,000 links run smoothly with default settings. For medium datasets up to 10,000 genes, use Parquet format for faster loading. Large datasets with up to 100,000 genes benefit from filtering links by identity threshold and reducing the bezier curve resolution. Very large datasets may require server-side pre-filtering to reduce data size before loading.

---

## Development

Run the development server to test changes locally. The library build command generates ESM, UMD, and TypeScript declaration files. The HTML build creates a self-contained file with all dependencies inlined. Storybook provides interactive documentation for all components:

```bash
npm run dev          # Development server at localhost:5173
npm run build        # Library build (dist/hoodini-viz.js)
npm run build:html   # Self-contained HTML (dist-html/index.html)
npm run storybook    # Component documentation at localhost:6006
```

---

## Browser Support

Hoodini-viz requires a modern browser with WebGL 2.0 support. Chrome 90 and later, Firefox 88 and later, Safari 14 and later, and Edge 90 and later are fully supported.

---

## License

MIT License

---

## Acknowledgments

Hoodini-viz builds on several excellent open-source projects: [deck.gl](https://deck.gl/) for GPU-accelerated rendering, [hyparquet](https://github.com/hyparam/hyparquet) for browser-native Parquet file loading, [dicopal](https://github.com/riatelab/dicopal) for color palettes, [3Dmol.js](https://3dmol.org/) for molecular visualization, and the [ESMFold API](https://esmatlas.com/) for protein structure prediction.
