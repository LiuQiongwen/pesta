/**
 * DynamicIsland — 可自由拖动的灵动岛式浮动控制台
 *
 * 状态：
 *   compact   → 小胶囊，显示彩色功能点
 *   expanded  → 展开，显示图标 + 标签
 *   dragging  → 长按后跟随手指拖动
 *
 * 位置：
 *   拖动后吸附到最近的水平区域（左 / 中 / 右）+ 纵向自由
 *   用 localStorage 持久化
 */

import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { Inbox, Telescope, Sparkles, Library, Rocket, ScanLine, X } from 'lucide-react';
import { useToolbox, type PodId } from '@/contexts/ToolboxContext';
import { useT } from '@/contexts/LanguageContext';
import type { LucideIcon } from 'lucide-react';

// ── Config ──────────────────────────────────────────────────────────────────
const POD_DEFS: { id: PodId; icon: LucideIcon; labelKey: string; accent: string }[] = [
  { id: 'capture',   icon: Inbox,      labelKey: 'pod.capture',   accent: '#00ff66' },
  { id: 'retrieval', icon: Telescope,  labelKey: 'pod.retrieval', accent: '#66f0ff' },
  { id: 'insight',   icon: Sparkles,   labelKey: 'pod.insight',   accent: '#b496ff' },
  { id: 'memory',    icon: Library,    labelKey: 'pod.memory',    accent: '#ffa040' },
  { id: 'action',    icon: Rocket,     labelKey: 'pod.action',    accent: '#ff4466' },
];

const COMPACT_W  = 196;   // px — compact pill width
const EXPANDED_W = 320;   // px — expanded pill width
const COMPACT_H  = 48;    // px — compact pill height
const EXPANDED_H = 76;    // px — expanded pill height
const LONG_PRESS = 320;   // ms
const SNAP_MARGIN = 16;   // px from edge

const STORE_KEY = 'pesta:dynamic-island-pos';

function safeBottom() {
  // Approx safe-area-inset-bottom for notched iPhones
  if (typeof window === 'undefined') return 34;
  return Math.max(0, window.screen.height - window.innerHeight > 100 ? 34 : 0);
}

function defaultPos() {
  if (typeof window === 'undefined') return { x: 80, y: 600 };
  const sb = safeBottom();
  return {
    x: Math.round(window.innerWidth / 2 - COMPACT_W / 2),
    y: window.innerHeight - COMPACT_H - 20 - sb,
  };
}

function loadPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function savePos(pos: { x: number; y: number }) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(pos)); } catch { /* noop */ }
}

function clampPos(x: number, y: number, w: number): { x: number; y: number } {
  if (typeof window === 'undefined') return { x, y };
  const sb = safeBottom();
  const cx = Math.max(SNAP_MARGIN, Math.min(window.innerWidth  - w - SNAP_MARGIN, x));
  const cy = Math.max(60,          Math.min(window.innerHeight - COMPACT_H - sb - 4, y));
  return { x: cx, y: cy };
}

function snapX(centerX: number, w: number): number {
  if (typeof window === 'undefined') return centerX - w / 2;
  const sw = window.innerWidth;
  const third = sw / 3;
  if (centerX < third)              return SNAP_MARGIN;
  if (centerX > sw - third)         return sw - w - SNAP_MARGIN;
  return Math.round(sw / 2 - w / 2);
}

async function haptic(style: 'light' | 'medium' = 'light') {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light });
  } catch { /* web */ }
}

