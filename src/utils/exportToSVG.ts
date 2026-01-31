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

/**
 * Export SVG scaled directly to a format size (A4, Letter, etc.)
 * This bypasses the viewport and maps world coordinates directly to the target format dimensions
 */
function exportToSVGScaledToFormat(layers, dataBounds, config, rulerOptions, themeColors, textScale, nodeScale, formatOptions) {
  const preset = formatOptions.formatPreset;
  
  // Convert format dimensions to pixels (300 DPI for print formats)
  const dpi = preset.unit === 'mm' ? 300 : 96;
  const mmToInch = 1 / 25.4;
  
  let targetWidthPx: number;
  let targetHeightPx: number;
  
  if (preset.unit === 'mm') {
    targetWidthPx = preset.width * mmToInch * dpi;
    targetHeightPx = preset.height * mmToInch * dpi;
  } else {
    targetWidthPx = preset.width;
    targetHeightPx = preset.height;
  }
  
  console.log('🖼️ Scale to Format:', { 
    preset: preset.name, 
    targetWidthPx, 
    targetHeightPx, 
    dataBounds 
  });
  console.log('🖼️ Scale to Format - Layer IDs:', layers?.map(l => l.id));
  
  // Calculate content bounds in world coordinates
  const phyloScaleFactor = config?.text?.scaleFactors?.phylo || DEFAULT_CONFIG.text.scaleFactors.phylo;
  
  // Find the extent of phylo labels
  let contentMaxX = dataBounds.maxX;
  const phyloLabelsLayer = layers.find(l => l.id === 'phylo-labels');
  if (phyloLabelsLayer && phyloLabelsLayer.props && phyloLabelsLayer.props.data) {
    const props = phyloLabelsLayer.props;
    for (const feature of props.data) {
      const pos = feature.position || (props.getPosition ? (typeof props.getPosition === 'function' ? props.getPosition(feature) : props.getPosition) : [0, 0]);
      const text = feature.text || (props.getText ? (typeof props.getText === 'function' ? props.getText(feature) : props.getText) : '');
      let size = feature.size || (props.getSize ? (typeof props.getSize === 'function' ? props.getSize(feature) : props.getSize) : 14);
      const scaledSize = size * phyloScaleFactor;
      const estimatedTextWidth = text.length * scaledSize * 0.7 + scaledSize * 2;
      const labelEndX = pos[0] + estimatedTextWidth;
      if (labelEndX > contentMaxX) {
        contentMaxX = labelEndX;
      }
    }
  }
  
  // Find tree minimum X - only include tree bounds if tree is visible
  let contentMinX = dataBounds.minX;
  const showTreeInExport = rulerOptions?.showTreeLayer === true || rulerOptions?.showTreeTextLayer === true;
  if (showTreeInExport && rulerOptions?.genomeView?.tree && rulerOptions?.bounds) {
    const genomeView = rulerOptions.genomeView;
    const bounds = rulerOptions.bounds;
    const treeOffset = bounds.treeOffset || 0;
    const treeXScale = rulerOptions.config?.tree?.xScalePercent ? 
      rulerOptions.config.tree.xScalePercent / 100 : 1;
    
    if (genomeView.tree.allNodes && genomeView.tree.allNodes.length > 0) {
      const allTreeYCoords = genomeView.tree.allNodes.map((n: any) => n.y * treeXScale + treeOffset);
      const treeMinY = Math.min(...allTreeYCoords);
      contentMinX = treeMinY;
    }
  }
  
  const contentMinY = dataBounds.minY;
  const contentMaxY = dataBounds.maxY;
  
  // Add some padding to the content bounds (5% of content size)
  const paddingX = (contentMaxX - contentMinX) * 0.05;
  const paddingY = (contentMaxY - contentMinY) * 0.05;
  
  const worldMinX = contentMinX - paddingX;
  const worldMaxX = contentMaxX + paddingX;
  const worldMinY = contentMinY - paddingY;
  const worldMaxY = contentMaxY + paddingY;
  
  const worldWidth = worldMaxX - worldMinX;
  const worldHeight = worldMaxY - worldMinY;
  
  // Calculate ruler height in the final SVG
  const rulerHeight = rulerOptions?.config?.ruler?.height || 0;
  const contentHeightPx = targetHeightPx - rulerHeight;
  
  // Calculate scale to fit content in target dimensions (maintaining aspect ratio)
  const scaleX = targetWidthPx / worldWidth;
  const scaleY = contentHeightPx / worldHeight;
  const finalScale = Math.min(scaleX, scaleY);
  
  // Calculate centered offset
  const scaledContentWidth = worldWidth * finalScale;
  const scaledContentHeight = worldHeight * finalScale;
  const offsetX = (targetWidthPx - scaledContentWidth) / 2;
  const offsetY = (contentHeightPx - scaledContentHeight) / 2;
  
  console.log('🖼️ Scale calculation:', {
    worldWidth, worldHeight,
    targetWidthPx, targetHeightPx,
    contentHeightPx,
    scaleX, scaleY, finalScale,
    scaledContentWidth, scaledContentHeight,
    offsetX, offsetY,
    worldMinX, worldMaxX, worldMinY, worldMaxY
  });
  
  // Create SVG with exact target dimensions
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidthPx}" height="${targetHeightPx}" viewBox="0 0 ${targetWidthPx} ${targetHeightPx}">`;
  
  // Background
  const bgColor = themeColors.background || 'white';
  svg += `<rect x="0" y="0" width="${targetWidthPx}" height="${targetHeightPx}" fill="${bgColor}"/>`;
  
  // Transform function: world coords to SVG coords
  const worldToSVG = (worldX: number, worldY: number) => {
    const svgX = (worldX - worldMinX) * finalScale + offsetX;
    const svgY = (worldMaxY - worldY) * finalScale + offsetY; // Y is flipped
    return [svgX, svgY];
  };
  
  // Log all layers for debugging
  console.log('📦 Layers received:', layers.map(l => ({ id: l.id, dataLength: l.props?.data?.length, visible: l.props?.visible })));
  // Render each layer
  for (const layer of layers) {
    if (!layer?.props?.data) {
      console.log(`⚠️ Layer ${layer?.id} skipped: no data`);
      continue;
    }
    // Skip layers that are not visible
    if (layer.props.visible === false) {
      console.log(`⚠️ Layer ${layer?.id} skipped: not visible`);
      continue;
    }
    const { props, id } = layer;
    console.log(`🔹 Processing layer: ${id} (${props.data.length} items)`);
    
    // Skip ruler layer - we'll handle it separately
    if (id === 'ruler-line') continue;
    
    // Genes layer (polygon layer)
    if (id === 'genes' || id === 'gene-shapes' || id === 'gene-regions' || id === 'non-coding-features' || id === 'ncrna-features') {
      svg += renderPolygonLayerScaled(props, worldToSVG, id, config, finalScale);
    } 
    // Domains layer (polygon layer) - includes dynamic IDs like 'domains-60-0'
    else if (id.startsWith('domains') || id === 'domain-shapes') {
      svg += renderPolygonLayerScaled(props, worldToSVG, id, config, finalScale);
    }
    // Region outlines (dashed path layer)
    else if (id === 'region-outlines') {
      svg += renderRegionOutlinesScaled(props, worldToSVG, id, config, finalScale);
    }
    // Protein and nucleotide link polygons
    else if (id === 'protein-polygons' || id === 'nucleotide-polygons' || id.includes('links') || id === 'protein-links' || id === 'nucleotide-links') {
      svg += renderPolygonLayerScaled(props, worldToSVG, id, config, finalScale);
    }
    // Outlines (path layers)
    else if (id === 'gene-outlines' || id === 'non-coding-outlines') {
      svg += renderPathLayerScaled(props, worldToSVG, id, config);
    } 
    else if (id === 'domain-outlines') {
      svg += renderPathLayerScaled(props, worldToSVG, id, config);
    } 
    // Tree-related layers
    else if (id === 'tree-links') {
      svg += renderLineLayerScaled(props, worldToSVG, id, config, finalScale);
    } 
    else if (id === 'tree-nodes' || id === 'nodes') {
      svg += renderScatterplotLayerScaled(props, worldToSVG, id, nodeScale, finalScale);
    } 
    else if (id === 'phylo-tree' || id === 'hoods') {
      // Tree path layer
      svg += renderPathLayerScaled(props, worldToSVG, id, config);
    } 
    else if (id === 'connecting-lines') {
      // Connecting lines between tree and genes
      svg += renderLineLayerScaled(props, worldToSVG, id, config, finalScale);
    } 
    // Labels (text layers)
    else if (id === 'phylo-labels' || id === 'gene-labels' || id.includes('-labels')) {
      svg += renderTextLayerScaled(props, worldToSVG, id, textScale, themeColors, config, finalScale);
    }
    // Catch-all: try as polygon layer for any unmatched layer
    else {
      console.log(`⚠️ Unknown layer type: ${id}, trying as polygon`);
      svg += renderPolygonLayerScaled(props, worldToSVG, id, config);
    }
  }
  
  // Render ruler if present - position it just below the scaled content
  if (rulerOptions?.genomeView) {
    const rulerTopY = offsetY + scaledContentHeight; // Position ruler just below content
    svg += renderRulerScaled(rulerOptions, worldToSVG, worldMinX, worldMaxX, rulerTopY, targetWidthPx, targetHeightPx, rulerHeight, themeColors, config, finalScale);
  }
  
  svg += '</svg>';
  
  // Download the SVG
  const blob = new Blob([svg], {type: 'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const timestamp = new Date().toISOString().slice(0,19).replace(/[:-]/g, '');
  a.download = `hoodini_${preset.name.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log(`✅ SVG exported (${preset.name}): ${targetWidthPx.toFixed(0)}x${targetHeightPx.toFixed(0)}px`);
}

// Helper functions for scaled export
function renderPolygonLayerScaled(props, worldToSVG, layerId, config, finalScale = 1) {
  let svg = `<g id="${layerId}">`;
  const getPolygon = props.getPolygon || (d => d.polygon || d);
  const getFillColor = props.getFillColor || (() => [200, 200, 200, 255]);
  const getLineColor = props.getLineColor || (() => [0, 0, 0, 255]);
  const getLineWidth = props.getLineWidth || (() => 1);
  const filled = props.filled !== false;
  const stroked = props.stroked !== false;
  
  // For "scale to format" exports, use fixed stroke widths that look good at the target size
  // Don't scale strokes by finalScale - they should remain visually consistent
  const targetStrokeWidth = config?.gene?.edgeWidth || 1;
  
  for (const d of props.data) {
    const polygon = typeof getPolygon === 'function' ? getPolygon(d) : d.polygon || d;
    if (!polygon || polygon.length < 3) continue;
    
    const fillColor = typeof getFillColor === 'function' ? getFillColor(d) : getFillColor;
    const lineColor = typeof getLineColor === 'function' ? getLineColor(d) : getLineColor;
    // Use fixed stroke width - don't scale it
    const lineWidth = targetStrokeWidth;
    
    const points = polygon.map(p => {
      const [x, y] = worldToSVG(p[0], p[1]);
      return `${x},${y}`;
    }).join(' ');
    
    const fillStr = filled ? colorToStr(fillColor) : 'none';
    const fillOpacity = filled ? getOpacity(fillColor) : 1;
    const strokeStr = stroked ? colorToStr(lineColor) : 'none';
    const strokeOpacity = stroked ? getOpacity(lineColor) : 1;
    
    svg += `<polygon points="${points}" fill="${fillStr}" fill-opacity="${fillOpacity}" stroke="${strokeStr}" stroke-opacity="${strokeOpacity}" stroke-width="${lineWidth}"/>`;
  }
  
  svg += '</g>';
  return svg;
}

function renderPathLayerScaled(props, worldToSVG, layerId, config) {
  let svg = `<g id="${layerId}">`;
  const getPath = props.getPath || (d => d.path || d);
  const getColor = props.getColor || (() => [0, 0, 0, 255]);
  const getWidth = props.getWidth || (() => 1);
  
  for (const d of props.data) {
    let path = null;
    if (typeof getPath === 'function') {
      try {
        path = getPath(d);
      } catch (e) {
        path = d.path || d;
      }
    } else {
      path = d.path || d;
    }
    
    // Skip if path is not an array or too short
    if (!path || !Array.isArray(path) || path.length < 2) continue;
    
    // Handle color robustly (same as original export)
    let color = [0, 0, 0, 255]; // default
    if (d.color) {
      color = d.color;
    } else if (props.getColor) {
      if (typeof props.getColor === 'function') {
        try {
          color = props.getColor(d);
        } catch (e) {
          try {
            color = props.getColor();
          } catch (e2) {
            color = [0, 0, 0, 255];
          }
        }
      } else if (Array.isArray(props.getColor)) {
        color = props.getColor;
      }
    }
    
    const width = typeof getWidth === 'function' ? getWidth(d) : getWidth;
    
    const pathStr = path.map((p, i) => {
      const [x, y] = worldToSVG(p[0], p[1]);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
    
    svg += `<path d="${pathStr}" fill="none" stroke="${colorToStr(color)}" stroke-opacity="${getOpacity(color)}" stroke-width="${width}"/>`;
  }
  
  svg += '</g>';
  return svg;
}

// Render region outlines as dashed paths (for genomic regions like phage, operons, etc.)
function renderRegionOutlinesScaled(props, worldToSVG, layerId, config, finalScale = 1) {
  let svg = `<g id="${layerId}">`;
  const getPath = props.getPath || (d => d.polygon || d.path || d);
  const getColor = props.getColor || (() => [100, 100, 100, 255]);
  const getWidth = props.getWidth || (() => 2);
  // Dash array from props or default [6, 4]
  const dashArray = props.getDashArray || [6, 4];
  const dashStr = Array.isArray(dashArray) ? dashArray.join(',') : '6,4';
  
  for (const d of props.data) {
    let path = null;
    if (typeof getPath === 'function') {
      try {
        path = getPath(d);
      } catch (e) {
        path = d.polygon || d.path || d;
      }
    } else {
      path = d.polygon || d.path || d;
    }
    
    // Skip if path is not an array or too short
    if (!path || !Array.isArray(path) || path.length < 2) continue;
    
    // Handle color robustly
    let color = [100, 100, 100, 255]; // default gray
    if (d.strokeColor) {
      color = d.strokeColor;
    } else if (props.getColor) {
      if (typeof props.getColor === 'function') {
        try {
          color = props.getColor(d);
        } catch (e) {
          try {
            color = props.getColor();
          } catch (e2) {
            color = [100, 100, 100, 255];
          }
        }
      } else if (Array.isArray(props.getColor)) {
        color = props.getColor;
      }
    }
    
    // Handle width
    let width = 2;
    if (d.strokeWidth) {
      width = d.strokeWidth;
    } else if (typeof getWidth === 'function') {
      try {
        width = getWidth(d);
      } catch (e) {
        width = 2;
      }
    } else {
      width = getWidth;
    }
    
    // Build path string - close the path with Z for proper region outline
    const pathStr = path.map((p, i) => {
      const [x, y] = worldToSVG(p[0], p[1]);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ') + ' Z';
    
    svg += `<path d="${pathStr}" fill="none" stroke="${colorToStr(color)}" stroke-opacity="${getOpacity(color)}" stroke-width="${width}" stroke-dasharray="${dashStr}"/>`;
  }
  
  svg += '</g>';
  return svg;
}

function renderLineLayerScaled(props, worldToSVG, layerId, config, finalScale = 1) {
  let svg = `<g id="${layerId}">`;
  const getSourcePosition = props.getSourcePosition || (d => d.sourcePosition);
  const getTargetPosition = props.getTargetPosition || (d => d.targetPosition);
  const getWidth = props.getWidth || (() => 1);
  
  // Minimum line width for visibility
  const minLineWidth = 0.5;
  
  for (const d of props.data) {
    const source = typeof getSourcePosition === 'function' ? getSourcePosition(d) : getSourcePosition;
    const target = typeof getTargetPosition === 'function' ? getTargetPosition(d) : getTargetPosition;
    if (!source || !target) continue;
    
    // Handle color robustly (same as original export)
    let color = [0, 0, 0, 255]; // default
    if (d.color) {
      color = d.color;
    } else if (props.getColor) {
      if (typeof props.getColor === 'function') {
        try {
          color = props.getColor(d);
        } catch (e) {
          try {
            color = props.getColor();
          } catch (e2) {
            color = [0, 0, 0, 255];
          }
        }
      } else if (Array.isArray(props.getColor)) {
        color = props.getColor;
      }
    }
    
    // Handle width robustly - use fixed width for consistent stroke appearance
    let width = 1; // default
    if (d.width) {
      width = d.width;
    } else if (props.getWidth) {
      if (typeof props.getWidth === 'function') {
        try {
          width = props.getWidth(d);
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
    // Don't scale stroke width - keep it fixed for visual consistency
    width = Math.max(width, minLineWidth);
    
    const [x1, y1] = worldToSVG(source[0], source[1]);
    const [x2, y2] = worldToSVG(target[0], target[1]);
    
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colorToStr(color)}" stroke-opacity="${getOpacity(color)}" stroke-width="${width}"/>`;
  }
  
  svg += '</g>';
  return svg;
}

