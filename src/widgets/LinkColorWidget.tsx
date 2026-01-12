// LinkColorWidget.jsx
// Widget for controlling protein and nucleotide link coloring options

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ColorPaletteWidget from './ColorPaletteWidget';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, PaintBucket, Check, X } from "lucide-react";

// Custom debounce hook with immediate updates and cleanup
const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);
  
  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedFn = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);

  // Return both debounced function and a flush function for immediate execution
  const flush = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    callbackRef.current(...args);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { debounced: debouncedFn, flush };
};

const LinkColorWidget = ({
  proteinLinkConfig,
  nucleotideLinkConfig,
  onProteinLinkConfigChange,
  onNucleotideLinkConfigChange,
  title = "Link Colors"
}) => {
  const [expandedSection, setExpandedSection] = useState(null);
  
  // Theme context for proper theming
  const { resolvedTheme, getThemeColors } = useTheme();
  const themeColors = React.useMemo(() => getThemeColors(resolvedTheme), [resolvedTheme]);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Provide safe defaults for protein config
  const defaultProteinConfig = {
    colorBy: 'source_gene', // 'source_gene', 'target_gene', 'identity_solid', 'identity_gradient'
    previousColorBy: undefined, // Store previous colorBy when switching to palette
    solidColor: [100, 150, 200, 255],
    palette: {
      enabled: false,
      type: 'sequential',
      name: 'viridis',
      numColors: 10,
      reverse: false
    },
    useAlpha: true,
    minAlpha: 0.3,
    maxAlpha: 1.0
  };

  // Provide safe defaults for nucleotide config
  const defaultNucleotideConfig = {
    colorBy: 'solid', // 'solid', 'identity_gradient'
    previousColorBy: undefined, // Store previous colorBy when switching to palette
    solidColor: [200, 100, 100, 180],
    // Strand-based coloring
    strandColoring: true,
    sameStrandColor: [180, 180, 180, 255],      // Gray for same strand (+/+ or -/-)
    oppositeStrandColor: [220, 80, 80, 255],    // Red for opposite strand (+/- or -/+)
    palette: {
      enabled: false,
      type: 'sequential',
      name: 'viridis',
      numColors: 10,
      reverse: false
    },
    sameStrandPalette: {
      enabled: true,
      type: 'sequential',
      name: 'Greys',
      numColors: 9,
      reverse: false
    },
    oppositeStrandPalette: {
      enabled: true,
      type: 'sequential',
      name: 'Reds',
      numColors: 9,
      reverse: false
    },
    useAlpha: false,
    minAlpha: 0.3,
    maxAlpha: 1.0
  };

  const safeProteinConfig = proteinLinkConfig || defaultProteinConfig;
  const safeNucleotideConfig = nucleotideLinkConfig || defaultNucleotideConfig;

  // Create debounced handlers for better slider performance with immediate flush
  const { debounced: debouncedProteinConfigChange, flush: flushProteinConfigChange } = useDebounce((updates) => {
    onProteinLinkConfigChange({
      ...safeProteinConfig,
      ...updates
    });
  }, 100);

  const { debounced: debouncedNucleotideConfigChange, flush: flushNucleotideConfigChange } = useDebounce((updates) => {
    onNucleotideLinkConfigChange({
      ...safeNucleotideConfig,
      ...updates
    });
  }, 100);

  // Immediate config change handlers for non-slider controls (switches, selects)
  const handleProteinConfigChange = useCallback((updates) => {
    onProteinLinkConfigChange({
      ...safeProteinConfig,
      ...updates
    });
  }, [safeProteinConfig, onProteinLinkConfigChange]);

  const handleNucleotideConfigChange = useCallback((updates) => {
    onNucleotideLinkConfigChange({
      ...safeNucleotideConfig,
      ...updates
    });
  }, [safeNucleotideConfig, onNucleotideLinkConfigChange]);

  const ColorInput = ({ label, color, onChange, alpha = true }) => {
    // Local state for alpha slider to provide immediate visual feedback
    const [localAlpha, setLocalAlpha] = useState(color.length > 3 ? color[3] : 255);
    // Local state for color picker to show preview before applying
    const [localColor, setLocalColor] = useState([color[0], color[1], color[2]]);
    const [hasColorChanges, setHasColorChanges] = useState(false);
    
    // Debounced alpha change handler with flush capability
    const { debounced: debouncedAlphaChange, flush: flushAlphaChange } = useDebounce((newAlpha) => {
      onChange([localColor[0], localColor[1], localColor[2], newAlpha]);
    }, 100);

    // Update local state when prop changes
    useEffect(() => {
      setLocalAlpha(color.length > 3 ? color[3] : 255);
      setLocalColor([color[0], color[1], color[2]]);
      setHasColorChanges(false);
    }, [color]);

    const handleAlphaChange = (value) => {
      const newAlpha = value[0];
      setLocalAlpha(newAlpha); // Immediate UI update
      debouncedAlphaChange(newAlpha); // Debounced actual change
    };

    const handleAlphaCommit = (value) => {
      const newAlpha = value[0];
      setLocalAlpha(newAlpha);
      flushAlphaChange(newAlpha); // Immediate flush when slider is released
    };

    const handleColorChange = (e) => {
      const hex = e.target.value;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      setLocalColor([r, g, b]);
      setHasColorChanges(true);
    };

    const applyColorChange = () => {
      const a = alpha ? localAlpha : 255;
      onChange([localColor[0], localColor[1], localColor[2], a]);
      setHasColorChanges(false);
    };

    const cancelColorChange = () => {
      setLocalColor([color[0], color[1], color[2]]);
      setHasColorChanges(false);
    };

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {/* Paint bucket color display button */}
            <div className="relative">
              <Button
                variant="outline"
                className="w-8 h-8 p-0 rounded-md border-2 flex items-center justify-center"
                style={{ 
                  borderColor: hasColorChanges ? '#3b82f6' : 'hsl(var(--border))'
                }}
                onClick={() => {
                  // Focus the hidden color input when clicking the paint bucket
                  const colorInput = document.getElementById(`color-input-${label.replace(/\s+/g, '-')}`);
                  if (colorInput) colorInput.click();
                }}
              >
                <PaintBucket 
                  className="h-4 w-4" 
                  style={{ 
                    color: `rgb(${localColor.join(', ')})`,
                    fill: `rgb(${localColor.join(', ')})`,
                    stroke: `rgb(${localColor.join(', ')})`,
                    strokeWidth: 1.5
                  }}
                />
                {hasColorChanges && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </Button>
              {/* Hidden native color input */}
              <Input
                id={`color-input-${label.replace(/\s+/g, '-')}`}
                type="color"
                value={`#${localColor.map(c => Math.round(c).toString(16).padStart(2, '0')).join('')}`}
                onChange={handleColorChange}
                className="absolute opacity-0 pointer-events-none w-0 h-0"
              />
            </div>
            {hasColorChanges && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="default"
                  className="h-6 w-6 p-0 text-xs rounded-full"
                  onClick={applyColorChange}
                  title="Apply color change"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 w-6 p-0 text-xs rounded-full"
                  onClick={cancelColorChange}
                  title="Cancel color change"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          {alpha && (
            <>
              <Label className="text-xs">α:</Label>
              <Slider
                value={[localAlpha]}
                onValueChange={handleAlphaChange}
                onValueCommit={handleAlphaCommit}
                min={0}
                max={255}
                step={1}
                className="w-12"
              />
              <span className="text-xs min-w-[25px]">
                {Math.round((localAlpha / 255) * 100)}%
              </span>
            </>
          )}
        </div>
      </div>
    );
  };

  const AlphaControls = ({ config, onChange }) => {
    // Local state for alpha sliders to provide immediate visual feedback
    const [localMinAlpha, setLocalMinAlpha] = useState(config.minAlpha);
    const [localMaxAlpha, setLocalMaxAlpha] = useState(config.maxAlpha);
    
    // Debounced handlers for alpha changes with flush capability
    const { debounced: debouncedMinAlphaChange, flush: flushMinAlphaChange } = useDebounce((minAlpha) => {
      onChange({ ...config, minAlpha });
    }, 100);
    
    const { debounced: debouncedMaxAlphaChange, flush: flushMaxAlphaChange } = useDebounce((maxAlpha) => {
      onChange({ ...config, maxAlpha });
    }, 100);

    // Update local state when props change
    useEffect(() => {
      setLocalMinAlpha(config.minAlpha);
      setLocalMaxAlpha(config.maxAlpha);
    }, [config.minAlpha, config.maxAlpha]);

    const handleMinAlphaChange = (value) => {
      const newMinAlpha = value[0];
      setLocalMinAlpha(newMinAlpha);
      debouncedMinAlphaChange(newMinAlpha);
    };

    const handleMinAlphaCommit = (value) => {
      const newMinAlpha = value[0];
      setLocalMinAlpha(newMinAlpha);
      flushMinAlphaChange(newMinAlpha);
    };

    const handleMaxAlphaChange = (value) => {
      const newMaxAlpha = value[0];
      setLocalMaxAlpha(newMaxAlpha);
      debouncedMaxAlphaChange(newMaxAlpha);
    };

    const handleMaxAlphaCommit = (value) => {
      const newMaxAlpha = value[0];
      setLocalMaxAlpha(newMaxAlpha);
      flushMaxAlphaChange(newMaxAlpha);
    };

    return (
      <Card className="mt-2">
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="use-alpha" className="text-xs">Identity-dependent alpha</Label>
            <Switch
              id="use-alpha"
              checked={config.useAlpha}
              onCheckedChange={(checked) => onChange({ ...config, useAlpha: checked })}
            />
          </div>
          {config.useAlpha && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs min-w-[35px]">Min α:</Label>
                <Slider
                  value={[localMinAlpha]}
                  onValueChange={handleMinAlphaChange}
                  onValueCommit={handleMinAlphaCommit}
                  min={0}
                  max={1}
                  step={0.01}
                  className="flex-1"
                />
                <span className="text-xs min-w-[30px]">{Math.round(localMinAlpha * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs min-w-[35px]">Max α:</Label>
                <Slider
                  value={[localMaxAlpha]}
                  onValueChange={handleMaxAlphaChange}
                  onValueCommit={handleMaxAlphaCommit}
                  min={0}
                  max={1}
                  step={0.01}
                  className="flex-1"
                />
                <span className="text-xs min-w-[30px]">{Math.round(localMaxAlpha * 100)}%</span>
              </div>
              <div className="text-xs text-muted-foreground">
                0% identity → {Math.round(localMinAlpha * 100)}% alpha<br/>
                100% identity → {Math.round(localMaxAlpha * 100)}% alpha
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="mb-2">
      <CardContent className="space-y-3">
        {/* Protein Links Section */}
        <Collapsible 
          open={expandedSection === 'protein'} 
          onOpenChange={() => toggleSection('protein')}
        >
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between h-8 text-xs">
              🔗 Protein Links
              {expandedSection === 'protein' ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-2">
            <div className="space-y-2">
              <Label className="text-xs">Color by:</Label>
              <Select
                value={safeProteinConfig.colorBy}
                onValueChange={(value) => handleProteinConfigChange({ colorBy: value })}
              >
                <SelectTrigger className="w-full text-xs" style={{ height: '20px', minHeight: '20px' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="source_gene">Source Gene Color</SelectItem>
                  <SelectItem value="target_gene">Target Gene Color</SelectItem>
                  <SelectItem value="identity_solid">Identity (Solid Color)</SelectItem>
                  <SelectItem value="identity_gradient">Identity (Gradient)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(safeProteinConfig.colorBy === 'source_gene' || safeProteinConfig.colorBy === 'target_gene') && (
              <AlphaControls
                config={safeProteinConfig}
                onChange={debouncedProteinConfigChange}
              />
            )}

            {safeProteinConfig.colorBy === 'identity_solid' && (
              <>
                <ColorInput
                  label="Solid Color"
                  color={safeProteinConfig.solidColor}
                  onChange={(color) => handleProteinConfigChange({ solidColor: color })}
                  alpha={false}
                />
                <AlphaControls
                  config={safeProteinConfig}
                  onChange={debouncedProteinConfigChange}
                />
              </>
            )}

            {/* Color Palette Widget - Only show for gradient mode */}
            {safeProteinConfig.colorBy === 'identity_gradient' && (
              <>
                <div className="text-xs text-muted-foreground italic">
                  Color palette uses identity % to assign colors from gradient
                </div>
                <ColorPaletteWidget
                  palette={safeProteinConfig.palette}
                  onChange={(palette) => {
                    if (palette && palette.enabled) {
                      // Auto-switch to identity_gradient when palette is enabled
                      handleProteinConfigChange({ 
                        palette,
                        colorBy: 'identity_gradient',
                        previousColorBy: safeProteinConfig.colorBy !== 'identity_gradient' ? safeProteinConfig.colorBy : safeProteinConfig.previousColorBy
                      });
                    } else if (palette === null || (palette && !palette.enabled)) {
                      // Switch back to previous colorBy when palette is disabled
                      const previousColorBy = safeProteinConfig.previousColorBy || 'source_gene';
                      handleProteinConfigChange({ 
                        palette,
                        colorBy: previousColorBy,
                        previousColorBy: undefined
                      });
                    } else {
                      handleProteinConfigChange({ palette });
                    }
                  }}
                  title="Identity Gradient Palette"
                  showPreview={false}
                />
                <AlphaControls
                  config={safeProteinConfig}
                  onChange={debouncedProteinConfigChange}
                />
              </>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Nucleotide Links Section */}
        <Collapsible 
          open={expandedSection === 'nucleotide'} 
          onOpenChange={() => toggleSection('nucleotide')}
        >
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between h-8 text-xs">
              🧬 Nucleotide Links
              {expandedSection === 'nucleotide' ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-2">
            <div className="space-y-2">
              <Label className="text-xs">Color by:</Label>
              <Select
                value={safeNucleotideConfig.colorBy}
                onValueChange={(value) => handleNucleotideConfigChange({ colorBy: value })}
              >
                <SelectTrigger className="w-full text-xs" style={{ height: '20px', minHeight: '20px' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid Color</SelectItem>
                  <SelectItem value="identity_gradient">Identity (Gradient)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {safeNucleotideConfig.colorBy === 'solid' && (
              <>
                {/* Strand coloring toggle */}
                <div className="flex items-center justify-between mt-2">
                  <Label htmlFor="strand-coloring-solid" className="text-xs">Color by strand</Label>
                  <Switch
                    id="strand-coloring-solid"
                    checked={safeNucleotideConfig.strandColoring || false}
                    onCheckedChange={(checked) => handleNucleotideConfigChange({ strandColoring: checked })}
                  />
                </div>
                
                {!safeNucleotideConfig.strandColoring ? (
                  <ColorInput
                    label="Solid Color"
                    color={safeNucleotideConfig.solidColor}
                    onChange={(color) => handleNucleotideConfigChange({ solidColor: color })}
                    alpha={true}
                  />
                ) : (
                  <>
                    <div className="text-xs text-muted-foreground italic mb-1">
                      Different colors for same vs opposite strand (considers track flip)
                    </div>
                    <div className="space-y-2">
                      <ColorInput
                        label="Same Strand (+/+ or -/-)"
                        color={safeNucleotideConfig.sameStrandColor || [180, 180, 180, 255]}
                        onChange={(color) => handleNucleotideConfigChange({ sameStrandColor: color })}
                        alpha={false}
                      />
                      <ColorInput
                        label="Opposite Strand (+/- or -/+)"
                        color={safeNucleotideConfig.oppositeStrandColor || [220, 80, 80, 255]}
                        onChange={(color) => handleNucleotideConfigChange({ oppositeStrandColor: color })}
                        alpha={false}
                      />
                    </div>
                  </>
                )}
                <AlphaControls
                  config={safeNucleotideConfig}
                  onChange={debouncedNucleotideConfigChange}
                />
              </>
            )}

            {/* Color Palette Widget - Only show for gradient mode */}
            {safeNucleotideConfig.colorBy === 'identity_gradient' && (
              <>
                {/* Strand coloring toggle for gradient mode */}
                <div className="flex items-center justify-between mt-2">
                  <Label htmlFor="strand-coloring-gradient" className="text-xs">Color by strand</Label>
                  <Switch
                    id="strand-coloring-gradient"
                    checked={safeNucleotideConfig.strandColoring || false}
                    onCheckedChange={(checked) => handleNucleotideConfigChange({ strandColoring: checked })}
                  />
                </div>
                
                {!safeNucleotideConfig.strandColoring ? (
                  <>
                    <div className="text-xs text-muted-foreground italic">
                      Color palette uses identity % to assign colors from gradient
                    </div>
                    <ColorPaletteWidget
                      palette={safeNucleotideConfig.palette}
                      onChange={(palette) => {
                        if (palette && palette.enabled) {
                          handleNucleotideConfigChange({ 
                            palette,
                            colorBy: 'identity_gradient',
                            previousColorBy: safeNucleotideConfig.colorBy !== 'identity_gradient' ? safeNucleotideConfig.colorBy : safeNucleotideConfig.previousColorBy
                          });
                        } else if (palette === null || (palette && !palette.enabled)) {
                          const previousColorBy = safeNucleotideConfig.previousColorBy || 'solid';
                          handleNucleotideConfigChange({ 
                            palette,
                            colorBy: previousColorBy,
                            previousColorBy: undefined
                          });
                        } else {
                          handleNucleotideConfigChange({ palette });
                        }
                      }}
                      title="Identity Gradient Palette"
                      showPreview={false}
                    />
                  </>
                ) : (
                  <>
                    <div className="text-xs text-muted-foreground italic mb-2">
                      Different gradients for same vs opposite strand (considers track flip)
                    </div>
                    <div className="space-y-3">
                      <div className="border rounded-md p-2">
                        <Label className="text-xs font-medium mb-1 block">Same Strand (+/+ or -/-)</Label>
                        <ColorPaletteWidget
                          palette={safeNucleotideConfig.sameStrandPalette || { enabled: true, type: 'sequential', name: 'Greys', numColors: 9, reverse: false }}
                          onChange={(palette) => handleNucleotideConfigChange({ sameStrandPalette: palette })}
                          title=""
                          showPreview={true}
                        />
                      </div>
                      <div className="border rounded-md p-2">
                        <Label className="text-xs font-medium mb-1 block">Opposite Strand (+/- or -/+)</Label>
                        <ColorPaletteWidget
                          palette={safeNucleotideConfig.oppositeStrandPalette || { enabled: true, type: 'sequential', name: 'Reds', numColors: 9, reverse: false }}
                          onChange={(palette) => handleNucleotideConfigChange({ oppositeStrandPalette: palette })}
                          title=""
                          showPreview={true}
                        />
                      </div>
                    </div>
                  </>
                )}
                <AlphaControls
                  config={safeNucleotideConfig}
                  onChange={debouncedNucleotideConfigChange}
                />
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default LinkColorWidget;
