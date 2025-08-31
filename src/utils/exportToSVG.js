// Utility to convert color array to SVG color string (Illustrator-compatible)
import { DEFAULT_CONFIG } from '../config/visualizationConfig';

function colorToStr(cArr, forceOpacity = false){
  if(!cArr)return 'none';
  const[r,g,b,a=255]=cArr;
  if(a===0)return 'none';
  
  // For Illustrator compatibility, use separate fill-opacity attribute instead of rgba()
  if(a < 255 && !forceOpacity) {
    return `rgb(${r},${g},${b})`;
  }
  if(a<255)return `rgba(${r},${g},${b},${a/255})`;
  return `rgb(${r},${g},${b})`;
}

// Get opacity value for separate opacity attribute (Illustrator-compatible)
function getOpacity(cArr) {
  if(!cArr) return 1;
  const[r,g,b,a=255]=cArr;
  return a / 255;
}

function normalise(value,min,max){
  return (max===min)?0.5:(value - min)/(max - min);
}

export function exportToSVG(layers, viewState, containerSize, config, rulerOptions, themeColors = {}, textScale = 5, nodeScale = 1) {
  console.log('🖼️ exportToSVG called with:', { layers: layers?.length, viewState, containerSize, config: !!config, textScale, nodeScale });
  
  const { width, height } = containerSize;
  if (!width || !height) {
    console.error('❌ SVG Export failed: Invalid container size', { width, height });
    return;
  }
  const scale = Math.pow(2, viewState.zoom || 0);
  const centerX = viewState.target[0];
  const centerY = viewState.target[1];
  const halfW = width / (2 * scale);
  const halfH = height / (2 * scale);
  const min_x = centerX - halfW;
  const max_x = centerX + halfW;
  const min_y = centerY - halfH;
  const max_y = centerY + halfH;
  const viewBounds = { min_x, max_x, min_y, max_y };
  const applyBounds = (point) => {
    const x = normalise(point[0], min_x, max_x) * width;
    // Flip Y axis for SVG export to match DeckGL rendering
    const y = (1 - normalise(point[1], min_y, max_y)) * height;
    return [x, y];
  };
  // World -> pixel conversion (pixels per world unit along X).
  // Use viewport mapping: width pixels spans (max_x - min_x) world units.
  const worldSpan = Math.max(1e-9, (max_x - min_x));
  // textScale/nodeScale allow tuning how many screen pixels correspond to one world unit
  // Default textScale is 5 (matches text), nodeScale defaults to 1 and can be used to boost/shrink nodes.
  const basePixelsPerWorld = width / worldSpan;
  const textScaleFactor = (typeof textScale === 'number' && isFinite(textScale) && textScale > 0) ? textScale : 1;
  const nodeScaleFactor = (typeof nodeScale === 'number' && isFinite(nodeScale) && nodeScale > 0) ? nodeScale : 1;
  const worldToPixelText = basePixelsPerWorld * textScaleFactor;
  const worldToPixelNode = basePixelsPerWorld * nodeScaleFactor;
  // Clamp a world-space point to the current view bounds so exported geometry doesn't extend outside viewport
  // Helper: bbox of world points
  const bboxOfPoints = (pts) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
      maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
    }
    return { minX, minY, maxX, maxY };
  };

  // Liang-Barsky line clipping in world coordinates against rect
  const liangBarsky = (x0, y0, x1, y1, xmin, xmax, ymin, ymax) => {
    let t0 = 0, t1 = 1;
    const dx = x1 - x0, dy = y1 - y0;
    const checks = [
      { p: -dx, q: x0 - xmin }, // left
      { p:  dx, q: xmax - x0 }, // right
      { p: -dy, q: y0 - ymin }, // bottom
      { p:  dy, q: ymax - y0 }  // top
    ];
    for (const c of checks) {
      const { p, q } = c;
      if (p === 0) {
        if (q < 0) return null; // parallel and outside
      } else {
        const r = q / p;
        if (p < 0) {
          if (r > t1) return null;
          if (r > t0) t0 = r;
        } else {
          if (r < t0) return null;
          if (r < t1) t1 = r;
        }
      }
    }
    return [x0 + dx * t0, y0 + dy * t0, x0 + dx * t1, y0 + dy * t1];
  };

  // Clip polyline (array of points) to rect by clipping each segment and concatenating
  const clipPolylineToRect = (pts, xmin, xmax, ymin, ymax) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i+1];
      const seg = liangBarsky(a[0], a[1], b[0], b[1], xmin, xmax, ymin, ymax);
      if (seg) {
        const [cx0, cy0, cx1, cy1] = seg;
        if (out.length === 0) {
          out.push([cx0, cy0]);
        } else {
          const last = out[out.length - 1];
          if (Math.abs(last[0] - cx0) > 1e-6 || Math.abs(last[1] - cy0) > 1e-6) {
            out.push([cx0, cy0]);
          }
        }
        out.push([cx1, cy1]);
      }
    }
    return out;
  };

  // Sutherland-Hodgman polygon clipping to rect (world coords)
  const clipPolygonToRect = (poly, xmin, xmax, ymin, ymax) => {
    const clipAgainst = (pts, edge) => {
      const res = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const aIn = edge(a);
        const bIn = edge(b);
        if (aIn && bIn) {
          res.push(b);
        } else if (aIn && !bIn) {
          // leaving: add intersection
          const ip = intersect(a, b, edge);
          if (ip) res.push(ip);
        } else if (!aIn && bIn) {
          // entering: add intersection then b
          const ip = intersect(a, b, edge);
          if (ip) res.push(ip);
          res.push(b);
        }
      }
      return res;
    };
    const intersect = (a, b, edge) => {
      const x1 = a[0], y1 = a[1], x2 = b[0], y2 = b[1];
      const dx = x2 - x1, dy = y2 - y1;
      // determine which edge and compute intersection accordingly
      if (edge === left) {
        const x = xmin; const t = (x - x1) / dx; return [x, y1 + dy * t];
      }
      if (edge === right) {
        const x = xmax; const t = (x - x1) / dx; return [x, y1 + dy * t];
      }
      if (edge === bottom) {
        const y = ymin; const t = (y - y1) / dy; return [x1 + dx * t, y];
      }
      if (edge === top) {
        const y = ymax; const t = (y - y1) / dy; return [x1 + dx * t, y];
      }
      return null;
    };
    const left = (p) => p[0] >= xmin;
    const right = (p) => p[0] <= xmax;
    const bottom = (p) => p[1] >= ymin;
    const top = (p) => p[1] <= ymax;
    let out = poly.slice();
    out = clipAgainst(out, left);
    if (!out.length) return [];
    out = clipAgainst(out, right);
    if (!out.length) return [];
    out = clipAgainst(out, bottom);
    if (!out.length) return [];
    out = clipAgainst(out, top);
    return out;
  };
  // Helpers to avoid rendering things entirely outside the SVG viewport
  const isPointOnScreen = (p) => (p[0] >= -1 && p[0] <= width + 1 && p[1] >= -1 && p[1] <= height + 1);
  const isBBoxOnScreen = (pts) => {
    if (!pts || pts.length === 0) return false;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
      maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
    }
    return !(maxX < 0 || maxY < 0 || minX > width || minY > height);
  };
  let svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>`;
  
  // Add background rectangle with theme background color
  const backgroundColor = themeColors.background || '#ffffff';
  svg += `<rect width='${width}' height='${height}' fill='${backgroundColor}'/>`;
  for(const layer of layers) {
    const props = layer.props;
    // Polygon layers (genes, protein-polygons, nucleotide-polygons, domains, regions, ncRNA)
    if(layer.id === 'genes' || layer.id === 'protein-polygons' || layer.id === 'nucleotide-polygons' || layer.id === 'domains' || layer.id === 'region-polygons' || layer.id === 'ncrna-features') {
      for(const feature of props.data) {
        const polygon = props.getPolygon(feature);
        const fillColor = props.getFillColor(feature);
        // Only genes, domains, regions, and ncRNAs have a stroke, others should have no stroke
        let lineColor = [0,0,0,255];
        let strokeAttr = 'none';
        let strokeWidth = 1;
        if (layer.id === 'genes' || layer.id === 'ncrna-features') {
          if (typeof props.getLineColor === 'function') {
            lineColor = props.getLineColor(feature);
          } else if (Array.isArray(props.getLineColor)) {
            lineColor = props.getLineColor;
          }
          const stroke = colorToStr(lineColor);
          strokeAttr = (lineColor[3] === 0 || stroke === 'none') ? 'none' : stroke;
          strokeWidth = config?.gene?.edgeWidth || 1;
        } else if (layer.id === 'domains') {
          lineColor = themeColors.text || config?.colors?.black || [0,0,0,255];
          strokeAttr = colorToStr(lineColor);
          strokeWidth = config?.domain?.edgeWidth || 1;
        } else if (layer.id === 'region-polygons') {
          if (typeof props.getLineColor === 'function') {
            lineColor = props.getLineColor(feature);
          } else if (Array.isArray(props.getLineColor)) {
            lineColor = props.getLineColor;
          }
          strokeAttr = colorToStr(lineColor);
          strokeWidth = feature.strokeWidth || config?.region?.strokeWidth || 2;
        }
        
  const fill = colorToStr(fillColor);
  const fillOpacity = getOpacity(fillColor);
  const strokeOpacity = getOpacity(lineColor);
  
  // clip polygon in world coords first
  const clippedPoly = clipPolygonToRect(polygon, min_x, max_x, min_y, max_y);
  if (!clippedPoly || clippedPoly.length === 0) continue;
  const pathPoints = clippedPoly.map(p => applyBounds(p));
  let d = pathPoints.map((p,i) => i===0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`).join(' ') + 'Z';
  
  // Build opacity attributes for Illustrator compatibility
  let opacityAttrs = '';
  if (fillOpacity < 1) opacityAttrs += ` fill-opacity='${fillOpacity}'`;
  if (strokeOpacity < 1) opacityAttrs += ` stroke-opacity='${strokeOpacity}'`;
  
  svg += `<path d='${d}' fill='${fill}' stroke='${strokeAttr}' stroke-width='${strokeWidth}'${opacityAttrs}/>`;
      }
    }
    // Path/Line layers (tree, baselines, etc.)
    if(layer.id === 'phylo-tree' || layer.id === 'baselines') {
      for(const feature of props.data) {
        let path = [];
        if (typeof props.getPath === 'function') {
          path = props.getPath(feature);
        } else if (Array.isArray(props.getPath)) {
          path = props.getPath;
        }
        
        // Handle color robustly
        let color = [0,0,0,255]; // default
        if (feature.color) {
          color = feature.color;
        } else if (props.getColor) {
          if (typeof props.getColor === 'function') {
            try {
              color = props.getColor(feature);
            } catch (e) {
              color = props.getColor();
            }
          } else if (Array.isArray(props.getColor)) {
            color = props.getColor;
          }
        }
        
  const stroke = colorToStr(color);
  // clip path (polyline) in world coords
  const clippedPath = clipPolylineToRect(path, min_x, max_x, min_y, max_y);
  if (!clippedPath || clippedPath.length === 0) continue;
  const pathPoints = clippedPath.map(p => applyBounds(p));
  const d = pathPoints.map((p,i) => i===0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`).join(' ');
  svg += `<path d='${d}' fill='none' stroke='${stroke}' stroke-width='1'/>`;
      }
    }
    // LineLayer (connecting lines only, no per-leaf tree-ticks)
    if(layer.id === 'connecting-lines') {
      for(const feature of props.data) {
        const sourcePos = feature.sourcePosition || (props.getSourcePosition ? props.getSourcePosition(feature) : [0,0]);
        const targetPos = feature.targetPosition || (props.getTargetPosition ? props.getTargetPosition(feature) : [0,0]);
        // Handle color - can be feature property, function result, or static array
        let color = [0,0,0,255]; // default
        if (feature.color) {
          color = feature.color;
        } else if (props.getColor) {
          if (typeof props.getColor === 'function') {
            try {
              color = props.getColor(feature);
            } catch (e) {
              try {
                color = props.getColor();
              } catch (e2) {
                color = [0,0,0,255];
              }
            }
          } else if (Array.isArray(props.getColor)) {
            color = props.getColor;
          }
        }
        // Handle width - can be feature property, function result, or static value
        let width = 1; // default
        if (feature.width) {
          width = feature.width;
        } else if (props.getWidth) {
          if (typeof props.getWidth === 'function') {
            try {
              width = props.getWidth(feature);
            } catch (e) {
              try {
                width = props.getWidth();
              } catch (e2) {
                width = 1;
              }
            }
          } else {
            width = props.getWidth;
          }
        }
        const stroke = colorToStr(color);
  // clip connecting line in world coords
  const clippedSeg = liangBarsky(sourcePos[0], sourcePos[1], targetPos[0], targetPos[1], min_x, max_x, min_y, max_y);
  if (!clippedSeg) continue;
  const [cx0, cy0, cx1, cy1] = clippedSeg;
  const [x1, y1] = applyBounds([cx0, cy0]);
  const [x2, y2] = applyBounds([cx1, cy1]);
  svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" />`;
      }
    }
    // ScatterplotLayer (tree nodes)
    if(layer.id === 'nodes') {
      for(const feature of props.data) {
        const pos = feature.position || (props.getPosition ? props.getPosition(feature) : [0,0]);
        const fillColor = feature.color || (props.getFillColor ? props.getFillColor(feature) : [0,0,0,255]);
        const radius = feature.radius || (props.getRadius ? props.getRadius(feature) : 5);
  const [x, y] = applyBounds(pos);
  // skip nodes off-screen
  if (!isPointOnScreen([x, y])) continue;
  const fill = colorToStr(fillColor);
  // Convert logical radius to screen pixels using worldToPixel.
  // Always convert by worldToPixel so exported radii follow the current view zoom.
  // Apply nodeScale to allow independent tuning of node circle size in exports
  // Use worldToPixelNode for node radius conversion and do not clamp to a minimum
  const screenRadius = (radius || 1) * worldToPixelNode;
  svg += `<circle cx="${x}" cy="${y}" r="${screenRadius}" fill="${fill}" />`;
      }
    }    // TextLayer (labels)
    if(layer.id === 'phylo-labels' || layer.id === 'gene-labels' || layer.id === 'scale-labels') {
      for(const feature of props.data) {
        const pos = feature.position || (props.getPosition ? (typeof props.getPosition === 'function' ? props.getPosition(feature) : props.getPosition) : [0,0]);
        const text = feature.text || (props.getText ? (typeof props.getText === 'function' ? props.getText(feature) : props.getText) : '');
        const color = feature.color || (props.getColor ? (typeof props.getColor === 'function' ? props.getColor(feature) : props.getColor) : [0,0,0,255]);
        const size = feature.size || (props.getSize ? (typeof props.getSize === 'function' ? props.getSize(feature) : props.getSize) : 14);
        const fill = colorToStr(color);
        const textOpacity = getOpacity(color);
  let [x, y] = applyBounds(pos);
  // skip text off-screen
  if (!isPointOnScreen([x, y])) continue;
        const textAnchor = feature.textAnchor || (props.getTextAnchor ? (typeof props.getTextAnchor === 'function' ? props.getTextAnchor(feature) : props.getTextAnchor) : 'start');

        // Handle pixelOffset if present
        let pixelOffset = feature.pixelOffset;
        if (pixelOffset === undefined && props.getPixelOffset) {
          if (typeof props.getPixelOffset === 'function') {
            pixelOffset = props.getPixelOffset(feature);
          } else if (Array.isArray(props.getPixelOffset)) {
            pixelOffset = props.getPixelOffset;
          }
        }
        if (Array.isArray(pixelOffset) && pixelOffset.length === 2) {
          x += pixelOffset[0];
          y += pixelOffset[1];
        }
        
        // Determine the correct dominant-baseline based on layer type and feature properties
  // Determine font-size in screen pixels by converting size (logical/world units) using worldToPixel.
  // This avoids double-scaling and keeps exported text visually consistent with on-screen rendering.
  // Convert text size (logical/world units) to screen pixels using worldToPixelText so text scales with zoom.
  const proportionalSize = Math.max(0.1, (size || 12) * worldToPixelText);
        
        // Illustrator-compatible text positioning
        let dominantBaseline = 'alphabetic'; // More reliable baseline for Illustrator
        let dyOffset = 0; // Manual Y offset for better positioning
        
        if (layer.id === 'phylo-labels') {
          dominantBaseline = 'middle'; // Use middle for centered text
          dyOffset = 0;
        } else if (layer.id === 'gene-labels') {
          // Gene labels: positioned below genes, so use hanging baseline
          const alignmentBaseline = feature.alignmentBaseline || (props.getAlignmentBaseline ? (typeof props.getAlignmentBaseline === 'function' ? props.getAlignmentBaseline(feature) : props.getAlignmentBaseline) : 'top');
          if (alignmentBaseline === 'top') {
            dominantBaseline = 'hanging';
            dyOffset = proportionalSize * 0.2; // Small offset for better visual alignment
          } else {
            dominantBaseline = 'middle';
            dyOffset = 0;
          }
        }
        
        // Handle background for phylo labels when enabled
        if (layer.id === 'phylo-labels' && props.background) {
          let backgroundColor = [255, 255, 255, 255]; // default white background
          if (props.getBackgroundColor) {
            if (typeof props.getBackgroundColor === 'function') {
              backgroundColor = props.getBackgroundColor(feature);
            } else if (Array.isArray(props.getBackgroundColor)) {
              backgroundColor = props.getBackgroundColor;
            }
          }
          const backgroundPadding = props.backgroundPadding || [2, 1, 2, 1]; // [left, top, right, bottom]
          const backgroundFill = colorToStr(backgroundColor);
          
          // Estimate text dimensions (rough approximation)
          const textWidth = text.length * proportionalSize * 0.6; // rough character width
          const textHeight = proportionalSize;
          
          // Calculate background rectangle dimensions with padding
          const rectX = x - backgroundPadding[0] - (textAnchor === 'middle' ? textWidth / 2 : textAnchor === 'end' ? textWidth : 0);
          const rectY = y - textHeight / 2 - backgroundPadding[1];
          const rectWidth = textWidth + backgroundPadding[0] + backgroundPadding[2];
          const rectHeight = textHeight + backgroundPadding[1] + backgroundPadding[3];
          
          svg += `<rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="${backgroundFill}" />`;
        }
        
        // Apply Y offset for better Illustrator compatibility
        const adjustedY = y + dyOffset;
        
        // Add opacity attribute for Illustrator compatibility
        const opacityAttr = textOpacity < 1 ? ` fill-opacity="${textOpacity}"` : '';
        
        svg += `<text x="${x}" y="${adjustedY}" fill="${fill}"${opacityAttr} font-size="${proportionalSize}px" font-family="sans-serif" text-anchor="${textAnchor}" dominant-baseline="${dominantBaseline}">${text}</text>`;
      }
    }
  }
  // --- RULER SVG EXPORT ---
  if (rulerOptions && rulerOptions.config && typeof rulerOptions.width === 'number' && typeof rulerOptions.height === 'number') {
    // Use precomputed ticks from rulerOptions if available
    const { minX, maxX, config: rulerConfig, viewState: rulerViewState, alignmentReferencePoint, bounds, genomeView, precomputedTicks } = rulerOptions;
    // avoid shadowing main svg width/height
    const rulerWidth = rulerOptions.width;
    const rulerHeightLocal = rulerOptions.height;
    const configToUse = rulerConfig || config;
    // If precomputed ticks are provided (from RulerWidget), use them directly
    if (precomputedTicks && Array.isArray(precomputedTicks)) {
      const geneTickColor = themeColors.text || (themeColors.background === '#ffffff' ? '#666' : '#aaa');
      const geneLabelColor = themeColors.text || (themeColors.background === '#ffffff' ? '#333' : '#ccc');
      const treeTickColor = themeColors.text || (themeColors.background === '#ffffff' ? '#666' : '#aaa');
  const _rulerHeight = configToUse.ruler.height;
  const _rulerTop = rulerHeightLocal - _rulerHeight;
      const _tickHeight = configToUse.ruler.tickHeight;
      const _labelOffset = configToUse.ruler.labelOffset;
  svg += `<rect x='0' y='${_rulerTop}' width='${rulerWidth}' height='${_rulerHeight}' fill='${themeColors.background || '#ffffff'}' stroke='${themeColors.background === '#ffffff' ? '#ccc' : '#555'}' stroke-width='1'/>`;
      // Main ticks and labels — filter out invalid/infinite/out-of-range ticks
      const validPreTicks = precomputedTicks.filter(t => {
        if (!t || !t.type) return false;
        if (t.type === 'gene') {
          // require finite coordinate and screenX
          if (typeof t.x !== 'number' || !isFinite(t.x)) return false;
          if (typeof t.screenX !== 'number' || !isFinite(t.screenX)) return false;
          if (t.screenX < -1 || t.screenX > rulerWidth + 1) return false;
          // If minX/maxX (gene bounds) are provided in rulerOptions, enforce them
          if (typeof minX === 'number' && typeof maxX === 'number') {
            if (t.x < minX || t.x > maxX) return false;
          }
          return true;
        }
        if (t.type === 'tree') {
          return (typeof t.screenX === 'number' && isFinite(t.screenX) && t.screenX >= -1 && t.screenX <= rulerWidth + 1);
        }
        return false;
      });
      for (const tick of validPreTicks) {
        if (tick.type === 'gene') {
          svg += `<line x1='${tick.screenX}' y1='${_rulerTop}' x2='${tick.screenX}' y2='${_rulerTop + _tickHeight}' stroke='${geneTickColor}' stroke-width='1'/>`;
          svg += `<text x='${tick.screenX}' y='${_rulerTop + _labelOffset}' text-anchor='middle' font-size='11px' fill='${geneLabelColor}' font-family='Helvetica, Arial, sans-serif'>${formatCoordinate(tick.x)}</text>`;
        } else if (tick.type === 'tree' && tick.isScale) {
          svg += `<line x1='${tick.screenX}' y1='${_rulerTop}' x2='${tick.screenX}' y2='${_rulerTop + _tickHeight / 2}' stroke='${treeTickColor}' stroke-width='1'/>`;
          svg += `<text x='${tick.screenX}' y='${_rulerTop + _labelOffset}' text-anchor='middle' font-size='11px' fill='${treeTickColor}' font-family='Helvetica, Arial, sans-serif' font-weight='bold'>${tick.label}</text>`;
        }
      }
      // --- Minor ticks (only for gene area) ---
      const geneTicks = validPreTicks.filter(t => t.type === 'gene');
      if (geneTicks.length > 1) {
        for (let i = 0; i < geneTicks.length - 1; i++) {
          const tick = geneTicks[i];
          const nextTick = geneTicks[i + 1];
          const tickSpacing = nextTick.x - tick.x;
          if (tickSpacing > 20) { // Only if spacing is large enough
            const nextX = tick.x + tickSpacing / 2;
            const nextScreenX = tick.screenX + (nextTick.screenX - tick.screenX) / 2;
            if (nextScreenX >= 0 && nextScreenX <= rulerWidth) {
              svg += `<line x1='${nextScreenX}' y1='${_rulerTop}' x2='${nextScreenX}' y2='${_rulerTop + _tickHeight / 2}' stroke='${geneTickColor}' stroke-width='0.5'/>`;
            }
          }
        }
      }
      svg += `</svg>`;
      return svg;
    }
  const centerX = rulerViewState?.target?.[0] || 0;
  const zoom = rulerViewState?.zoom || 0;
  const scale = Math.pow(2, zoom);
  const visibleWidth = rulerWidth / scale;
    let geneVisibleMinX = centerX - visibleWidth / 2 - (alignmentReferencePoint || 0);
    let geneVisibleMaxX = centerX + visibleWidth / 2 - (alignmentReferencePoint || 0);
    
    // Apply genome scaling - convert visible range to unscaled coordinates for tick generation
    const genomeXScale = (configToUse.genome && typeof configToUse.genome.xScalePercent === 'number') ? configToUse.genome.xScalePercent / 100 : 1;
    const scaledGeneVisibleMinX = geneVisibleMinX / genomeXScale;
    const scaledGeneVisibleMaxX = geneVisibleMaxX / genomeXScale;
    
    const rulerHeight = configToUse.ruler.height;
    const rulerTop = height - rulerHeight;
    const tickHeight = configToUse.ruler.tickHeight;
    const labelOffset = configToUse.ruler.labelOffset;
    // --- Gene ticks ---
    const getTickSpacing = (visibleRange) => {
      const targetTicks = configToUse.ruler.targetTicks;
      const rawSpacing = visibleRange / targetTicks;
      const magnitude = Math.pow(10, Math.floor(Math.log10(rawSpacing)));
      const normalized = rawSpacing / magnitude;
      let niceSpacing;
      if (normalized <= 1) niceSpacing = 1;
      else if (normalized <= 2) niceSpacing = 2;
      else if (normalized <= 5) niceSpacing = 5;
      else niceSpacing = 10;
      return niceSpacing * magnitude;
    };
    const tickSpacing = getTickSpacing(scaledGeneVisibleMaxX - scaledGeneVisibleMinX);
    const firstTick = Math.ceil(scaledGeneVisibleMinX / tickSpacing) * tickSpacing;
    let geneTicks = [];
    let treeBoundary = null;
    let treeBoundaryScreen = 0;
    if (bounds && genomeView) {
      let leftmostBaseline = Infinity;
      if (genomeView.nucleotidesBySeqid) {
        Object.values(genomeView.nucleotidesBySeqid).forEach(nuc => {
          if (nuc.baseline) {
            leftmostBaseline = Math.min(leftmostBaseline, Math.min(nuc.baseline.start, nuc.baseline.end));
          }
        });
      }
      if (isFinite(leftmostBaseline)) {
        treeBoundary = leftmostBaseline;
      }
    }
    // Calculate treeBoundaryScreen for clipping
    if (treeBoundary !== null) {
      const leftEdgeWorld = centerX - visibleWidth / 2;
      treeBoundaryScreen = ((treeBoundary - leftEdgeWorld) / visibleWidth) * rulerWidth;
    }
    for (let x = firstTick; x <= scaledGeneVisibleMaxX; x += tickSpacing) {
      // Convert back to scaled coordinate space for screen positioning
  const scaledX = x * genomeXScale;
  const worldX = scaledX + (alignmentReferencePoint || 0);
  const screenX = ((worldX - (centerX - visibleWidth / 2)) / visibleWidth) * rulerWidth;
      // Only include gene ticks right of tree boundary
  if (screenX >= (treeBoundaryScreen || 0) && screenX <= rulerWidth) {
        geneTicks.push({ x, screenX });
      }
    }
    // --- Tree ticks ---
    let treeTicks = [];
    // Calculate treeBoundary (leftmost baseline)
    if (bounds && genomeView) {
      let leftmostBaseline = Infinity;
      if (genomeView.nucleotidesBySeqid) {
        Object.values(genomeView.nucleotidesBySeqid).forEach(nuc => {
          if (nuc.baseline) {
            leftmostBaseline = Math.min(leftmostBaseline, Math.min(nuc.baseline.start, nuc.baseline.end));
          }
        });
      }
      if (isFinite(leftmostBaseline)) {
        treeBoundary = leftmostBaseline;
      }
    }
    // Tree area: from left edge to treeBoundary
    if (treeBoundary !== null && bounds && genomeView && genomeView.tree) {
  const leftEdgeWorld = centerX - visibleWidth / 2;
  const rightEdgeWorld = treeBoundary;
  const treeBoundaryScreen = ((treeBoundary - leftEdgeWorld) / visibleWidth) * rulerWidth;
      // Allow tree ticks even for very small tree areas
      if (treeBoundaryScreen >= 1) {
        const treeOffset = bounds.treeOffset || 0;
        // Get tree nodes that correspond to genes within the visible gene coordinate range
        let visibleLeaves = genomeView.tree.leafNodes.filter(leaf => {
          if (!genomeView.genesBySeqid) return false;
          const leafGenes = Object.values(genomeView.genesBySeqid).flat().filter(gene => 
            gene.seqid === leaf.name || gene.seqid === leaf.id
          );
          return leafGenes.some(gene => 
            gene.end >= scaledGeneVisibleMinX && gene.start <= scaledGeneVisibleMaxX
          );
        });
        // Fallback: if no visible leaves, use all leaves
        if (visibleLeaves.length === 0) {
          visibleLeaves = genomeView.tree.leafNodes;
        }
        if (visibleLeaves.length > 0) {
          // Use all nodes like RulerWidget does, not just leaves
          const treeOffset = bounds.treeOffset || 0;
          const treeXScale = (config.tree && typeof config.tree.xScalePercent === 'number') ? config.tree.xScalePercent / 100 : 1;
          const allTreeYCoords = genomeView.tree.allNodes.map(n => n.y * treeXScale + treeOffset);
          const treeMinY = Math.min(...allTreeYCoords);
          const treeMaxY = Math.max(...allTreeYCoords);
          
          // Get evolutionary distances from the tree object (now stored during scaleY)
          const maxEvolutionaryDistance = genomeView.tree.maxEvolutionaryDistance || 1;
          
          const visibleTreeMinY = Math.max(treeMinY, leftEdgeWorld);
          const visibleTreeMaxY = Math.min(treeMaxY, rightEdgeWorld);
          if (visibleTreeMinY < visibleTreeMaxY) {
            const convertTreeYToScreen = (treeY) => {
              return ((treeY - leftEdgeWorld) / visibleWidth) * rulerWidth;
            };
            const visibleTreeRange = visibleTreeMaxY - visibleTreeMinY;
            
            // Match RulerWidget's tick calculation exactly
            const minPixelsPerTreeTick = 60;
            const maxTicksBasedOnScreen = Math.floor(treeBoundaryScreen / minPixelsPerTreeTick);
            const baseNumTicks = Math.min(4, Math.max(2, Math.floor(visibleTreeRange / 100)));
            const numTicks = Math.min(baseNumTicks, maxTicksBasedOnScreen, 6);
            
            for (let i = 0; i < numTicks; i++) {
              const treeY = visibleTreeMinY + (i / (numTicks - 1)) * (visibleTreeMaxY - visibleTreeMinY);
              const screenX = convertTreeYToScreen(treeY);
              // Convert tree Y coordinate back to evolutionary distance using fixed coordinate system
              const fixedWidth = DEFAULT_CONFIG.tree?.fixedCoordinateWidth || 2000;
              const evolutionaryDist = ((treeY - treeOffset) / treeXScale) * (maxEvolutionaryDistance / fixedWidth);
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
                treeTicks.push({
                  x: evolutionaryDist,
                  screenX,
                  type: 'tree',
                  label: label,
                  isScale: true
                });
              }
            }
            
            // Filter tree ticks that are too close together on screen (match RulerWidget)
            const minTreeScreenDistance = 50;
            const filteredTreeTicks = [];
            
            for (let i = 0; i < treeTicks.length; i++) {
              const currentTick = treeTicks[i];
              let tooClose = false;
              
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
            
            // Replace treeTicks with filtered version
            treeTicks = filteredTreeTicks;
          }
        }
      }
    } else if (treeBoundary) {
      // Fallback: just show 'Phylogeny' label if no tree data
      const leftEdgeWorld = centerX - visibleWidth / 2;
      const treeBoundaryScreen = ((treeBoundary - leftEdgeWorld) / visibleWidth) * width;
      const treeAreaWidth = treeBoundaryScreen;
      const phylogenyLabelScreen = treeAreaWidth * 0.25;
      if (phylogenyLabelScreen >= 0 && phylogenyLabelScreen <= width) {
        treeTicks.push({
          x: 0,
          screenX: phylogenyLabelScreen,
          type: 'tree',
          label: 'Phylogeny'
        });
      }
    }
    // Draw ruler background with theme-aware colors (opaque)
    const rulerBgColor = themeColors.background || '#ffffff';
    const rulerBorderColor = themeColors.background === '#ffffff' ? '#ccc' : '#555';
  svg += `<rect x='0' y='${rulerTop}' width='${rulerWidth}' height='${rulerHeight}' fill='${rulerBgColor}' stroke='${rulerBorderColor}' stroke-width='1'/>`;
    
    // Draw gene ticks and labels (only in gene area) with theme-aware colors
    const geneTickColor = themeColors.text || (themeColors.background === '#ffffff' ? '#666' : '#aaa');
    const geneLabelColor = themeColors.text || (themeColors.background === '#ffffff' ? '#333' : '#ccc');
    for (const tick of geneTicks) {
      svg += `<line x1='${tick.screenX}' y1='${rulerTop}' x2='${tick.screenX}' y2='${rulerTop + tickHeight}' stroke='${geneTickColor}' stroke-width='1'/>`;
      svg += `<text x='${tick.screenX}' y='${rulerTop + labelOffset}' text-anchor='middle' font-size='11px' fill='${geneLabelColor}' font-family='Helvetica, Arial, sans-serif'>${formatCoordinate(tick.x)}</text>`;
    }
    
    // Draw tree ticks and labels (only in tree area) with theme-aware colors  
    const treeTickColor = themeColors.text || (themeColors.background === '#ffffff' ? '#666' : '#aaa');
    for (const tick of treeTicks) {
      if (tick.screenX < (treeBoundaryScreen || rulerWidth)) {
        if (tick.isScale) {
          svg += `<line x1='${tick.screenX}' y1='${rulerTop}' x2='${tick.screenX}' y2='${rulerTop + tickHeight / 2}' stroke='${treeTickColor}' stroke-width='1'/>`;
        }
        // Always use 'middle' text anchor for tree tick labels to ensure they're visible and centered
        svg += `<text x='${tick.screenX}' y='${rulerTop + labelOffset}' text-anchor='middle' font-size='11px' fill='${treeTickColor}' font-family='Helvetica, Arial, sans-serif' font-weight='bold'>${tick.label}</text>`;
      }
    }
  }
  svg += `</svg>`;
  return svg;
}
// Helper for formatting coordinates
function formatCoordinate(coord) {
  const abs = Math.abs(coord);
  if (abs >= 1000000) {
    return `${(coord / 1000000).toFixed(1)}M`;
  } else if (abs >= 1000) {
    return `${(coord / 1000).toFixed(1)}K`;
  } else {
    return Math.round(coord).toString();
  }
}
