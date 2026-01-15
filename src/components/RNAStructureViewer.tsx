import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Badge } from './ui/badge';
import { ZoomIn, ZoomOut, RotateCcw, Move, Maximize2, X } from 'lucide-react';
import { naviewXyCoordinates } from '../utils/naview';

interface RNAStructureViewerProps {
  sequence: string;
  dotBracket: string;
  onClose?: () => void;
}

// ============================================================================
// RNA UTILITIES - Convert dot-bracket to pair table
// ============================================================================

function dotbracketToPairtable(dotbracket: string): number[] {
  const pt: number[] = new Array(dotbracket.length + 1).fill(0);
  pt[0] = dotbracket.length;

  const bracketLeft = "([{<ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const bracketRight = ")]}>abcdefghijklmnopqrstuvwxyz".split("");

  const inverseBracketLeft: Record<string, number> = {};
  const inverseBracketRight: Record<string, number> = {};

  bracketLeft.forEach((b, i) => { inverseBracketLeft[b] = i; });
  bracketRight.forEach((b, i) => { inverseBracketRight[b] = i; });

  const stack: number[][] = [];
  for (let i = 0; i < bracketLeft.length; i++) {
    stack[i] = [];
  }

  for (let i = 0; i < dotbracket.length; i++) {
    const a = dotbracket[i];
    const ni = i + 1;

    if (a === '.' || a === 'o') {
      pt[ni] = 0;
    } else if (a in inverseBracketLeft) {
      stack[inverseBracketLeft[a]].push(ni);
    } else if (a in inverseBracketRight) {
      const j = stack[inverseBracketRight[a]].pop();
      if (j !== undefined) {
        pt[ni] = j;
        pt[j] = ni;
      }
    }
  }

  return pt;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * RNAStructureViewer: Visualizes RNA secondary structure using SVG
 * Uses NAview-inspired layout algorithm
 */
