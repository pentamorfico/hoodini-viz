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
