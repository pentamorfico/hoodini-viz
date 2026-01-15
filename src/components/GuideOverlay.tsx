import React from 'react';

// Standard format definitions with aspect ratios and common sizes
export interface FormatPreset {
  id: string;
  name: string;
  width: number;  // in mm for print formats, pixels for screen formats
  height: number;
  unit: 'mm' | 'px';
  category: 'print' | 'screen' | 'presentation';
}

export const FORMAT_PRESETS: FormatPreset[] = [
  // Print formats (ISO 216 - A series)
  { id: 'a4-portrait', name: 'A4 Portrait', width: 210, height: 297, unit: 'mm', category: 'print' },
  { id: 'a4-landscape', name: 'A4 Landscape', width: 297, height: 210, unit: 'mm', category: 'print' },
  { id: 'a3-portrait', name: 'A3 Portrait', width: 297, height: 420, unit: 'mm', category: 'print' },
  { id: 'a3-landscape', name: 'A3 Landscape', width: 420, height: 297, unit: 'mm', category: 'print' },
  { id: 'letter-portrait', name: 'Letter Portrait', width: 216, height: 279, unit: 'mm', category: 'print' },
  { id: 'letter-landscape', name: 'Letter Landscape', width: 279, height: 216, unit: 'mm', category: 'print' },
  
  // Screen formats
  { id: 'hd-1080p', name: '1080p (Full HD)', width: 1920, height: 1080, unit: 'px', category: 'screen' },
  { id: 'hd-720p', name: '720p (HD)', width: 1280, height: 720, unit: 'px', category: 'screen' },
  { id: '4k-uhd', name: '4K (Ultra HD)', width: 3840, height: 2160, unit: 'px', category: 'screen' },
  { id: 'instagram-post', name: 'Instagram Post', width: 1080, height: 1080, unit: 'px', category: 'screen' },
  { id: 'instagram-story', name: 'Instagram Story', width: 1080, height: 1920, unit: 'px', category: 'screen' },
  
  // Presentation formats
  { id: 'powerpoint-16-9', name: 'PowerPoint 16:9', width: 1920, height: 1080, unit: 'px', category: 'presentation' },
  { id: 'powerpoint-4-3', name: 'PowerPoint 4:3', width: 1024, height: 768, unit: 'px', category: 'presentation' },
  { id: 'keynote-16-9', name: 'Keynote 16:9', width: 1920, height: 1080, unit: 'px', category: 'presentation' },
];

export interface GuideOverlayProps {
  /** Whether guides are visible */
  visible: boolean;
  /** Selected format preset */
  formatPreset: FormatPreset | null;
  /** Container dimensions */
  containerWidth: number;
  containerHeight: number;
  /** Current deck.gl view state for coordinate mapping */
  viewState: {
    target: [number, number, number];
    zoom: number;
  };
  /** Theme colors */
  themeColors?: {
    accent?: string;
    border?: string;
  };
}

/**
 * GuideOverlay - Shows format guides overlaid on the visualization
 * 
 * Displays centered guide lines for various standard formats (A4, PowerPoint, etc.)
 * to help users compose and size their visualizations for export.
 */