function renderScatterplotLayerScaled(props, worldToSVG, layerId, nodeScale, finalScale = 1) {
  let svg = `<g id="${layerId}">`;
  const getPosition = props.getPosition || (d => d.position);
  const getRadius = props.getRadius || (() => 5);
  const getFillColor = props.getFillColor || (() => [0, 0, 0, 255]);
  const getLineColor = props.getLineColor || (() => [0, 0, 0, 255]);
  const getLineWidth = props.getLineWidth || (() => 1);
  const filled = props.filled !== false;
  const stroked = props.stroked !== false;
  const radiusScale = props.radiusScale || 1;
  
  // Minimum radius to ensure visibility
  const minRadius = 3;
  
  for (const d of props.data) {
    const pos = typeof getPosition === 'function' ? getPosition(d) : getPosition;
    if (!pos) continue;
    
    // Scale radius with finalScale but ensure minimum size for visibility
    let radius = (typeof getRadius === 'function' ? getRadius(d) : getRadius) * radiusScale * nodeScale;
    radius = Math.max(radius * finalScale, minRadius);
    
    const fillColor = typeof getFillColor === 'function' ? getFillColor(d) : getFillColor;
    const lineColor = typeof getLineColor === 'function' ? getLineColor(d) : getLineColor;
    // Don't scale stroke width - keep it fixed for visual consistency
    const lineWidth = Math.max(typeof getLineWidth === 'function' ? getLineWidth(d) : getLineWidth, 0.5);
    
    const [cx, cy] = worldToSVG(pos[0], pos[1]);
    
    const fillStr = filled ? colorToStr(fillColor) : 'none';
    const strokeStr = stroked ? colorToStr(lineColor) : 'none';
    
    svg += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fillStr}" fill-opacity="${getOpacity(fillColor)}" stroke="${strokeStr}" stroke-opacity="${getOpacity(lineColor)}" stroke-width="${lineWidth}"/>`;
  }
  
  svg += '</g>';
  return svg;
}

function renderTextLayerScaled(props, worldToSVG, layerId, textScale, themeColors, config, finalScale = 1) {
  let svg = `<g id="${layerId}">`;
  const getPosition = props.getPosition || (d => d.position);
  const getText = props.getText || (d => d.text || '');
  const getSize = props.getSize || (() => 14);
  const getColor = props.getColor || (() => [0, 0, 0, 255]);
  const getAngle = props.getAngle || (() => 0);
  const getTextAnchor = props.getTextAnchor || (() => 'middle');
  const getAlignmentBaseline = props.getAlignmentBaseline || (() => 'center');
  
  const defaultTextColor = themeColors.text || 'black';
  
  // Text size should be scaled with the content, but with a minimum for readability
  // The world-unit size gets scaled by finalScale, then we apply a multiplier to make it readable
  const isPhylo = layerId.includes('phylo');
  const isGene = layerId.includes('gene');
  // For A4 export at this scale, we need larger text sizes
  // Use fixed sizes that look good when printed
  const fixedTextSize = isPhylo ? 14 : (isGene ? 8 : 10);
  
  for (const d of props.data) {
    const pos = typeof getPosition === 'function' ? getPosition(d) : getPosition;
    if (!pos) continue;
    
    const text = typeof getText === 'function' ? getText(d) : getText;
    if (!text) continue;
    
    // Use fixed text size for the export
    let size = fixedTextSize;
    
    // Get color from the data item or use default
    let textColor = defaultTextColor;
    if (d.color) {
      textColor = colorToStr(d.color);
    } else if (props.getColor) {
      if (typeof props.getColor === 'function') {
        try {
          const colorArr = props.getColor(d);
          if (colorArr) textColor = colorToStr(colorArr);
        } catch (e) {
          // Use default
        }
      } else if (Array.isArray(props.getColor)) {
        textColor = colorToStr(props.getColor);
      }
    }
    
    const angle = typeof getAngle === 'function' ? getAngle(d) : getAngle;
    const anchor = typeof getTextAnchor === 'function' ? getTextAnchor(d) : getTextAnchor;
    const baseline = typeof getAlignmentBaseline === 'function' ? getAlignmentBaseline(d) : getAlignmentBaseline;
    
    const [x, y] = worldToSVG(pos[0], pos[1]);
    
    // Convert DeckGL anchor to SVG
    let textAnchorSVG = 'middle';
    if (anchor === 'start') textAnchorSVG = 'start';
    else if (anchor === 'end') textAnchorSVG = 'end';
    
    // Affinity Designer doesn't support dominant-baseline properly.
    // Use manual dy offset instead for cross-application compatibility.
    // SVG default baseline is alphabetic (bottom of text).
    // We calculate dy to shift text based on desired alignment.
    let dyOffset = 0;
    if (baseline === 'top' || baseline === 'hanging') {
      // Text should hang below the anchor point
      dyOffset = size * 0.85; // Approximate ascender height
    } else if (baseline === 'center' || baseline === 'middle') {
      // Text should be centered on the anchor point
      dyOffset = size * 0.35; // Approximate half of cap-height
    } else if (baseline === 'bottom' || baseline === 'baseline') {
      // Text sits on the baseline (default SVG behavior)
      dyOffset = 0;
    }
    
    const adjustedY = y + dyOffset;
    const transform = angle !== 0 ? ` transform="rotate(${-angle} ${x} ${adjustedY})"` : '';
    
    svg += `<text x="${x}" y="${adjustedY}" font-family="Arial, sans-serif" font-size="${size}" fill="${textColor}" text-anchor="${textAnchorSVG}"${transform}>${escapeXML(text)}</text>`;
  }
  
  svg += '</g>';
  return svg;
}

function renderRulerScaled(rulerOptions, worldToSVG, worldMinX, worldMaxX, rulerTopY, targetWidthPx, targetHeightPx, rulerHeight, themeColors, config, finalScale = 1) {
  let svg = `<g id="ruler">`;
  
  const genomeView = rulerOptions.genomeView;
  const bounds = rulerOptions.bounds;
  const rulerConfig = rulerOptions.config?.ruler || {};
  
  // Ruler positioning
  const baselineY = rulerTopY + 10;
  const tickHeight = 8;
  const textSize = 10;
  const labelOffset = tickHeight + textSize + 4;
  
  const geneTickColor = themeColors.text || '#666';
  const geneLabelColor = themeColors.text || '#333';
  const treeTickColor = themeColors.text || '#666';
  
  // Calculate tree and genes boundaries
  const treeOffset = bounds.treeOffset || 0;
  const genesMinX = bounds.minX;
  const genesMaxX = bounds.maxX;
  
  // Find tree extent
  let treeMinX = worldMinX;
  let treeMaxX = treeOffset; // Tree ends at treeOffset
  const treeXScale = rulerOptions.config?.tree?.xScalePercent ? 
    rulerOptions.config.tree.xScalePercent / 100 : 1;
  
  if (genomeView.tree?.allNodes?.length > 0) {
    const allTreeXCoords = genomeView.tree.allNodes.map((n: any) => n.y * treeXScale + treeOffset);
    treeMinX = Math.min(...allTreeXCoords);
    treeMaxX = Math.max(...allTreeXCoords);
  }
  
  // Convert to SVG coordinates
  const [svgTreeMinX] = worldToSVG(treeMinX, 0);
  const [svgTreeMaxX] = worldToSVG(treeMaxX, 0);
  const [svgGenesMinX] = worldToSVG(genesMinX, 0);
  const [svgGenesMaxX] = worldToSVG(genesMaxX, 0);
  
  // Horizontal baseline (thin line spanning tree to genes)
  svg += `<line x1="${svgTreeMinX}" y1="${baselineY}" x2="${svgGenesMaxX}" y2="${baselineY}" stroke="${geneTickColor}" stroke-width="0.5"/>`;
  
  // Tree ruler ticks - only render if tree is visible (at least one of showTreeLayer or showTreeTextLayer is true)
  const showTreeRuler = rulerOptions.showTreeLayer === true || rulerOptions.showTreeTextLayer === true;
  svg += `<g id="ruler-tree">`;
  if (genomeView.tree && showTreeRuler) {
    // Get tree depth range for scale ticks
    const treeDepths = genomeView.tree.allNodes?.map((n: any) => n.y) || [];
    if (treeDepths.length > 0) {
      const minDepth = Math.min(...treeDepths);
      const maxDepth = Math.max(...treeDepths);
      const depthRange = maxDepth - minDepth;
      
      // Generate tree scale ticks (2-3 ticks)
      const treeTickInterval = calculateNiceTickInterval(depthRange);
      const startDepth = Math.ceil(minDepth / treeTickInterval) * treeTickInterval;
      
      for (let depth = startDepth; depth <= maxDepth; depth += treeTickInterval) {
        const worldX = depth * treeXScale + treeOffset;
        const [svgX] = worldToSVG(worldX, 0);
        
        svg += `<line x1="${svgX}" y1="${baselineY}" x2="${svgX}" y2="${baselineY + tickHeight / 2}" stroke="${treeTickColor}" stroke-width="1"/>`;
        svg += `<text x="${svgX}" y="${baselineY + labelOffset}" text-anchor="middle" font-size="${textSize}px" fill="${treeTickColor}" font-family="Helvetica, Arial, sans-serif" font-weight="bold">${depth.toFixed(2)}</text>`;
      }
    }
  }
  svg += `</g>`;
  
  // Genes ruler ticks
  svg += `<g id="ruler-genes">`;
  
  // Calculate nice tick intervals for genes
  const genesWidth = genesMaxX - genesMinX;
  const tickInterval = calculateNiceTickInterval(genesWidth);
  const startX = Math.ceil(genesMinX / tickInterval) * tickInterval;
  
  for (let x = startX; x <= genesMaxX; x += tickInterval) {
    const [svgX] = worldToSVG(x, 0);
    
    // Tick mark
    svg += `<line x1="${svgX}" y1="${baselineY}" x2="${svgX}" y2="${baselineY + tickHeight}" stroke="${geneTickColor}" stroke-width="1"/>`;
    
    // Label with font-family
    const label = formatTickLabel(x);
    svg += `<text x="${svgX}" y="${baselineY + labelOffset}" font-size="${textSize}px" fill="${geneLabelColor}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif">${label}</text>`;
  }
  
  svg += `</g>`; // ruler-genes
  svg += `</g>`; // ruler
  
  return svg;
}

