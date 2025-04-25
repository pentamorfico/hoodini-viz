# Hoodini-Viz Overview

## Recent Changes (April 2025)
- **Protein Link Bands:** Improved construction so bands always connect the true leftmost and rightmost coordinates of each gene, regardless of strand or orientation.
- **Consistent Polygon Ordering:** Band polygons are now always ordered clockwise, preventing self-crossing and ensuring robust, visually correct links.
- **Curved Bands:** Bands between genes use smooth, inward-bending Bezier curves for a more visually appealing “Sankey” style, with control points dynamically calculated based on gene positions.
- **Debugging Improvements:** Added detailed logging to the link construction logic to help diagnose and resolve issues with band geometry or ordering.
- **Robust Polygon Logic:** Polygon construction for links is now robust to all gene arrangements, including flipped, reversed, or overlapping genes.
- **Gene Arrow Direction:** Fixed so that gene arrows always point outward according to strand, regardless of flipping or start/end order.
- **Flipping Anchor:** Flipping is now always performed around the current baseline center, not the original, for more intuitive behavior.
- **Shift Direction:** Shift direction is reversed when flipped, so "+1kb" always moves right visually.
- **Idempotent Alignment:** Alignment functions (cluster, start, end, center) set offsets directly, so repeated clicks do not cause drift.
- **Cluster Alignment:** Genes in a cluster are flipped to positive strand and aligned by their leftmost coordinate.
- **Tree Offset:** Tree is always repositioned to the left of the minimum baseline after any genome movement.
- **UI Buttons:** Added buttons for all alignment operations and ensured they are always visible and clickable.

## Project Purpose
Hoodini-Viz is an interactive genome and phylogenetic tree visualization tool. It allows users to explore gene clusters, protein/nucleotide links, and perform advanced manipulations such as flipping, shifting, and aligning genome tracks in the context of a phylogenetic tree.

## Core Concepts
- **Genome Tracks:** Each genome (track) is visualized horizontally, with genes, domains, and a baseline.
- **Phylogenetic Tree:** Shown to the left, with leaves corresponding to genome tracks.
- **Genes and Clusters:** Genes are colored by protein cluster. Clusters can be aligned across genomes.
- **Links:** Protein and nucleotide links are visualized as polygons connecting features across tracks.

## Main Components
- `src/components/PhyloTreeViewer.jsx`: Main React component, handles UI, rendering, and user interaction.
- `src/models/GenomeView.js`: Core logic for track manipulation (flip, shift, align, etc).
- `src/models/Gene.js`, `GFFFeature.js`, `Domain.js`, etc.: Data models for features.
- `src/utils/`: Parsers for GFF, links, domains, clusters.

## Key Features and Logic
### Flipping and Shifting
- **Flipping:** Each track can be flipped horizontally. Flipping is always performed around a configurable anchor (usually the current baseline center).
- **Shifting:** Tracks can be shifted left/right by a fixed offset. The shift direction is reversed if the track is flipped, so "+1kb" always moves right visually.
- **Anchor Logic:** The anchor for flipping is always recomputed based on the current (shifted) baseline center, not the original. This allows for dynamic, context-aware flipping.

### Alignment
- **Align to Cluster:** All genes in a given cluster can be aligned so their leftmost coordinate (after flipping to positive strand) is the same. This is idempotent and robust to repeated clicks.
- **Align All to Start/End/Center:** Buttons allow all tracks to be reset so their baseline start, end, or center is at coordinate 0 and on the original strand.
- **Idempotency:** Alignment functions set offsets directly, not incrementally, so repeated actions do not accumulate error.

### Tree Offset and Layout
- The tree is always positioned to the left of the genome tracks, with a fixed gap, based on the minimum baseline coordinate after any shift/alignment. This prevents overlap and keeps the view clean.

### Polygon Construction
- **Gene Arrows:** The gene polygon is always constructed so the arrow points in the correct direction, regardless of start/end order or strand. If start > end, the coordinates are swapped for polygon construction.
- **Domains and Links:** Domains and links are updated after every transformation to ensure correct placement.

## Major Changes and Fixes (from this session)
1. **Gene Arrow Direction:** Fixed so that the arrow always points outward according to strand, regardless of flipping or start/end order.
2. **Flipping Anchor:** Flipping is now always performed around the current baseline center, not the original, for more intuitive behavior.
3. **Shift Direction:** Shift direction is reversed when flipped, so "+1kb" always moves right visually.
4. **Idempotent Alignment:** Alignment functions (cluster, start, end, center) set offsets directly, so repeated clicks do not cause drift.
5. **Cluster Alignment:** Genes in a cluster are flipped to positive strand and aligned by their leftmost coordinate.
6. **Tree Offset:** Tree is always repositioned to the left of the minimum baseline after any genome movement.
7. **UI Buttons:** Added buttons for all alignment operations and ensured they are always visible and clickable.

## Data Flow and State Management
- **Initialization:** On mount, the app parses Newick, GFF, domain, link, and cluster files, and builds the tree and genome models.
- **State:** React state is used for the tree, genomeView, selected node, and view state (zoom/pan/offsets).
- **Reactivity:** All manipulations (flip, shift, align) update the GenomeView model and then force a re-render by cloning the model in state.
- **DeckGL Rendering:** All features (genes, domains, links, baselines, tree) are rendered as DeckGL layers, with update triggers for efficient reactivity.