export const RNAStructureViewer: React.FC<RNAStructureViewerProps> = ({
  sequence,
  dotBracket,
  onClose
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Zoom and pan state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [translateStart, setTranslateStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  // Nucleotide colors
  const nucleotideColors: Record<string, string> = {
    'A': '#E74C3C', // Red
    'U': '#3498DB', // Blue
    'G': '#27AE60', // Green
    'C': '#F39C12', // Orange
    'T': '#3498DB', // Blue (same as U for DNA)
  };

  // Smooth zoom handlers
  const handleZoomIn = useCallback(() => {
    setScale(s => Math.min(s * 1.3, 20));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(s => Math.max(s / 1.3, 0.2));
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom centered on cursor (map-like behavior)
  const handleWheel = useCallback((e: React.WheelEvent, vbWidth: number, vbHeight: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    
    // Calculate effective scale considering preserveAspectRatio="xMidYMid meet"
    const containerAspect = rect.width / rect.height;
    const viewBoxAspect = vbWidth / vbHeight;
    let effectiveScale;
    if (containerAspect > viewBoxAspect) {
      effectiveScale = rect.height / vbHeight;
    } else {
      effectiveScale = rect.width / vbWidth;
    }
    
    // Mouse position in viewBox coordinates
    const mouseVBx = (e.clientX - rect.left - rect.width / 2) / effectiveScale + vbWidth / 2;
    const mouseVBy = (e.clientY - rect.top - rect.height / 2) / effectiveScale + vbHeight / 2;
    
    // Zoom factor
    const zoomIntensity = 0.002;
    const delta = -e.deltaY * zoomIntensity;
    const zoomFactor = Math.exp(delta);
    
    const newScale = Math.min(Math.max(scale * zoomFactor, 0.2), 20);
    
    // World position under cursor: (mouseVB - translate) / scale
    const worldX = (mouseVBx - translate.x) / scale;
    const worldY = (mouseVBy - translate.y) / scale;
    
    // Keep same world point under cursor after zoom
    // mouseVB = world * newScale + newTranslate
    const newTranslateX = mouseVBx - worldX * newScale;
    const newTranslateY = mouseVBy - worldY * newScale;
    
    setScale(newScale);
    setTranslate({ x: newTranslateX, y: newTranslateY });
  }, [scale, translate]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setTranslateStart(translate);
    }
  }, [translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent, vbWidth: number, vbHeight: number) => {
    if (!isPanning) return;
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    
    // Calculate effective scale considering preserveAspectRatio="xMidYMid meet"
    const containerAspect = rect.width / rect.height;
    const viewBoxAspect = vbWidth / vbHeight;
    let effectiveScale;
    if (containerAspect > viewBoxAspect) {
      // Height is limiting factor
      effectiveScale = rect.height / vbHeight;
    } else {
      // Width is limiting factor
      effectiveScale = rect.width / vbWidth;
    }
    
    // Convert pixel delta to viewBox delta - always 1:1 visual regardless of zoom
    const dx = (e.clientX - panStart.x) / effectiveScale;
    const dy = (e.clientY - panStart.y) / effectiveScale;
    
    setTranslate({
      x: translateStart.x + dx,
      y: translateStart.y + dy
    });
  }, [isPanning, panStart, translateStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Fullscreen toggle using native browser API
  const toggleFullscreen = useCallback(() => {
    if (!fullscreenContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      fullscreenContainerRef.current.requestFullscreen();
    }
  }, []);

  // Track fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Calculate layout using NAView algorithm (from fornac)
  const layout = useMemo(() => {
    if (!sequence || !dotBracket) return null;

    try {
      // Ensure sequence and structure have same length
      const cleanSeq = sequence.replace(/\s/g, '').toUpperCase();
      const cleanStruct = dotBracket.replace(/\s/g, '');

      if (cleanSeq.length !== cleanStruct.length) {
        setError(`Length mismatch: sequence (${cleanSeq.length}) vs structure (${cleanStruct.length})`);
        return null;
      }

      const pairtable = dotbracketToPairtable(cleanStruct);
      
      // Use the NAView algorithm from fornac
      const positions = naviewXyCoordinates(pairtable);

      // Calculate bounding box
      const minX = Math.min(...positions.x);
      const maxX = Math.max(...positions.x);
      const minY = Math.min(...positions.y);
      const maxY = Math.max(...positions.y);

      const padding = 30;
      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding * 2;

      // Normalize positions
      const normalizedX = positions.x.map(px => px - minX + padding);
      const normalizedY = positions.y.map(py => py - minY + padding);

      // Build links
      const backboneLinks: { x1: number; y1: number; x2: number; y2: number }[] = [];
      const basepairLinks: { x1: number; y1: number; x2: number; y2: number }[] = [];

      for (let i = 0; i < cleanSeq.length - 1; i++) {
        // Backbone link
        backboneLinks.push({
          x1: normalizedX[i],
          y1: normalizedY[i],
          x2: normalizedX[i + 1],
          y2: normalizedY[i + 1]
        });
      }

      for (let i = 1; i <= pairtable[0]; i++) {
        if (pairtable[i] > i) {
          basepairLinks.push({
            x1: normalizedX[i - 1],
            y1: normalizedY[i - 1],
            x2: normalizedX[pairtable[i] - 1],
            y2: normalizedY[pairtable[i] - 1]
          });
        }
      }

      // Build nodes
      const nodes = cleanSeq.split('').map((nuc, i) => ({
        x: normalizedX[i],
        y: normalizedY[i],
        name: nuc,
        color: nucleotideColors[nuc] || '#888888',
        index: i + 1
      }));

      setError(null);
      return { nodes, backboneLinks, basepairLinks, width, height };
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [sequence, dotBracket]);

  if (error) {
    return (
      <div className="p-3 bg-muted rounded text-xs text-red-500">
        Error: {error}
      </div>
    );
  }

  if (!layout) {
    return (
      <div className="p-3 bg-muted rounded text-xs text-muted-foreground">
        Unable to render structure
      </div>
    );
  }

  const viewBoxWidth = Math.max(300, layout.width);
  const viewBoxHeight = Math.max(200, layout.height);

  // Reusable viewer content
  const ViewerContent = ({ fullscreen = false }: { fullscreen?: boolean }) => (
    <div 
      ref={containerRef}
      className={`rounded border border-border bg-muted overflow-hidden relative ${fullscreen ? 'flex-1' : ''}`}
      style={{ 
        maxHeight: fullscreen ? undefined : '240px',
        height: fullscreen ? '100%' : '240px',
        cursor: isPanning ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      onWheel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleWheel(e, viewBoxWidth, viewBoxHeight);
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => handleMouseMove(e, viewBoxWidth, viewBoxHeight)}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full h-full"
        style={{ minHeight: fullscreen ? '100%' : '240px', maxHeight: fullscreen ? '100%' : '240px' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Transform: translate first, then scale - zoom expands distances between nodes */}
        <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
          {/* Base pair links (dashed) - size scales slower than distance */}
          {layout.basepairLinks.map((link, i) => (
            <line
              key={`bp-${i}`}
              x1={link.x1}
              y1={link.y1}
              x2={link.x2}
              y2={link.y2}
              className="stroke-muted-foreground"
              strokeWidth={1 / Math.sqrt(scale)}
              strokeDasharray={`${3 / Math.sqrt(scale)},${2 / Math.sqrt(scale)}`}
              opacity="0.5"
            />
          ))}

          {/* Backbone links (solid) - size scales slower than distance */}
          {layout.backboneLinks.map((link, i) => (
            <line
              key={`bb-${i}`}
              x1={link.x1}
              y1={link.y1}
              x2={link.x2}
              y2={link.y2}
              className="stroke-foreground"
              strokeWidth={1.5 / Math.sqrt(scale)}
              opacity="0.7"
            />
          ))}

          {/* Nucleotide nodes - size scales slower than distance for "spreading" effect */}
          {layout.nodes.map((node, i) => (
            <g key={`node-${i}`}>
              <circle
                cx={node.x}
                cy={node.y}
                r={8 / Math.sqrt(scale)}
                fill={node.color}
                className="stroke-background"
                strokeWidth={1.5 / Math.sqrt(scale)}
              />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={8 / Math.sqrt(scale)}
                fontWeight="bold"
                fill="white"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {node.name}
              </text>
            </g>
          ))}
        </g>
      </svg>
      {/* Help text */}
      <div className="absolute bottom-0.5 left-1 text-[10px] text-muted-foreground opacity-50 pointer-events-none">
        <Move className="w-2.5 h-2.5 inline mr-0.5" />pan • scroll to zoom
      </div>
    </div>
  );

  // Controls bar component
  const ControlsBar = () => (
    <div className="flex items-center justify-between">
      <Badge variant="outline" className="text-[10px] py-0 px-1">
        2D Structure
      </Badge>
      {/* Zoom controls */}
      <div className="flex items-center gap-0">
        <button
          onClick={handleZoomIn}
          className="p-0.5 rounded hover:bg-muted transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-3 h-3" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-0.5 rounded hover:bg-muted transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-3 h-3" />
        </button>
        <button
          onClick={handleReset}
          className="p-0.5 rounded hover:bg-muted transition-colors"
          title="Reset view"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
        <span className="text-[10px] text-muted-foreground w-7 text-right">{Math.round(scale * 100)}%</span>
        <button
          onClick={toggleFullscreen}
          className="p-0.5 rounded hover:bg-muted transition-colors"
          title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
        >
          {isFullscreen ? <X className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );

  return (
    <div 
      ref={fullscreenContainerRef}
      className={`space-y-1 ${isFullscreen ? 'bg-background p-4 flex flex-col h-full' : ''}`}
    >
      <ControlsBar />
      <ViewerContent fullscreen={isFullscreen} />
      {/* Legend - very compact single line */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        {Object.entries(nucleotideColors).filter(([k]) => k !== 'T').map(([nuc, color]) => (
          <span key={nuc} className="flex items-center gap-0.5">
            <span className="rounded-full w-2 h-2 inline-block" style={{ backgroundColor: color }} />
            {nuc}
          </span>
        ))}
        <span className="flex items-center gap-0.5">
          <span className="w-2 h-0.5 bg-foreground opacity-70 inline-block" />
          bb
        </span>
        <span className="flex items-center gap-0.5">
          <span className="w-2 h-px border-t border-dashed border-muted-foreground inline-block" />
          bp
        </span>
      </div>
    </div>
  );
};

export default RNAStructureViewer;
