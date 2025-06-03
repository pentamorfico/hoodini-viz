// Utility to convert color array to SVG color string
function colorToStr(cArr){
  if(!cArr)return 'none';
  const[r,g,b,a=255]=cArr;
  if(a===0)return 'none';
  if(a<255)return `rgba(${r},${g},${b},${a/255})`;
  return `rgb(${r},${g},${b})`;
}

function normalise(value,min,max){
  return (max===min)?0.5:(value - min)/(max - min);
}

export function exportToSVG(layers, viewState, containerSize, config, rulerOptions, themeColors = {}) {
  const { width, height } = containerSize;
  if (!width || !height) return;
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
  let svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>`;
  
  // Add background rectangle with theme background color
  const backgroundColor = themeColors.background || '#ffffff';
  svg += `<rect width='${width}' height='${height}' fill='${backgroundColor}'/>`;
  for(const layer of layers) {
    const props = layer.props;
    // Polygon layers (genes, protein-polygons, nucleotide-polygons, domains)
    if(layer.id === 'genes' || layer.id === 'protein-polygons' || layer.id === 'nucleotide-polygons' || layer.id === 'domains') {
      for(const feature of props.data) {
        const polygon = props.getPolygon(feature);
        const fillColor = props.getFillColor(feature);
        // Only genes and domains have a stroke, others should have no stroke
        let lineColor = [0,0,0,255];
        let strokeAttr = 'none';
        let strokeWidth = 1;
        if (layer.id === 'genes') {
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
        }
        const fill = colorToStr(fillColor);
        const pathPoints = polygon.map(p => applyBounds(p));
        let d = pathPoints.map((p,i) => i===0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`).join(' ') + 'Z';
        svg += `<path d='${d}' fill='${fill}' stroke='${strokeAttr}' stroke-width='${strokeWidth}'/>`;
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
        const pathPoints = path.map(p => applyBounds(p));
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
        const [x1, y1] = applyBounds(sourcePos);
        const [x2, y2] = applyBounds(targetPos);
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
        const fill = colorToStr(fillColor);
        svg += `<circle cx="${x}" cy="${y}" r="${radius / 10}" fill="${fill}" />`;
      }
    }    // TextLayer (labels)
    if(layer.id === 'phylo-labels' || layer.id === 'gene-labels' || layer.id === 'scale-labels') {
      for(const feature of props.data) {
        const pos = feature.position || (props.getPosition ? (typeof props.getPosition === 'function' ? props.getPosition(feature) : props.getPosition) : [0,0]);
        const text = feature.text || (props.getText ? (typeof props.getText === 'function' ? props.getText(feature) : props.getText) : '');
        const color = feature.color || (props.getColor ? (typeof props.getColor === 'function' ? props.getColor(feature) : props.getColor) : [0,0,0,255]);
        const size = feature.size || (props.getSize ? (typeof props.getSize === 'function' ? props.getSize(feature) : props.getSize) : 14);
        const fill = colorToStr(color);
        let [x, y] = applyBounds(pos);
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
        let dominantBaseline = 'hanging'; // default fallback
        if (layer.id === 'phylo-labels') {
          dominantBaseline = 'central'; // DeckGL 'center' maps to SVG 'central'
        } else if (layer.id === 'gene-labels') {
          // Gene labels use alignmentBaseline which defaults to 'top'
          const alignmentBaseline = feature.alignmentBaseline || (props.getAlignmentBaseline ? (typeof props.getAlignmentBaseline === 'function' ? props.getAlignmentBaseline(feature) : props.getAlignmentBaseline) : 'top');
          dominantBaseline = alignmentBaseline === 'center' ? 'central' : 'hanging';
        }
        
        // Make font-size proportional to SVG height (viewport size)
        const proportionalSize = Math.max(8, (size / 1000) * height); // 1000 is a typical data-space height
        
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
        
        svg += `<text x="${x}" y="${y}" fill="${fill}" font-size="${proportionalSize}px" font-family="sans-serif" text-anchor="${textAnchor}" dominant-baseline="${dominantBaseline}">${text}</text>`;
      }
    }
  }
  // --- RULER SVG EXPORT ---
  if (rulerOptions && rulerOptions.config && rulerOptions.width && rulerOptions.height) {
    // Use precomputed ticks from rulerOptions if available
    const { minX, maxX, width, height, config: rulerConfig, viewState: rulerViewState, alignmentReferencePoint, bounds, genomeView, precomputedTicks } = rulerOptions;
    const configToUse = rulerConfig || config;
    // If precomputed ticks are provided (from RulerWidget), use them directly
    if (precomputedTicks && Array.isArray(precomputedTicks)) {
      const geneTickColor = themeColors.text || (themeColors.background === '#ffffff' ? '#666' : '#aaa');
      const geneLabelColor = themeColors.text || (themeColors.background === '#ffffff' ? '#333' : '#ccc');
      const treeTickColor = themeColors.text || (themeColors.background === '#ffffff' ? '#666' : '#aaa');
      const _rulerHeight = configToUse.ruler.height;
      const _rulerTop = height - _rulerHeight;
      const _tickHeight = configToUse.ruler.tickHeight;
      const _labelOffset = configToUse.ruler.labelOffset;
      svg += `<rect x='0' y='${_rulerTop}' width='${width}' height='${_rulerHeight}' fill='${themeColors.background || '#ffffff'}' stroke='${themeColors.background === '#ffffff' ? '#ccc' : '#555'}' stroke-width='1'/>`;
      // Main ticks and labels
      for (const tick of precomputedTicks) {
        if (tick.type === 'gene') {
          svg += `<line x1='${tick.screenX}' y1='${_rulerTop}' x2='${tick.screenX}' y2='${_rulerTop + _tickHeight}' stroke='${geneTickColor}' stroke-width='1'/>`;
          svg += `<text x='${tick.screenX}' y='${_rulerTop + _labelOffset}' text-anchor='middle' font-size='11px' fill='${geneLabelColor}' font-family='Helvetica, Arial, sans-serif'>${formatCoordinate(tick.x)}</text>`;
        } else if (tick.type === 'tree' && tick.isScale) {
          svg += `<line x1='${tick.screenX}' y1='${_rulerTop}' x2='${tick.screenX}' y2='${_rulerTop + _tickHeight / 2}' stroke='${treeTickColor}' stroke-width='1'/>`;
          svg += `<text x='${tick.screenX}' y='${_rulerTop + _labelOffset}' text-anchor='middle' font-size='11px' fill='${treeTickColor}' font-family='Helvetica, Arial, sans-serif' font-weight='bold'>${tick.label}</text>`;
        }
      }
      // --- Minor ticks (only for gene area) ---
      const geneTicks = precomputedTicks.filter(t => t.type === 'gene');
      if (geneTicks.length > 1) {
        for (let i = 0; i < geneTicks.length - 1; i++) {
          const tick = geneTicks[i];
          const nextTick = geneTicks[i + 1];
          const tickSpacing = nextTick.x - tick.x;
          if (tickSpacing > 20) { // Only if spacing is large enough
            const nextX = tick.x + tickSpacing / 2;
            const nextScreenX = tick.screenX + (nextTick.screenX - tick.screenX) / 2;
            if (nextScreenX >= 0 && nextScreenX <= width) {
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
    const visibleWidth = width / scale;
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
      treeBoundaryScreen = ((treeBoundary - leftEdgeWorld) / visibleWidth) * width;
    }
    for (let x = firstTick; x <= scaledGeneVisibleMaxX; x += tickSpacing) {
      // Convert back to scaled coordinate space for screen positioning
      const scaledX = x * genomeXScale;
      const worldX = scaledX + (alignmentReferencePoint || 0);
      const screenX = ((worldX - (centerX - visibleWidth / 2)) / visibleWidth) * width;
      // Only include gene ticks right of tree boundary
      if (screenX >= (treeBoundaryScreen || 0) && screenX <= width) {
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
      const treeBoundaryScreen = ((treeBoundary - leftEdgeWorld) / visibleWidth) * width;
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
          const visibleTreeYCoords = visibleLeaves.map(leaf => leaf.y + treeOffset);
          const treeMinY = Math.min(...visibleTreeYCoords);
          const treeMaxY = Math.max(...visibleTreeYCoords);
          const rootDistances = visibleLeaves.map(leaf => leaf.rootDist || 0);
          const maxEvolutionaryDistance = Math.max(...rootDistances);
          const minEvolutionaryDistance = Math.min(...rootDistances);
          const visibleTreeMinY = Math.max(treeMinY, leftEdgeWorld);
          const visibleTreeMaxY = Math.min(treeMaxY, rightEdgeWorld);
          if (visibleTreeMinY < visibleTreeMaxY) {
            const convertTreeYToScreen = (treeY) => {
              return ((treeY - leftEdgeWorld) / visibleWidth) * width;
            };
            const visibleTreeRange = visibleTreeMaxY - visibleTreeMinY;
            const numTicks = Math.min(4, Math.max(2, Math.floor(visibleTreeRange / 100)));
            for (let i = 0; i < numTicks; i++) {
              const treeY = visibleTreeMinY + (i / (numTicks - 1)) * (visibleTreeMaxY - visibleTreeMinY);
              const screenX = convertTreeYToScreen(treeY);
              const yScaleFactor = maxEvolutionaryDistance > 0 ? 800 / maxEvolutionaryDistance : 1;
              const evolutionaryDist = (treeY - treeOffset) / yScaleFactor;
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
    svg += `<rect x='0' y='${rulerTop}' width='${width}' height='${rulerHeight}' fill='${rulerBgColor}' stroke='${rulerBorderColor}' stroke-width='1'/>`;
    
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
      if (tick.screenX < (treeBoundaryScreen || width)) {
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
