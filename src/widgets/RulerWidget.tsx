// RulerWidget.jsx
import React from 'react';
import { DEFAULT_CONFIG } from '../config/visualizationConfig';
import { useTheme } from '@/contexts/ThemeContext';

const RulerWidget = ({
  minX,
  maxX,
  // Accept either a live ref (preferred) or a static viewState prop for
  // backward-compatibility. When a ref is provided the widget will poll it
  // via requestAnimationFrame and re-render itself without causing parent
  // re-renders on every camera change.
  viewState,
  viewStateRef,
  containerWidth,
  containerHeight,
  visible = true,
  genomeView,
  hasNewick = false,
  alignmentReferencePoint = null,
  bounds,
  config = DEFAULT_CONFIG
}) => {
  // Theme context — use resolvedTheme so colors reflect system resolution immediately
  const { getThemeColors, resolvedTheme } = useTheme();
  const themeColors = getThemeColors(resolvedTheme);
  
  if (!visible || !isFinite(minX) || !isFinite(maxX) || maxX <= minX) {
    return null;
  }

  // Local viewState that the ruler reads from. If a viewStateRef is provided
  // the ruler will poll it via RAF and update this local state; otherwise it
  // will use the provided static viewState prop and rely on parent re-renders.
  const [localViewState, setLocalViewState] = React.useState(
    viewStateRef && viewStateRef.current ? viewStateRef.current : (viewState || { target: [0, 0], zoom: 0 })
  );

  // Keep local state in sync when parent passes a non-ref viewState prop
  React.useEffect(() => {
    if (!viewStateRef && viewState) setLocalViewState(viewState);
  }, [viewState, viewStateRef]);

  // RAF polling loop: read value from viewStateRef.current and update
  // local state when it changes. This avoids bubbling camera updates into
  // parent React state, which would cause many re-renders.
  React.useEffect(() => {
    if (!viewStateRef || !visible) return undefined;
    let rafId = null;
    let last = viewStateRef.current;
    const tick = () => {
      const vs = viewStateRef.current;
      if (vs && vs !== last) {
        last = vs;
        setLocalViewState(vs);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [viewStateRef, visible]);

  // Calculate the boundary between tree area and gene area
  // Tree area: from some leftmost point to the leftmost baseline
  // Gene area: from leftmost baseline onwards
  let treeBoundary = null;
  if (bounds && genomeView) {
    // Find the leftmost baseline position (where genes start)
    let leftmostHood = Infinity;
    Object.values(genomeView.nucleotidesBySeqid).forEach(nuc => {
      if (nuc.hood) {
        leftmostHood = Math.min(leftmostHood, Math.min(nuc.hood.start, nuc.hood.end));
      }
    });
    if (isFinite(leftmostHood)) {
      treeBoundary = leftmostHood;
    }
    
    // If treeBoundary is very close to 0 or negative (after alignment), 
    // use the tree's actual rightmost position instead
    if (treeBoundary !== null && treeBoundary <= 50 && genomeView.tree && bounds.treeOffset !== undefined) {
      const treeOffset = bounds.treeOffset || 0;
      const treeXScale = (config.tree && typeof config.tree.xScalePercent === 'number') ? config.tree.xScalePercent / 100 : 1;
      const allTreeYCoords = genomeView.tree.allNodes.map(n => n.y * treeXScale + treeOffset);
      const treeMaxY = Math.max(...allTreeYCoords);
      // Use tree's rightmost position as boundary, ensuring there's space for tree ticks
      treeBoundary = Math.max(treeMaxY + 100, 200); // At least 200 units for tree area
    }
  }

  // Get genome x-scaling factor
  const genomeXScalePercent = (config.genome && typeof config.genome.xScalePercent === 'number') ? config.genome.xScalePercent : 100;
  const genomeXScale = genomeXScalePercent / 100;

  // Detect if alignment is active and calculate alignment offset
  let alignmentOffset = 0;
  let isAlignmentActive = false;
  
  if (genomeView && alignmentReferencePoint !== null && isFinite(alignmentReferencePoint)) {
    // Alignment is active - shift coordinates so alignment point becomes 0
    alignmentOffset = alignmentReferencePoint;
    isAlignmentActive = true;
  }
  
  // Calculate the visible X range based on current view state (use local view state)
  const centerX = localViewState?.target?.[0] || 0;
  const zoom = localViewState?.zoom || 0;
  const scale = Math.pow(2, zoom);
  
  // Calculate visible width in coordinate units
  const visibleWidth = containerWidth / scale;
  let visibleMinX = centerX - visibleWidth / 2;
  let visibleMaxX = centerX + visibleWidth / 2;
  
  // Apply alignment offset to show coordinates relative to alignment point (matching exportToSVG logic exactly)
  let geneVisibleMinX = visibleMinX - (alignmentReferencePoint || 0);
  let geneVisibleMaxX = visibleMaxX - (alignmentReferencePoint || 0);

  // Apply inverse genome scaling to get the coordinate values that should be displayed on ruler
  // When genome is scaled down (e.g., 20%), the visible range appears compressed but should show original coordinates
  const scaledGeneVisibleMinX = geneVisibleMinX / genomeXScale;
  const scaledGeneVisibleMaxX = geneVisibleMaxX / genomeXScale;

  // CONSTRAINT: Limit tick generation to actual gene boundaries
  // Convert gene boundaries to the same coordinate space as the visible range
  const geneBoundaryMinX = (minX - (alignmentReferencePoint || 0)) / genomeXScale;
  const geneBoundaryMaxX = (maxX - (alignmentReferencePoint || 0)) / genomeXScale;
  
  // Constrain the tick range to the intersection of visible range and gene boundaries
  const constrainedMinX = Math.max(scaledGeneVisibleMinX, geneBoundaryMinX);
  const constrainedMaxX = Math.min(scaledGeneVisibleMaxX, geneBoundaryMaxX);
  
  // Ruler dimensions and positioning
  const rulerHeight = config.ruler.height;
  const rulerTop = containerHeight - rulerHeight;
  const tickHeight = config.ruler.tickHeight;
  const labelOffset = config.ruler.labelOffset;
  
  // Generate ticks for gene area (genomic coordinates)
  const generateGeneTicks = (minX, maxX) => {
    // Calculate appropriate tick spacing based on both zoom level and screen space
    const getTickSpacing = (visibleRange) => {
      // Estimate minimum screen pixels needed per tick label to avoid overlap
      // Average character width (~8px) * average digits per label (~4-6) + padding
      const minPixelsPerTick = 60; // Increase minimum spacing to reduce need for filtering
      
      // Calculate how many ticks can fit comfortably on screen
      const maxTicksBasedOnScreen = Math.floor(containerWidth / minPixelsPerTick);
      
      // Use the more restrictive constraint: screen space or original target
      const targetTicks = Math.min(config.ruler.targetTicks, maxTicksBasedOnScreen);
      
      // Ensure we have at least a few ticks but not too many
      const effectiveTargetTicks = Math.max(3, Math.min(targetTicks, 8));
      
      const rawSpacing = visibleRange / effectiveTargetTicks;
      
      // Round to nice numbers (1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, etc.)
      const magnitude = Math.pow(10, Math.floor(Math.log10(rawSpacing)));
      const normalized = rawSpacing / magnitude;
      let niceSpacing;
      if (normalized <= 1) niceSpacing = 1;
      else if (normalized <= 2) niceSpacing = 2;
      else if (normalized <= 5) niceSpacing = 5;
      else niceSpacing = 10;
      
      return niceSpacing * magnitude;
    };

    const tickSpacing = getTickSpacing(maxX - minX);
    
    // --- Generate regular spaced ticks from 0 ---
    // Always ensure ticks are at regular intervals relative to 0
    // This ensures ticks are always at regular intervals (e.g., ..., -2000, -1000, 0, 1000, 2000, ...)
    // regardless of what's currently visible
    
    // Find the range of tick indices that should be visible
    const firstTickIndex = Math.floor(minX / tickSpacing);
    const lastTickIndex = Math.ceil(maxX / tickSpacing);
    let ticks = [];
    
    // Generate ticks at regular intervals relative to 0
    for (let i = firstTickIndex; i <= lastTickIndex; i++) {
      // Always calculate tick position as exact multiple of tickSpacing
      const x = i * tickSpacing;
      
      // Skip if outside the actual range (with small tolerance)
      if (x < minX - tickSpacing * 0.1 || x > maxX + tickSpacing * 0.1) continue;
      // Convert back to scaled coordinate space for screen positioning
      const scaledX = x * genomeXScale;
      const worldX = scaledX + (alignmentReferencePoint || 0);
      const screenX = ((worldX - (centerX - visibleWidth / 2)) / visibleWidth) * containerWidth;
      
      if (screenX >= -2 && screenX <= containerWidth + 2) {
        // When alignment is active, ignore treeBoundary for tick filtering
        // because we want to show negative ticks relative to the alignment reference
        if (treeBoundary === null || isAlignmentActive || worldX >= treeBoundary) {
          ticks.push({ x, screenX, type: 'gene' });
        }
      }
    }
    
    // Always ensure 0 tick is included if alignment is active and 0 is in visible range
    if (isAlignmentActive && minX <= 0 && maxX >= 0) {
      const zeroExists = ticks.some(tick => tick.x === 0);
      if (!zeroExists) {
        // Add 0 tick explicitly
        const scaledX = 0 * genomeXScale;
        const worldX = scaledX + (alignmentReferencePoint || 0);
        const screenX = ((worldX - (centerX - visibleWidth / 2)) / visibleWidth) * containerWidth;
        
        if (screenX >= -2 && screenX <= containerWidth + 2) {
          if (treeBoundary === null || isAlignmentActive || worldX >= treeBoundary) {
            ticks.push({ x: 0, screenX, type: 'gene' });
          }
        }
      }
    }
    // Sort ticks by their x value to ensure correct order (negative to left, positive to right)
    ticks.sort((a, b) => a.x - b.x);
    
    // Light post-processing to remove only extremely close ticks (should be rare now)
    const minScreenDistance = 30; // Reduced minimum distance since we're more conservative
    const filteredTicks = [];
    
    for (let i = 0; i < ticks.length; i++) {
      const currentTick = ticks[i];
      let tooClose = false;
      
      // Check distance to all previously added ticks
      for (let j = 0; j < filteredTicks.length; j++) {
        const existingTick = filteredTicks[j];
        const screenDistance = Math.abs(currentTick.screenX - existingTick.screenX);
        
        if (screenDistance < minScreenDistance) {
          tooClose = true;
          break;
        }
      }
      
      // Always include the 0 tick if it exists and alignment is active
      const isZeroTick = currentTick.x === 0 && isAlignmentActive;
      
      // Also always include ticks that are exact multiples of the tick spacing
      const isRegularTick = Math.abs(currentTick.x % getTickSpacing(maxX - minX)) < 0.0001;
      
      if (!tooClose || isZeroTick || isRegularTick) {
        filteredTicks.push(currentTick);
      }
    }
    
    return filteredTicks;
  };

  // Generate ticks for tree area (phylogenetic scale)
  const generateTreeTicks = () => {
    // Don't show tree ticks if there's no actual newick tree
    if (!hasNewick) return [];
    if (!genomeView || !genomeView.tree) return [];
    if (!treeBoundary || !bounds) return [];
    
    // Tree area extends from the left edge of the view to the treeBoundary
    // Calculate the screen position range for the tree area
    const leftEdgeWorld = centerX - visibleWidth / 2;
    const rightEdgeWorld = treeBoundary;
    
    // Convert tree boundary to screen coordinates
    const treeBoundaryScreen = ((treeBoundary - leftEdgeWorld) / visibleWidth) * containerWidth;
    
    // Only show tree tick if there's meaningful tree area visible
    // Be more lenient when treeBoundary was adjusted for alignment scenarios
    const minTreeAreaWidth = (treeBoundary > leftEdgeWorld + 150) ? 20 : 50;
    if (treeBoundaryScreen < minTreeAreaWidth) {
      return [];
    }
    
    if (genomeView && genomeView.tree) {
      // Get the actual tree coordinates (Y coordinates in tree space represent evolutionary distance)
      const treeOffset = bounds.treeOffset || 0;
      const treeXScale = (config.tree && typeof config.tree.xScalePercent === 'number') ? config.tree.xScalePercent / 100 : 1;
      const allTreeYCoords = genomeView.tree.allNodes.map(n => n.y * treeXScale + treeOffset);
      const treeMinY = Math.min(...allTreeYCoords);
      const treeMaxY = Math.max(...allTreeYCoords);
      
      // Get evolutionary distances from the tree object
      const maxEvolutionaryDistance = genomeView.tree.maxEvolutionaryDistance || 1;
      
      // Calculate which portion of the tree is actually visible
      const visibleTreeMinY = Math.max(treeMinY, leftEdgeWorld);
      const visibleTreeMaxY = Math.min(treeMaxY, rightEdgeWorld);
      
      // If no tree is visible in current view, skip
      if (visibleTreeMinY >= visibleTreeMaxY) {
        return [];
      }
      
      // Convert tree Y coordinates to screen positions
      const convertTreeYToScreen = (treeY) => {
        return ((treeY - leftEdgeWorld) / visibleWidth) * containerWidth;
      };
      
      // Generate ticks based on actual tree coordinate positions
      const ticks = [];
      
      // Determine good tick positions based on visible tree range and screen space
      const visibleTreeRange = visibleTreeMaxY - visibleTreeMinY;
      const treeScreenWidth = treeBoundaryScreen; // Available screen width for tree area
      
      // Calculate adaptive number of ticks based on screen space
      const minPixelsPerTreeTick = 60; // Minimum screen pixels between tree tick centers (wider spacing for scientific notation)
      const maxTicksBasedOnScreen = Math.floor(treeScreenWidth / minPixelsPerTreeTick);
      const baseNumTicks = Math.min(4, Math.max(2, Math.floor(visibleTreeRange / 100))); // One tick per ~100 tree units
      
      const numTicks = Math.min(baseNumTicks, maxTicksBasedOnScreen, 6); // Cap at 6 ticks maximum
      
      for (let i = 0; i < numTicks; i++) {
        // Position ticks at actual tree coordinates
        const treeY = visibleTreeMinY + (i / (numTicks - 1)) * (visibleTreeMaxY - visibleTreeMinY);
        const screenX = convertTreeYToScreen(treeY);
        
        // Convert tree Y coordinate back to evolutionary distance
        // With the new fixed coordinate system: n.y = n.rootDist * (fixedWidth / maxEvolutionaryDistance)
        const fixedWidth = config.tree?.fixedCoordinateWidth || 2000;
        const evolutionaryDist = ((treeY - treeOffset) / treeXScale) * (maxEvolutionaryDistance / fixedWidth);
        
        // Format the evolutionary distance label
        let label;
        if (maxEvolutionaryDistance < 0.001) {
          label = evolutionaryDist.toExponential(1);
        } else if (maxEvolutionaryDistance < 0.01) {
          label = evolutionaryDist.toFixed(3);
        } else if (maxEvolutionaryDistance < 0.1) {
          label = evolutionaryDist.toFixed(2);
        } else if (maxEvolutionaryDistance < 1) {
          label = evolutionaryDist.toFixed(2);
        } else {
          label = evolutionaryDist.toFixed(1);
        }
        
        if (screenX >= 0 && screenX <= treeBoundaryScreen) {
          ticks.push({ 
            x: evolutionaryDist,
            screenX, 
            type: 'tree', 
            label: label,
            isScale: true
          });
        }
      }
      
      // Filter tree ticks that are too close together on screen
      const minTreeScreenDistance = 50; // Minimum pixels between tree tick centers
      const filteredTreeTicks = [];
      
      for (let i = 0; i < ticks.length; i++) {
        const currentTick = ticks[i];
        let tooClose = false;
        
        // Check distance to all previously added ticks
        for (let j = 0; j < filteredTreeTicks.length; j++) {
          const existingTick = filteredTreeTicks[j];
          const screenDistance = Math.abs(currentTick.screenX - existingTick.screenX);
          
          if (screenDistance < minTreeScreenDistance) {
            tooClose = true;
            break;
          }
        }
        
        if (!tooClose) {
          filteredTreeTicks.push(currentTick);
        }
      }
      
      return filteredTreeTicks;
    }
    
    // No tree data - don't show any tree ticks
    return [];
  };

  // Generate all ticks (this should update on every zoom/pan for correct coordinates)
  const geneTicks = generateGeneTicks(constrainedMinX, constrainedMaxX);
  const treeTicks = generateTreeTicks();
  const allTicks = [...geneTicks, ...treeTicks];

  // Format coordinate labels for gene ticks
  const formatCoordinate = (coord) => {
    // Always show sign for negative values, no sign for positive
    if (coord > 0) {
      if (Math.abs(coord) >= 1000000) {
        return `${(coord / 1000000).toFixed(2)}M`;
      } else if (Math.abs(coord) >= 10000) {
        return `${(coord / 1000).toFixed(1)}K`;
      } else if (Math.abs(coord) >= 1000) {
        return `${(coord / 1000).toFixed(1)}K`;
      } else if (Math.abs(coord) >= 100) {
        return `${Math.round(coord)}`;
      } else {
        return `${coord.toFixed(1)}`;
      }
    } else if (coord < 0) {
      if (Math.abs(coord) >= 1000000) {
        return `${(coord / 1000000).toFixed(2)}M`;
      } else if (Math.abs(coord) >= 10000) {
        return `${(coord / 1000).toFixed(1)}K`;
      } else if (Math.abs(coord) >= 1000) {
        return `${(coord / 1000).toFixed(1)}K`;
      } else if (Math.abs(coord) >= 100) {
        return `${Math.round(coord)}`;
      } else {
        return `${coord.toFixed(1)}`;
      }
    } else {
      return '0';
    }
  };

  // Match the UI font stack so ruler labels feel consistent with the rest of the app
  const labelFontFamily = 'var(--font-sans, "Inter", system-ui, -apple-system, "Segoe UI", sans-serif)';
  const labelFontSize = '11px';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: `${rulerHeight}px`,
        backgroundColor: themeColors.rulerBackground || 'rgba(255, 255, 255, 0.95)',
        borderTop: '1px solid #ccc',
        pointerEvents: 'none',
        zIndex: 15,
        overflow: 'hidden'
      }}
    >
      {/* Ruler background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: themeColors.rulerBackground || 'rgba(250, 250, 250, 0.9)'
        }}
      />
      
      {/* Ticks and labels */}
      <svg
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          top: 0,
          left: 0
        }}
      >
        {allTicks.map((tick, index) => {
          return (
            <g key={index}>
              {/* Tick line for gene coordinates only */}
              {tick.type === 'gene' && (
                <line
                  x1={tick.screenX}
                  y1={0}
                  x2={tick.screenX}
                  y2={tickHeight}
                  stroke={themeColors.rulerTicks || "#666"}
                  strokeWidth={1}
                />
              )}            {/* Labels */}
            <text
              x={tick.screenX}
              y={labelOffset}
              textAnchor="middle"
              fontSize={labelFontSize}
              fill={tick.type === 'tree' ? (themeColors.rulerText || "#0066cc") : (themeColors.rulerText || "#333")}
              fontFamily={labelFontFamily}
              fontWeight={tick.type === 'tree' ? 'bold' : 'normal'}
            >
              {tick.type === 'gene' ? formatCoordinate(tick.x) : tick.label}
            </text>
            {/* Small tick marks for evolutionary distance scale */}
            {tick.type === 'tree' && tick.isScale && (
              <line
                x1={tick.screenX}
                y1={0}
                x2={tick.screenX}
                y2={tickHeight / 2}
                stroke={themeColors.rulerTicks || "#0066cc"}
                strokeWidth={1}
              />
            )}
            </g>
          );
        })}
        
        {/* Minor ticks (only for gene area) */}
        {geneTicks.length > 1 && geneTicks.map((tick, index) => {
          if (index < geneTicks.length - 1) {
            const nextTick = geneTicks[index + 1];
            const tickSpacing = nextTick.x - tick.x;
            if (tickSpacing > 20) {
              const nextX = tick.x + tickSpacing / 2;
              // Convert back to scaled coordinate space for screen positioning (matching main tick logic)
              const scaledNextX = nextX * genomeXScale;
              const worldNextX = scaledNextX + (alignmentReferencePoint || 0);
              const nextScreenX = ((worldNextX - (centerX - visibleWidth / 2)) / visibleWidth) * containerWidth;
              if (nextScreenX >= 0 && nextScreenX <= containerWidth) {
                return (
                  <line
                    key={`minor-${index}`}
                    x1={nextScreenX}
                    y1={0}
                    x2={nextScreenX}
                    y2={tickHeight / 2}
                    stroke={themeColors.rulerTicks || "#999"}
                    strokeWidth={0.5}
                  />
                );
              }
            }
          }
          return null;
        })}
      </svg>
      
      {/* Coordinate range indicator (only for gene area) */}
      {/* REMOVED: visible window and alignment/scale status text */}
      
    </div>
  );
};

export default RulerWidget;
