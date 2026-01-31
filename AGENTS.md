# AGENTS.md

Guidelines for AI coding assistants working on this codebase.

## Project Overview

Hoodini-viz is a React + TypeScript visualization library for comparative genomics. It renders phylogenetic trees alongside gene neighborhood tracks using deck.gl (WebGL).

## Key Entry Points

- `src/index.ts` - Library exports
- `src/HoodiniDashboard.tsx` - Full dashboard with sidebar, data loading, state management
- `src/components/HoodiniViz.tsx` - Core visualization component (deck.gl layers)

## Architecture

```
HoodiniDashboard
├── AppSidebar (settings UI)
├── HoodiniViz (visualization)
│   ├── deck.gl layers (tree, genes, links, domains)
│   └── Widgets (ruler, scrollbar, scale)
└── DataGridView (data browser)
```

## Data Models

Located in `src/models/`:
- `PhyloTree.ts` - Newick parser, tree structure
- `Gene.ts` - Gene features with coordinates
- `Domain.ts` - Protein domains
- `Hood.ts` - Genomic windows/tracks

## State Management

HoodiniDashboard uses a single `state` object with ~50 properties. Updates go through `updateState(key, value)`. The state flows down to HoodiniViz as props.

## Common Tasks

### Adding a new visualization option
1. Add prop to `HoodiniViz.tsx` interface
2. Add state field in `HoodiniDashboard.tsx`
3. Add UI control in `AppSidebar.tsx`
4. Wire up the prop in the deck.gl layer

### Adding a new deck.gl layer
1. Create layer in `HoodiniViz.tsx` inside `useMemo` for `layers`
2. Add visibility toggle prop (`showXxxLayer`)
3. Add to layer array conditionally

### Modifying sidebar panels
- UI components in `src/components/ui/` (shadcn/ui)
- Panels defined in `AppSidebar.tsx` using Collapsible

## File Conventions

- Components: PascalCase (`HoodiniViz.tsx`)
- Utilities: camelCase (`parseGFF.ts`)
- Models: PascalCase class files (`Gene.ts`)

## Testing Changes

```bash
npm run dev      # Dev server at localhost:5173
npm run build    # Build library
```

## Dependencies to Know

- `deck.gl` - WebGL rendering framework
- `hyparquet` - Parquet file reading in browser
- `shadcn/ui` - UI component library (Radix + Tailwind)
- `3dmol` - Protein structure viewer

## Gotchas

- BigInt from Parquet files must be converted to Number before use
- deck.gl layers are memoized - ensure dependency arrays are correct
- Tailwind v4 uses CSS variables, not `tailwind.config.js`