// ── Component ────────────────────────────────────────────────────────────────
export const DynamicIsland = memo(function DynamicIsland() {
  const { pods, togglePod } = useToolbox();
  const t = useT();

  // Resolve pod labels at render time so they update on lang change
  const PODS = POD_DEFS.map(p => ({ ...p, label: t(p.labelKey) }));

  const [expanded, setExpanded] = useState(false);
  const [pos,      setPos]      = useState<{ x: number; y: number }>(() => loadPos() ?? defaultPos());
  const [dragging, setDragging] = useState(false);
  const [snapping, setSnapping] = useState(false);

  // Derive whether any pod is open
  const anyOpen  = Object.values(pods).some(p => p?.open);
  const openPods = PODS.filter(p => pods[p.id]?.open);

  // ── Touch drag state ────────────────────────────────────────────────────
  const touchStart  = useRef<{ x: number; y: number; time: number } | null>(null);
  const posStart    = useRef({ x: 0, y: 0 });
  const longTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didDrag     = useRef(false);
  const islandRef   = useRef<HTMLDivElement>(null);

  // Persist position
  useEffect(() => { savePos(pos); }, [pos]);

  // Recalculate on resize / orientation change
  useEffect(() => {
    const onResize = () => {
      setPos(p => clampPos(p.x, p.y, expanded ? EXPANDED_W : COMPACT_W));
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [expanded]);

  // Close expanded when a pod sheet opens
  useEffect(() => {
    if (anyOpen) setExpanded(false);
  }, [anyOpen]);

  // ── Drag handlers ───────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    posStart.current = { ...pos };
    didDrag.current = false;

    longTimer.current = setTimeout(() => {
      haptic('medium');
      setDragging(true);
    }, LONG_PRESS);
  }, [pos]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 6 && longTimer.current) {
      clearTimeout(longTimer.current);
      longTimer.current = null;
    }

    if (!dragging) return;
    e.preventDefault();
    didDrag.current = true;

    const w = expanded ? EXPANDED_W : COMPACT_W;
    const raw = { x: posStart.current.x + dx, y: posStart.current.y + dy };
    setPos(clampPos(raw.x, raw.y, w));
  }, [dragging, expanded]);

  const onTouchEnd = useCallback(() => {
    if (longTimer.current) {
      clearTimeout(longTimer.current);
      longTimer.current = null;
    }

    if (dragging) {
      haptic('light');
      setDragging(false);
      setSnapping(true);

      const w = expanded ? EXPANDED_W : COMPACT_W;
      setPos(p => {
        const snappedX = snapX(p.x + w / 2, w);
        const clamped  = clampPos(snappedX, p.y, w);
        savePos(clamped);
        return clamped;
      });

      setTimeout(() => setSnapping(false), 500);
      return;
    }

    if (!didDrag.current) {
      // Tap — toggle expanded
      haptic('light');
      setExpanded(v => !v);
    }
  }, [dragging, expanded]);

  // ── Expand/collapse: recenter X when width changes ──────────────────────
  const prevExpanded = useRef(expanded);
  useEffect(() => {
    if (prevExpanded.current === expanded) return;
    prevExpanded.current = expanded;

    const w = expanded ? EXPANDED_W : COMPACT_W;
    setPos(p => {
      const cx = p.x + (expanded ? COMPACT_W : EXPANDED_W) / 2;
      const newX = snapX(cx, w);
      return clampPos(newX, p.y, w);
    });
  }, [expanded]);

  // ── Render ───────────────────────────────────────────────────────────────
  const w = expanded ? EXPANDED_W : COMPACT_W;
  const h = expanded ? EXPANDED_H : COMPACT_H;

  return (
    <div
      ref={islandRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed',
        left: pos.x,
        top:  pos.y,
        width:  w,
        height: h,
        zIndex: 42,
        touchAction: 'none',
        userSelect: 'none',
        transition: dragging
          ? 'none'
          : `left ${snapping ? '0.42s' : '0.28s'} cubic-bezier(0.22,1,0.36,1),
             top  0.28s  cubic-bezier(0.22,1,0.36,1),
             width  0.32s cubic-bezier(0.22,1,0.36,1),
             height 0.32s cubic-bezier(0.22,1,0.36,1)`,
        filter: dragging
          ? 'drop-shadow(0 8px 24px rgba(0,0,0,0.75))'
          : 'drop-shadow(0 4px 16px rgba(0,0,0,0.60))',
        transform: dragging ? 'scale(1.04)' : 'scale(1)',
        willChange: 'left, top, width, height, transform',
      }}
    >
      {/* Pill background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(4,5,10,0.95)',
        backdropFilter: 'blur(40px) saturate(2)',
        WebkitBackdropFilter: 'blur(40px) saturate(2)',
        borderRadius: 999,
        border: dragging
          ? '1.5px solid rgba(255,255,255,0.20)'
          : '1.5px solid rgba(255,255,255,0.10)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.06)',
        transition: 'border-color 0.18s, box-shadow 0.18s',
        overflow: 'hidden',
      }}>
        {/* Active pod color bar at top */}
        {openPods.length > 0 && !expanded && (
          <div style={{
            position: 'absolute', top: 0, left: '20%', right: '20%',
            height: 2, borderRadius: '0 0 2px 2px',
            background: openPods.length === 1
              ? `linear-gradient(90deg, transparent, ${openPods[0].accent}, transparent)`
              : `linear-gradient(90deg, ${openPods.map(p => p.accent).join(', ')})`,
            opacity: 0.9,
            boxShadow: `0 0 8px ${openPods[0]?.accent ?? '#fff'}88`,
          }} />
        )}
      </div>

      {/* ── Compact layout ── */}
      {!expanded && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 14px',
          animation: 'di-fade-in 0.18s ease',
        }}>
          {/* Pod dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {PODS.map(pod => {
              const isOpen = !!pods[pod.id]?.open;
              return (
                <div
                  key={pod.id}
                  onClick={(e) => { e.stopPropagation(); haptic(); togglePod(pod.id); }}
                  style={{
                    width:        isOpen ? 10 : 7,
                    height:       isOpen ? 10 : 7,
                    borderRadius: '50%',
                    background:   isOpen ? pod.accent : `${pod.accent}44`,
                    boxShadow:    isOpen ? `0 0 8px ${pod.accent}99` : 'none',
                    transition:   'all 0.22s cubic-bezier(0.22,1,0.36,1)',
                    cursor:       'pointer',
                    flexShrink:   0,
                  }}
                />
              );
            })}
          </div>

          {/* Divider */}
          <div style={{
            width: 1, height: 18,
            background: 'rgba(255,255,255,0.12)',
            flexShrink: 0,
          }} />

          {/* OCR button */}
          <div
            onClick={(e) => { e.stopPropagation(); haptic(); window.dispatchEvent(new CustomEvent('open-ocr-camera')); }}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(102,240,255,0.10)',
              border: '1px solid rgba(102,240,255,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <ScanLine size={14} color="#66f0ff" />
          </div>
        </div>
      )}

      {/* ── Expanded layout ── */}
      {expanded && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 10px',
          animation: 'di-expand-in 0.28s cubic-bezier(0.22,1,0.36,1)',
        }}>
          {/* Pod buttons row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {PODS.map(pod => {
              const isOpen = !!pods[pod.id]?.open;
              return (
                <button
                  key={pod.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic();
                    togglePod(pod.id);
                    if (!isOpen) setExpanded(false);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 4,
                    padding: '8px 0',
                    background: isOpen ? `${pod.accent}18` : 'transparent',
                    border:     isOpen ? `1px solid ${pod.accent}40` : '1px solid transparent',
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    position: 'relative',
                    minHeight: 52,
                  }}
                >
                  {/* Active glow top line */}
                  {isOpen && (
                    <div style={{
                      position: 'absolute', top: 0, left: '15%', right: '15%',
                      height: 2, borderRadius: '0 0 2px 2px',
                      background: `linear-gradient(90deg, transparent, ${pod.accent}, transparent)`,
                      boxShadow: `0 0 6px ${pod.accent}88`,
                    }} />
                  )}
                  <pod.icon
                    size={18}
                    color={isOpen ? pod.accent : 'rgba(160,175,210,0.55)'}
                    style={{
                      filter: isOpen ? `drop-shadow(0 0 5px ${pod.accent}99)` : 'none',
                      transition: 'color 0.15s, filter 0.15s',
                    }}
                  />
                  <span style={{
                    fontFamily: "'IBM Plex Mono','Roboto Mono',monospace",
                    fontSize: 9,
                    letterSpacing: '0.04em',
                    color: isOpen ? pod.accent : 'rgba(120,135,165,0.55)',
                    transition: 'color 0.15s',
                    lineHeight: 1,
                  }}>
                    {pod.label}
                  </span>
                </button>
              );
            })}

            {/* OCR */}
            <button
              onClick={(e) => { e.stopPropagation(); haptic(); window.dispatchEvent(new CustomEvent('open-ocr-camera')); setExpanded(false); }}
              style={{
                width: 38, flexShrink: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 4,
                padding: '8px 0',
                background: 'rgba(102,240,255,0.07)',
                border: '1px solid rgba(102,240,255,0.18)',
                borderRadius: 12,
                cursor: 'pointer',
                minHeight: 52,
              }}
            >
              <ScanLine size={16} color="#66f0ff" />
              <span style={{
                fontFamily: "'IBM Plex Mono','Roboto Mono',monospace",
                fontSize: 8,
                color: 'rgba(102,240,255,0.60)',
                letterSpacing: '0.04em',
                lineHeight: 1,
              }}>OCR</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Drag indicator (shown while dragging) ── */}
      {dragging && (
        <div style={{
          position: 'absolute',
          bottom: -22, left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: "'IBM Plex Mono','Roboto Mono',monospace",
          fontSize: 9,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.08em',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          animation: 'di-fade-in 0.12s ease',
        }}>
          {t('hint.key.drag')}
        </div>
      )}

      <style>{`
        @keyframes di-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes di-expand-in {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
});
