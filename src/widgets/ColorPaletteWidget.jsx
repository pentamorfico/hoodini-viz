// ColorPaletteWidget.jsx
// Widget for selecting and configuring color palettes using dicopal

import React, { useState, useMemo } from 'react';
import { 
  getQualitativePalettes, 
  getSequentialPalettes, 
  getDivergingPalettes,
  getPaletteColors,
  getPaletteColorCounts,
  RECOMMENDED_PALETTES
} from '../utils/colorPalettes';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// Global cache for palette previews - computed once per type at module level
const globalPreviewCache = {
  qualitative: null,
  sequential: null,
  diverging: null
};

const computePreviewCacheForType = (type) => {
  if (globalPreviewCache[type]) return globalPreviewCache[type];
  
  const cache = {};
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
  
  const uniqueNames = [...new Set(palettes.map(p => p.name))].sort();
  uniqueNames.forEach(name => {
    try {
      const bestMatch = palettes
        .filter(p => p.name === name)
        .reduce((best, current) => current.number > best.number ? current : best);
      const colors = getPaletteColors(name, bestMatch.number, false);
      cache[name] = colors.slice(0, 4);
    } catch (error) {
      cache[name] = [];
    }
  });
  
  globalPreviewCache[type] = cache;
  return cache;
};

const ColorPaletteWidget = ({ 
  title = "Color Palette", 
  palette, 
  onChange,
  showPreview = true,
  availableLayers = [],
  selectedLayer = null,
  onLayerChange = null
}) => {
  const effectivePalette = palette || {};
  const effectiveOnChange = onChange || (() => {});

  const { resolvedTheme, getThemeColors } = useTheme();
  const themeColors = useMemo(() => getThemeColors(resolvedTheme), [resolvedTheme]);

  const safePaletteConfig = { ...effectivePalette };

  const layersWithData = availableLayers.filter(layer => layer.hasData);

  const availablePalettes = useMemo(() => {
    switch (safePaletteConfig.type) {
      case 'qualitative':
        return getQualitativePalettes();
      case 'sequential':
        return getSequentialPalettes();
      case 'diverging':
        return getDivergingPalettes();
      default:
        return getQualitativePalettes();
    }
  }, [safePaletteConfig.type]);

  const uniquePaletteNames = useMemo(() => {
    return [...new Set(availablePalettes.map(p => p.name))].sort();
  }, [availablePalettes]);

  const colorCounts = useMemo(() => {
    if (safePaletteConfig.name) {
      const counts = getPaletteColorCounts(safePaletteConfig.name);

      if (counts.length > 0 && !counts.includes(safePaletteConfig.numColors)) {
        effectiveOnChange({
          ...safePaletteConfig,
          numColors: counts[0]
        });
      }

      return counts;
    }
    return [];
  }, [safePaletteConfig.name, safePaletteConfig.numColors]);

  const previewColors = useMemo(() => {
    if (safePaletteConfig.name && safePaletteConfig.numColors) {
      try {
        return getPaletteColors(safePaletteConfig.name, safePaletteConfig.numColors, safePaletteConfig.reverse);
      } catch (error) {
        console.warn('Failed to load palette preview:', error);
        return [];
      }
    }
    return [];
  }, [safePaletteConfig.name, safePaletteConfig.numColors, safePaletteConfig.reverse]);

  // Use global cache for palette previews - fast lookup, no recomputation per instance
  const palettePreviewCache = useMemo(() => {
    const type = safePaletteConfig.type || 'qualitative';
    return computePreviewCacheForType(type);
  }, [safePaletteConfig.type]);

  const handleConfigChange = (updates) => {
    if (updates === null) {
      effectiveOnChange(null);
    } else {
      effectiveOnChange({
        ...safePaletteConfig,
        ...updates
      });
    }
  };

  return (
    <Card className="mb-2">
      <CardContent className="space-y-3">

        {/* Palette Type */}
        <div className="space-y-1">
          <Label className="text-xs">Palette Type:</Label>
          <Select
            value={safePaletteConfig?.type || ''}
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

        {/* Palette Name */}
        <div className="space-y-1">
          <Label className="text-xs">Palette Name:</Label>
          <Select
            value={safePaletteConfig?.name || ''}
            onValueChange={(value) => handleConfigChange({ name: value })}
          >
            <SelectTrigger className="w-full text-xs" style={{ height: '20px', minHeight: '20px' }}>
              <SelectValue placeholder="Select a palette..." />
            </SelectTrigger>
            <SelectContent>
              {RECOMMENDED_PALETTES[safePaletteConfig.type] &&
                RECOMMENDED_PALETTES[safePaletteConfig.type]
                  .filter(rec => uniquePaletteNames.includes(rec.name))
                  .map((rec) => {
                    const previewColors = palettePreviewCache[rec.name] || [];
                    return (
                      <SelectItem key={`rec-${rec.name}`} value={rec.name}>
                        <div className="flex items-center gap-2">
                          <div className="flex h-3 w-8 border border-border rounded overflow-hidden">
                            {previewColors.map((color, idx) => (
                              <div
                                key={idx}
                                className="flex-1"
                                style={{
                                  backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`,
                                }}
                              />
                            ))}
                          </div>
                          <span>{rec.name} (recommended)</span>
                        </div>
                      </SelectItem>
                    );
                  })
              }

              {RECOMMENDED_PALETTES[safePaletteConfig.type] &&
                RECOMMENDED_PALETTES[safePaletteConfig.type].some(rec => uniquePaletteNames.includes(rec.name)) && (
                <SelectSeparator />
              )}

              {uniquePaletteNames
                .filter(name =>
                  !RECOMMENDED_PALETTES[safePaletteConfig.type] ||
                  !RECOMMENDED_PALETTES[safePaletteConfig.type].some(rec => rec.name === name)
                )
                .map(name => {
                  const previewColors = palettePreviewCache[name] || [];
                  return (
                    <SelectItem key={name} value={name}>
                      <div className="flex items-center gap-2">
                        <div className="flex h-3 w-8 border border-border rounded overflow-hidden">
                          {previewColors.map((color, idx) => (
                            <div
                              key={idx}
                              className="flex-1"
                              style={{
                                backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`,
                              }}
                            />
                          ))}
                        </div>
                        <span>{name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
        </div>

        {/* Number of Colors */}
        {colorCounts.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Number of Colors:</Label>
            <Select
              value={safePaletteConfig?.numColors?.toString() || ''}
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

        {/* Reverse Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor={`${title}-reverse`} className="text-xs">Reverse palette</Label>
          <Switch
            id={`${title}-reverse`}
            checked={!!safePaletteConfig.reverse}
            onCheckedChange={(checked) => handleConfigChange({ reverse: checked })}
          />
        </div>

        {/* Color Preview */}
        {showPreview && previewColors.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Preview:</Label>
            <div className="flex h-5 border border-border rounded overflow-hidden">
              {previewColors.map((color, idx) => (
                <div
                  key={idx}
                  className="flex-1"
                  style={{
                    backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`,
                  }}
                  title={`Color ${idx + 1}: rgba(${color.join(', ')})`}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ColorPaletteWidget;
