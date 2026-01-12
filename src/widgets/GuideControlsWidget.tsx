import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { FORMAT_PRESETS, FormatPreset } from '../components/GuideOverlay';

export interface GuideControlsProps {
  /** Whether guides are visible */
  guidesVisible: boolean;
  /** Currently selected format preset */
  selectedFormat: FormatPreset | null;
  /** Callback when guides visibility changes */
  onGuidesVisibleChange: (visible: boolean) => void;
  /** Callback when format selection changes */
  onFormatChange: (format: FormatPreset | null) => void;
  /** Whether to scale SVG export to fit the selected format */
  scaleToFormat: boolean;
  /** Callback when scale to format changes */
  onScaleToFormatChange: (scale: boolean) => void;
  /** Whether to crop export to guide bounds (only export what's inside guides) */
  cropToGuides: boolean;
  /** Callback when crop to guides changes */
  onCropToGuidesChange: (crop: boolean) => void;
  /** Whether to scale ruler proportionally when cropping */
  scaleRulerWithCrop: boolean;
  /** Callback when scale ruler with crop changes */
  onScaleRulerWithCropChange: (scale: boolean) => void;
}

/**
 * GuideControlsWidget - Controls for format guides and export scaling
 * 
 * Provides UI controls to:
 * - Toggle guide visibility
 * - Select format presets (A4, PowerPoint, etc.)
 * - Enable/disable SVG scaling to format
 */
export const GuideControlsWidget: React.FC<GuideControlsProps> = ({
  guidesVisible,
  selectedFormat,
  onGuidesVisibleChange,
  onFormatChange,
  scaleToFormat,
  onScaleToFormatChange,
  cropToGuides,
  onCropToGuidesChange,
  scaleRulerWithCrop,
  onScaleRulerWithCropChange
}) => {
  // Group presets by category for better organization
  const presetsByCategory = React.useMemo(() => {
    const groups: Record<string, FormatPreset[]> = {};
    FORMAT_PRESETS.forEach(preset => {
      if (!groups[preset.category]) {
        groups[preset.category] = [];
      }
      groups[preset.category].push(preset);
    });
    return groups;
  }, []);

  const categoryLabels = {
    print: '🖨️ Print Formats',
    screen: '📱 Screen Formats', 
    presentation: '📊 Presentation'
  };

  const handleFormatSelect = (formatId: string | null) => {
    if (!formatId || formatId === 'none') {
      onFormatChange(null);
      return;
    }
    
    const format = FORMAT_PRESETS.find(p => p.id === formatId);
    onFormatChange(format || null);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          📐 Format Guides
          {selectedFormat && (
            <Badge variant="outline" className="text-xs">
              {selectedFormat.name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Guide visibility toggle */}
        <div className="flex items-center justify-between">
          <label htmlFor="guides-visible" className="text-sm font-medium">
            Show Guides
          </label>
          <Checkbox
            id="guides-visible"
            checked={guidesVisible}
            onCheckedChange={onGuidesVisibleChange}
          />
        </div>

        {/* Format selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Format Preset</label>
          <Select
          value={selectedFormat?.id || 'none'}
          onValueChange={(value) => handleFormatSelect(value === 'none' ? null : value)}
          disabled={!guidesVisible}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a format..." />
          </SelectTrigger>
          <SelectContent>
            {/* Clear selection option */}
            <SelectItem value="none">
              </SelectItem>
              
              {/* Grouped format options */}
              {Object.entries(presetsByCategory).map(([category, presets]) => (
                <React.Fragment key={category}>
                  <Separator className="my-1" />
                  <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </div>
                  {presets.map(preset => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{preset.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {preset.width}×{preset.height}{preset.unit}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </React.Fragment>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Format info display */}
        {selectedFormat && guidesVisible && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-sm space-y-1">
              <div className="font-medium">{selectedFormat.name}</div>
              <div className="text-muted-foreground">
                {selectedFormat.width} × {selectedFormat.height} {selectedFormat.unit}
              </div>
              <div className="text-xs text-muted-foreground">
                Aspect ratio: {(selectedFormat.width / selectedFormat.height).toFixed(2)}:1
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* SVG export options */}
        <div className="space-y-3">
          <div className="text-sm font-medium">SVG Export</div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label htmlFor="scale-to-format" className="text-sm">
                Scale to format
              </label>
              <div className="text-xs text-muted-foreground">
                Export SVG with selected format dimensions
              </div>
            </div>
            <Checkbox
              id="scale-to-format"
              checked={scaleToFormat}
              onCheckedChange={(checked) => {
                onScaleToFormatChange(checked as boolean);
                // Auto-enable crop when enabling scale to format
                if (checked && !cropToGuides) {
                  onCropToGuidesChange(true);
                }
              }}
              disabled={!selectedFormat}
            />
          </div>
          
          {/* Crop to guides option - only shown when scale to format is enabled */}
          {scaleToFormat && selectedFormat && (
            <div className="flex items-center justify-between pl-4 border-l-2 border-muted">
              <div className="space-y-1">
                <label htmlFor="crop-to-guides" className="text-sm">
                  Crop to guides
                </label>
                <div className="text-xs text-muted-foreground">
                  Only export content within guide bounds
                </div>
              </div>
              <Checkbox
                id="crop-to-guides"
                checked={cropToGuides}
                onCheckedChange={onCropToGuidesChange}
              />
            </div>
          )}
          
          {/* Scale ruler with crop option - only shown when crop to guides is enabled */}
          {scaleToFormat && selectedFormat && cropToGuides && (
            <div className="flex items-center justify-between pl-8 border-l-2 border-muted">
              <div className="space-y-1">
                <label htmlFor="scale-ruler-with-crop" className="text-sm">
                  Scale ruler
                </label>
                <div className="text-xs text-muted-foreground">
                  Match ruler size to viewport appearance
                </div>
              </div>
              <Checkbox
                id="scale-ruler-with-crop"
                checked={scaleRulerWithCrop}
                onCheckedChange={onScaleRulerWithCropChange}
              />
            </div>
          )}
        </div>

        {/* Quick tips */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <div className="text-xs space-y-1">
            <div className="font-medium text-blue-700 dark:text-blue-300">💡 Tips:</div>
            <div className="text-blue-600 dark:text-blue-400">
              • Guides help compose your visualization for export
            </div>
            <div className="text-blue-600 dark:text-blue-400">
              • Adjust gene height, tree scale to fit within guides
            </div>
            <div className="text-blue-600 dark:text-blue-400">
              • Enable "Scale to format" for precise dimensions
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GuideControlsWidget;