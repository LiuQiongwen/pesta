/**
 * InteractionHints — contextual bottom-left HUD showing interaction shortcuts.
 * Ultra-subtle, auto-fades after 8s idle, reappears on mouse move.
 * Shows touch-specific hints on mobile.
 */
import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useDevice } from '@/hooks/useDevice';
import { useRenderTracer } from '@/hooks/useRenderTracer';
import { useT } from '@/contexts/LanguageContext';

const MONO = "'IBM Plex Mono','Roboto Mono',monospace";

interface Props {
  noteCount: number;
  hoveredNode: boolean;
  connectMode: boolean;
  nodeWindowOpen?: boolean;
}

interface Hint {
  key: string;
  action: string;
}

export const InteractionHints = memo(function InteractionHints({ noteCount, hoveredNode, connectMode, nodeWindowOpen }: Props) {
  useRenderTracer('InteractionHints', { noteCount, hoveredNode, connectMode, nodeWindowOpen });
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const { isPhone } = useDevice();
  const t = useT();

  // Auto-hide after 8s, reshow on interaction
  useEffect(() => {
    const reset = () => {
      setVisible(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 8000);
    };
    reset();
    window.addEventListener('mousemove', reset, { passive: true });
    window.addEventListener('touchstart', reset, { passive: true });
    window.addEventListener('keydown', reset, { passive: true });
    return () => {
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('touchstart', reset);
      window.removeEventListener('keydown', reset);
      clearTimeout(timerRef.current);
    };
  }, []);

  const hints = useMemo((): Hint[] => {
    // ── Mobile hints ──
    if (isPhone) {
      if (connectMode) {
        return [
          { key: t('hint.key.tap'), action: t('hint.action.tapConnect') },
        ];
      }
      if (noteCount === 0) {
        return [
          { key: t('hint.key.dock'), action: t('hint.action.firstCapture') },
        ];
      }
      return [
        { key: t('hint.key.tap'),       action: t('hint.action.viewNode') },
        { key: t('hint.key.longpress'), action: t('hint.action.moreOps') },
      ];
    }

    // ── Desktop hints ──
    if (connectMode) {
      return [
        { key: t('hint.key.click'), action: t('hint.action.connectTarget') },
        { key: 'Esc',               action: t('hint.action.cancelConnect') },
      ];
    }
    if (nodeWindowOpen) {
      return [
        { key: t('hint.key.delegate'), action: t('hint.action.sendToPod') },
        { key: t('hint.key.detail'),   action: t('hint.action.openFull') },
        { key: 'Esc',                  action: t('hint.action.close') },
      ];
    }
    if (hoveredNode) {
      return [
        { key: t('hint.key.click'),      action: t('hint.action.openNode') },
        { key: t('hint.key.rightclick'), action: t('hint.action.moreOps') },
        { key: t('hint.key.drag'),       action: t('hint.action.move') },
        { key: 'F',                      action: t('hint.action.flash') },
      ];
    }
    if (noteCount === 0) {
      return [
        { key: 'N',                  action: t('hint.action.firstNote') },
        { key: t('hint.key.orb'),    action: t('hint.action.startCreate') },
      ];
    }
    return [
      { key: t('hint.key.click'),      action: t('hint.action.openNode') },
      { key: t('hint.key.drag'),       action: t('hint.action.rotateView') },
      { key: t('hint.key.rightclick'), action: t('hint.action.moreOps') },
      { key: 'N',                      action: t('hint.action.newNote') },
      { key: 'G',                      action: t('hint.action.center') },
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteCount, hoveredNode, connectMode, nodeWindowOpen, isPhone, t]);

  return (
    <div style={{
      position: 'fixed',
      bottom: isPhone ? 'calc(12px + env(safe-area-inset-bottom, 0px))' : 'clamp(12px, 1.5vh, 20px)',
      left: isPhone ? 12 : 'clamp(14px, 1.5vw, 22px)',
      zIndex: 8,
      pointerEvents: 'none',
      display: 'flex',
      gap: isPhone ? 8 : 12,
      opacity: visible ? 0.6 : 0,
      transition: 'opacity 0.6s ease',
    }}>
      {hints.map(h => (
        <div key={h.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontFamily: MONO,
            fontSize: isPhone ? 9 : 8,
            letterSpacing: '0.06em',
            color: 'rgba(102,240,255,0.65)',
            background: 'rgba(102,240,255,0.08)',
            border: '1px solid rgba(102,240,255,0.15)',
            padding: isPhone ? '2px 6px' : '1px 5px',
            borderRadius: 3,
          }}>
            {h.key}
          </span>
          <span style={{
            fontFamily: MONO,
            fontSize: isPhone ? 9 : 8,
            letterSpacing: '0.04em',
            color: 'rgba(160,175,205,0.45)',
          }}>
            {h.action}
          </span>
        </div>
      ))}
    </div>
  );
});
