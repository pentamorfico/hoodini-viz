// UnifiedPaletteWidget.jsx
// A unified palette widget that replaces multiple individual palette widgets
// Features: layer selection, precomputed previews, data filtering

import React, { useState, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  getQualitativePalettes,
  getSequentialPalettes,
  getDivergingPalettes,
  getPaletteColorCounts,
  getPaletteColors
} from '../utils/colorPalettes';

// Precompute palette previews ONCE at module load time (not on each mount)
let globalPaletteCache = null;

const computeGlobalPaletteCache = () => {
  if (globalPaletteCache) return globalPaletteCache;
  
  const cache = {};
  const paletteTypes = ['qualitative', 'sequential', 'diverging'];
  
  paletteTypes.forEach(type => {
    let palettes = [];
    switch (type) {
      case 'sequential':
        palettes = getSequentialPalettes();
        break;
      case 'diverging':
        palettes = getDivergingPalettes();
        break;
      default:
        palettes = getQualitativePalettes();
    }

    const uniqueNames = [...new Set(palettes.map(p => p.name))];
    uniqueNames.forEach(name => {
      try {
        const bestMatch = palettes
          .filter(p => p.name === name)
          .reduce((best, current) => current.number > best.number ? current : best);
        const colors = getPaletteColors(name, bestMatch.number, false);
        cache[`${type}-${name}`] = colors.slice(0, 4); // Only store first 4 colors for preview
      } catch (error) {
        // Silently ignore preview computation errors
      }
    });
  });

  globalPaletteCache = cache;
  return cache;
};

// Recommended palettes by type
const RECOMMENDED_PALETTES = {
  qualitative: [
    { name: 'Set1', description: 'Bright, distinct colors for categories' },
    { name: 'Dark2', description: 'Darker variant for better readability' }
  ],
  sequential: [
    { name: 'viridis', description: 'Perceptually uniform, colorblind-friendly' },
    { name: 'plasma', description: 'High contrast, good for highlighting' }
  ],
  diverging: [
    { name: 'RdBu', description: 'Red-Blue diverging for comparisons' },
    { name: 'RdYlBu', description: 'Red-Yellow-Blue for complex data' }
  ]
};

// Layer definitions with their data dependencies
const LAYER_DEFINITIONS = {
  genes: { title: 'Gene Colors', dataKey: 'parsedGFF' },
  domains: { title: 'Domain Colors', dataKey: 'parsedDomains' },
  phylo: { title: 'Tree Colors', dataKey: 'phyloData' },
  ncRNA: { title: 'ncRNA Colors', dataKey: 'ncRNAFeatures' },
  regions: { title: 'Region Colors', dataKey: 'regionFeatures' }
};

