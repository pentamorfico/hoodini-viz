import React, { useRef } from 'react';
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
  config = DEFAULT_CONFIG,
  themeColors = {}
}) {
  // Helper to get the thumb's top position and height for the custom scrollbar
  function getThumbMetrics(norm, barHeight, visibleFraction) {
    const minThumbHeight = config.scrollbar.minThumbHeight;
    const thumbHeight = Math.max(barHeight * visibleFraction, minThumbHeight);
    // Center of thumb in px
    const thumbCenter = (barHeight * norm) / 100;
    // Top of thumb, clamped
    let thumbTop = thumbCenter - thumbHeight / 2;
    thumbTop = Math.max(0, Math.min(barHeight - thumbHeight, thumbTop));
    return { thumbTop, thumbHeight };
  }

  const scrollBarRef = useRef(null);

  // Theme-aware colors
  const trackColor = themeColors.widgetBackground || '#f8f9fa';
  const trackBorder = themeColors.border || '#dee2e6';
  const thumbColor = themeColors.textSecondary || '#6c757d';
  const thumbShadow = themeColors.border || '#aaa';
  const containerBg = themeColors.background ? 
    `${themeColors.background}0D` : // Add 5% opacity (0D in hex)
    'rgba(255,255,255,0.05)';

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        height: '100%',
        width: config.scrollbar.width,
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
          width: config.scrollbar.barWidth,
          height: '96%',
          background: trackColor,
          borderRadius: 0, // force square
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
          let newNorm = (clickY - thumbHeight / 2) / (barHeight - thumbHeight) * 100;
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
            setViewState(vs => {
              if (!vs) return vs;
              const z = (vs.target && isFinite(vs.target[2])) ? vs.target[2] : 0;
              return { ...vs, target: [vs.target[0], newY, z] };
            });
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
            borderRadius: 20, // force square
            WebkitBorderRadius: 0,
            MozBorderRadius: 0,
            boxShadow: `0 1px 4px ${thumbShadow}`,
            cursor: 'grab',
            transition: 'background 0.1s',
          }}
          onMouseDown={e => {
            e.preventDefault();
            const bar = scrollBarRef.current;
            const barRect = bar.getBoundingClientRect();
            const barHeight = barRect.height;
            const { thumbTop, thumbHeight } = getThumbMetrics(scrollNorm, barHeight, visibleFraction);
            const startY = e.clientY;
            const startNorm = scrollNorm;
            const startThumbTop = thumbTop;
            function onMove(ev) {
              const delta = ev.clientY - startY;
              let newThumbTop = startThumbTop + delta;
              newThumbTop = Math.max(0, Math.min(barHeight - thumbHeight, newThumbTop));
              let newNorm = ((newThumbTop + thumbHeight / 2) / barHeight) * 100;
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
                setViewState(vs => {
                  if (!vs) return vs;
                  const z = (vs.target && isFinite(vs.target[2])) ? vs.target[2] : 0;
                  return { ...vs, target: [vs.target[0], newY, z] };
                });
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