## Data Model Details
- **Gene Model:** Each gene stores original and current (transformed) start/end, strand, attributes, and polygon for rendering. Domains are attached to genes.
- **GenomeView:** Central orchestrator for all tracks, genes, domains, links, and their transformations. Handles all flip/shift/align logic and keeps track of per-track offsets and flip states.
- **Baselines:** Each track has a baseline (start/end) used for alignment and as the anchor for flipping.
- **Links:** Protein and nucleotide links are stored as objects with references to gene/nucleotide features and are updated after every transformation.

## UI/UX Features
- **Floating Control Panel:** All flip, shift, and align controls are in a floating panel, always visible and clickable.
- **Idempotent Controls:** All alignment and reset operations are idempotent—repeated clicks do not cause drift or error.
- **Dynamic Tree Offset:** The tree is always repositioned to avoid overlap with genome tracks, even after complex manipulations.
- **Tooltips:** Hovering over genes, domains, or links shows detailed metadata in a tooltip.
- **Zoom/Pan:** The view automatically fits to bounds after any operation, and users can zoom/pan interactively.

## Advanced Alignment and Transformation Logic
- **Cluster Alignment:** Flips all cluster genes to positive strand, then aligns their leftmost coordinate. Uses transformed coordinates for robust alignment.
- **Align to Start/End/Center:** For each track, flips to original strand and sets offset so baseline start/end/center is at 0. Useful for resetting or standardizing the view.
- **Custom Anchors:** The system is designed to allow future alignment or flipping around arbitrary anchors (e.g., gene start, domain center).
- **Dynamic Anchor Recalculation:** The anchor for flipping is always recalculated after every shift, so flipping is always visually intuitive.

## Custom Vertical Scrollbar (DeckGL Y-Pan)
- **Purpose:** Allows users to pan the visualization vertically by dragging a custom scrollbar overlay on the right side of the viewer.
- **Implementation:**
  - A pure CSS/HTML vertical bar and thumb are rendered absolutely on the right, above the DeckGL canvas.
  - The thumb's position is normalized (0–100) and mapped to the [minY, maxY] data range, so it travels the full height of the bar.
  - Dragging the thumb or clicking on the bar updates the DeckGL viewState's Y target, panning the view up or down.
  - The thumb's position is recalculated and synced with the current viewState, so it always reflects the current vertical pan.
  - No React component libraries are used—just divs, inline styles, and mouse events for a lightweight, customizable experience.
- **User Experience:**
  - The scrollbar is always visible, takes up nearly the full height of the viewer, and provides intuitive, fine-grained vertical navigation.
  - Clicking on the bar moves the thumb to that position; dragging the thumb pans smoothly.

## Extensibility
- **Adding New Feature Types:** To add new feature types (e.g., regulatory elements), create a new model, update GenomeView, and add a DeckGL layer in PhyloTreeViewer.jsx.
- **Custom Alignment:** To add new alignment strategies, implement a method in GenomeView and add a button in the control panel.
- **Custom Coloring:** Cluster and feature coloring is handled in GenomeView; you can easily extend this for new color schemes or feature types.
- **Data Import:** Parsers in `src/utils/` can be extended to support new file formats or metadata.

## Troubleshooting and Debugging
- **Polygon Issues:** If gene/domain polygons look wrong, check the GFFFeature and Domain polygon logic, especially start/end and strand handling.
- **Alignment Drift:** If repeated alignment causes drift, ensure offsets are set directly (not incrementally) and that all transformations use original coordinates.
- **Tree Overlap:** If the tree overlaps genome tracks, check the computeBounds logic and ensure treeOffset is based on the minimum baseline coordinate.
- **Performance:** For large datasets, consider optimizing DeckGL layer update triggers and using memoization for derived data.

## Example Use Cases
- **Comparative Genomics:** Instantly align orthologous genes across multiple genomes to study synteny and rearrangements.
- **Cluster Analysis:** Visualize and align all genes in a protein cluster to compare their genomic context.
- **Interactive Exploration:** Flip, shift, and align tracks to explore structural variation and gene order evolution.
- **Publication-Ready Figures:** Export high-quality, interactive visualizations for presentations or publications.

## Future Directions
- **Export/Import State:** Add the ability to save and load the current view state for reproducibility.
- **Custom Anchors:** Allow users to select any feature as an anchor for flipping or alignment.
- **Multi-Cluster Alignment:** Support aligning multiple clusters simultaneously or by user selection.
- **Annotations:** Add support for user annotations, comments, or highlights on tracks or features.
- **API Integration:** Integrate with external databases or APIs for real-time data fetching and annotation.

## Developer Notes
- **Best Practices:** All transformations are stateless with respect to the original data; only offsets and flip states are mutated.
- **Testing:** Add unit tests for all transformation and alignment methods in GenomeView for robust future development.
- **Collaboration:** This README is designed to be a living document—update it with every major change or new feature!

## How to Extend or Debug
- **To add new alignment types:** Add a method to GenomeView and a button in PhyloTreeViewer.jsx.
- **To debug polygon placement:** Add console logs in GFFFeature.js and check the start/end logic.
- **To change anchor logic:** Update the anchor calculation in GenomeView.js.
- **To add new feature types:** Extend the models and update the rendering logic in PhyloTreeViewer.jsx.

## Usage Tips
- Use the control panel to flip, shift, and align tracks.
- After any operation, the tree and tracks will automatically reposition to avoid overlap.
- All alignment operations are idempotent—repeated clicks are safe.

## Retaking the Conversation
If you need to resume work or debugging:
- Review this README for the current logic and design decisions.
- All major changes and their rationale are documented here.
- If you want to change alignment, flipping, or shifting logic, start in GenomeView.js and PhyloTreeViewer.jsx.

---
_Last updated: April 24, 2025_
