import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Printer, Monitor, Presentation, Lightbulb } from 'lucide-react';
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

  const categoryIcons = {
    print: <Printer className="h-3 w-3 mr-1" />,
    screen: <Monitor className="h-3 w-3 mr-1" />,
    presentation: <Presentation className="h-3 w-3 mr-1" />
  };

  const categoryLabels = {
    print: 'Print Formats',
    screen: 'Screen Formats', 
    presentation: 'Presentation'
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
    <div className="space-y-4">
      {/* Guide Controls */}
      <div className="bg-muted/30 p-3 rounded-lg border border-border/30">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="muted" className="text-xs">Guide Controls</Badge>
          {selectedFormat && (
            <Badge variant="info" className="text-xs">
              {selectedFormat.name}
            </Badge>
          )}
        </div>
        
        <div className="space-y-3">
          {/* Guide visibility toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="guides-visible" className="text-xs">Show Guides</Label>
            <Switch
              id="guides-visible"
              checked={guidesVisible}
              onCheckedChange={onGuidesVisibleChange}
            />
          </div>

          {/* Format selection */}
          <div>
            <Label className="text-xs mb-1 block">Format Preset</Label>
            <Select
              value={selectedFormat?.id || 'none'}
              onValueChange={(value) => handleFormatSelect(value === 'none' ? null : value)}
              disabled={!guidesVisible}
            >
              <SelectTrigger className="w-full text-xs" style={{ height: '24px', minHeight: '24px' }}>
                <SelectValue placeholder="Select a format..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                
                {Object.entries(presetsByCategory).map(([category, presets]) => (
                  <React.Fragment key={category}>
                    <Separator className="my-1" />
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center">
                      {categoryIcons[category as keyof typeof categoryIcons]}
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
            <div className="p-2 bg-accent/20 rounded-md text-xs">
              <div className="font-medium">{selectedFormat.name}</div>
              <div className="text-muted-foreground">
                {selectedFormat.width} × {selectedFormat.height} {selectedFormat.unit}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SVG Export Options */}
      <div className="bg-muted/30 p-3 rounded-lg border border-border/30">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="muted" className="text-xs">Export Options</Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="scale-to-format" className="text-xs">Scale to Format</Label>
            <Switch
              id="scale-to-format"
              checked={scaleToFormat}
              onCheckedChange={(checked) => {
                onScaleToFormatChange(checked as boolean);
                if (checked && !cropToGuides) {
                  onCropToGuidesChange(true);
                }
              }}
              disabled={!selectedFormat}
            />
          </div>
          
          {scaleToFormat && selectedFormat && (
            <div className="flex items-center justify-between pl-3 border-l-2 border-border/50">
              <Label htmlFor="crop-to-guides" className="text-xs">Crop to Guides</Label>
              <Switch
                id="crop-to-guides"
                checked={cropToGuides}
                onCheckedChange={onCropToGuidesChange}
              />
            </div>
          )}
          
          {scaleToFormat && selectedFormat && cropToGuides && (
            <div className="flex items-center justify-between pl-6 border-l-2 border-border/50">
              <Label htmlFor="scale-ruler-with-crop" className="text-xs">Scale Ruler</Label>
              <Switch
                id="scale-ruler-with-crop"
                checked={scaleRulerWithCrop}
                onCheckedChange={onScaleRulerWithCropChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="p-2 bg-accent/20 rounded-lg">
        <div className="text-xs space-y-1">
          <div className="font-medium text-foreground/80 flex items-center gap-1">
            <Lightbulb className="h-3 w-3" />
            Tips
          </div>
          <div className="text-muted-foreground">
            • Guides help compose your visualization for export
          </div>
          <div className="text-muted-foreground">
            • Adjust gene height and tree scale to fit within guides
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuideControlsWidget;