// Main entry point for hoodini-viz library
// Export both the full dashboard and the core visualization component

// Import styles (will be extracted to hoodini-viz.css)
import './index.css';

// Re-export React and ReactDOM for standalone UMD usage
import React from 'react';
import ReactDOM from 'react-dom/client';
export { React, ReactDOM };

// NEW: Unified dashboard component (recommended)
export { HoodiniDashboard, default as HoodiniDashboardDefault } from './HoodiniDashboard';
export type {
  HoodiniDashboardProps,
  HoodiniDashboardRef,
  DataPaths,
  ParsedData,
  InitialState,
  PaletteConfig as DashboardPaletteConfig,
  ProteinLinkConfig,
  NucleotideLinkConfig,
  RGBAColor,
} from './HoodiniDashboard';

import { HoodiniDashboard } from './HoodiniDashboard';
import type { HoodiniDashboardProps } from './HoodiniDashboard';
import HoodiniViz from './components/HoodiniViz';
import type { HoodiniVizProps } from './components/HoodiniViz';

/**
 * Factory function for standalone/CDN usage - Full Dashboard.
 * Creates a HoodiniDashboard instance without requiring React knowledge.
 * Includes data loading, sidebar UI, and all controls.
 * 
 * @example
 * ```html
 * <script src="https://unpkg.com/hoodini-viz/dist/hoodini-viz.umd.js"></script>
 * <script>
 *   Hoodini.createDashboard({
 *     container: 'root',
 *     dataPaths: {
 *       newick: 'path/to/tree.nwk',
 *       gffParquet: 'path/to/gff.parquet',
 *     }
 *   });
 * </script>
 * ```
 */
export interface CreateDashboardOptions extends Omit<HoodiniDashboardProps, 'ref'> {
  /** Container element ID or HTMLElement */
  container: string | HTMLElement;
}

/**
 * Factory function for standalone/CDN usage - Visualization only.
 * Creates a HoodiniViz instance for users who want full control.
 * No sidebar, no data loading - you provide pre-processed data.
 * 
 * @example
 * ```html
 * <script src="https://unpkg.com/hoodini-viz/dist/hoodini-viz.umd.js"></script>
 * <script>
 *   Hoodini.createViz({
 *     container: 'root',
 *     newickStr: '((A:0.1,B:0.2):0.3,C:0.4);',
 *     gffFeatures: [...],
 *     hoods: [...],
 *   });
 * </script>
 * ```
 */
export interface CreateVizOptions extends Omit<HoodiniVizProps, 'ref'> {
  /** Container element ID or HTMLElement */
  container: string | HTMLElement;
}

export interface HoodiniInstance {
  /** Unmount the component and clean up */
  destroy: () => void;
  /** The React root instance (for advanced usage) */
  root: ReactDOM.Root;
}

/**
 * Create a full HoodiniDashboard with data loading, sidebar, and all controls.
 * Best for most users who want a complete visualization experience.
 */
export function createDashboard(options: CreateDashboardOptions): HoodiniInstance {
  const { container, ...props } = options;
  
  const element = typeof container === 'string' 
    ? document.getElementById(container) 
    : container;
  
  if (!element) {
    throw new Error(`Hoodini: Container "${container}" not found`);
  }
  
  const root = ReactDOM.createRoot(element);
  root.render(React.createElement(HoodiniDashboard, props));
  
  return {
    destroy: () => root.unmount(),
    root
  };
}

/**
 * Create a HoodiniViz visualization only (no sidebar, no data loading).
 * For advanced users who want full control over data and UI.
 */
export function createViz(options: CreateVizOptions): HoodiniInstance {
  const { container, ...props } = options;
  
  const element = typeof container === 'string' 
    ? document.getElementById(container) 
    : container;
  
  if (!element) {
    throw new Error(`Hoodini: Container "${container}" not found`);
  }
  
  const root = ReactDOM.createRoot(element);
  root.render(React.createElement(HoodiniViz, props));
  
  return {
    destroy: () => root.unmount(),
    root
  };
}

// Legacy alias for backwards compatibility
export const create = createDashboard;

// Core visualization component (props-driven, no data loading)
export { default as HoodiniViz } from './components/HoodiniViz';
export type {
  HoodiniVizProps,
  ColorMap,
  GFFFeatureData,
  HoodData,
  ProteinLinkData,
  NucleotideLinkData,
  StyleConfig,
  RGBAColor as VizRGBAColor,
  PaletteConfig as VizPaletteConfig,
  ProteinLinkConfig as VizProteinLinkConfig,
  NucleotideLinkConfig as VizNucleotideLinkConfig,
} from './components/HoodiniViz';

// Export types and models for external use
export { default as PhyloTree } from './models/PhyloTree';
export { default as GenomeView } from './models/GenomeView';
export { default as Gene } from './models/Gene';
export { default as Domain } from './models/Domain';
export { default as PhyloNode } from './models/PhyloNode';

// Export config and utilities
export { DEFAULT_CONFIG } from './config/visualizationConfig';
export { getPaletteColors, getQualitativePalettes, getSequentialPalettes } from './utils/colorPalettes';

// Export types for configuration
export type { VisualizationConfig } from './config/visualizationConfig';

// Export guide overlay types
export type { FormatPreset } from './components/GuideOverlay';
export { FORMAT_PRESETS } from './components/GuideOverlay';