export const GuideOverlay: React.FC<GuideOverlayProps> = ({
  visible,
  formatPreset,
  containerWidth,
  containerHeight,
  viewState,
  themeColors = {}
}) => {
  if (!visible || !formatPreset || containerWidth <= 0 || containerHeight <= 0) {
    return null;
  }

  // Convert format dimensions to pixels at current DPI
  // For print formats, assume 300 DPI (common for high-quality print)
  // For screen/presentation formats, use pixel dimensions directly
  const dpi = formatPreset.unit === 'mm' ? 300 : 96; // 300 DPI for print, 96 for screen
  const mmToInch = 1 / 25.4;
  
  let formatWidthPx: number;
  let formatHeightPx: number;
  
  if (formatPreset.unit === 'mm') {
    formatWidthPx = formatPreset.width * mmToInch * dpi;
    formatHeightPx = formatPreset.height * mmToInch * dpi;
  } else {
    formatWidthPx = formatPreset.width;
    formatHeightPx = formatPreset.height;
  }

  // Calculate the scale factor to fit the format in the container with some padding
  const padding = 40; // pixels of padding around the guides
  const availableWidth = containerWidth - 2 * padding;
  const availableHeight = containerHeight - 2 * padding;
  
  const scaleX = availableWidth / formatWidthPx;
  const scaleY = availableHeight / formatHeightPx;
  const scale = Math.min(scaleX, scaleY);
  
  // Calculate guide dimensions in container pixels
  const guideWidth = formatWidthPx * scale;
  const guideHeight = formatHeightPx * scale;
  
  // Center the guides in the container
  const left = (containerWidth - guideWidth) / 2;
  const top = (containerHeight - guideHeight) / 2;
  const right = left + guideWidth;
  const bottom = top + guideHeight;

  // Style for guide lines
  const guideLineStyle: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: themeColors.accent || '#0ea5e9',
    opacity: 0.6,
    pointerEvents: 'none',
    zIndex: 1000,
  };

  // Style for corner markers (small squares at corners)
  const cornerSize = 8;
  const cornerStyle: React.CSSProperties = {
    position: 'absolute',
    width: cornerSize,
    height: cornerSize,
    backgroundColor: themeColors.accent || '#0ea5e9',
    opacity: 0.8,
    pointerEvents: 'none',
    zIndex: 1001,
  };

  // Style for format label
  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    top: top - 24,
    left: left,
    color: themeColors.accent || '#0ea5e9',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    pointerEvents: 'none',
    zIndex: 1001,
    whiteSpace: 'nowrap',
  };

  const dimensionsText = formatPreset.unit === 'mm' 
    ? `${formatPreset.width}×${formatPreset.height}mm`
    : `${formatPreset.width}×${formatPreset.height}px`;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
      {/* Format label */}
      <div style={labelStyle}>
        {formatPreset.name} ({dimensionsText})
      </div>
      
      {/* Top horizontal guide */}
      <div 
        style={{
          ...guideLineStyle,
          top: top,
          left: left - 10,
          width: guideWidth + 20,
          height: 1,
        }}
      />
      
      {/* Bottom horizontal guide */}
      <div 
        style={{
          ...guideLineStyle,
          top: bottom,
          left: left - 10,
          width: guideWidth + 20,
          height: 1,
        }}
      />
      
      {/* Left vertical guide */}
      <div 
        style={{
          ...guideLineStyle,
          top: top - 10,
          left: left,
          width: 1,
          height: guideHeight + 20,
        }}
      />
      
      {/* Right vertical guide */}
      <div 
        style={{
          ...guideLineStyle,
          top: top - 10,
          left: right,
          width: 1,
          height: guideHeight + 20,
        }}
      />
      
      {/* Corner markers */}
      <div style={{ ...cornerStyle, top: top - cornerSize/2, left: left - cornerSize/2 }} />
      <div style={{ ...cornerStyle, top: top - cornerSize/2, left: right - cornerSize/2 }} />
      <div style={{ ...cornerStyle, top: bottom - cornerSize/2, left: left - cornerSize/2 }} />
      <div style={{ ...cornerStyle, top: bottom - cornerSize/2, left: right - cornerSize/2 }} />
      
      {/* Optional: Center crosshairs for precise alignment */}
      <div 
        style={{
          ...guideLineStyle,
          top: top + guideHeight / 2,
          left: left + guideWidth / 2 - 10,
          width: 20,
          height: 1,
          opacity: 0.3,
        }}
      />
      <div 
        style={{
          ...guideLineStyle,
          top: top + guideHeight / 2 - 10,
          left: left + guideWidth / 2,
          width: 1,
          height: 20,
          opacity: 0.3,
        }}
      />
    </div>
  );
};

export default GuideOverlay;