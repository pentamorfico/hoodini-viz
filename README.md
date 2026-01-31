<div align="center">

<img src="src/assets/hoodini-viz_logo_github.svg" alt="Hoodini Logo" width="450"/>

### GPU-powered visualization for comparative genomics

[![npm version](https://img.shields.io/npm/v/hoodini-viz?color=blue&label=npm)](https://www.npmjs.com/package/hoodini-viz)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev/)

[**🎮 Live Demo**](https://storage.hoodini.bio/hoodini-demo.html) · [**📦 npm**](https://www.npmjs.com/package/hoodini-viz) · [**📖 Docs**](#usage)

</div>

---

## 🧬 What is this?

**Hoodini-viz** is a React library for interactive visualization of comparative genomics data at scale. 

It displays **phylogenetic trees** alongside **aligned gene neighborhood tracks**, connecting homologous proteins across genomes with curved Bézier links colored by cluster or identity. Syntenic regions are highlighted with nucleotide-level alignments rendered as translucent polygons between tracks.

Each gene is drawn as a directional arrow showing strand orientation, with **protein domains** overlaid as colored boxes. Click any gene to view its metadata, predict its **3D protein structure** on-demand, or explore **ncRNA secondary structures** with an embedded interactive viewer.

A **virtualized data table** lets you browse and filter millions of genes, domains, and links. All visual parameters (colors, dimensions, opacities, scales) are adjustable in real-time through the sidebar controls.

<br/>

<div align="center">

| 🚀 **Scales** | ⚡ **Interactive** | 🎨 **Customizable** | 🔬 **Structures** | 📄 **Export** |
|:---:|:---:|:---:|:---:|:---:|
| 100k+ genes | Zoom, pan, click | 50+ palettes | ESMFold/Boltz2 | SVG ready |

</div>

<br/>

<div align="center">
  <img src="src/assets/hoodini-viz-export - 2026-01-14T051133.869.svg" alt="Example visualization" width="85%"/>
</div>

<br/>

> 💡 **Tip**
>
> **Looking to visualize your own genomes?** Use [**Hoodini**](https://github.com/pentamorfico/hoodini) — the comparative genomics toolkit that fetches assemblies from NCBI, extracts gene neighborhoods, runs protein/nucleotide comparisons, annotates defense systems, builds trees, and generates ready-to-use visualizations. This library is the visualization engine that powers Hoodini's output.

---

## 📦 Install

<table>
<tr>
<td width="50%">

**npm / yarn / pnpm**

```bash
npm install hoodini-viz
```

</td>
<td width="50%">

**CDN**

```html
<link href="https://unpkg.com/hoodini-viz/dist/hoodini-viz.css" rel="stylesheet">
<script src="https://unpkg.com/hoodini-viz/dist/hoodini-viz.umd.js"></script>
```


</td>

</tr>
</table>


---

## 🚀 Usage

### NPM / React

<details open>
<summary><strong>Full Dashboard</strong> — includes sidebar, data loading, controls</summary>

<br/>

```tsx
import { HoodiniDashboard } from 'hoodini-viz';
import 'hoodini-viz/style.css';

// With Parquet (recommended - 3-10x faster)
<HoodiniDashboard
  dataPaths={{
    newick: '/data/tree.nwk',
    gffParquet: '/data/genes.parquet',
    hoodsParquet: '/data/hoods.parquet',
    proteinLinksParquet: '/data/links.parquet',
  }}
/>
```

```tsx
// With TSV
<HoodiniDashboard
  dataPaths={{
    newick: '/data/tree.nwk',
    gff: '/data/genes.tsv',
    hoods: '/data/hoods.tsv',
    proteinLinks: '/data/links.tsv',
  }}
/>
```

</details>

<details>
<summary><strong>Core Visualization</strong> — bring your own UI and data loading</summary>

<br/>

```tsx
import { HoodiniViz } from 'hoodini-viz';

<HoodiniViz
  newickStr={newick}
  gffFeatures={genes}
  proteinLinks={links}
  domainsByGene={domains}
  hoods={hoods}
  showTreeLayer={true}
  showGeneLayer={true}
  showProteinLinkLayer={true}
/>
```

</details>

### CDN / Standalone

<details open>
<summary><strong>Full Dashboard (recommended)</strong> — zero dependencies, just HTML</summary>

<br/>

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/hoodini-viz/dist/hoodini-viz.css">
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/hoodini-viz/dist/hoodini-viz.umd.js"></script>
  <script>
    // With Parquet (recommended - 3-10x faster)
    HoodiniViz.createDashboard({
      container: 'root',
      dataPaths: {
        newick: 'https://example.com/tree.nwk',
        gffParquet: 'https://example.com/genes.parquet',
        hoodsParquet: 'https://example.com/hoods.parquet',
      }
    });
  </script>
</body>
</html>
```

```html
<script>
  // With TSV
  HoodiniViz.createDashboard({
    container: 'root',
    dataPaths: {
      newick: 'https://example.com/tree.nwk',
      gff: 'https://example.com/genes.tsv',
      hoods: 'https://example.com/hoods.tsv',
    }
  });
</script>
```

</details>

<details>
<summary><strong>Core Visualization</strong> — for advanced users who want full control</summary>

<br/>

```html
<script>
  // No sidebar, no data loading - you provide pre-processed data
  HoodiniViz.createViz({
    container: 'root',
    newickStr: '((A:0.1,B:0.2):0.3,C:0.4);',
    gffFeatures: [...],
    hoods: [...],
    proteinLinks: [...],
  });
</script>
```

</details>

<details>
<summary><strong>Manual React usage</strong> — when you need the React primitives</summary>

<br/>

```html
<script>
  const { HoodiniDashboard, React, ReactDOM } = HoodiniViz;
  
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(HoodiniDashboard, { 
    dataPaths: { newick: '...', gffParquet: '...' }
  }));
</script>
```

</details>

---

## 📁 Data Formats

> ℹ️ **Note**
>
> Parquet files load **3-10x faster** than TSV.

| File | Format | Description |
|:-----|:------:|:------------|
| `genes` | `.parquet` `.tsv` | GFF3-style gene annotations |
| `hoods` | `.parquet` `.tsv` | Genomic windows to display |
| `tree` | `.nwk` | Newick phylogenetic tree |
| `links` | `.parquet` `.tsv` | Protein homology relationships |
| `domains` | `.parquet` `.tsv` | Protein domain annotations *(optional)* |

<details>
<summary>📋 <strong>View detailed format specifications</strong></summary>

<br/>

**genes** — Standard GFF3 with `ID`, `Name`, `product` in attributes  
**hoods** — Columns: `hood_id`, `seqid`, `start`, `end`, `align_gene` (optional)  
**links** — Columns: `gene1`, `gene2`, `identity`  
**domains** — Columns: `gene_id`, `domain_name`, `start`, `end`, `source`

</details>

---

## ✨ Features

<table>
<tr>
<td width="33%" valign="top">

### 🎯 Visualization
- WebGL/GPU rendering
- Phylogenetic tree display
- Gene neighborhood tracks
- Protein & nucleotide links
- Domain annotations
- ncRNA secondary structures

</td>
<td width="33%" valign="top">

### 🎛️ Interaction
- Smooth zoom & pan
- Click to select genes
- Flip track orientation
- Shift genomic windows
- Align by gene cluster
- Hover tooltips

</td>
<td width="33%" valign="top">

### 🔧 Tools
- Virtualized data table
- 50+ color palettes
- Structure prediction
- Real-time customization
- SVG/PNG export

</td>
</tr>
</table>

<details>
<summary>🔍 <strong>Feature details</strong></summary>

<br/>

| Feature | Description |
|:--------|:------------|
| **Protein links** | Curved Bézier connections showing homology between proteins across tracks |
| **Nucleotide links** | Polygonal overlays displaying synteny blocks between genomic regions |
| **ncRNA structures** | Interactive 2D secondary structure viewer for non-coding RNAs (NAView layout) |
| **Data table** | Virtualized grid browser for genes, domains, links, and metadata — handles millions of rows |
| **3D structures** | On-demand protein structure prediction via ESMFold (≤400aa) or Boltz2 |

</details>

---

## 🛠️ Development

```bash
npm run dev          # 🔥 Dev server at localhost:5173
npm run build        # 📦 Build library
npm run build:html   # 📄 Self-contained HTML
```

---

## 📜 License

[MIT](LICENSE) © 2026

---

<div align="center">

**[⬆ Back to top](#)**

Made with 🦉 by [pentamorfico](https://github.com/pentamorfico)

</div>
