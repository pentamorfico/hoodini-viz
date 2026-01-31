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

> [!TIP]
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
<script src="https://unpkg.com/hoodini-viz"></script>
<link href="https://unpkg.com/hoodini-viz/dist/hoodini-viz.css" rel="stylesheet">
```

> [!IMPORTANT]
> The CSS uses [CSS Cascade Layers](https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Cascade_layers). Avoid adding global reset styles like `* { padding: 0 }` without wrapping them in a layer, as unlayered styles override layered ones.

</td>
</tr>
</table>

---

## 🚀 Usage

<details open>
<summary><strong>Full Dashboard</strong> — includes sidebar, data loading, controls</summary>

<br/>

```tsx
import { HoodiniDashboard } from 'hoodini-viz';
import 'hoodini-viz/style.css';

function App() {
  return (
    <HoodiniDashboard
      dataPaths={{
        gffParquet: '/data/genes.parquet',
        hoodsParquet: '/data/hoods.parquet',
        newick: '/data/tree.nwk',
        proteinLinksParquet: '/data/links.parquet',
      }}
    />
  );
}
```

</details>

<details>
<summary><strong>Core Component</strong> — bring your own UI and data loading</summary>

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

---

## 📁 Data Formats

> [!NOTE]
> Parquet files load **3-10x faster** than TSV. Convert with `python scripts/convert_to_parquet.py`

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