const UnifiedPaletteWidget = ({
  // Palette configurations for each layer
  genePalette,
  setGenePalette,
  phyloPalette,
  setPhyloPalette,
  domainPalette,
  setDomainPalette,
  ncRNAPalette,
  setNcRNAPalette,
  regionPalette,
  setRegionPalette,
  // Data availability (for filtering)
  availableData = {}
}) => {
  const [selectedLayer, setSelectedLayer] = useState('genes');
  
  // Use global cache instead of computing on each mount
  const paletteCache = useMemo(() => computeGlobalPaletteCache(), []);
  
  // Theme context
  const { resolvedTheme, getThemeColors } = useTheme();
  const themeColors = useMemo(() => getThemeColors(resolvedTheme), [resolvedTheme]);

  // Get available layers based on data
  const availableLayers = useMemo(() => {
    return Object.entries(LAYER_DEFINITIONS).filter(([key, def]) => {
      const dataKey = def.dataKey;
      const data = availableData[dataKey];
      // Consider layer available if data exists and is not empty
      return data && (
        (Array.isArray(data) && data.length > 0) ||
        (typeof data === 'object' && Object.keys(data).length > 0)
      );
    });
  }, [availableData]);

  // Get current palette configuration based on selected layer
  const getCurrentPalette = () => {
    switch (selectedLayer) {
      case 'genes': return genePalette;
      case 'domains': return domainPalette;
      case 'phylo': return phyloPalette;
      case 'ncRNA': return ncRNAPalette;
      case 'regions': return regionPalette;
      default: return { enabled: false };
    }
  };

  // Get current palette setter based on selected layer
  const getCurrentSetter = () => {
    switch (selectedLayer) {
      case 'genes': return setGenePalette;
      case 'domains': return setDomainPalette;
      case 'phylo': return setPhyloPalette;
      case 'ncRNA': return setNcRNAPalette;
      case 'regions': return setRegionPalette;
      default: return () => {};
    }
  };

  const currentPalette = getCurrentPalette();
  const currentSetter = getCurrentSetter();

  // Get available palettes for current type
  const getAvailablePalettes = (type) => {
    switch (type) {
      case 'sequential':
        return getSequentialPalettes();
      case 'diverging':
        return getDivergingPalettes();
      default:
        return getQualitativePalettes();
    }
  };

  const handleConfigChange = (updates) => {
    if (updates === null) {
      currentSetter(null);
    } else {
      currentSetter({
        ...currentPalette,
        ...updates
      });
    }
  };

  const renderPalettePreview = (type, name) => {
    const cacheKey = `${type}-${name}`;
    const colors = paletteCache[cacheKey] || [];
    
    if (colors.length === 0) return null;

    return (
      <div className="flex h-3 w-8 border border-border rounded overflow-hidden">
        {colors.map((color, idx) => (
          <div
            key={idx}
            className="flex-1"
            style={{
              backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`,
            }}
          />
        ))}
      </div>
    );
  };

  const availablePalettes = currentPalette?.type ? getAvailablePalettes(currentPalette.type) : [];
  const uniquePaletteNames = availablePalettes.length > 0 ? [...new Set(availablePalettes.map(p => p.name))].sort() : [];
  const colorCounts = currentPalette?.name ? getPaletteColorCounts(currentPalette.name) : [];

  // Don't render if no layers are available
  if (availableLayers.length === 0) {
    return null;
  }

  return (
    <Card className="mb-2">

      <CardContent className="space-y-3">
        {/* Layer Selection */}
        <div className="space-y-1">
          <Label className="text-xs">Layer:</Label>
          <Select value={selectedLayer} onValueChange={setSelectedLayer}>
            <SelectTrigger className="w-full text-xs" style={{ height: '20px', minHeight: '20px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableLayers.map(([key, def]) => (
                <SelectItem key={key} value={key}>
                  {def.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="enable-palette" className="text-xs">Enable color palette</Label>
          <Switch
            id="enable-palette"
            checked={!!currentPalette?.enabled}
            onCheckedChange={(checked) => handleConfigChange({ enabled: checked })}
          />
        </div>

        {currentPalette?.enabled && (
          <>
            {/* Palette Type */}
            <div className="space-y-1">
              <Label className="text-xs">Palette Type:</Label>
              <Select
                value={currentPalette?.type || ''}
                onValueChange={(value) => handleConfigChange({ type: value })}
              >
                <SelectTrigger className="w-full text-xs" style={{ height: '20px', minHeight: '20px' }}>
                  <SelectValue placeholder="Select a type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qualitative">Qualitative (Categorical)</SelectItem>
                  <SelectItem value="sequential">Sequential (Continuous)</SelectItem>
                  <SelectItem value="diverging">Diverging (Comparative)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Palette Name with inline preview */}
            <div className="space-y-1">
              <Label className="text-xs">Palette Name:</Label>
              <Select
                value={currentPalette?.name || ''}
                onValueChange={(value) => handleConfigChange({ name: value })}
              >
                <SelectTrigger className="w-full text-xs" style={{ height: '20px', minHeight: '20px' }}>
                  <SelectValue placeholder="Select a palette..." />
                </SelectTrigger>
                <SelectContent>
                  {/* Recommended palettes first */}
                  {RECOMMENDED_PALETTES[currentPalette?.type] && 
                    RECOMMENDED_PALETTES[currentPalette.type]
                      .filter(rec => uniquePaletteNames.includes(rec.name))
                      .map((rec) => (
                        <SelectItem key={`rec-${rec.name}`} value={rec.name}>
                          <div className="flex items-center gap-2">
                            {renderPalettePreview(currentPalette.type, rec.name)}
                            <span>{rec.name} (recommended)</span>
                          </div>
                        </SelectItem>
                      ))
                  }
                  
                  {/* Separator if there are recommended palettes */}
                  {RECOMMENDED_PALETTES[currentPalette?.type] && 
                    RECOMMENDED_PALETTES[currentPalette.type].some(rec => uniquePaletteNames.includes(rec.name)) && (
                    <SelectSeparator />
                  )}
                  
                  {/* All other palettes */}
                  {uniquePaletteNames
                    .filter(name => 
                      !RECOMMENDED_PALETTES[currentPalette?.type] || 
                      !RECOMMENDED_PALETTES[currentPalette.type].some(rec => rec.name === name)
                    )
                    .map(name => (
                      <SelectItem key={name} value={name}>
                        <div className="flex items-center gap-2">
                          {renderPalettePreview(currentPalette.type, name)}
                          <span>{name}</span>
                        </div>
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            {/* Number of Colors */}
            {colorCounts.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Number of Colors:</Label>
                <Select
                  value={currentPalette?.numColors?.toString() || ''}
                  onValueChange={(value) => handleConfigChange({ numColors: parseInt(value) })}
                >
                  <SelectTrigger className="w-full text-xs" style={{ height: '20px', minHeight: '20px' }}>
                    <SelectValue placeholder="Select a number..." />
                  </SelectTrigger>
                  <SelectContent>
                    {colorCounts.map(count => (
                      <SelectItem key={count} value={count.toString()}>{count}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Desaturate by Prevalence Toggle - only for genes layer */}
            {selectedLayer === 'genes' && (
              <div className="flex items-center justify-between">
                <Label htmlFor="desaturate-prevalence" className="text-xs">Desaturate by prevalence</Label>
                <Switch
                  id="desaturate-prevalence"
                  checked={!!currentPalette?.desaturateByPrevalence}
                  onCheckedChange={(checked) => handleConfigChange({ desaturateByPrevalence: checked })}
                />
              </div>
            )}

            {/* Prevalence Filter Slider - only for genes layer */}
            {selectedLayer === 'genes' && (
              <div className="space-y-1">
                <Label htmlFor="prevalence-filter" className="text-xs">
                  Prevalence filter: {currentPalette?.prevalenceFilter || 0}%
                </Label>
                <Slider
                  id="prevalence-filter"
                  min={0}
                  max={100}
                  step={5}
                  value={[currentPalette?.prevalenceFilter || 0]}
                  onValueChange={(value) => handleConfigChange({ prevalenceFilter: value[0] })}
                  className="w-full"
                />
              </div>
            )}

            {/* Reverse Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="reverse-palette" className="text-xs">Reverse palette</Label>
              <Switch
                id="reverse-palette"
                checked={!!currentPalette?.reverse}
                onCheckedChange={(checked) => handleConfigChange({ reverse: checked })}
              />
            </div>

            {/* Domain alpha-range slider (0..1) - only for domains & sequential palettes */}
            {selectedLayer === 'domains' && currentPalette?.type === 'sequential' && (
              <div className="space-y-1">
                <Label className="text-xs">
                  Domain opacity: {currentPalette?.alphaRange && Array.isArray(currentPalette.alphaRange)
                    ? `${Number(currentPalette.alphaRange[0]).toFixed(2)} → ${Number(currentPalette.alphaRange[1]).toFixed(2)}`
                    : '0.10 → 0.50'}
                </Label>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={currentPalette?.alphaRange && Array.isArray(currentPalette.alphaRange)
                    ? [Number(currentPalette.alphaRange[0]), Number(currentPalette.alphaRange[1])]
                    : [0.1, 0.5]}
                  onValueChange={(value) => {
                    // value expected to be an array [min, max]
                    if (Array.isArray(value) && value.length >= 2) {
                      const a0 = Number(value[0]);
                      const a1 = Number(value[1]);
                      if (!isNaN(a0) && !isNaN(a1)) {
                        handleConfigChange({ alphaRange: [a0, a1] });
                      }
                    }
                  }}
                  className="w-full"
                />
              </div>
            )}


          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UnifiedPaletteWidget;
