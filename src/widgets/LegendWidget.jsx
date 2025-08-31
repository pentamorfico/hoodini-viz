import React, { useRef, useState, useEffect } from 'react';
import { getPaletteColors } from '../utils/colorPalettes.js';

const LegendWidget = ({ 
  legend, 
  styleConfig,
  genePalette,
  phyloPalette,
  regionPalette,
  proteinLinkConfig,
  nucleotideLinkConfig,
  title = "Legend",
  width = "320px",
  height = "400px",
  className,
  style
}) => {
  // debug props during development to catch missing legend/phylo data
  useEffect(() => {
    try {
      console.log('LegendWidget props', { hasLegend: !!legend, legendKeys: legend ? Object.keys(legend) : [], phyloSample: legend && legend.phylo ? legend.phylo.slice(0,6) : undefined, phyloPalette });
    } catch (e) { /* ignore */ }
  }, [legend, phyloPalette]);
  // Helpers: convert color formats and render SVG swatches that match on-canvas shapes
  const colorToCss = (color, alphaOverride = null) => {
    if (!color) return '#eee';
    if (Array.isArray(color)) {
      const a = typeof alphaOverride === 'number' ? alphaOverride : (color.length > 3 ? (color[3] / 255) : 1);
      return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${a})`;
    }
    return String(color);
  };

  // Lightweight virtualized grid for legend items
  const VirtualGrid = ({ items = [], renderItem, cellWidth = 2040, cellHeight = 28, gap = 6, containerHeight = 96, className, minContentWidth = 220, getItemLabel = null, charWidthEstimate = 7, labelPadding = 36 }) => {
    const containerRef = useRef(null);
    const [width, setWidth] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [columns, setColumns] = useState(1);
    const draggingRef = useRef(false);
    const dragStartY = useRef(0);
    const dragStartScroll = useRef(0);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const ro = new ResizeObserver(entries => {
        const w = entries[0].contentRect.width;
        setWidth(w);
      });
      ro.observe(el);
      setTimeout(() => setWidth(el.clientWidth || 0), 0);
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

    useEffect(() => {
      const avail = (width && width > 0) ? width : Math.max(minContentWidth, (containerRef.current && containerRef.current.clientWidth) || 0);
      const cols = Math.max(1, Math.min(items.length || 1, Math.floor((avail + gap) / (effectiveCellWidth + gap))));
      setColumns(cols);
    }, [width, effectiveCellWidth, gap, items.length, minContentWidth]);

    const totalRows = Math.max(1, Math.ceil(items.length / columns));
    const rowHeight = cellHeight + gap;
    const totalHeight = totalRows * rowHeight;

    // Compute actual cell width so items evenly fill the container width
    const availW = (width && width > 0) ? width : Math.max(minContentWidth, (containerRef.current && containerRef.current.clientWidth) || 0);
    const colsUsed = Math.max(1, columns);
    const cellWidthActual = Math.floor((Math.max(0, availW - (colsUsed - 1) * gap)) / colsUsed) || cellWidth;

    const maxScroll = Math.max(0, totalHeight - containerHeight);
    useEffect(() => {
      setScrollTop(prev => Math.min(prev, maxScroll));
    }, [maxScroll]);

    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 1);
    const endRow = Math.min(totalRows - 1, startRow + Math.ceil(containerHeight / rowHeight) + 3);

    const visible = [];
    for (let r = startRow; r <= endRow; r++) {
      for (let c = 0; c < columns; c++) {
        const idx = r * columns + c;
        if (idx >= items.length) break;
        visible.push({ idx, item: items[idx], row: r, col: c });
      }
    }

    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY;
      setScrollTop(s => Math.max(0, Math.min(maxScroll, s + delta)));
    };

    const showScrollbar = totalHeight > containerHeight + 1;
    const thumbHeight = showScrollbar ? Math.max(20, Math.round((containerHeight / totalHeight) * containerHeight)) : containerHeight;
    const thumbMaxTop = Math.max(0, containerHeight - thumbHeight);
    const thumbTop = showScrollbar && maxScroll > 0 ? Math.round((scrollTop / maxScroll) * thumbMaxTop) : 0;

    useEffect(() => {
      const onMove = (ev) => {
        if (!draggingRef.current) return;
        const clientY = ev.clientY || (ev.touches && ev.touches[0] && ev.touches[0].clientY) || 0;
        const dy = clientY - dragStartY.current;
        const ratio = maxScroll > 0 ? dy / thumbMaxTop : 0;
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
    }, [maxScroll, thumbMaxTop]);

    const onThumbMouseDown = (ev) => {
      ev.preventDefault();
      draggingRef.current = true;
      dragStartY.current = ev.clientY || (ev.touches && ev.touches[0] && ev.touches[0].clientY) || 0;
      dragStartScroll.current = scrollTop;
    };

    const onTrackClick = (ev) => {
      const rect = ev.currentTarget.getBoundingClientRect();
      const clickY = (ev.clientY || 0) - rect.top;
      const ratio = Math.max(0, Math.min(1, clickY / Math.max(1, containerHeight - thumbHeight)));
      setScrollTop(Math.round(ratio * maxScroll));
    };

    return (
      <div ref={containerRef} className={className} style={{ width: '100%', height: containerHeight, overflow: 'hidden', position: 'relative', boxSizing: 'border-box' }} onWheel={onWheel}>
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visible.map(v => {
            const left = v.col * (cellWidthActual + gap);
            const top = v.row * rowHeight - scrollTop;
            const style = { position: 'absolute', left, top, width: cellWidthActual, height: cellHeight, boxSizing: 'border-box' };
            return (
              <div key={v.idx} style={style}>
                {renderItem(v.item, v.idx)}
              </div>
            );
          })}
        </div>

        {showScrollbar && (
          <div style={{ position: 'absolute', right: 2, top: 2, bottom: 2, width: 10, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
            <div onClick={onTrackClick} style={{ width: 8, height: containerHeight - 4, background: 'rgba(0,0,0,0.06)', borderRadius: 6, position: 'relative', cursor: 'pointer' }}>
              <div onMouseDown={onThumbMouseDown} onTouchStart={onThumbMouseDown} style={{ position: 'absolute', left: 1, width: 6, top: thumbTop + 2, height: thumbHeight, background: 'rgba(0,0,0,0.35)', borderRadius: 6, cursor: 'grab' }} />
            </div>
          </div>
        )}
      </div>
    );
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
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '120px', height: '14px', background: `linear-gradient(90deg, ${stopsCss})`, border: '1px solid #ccc' }} />
          <div style={{ fontSize: '11px' }}>{label}</div>
        </div>
        {hasEndpoints && (
          <div style={{ width: '120px', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 1, height: 8, background: '#333', marginBottom: 2 }} />
              <div style={{ fontSize: '10px', color: '#666' }}>{formatSim(minVal)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 1, height: 8, background: '#333', marginBottom: 2 }} />
              <div style={{ fontSize: '10px', color: '#666' }}>{formatSim(maxVal)}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Build legend parts
  const parts = [];

  // Genes
  if (genePalette && genePalette.enabled && legend && legend.genes && Array.isArray(legend.genes)) {
    const sortedGenes = sortItemsByValue(legend.genes);
    if (sortedGenes && sortedGenes.length > 0) {
      parts.push(
        <div key="genes" style={{ marginBottom: '8px', width: '90%' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', width: '100%' }}>Gene families</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', justifyContent: 'center', width: '100%' }}>
            <VirtualGrid
              items={sortedGenes}
              cellWidth={140}
              cellHeight={20}
              containerHeight={160}
              minContentWidth={280}
              renderItem={(it, i) => (
                <div key={`gene-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', minWidth: 0 }}>
                  {svgSwatch(it.color, 'arrow', 18, 12, it.stroke)}
                  <div style={{ fontSize: '11px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(it.value)}</div>
                </div>
              )}
            />
          </div>
        </div>
      );
    }
  }

  // Phylo labels
  if (phyloPalette && phyloPalette.enabled && legend && legend.phylo && Array.isArray(legend.phylo)) {
    const sortedPhylo = sortItemsByValue(legend.phylo);
    if (sortedPhylo && sortedPhylo.length > 0) {
      parts.push(
        <div key="phylo" style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600' }}>Phylo labels</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', justifyContent: 'center', width: '100%' }}>
            <VirtualGrid
              items={sortedPhylo}
              cellWidth={140}
              cellHeight={20}
              containerHeight={120}
              minContentWidth={280}
              renderItem={(it, i) => (
                <div key={`phylo-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', minWidth: 0 }}>
                  {svgSwatch(it.color, 'rect', 18, 12, it.stroke)}
                  <div style={{ fontSize: '11px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(it?.value ?? it?.label ?? it ?? '')}</div>
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
        <div style={{ fontSize: '12px', fontWeight: '600' }}>ncRNAs</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', justifyContent: 'center', width: '100%' }}>
          <VirtualGrid
            items={sortedNc}
            cellWidth={160}
            cellHeight={20}
            containerHeight={120}
            minContentWidth={280}
            renderItem={(it, i) => (
              <div key={`ncrna-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', minWidth: 0 }}>
                {svgSwatch(it.color, 'half-arrow', 18, 12, it.stroke)}
                <div style={{ fontSize: '11px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(it.label)}</div>
              </div>
            )}
          />
        </div>
      </div>
    );
  }

  // Regions
  if (regionPalette && regionPalette.enabled && legend && legend.regions && typeof legend.regions === 'object') {
    const normalized = Array.isArray(legend.regions) 
      ? legend.regions 
      : Object.entries(legend.regions).map(([k, c]) => [k, c]);
    if (normalized.length > 0) {
      parts.push(
        <div key="regions" style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600' }}>Regions</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', justifyContent: 'center', width: '100%' }}>
            <VirtualGrid
              items={normalized.sort((a,b) => compareAny(a[0], b[0]))}
              cellWidth={160}
              cellHeight={20}
              containerHeight={120}
              minContentWidth={280}
              renderItem={(it, i) => (
                <div key={`region-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '100%' }}>
                  {svgSwatch(it[1], 'region', 18, 12, it[1] && it[1].stroke ? it[1].stroke : null)}
                  <div style={{ fontSize: '11px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(it[0])}</div>
                </div>
              )}
            />
          </div>
        </div>
      );
    }
  }

  // Links
  const protParts = [];
  const nucParts = [];

  if (proteinLinkConfig) {
    const cfg = proteinLinkConfig;
    if (cfg.colorBy === 'source_gene' || cfg.colorBy === 'target_gene') {
      const mapping = legend && legend.proteinLinks && Array.isArray(legend.proteinLinks.mapping) ? legend.proteinLinks.mapping : null;
      if (mapping && mapping.length > 0) {
        const pal = mapping.map(m => Array.isArray(m.color) ? m.color : (typeof m.color === 'string' ? m.color : [0,0,0,255]));
        protParts.push(
          <div key="prot-gene-pal">
            {gradientSwatchWithEndpoints(pal, '', '', cfg.colorBy === 'source_gene' ? 'AA align' : 'AA align')}
          </div>
        );
      }
    } else {
      if (cfg.colorBy === 'identity_gradient' && cfg.palette && cfg.palette.enabled) {
        const pal = cfg.palette ? getPaletteColors(cfg.palette.name, cfg.palette.numColors || 8, cfg.palette.reverse || false) : [];
        const legendLabel = 'AA align';
        protParts.push(
          <div key="prot-grad">
            {gradientSwatchWithEndpoints(pal, legend && legend.proteinLinks ? legend.proteinLinks.minSim : '', legend && legend.proteinLinks ? legend.proteinLinks.maxSim : '', legendLabel)}
          </div>
        );
      } else if (cfg.colorBy === 'identity_solid' || cfg.colorBy === 'solid' || cfg.solidColor) {
        const base = cfg.solidColor || [200,200,200,255];
        if (cfg.useAlpha && typeof cfg.minAlpha === 'number' && typeof cfg.maxAlpha === 'number' && cfg.minAlpha !== cfg.maxAlpha) {
          const c0 = colorToCss(base, cfg.minAlpha);
          const c1 = colorToCss(base, cfg.maxAlpha);
          protParts.push(
            <div key="prot-alpha" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ width: '120px', height: '14px', background: `linear-gradient(90deg, ${c0}, ${c1})`, border: '1px solid #ccc' }} />
              <div style={{ fontSize: '11px' }}>AA align</div>
            </div>
          );
        } else {
          protParts.push(
            <div key="prot-solid" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
              {svgSwatch(base, 'rect', 24, 12)}
              <div style={{ fontSize: '11px' }}>AA align</div>
            </div>
          );
        }
      }
    }
  }

  if (nucleotideLinkConfig) {
    const cfg = nucleotideLinkConfig;
    if (!(cfg.colorBy === 'source_gene' || cfg.colorBy === 'target_gene')) {
      if (cfg.colorBy === 'identity_gradient' && cfg.palette && cfg.palette.enabled) {
        const pal = cfg.palette ? getPaletteColors(cfg.palette.name, cfg.palette.numColors || 8, cfg.palette.reverse || false) : [];
        const legendLabel = 'NT align';
        nucParts.push(
          <div key="nuc-grad">
            {gradientSwatchWithEndpoints(pal, legend && legend.nucleotideLinks ? legend.nucleotideLinks.minSim : '', legend && legend.nucleotideLinks ? legend.nucleotideLinks.maxSim : '', legendLabel)}
          </div>
        );
      } else {
        const base = cfg.solidColor || [200,200,200,255];
        if (cfg.useAlpha && typeof cfg.minAlpha === 'number' && typeof cfg.maxAlpha === 'number' && cfg.minAlpha !== cfg.maxAlpha) {
          const c0 = colorToCss(base, cfg.minAlpha);
          const c1 = colorToCss(base, cfg.maxAlpha);
          nucParts.push(
            <div key="nuc-alpha" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ width: '120px', height: '14px', background: `linear-gradient(90deg, ${c0}, ${c1})`, border: '1px solid #ccc' }} />
              <div style={{ fontSize: '11px' }}>NT align</div>
            </div>
          );
        } else {
          nucParts.push(
            <div key="nuc-solid" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
              {svgSwatch(base, 'rect', 24, 12)}
              <div style={{ fontSize: '11px' }}>NT align</div>
            </div>
          );
        }
      }
    }
  }

  if (protParts.length > 0 || nucParts.length > 0) {
    parts.push(
      <div key="links" style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: '600' }}>Links</div>
        <div style={{ marginTop: '6px' }}>
          {protParts.length > 0 && (
            <div style={{ marginBottom: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: '600' }}>Protein links</div>
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>{protParts}</div>
            </div>
          )}
          {nucParts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: '600' }}>Nucleotide links</div>
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>{nucParts}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const containerStyle = {
    background: 'white',
    border: '1px solid #ccc',
    borderRadius: '5px',
    padding: '10px',
    width,
    height,
    overflow: 'auto',
    boxSizing: 'border-box',
    ...style
  };

  return (
    <div className={className} style={containerStyle}>
      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', textAlign: 'center' }}>{title}</div>
      {parts.length === 0 ? (
        <div style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>No legend entries available</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
          {parts}
        </div>
      )}
    </div>
  );
};

export default LegendWidget;
