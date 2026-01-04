import React, { useRef, useEffect } from 'react';
import { DEFAULT_CONFIG } from '../config/visualizationConfig';

export default function ScrollbarWidget({
  minY,
  maxY,
  scrollNorm,
  setScrollNorm,
  visibleFraction,
  setViewState,
  containerHeight,
  viewState,
  viewStateRef,
  config = DEFAULT_CONFIG,
  themeColors = {}
}) {
  // Helper to get the thumb's top position and height for the custom scrollbar
  function getThumbMetrics(norm, barHeight, visibleFraction) {
    const minThumbHeight = config.scrollbar.minThumbHeight;
    const thumbHeight = Math.max(barHeight * visibleFraction, minThumbHeight);
    const scrollableHeight = barHeight - thumbHeight;
    // Map norm (0-100) to thumbTop: 0% -> top=0, 100% -> top=scrollableHeight
    let thumbTop = (norm / 100) * scrollableHeight;
    thumbTop = Math.max(0, Math.min(scrollableHeight, thumbTop));
    return { thumbTop, thumbHeight };
  }

  const scrollBarRef = useRef(null);

  // If a live viewStateRef is provided, poll it via RAF and update the
  // normalized scroll position so the thumb follows live camera moves.
  useEffect(() => {
    if (!viewStateRef) return undefined;
    let rafId = null;
    // Initialize with undefined to force first update
    let lastNorm = undefined;
    const tick = () => {
      const vs = viewStateRef.current;
      if (vs && vs.target && isFinite(minY) && isFinite(maxY) && maxY > minY) {
        const y = vs.target[1];
        if (isFinite(y)) {
          const newNorm = Math.max(0, Math.min(100, ((maxY - y) / (maxY - minY)) * 100));
          // Force update on first tick, then only when change is meaningful
          if (lastNorm === undefined || Math.abs(newNorm - lastNorm) > 0.5) {
            lastNorm = newNorm;
            try { setScrollNorm(newNorm); } catch (e) { /* swallow */ }
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    // Start immediately
    rafId = requestAnimationFrame(tick);
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [viewStateRef, minY, maxY, setScrollNorm]); // Removed scrollNorm dependency to avoid re-init

  // Theme-aware colors
  const trackColor = themeColors.widgetBackground || '#f8f9fa';
  const trackBorder = themeColors.border || '#dee2e6';
  const thumbColor = themeColors.textSecondary || '#6c757d';
  const thumbShadow = themeColors.border || '#aaa';
  const containerBg = themeColors.background ? 
    `${themeColors.background}0D` : // Add 5% opacity (0D in hex)
    'rgba(255,255,255,0.05)';

  // Ref for the container to attach wheel listener
  const containerRef = useRef(null);
  
  // Ref to track current scrollNorm without triggering useEffect re-runs
  const scrollNormRef = useRef(scrollNorm);
  useEffect(() => {
    scrollNormRef.current = scrollNorm;
  }, [scrollNorm]);

  // Handle mouse wheel on scrollbar - move the scrollbar instead of DeckGL
  // Use useEffect to add non-passive listener (required for preventDefault)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const scrollSpeed = 2; // Adjust scroll sensitivity
      const delta = e.deltaY > 0 ? scrollSpeed : -scrollSpeed;
      
      let newNorm = scrollNormRef.current + delta;
      newNorm = Math.max(0, Math.min(100, newNorm));
      
      setScrollNorm(newNorm);
      if (isFinite(minY) && isFinite(maxY) && maxY > minY) {
        const newY = maxY - (newNorm / 100) * (maxY - minY);
        if (isFinite(newY)) {
          setViewState(vs => {
            if (!vs) return vs;
            const z = (vs.target && isFinite(vs.target[2])) ? vs.target[2] : 0;
            return { ...vs, target: [vs.target[0], newY, z] };
          });
        }
      }
    };
    
    // Add with passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [minY, maxY, setScrollNorm, setViewState]); // Removed scrollNorm - using ref instead

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100vh',
        width: `${config.scrollbar.width}px`,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        background: containerBg
      }}
    >
      <div
        id="custom-scrollbar"
        ref={scrollBarRef}
        style={{
          position: 'relative',
          width: `${config.scrollbar.barWidth}px`,
          height: '96%',
          background: trackColor,
          borderRadius: 100, // force square
          WebkitBorderRadius: 0,
          MozBorderRadius: 0,
          margin: config.scrollbar.margin,
          cursor: 'pointer',
          boxShadow: `0 0 2px ${trackBorder}`,
          userSelect: 'none',
        }}
        onMouseDown={e => {
          // Allow clicking on the bar to move the thumb
          const bar = scrollBarRef.current;
          const barRect = bar.getBoundingClientRect();
          const barHeight = barRect.height;
          const { thumbHeight } = getThumbMetrics(scrollNorm, barHeight, visibleFraction);
          const clickY = e.clientY - barRect.top;
          // Map click position to norm: top of bar = 0%, bottom = 100%
          // Account for thumb height so clicking at very top/bottom reaches extremes
          const scrollableHeight = barHeight - thumbHeight;
          let newNorm = scrollableHeight > 0 ? ((clickY - thumbHeight / 2) / scrollableHeight) * 100 : 0;
          newNorm = Math.max(0, Math.min(100, newNorm));
          if (!isFinite(newNorm)) {
            console.warn('Aborting: newNorm is not finite', { newNorm, clickY, barHeight, thumbHeight });
            return;
          }
          setScrollNorm(newNorm);
          if (isFinite(minY) && isFinite(maxY) && maxY > minY) {
            const newY = maxY - (newNorm / 100) * (maxY - minY);
            if (!isFinite(newY)) {
              console.warn('Aborting: newY is not finite', { newY, minY, maxY, newNorm });
              return;
            }
            // Use viewStateRef for current zoom/X, only change Y
            const live = viewStateRef?.current;
            const currentZoom = live?.zoom ?? -3;
            const currentX = live?.target?.[0] ?? 0;
            const currentZ = live?.target?.[2] ?? 0;
            setViewState({ target: [currentX, newY, currentZ], zoom: currentZoom });
          }
        }}
      >
        <div
          id="custom-scrollbar-thumb"
          style={{
            position: 'absolute',
            left: 0,
            width: '100%',
            ...(() => {
              if (!scrollBarRef.current) return { top: 0, height: 40 };
              const barHeight = scrollBarRef.current.offsetHeight;
              const { thumbTop, thumbHeight } = getThumbMetrics(scrollNorm, barHeight, visibleFraction);
              return { top: thumbTop, height: thumbHeight };
            })(),
            background: thumbColor,
            borderRadius: 220, // force square
            WebkitBorderRadius: 0,
            MozBorderRadius: 0,
            boxShadow: `0 1px 4px ${thumbShadow}`,
            cursor: 'grab',
            transition: 'background 0.1s',
          }}
          onMouseDown={e => {
            e.preventDefault();
            e.stopPropagation(); // Prevent track click handler from firing
            const bar = scrollBarRef.current;
            const barRect = bar.getBoundingClientRect();
            const barHeight = barRect.height;
            const { thumbTop, thumbHeight } = getThumbMetrics(scrollNorm, barHeight, visibleFraction);
            const startY = e.clientY;
            const startNorm = scrollNorm;
            const startThumbTop = thumbTop;
            const scrollableHeight = barHeight - thumbHeight;
            function onMove(ev) {
              const delta = ev.clientY - startY;
              let newThumbTop = startThumbTop + delta;
              newThumbTop = Math.max(0, Math.min(scrollableHeight, newThumbTop));
              // Map thumb position to norm: top=0 -> 0%, bottom=scrollableHeight -> 100%
              let newNorm = scrollableHeight > 0 ? (newThumbTop / scrollableHeight) * 100 : 0;
              newNorm = Math.max(0, Math.min(100, newNorm));
              if (!isFinite(newNorm)) {
                console.warn('Aborting drag: newNorm is not finite', { newNorm, newThumbTop, barHeight, thumbHeight });
                return;
              }
              setScrollNorm(newNorm);
              if (isFinite(minY) && isFinite(maxY) && maxY > minY) {
                const newY = maxY - (newNorm / 100) * (maxY - minY);
                if (!isFinite(newY)) {
                  console.warn('Aborting drag: newY is not finite', { newY, minY, maxY, newNorm });
                  return;
                }
                // Use viewStateRef for current zoom/X, only change Y
                const live = viewStateRef?.current;
                const currentZoom = live?.zoom ?? -3;
                const currentX = live?.target?.[0] ?? 0;
                const currentZ = live?.target?.[2] ?? 0;
                setViewState({ target: [currentX, newY, currentZ], zoom: currentZoom });
              }
            }
            function onUp() {
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
            }
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
        />
      </div>
    </div>
  );
}
