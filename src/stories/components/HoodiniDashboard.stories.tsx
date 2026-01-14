import type { Meta, StoryObj } from '@storybook/react';
import { HoodiniDashboard } from '@/HoodiniDashboard';
import type { HoodiniDashboardRef } from '@/HoodiniDashboard';
import { useRef, useState } from 'react';

/**
 * HoodiniDashboard is the unified, all-in-one component for genomic visualization.
 * 
 * It combines:
 * - Automatic data loading (Parquet/TSV)
 * - Sidebar with all controls
 * - HoodiniViz visualization
 * - DataGrid view
 * - Full theme support
 * - Complete ref API for programmatic control
 * 
 * ## Features
 * 
 * ### Visual Settings
 * - **Y Spacing**: Vertical distance between tracks (default: 150)
 * - **Genome X Scale**: Horizontal compression (default: 30%)
 * - **Gene Height**: Height of gene arrows (default: 60)
 * - **Label Sizes**: Phylo labels (20) and gene labels (12)
 * - **Stroke Width**: Gene/domain edge width
 * 
 * ### Layer Controls
 * - Tree, Genes, Domains, ncRNAs, Regions
 * - Protein Links, Nucleotide Links
 * - Connecting Lines
 * 
 * ### Color Palettes
 * - **Genes**: Bold (qualitative)
 * - **Tree**: Vivid (qualitative)
 * - **Regions**: Margot2 (qualitative)
 * - **ncRNAs**: Prism (qualitative)
 * - **Domains**: Gray (sequential)
 * 
 * ### Format Guides & Export
 * - A4, A3, Letter, PowerPoint presets
 * - SVG export with crop to guides
 * - Scale ruler with crop option
 * 
 * **Recommended for most use cases.**
 */
const meta = {
  title: 'Examples/HoodiniDashboard',
  component: HoodiniDashboard,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: {
        inline: false,
        iframeHeight: 700,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    showSidebar: {
      control: 'boolean',
      description: 'Show/hide the sidebar with controls',
    },
    showToolbar: {
      control: 'boolean',
      description: 'Show/hide the toolbar (export, theme toggle, etc)',
    },
    preferParquet: {
      control: 'boolean',
      description: 'Prefer Parquet files over TSV when loading data',
    },
    disableThemeProvider: {
      control: 'boolean',
      description: 'Disable internal ThemeProvider (use if parent provides one)',
    },
  },
} satisfies Meta<typeof HoodiniDashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default dashboard with all features enabled.
 * Uses embedded data from the library.
 */
export const Default: Story = {
  args: {
    showSidebar: true,
    showToolbar: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: '700px', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Dashboard without sidebar - just the visualization and toolbar.
 */
export const WithoutSidebar: Story = {
  args: {
    showSidebar: false,
    showToolbar: true,
  },
  decorators: [
    (Story) => (
        <Story />

    ),
  ],
};

/**
 * Minimal mode - just the visualization, no UI.
 */
export const MinimalMode: Story = {
  args: {
    showSidebar: false,
    showToolbar: false,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: '600px', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * With initial state configured.
 * Shows how to set initial visualization parameters.
 */
export const WithInitialState: Story = {
  args: {
    showSidebar: true,
    showToolbar: true,
    initialState: {
      ultrametric: true,
      geneColorBy: 'cluster',
      phyloLabelPosition: 'after-tracks',
      showConnectingLines: true,
      genePalette: {
        type: 'qualitative',
        name: 'Bold',
        numColors: 8,
        reverse: false,
        enabled: true,
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: '700px', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Demonstrates using the ref API for programmatic control.
 */
export const WithRefControl: Story = {
  render: () => {
    const dashboardRef = useRef<HoodiniDashboardRef>(null);
    const [status, setStatus] = useState('Ready');
    
    return (
      <div style={{ width: '100%', height: '700px', position: 'relative' }}>
        {/* Control buttons */}
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1000,
          display: 'flex',
          gap: 8,
          background: 'white',
          padding: 8,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          <button
            onClick={() => {
              const state = dashboardRef.current?.getState();
              setStatus(`State: ultrametric=${state?.ultrametric}`);
            }}
            style={{ padding: '4px 8px', cursor: 'pointer' }}
          >
            Get State
          </button>
          <button
            onClick={() => {
              dashboardRef.current?.setState({ ultrametric: true });
              setStatus('Set ultrametric=true');
            }}
            style={{ padding: '4px 8px', cursor: 'pointer' }}
          >
            Ultrametric ON
          </button>
          <button
            onClick={() => {
              dashboardRef.current?.resetAlignment();
              setStatus('Alignment reset');
            }}
            style={{ padding: '4px 8px', cursor: 'pointer' }}
          >
            Reset Alignment
          </button>
          <span style={{ padding: '4px 8px', color: '#666' }}>{status}</span>
        </div>
        
        <HoodiniDashboard
          ref={dashboardRef}
          showSidebar={true}
          showToolbar={true}
          onDataLoaded={(data) => {
            console.log('Data loaded:', {
              genes: data.gffFeatures.length,
              hoods: data.hoods.length,
            });
          }}
          onObjectClick={(obj) => {
            console.log('Object clicked:', obj);
            setStatus(`Clicked: ${obj?.id || obj?.type || 'unknown'}`);
          }}
        />
      </div>
    );
  },
};

/**
 * Controlled mode - parent manages all state.
 */
export const ControlledMode: Story = {
  render: () => {
    const [state, setState] = useState({
      ultrametric: false,
      showConnectingLines: false,
      geneColorBy: 'cluster',
    });
    
    return (
      <div style={{ width: '100%', height: '700px', position: 'relative' }}>
        {/* External controls */}
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1000,
          background: 'white',
          padding: 12,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          <div style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={state.ultrametric}
                onChange={(e) => setState(s => ({ ...s, ultrametric: e.target.checked }))}
              />
              {' '}Ultrametric
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={state.showConnectingLines}
                onChange={(e) => setState(s => ({ ...s, showConnectingLines: e.target.checked }))}
              />
              {' '}Connecting Lines
            </label>
          </div>
          <div>
            <label>Color By: </label>
            <select
              value={state.geneColorBy}
              onChange={(e) => setState(s => ({ ...s, geneColorBy: e.target.value }))}
            >
              <option value="cluster">Cluster</option>
              <option value="species">Species</option>
              <option value="product">Product</option>
            </select>
          </div>
        </div>
        
        <HoodiniDashboard
          showSidebar={false}
          showToolbar={true}
          controlledState={state as any}
          onStateChange={(newState, key) => {
            console.log('State changed:', key, newState[key as keyof typeof newState]);
            setState(s => ({ ...s, [key]: newState[key as keyof typeof newState] }));
          }}
        />
      </div>
    );
  },
};
