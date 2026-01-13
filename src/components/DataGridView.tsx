import React, { useMemo, useState, useCallback, useRef } from 'react';
import DataEditor, { GridCellKind, CompactSelection } from '@glideapps/glide-data-grid';
import '@glideapps/glide-data-grid/dist/index.css';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from '@/contexts/ThemeContext';
import { getDefaultTheme, GridColumnIcon } from '@glideapps/glide-data-grid';
import { Input } from '@/components/ui/input';

/**
 * Lightweight table viewer for parsed datasets using glide-data-grid.
 * Accepts a map of dataset keys to { label, rows, columns }.
 * Columns are auto-inferred from the first rows when not provided.
 */
function DataGridView({
  datasets,
  initialKey = 'genes',
  height = 320,
  visibilityConfig = {},
  onZoomGene,
  onZoomHood,
  onZoomTree,
  isRowZoomable,
}) {
  const { resolvedTheme } = useTheme();
  const datasetKeys = useMemo(() => Object.keys(datasets || {}), [datasets]);
  const initial = useMemo(() => {
    if (!datasetKeys.length) return null;
    if (initialKey && datasetKeys.includes(initialKey)) return initialKey;
    return datasetKeys[0];
  }, [datasetKeys, initialKey]);

  const [activeKey, setActiveKey] = useState(initial);
  const [search, setSearch] = useState('');
  const [columnSizes, setColumnSizes] = useState({});
  const selectionDatasetRef = useRef(activeKey);
  const selectionRowCountRef = useRef(0);

  // Keep dataset/row-count trackers in sync when the active dataset changes
  React.useEffect(() => {
    const nextRows = Array.isArray(datasets?.[activeKey]?.rows) ? datasets[activeKey].rows : [];
    selectionDatasetRef.current = activeKey;
    selectionRowCountRef.current = nextRows.length;
  }, [activeKey, datasets]);

  // Keep activeKey in sync when datasets arrive or change
  React.useEffect(() => {
    if (!datasetKeys.length) return;
    if (!activeKey || !datasetKeys.includes(activeKey)) {
      setActiveKey(initial || datasetKeys[0]);
    }
  }, [datasetKeys, activeKey, initial]);

  const active = useMemo(() => {
    if (!activeKey) return { rows: [], columns: [], label: '' };
    return datasets?.[activeKey] || { rows: [], columns: [], label: '' };
  }, [activeKey, datasets]);

  const parseAttributes = useCallback((val) => {
    if (!val) return {};
    if (typeof val === 'object' && !Array.isArray(val)) return val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      // Try JSON when it looks like JSON
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
      const obj = {};
      trimmed.split(';').forEach((part) => {
        const p = part.trim();
        if (!p) return;
        const [k, ...rest] = p.split('=');
        const key = k?.trim();
        const valStr = rest.join('=').trim();
        if (key) obj[key] = valStr;
      });
      return obj;
    }
    return {};
  }, []);

  const attributeKeys = useMemo(() => {
    const keys = new Set();
    const rowsArr = Array.isArray(active.rows) ? active.rows : [];
    for (let i = 0; i < rowsArr.length && i < 200; i++) {
      const attrs = parseAttributes(rowsArr[i]?.attributes);
      Object.keys(attrs || {}).forEach((k) => keys.add(k));
    }
    return Array.from(keys);
  }, [active.rows, parseAttributes]);

  const activeVisibility = visibilityConfig?.[activeKey];

  const columns = useMemo(() => {
    let baseCols;
    if (active.columns && active.columns.length) {
      baseCols = active.columns.filter((c) => c.id !== 'attributes' && c.title !== 'attributes');
    } else {
      const rowsArr = Array.isArray(active.rows) ? active.rows : [];
      const keySet = new Set();
      for (let i = 0; i < rowsArr.length && i < 20; i++) {
        const r = rowsArr[i];
        if (r && typeof r === 'object') {
          Object.keys(r).forEach((k) => {
            if (k !== 'attributes') keySet.add(k);
          });
        }
      }
      baseCols = Array.from(keySet).map((k) => ({
        id: k,
        title: k,
        grow: 1,
      }));
    }

    const attrCols = attributeKeys.map((k) => ({
      id: `attr:${k}`,
      title: k,
      grow: 1,
      group: 'Attributes',
    }));

    const zoomCol =
      activeKey === 'genes' || activeKey === 'hoods' || activeKey === 'treeMetadata'
        ? [
            {
              id: '__zoom',
              title: 'Zoom',
              width: 80,
              grow: 0,
            },
          ]
        : [];

    return [...baseCols, ...attrCols, ...zoomCol];
  }, [active.columns, active.rows, attributeKeys, activeVisibility, activeKey]);

  const [hoveredZoom, setHoveredZoom] = useState(null);

  const rows = useMemo(() => {
    const all = Array.isArray(active.rows) ? active.rows : [];
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter((r) => {
      if (!r || typeof r !== 'object') return false;
      const attrs = parseAttributes(r.attributes);
      // include derived attribute values in search
      const values = [
        ...Object.values(r || {}),
        ...Object.values(attrs || {}),
      ];
      return values.some((v) =>
        v !== null && v !== undefined && String(v).toLowerCase().includes(q)
      );
    });
  }, [active.rows, search, parseAttributes]);

  React.useEffect(() => {
    setHoveredZoom(null);
  }, [activeKey, rows.length]);

  const gridTheme = useMemo(() => {
    const base = getDefaultTheme();
    const isDark = resolvedTheme === 'dark';
    const textMain = isDark ? '#e2e8f0' : '#1e293b';
    const bgMain = isDark ? '#09090b' : '#ffffff';
    const border = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    return {
      ...base,
      fontFamily: 'var(--font-sans, "Inter", system-ui, -apple-system, "Segoe UI", sans-serif)',
      baseFontStyle: '12px',
      headerFontStyle: '600 12px',
      editorFontSize: '12px',
      cellVerticalPadding: 4,
      cellHorizontalPadding: 6,
      lineHeight: 1.1,
      bgCell: bgMain,
      bgCellMedium: bgMain,
      textDark: textMain,
      textMedium: textMain,
      textLight: textMain,
      textHeader: textMain,
      textHeaderSelected: textMain,
      bgHeader: isDark ? '#18181b' : '#f8fafc',
      bgHeaderHasFocus: isDark ? '#27272a' : '#e2e8f0',
      bgHeaderHovered: isDark ? '#27272a' : '#e2e8f0',
      borderColor: border,
      horizontalBorderColor: border,
      headerBottomBorderColor: border,
      accentColor: '#3b82f6',
      accentFg: '#ffffff',
      accentLight: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
      textHeaderIcon: isDark ? '#94a3b8' : '#64748b',
    };
  }, [resolvedTheme]);

  const matchThemeOverride = useMemo(() => {
    const base = {
      bgCell: resolvedTheme === 'dark' ? '#101010' : '#fafafa',
      textDark: resolvedTheme === 'dark' ? '#f5f5f5' : '#0b0b0b',
    };
    return base;
  }, [resolvedTheme]);

  const columnsForGrid = useMemo(() => {
    const defaultWidth = 160;
    return columns.map((c) => {
      const width = columnSizes[c.id] ?? c.width ?? defaultWidth;
      return { ...c, width };
    });
  }, [columns, columnSizes]);

  const getGroupDetails = useCallback((group) => {
    if (!group) return undefined;
    if (group === 'Attributes') {
      return { name: 'Attributes', icon: GridColumnIcon.HeaderText };
    }
    return { name: group, icon: GridColumnIcon.HeaderText };
  }, []);

  const triggerZoom = useCallback(
    (colIdx, rowIdx) => {
      const col = columnsForGrid[colIdx];
      if (!col || col.id !== '__zoom') return false;
      const rowObj = rows[rowIdx];
      if (!rowObj) return false;
      if (activeKey === 'genes' && typeof onZoomGene === 'function') {
        onZoomGene(rowObj);
        return true;
      }
      if (activeKey === 'hoods' && typeof onZoomHood === 'function') {
        onZoomHood(rowObj);
        return true;
      }
      if (activeKey === 'treeMetadata' && typeof onZoomTree === 'function') {
        onZoomTree(rowObj);
        return true;
      }
      return false;
    },
    [columnsForGrid, rows, activeKey, onZoomGene, onZoomHood, onZoomTree]
  );

  // Custom renderer for zoom button cells (uses canvas drawing API provided by glide)
  const zoomButtonRenderer = useMemo(
    () => ({
      kind: 'zoom-button',
      needsHover: true,
      isMatch: (cell) => cell.kind === GridCellKind.Custom && cell.data?.kind === 'zoom-button',
      draw: (args, cell) => {
        const { rect, ctx, theme, hoverX, hoverY } = args;
        const label = cell.data?.label || 'Zoom';
        const radius = 8;
        const insetX = 7;
        const insetY = 5;
        const x = rect.x + insetX;
        const y = rect.y + insetY;
        const w = rect.width - insetX * 2;
        const h = rect.height - insetY * 2;

        const isHoverCoord = hoverX != null && hoverY != null && hoverX >= x && hoverX <= x + w && hoverY >= y && hoverY <= y + h;
        const isHoverState = hoveredZoom && hoveredZoom.row === cell.data?.row && hoveredZoom.col === cell.data?.col;
        const isHover = isHoverCoord || isHoverState;
        // Hint cursor when hovering the pill
        if (ctx && ctx.canvas) ctx.canvas.style.cursor = isHover ? 'pointer' : 'default';

        // Grayscale pill with subtle border and hover elevation
        const baseColor = resolvedTheme === 'dark' ? '#0a0a0a' : '#ffffff';
        const hoverColor = resolvedTheme === 'dark' ? '#151515' : '#f3f3f3';
        const strokeColor = resolvedTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        const shadowColor = resolvedTheme === 'dark' ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0.10)';

        ctx.save();
        ctx.fillStyle = isHover ? hoverColor : baseColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.shadowColor = isHover ? shadowColor : 'rgba(0,0,0,0)';
        ctx.shadowBlur = isHover ? 10 : 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = isHover ? 4 : 0;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Label
        ctx.fillStyle = resolvedTheme === 'dark' ? '#fafafa' : '#050505';
        ctx.font = '600 11px var(--font-sans, "Inter", system-ui, -apple-system, "Segoe UI", sans-serif)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + w / 2, y + h / 2 + 0.4);
        return true;
      },
      onClick: (args) => {
        const { location } = args;
        const [colIdx, rowIdx] = location;
        triggerZoom(colIdx, rowIdx);
        return { preventDefault: true, stopPropagation: true };
      },
      provideEditor: () => undefined
    }),
    [triggerZoom, hoveredZoom, resolvedTheme]
  );

  // Controlled row selection to drive visibility (row markers)
  const [gridSelection, setGridSelection] = useState();
  const selectionSeedRef = React.useRef({ key: null, rows: 0 });
  // Prevents selection loops when syncing external visibility -> grid selection
  const syncingFromExternalRef = useRef(false);

  const buildSelectionFromVisibility = useCallback(() => {
    if (!activeVisibility || !rows.length) return undefined;
    const selRows = rows.reduce((acc, rowObj, idx) => {
      const rowId = activeVisibility.getRowId ? activeVisibility.getRowId(rowObj) : null;
      // Standard: !hidden => visible => selected
      // Inverted: hidden => selected (checkbox means "hidden")
      const isHidden = activeVisibility.hiddenSet?.has(rowId);
      const isSelected = activeVisibility.invert ? isHidden : (rowId ? !isHidden : true);
      
      if (isSelected) {
        return acc.add(idx);
      }
      return acc;
    }, CompactSelection.empty());

    return {
      columns: CompactSelection.empty(),
      rows: selRows,
      current: selRows.length
        ? {
            cell: [0, selRows.first() ?? 0],
            range: { x: 0, y: selRows.first() ?? 0, width: 1, height: 1 },
            rangeStack: [],
          }
        : undefined,
    };
  }, [activeVisibility, rows]);

  // Seed selection when dataset changes; avoid resetting on every visibility toggle to keep drag smooth
  React.useEffect(() => {
    if (!activeVisibility) {
      setGridSelection(undefined);
      selectionSeedRef.current = { key: null, rows: 0 };
      return;
    }
    const seed = selectionSeedRef.current;
    if (seed.key === activeKey && seed.rows === rows.length && gridSelection) return;
    
    // Mark as syncing from external to prevent loops
    syncingFromExternalRef.current = true;
    const sel = buildSelectionFromVisibility();
    setGridSelection(sel);
    selectionSeedRef.current = { key: activeKey, rows: rows.length };
    // Reset flag after a tick
    requestAnimationFrame(() => {
      syncingFromExternalRef.current = false;
    });
  }, [activeKey, rows.length, activeVisibility, buildSelectionFromVisibility]);

  const getCellContent = useCallback(
    ([col, row]) => {
      const column = columns[col];
      if (!column) {
        return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: true };
      }
      const rowObj = rows[row] || {};

      let value;
      if (column.id === '__zoom') {
        const canZoom = typeof isRowZoomable === 'function' ? isRowZoomable(rowObj, activeKey) : true;
        
        if (!canZoom) {
          return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: true, readonly: true };
        }

        return {
          kind: GridCellKind.Custom,
          data: {
            kind: 'zoom-button',
            row,
            col,
            label: 'Zoom'
          },
          allowOverlay: false,
          readonly: true,
        };
      } else if (column.id && column.id.startsWith('attr:')) {
        const key = column.id.slice(5);
        const attrs = parseAttributes(rowObj.attributes);
        value = attrs ? attrs[key] : '';
      } else {
        value = rowObj[column.id];
      }

      const toDisplay = (v) => {
        if (v === null || v === undefined) return '';
        // If attributes stored as object or JSON string, flatten to key=value;key2=...
        if (column.id === 'attributes') {
          let obj = null;
          if (typeof v === 'object') {
            obj = v;
          } else if (typeof v === 'string') {
            const trimmed = v.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              try { obj = JSON.parse(trimmed); } catch (e) { obj = null; }
            }
          }
          if (obj && typeof obj === 'object') {
            return Object.entries(obj)
              .filter(([, val]) => val !== undefined && val !== null)
              .map(([k, val]) => `${k}=${val}`)
              .join(';');
          }
        }
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
      };

      const text = toDisplay(value);

      // Highlight full-cell when it matches search query
      const query = search.trim().toLowerCase();
      const isMatch = query && String(text).toLowerCase().includes(query);

      return {
        kind: GridCellKind.Text,
        data: text,
        displayData: text,
        allowOverlay: true,
        readonly: true,
        themeOverride: isMatch ? matchThemeOverride : undefined,
      };
    },
    [columns, rows, parseAttributes, search, matchThemeOverride, activeVisibility, resolvedTheme]
  );

  if (!datasetKeys.length) {
    return (
      <div style={{ padding: '8px', fontSize: 14, color: 'var(--muted-foreground, #666)' }}>
        No datasets available.
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--background, #fff)',
        width: '100%',
        height,
        maxHeight: '50vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 12px',
          borderBottom: '1px solid var(--border, #e5e7eb)',
          background: 'var(--muted, #f8fafc)',
        }}
      >
        <Select value={activeKey || ''} onValueChange={(v) => setActiveKey(v)}>
          <SelectTrigger className="w-[220px] h-8 text-xs">
            <SelectValue placeholder="Select dataset" />
          </SelectTrigger>
          <SelectContent className="z-[200]">
            <SelectGroup>
              {datasetKeys.map((k) => (
                <SelectItem key={k} value={k}>
                  {datasets[k]?.label || k}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <div
          style={{
            fontSize: 12,
            color: 'var(--muted-foreground, #666)',
            fontFamily: 'var(--font-sans, "Inter", system-ui, -apple-system, "Segoe UI", sans-serif)',
          }}
        >
          {rows.length.toLocaleString()} rows
        </div>
        <div style={{ marginLeft: 'auto', minWidth: 220 }}>
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataEditor
          columns={columnsForGrid.map((c) => ({ ...c, title: c.title || c.id }))}
          rows={rows.length}
          getCellContent={getCellContent}
          customRenderers={[zoomButtonRenderer]}
        theme={gridTheme}
        smoothScrollX
        smoothScrollY
        rowHeight={24}
        headerHeight={28}
        overscrollX={200}
          maxColumnAutoWidth={500}
          maxColumnWidth={1000}
          minColumnWidth={80}
          scaleToRem={true}
          columnTrailingBlankSpace={0}
          getGroupDetails={getGroupDetails}
          onColumnResize={(col, newSize) => {
            // col can be id or index; prefer id when present.
            const colId = typeof col === 'string' ? col : columnsForGrid[col]?.id;
            if (!colId) return;
            setColumnSizes((prev) => ({ ...prev, [colId]: newSize }));
          }}
          fillHandle={false}
          keybindings={{ copy: true, paste: false }}
          trailingRowOptions={null}
          getCellsForSelection={true}
          rangeSelect="multi-rect"
          rowSelect="multi"
          rowSelectionMode="multi"
          rowMarkers={activeVisibility ? { kind: 'both', checkboxStyle: 'circle' } : 'number'}
          gridSelection={activeVisibility ? gridSelection : undefined}
          onCellActivated={({ location }) => {
            if (!Array.isArray(location)) return;
            const [colIdx, rowIdx] = location;
            triggerZoom(colIdx, rowIdx);
          }}
          onCellClicked={(cell) => {
            if (!Array.isArray(cell)) return;
            const [colIdx, rowIdx] = cell;
            triggerZoom(colIdx, rowIdx);
          }}
          onItemHovered={(args) => {
            if (!args || args.kind !== 'cell') {
              if (hoveredZoom !== null) setHoveredZoom(null);
              return;
            }
            const loc = args.location;
            if (!Array.isArray(loc)) {
              if (hoveredZoom !== null) setHoveredZoom(null);
              return;
            }
            const [colIdx, rowIdx] = loc;
            const col = columnsForGrid[colIdx];
            if (!col || col.id !== '__zoom') {
              if (hoveredZoom !== null) setHoveredZoom(null);
              return;
            }
            if (!hoveredZoom || hoveredZoom.col !== colIdx || hoveredZoom.row !== rowIdx) {
              setHoveredZoom({ col: colIdx, row: rowIdx });
            }
          }}
          onGridSelectionChange={(sel) => {
            console.log('[DataGridView] onGridSelectionChange', sel);
            // Ignore selection changes triggered by external sync (visibility -> grid)
            if (syncingFromExternalRef.current) {
               console.log('[DataGridView] skipping sync from external');
              return;
            }
            
            if (!activeVisibility || !sel) {
              console.log('[DataGridView] no activeVisibility or sel');
              setGridSelection(sel);
              return;
            }
            const datasetChanged = selectionDatasetRef.current !== activeKey;
            const hasIncomingRows = sel.rows !== undefined && sel.rows !== null;

            // If the dataset changed, reset selection bookkeeping and do not toggle visibility based on stale row indices
            if (datasetChanged) {
               console.log('[DataGridView] dataset changed');
              selectionDatasetRef.current = activeKey;
              selectionRowCountRef.current = rows.length;
              setGridSelection(sel);
              return;
            }

            // Preserve existing row selections when user only selects columns or cells.
            const previousRows = gridSelection?.rows ?? CompactSelection.empty();
            const incomingRows = hasIncomingRows ? sel.rows : CompactSelection.empty();
            // Detect whether this event intends to clear row selection (true deselect-all)
            const clearRowsIntent =
              hasIncomingRows &&
              incomingRows.length === 0 &&
              (!sel.columns || sel.columns.length === 0) &&
              !sel.current;
            // Only ignore spurious empty selections when switching dataset
            // Allow clear-all when user explicitly deselects (dataChanged is false but that's OK)
            if (clearRowsIntent && datasetChanged) {
              selectionDatasetRef.current = activeKey;
              selectionRowCountRef.current = rows.length;
              return;
            }
            // If no row intent (e.g., clicking headers/other cells), keep previous rows
            const mergedRows = hasIncomingRows
              ? (clearRowsIntent ? incomingRows : (incomingRows.length ? incomingRows : previousRows))
              : previousRows;
            const mergedSelection = {
              ...sel,
              rows: mergedRows,
              current: sel.current,
            };
            setGridSelection(mergedSelection);

            // Only toggle visibility when there is an explicit row selection change.
            if (!hasIncomingRows) return;
            const applyRows = clearRowsIntent ? incomingRows : mergedRows;
            if (!applyRows.length && !clearRowsIntent) return;
            const getRowId = activeVisibility.getRowId;
            const hiddenSet = activeVisibility.hiddenSet || new Set();
            const onToggle = activeVisibility.onToggle;
            const onBatchToggle = activeVisibility.onBatchToggle;
            
            // Collect all changes first
            const changes = [];
            rows.forEach((rowObj, idx) => {
              const rowId = getRowId ? getRowId(rowObj) : null;
              if (!rowId) return;
              const desiredSelected = applyRows.hasIndex(idx); // Is row selected in the grid?
              const isHidden = hiddenSet.has(rowId);
              
              // Standard: Selected = Visible. DesiredVisible = Selected. CurrentVisible = !Hidden.
              // Inverted: Selected = Hidden. DesiredVisible = !Selected. CurrentVisible = !Hidden.
              
              console.log("DEBUG: invert=", activeVisibility.invert, "rowId=", rowId, "desiredSelected=", desiredSelected); const desiredVisible = activeVisibility.invert ? !desiredSelected : desiredSelected;
              const currentVisible = !isHidden;
              
              if (desiredVisible !== currentVisible) {
                changes.push({ rowId, desiredVisible });
              }
            });
            
            // Apply changes in batch if possible, otherwise fall back to individual toggles
            if (changes.length > 0) {
              if (onBatchToggle) {
                // Batch mode: single state update for all changes
                onBatchToggle(changes);
              } else {
                // Fallback: individual toggles (slow for many items)
                changes.forEach(({ rowId, desiredVisible }) => {
                  onToggle(rowId, desiredVisible);
                });
              }
            }
            selectionDatasetRef.current = activeKey;
            selectionRowCountRef.current = rows.length;
          }}
          width="100%"
        />
      </div>
    </div>
  );
}

export default DataGridView;