function calculateNiceTickInterval(range) {
  const targetTicks = 10;
  const roughInterval = range / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
  const normalized = roughInterval / magnitude;
  
  let niceInterval;
  if (normalized < 1.5) niceInterval = magnitude;
  else if (normalized < 3) niceInterval = 2 * magnitude;
  else if (normalized < 7) niceInterval = 5 * magnitude;
  else niceInterval = 10 * magnitude;
  
  return niceInterval;
}

function formatTickLabel(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toString();
}

function escapeXML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function exportToSVG(layers, viewState, containerSize, config, rulerOptions, themeColors = {}, textScale = 5, nodeScale = 1, formatOptions) {
  console.log('🖼️ exportToSVG called with:', { layers: layers?.length, viewState, containerSize, config: !!config, textScale, nodeScale, formatOptions });
  console.log('🖼️ Layer IDs:', layers?.map(l => l.id));
  
  const { width, height } = containerSize;
  if (!width || !height) {
    console.error('❌ SVG Export failed: Invalid container size', { width, height });
    return;
  }
  
  // Calculate total SVG height: DeckGL content height + ruler height (if present)
  const rulerHeight = rulerOptions?.config?.ruler?.height || 0;
  
  // Get data bounds (world coordinates of all content)
  const dataBounds = rulerOptions?.bounds;
  
  console.log('🖼️ Scale to format condition check:', {
    scaleToFormat: formatOptions?.scaleToFormat,
    formatPreset: formatOptions?.formatPreset,
    guideBounds: formatOptions?.guideBounds,
    dataBounds: dataBounds,
  });
  
  // Determine export mode:
  // 1. useGuidesCrop = true: crop to guide bounds (only what's inside the guides)
  // 2. useFormatDimensions = true: use format dimensions (A4, etc.) but fit all content
  const guideBounds = formatOptions?.guideBounds;
  const useGuidesCrop = !!(guideBounds && formatOptions?.scaleToFormat && formatOptions?.formatPreset);
  const useFormatDimensions = !!(formatOptions?.scaleToFormat && formatOptions?.formatPreset);
  // Whether to scale ruler dimensions to match viewport appearance when cropping
  const scaleRulerWithCrop = formatOptions?.scaleRulerWithCrop !== false; // Default to true
  
  let min_x: number, max_x: number, min_y: number, max_y: number;
  let svgWidth: number, svgHeight: number;
  
  // Calculate format pixel dimensions if using format
  let formatWidthPx: number | null = null;
  let formatHeightPx: number | null = null;
  if (useFormatDimensions && formatOptions?.formatPreset) {
    const preset = formatOptions.formatPreset;
    const dpi = preset.unit === 'mm' ? 300 : 96;
    const mmToInch = 1 / 25.4;
    
    if (preset.unit === 'mm') {
      formatWidthPx = preset.width * mmToInch * dpi;
      formatHeightPx = preset.height * mmToInch * dpi;
    } else {
      formatWidthPx = preset.width;
      formatHeightPx = preset.height;
    }
  }
  
  if (useGuidesCrop) {
    // CROP MODE: Use guide bounds as the world coordinate region to export
    min_x = guideBounds!.minX;
    max_x = guideBounds!.maxX;
    min_y = guideBounds!.minY;
    max_y = guideBounds!.maxY;
    svgWidth = formatWidthPx!;
    svgHeight = formatHeightPx!;
    
    console.log('🖼️ CROP MODE - Using guide bounds:', { 
      guideBounds, 
      svgWidth, 
      svgHeight,
      preset: formatOptions?.formatPreset?.name 
    });
  } else {
    // Normal export: use viewport bounds
    const scale = Math.pow(2, viewState.zoom || 0);
    const centerX = viewState.target[0];
    const centerY = viewState.target[1];
    const halfW = width / (2 * scale);
    const halfH = height / (2 * scale);
    min_x = centerX - halfW;
    max_x = centerX + halfW;
    min_y = centerY - halfH;
    max_y = centerY + halfH;
    svgWidth = width;
    svgHeight = height;
    
    console.log('🖼️ VIEWPORT MODE - Using screen bounds');
  }
  
  const viewBounds = { min_x, max_x, min_y, max_y };
  
  // Convert world coordinates to screen coordinates
  const worldToScreenY = (worldY: number) => (1 - normalise(worldY, min_y, max_y)) * svgHeight;
  const worldToScreenX = (worldX: number) => normalise(worldX, min_x, max_x) * svgWidth;
  
  // Calculate content bounds by scanning the actual data in the layers
  // This is the most accurate way - find the actual Y extents of genes being rendered
  // IMPORTANT: When using crop mode, only consider elements within the visible viewport bounds
  let actualMinWorldY = Infinity;
  let actualMaxWorldY = -Infinity;
  let actualMinWorldX = Infinity;
  let actualMaxWorldX = -Infinity;
  
  // Helper to check if a point is within the viewport bounds
  const isWithinViewport = (x: number, y: number) => {
    return y >= min_y && y <= max_y && x >= min_x && x <= max_x;
  };
  
  // Helper to check if any point of a polygon is within the viewport
  const polygonIntersectsViewport = (polygon: [number, number][]) => {
    if (!polygon || polygon.length === 0) return false;
    // Check if any vertex is within bounds
    for (const [x, y] of polygon) {
      if (isWithinViewport(x, y)) return true;
    }
    // Also check if polygon bounds overlap with viewport (for large polygons)
    const polyMinY = Math.min(...polygon.map(p => p[1]));
    const polyMaxY = Math.max(...polygon.map(p => p[1]));
    return polyMaxY >= min_y && polyMinY <= max_y;
  };
  
  // Scan gene layer for actual Y bounds (only within viewport)
  const genesLayer = layers.find(l => l.id === 'genes');
  if (genesLayer?.props?.data) {
    for (const gene of genesLayer.props.data) {
      const polygon = gene.polygon;
      if (polygon && polygon.length > 0 && polygonIntersectsViewport(polygon)) {
        for (const [x, y] of polygon) {
          if (isFinite(y) && y >= min_y && y <= max_y) {
            actualMinWorldY = Math.min(actualMinWorldY, y);
            actualMaxWorldY = Math.max(actualMaxWorldY, y);
          }
          if (isFinite(x) && x >= min_x && x <= max_x) {
            actualMinWorldX = Math.min(actualMinWorldX, x);
            actualMaxWorldX = Math.max(actualMaxWorldX, x);
          }
        }
      }
    }
  }
  
  // Also scan hoods layer for baselines (only within viewport)
  const hoodsLayer = layers.find(l => l.id === 'hoods');
  if (hoodsLayer?.props?.data) {
    for (const hood of hoodsLayer.props.data) {
      const polygon = hood.polygon;
      if (polygon && polygon.length > 0 && polygonIntersectsViewport(polygon)) {
        for (const [x, y] of polygon) {
          if (isFinite(y) && y >= min_y && y <= max_y) {
            actualMinWorldY = Math.min(actualMinWorldY, y);
            actualMaxWorldY = Math.max(actualMaxWorldY, y);
          }
        }
      }
    }
  }
  
  // Scan domains layer (only within viewport)
  const domainsLayer = layers.find(l => l.id && l.id.startsWith('domains'));
  if (domainsLayer?.props?.data) {
    for (const domain of domainsLayer.props.data) {
      const polygon = domain.polygon;
      if (polygon && polygon.length > 0 && polygonIntersectsViewport(polygon)) {
        for (const [x, y] of polygon) {
          if (isFinite(y) && y >= min_y && y <= max_y) {
            actualMinWorldY = Math.min(actualMinWorldY, y);
            actualMaxWorldY = Math.max(actualMaxWorldY, y);
          }
        }
      }
    }
  }
  
  console.log('🖼️ Actual layer bounds (world coords, filtered to viewport):', { 
    actualMinWorldY, actualMaxWorldY, actualMinWorldX, actualMaxWorldX,
    viewportBounds: { min_x, max_x, min_y, max_y }
  });
  
  // When using guide bounds crop, we directly map guide bounds to format dimensions
  let compactWidth: number;
  let compactHeight: number;
  let finalWidth: number;
  let finalHeight: number;
  let totalSVGHeight: number;
  let xOffset = 0;
  let yOffset = 0;
  let contentScale = 1;
  let formatInfo = null;
  let rulerScaleFactor = 1; // Scale factor for ruler dimensions in crop mode
  
  if (useGuidesCrop) {
    // For guide-based export: map world coordinates directly to format pixels
    finalWidth = svgWidth;
    finalHeight = svgHeight;
    compactWidth = svgWidth;
    compactHeight = svgHeight;
    totalSVGHeight = svgHeight; // No extra ruler space - ruler goes inside the format
    
    // Calculate ruler scale factor
    // The guide bounds span (max_x - min_x) world units which maps to svgWidth pixels
    // In the viewport at current zoom, 1 world unit = scale pixels
    const viewportScale = Math.pow(2, viewState.zoom || 0);
    const guideWorldWidth = max_x - min_x;
    const guideViewportPixels = guideWorldWidth * viewportScale;
    
    if (scaleRulerWithCrop) {
      // Scale ruler proportionally to fit the format (ruler grows/shrinks with format)
      // How many format pixels per viewport pixel?
      rulerScaleFactor = svgWidth / guideViewportPixels;
    } else {
      // DON'T scale ruler - keep it at the same pixel size as in viewport
      // This means the ruler text will be small relative to the large format
      // but will look the same as on screen when viewed at 100%
      // Factor of 1.0 means use base sizes (11px font, etc.) without scaling
      rulerScaleFactor = 1.0;
    }
    
    console.log('🖼️ Guide crop export dimensions:', { 
      finalWidth, finalHeight, totalSVGHeight, 
      rulerScaleFactor, scaleRulerWithCrop, 
      viewportScale, guideWorldWidth, guideViewportPixels,
      svgWidth,
      scaledVsUnscaled: scaleRulerWithCrop ? 'SCALED to format' : 'FIXED size (viewport pixels)'
    });
  } else {
    // Normal export: Calculate content bounds in screen space for compact SVG
    let contentScreenMinY = 0;
    let contentScreenMaxY = svgHeight;
    let contentScreenMinX = 0;
    let contentScreenMaxX = svgWidth;
    
    // Use actual bounds from layers if available
    if (isFinite(actualMinWorldY) && isFinite(actualMaxWorldY)) {
      // Convert to screen coordinates (Y is flipped: higher world Y = lower screen Y)
      const screenMinY = worldToScreenY(actualMaxWorldY); 
      const screenMaxY = worldToScreenY(actualMinWorldY);
      
      // Add padding
      contentScreenMinY = Math.max(0, screenMinY - 20);
      contentScreenMaxY = Math.min(svgHeight, screenMaxY + 20);
      
      console.log('🖼️ SVG Y bounds from layers:', { 
        actualMinWorldY, 
        actualMaxWorldY,
        screenMinY,
        screenMaxY,
        contentScreenMinY, 
        contentScreenMaxY,
        containerHeight: svgHeight
      });
    }
    
    if (dataBounds && isFinite(dataBounds.minX) && isFinite(dataBounds.maxX)) {
      // For X bounds, calculate the actual tree extent
      
      let contentMinWorldX = min_x; // Default to full viewport
      let contentMaxWorldX = dataBounds.maxX; // End at last gene
      
      // Check if phylo-labels extend beyond dataBounds.maxX (when "after-tracks")
      const phyloLabelsLayer = layers.find(l => l.id === 'phylo-labels');
      if (phyloLabelsLayer && phyloLabelsLayer.props && phyloLabelsLayer.props.data) {
        const props = phyloLabelsLayer.props;
        let maxLabelX = contentMaxWorldX;
        
        // Get the phylo label scale factor from config
        const phyloScaleFactor = config?.text?.scaleFactors?.phylo || DEFAULT_CONFIG.text.scaleFactors.phylo;
        
        for (const feature of props.data) {
          const pos = feature.position || (props.getPosition ? (typeof props.getPosition === 'function' ? props.getPosition(feature) : props.getPosition) : [0, 0]);
          const text = feature.text || (props.getText ? (typeof props.getText === 'function' ? props.getText(feature) : props.getText) : '');
          let size = feature.size || (props.getSize ? (typeof props.getSize === 'function' ? props.getSize(feature) : props.getSize) : 14);
          
          // Apply the scale factor (same as in HoodiniViz: d.size * effectiveConfig.text.scaleFactors.phylo)
          const scaledSize = size * phyloScaleFactor;
          
          // Estimate text width in world coordinates
          const estimatedTextWidth = text.length * scaledSize * 0.7 + scaledSize * 2;
          const labelEndX = pos[0] + estimatedTextWidth;
          
          if (labelEndX > maxLabelX) {
            maxLabelX = labelEndX;
          }
        }
        
        if (maxLabelX > contentMaxWorldX) {
          contentMaxWorldX = maxLabelX;
        }
      }
      
      // Try to find the actual tree bounds from genomeView - only if tree is visible
      const showTreeInBounds = rulerOptions?.showTreeLayer === true || rulerOptions?.showTreeTextLayer === true;
      if (showTreeInBounds && rulerOptions?.genomeView?.tree && rulerOptions?.bounds) {
        const genomeView = rulerOptions.genomeView;
        const bounds = rulerOptions.bounds;
        
        const treeOffset = bounds.treeOffset || 0;
        const treeXScale = rulerOptions.config?.tree?.xScalePercent ? 
          rulerOptions.config.tree.xScalePercent / 100 : 1;
        
        if (genomeView.tree.allNodes && genomeView.tree.allNodes.length > 0) {
          const allTreeYCoords = genomeView.tree.allNodes.map((n: any) => n.y * treeXScale + treeOffset);
          const treeMinY = Math.min(...allTreeYCoords);
          contentMinWorldX = treeMinY;
        }
      }
      
      contentScreenMinX = Math.max(0, worldToScreenX(contentMinWorldX) - 20);
      contentScreenMaxX = Math.min(svgWidth, worldToScreenX(contentMaxWorldX) + 20);
    }
    
    // Calculate compact dimensions from content bounds
    compactHeight = contentScreenMaxY - contentScreenMinY;
    compactWidth = contentScreenMaxX - contentScreenMinX;
    
    // Check if we need to scale to format (but without cropping)
    if (useFormatDimensions && formatWidthPx && formatHeightPx) {
      // SCALE TO FORMAT MODE (without crop): fit all content into format dimensions
      // Reserve space for ruler at the bottom
      const contentHeightAvailable = formatHeightPx - (rulerOptions ? rulerHeight : 0);
      
      // Calculate scale factor to fit content into available space
      const scaleX = formatWidthPx / compactWidth;
      const scaleY = contentHeightAvailable / compactHeight;
      contentScale = Math.min(scaleX, scaleY);
      
      // Final dimensions are the format dimensions
      finalWidth = formatWidthPx;
      finalHeight = formatHeightPx;
      totalSVGHeight = formatHeightPx; // Use full format height (ruler included)
      
      // Store format info for SVG header
      formatInfo = {
        preset: formatOptions!.formatPreset,
        scale: contentScale,
        originalWidth: compactWidth,
        originalHeight: compactHeight
      };
      
      console.log('🖼️ SCALE TO FORMAT MODE (no crop):', { 
        compactWidth, compactHeight, 
        formatWidthPx, formatHeightPx,
        contentHeightAvailable,
        contentScale,
        finalWidth, finalHeight
      });
    } else {
      // Normal viewport export - use compact dimensions
      finalWidth = compactWidth;
      finalHeight = compactHeight;
      totalSVGHeight = compactHeight + (rulerOptions ? rulerHeight : 0);
    }
    
    // Offsets to translate content to compact space
    yOffset = contentScreenMinY;
    xOffset = contentScreenMinX;
  }
  
  const applyBounds = (point) => {
    let x = normalise(point[0], min_x, max_x) * svgWidth - xOffset;
    let y = (1 - normalise(point[1], min_y, max_y)) * svgHeight - yOffset;
    
    // Apply content scaling if format scaling is enabled (without crop)
    if (contentScale !== 1 && useFormatDimensions && !useGuidesCrop) {
      // Center the scaled content in the target format (leaving room for ruler at bottom)
      const scaledWidth = compactWidth * contentScale;
      const scaledHeight = compactHeight * contentScale;
      const xCenter = finalWidth / 2;
      const availableHeight = finalHeight - (rulerOptions ? rulerHeight : 0);
      const yCenter = availableHeight / 2;
      
      x = (x * contentScale) + (xCenter - scaledWidth / 2);
      y = (y * contentScale) + (yCenter - scaledHeight / 2);
    }
    
    return [x, y];
  };
  // World -> pixel conversion (pixels per world unit along X).
  // Use viewport mapping: svgWidth pixels spans (max_x - min_x) world units.
  const worldSpan = Math.max(1e-9, (max_x - min_x));
  // textScale/nodeScale allow tuning how many screen pixels correspond to one world unit
  // Default textScale is 5 (matches text), nodeScale defaults to 1 and can be used to boost/shrink nodes.
  const basePixelsPerWorld = svgWidth / worldSpan;
  const textScaleFactor = (typeof textScale === 'number' && isFinite(textScale) && textScale > 0) ? textScale : 1;
  const nodeScaleFactor = (typeof nodeScale === 'number' && isFinite(nodeScale) && nodeScale > 0) ? nodeScale : 1;
  const worldToPixelText = basePixelsPerWorld * textScaleFactor * contentScale;
  const worldToPixelNode = basePixelsPerWorld * nodeScaleFactor * contentScale;
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
  // Helpers to avoid rendering things entirely outside the final SVG viewport
  // Use finalWidth/finalHeight to account for format scaling
  const isPointOnScreen = (p) => (p[0] >= -1 && p[0] <= finalWidth + 1 && p[1] >= -1 && p[1] <= finalHeight + 1);
  const isBBoxOnScreen = (pts) => {
    if (!pts || pts.length === 0) return false;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
      maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
    }
    return !(maxX < 0 || maxY < 0 || minX > finalWidth || minY > finalHeight);
  };
  
  // Build SVG header with appropriate dimensions
  let svg: string;
  if (useFormatDimensions && formatOptions?.formatPreset) {
    // Use physical units for width/height (for print), viewBox in pixels
    const preset = formatOptions.formatPreset;
    const widthAttr = preset.unit === 'mm' ? `${preset.width}mm` : `${preset.width}`;
    const heightAttr = preset.unit === 'mm' ? `${preset.height}mm` : `${preset.height}`;
    svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${widthAttr}' height='${heightAttr}' viewBox='0 0 ${finalWidth} ${totalSVGHeight}'>`;
    svg += `\n<!-- Generated with HoodiniViz SVG Export -->\n`;
    svg += `<!-- Format: ${preset.name} (${preset.width}×${preset.height}${preset.unit || 'px'}) -->\n`;
    if (useGuidesCrop) {
      svg += `<!-- Mode: Cropped to guide bounds -->\n`;
    } else {
      svg += `<!-- Mode: Content scaled to fit format -->\n`;
    }
  } else {
    // Normal export: use pixel dimensions
    svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${finalWidth}' height='${totalSVGHeight}' viewBox='0 0 ${finalWidth} ${totalSVGHeight}'>`;
  }
  
  // Add format information as comment
  if (formatInfo) {
    svg += `\n<!-- Generated with HoodiniViz SVG Export -->\n`;
    svg += `<!-- Format: ${formatInfo.preset.name} (${formatInfo.preset.width}×${formatInfo.preset.height}${formatInfo.preset.unit}) -->\n`;
    svg += `<!-- Scale: ${formatInfo.scale.toFixed(3)}x -->\n`;
    svg += `<!-- Original size: ${formatInfo.originalWidth.toFixed(0)}×${formatInfo.originalHeight.toFixed(0)}px -->\n`;
  }
  
  // Add background rectangle with theme background color
  const backgroundColor = themeColors.background || '#ffffff';
  svg += `<rect width='${finalWidth}' height='${totalSVGHeight}' fill='${backgroundColor}'/>`;
  
  // Store compactHeight for ruler positioning
  // For guide crop: position ruler based on actual content within the guide bounds
  let rulerTopY: number;
  if (useGuidesCrop) {
    // For guide crop, position ruler just below the visible genes
    // Use the actual layer bounds if available
    if (isFinite(actualMinWorldY)) {
      // Convert actualMinWorldY (lowest gene Y in world coords) to screen Y
      // In guide crop mode, we're mapping world coords directly to format pixels
      const rawRulerY = worldToScreenY(actualMinWorldY);
      rulerTopY = rawRulerY + 10; // Add small padding
    } else {
      // Fallback to bottom of format with some margin
      rulerTopY = totalSVGHeight - rulerHeight - 20;
    }
  } else if (useFormatDimensions && contentScale !== 1) {
    // SCALE TO FORMAT MODE (without crop): 
    // Content is scaled and centered - ruler should go right below the scaled content
    const scaledHeight = compactHeight * contentScale;
    const availableHeight = finalHeight - rulerHeight;
    const yCenter = availableHeight / 2;
    const contentStartY = yCenter - scaledHeight / 2;
    const contentEndY = contentStartY + scaledHeight;
    rulerTopY = contentEndY + 10; // Just below the scaled content
    
    console.log('🖼️ Scale to format ruler calc:', {
      scaledHeight, availableHeight, yCenter, contentStartY, contentEndY, rulerTopY
    });
  } else {
    // Normal export: ruler goes right after compact content
    if (isFinite(actualMinWorldY)) {
      const rawRulerY = worldToScreenY(actualMinWorldY) - yOffset;
      rulerTopY = rawRulerY + 10;
    } else {
      rulerTopY = compactHeight;
    }
  }
  
  console.log('🖼️ Ruler positioning:', { 
    useGuidesCrop, 
    useFormatDimensions, 
    contentScale, 
    actualMinWorldY, 
    rulerTopY,
    totalSVGHeight,
    rulerHeight
  });
  
  // Define clip path for visualization content to prevent overflow into ruler area
  // The visualization area is everything above the ruler
  const vizClipHeight = rulerOptions ? rulerTopY : totalSVGHeight;
  svg += `<defs>`;
  svg += `<clipPath id='viz-clip'><rect x='0' y='0' width='${finalWidth}' height='${vizClipHeight}'/></clipPath>`;
  svg += `</defs>`;
  
  // Visualization content group with clip path to prevent text overflow into ruler
  svg += `<g id='visualization' clip-path='url(#viz-clip)'>`;
  
  for(const layer of layers) {
    const props = layer.props;
    // Skip layers that are not visible
    if (props.visible === false) continue;
    // Polygon layers (genes, protein-polygons, nucleotide-polygons, domains, regions, ncRNA)
    // Note: domains layer has dynamic id like 'domains-{height}-{arrowhead}'
    const isDomains = layer.id === 'domains' || layer.id.startsWith('domains-');
    const isRegions = layer.id === 'region-polygons';
    if(layer.id === 'genes' || layer.id === 'protein-polygons' || layer.id === 'nucleotide-polygons' || isDomains || layer.id === 'ncrna-features' || isRegions) {
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
        } else if (isDomains) {
          lineColor = themeColors.text || config?.colors?.black || [0,0,0,255];
          strokeAttr = colorToStr(lineColor);
          strokeWidth = config?.domain?.edgeWidth || 1;
        } else if (isRegions) {
          // Regions have their own line color and width
          if (typeof props.getLineColor === 'function') {
            lineColor = props.getLineColor(feature);
          } else if (feature.strokeColor) {
            lineColor = feature.strokeColor;
          }
          strokeAttr = colorToStr(lineColor);
          if (typeof props.getLineWidth === 'function') {
            strokeWidth = props.getLineWidth(feature);
          } else if (feature.strokeWidth) {
            strokeWidth = feature.strokeWidth;
          } else {
            strokeWidth = 2;
          }
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
    // Region outlines (dashed path layer)
    if(layer.id === 'region-outlines') {
      const dashArray = props.getDashArray || [6, 4];
      const dashStr = Array.isArray(dashArray) ? dashArray.join(',') : '6,4';
      for(const feature of props.data) {
        let path = [];
        if (typeof props.getPath === 'function') {
          path = props.getPath(feature);
        } else {
          path = feature.polygon || feature.path || [];
        }
        if (!path || path.length < 2) continue;
        
        // Handle color
        let color = [100,100,100,255];
        if (feature.strokeColor) {
          color = feature.strokeColor;
        } else if (props.getColor) {
          if (typeof props.getColor === 'function') {
            try { color = props.getColor(feature); } catch (e) { color = [100,100,100,255]; }
          } else if (Array.isArray(props.getColor)) {
            color = props.getColor;
          }
        }
        
        // Handle width
        let width = feature.strokeWidth || 2;
        if (props.getWidth) {
          if (typeof props.getWidth === 'function') {
            try { width = props.getWidth(feature); } catch (e) { width = 2; }
          } else {
            width = props.getWidth;
          }
        }
        
        const stroke = colorToStr(color);
        const strokeOpacity = getOpacity(color);
        // clip path in world coords
        const clippedPath = clipPolylineToRect(path, min_x, max_x, min_y, max_y);
        if (!clippedPath || clippedPath.length === 0) continue;
        const pathPoints = clippedPath.map(p => applyBounds(p));
        const d = pathPoints.map((p,i) => i===0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`).join(' ') + ' Z';
        svg += `<path d='${d}' fill='none' stroke='${stroke}' stroke-width='${width}' stroke-dasharray='${dashStr}'${strokeOpacity < 1 ? ` stroke-opacity='${strokeOpacity}'` : ''}/>`;
      }
    }
    // Path layers (tree paths)
    if(layer.id === 'phylo-tree') {
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
    // LineLayer (baselines/hoods and connecting lines)
    if(layer.id === 'connecting-lines' || layer.id === 'hoods') {
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
        // Handle width - for hoods/baselines use a fixed pixel width since widthUnits is 'meters'
        // For connecting lines, use the configured width
        let width = 1; // default
        if (layer.id === 'hoods') {
          // Baselines should be very thin lines to match the view
          width = config?.stroke?.hoodWidth || config?.hood?.width || 0.25;
        } else if (feature.width) {
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
    if(layer.id === 'nodes' || layer.id === 'tree-nodes') {
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
          // Map DeckGL/TextLayer alignmentBaseline to SVG dominant-baseline and a small
          // manual dyOffset to better match canvas text metrics across renderers.
          switch ((alignmentBaseline || 'top').toString().toLowerCase()) {
            case 'top':
              // DeckGL 'top' means the text sits below the anchor point
              dominantBaseline = 'hanging';
              dyOffset = proportionalSize * 0.2;
              break;
            case 'center':
            case 'middle':
              // Center the text vertically on the anchor
              dominantBaseline = 'middle';
              dyOffset = 0;
              break;
            case 'bottom':
              // DeckGL 'bottom' means the text sits above the anchor point
              // Use 'alphabetic' and a small negative offset to nudge it upward
              dominantBaseline = 'alphabetic';
              dyOffset = -proportionalSize * 0.25;
              break;
            default:
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
        
        // Apply Y offset for better Illustrator/Affinity compatibility
        // Affinity Designer doesn't support dominant-baseline, so we use manual Y offsets.
        // Recalculate dyOffset without relying on dominant-baseline
        let affinityDyOffset = 0;
        if (dominantBaseline === 'hanging') {
          affinityDyOffset = proportionalSize * 0.85;
        } else if (dominantBaseline === 'middle') {
          affinityDyOffset = proportionalSize * 0.35;
        } else if (dominantBaseline === 'alphabetic' || dominantBaseline === 'baseline') {
          affinityDyOffset = 0;
        }
        const adjustedY = y + dyOffset + affinityDyOffset;
        
        // Add opacity attribute for Illustrator/Affinity compatibility
        const opacityAttr = textOpacity < 1 ? ` fill-opacity="${textOpacity}"` : '';
        
        svg += `<text x="${x}" y="${adjustedY}" fill="${fill}"${opacityAttr} font-size="${proportionalSize}px" font-family="sans-serif" text-anchor="${textAnchor}">${text}</text>`;
      }
    }
  }
  
  // Close visualization group
  svg += `</g>`;
  
  // --- RULER SVG EXPORT ---
  console.log('🎯 Ruler section - checking conditions:', { 
    hasRulerOptions: !!rulerOptions, 
    hasConfig: !!rulerOptions?.config,
    hasWidth: typeof rulerOptions?.width,
    hasHeight: typeof rulerOptions?.height,
    hasPrecomputedTicks: !!rulerOptions?.precomputedTicks,
    ticksLength: rulerOptions?.precomputedTicks?.length
  });
  
  if (rulerOptions && rulerOptions.config && typeof rulerOptions.width === 'number' && typeof rulerOptions.height === 'number') {
    // Use precomputed ticks from rulerOptions if available
    const { minX, maxX, config: rulerConfig, viewState: rulerViewState, alignmentReferencePoint, bounds, genomeView, precomputedTicks } = rulerOptions;
    // avoid shadowing main svg width/height
    const rulerWidth = rulerOptions.width;
    const rulerHeightLocal = rulerOptions.height;
    const configToUse = rulerConfig || config;
    
    console.log('🎯 Ruler section - inside condition, precomputedTicks:', precomputedTicks?.length);
    
    // If precomputed ticks are provided (from RulerWidget), use them directly
    if (precomputedTicks && Array.isArray(precomputedTicks)) {
      const geneTickColor = themeColors.text || (themeColors.background === '#ffffff' ? '#666' : '#aaa');
      const geneLabelColor = themeColors.text || (themeColors.background === '#ffffff' ? '#333' : '#ccc');
      const treeTickColor = themeColors.text || (themeColors.background === '#ffffff' ? '#666' : '#aaa');
      
  console.log('🎯 Ruler rendering with rulerScaleFactor:', rulerScaleFactor, 'base fontSize: 11 -> scaled:', 11 * rulerScaleFactor);
      
  const _rulerHeight = configToUse.ruler.height * rulerScaleFactor;
  const _rulerTop = rulerTopY; // Position ruler right after compact content area
      const _tickHeight = configToUse.ruler.tickHeight * rulerScaleFactor;
      const _labelOffset = configToUse.ruler.labelOffset * rulerScaleFactor;
      const _fontSize = 11 * rulerScaleFactor;
      
  // Ruler group
  svg += `<g id='ruler'>`;
  
  // For ruler ticks, we need to use the same coordinate transformation as the content
  // IMPORTANT: tick.x is RELATIVE to the alignment reference point, not absolute world coordinates
  // We need to convert: worldX = tick.x * genomeXScale + alignmentReferencePoint
  const alignmentRef = alignmentReferencePoint || 0;
  // genomeXScale comes from config.genome.xScalePercent (default 100%)
  const genomeXScalePercent = (configToUse.genome && typeof configToUse.genome.xScalePercent === 'number') 
    ? configToUse.genome.xScalePercent : 100;
  const genomeXScaleValue = genomeXScalePercent / 100;
  
  // Helper to convert tick.x (relative) to world X coordinate (absolute)
  const tickXToWorldX = (tickX: number) => {
    return tickX * genomeXScaleValue + alignmentRef;
  };
  
  // Helper to get the X position of a tick in SVG coordinates (same as content)
  const getTickSvgX = (tick: any) => {
    // Convert relative tick.x to absolute world coordinates, then use applyBounds
    const worldX = tickXToWorldX(tick.x);
    const [svgX] = applyBounds([worldX, 0]);
    return svgX;
  };
  
  // Debug: log some tick values to understand the transformation
  const sampleTicks = precomputedTicks.slice(0, 3);
  console.log('🎯 Ruler debug - sample ticks:', sampleTicks.map(t => ({
    relativeX: t.x,
    worldX: tickXToWorldX(t.x),
    screenX: t.screenX,
    type: t.type,
    computedSvgX: getTickSvgX(t)
  })));
  console.log('🎯 Ruler debug - bounds:', { min_x, max_x, svgWidth, xOffset, contentScale, useFormatDimensions, compactWidth, finalWidth, alignmentRef, genomeXScaleValue });
  
  // Calculate horizontal baseline extent from tick positions
  const tickSvgXs = precomputedTicks
    .filter(t => t && typeof t.x === 'number' && isFinite(t.x))
    .map(t => getTickSvgX(t));
  const padding = 10; // Small padding beyond tick extents
  const lineStartX = Math.max(0, Math.min(...tickSvgXs) - padding);
  const lineEndX = Math.min(finalWidth, Math.max(...tickSvgXs) + padding);
  
  // Horizontal baseline (from tree area to gene area) - thin line
  svg += `<line x1='${lineStartX}' y1='${_rulerTop}' x2='${lineEndX}' y2='${_rulerTop}' stroke='${geneTickColor}' stroke-width='0.5'/>`;
      
      // Transform ticks using world coordinates for proper alignment
      // tick.x is relative, we convert to world coords and then to SVG coords
      const validPreTicks = precomputedTicks
        .filter(t => t && t.type && typeof t.x === 'number' && isFinite(t.x))
        .map(t => ({
          ...t,
          worldX: tickXToWorldX(t.x),
          screenX: getTickSvgX(t)
        }))
        .filter(t => t.screenX >= 0 && t.screenX <= finalWidth);
      
      console.log('🎯 SVG Export: filtered ticks:', validPreTicks.length, { contentScale, useFormatDimensions });
      
      // Separate tree and gene ticks into different groups
      // Only include tree ticks if tree layers are visible (at least one of showTreeLayer or showTreeTextLayer is true)
      const showTreeRuler = rulerOptions.showTreeLayer === true || rulerOptions.showTreeTextLayer === true;
      const treeTicks = showTreeRuler ? validPreTicks.filter(t => t.type === 'tree' && t.isScale) : [];
      const geneTicksAll = validPreTicks.filter(t => t.type === 'gene');
      
      // Tree ruler group
      svg += `<g id='ruler-tree'>`;
      for (const tick of treeTicks) {
        svg += `<line x1='${tick.screenX}' y1='${_rulerTop}' x2='${tick.screenX}' y2='${_rulerTop + _tickHeight / 2}' stroke='${treeTickColor}' stroke-width='1'/>`;
        svg += `<text x='${tick.screenX}' y='${_rulerTop + _labelOffset}' text-anchor='middle' font-size='${_fontSize}px' fill='${treeTickColor}' font-family='Helvetica, Arial, sans-serif' font-weight='bold'>${tick.label}</text>`;
      }
      svg += `</g>`;
      
      // Gene ruler group
      svg += `<g id='ruler-genes'>`;
      for (const tick of geneTicksAll) {
        svg += `<line x1='${tick.screenX}' y1='${_rulerTop}' x2='${tick.screenX}' y2='${_rulerTop + _tickHeight}' stroke='${geneTickColor}' stroke-width='1'/>`;
        svg += `<text x='${tick.screenX}' y='${_rulerTop + _labelOffset}' text-anchor='middle' font-size='${_fontSize}px' fill='${geneLabelColor}' font-family='Helvetica, Arial, sans-serif'>${formatCoordinate(tick.x)}</text>`;
      }
      // --- Minor ticks (only for gene area) ---
      if (geneTicksAll.length > 1) {
        for (let i = 0; i < geneTicksAll.length - 1; i++) {
          const tick = geneTicksAll[i];
          const nextTick = geneTicksAll[i + 1];
          const tickSpacing = nextTick.x - tick.x;
          if (tickSpacing > 20) { // Only if spacing is large enough
            const nextScreenX = tick.screenX + (nextTick.screenX - tick.screenX) / 2;
            if (nextScreenX >= 0 && nextScreenX <= finalWidth) {
              svg += `<line x1='${nextScreenX}' y1='${_rulerTop}' x2='${nextScreenX}' y2='${_rulerTop + _tickHeight / 2}' stroke='${geneTickColor}' stroke-width='0.5'/>`;
            }
          }
        }
      }
      svg += `</g>`;
      
      // Close ruler clip group
      svg += `</g>`;
      svg += `</svg>`;
      return svg;
    }
    
    // No precomputed ticks - generate ticks based on SVG viewport bounds
    // Replicate RulerWidget logic for both gene and tree ticks
    const _rulerHeight = (configToUse.ruler?.height || 36) * rulerScaleFactor;
    const _rulerTop = rulerTopY;
    const _tickHeight = (configToUse.ruler?.tickHeight || 8) * rulerScaleFactor;
    const _labelOffset = (configToUse.ruler?.labelOffset || 24) * rulerScaleFactor;
    const _fontSize = 11 * rulerScaleFactor;
    
    const geneTickColor = themeColors.text || (themeColors.background === '#ffffff' ? '#666' : '#aaa');
    const geneLabelColor = themeColors.text || (themeColors.background === '#ffffff' ? '#333' : '#ccc');
    const treeTickColor = themeColors.text || (themeColors.background === '#ffffff' ? '#666' : '#aaa');
    
    // Find tree boundary (leftmost hood start) - genes are to the right of this
    let treeBoundary: number | null = null;
    if (genomeView && genomeView.nucleotidesBySeqid) {
      let leftmostHood = Infinity;
      Object.values(genomeView.nucleotidesBySeqid).forEach((nuc: any) => {
        if (nuc.hood) {
          leftmostHood = Math.min(leftmostHood, Math.min(nuc.hood.start, nuc.hood.end));
        }
      });
      if (isFinite(leftmostHood)) {
        treeBoundary = leftmostHood;
      }
    }
    
    // Helper: world coordinate to SVG X - use the same transform as applyBounds
    const worldToSvgX = (worldX: number) => {
      const [svgX] = applyBounds([worldX, 0]);
      return svgX;
    };
    
    // Calculate tree boundary screen position
    const treeBoundaryScreen = treeBoundary !== null ? worldToSvgX(treeBoundary) : 0;
    
    // Collect all tick screen positions for calculating horizontal line extent
    const allTickScreenXs: number[] = [];
    
    // Temporary storage for ticks to draw later
    const geneTicks: Array<{screenX: number, label: string}> = [];
    const treeTicks: Array<{screenX: number, label: string}> = [];
    
    // --- Calculate GENE TICKS ---
    const geneDataMinX = bounds?.minX ?? min_x;
    const geneDataMaxX = bounds?.maxX ?? max_x;
    
    const alignmentRef = alignmentReferencePoint || 0;
    const genomeXScale = (configToUse.genome && typeof configToUse.genome.xScalePercent === 'number') 
      ? configToUse.genome.xScalePercent / 100 : 1;
    
    const geneWorldMin = Math.max(
      treeBoundary !== null ? treeBoundary : min_x,
      min_x,
      geneDataMinX
    );
    const geneWorldMax = Math.min(max_x, geneDataMaxX);
    
    const geneMinX = (geneWorldMin - alignmentRef) / genomeXScale;
    const geneMaxX = (geneWorldMax - alignmentRef) / genomeXScale;
    
    if (geneMaxX > geneMinX) {
      const geneVisibleRange = geneMaxX - geneMinX;
      const minPixelsPerTick = 60;
      const geneAreaWidth = compactWidth - treeBoundaryScreen;
      const maxTicksBasedOnScreen = Math.floor(geneAreaWidth / minPixelsPerTick);
      const targetTicks = Math.max(3, Math.min(8, maxTicksBasedOnScreen));
      
      const rawSpacing = geneVisibleRange / targetTicks;
      const magnitude = Math.pow(10, Math.floor(Math.log10(rawSpacing)));
      const normalized = rawSpacing / magnitude;
      let niceSpacing;
      if (normalized <= 1) niceSpacing = 1;
      else if (normalized <= 2) niceSpacing = 2;
      else if (normalized <= 5) niceSpacing = 5;
      else niceSpacing = 10;
      const tickSpacing = niceSpacing * magnitude;
      
      const firstTickIndex = Math.floor(geneMinX / tickSpacing);
      const lastTickIndex = Math.ceil(geneMaxX / tickSpacing);
      
      for (let i = firstTickIndex; i <= lastTickIndex; i++) {
        const x = i * tickSpacing;
        if (x < geneMinX - tickSpacing * 0.1 || x > geneMaxX + tickSpacing * 0.1) continue;
        
        const worldX = x * genomeXScale + alignmentRef;
        const screenX = worldToSvgX(worldX);
        
        if (screenX >= treeBoundaryScreen && screenX <= finalWidth) {
          geneTicks.push({ screenX, label: formatCoordinate(x) });
          allTickScreenXs.push(screenX);
        }
      }
    }
    
    // --- Calculate TREE TICKS ---
    // Only include tree ticks if tree layers are visible (at least one of showTreeLayer or showTreeTextLayer is true)
    const showTreeRulerFallback = rulerOptions.showTreeLayer === true || rulerOptions.showTreeTextLayer === true;
    if (showTreeRulerFallback && treeBoundary !== null && treeBoundaryScreen > 30 && genomeView && genomeView.tree && bounds) {
      const treeOffset = bounds.treeOffset || 0;
      const treeXScale = (configToUse.tree && typeof configToUse.tree.xScalePercent === 'number') 
        ? configToUse.tree.xScalePercent / 100 : 1;
      
      const allTreeYCoords = genomeView.tree.allNodes.map((n: any) => n.y * treeXScale + treeOffset);
      const treeMinY = Math.min(...allTreeYCoords);
      const treeMaxY = Math.max(...allTreeYCoords);
      
      const maxEvolutionaryDistance = genomeView.tree.maxEvolutionaryDistance || 1;
      const fixedWidth = configToUse.tree?.fixedCoordinateWidth || 2000;
      
      const visibleTreeMinY = Math.max(treeMinY, min_x);
      const visibleTreeMaxY = Math.min(treeMaxY, treeBoundary);
      
      if (visibleTreeMaxY > visibleTreeMinY) {
        const minPixelsPerTreeTick = 60;
        const maxTreeTicks = Math.floor(treeBoundaryScreen / minPixelsPerTreeTick);
        const numTicks = Math.min(4, Math.max(2, maxTreeTicks));
        
        for (let i = 0; i < numTicks; i++) {
          const treeY = visibleTreeMinY + (i / Math.max(1, numTicks - 1)) * (visibleTreeMaxY - visibleTreeMinY);
          const screenX = worldToSvgX(treeY);
          
          const evolutionaryDist = ((treeY - treeOffset) / treeXScale) * (maxEvolutionaryDistance / fixedWidth);
          
          let label;
          if (maxEvolutionaryDistance < 0.001) {
            label = evolutionaryDist.toExponential(1);
          } else if (maxEvolutionaryDistance < 0.1) {
            label = evolutionaryDist.toFixed(2);
          } else if (maxEvolutionaryDistance < 1) {
            label = evolutionaryDist.toFixed(2);
          } else {
            label = evolutionaryDist.toFixed(1);
          }
          
          if (screenX >= 0 && screenX <= treeBoundaryScreen) {
            treeTicks.push({ screenX, label });
            allTickScreenXs.push(screenX);
          }
        }
      }
    }
    
    // --- Now draw the ruler ---
    svg += `<g id='ruler'>`;
    
    // Horizontal baseline - from leftmost to rightmost tick with small padding - thin line
    if (allTickScreenXs.length > 0) {
      const padding = 10;
      const lineStartX = Math.max(0, Math.min(...allTickScreenXs) - padding);
      const lineEndX = Math.min(finalWidth, Math.max(...allTickScreenXs) + padding);
      svg += `<line x1='${lineStartX}' y1='${_rulerTop}' x2='${lineEndX}' y2='${_rulerTop}' stroke='${geneTickColor}' stroke-width='0.5'/>`;
    }
    
    // Tree ruler group
    svg += `<g id='ruler-tree'>`;
    for (const tick of treeTicks) {
      svg += `<line x1='${tick.screenX}' y1='${_rulerTop}' x2='${tick.screenX}' y2='${_rulerTop + _tickHeight / 2}' stroke='${treeTickColor}' stroke-width='1'/>`;
      svg += `<text x='${tick.screenX}' y='${_rulerTop + _labelOffset}' text-anchor='middle' font-size='${_fontSize}px' fill='${treeTickColor}' font-family='Helvetica, Arial, sans-serif' font-weight='bold'>${tick.label}</text>`;
    }
    svg += `</g>`;
    
    // Gene ruler group
    svg += `<g id='ruler-genes'>`;
    for (const tick of geneTicks) {
      svg += `<line x1='${tick.screenX}' y1='${_rulerTop}' x2='${tick.screenX}' y2='${_rulerTop + _tickHeight}' stroke='${geneTickColor}' stroke-width='1'/>`;
      svg += `<text x='${tick.screenX}' y='${_rulerTop + _labelOffset}' text-anchor='middle' font-size='${_fontSize}px' fill='${geneLabelColor}' font-family='Helvetica, Arial, sans-serif'>${tick.label}</text>`;
    }
    svg += `</g>`;
    
    svg += `</g>`;
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
