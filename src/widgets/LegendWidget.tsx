import React, { useRef, useState, useEffect } from 'react';
import { getPaletteColors } from '../utils/colorPalettes.js';
import { calculateTipWidth } from '../config/visualizationConfig';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/ThemeContext';

// Lightweight virtualized grid for legend items - MOVED OUTSIDE component to prevent re-creation on each render
const VirtualGrid = ({ items = [], renderItem, cellWidth = 2040, cellHeight = 28, gap = 6, containerHeight = undefined, className = "", minContentWidth = 80, getItemLabel = null, charWidthEstimate = 7, labelPadding = 36, columns: columnsProp = undefined }) => {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const draggingRef = useRef(false);
  const dragStartY = useRef(0);
  const dragStartScroll = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width: w, height: h } = entries[0].contentRect;
      setWidth(Math.floor(w));
      setHeight(Math.floor(h));
    });
    ro.observe(el);
    // ensure initial measurement
    setTimeout(() => {
      setWidth(el.clientWidth || 0);
      setHeight(el.clientHeight || 0);
    }, 0);
    return () => ro.disconnect();
  }, []);

  // compute an "effective" cell width based on the longest item label so
  // short labels can pack into more columns. We keep `cellWidth` as a
  // maximum (fixed parameter). getItemLabel optionally extracts the text
  // from an item; otherwise we try common fields.
  const extractLabel = (it) => {
    if (typeof getItemLabel === 'function') return getItemLabel(it);
    try {
      if (it == null) return '';
      if (typeof it === 'string' || typeof it === 'number') return String(it);
      if (typeof it === 'object') return String(it.label ?? it.value ?? (Array.isArray(it) ? it[0] : ''));
      return String(it);
    } catch (e) { return '' }
  };

  // precompute the longest label length in characters
  const maxLabelLen = (items && items.length) ? items.reduce((m, it) => Math.max(m, (String(extractLabel(it) || '')).length), 0) : 0;
  // approximate pixel width for the label area (characters * estimate + padding for swatch/gap)
  const measuredLabelPx = Math.ceil(maxLabelLen * (charWidthEstimate || 7) + (labelPadding || 36));
  const effectiveCellWidth = Math.max(40, Math.min(cellWidth || 2040, measuredLabelPx || cellWidth));

  // compute columns: prefer explicit columnsProp, otherwise compute from available width
  const availForCols = (width && width > 0) ? width : Math.max(minContentWidth, (containerRef.current && containerRef.current.clientWidth) || 0);
  const computedCols = Math.max(1, Math.min(items.length || 1, Math.floor((availForCols + gap) / (effectiveCellWidth + gap))));
  const columns = (typeof columnsProp === 'number' && columnsProp >= 1) ? Math.max(1, Math.min(items.length || 1, Math.floor(columnsProp))) : computedCols;

  const totalRows = Math.max(1, Math.ceil(items.length / columns));
  const rowHeight = cellHeight + gap;
  const totalHeight = totalRows * rowHeight;

  // Compute actual cell width so items evenly fill the container width
  const availW = (width && width > 0) ? width : Math.max(minContentWidth, (containerRef.current && containerRef.current.clientWidth) || 0);
  const colsUsed = Math.max(1, columns);
  const cellWidthActual = Math.floor((Math.max(0, availW - (colsUsed - 1) * gap)) / colsUsed) || cellWidth;

  // If no explicit containerHeight is provided, let the grid expand to content height
  const measuredHeight = (height && height > 0) ? height : 0;
  const effectiveContainerHeight = (typeof containerHeight === 'number' && containerHeight > 0) ? containerHeight : (measuredHeight > 0 ? measuredHeight : totalHeight);
  const maxScroll = Math.max(0, totalHeight - effectiveContainerHeight);
  
  useEffect(() => {
    // Only update scrollTop if it actually exceeds maxScroll to prevent infinite loops
    setScrollTop(prev => {
      const newVal = Math.min(prev, maxScroll);
      return newVal !== prev ? newVal : prev;
    });
  }, [maxScroll]);

  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 1);
  const endRow = Math.min(totalRows - 1, startRow + Math.ceil(effectiveContainerHeight / rowHeight) + 3);

  const visible = [];
  for (let r = startRow; r <= endRow; r++) {
    for (let c = 0; c < columns; c++) {
      const idx = r * columns + c;
      if (idx >= items.length) break;
      visible.push({ idx, item: items[idx], row: r, col: c });
    }
  }

  // Register wheel event listener as non-passive to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY;
      setScrollTop(s => Math.max(0, Math.min(maxScroll, s + delta)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [maxScroll]);

  const showScrollbar = typeof containerHeight === 'number' && totalHeight > effectiveContainerHeight + 1;
  const thumbHeight = showScrollbar ? Math.max(20, Math.round((effectiveContainerHeight / totalHeight) * effectiveContainerHeight)) : effectiveContainerHeight;
  const thumbMaxTop = Math.max(0, effectiveContainerHeight - thumbHeight);
  const thumbTop = showScrollbar && maxScroll > 0 ? Math.round((scrollTop / maxScroll) * thumbMaxTop) : 0;
  
  useEffect(() => {
    const onMove = (ev) => {
      if (!draggingRef.current) return;
      const clientY = (ev && ev.clientY) || (ev.touches && ev.touches[0] && ev.touches[0].clientY) || 0;
      const dy = clientY - dragStartY.current;
      const ratio = thumbMaxTop > 0 ? dy / thumbMaxTop : 0;
      const newScroll = Math.max(0, Math.min(maxScroll, Math.round(dragStartScroll.current + ratio * maxScroll)));
      setScrollTop(newScroll);
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [thumbMaxTop, maxScroll]);

  // Scrollbar handlers
  const onThumbMouseDown = (e) => {
    e.preventDefault();
    draggingRef.current = true;
    dragStartY.current = (e && e.clientY) || (e.touches && e.touches[0] && e.touches[0].clientY) || 0;
    dragStartScroll.current = scrollTop;
  };

  const onTrackClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY) || 0) - rect.top;
    const ratio = thumbMaxTop > 0 ? (y - Math.round(thumbHeight / 2)) / thumbMaxTop : 0;
    const newScroll = Math.max(0, Math.min(maxScroll, Math.round(ratio * maxScroll)));
    setScrollTop(newScroll);
  };

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: effectiveContainerHeight, overflow: 'hidden', position: 'relative', boxSizing: 'border-box' }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visible.map(v => {
          const left = v.col * (cellWidthActual + gap);
          const top = v.row * rowHeight - scrollTop;
          const style = { position: 'absolute', left, top, width: cellWidthActual, height: cellHeight, boxSizing: 'border-box' };
          return (
            <div key={v.idx} style={style}>
              <div style={{ height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
                {renderItem(v.item, v.idx)}
              </div>
            </div>
          );
        })}
      </div>

      {showScrollbar && (
        <div style={{ position: 'absolute', right: 2, top: 2, bottom: 2, width: 10, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
          <div onClick={onTrackClick} style={{ width: 8, height: effectiveContainerHeight - 4, background: 'rgba(0,0,0,0.06)', borderRadius: 6, position: 'relative', cursor: 'pointer' }}>
            <div onMouseDown={onThumbMouseDown} onTouchStart={onThumbMouseDown} style={{ position: 'absolute', left: 1, width: 6, top: thumbTop + 2, height: thumbHeight, background: 'rgba(0,0,0,0.35)', borderRadius: 6, cursor: 'grab' }} />
          </div>
        </div>
      )}
    </div>
  );
};

const LegendWidgetInner = ({ 
  legend, 
  styleConfig,
  genePalette,
  phyloPalette,
  regionPalette,
  proteinLinkConfig,
  nucleotideLinkConfig,
  title = "",
  width = undefined,
  height = undefined,
  className,
  style
}) => {
  // Theme: prefer ThemeContext via `useTheme()` hook, fall back to styleConfig.legend, then sane defaults
  let themeObj = {};
  try {
    const ctx = useTheme();
    if (ctx && typeof ctx.getThemeColors === 'function') themeObj = ctx.getThemeColors();
    else themeObj = ctx || {};
  } catch (e) {
    themeObj = {};
  }

  // DEFAULT_CONFIG uses `widgetBackground` and `text` keys for colors
  // Prefer CSS theme vars so the widget always matches Tailwind / root variables
  // Fallback to JS theme object for font family and sizes if provided
  const fontFamily = themeObj?.fontFamily ?? styleConfig?.legend?.fontFamily ?? 'var(--font-sans, Inter, system-ui, -apple-system, "Segoe UI", Roboto)';
  const baseFontSize = themeObj?.fontSize ?? styleConfig?.legend?.fontSize ?? 11;
  // Use CSS variables for colors so CSS-driven theme changes (via .dark/.light) take effect
  const containerBackgroundCss = 'var(--color-card, var(--widgetBackground, var(--background, white)))';
  const containerTextCss = 'var(--color-card-foreground, var(--foreground, #333))';

  const itemTextStyle = {
    fontSize: `${baseFontSize}px`,
    color: 'inherit', // inherit from container which uses CSS var
    fontFamily,
  };

  // Helper function to truncate text to maximum character length
  const truncateText = (text, maxLength = 30) => {
    const str = String(text || '');
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  };

  const headerTextStyle = { fontSize: `${Math.max(12, baseFontSize + 2)}px`, color: 'inherit', fontFamily, fontWeight: 600 };
  // No top-level measurement here: let VirtualGrid measure its own container
  // Helpers: convert color formats and render SVG swatches that match on-canvas shapes
  const colorToCss = (color, alphaOverride = null) => {
    if (!color) return '#eee';
    if (Array.isArray(color)) {
      const a = typeof alphaOverride === 'number' ? alphaOverride : (color.length > 3 ? (color[3] / 255) : 1);
      return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${a})`;
    }
    return String(color);
  };

  // Compare helper
  const compareAny = (a, b) => {
    const na = Number(a);
    const nb = Number(b);
    const isNumA = !Number.isNaN(na) && String(a).trim() !== '';
    const isNumB = !Number.isNaN(nb) && String(b).trim() !== '';
    if (isNumA && isNumB) return na - nb;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  };

  const sortItemsByValue = (items) => {
    if (!items || !Array.isArray(items)) return items;
    try {
      return [...items].sort((x, y) => compareAny(x.value ?? x.label ?? x[0], y.value ?? y.label ?? y[0]));
    } catch (e) { return items; }
  };

  // SVG swatch generator that matches on-canvas shapes
  const svgSwatch = (color, type = 'rect', w = 18, h = 12, strokeColor = null) => {
    const fill = colorToCss(color);
    const stroke = strokeColor ? colorToCss(strokeColor) : '#555';
    
    if (type === 'arrow') {
      const basePad = 1.0;
      const strokeW = 1;
      const strokePad = strokeW / 2;
      const pY = basePad + strokePad;
      const pX = basePad + strokePad;

      const TIP_WIDTH_FACTOR = styleConfig?.gene?.tipWidthFactor ?? 0.1;
      const geneHeightWorld = styleConfig?.gene?.height ?? 60;
      const arrowheadWorld = styleConfig?.gene?.arrowheadHeight ?? 0;

      const halfH_world = geneHeightWorld / 2;
      const arrowHalf_world = halfH_world + (arrowheadWorld / 2);

      const tipW = Math.max(2, Math.round(w * TIP_WIDTH_FACTOR));
      const startX = pX;
      let endX = w - pX;
      let baseX = endX - tipW;

      const sY = (h - 2 * pY) / geneHeightWorld;
      const midY = pY + (h - 2 * pY) / 2;
      const toSwY = (yW) => midY + yW * sY;

      let pts = [
        [startX, toSwY(-halfH_world)],
        [baseX, toSwY(-halfH_world)],
        [baseX, toSwY(-arrowHalf_world)],
        [endX, toSwY(0)],
        [baseX, toSwY(arrowHalf_world)],
        [baseX, toSwY(halfH_world)],
        [startX, toSwY(halfH_world)],
      ];

      let minY = Infinity, maxY = -Infinity;
      for (const [, y] of pts) { 
        if (y < minY) minY = y; 
        if (y > maxY) maxY = y; 
      }
      const shiftDown = Math.max(0, pY - minY);
      if (shiftDown) pts = pts.map(([x, y]) => [x, y + shiftDown]);

      minY += shiftDown; maxY += shiftDown;
      const wantBottom = h - pY;
      const extraH = Math.max(0, Math.ceil(maxY - wantBottom));
      const svgH = h + extraH;

      let minX = Infinity, maxX = -Infinity;
      for (const [x] of pts) { 
        if (x < minX) minX = x; 
        if (x > maxX) maxX = x; 
      }

      const wantRight = w - basePad;
      const extraW = Math.max(0, Math.ceil(maxX - wantRight));
      const svgW = w + extraW;

      const needLeftShift = Math.max(0, basePad - minX);
      if (extraW || needLeftShift) {
        const dx = needLeftShift;
        if (dx) pts = pts.map(([x, y]) => [x + dx, y]);
      }

      const polygonPoints = pts.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(' ');

      return (
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} xmlns="http://www.w3.org/2000/svg">
          <polygon points={polygonPoints} fill={fill} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="miter" strokeMiterlimit={10} strokeLinecap="butt" />
        </svg>
      );
    }

    if (type === 'half-arrow') {
      const basePad = 1.0;
      const strokeW = 1;
      const strokePad = strokeW / 2;
      const pX = basePad + strokePad;
      const pY = basePad + strokePad;

      const TIP_WIDTH_FACTOR = styleConfig?.gene?.tipWidthFactor ?? 0.1;
      const geneHeightWorld = styleConfig?.gene?.height ?? 60;
      const arrowheadWorld = styleConfig?.gene?.arrowheadHeight ?? 0;

      const halfH_world = geneHeightWorld / 2;
      const arrowHalf_w = halfH_world + (arrowheadWorld / 2);

      const tipW = Math.max(2, Math.round(w * TIP_WIDTH_FACTOR));
      const startX = pX;
      let endX = w - pX;
      let baseX = endX - tipW;

      const sY = (h - 2 * pY) / geneHeightWorld;
      const midY = pY + (h - 2 * pY) / 2;
      const toSwY = (yW) => midY + yW * sY;

      let pts = [
        [startX, toSwY(-halfH_world)],
        [baseX, toSwY(-halfH_world)],
        [baseX, toSwY(-arrowHalf_w)],
        [endX, toSwY(0)],
        [baseX, midY],
        [startX, midY],
      ];

      let minY = Infinity, maxY = -Infinity;
      for (const [, y] of pts) { 
        if (y < minY) minY = y; 
        if (y > maxY) maxY = y; 
      }

      const shiftDown = Math.max(0, pY - minY);
      if (shiftDown) pts = pts.map(([x, y]) => [x, y + shiftDown]);

      minY += shiftDown; maxY += shiftDown;

      const wantBottom = h - pY;
      const extraH = Math.max(0, Math.ceil(maxY - wantBottom));
      const svgH = h + extraH;

      let minX = Infinity, maxX = -Infinity;
      for (const [x] of pts) { 
        if (x < minX) minX = x; 
        if (x > maxX) maxX = x; 
      }

      const wantRight = w - basePad;
      const extraW = Math.max(0, Math.ceil(maxX - wantRight));
      const svgW = w + extraW;

      const needLeftShift = Math.max(0, basePad - minX);
      if (extraW || needLeftShift) {
        const dx = needLeftShift;
        if (dx) pts = pts.map(([x, y]) => [x + dx, y]);
      }

      const fillPts = pts.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(' ');

      return (
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} xmlns="http://www.w3.org/2000/svg">
          <polygon points={fillPts} fill={fill} stroke="none" />
          <polygon points={fillPts} fill="none" stroke={stroke} strokeWidth={strokeW} strokeLinejoin="miter" strokeMiterlimit={10} strokeLinecap="butt" />
        </svg>
      );
    }

    if (type === 'region') {
      const strokeColor = colorToCss(color);
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
          <rect x={0.5} y={0.5} width={w-1} height={h-1} fill="none" stroke={strokeColor || colorToCss(color)} strokeWidth={1.5} />
        </svg>
      );
    }

    if (type === 'phylo') {
      const lineColor = '#000'; // Black line
      const circleColor = fill; // Circle uses the same color as text
      const padding = 1;
      const lineStart = padding;
      const lineEnd = w - h/2 - padding; // Leave space for circle
      const midY = h / 2;
      const circleX = w - h/2;
      const circleRadius = Math.max(2, (h - 2*padding) / 2 - 1);
      
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
          {/* Black line */}
          <line 
            x1={lineStart} 
            y1={midY} 
            x2={lineEnd} 
            y2={midY} 
            stroke={lineColor} 
            strokeWidth={1.5} 
          />
          {/* Colored circle */}
          <circle 
            cx={circleX} 
            cy={midY} 
            r={circleRadius} 
            fill={circleColor} 
            stroke="#333" 
            strokeWidth={0.5} 
          />
        </svg>
      );
    }

    return <div style={{ width: w, height: h, background: fill, border: '1px solid #ccc' }} />;
  };

  const formatSim = (v) => {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number') {
      if (v >= 0 && v <= 1) return `${Math.round(v * 100)}%`;
      if (Math.abs(v) < 100) return v.toFixed(2);
      return `${Math.round(v)}`;
    }
    return String(v);
  };

  const gradientSwatchWithEndpoints = (paletteArray, minVal, maxVal, label) => {
    if (!Array.isArray(paletteArray) || paletteArray.length === 0) return null;
    const stopsCss = paletteArray.map((c, i) => `${colorToCss(c)} ${Math.round(100*(i/(paletteArray.length-1)||0))}%`).join(', ');
    const hasEndpoints = (minVal !== undefined && minVal !== null && minVal !== '') || (maxVal !== undefined && maxVal !== null && maxVal !== '');
    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', flexDirection: 'column', paddingLeft: '8px', paddingRight: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', justifyContent: 'flex-start' }}>
          <div style={{ position: 'relative', width: '100%', height: '14px', background: `linear-gradient(90deg, ${stopsCss})`, border: '1px solid #ccc', boxSizing: 'border-box', marginLeft: '4px', marginRight: '4px' }}>
            {hasEndpoints && (
              <>
                <div style={{ 
                  position: 'absolute', 
                  left: '0px', 
                  bottom: '-16px', 
                  fontSize: '8px', 
                  color: itemTextStyle.color || '#666', 
                  opacity: 0.7,
                  lineHeight: '1',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap'
                }}>
                  {formatSim(minVal)}
                </div>
                <div style={{ 
                  position: 'absolute', 
                  right: '0px', 
                  bottom: '-16px', 
                  fontSize: '8px', 
                  color: itemTextStyle.color || '#666', 
                  opacity: 0.7,
                  lineHeight: '1',
                  transform: 'translateX(50%)',
                  whiteSpace: 'nowrap'
                }}>
                  {formatSim(maxVal)}
                </div>
              </>
            )}
          </div>
          <div style={{ ...itemTextStyle, whiteSpace: 'nowrap', minWidth: 'fit-content' }}>{label}</div>
        </div>
      </div>
    );
  };

  // Build legend parts
  const parts = [];

  // Tree leaves (try several likely keys/shapes in the legend payload)
  const leavesRaw = legend?.leaves ?? legend?.leafLabels ?? legend?.leafs ?? legend?.treeLeaves ?? null;
  // Also support an explicit mapping field (common pattern)
  const leavesMapping = legend?.leaves?.mapping ?? legend?.leafMapping ?? legend?.leafs?.mapping ?? null;
  let normalizedLeaves = null;
  if (Array.isArray(leavesMapping) && leavesMapping.length > 0) {
    normalizedLeaves = leavesMapping.map(x => (typeof x === 'string' ? { label: x, color: null } : ({ label: x.label ?? x.value ?? x[0], color: x.color ?? x.fill ?? null, stroke: x.stroke ?? null })));
  } else if (Array.isArray(leavesRaw) && leavesRaw.length > 0) {
    normalizedLeaves = leavesRaw.map(x => (typeof x === 'string' ? { label: x, color: null } : ({ label: x.label ?? x.value ?? x[0], color: x.color ?? x.fill ?? null, stroke: x.stroke ?? null })));
  } else if (leavesRaw && typeof leavesRaw === 'object') {
    // object mapping: { label: color } or { label: { color, stroke } }
    normalizedLeaves = Object.entries(leavesRaw).map(([k, v]) => {
      if (v == null) return { label: k, color: null };
      if (typeof v === 'string' || Array.isArray(v)) return { label: k, color: v, stroke: null };
      return { label: k, color: v.color ?? v.fill ?? null, stroke: v.stroke ?? null };
    });
  }

  if (normalizedLeaves && normalizedLeaves.length > 0) {
    const sortedLeaves = sortItemsByValue(normalizedLeaves);
    parts.push(
      <div key="leaves" style={{ marginBottom: '8px', width: '100%' }}>
        <div style={{ width: '100%' }}><Label className="text-xs font-medium" style={headerTextStyle}>Tree leaves</Label></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', justifyContent: 'flex-start', width: '100%' }}>
          <VirtualGrid
            items={sortedLeaves}
            cellWidth={140}
            cellHeight={20}
            /* render row-by-row like gene legend */
            minContentWidth={120}
            columns={1}
            renderItem={(it, i) => (
              <div key={`leaf-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', minWidth: 0 }}>
                {svgSwatch(it.color, 'arrow', 18, 12, it.stroke)}
                <div style={{ ...itemTextStyle, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', wordBreak: 'break-word' }}>{String(it.label)}</div>
              </div>
            )}
          />
        </div>
      </div>
    );
  }

  // Genes
  // Genes
if (legend && legend.genes && Array.isArray(legend.genes)) {
  const sortedGenes = sortItemsByValue(legend.genes);
  if (sortedGenes && sortedGenes.length > 0) {
    parts.push(
      <div key="genes" style={{ marginBottom: '8px', width: '100%', maxWidth: '100%' }}>
        <div style={{ width: '100%' }}>
          <Label className="text-xs font-medium">Gene families</Label>
        </div>
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '6px', 
          marginTop: '6px', 
          justifyContent: 'flex-start', 
          width: '100%', 
          boxSizing: 'border-box',
          maxHeight: 600,            // Optional: visually constrain outer div too
          overflow: 'hidden'         // Ensure extra content doesn't spill
        }}>
          <VirtualGrid
            items={sortedGenes}
            cellWidth={140}
            cellHeight={20}
            containerHeight={100}         // 👈 This activates virtualization (scrolling)
            minContentWidth={120}
            renderItem={(it, i) => (
              <div key={`gene-${i}`} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                width: '100%', 
                minWidth: 0 
              }}>
                {svgSwatch(it.color, 'arrow', 18, 12, it.stroke)}
                <div style={{ 
                  ...itemTextStyle, 
                  flex: 1, 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'normal', 
                  wordBreak: 'break-word' 
                }}>
                  {truncateText(it.value, 30)}
                </div>
              </div>
            )}
          />
        </div>
      </div>
    );
  }
}


  // Phylo labels
  if (legend && legend.phylo && Array.isArray(legend.phylo)) {
    const sortedPhylo = sortItemsByValue(legend.phylo);
    if (sortedPhylo && sortedPhylo.length > 0) {
      parts.push(
        <div key="phylo" style={{ marginBottom: '8px', width: '100%', maxWidth: '100%' }}>
          <div style={{ width: '100%' }}>
            <Label className="text-xs font-medium">Phylo labels</Label>
          </div>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '6px', 
            marginTop: '6px', 
            justifyContent: 'flex-start', 
            width: '100%', 
            boxSizing: 'border-box',
            maxHeight: 600,            // Optional: visually constrain outer div too
            overflow: 'hidden'         // Ensure extra content doesn't spill
          }}>
            <VirtualGrid
              items={sortedPhylo}
              cellWidth={140}
              cellHeight={20}
              containerHeight={100}         // 👈 This activates virtualization (scrolling)
              minContentWidth={120}
              renderItem={(it, i) => (
                <div key={`phylo-${i}`} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  width: '100%', 
                  minWidth: 0 
                }}>
                  {svgSwatch(it.color, 'phylo', 18, 12, it.stroke)}
                  <div style={{ 
                    ...itemTextStyle, 
                    flex: 1, 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'normal', 
                    wordBreak: 'break-word' 
                  }}>
                    {truncateText(it?.value ?? it?.label ?? it ?? '', 30)}
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      );
    }
  }

  // ncRNAs
  const ncItemsLive = legend && legend.ncRNAs ? legend.ncRNAs : null;
  if (ncItemsLive && Array.isArray(ncItemsLive) && ncItemsLive.length > 0) {
    const normalizedNc = ncItemsLive.map(x => ({ label: x.label, color: x.color, stroke: x.stroke }));
    const sortedNc = sortItemsByValue(normalizedNc);
    parts.push(
      <div key="ncrna-live" style={{ marginBottom: '8px' }}>
        <div style={{ width: '100%' }}><Label className="text-xs font-medium">ncRNAs</Label></div>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', justifyContent: 'flex-start', width: '100%' }}>
          <VirtualGrid
            items={sortedNc}
            cellWidth={140}
            cellHeight={16}
            /* containerHeight omitted so VirtualGrid measures its own height */
            minContentWidth={120}
            renderItem={(it, i) => (
              <div key={`ncrna-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', minWidth: 0 }}>
                {svgSwatch(it.color, 'half-arrow', 12, 10, it.stroke)}
                <div style={{ ...itemTextStyle, flex: 1, lineHeight: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', wordBreak: 'break-word' }}>{String(it.label)}</div>
              </div>
            )}
          />
        </div>
      </div>
    );
  }

  // Regions
  if (legend && legend.regions && typeof legend.regions === 'object') {
    const normalized = Array.isArray(legend.regions) 
      ? legend.regions 
      : Object.entries(legend.regions).map(([k, c]) => [k, c]);
    if (normalized.length > 0) {
      parts.push(
        <div key="regions" style={{ marginBottom: '8px' }}>
          <div style={{ width: '100%' }}><Label className="text-xs font-medium">Regions</Label></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', justifyContent: 'flex-start', width: '100%' }}>
            <VirtualGrid
              items={normalized.sort((a,b) => compareAny(a[0], b[0]))}
              cellWidth={160}
              cellHeight={20}
              /* containerHeight omitted so VirtualGrid measures its own height */
              minContentWidth={120}
              renderItem={(it, i) => (
                <div key={`region-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '100%' }}>
                  {svgSwatch(it[1], 'region', 18, 12, it[1] && it[1].stroke ? it[1].stroke : null)}
                  <div style={{ ...itemTextStyle, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', wordBreak: 'break-word' }}>{String(it[0])}</div>
                </div>
              )}
            />
          </div>
        </div>
      );
    }
  }

  // Links: render from provided config if available, otherwise fall back to legend payload
  const protParts = [];
  const nucParts = [];

  // Helper to render mapping array (id/label/color entries)
  const renderMappingList = (mapping = [], keyPrefix = 'map') => {
    if (!Array.isArray(mapping) || mapping.length === 0) return null;
    // Render a compact horizontal color tile bar (don't list each item)
    const colors = mapping.map(m => Array.isArray(m.color) ? colorToCss(m.color) : (m.color ? String(m.color) : '#ccc'));
    const maxShow = 8;
    const show = colors.slice(0, maxShow);
    const extra = Math.max(0, colors.length - show.length);
    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexWrap: 'wrap' }}>
          {show.map((c, i) => (
            <div key={`${keyPrefix}-sw-${i}`} style={{ width: 18, height: 12, background: c, border: '1px solid #ccc', boxSizing: 'border-box' }} />
          ))}
          {extra > 0 && <div style={{ ...itemTextStyle, opacity: 0.8 }}>+{extra}</div>}
        </div>
        <div style={{ ...itemTextStyle }}>{mapping.length} categories</div>
      </div>
    );
  };

  // Preferred: honor explicit config (controls in Sidebar). Fallback: use legend payload.
  if (proteinLinkConfig) {
    const cfg = proteinLinkConfig;
    if (cfg.colorBy === 'source_gene' || cfg.colorBy === 'target_gene') {
      const mapping = legend && legend.proteinLinks && Array.isArray(legend.proteinLinks.mapping) ? legend.proteinLinks.mapping : null;
      if (mapping && mapping.length > 0) {
        protParts.push(
          <div key="prot-gene-pal" style={{ width: '100%' }}>
            {renderMappingList(mapping, 'prot')}
          </div>
        );
      }
    } else if (cfg.colorBy === 'identity_gradient' && cfg.palette && cfg.palette.enabled) {
      const pal = cfg.palette ? getPaletteColors(cfg.palette.name, cfg.palette.numColors || 8, cfg.palette.reverse || false) : [];
      const legendLabel = 'AA align';
        protParts.push(
          <div key="prot-grad" style={{ width: '100%' }}>
            {gradientSwatchWithEndpoints(pal, legend && legend.proteinLinks ? legend.proteinLinks.minSim : '', legend && legend.proteinLinks ? legend.proteinLinks.maxSim : '', legendLabel)}
          </div>
        );
    } else if (cfg.colorBy === 'identity_solid' || cfg.colorBy === 'solid' || cfg.solidColor) {
      const base = cfg.solidColor || [200,200,200,255];
      if (cfg.useAlpha && typeof cfg.minAlpha === 'number' && typeof cfg.maxAlpha === 'number' && cfg.minAlpha !== cfg.maxAlpha) {
        const c0 = colorToCss(base, cfg.minAlpha);
        const c1 = colorToCss(base, cfg.maxAlpha);
        protParts.push(
          <div key="prot-alpha" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', paddingLeft: '8px', paddingRight: '8px' }}>
            <div style={{ width: '100%', height: '14px', background: `linear-gradient(90deg, ${c0}, ${c1})`, border: '1px solid #ccc', marginLeft: '4px', marginRight: '4px' }} />
            <div style={{ ...itemTextStyle, whiteSpace: 'nowrap', minWidth: 'fit-content' }}>AA align</div>
          </div>
        );
      } else {
        protParts.push(
          <div key="prot-solid" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', paddingLeft: '8px', paddingRight: '8px' }}>
            <div style={{ marginLeft: '4px', marginRight: '4px' }}>{svgSwatch(base, 'rect', 24, 12)}</div>
            <div style={{ fontSize: '11px', whiteSpace: 'nowrap', minWidth: 'fit-content' }}>AA align</div>
          </div>
        );
      }
    }
  } else if (legend && legend.proteinLinks) {
    // Fallback: render based on legend payload
    const lp = legend.proteinLinks;
    if (lp.mapping && Array.isArray(lp.mapping) && lp.mapping.length > 0) {
      protParts.push(<div key="prot-mapping" style={{ width: '100%' }}>{renderMappingList(lp.mapping, 'prot')}</div>);
    } else if (lp.mode === 'identity_gradient' && lp.palette) {
      protParts.push(<div key="prot-grad-payload">{gradientSwatchWithEndpoints(lp.palette, lp.minSim, lp.maxSim, 'AA align')}</div>);
    } else if (lp.solidColor || lp.useAlpha) {
      const base = lp.solidColor || [200,200,200,255];
      if (lp.useAlpha && typeof lp.minAlpha === 'number' && typeof lp.maxAlpha === 'number' && lp.minAlpha !== lp.maxAlpha) {
        const c0 = colorToCss(base, lp.minAlpha);
        const c1 = colorToCss(base, lp.maxAlpha);
        protParts.push(<div key="prot-alpha-payload" style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingLeft: '8px', paddingRight: '8px' }}><div style={{ width: '100%', height: '14px', background: `linear-gradient(90deg, ${c0}, ${c1})`, border: '1px solid #ccc', marginLeft: '4px', marginRight: '4px' }} /><div style={{ fontSize: '11px', whiteSpace: 'nowrap', minWidth: 'fit-content' }}>AA align</div></div>);
      } else {
        protParts.push(<div key="prot-solid-payload" style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingLeft: '8px', paddingRight: '8px' }}><div style={{ marginLeft: '4px', marginRight: '4px' }}>{svgSwatch(base, 'rect', 24, 12)}</div><div style={{ fontSize: '11px', whiteSpace: 'nowrap', minWidth: 'fit-content' }}>AA align</div></div>);
      }
    }
  }

  // Nucleotide links - same fallback behavior
  if (nucleotideLinkConfig) {
    const cfg = nucleotideLinkConfig;
    if (cfg.colorBy === 'identity_gradient' && cfg.palette && cfg.palette.enabled) {
      const pal = cfg.palette ? getPaletteColors(cfg.palette.name, cfg.palette.numColors || 8, cfg.palette.reverse || false) : [];
      const legendLabel = 'NT align';
        nucParts.push(
        <div key="nuc-grad" style={{ width: '100%' }}>
          {gradientSwatchWithEndpoints(pal, legend && legend.nucleotideLinks ? legend.nucleotideLinks.minSim : '', legend && legend.nucleotideLinks ? legend.nucleotideLinks.maxSim : '', legendLabel)}
        </div>
      );
    } else {
      const base = cfg.solidColor || [200,200,200,255];
      if (cfg.useAlpha && typeof cfg.minAlpha === 'number' && typeof cfg.maxAlpha === 'number' && cfg.minAlpha !== cfg.maxAlpha) {
        const c0 = colorToCss(base, cfg.minAlpha);
        const c1 = colorToCss(base, cfg.maxAlpha);
        nucParts.push(
          <div key="nuc-alpha" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', paddingLeft: '8px', paddingRight: '8px' }}>
            <div style={{ width: '100%', height: '14px', background: `linear-gradient(90deg, ${c0}, ${c1})`, border: '1px solid #ccc', marginLeft: '4px', marginRight: '4px' }} />
            <div style={{ ...itemTextStyle, whiteSpace: 'nowrap', minWidth: 'fit-content' }}>NT align</div>
          </div>
        );
      } else {
        nucParts.push(
          <div key="nuc-solid" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', paddingLeft: '8px', paddingRight: '8px' }}>
            <div style={{ marginLeft: '4px', marginRight: '4px' }}>{svgSwatch(base, 'rect', 24, 12)}</div>
            <div style={{ fontSize: '11px', whiteSpace: 'nowrap', minWidth: 'fit-content' }}>NT align</div>
          </div>
        );
      }
    }
  } else if (legend && legend.nucleotideLinks) {
    const lp = legend.nucleotideLinks;
    if (lp.mapping && Array.isArray(lp.mapping) && lp.mapping.length > 0) {
      nucParts.push(<div key="nuc-mapping" style={{ width: '100%' }}>{renderMappingList(lp.mapping, 'nuc')}</div>);
    } else if (lp.mode === 'identity_gradient' && lp.palette) {
      nucParts.push(<div key="nuc-grad-payload">{gradientSwatchWithEndpoints(lp.palette, lp.minSim, lp.maxSim, 'NT align')}</div>);
    } else if (lp.solidColor || lp.useAlpha) {
      const base = lp.solidColor || [200,200,200,255];
      if (lp.useAlpha && typeof lp.minAlpha === 'number' && typeof lp.maxAlpha === 'number' && lp.minAlpha !== lp.maxAlpha) {
        const c0 = colorToCss(base, lp.minAlpha);
        const c1 = colorToCss(base, lp.maxAlpha);
        nucParts.push(<div key="nuc-alpha-payload" style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingLeft: '8px', paddingRight: '8px' }}><div style={{ width: '100%', height: '14px', background: `linear-gradient(90deg, ${c0}, ${c1})`, border: '1px solid #ccc', marginLeft: '4px', marginRight: '4px' }} /><div style={{ fontSize: '11px', whiteSpace: 'nowrap', minWidth: 'fit-content' }}>NT align</div></div>);
      } else {
        nucParts.push(<div key="nuc-solid-payload" style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingLeft: '8px', paddingRight: '8px' }}><div style={{ marginLeft: '4px', marginRight: '4px' }}>{svgSwatch(base, 'rect', 24, 12)}</div><div style={{ fontSize: '11px', whiteSpace: 'nowrap', minWidth: 'fit-content' }}>NT align</div></div>);
      }
    }
  }

  if (protParts.length > 0 || nucParts.length > 0) {
    parts.push(
      <div key="links" style={{ marginBottom: '8px' }}>
        <div style={{ width: '100%' }}><Label className="text-xs font-medium">Links</Label></div>
        <div style={{ marginTop: '6px' }}>
          {protParts.length > 0 && (
            <div style={{ marginBottom: '6px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
              <div style={{ ...headerTextStyle }}>Protein links</div>
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>{protParts}</div>
            </div>
          )}
          {nucParts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
              <div style={{ ...headerTextStyle }}>Nucleotide links</div>
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>{nucParts}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Debug: if there were link payloads but no rendered parts, log for diagnostics
  try {
    if ((legend && legend.proteinLinks && !Array.isArray(legend.proteinLinks.mapping) && !legend.proteinLinks.palette && !legend.proteinLinks.solidColor) && protParts.length === 0) {
      console.debug('[LegendWidget] proteinLinks payload present but no protParts rendered:', legend.proteinLinks);
    }
    if ((legend && legend.nucleotideLinks && !Array.isArray(legend.nucleotideLinks.mapping) && !legend.nucleotideLinks.palette && !legend.nucleotideLinks.solidColor) && nucParts.length === 0) {
      console.debug('[LegendWidget] nucleotideLinks payload present but no nucParts rendered:', legend.nucleotideLinks);
    }
  } catch (e) {}

  const containerStyle = {
    background: containerBackgroundCss,
  border: 'none',
    borderRadius: '5px',
    padding: '10px',
    width: width ?? '100%',
    maxWidth: '100%',
    height: height ?? 'auto',
    color: containerTextCss,
    fontFamily: fontFamily,
    overflow: 'auto',
    boxSizing: 'border-box',
    ...style
  };

  return (
  <div className={className} style={containerStyle}>
  <div style={{ marginBottom: '10px', textAlign: 'center' }}><span style={headerTextStyle}>{title}</span></div>
      {parts.length === 0 ? (
        (() => { try { console.debug('[LegendWidget] no parts built, legend prop keys=', legend ? Object.keys(legend) : null, 'props genePalette=', genePalette, 'phyloPalette=', phyloPalette); } catch (e) {} return (
    <div style={{ ...itemTextStyle, color: itemTextStyle.color ? itemTextStyle.color : '#666', textAlign: 'center' }}>No legend entries available</div>
        ); })()
      ) : (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
          {parts}
        </div>
      )}
    </div>
  );
};

// Memoize LegendWidget to prevent unnecessary re-renders
// Only re-render when legend data actually changes (using JSON comparison)
const LegendWidget = React.memo(LegendWidgetInner, (prevProps, nextProps) => {
  // Custom comparison - only re-render if legend content actually changed
  try {
    const prevLegend = JSON.stringify(prevProps.legend);
    const nextLegend = JSON.stringify(nextProps.legend);
    if (prevLegend !== nextLegend) return false; // Different legend, re-render
    
    // Check other important props
    if (prevProps.genePalette?.name !== nextProps.genePalette?.name) return false;
    if (prevProps.phyloPalette?.name !== nextProps.phyloPalette?.name) return false;
    if (prevProps.regionPalette?.name !== nextProps.regionPalette?.name) return false;
    
    return true; // Props are equal, don't re-render
  } catch (e) {
    return false; // On error, allow re-render
  }
});

export default LegendWidget;
