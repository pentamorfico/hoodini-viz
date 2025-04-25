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

export function exportToSVG(layers, viewState, containerSize) {
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
  for(const layer of layers) {
    const props = layer.props;
    // Polygon layers (genes, protein-polygons, nucleotide-polygons, domains)
    if(layer.id === 'genes' || layer.id === 'protein-polygons' || layer.id === 'nucleotide-polygons' || layer.id === 'domains') {
      for(const feature of props.data) {
        const polygon = props.getPolygon(feature);
        const fillColor = props.getFillColor(feature);
        // Only genes have a stroke, others should have no stroke
        let lineColor = [0,0,0,255];
        let strokeAttr = 'none';
        if (layer.id === 'genes') {
          if (typeof props.getLineColor === 'function') {
            lineColor = props.getLineColor(feature);
          } else if (Array.isArray(props.getLineColor)) {
            lineColor = props.getLineColor;
          }
          const stroke = colorToStr(lineColor);
          strokeAttr = (lineColor[3] === 0 || stroke === 'none') ? 'none' : stroke;
        }
        const fill = colorToStr(fillColor);
        const pathPoints = polygon.map(p => applyBounds(p));
        let d = pathPoints.map((p,i) => i===0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`).join(' ') + 'Z';
        svg += `<path d='${d}' fill='${fill}' stroke='${strokeAttr}' stroke-width='1'/>`;
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
        const color = props.getColor ? (typeof props.getColor === 'function' ? props.getColor(feature) : props.getColor) : [0,0,0,255];
        const stroke = colorToStr(color);
        const pathPoints = path.map(p => applyBounds(p));
        const d = pathPoints.map((p,i) => i===0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`).join(' ');
        svg += `<path d='${d}' fill='none' stroke='${stroke}' stroke-width='1'/>`;
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
    }
    // TextLayer (labels)
    if(layer.id === 'phylo-labels' || layer.id === 'gene-labels' || layer.id === 'scale-labels') {
      for(const feature of props.data) {
        const pos = feature.position || (props.getPosition ? props.getPosition(feature) : [0,0]);
        const text = feature.text || (props.getText ? props.getText(feature) : '');
        const color = feature.color || (props.getColor ? props.getColor(feature) : [0,0,0,255]);
        const size = feature.size || (props.getSize ? props.getSize(feature) : 14);
        const fill = colorToStr(color);
        let [x, y] = applyBounds(pos);
        const textAnchor = feature.textAnchor || (props.getTextAnchor ? props.getTextAnchor(feature) : 'start');
        // Handle pixelOffset if present
        let pixelOffset = feature.pixelOffset;
        if (pixelOffset === undefined && props.getPixelOffset && typeof props.getPixelOffset === 'function') {
          pixelOffset = props.getPixelOffset(feature);
        }
        if (Array.isArray(pixelOffset) && pixelOffset.length === 2) {
          x += pixelOffset[0];
          y += pixelOffset[1];
        }
        // Make font-size proportional to SVG height (viewport size)
        const proportionalSize = Math.max(8, (size / 1000) * height); // 1000 is a typical data-space height
        svg += `<text x="${x}" y="${y}" fill="${fill}" font-size="${proportionalSize}px" font-family="sans-serif" text-anchor="${textAnchor}" dominant-baseline="hanging">${text}</text>`;
      }
    }
  }
  svg += "</svg>";
  const blob = new Blob([svg], {type:'image/svg+xml'});
  const a = document.createElement('a');
  a.style.display = 'none';
  document.body.appendChild(a);
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = `phylo_export_${Date.now()}.svg`;
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}
