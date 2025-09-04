import React, { useEffect, useRef, useState } from 'react';

/**
 * ProteinViewer Component
 * Displays 3D protein structures using 3DMol.js viewer
 */
const ProteinViewer = ({
  pdbData,
  confidence,
  sequenceLength,
  className = "",
  sequence = null,
  onStructureReady = null,
  onError = null,
  themeBackground = null
}) => {
  const containerRef = useRef(null);
  const [viewer, setViewer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSurface, setShowSurface] = useState(false);
  const [localPdb, setLocalPdb] = useState(null);
  const reportedRef = useRef(false);
  const resizeObsRef = useRef(null);

  // ---- AlphaFold-ish pLDDT gradient (0..100) -> HEX ----
  const lerp = (a, b, t) => Math.round(a + (b - a) * t);
  const toHex = (r, g, b) =>
    '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  const C0 = [255, 125, 69];   // 0   -> orange
  const C1 = [255, 219, 19];   // 50  -> yellow
  const C2 = [101, 203, 243];  // 70  -> cyan
  const C3 = [0, 83, 214];     // 90+ -> blue
  const interpHex = (c1, c2, t) => toHex(lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t));

  const plddtHex = (p100) => {
    const v = Math.max(0, Math.min(100, Number(p100) || 0));
    if (v <= 50) return interpHex(C0, C1, v / 50);
    if (v <= 70) return interpHex(C1, C2, (v - 50) / 20);
    if (v <= 90) return interpHex(C2, C3, (v - 70) / 20);
    return '#0053D6';
  };

  useEffect(() => {
    let destroyed = false;

    const initialize3DMol = async () => {
      const pdbToUse = localPdb || pdbData;
      if (!containerRef.current || !pdbToUse) return;

      try {
        setIsLoading(true);
        setError(null);

        // Wait until container has a real size
        const waitForSize = async (el, attempts = 30, delay = 100) => {
          for (let i = 0; i < attempts; i++) {
            const w = el.clientWidth || 0;
            const h = el.clientHeight || 0;
            if (w > 1 && h > 1) return true;
            await new Promise((r) => setTimeout(r, delay));
          }
          return true;
        };
        await waitForSize(containerRef.current);

        // Load 3Dmol if needed
        let $3Dmol = window.$3Dmol;
        if (!$3Dmol) {
          const module = await import('3dmol');
          $3Dmol = module.default || module;
          window.$3Dmol = $3Dmol;
        }

        // Clean previous viewer
        if (viewer) {
          try {
            viewer.clear();
            viewer.removeAllModels();
            viewer.removeAllShapes();
            viewer.removeAllSurfaces();
            viewer.removeAllLabels();
          } catch {}
          setViewer(null);
        }

        // Create viewer; no fixed width/height so it follows CSS
        const newViewer = $3Dmol.createViewer(containerRef.current, {
          backgroundColor: themeBackground ?? 'transparent',
          antialias: true,
          quality: 'high',
        });

        // Keep canvas pinned to parent via ResizeObserver
        try {
          if (typeof ResizeObserver !== 'undefined') {
            resizeObsRef.current = new ResizeObserver(() => {
              try { newViewer.resize(); newViewer.render(); } catch {}
            });
            resizeObsRef.current.observe(containerRef.current);
          }
        } catch {}

        // Add model
        const model = newViewer.addModel(pdbToUse, 'pdb');
        if (!model?.atoms?.length) throw new Error('No atoms loaded from PDB data');

        // --- Detect B-factor scale (0..1 vs 0..100) ---
        let avgB = null, minB = +Infinity, maxB = -Infinity;
        try {
        const bVals = model.atoms.map(a => (typeof a.b === 'number' ? a.b : NaN)).filter(v => !isNaN(v));
        if (bVals.length) {
            avgB = bVals.reduce((s, v) => s + v, 0) / bVals.length;
            for (const v of bVals) {
            if (v < minB) minB = v;
            if (v > maxB) maxB = v;
            }
        }
        } catch {}

        const scale = (isFinite(maxB) && maxB <= 1.5) ? 100 : 1; // ESMFold 0..1 vs AF 0..100

        if (avgB !== null) {
        avgB = avgB / scale;  // ✅ normalize to 0..1
        }


        // Notify parent once; report on 0..100 scale
        try {
          if (typeof onStructureReady === 'function' && !reportedRef.current) {
            reportedRef.current = true;
            const seqLen = sequenceLength || (sequence ? sequence.length : model.atoms.length);
            onStructureReady({
              pdb: pdbToUse,
              sequenceLength: seqLen,
              confidence: (avgB == null) ? null : avgB * scale, // 0..100
            });
          }
        } catch {}

        // --- Per-atom color using B-factor (scaled to 0..100) ---
        // Fallback if an atom lacks b: use global confidence (handles 0..1 or 0..100)
        const inferredGlobal = (typeof confidence === 'number')
          ? (confidence <= 1.5 ? confidence * 100 : confidence)
          : (avgB == null ? 0 : avgB * scale);

        const colorFunc = (atom) => {
          const b = (typeof atom?.b === 'number' && isFinite(atom.b)) ? atom.b * scale : inferredGlobal;
          return plddtHex(b); // return HEX (ColorSpec)
        };

        newViewer.setStyle({}, { cartoon: { colorfunc: colorFunc, opacity: 0.9 } });

        // Fit, size, render
        newViewer.zoomTo();
        newViewer.resize();
        newViewer.render();

        if (!destroyed) {
          setViewer(newViewer);
          setIsLoading(false);
        }
      } catch (err) {
        const msg = err?.message || String(err);
        setError('Failed to initialize 3D viewer');
        setIsLoading(false);
        try { onError?.(msg); } catch {}
      }
    };

    setIsLoading(true);
    setError(null);
    setShowSurface(false);

    initialize3DMol();

    return () => {
      destroyed = true;
      if (viewer) {
        try {
          viewer.clear();
          viewer.removeAllModels();
          viewer.removeAllShapes();
          viewer.removeAllSurfaces();
          viewer.removeAllLabels();
        } catch {}
        setViewer(null);
      }
      try { resizeObsRef.current?.disconnect(); } catch {}
      try { delete window.downloadLastPDB; } catch {}
    };
  }, [pdbData, confidence, localPdb, themeBackground]);

  // Fetch PDB from ESM Atlas when a sequence prop is provided
  useEffect(() => {
    const fetchPDB = async (seq) => {
      if (!seq) return;
      try {
        setIsLoading(true);
        setError(null);
        reportedRef.current = false;

        if (seq.length > 400) throw new Error('Sequence too long for ESM Atlas API (max 400 residues)');

        const url = 'https://api.esmatlas.com/foldSequence/v1/pdb/';
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: seq });
        if (!resp.ok) throw new Error(`ESM Atlas error ${resp.status}`);
        const pdbText = await resp.text();
        setLocalPdb(pdbText);
      } catch (err) {
        const msg = err?.message || String(err);
        setError(msg || 'ESM Atlas fetch failed');
        setIsLoading(false);
        try { onError?.(msg); } catch {}
      }
    };
    if (sequence) fetchPDB(sequence);
  }, [sequence, onError]);

  // Controls
  const toggleSurface = () => {
    if (!viewer) return;
    try {
      if (showSurface) {
        viewer.removeAllSurfaces();
        viewer.setStyle({}, { cartoon: { colorfunc: (a) => plddtHex((a?.b ?? 0) <= 1.5 ? (a?.b ?? 0) * 100 : (a?.b ?? 0)), opacity: 0.9 } });
        setShowSurface(false);
      } else {
        viewer.addSurface(window.$3Dmol.SurfaceType.MS, {
          opacity: 0.7,
          colorfunc: (atom) => {
            const b = (typeof atom?.b === 'number' && isFinite(atom.b)) ? ((atom.b <= 1.5) ? atom.b * 100 : atom.b) : 0;
            return plddtHex(b);
          }
        });
        viewer.setStyle({}, { cartoon: { colorfunc: (a) => plddtHex((a?.b ?? 0) <= 1.5 ? (a?.b ?? 0) * 100 : (a?.b ?? 0)), opacity: 0.35 } });
        setShowSurface(true);
      }
      viewer.render();
    } catch (err) { console.error('Error toggling surface:', err); }
  };

  const resetView = () => { if (viewer) { try { viewer.zoomTo(); viewer.render(); } catch {} } };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current.requestFullscreen();
  };

  const downloadPDB = () => {
    const text = localPdb || pdbData;
    if (!text) return;
    try {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `protein_structure_${sequenceLength || (sequence ? sequence.length : 'unknown')}residues.pdb`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) { console.warn('Download failed:', err); }
  };

  if (error) {
    return (
      <div className={`protein-viewer ${className}`}>
        <div className="flex items-center justify-center h-48 bg-destructive/10 rounded border border-destructive/20">
          <div className="text-center">
            <p className="text-xs text-destructive mb-1">3D Viewer Error</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`protein-viewer ${className}`}>
      {/* Padded, rounded wrapper to prevent corner bleed */}
      <div className="rounded-lg border p-2" style={{ overflow: 'hidden', background: themeBackground || 'transparent' }}>
        {/* Viewer host */}
        <div
          ref={containerRef}
          className="relative w-full h-37 rounded-md overflow-hidden"
          style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-xs text-muted-foreground">Loading 3D structure...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      {!isLoading && !error && viewer && (
<div className="flex items-center justify-between mt-1 gap-1">
  <div className="flex gap-1">
    <button
      onClick={toggleSurface}
      className="inline-flex items-center h-5 min-h-0 px-2 py-0 text-[8px] leading-none bg-secondary hover:bg-secondary/80 rounded"
    >
      {showSurface ? 'Hide Surface' : 'Show Surface'}
    </button>

    <button
      onClick={resetView}
      className="inline-flex items-center h-5 min-h-0 px-2 py-0 text-[8px] leading-none bg-secondary hover:bg-secondary/80 rounded"
    >
      Reset
    </button>

    <button
      onClick={toggleFullscreen}
      title="Toggle fullscreen"
      className="inline-flex items-center h-5 min-h-0 px-2 py-0 text-[8px] leading-none bg-secondary hover:bg-secondary/80 rounded"
    >
      ⛶
    </button>

    {(localPdb || pdbData) && (
      <button
        onClick={downloadPDB}
        className="inline-flex items-center h-5 min-h-0 px-2 py-0 text-[8px] leading-none bg-secondary hover:bg-secondary/80 rounded"
      >
        Download PDB
      </button>
    )}
  </div>
</div>

      )}
    </div>
  );
};

export default ProteinViewer;
