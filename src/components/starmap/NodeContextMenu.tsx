import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CosmosNote } from '@/components/starmap/cosmos-layout';
import { useT } from '@/contexts/LanguageContext';
import { useDevice } from '@/hooks/useDevice';

const MONO = "'IBM Plex Mono','Roboto Mono',monospace";
const INTER = "'Inter','system-ui',sans-serif";

const POD_IDS = ['capture', 'retrieval', 'insight', 'memory', 'action'] as const;
const POD_COLORS: Record<string, string> = {
  capture:   '#00ff66',
  retrieval: '#66f0ff',
  insight:   '#b496ff',
  memory:    '#ffa040',
  action:    '#ff4466',
};

/* ── Mobile menu item ─────────────────────────────────────────────────── */
function MobileMenuItem({ label, sub, color, onClick }: { label: string; sub?: string; color?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      width: '100%', textAlign: 'left',
      padding: '10px 20px',
      fontFamily: INTER, fontSize: 15, fontWeight: 500,
      color: color ?? 'rgba(220,230,250,0.90)',
      background: 'transparent',
      border: 'none', cursor: 'pointer',
      WebkitTapHighlightColor: 'transparent',
      transition: 'background 0.12s ease, opacity 0.1s ease',
    }}
    onTouchStart={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(102,240,255,0.06)'; }}
    onTouchEnd={e => { setTimeout(() => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }, 150); }}
    >
      <span>{label}</span>
      {sub && <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(160,175,200,0.50)', letterSpacing: '0.04em' }}>{sub}</span>}
    </button>
  );
}

interface Props {
  noteId: string;
  x: number;
  y: number;
  note: CosmosNote | undefined;
  onClose: () => void;
  onOpenNote: (noteId: string) => void;
  onDistill: (noteId: string) => void;
  onSendToPod: (noteId: string, podId: string) => void;
  onFlash: (noteId: string) => void;
  onConnect?: (noteId: string) => void;
  onDelete?: (noteId: string) => void;
  onResetPosition?: (noteId: string) => void;
  onCreateAnchor?: (noteId: string) => void;
  hasManualPosition?: boolean;
}

function Item({ label, onClick, sub }: { label: string; onClick: () => void; sub?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '5px 12px',
        fontFamily: MONO, fontSize: sub ? 10 : 11, letterSpacing: '0.04em',
        color: hover ? 'rgba(102,240,255,0.92)' : 'rgba(200,215,240,0.82)',
        background: hover ? 'rgba(102,240,255,0.06)' : 'transparent',
        border: 'none', cursor: 'pointer',
        transition: 'background 0.14s ease, color 0.14s ease',
        borderRadius: 4,
      }}
    >{label}</button>
  );
}

export function NodeContextMenu({ noteId, x, y, note, onClose, onOpenNote, onDistill, onSendToPod, onFlash, onConnect, onDelete, onResetPosition, onCreateAnchor, hasManualPosition }: Props) {
  const [podHover, setPodHover] = useState(false);
  const { isPhone } = useDevice();
  const t = useT();

  // Dismiss on any outside click/touch
  useEffect(() => {
    const h = (e: MouseEvent | TouchEvent) => {
      const el = document.getElementById('cosmos-ctx-menu');
      const target = 'touches' in e ? e.touches[0]?.target : e.target;
      if (el && target && !el.contains(target as Node)) onClose();
    };
    setTimeout(() => {
      document.addEventListener('mousedown', h);
      document.addEventListener('touchstart', h, { passive: true });
    }, 0);
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('touchstart', h);
    };
  }, [onClose]);

  // ── Phone: bottom-anchored action sheet ──────────────────────────────────
  if (isPhone) {
    const act = (fn: () => void) => () => { fn(); onClose(); };
    return createPortal(
      <>
        {/* Backdrop */}
        <div onClick={onClose} style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.55)',
          animation: 'cosmos-window-in 0.15s ease',
        }} />
        {/* Sheet */}
        <div id="cosmos-ctx-menu" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
          background: 'rgba(2,5,16,0.98)',
          backdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(102,240,255,0.12)',
          borderRadius: '16px 16px 0 0',
          padding: '16px 0 max(16px, env(safe-area-inset-bottom))',
          animation: 'mobile-sheet-up 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
        }}>
          {/* Drag handle */}
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 12px' }} />
          {/* Title */}
          <div style={{
            padding: '0 20px 12px',
            fontFamily: INTER, fontSize: 14, fontWeight: 600,
            color: 'rgba(220,230,250,0.88)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {note?.title ?? t('common.untitled')}
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <MobileMenuItem label={t('ctx.openNote')}  sub={t('library.openNote')}          onClick={act(() => onOpenNote(noteId))} />
            <MobileMenuItem label={t('ctx.distill')}   sub={t('ctx.generateInsights')}      onClick={act(() => onDistill(noteId))} />
            <MobileMenuItem label={t('ctx.locate')}    sub={t('ctx.flashCenter')}            onClick={act(() => onFlash(noteId))} />
            {onConnect && <MobileMenuItem label={t('ctx.connect')} sub={t('ctx.linkNode')} color="#ff44ff" onClick={act(() => onConnect(noteId))} />}
            {onDelete && (
              <>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 20px' }} />
                <MobileMenuItem label={t('ctx.delete')} sub={t('ctx.softDelete')} color="#ff4466" onClick={act(() => onDelete(noteId))} />
              </>
            )}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 20px' }} />
            <div style={{ padding: '6px 20px 4px', fontFamily: MONO, fontSize: 10, color: 'rgba(102,240,255,0.50)', letterSpacing: '0.10em' }}>
              {t('ctx.sendToPod').toUpperCase()}
            </div>
            {POD_IDS.map(id => (
              <MobileMenuItem
                key={id}
                label={t(`pod.${id}`)}
                color={POD_COLORS[id]}
                onClick={act(() => onSendToPod(noteId, id))}
              />
            ))}
          </div>
        </div>
      </>,
      document.body,
    );
  }

  // ── Desktop: positioned dropdown ──────────────────────────────────────────
  const ax = Math.min(x, window.innerWidth  - 200);
  const ay = Math.min(y, window.innerHeight - 220);

  return createPortal(
    <div
      id="cosmos-ctx-menu"
      style={{
        position: 'fixed', left: ax, top: ay, zIndex: 9999,
        width: 185,
        background: 'rgba(2,5,16,0.97)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(102,240,255,0.15)',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.85), 0 0 24px rgba(102,240,255,0.05)',
        overflow: 'visible',
        animation: 'cosmos-window-in 0.12s ease',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div style={{ padding: '7px 12px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{
          fontFamily: INTER, fontSize: 11, fontWeight: 600,
          color: 'rgba(220,230,250,0.88)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {note?.title ?? t('common.untitled')}
        </div>
      </div>

      {/* Menu items */}
      <div style={{ padding: '4px 0' }}>
        <Item label={`→ ${t('ctx.openNote')}`}  onClick={() => { onOpenNote(noteId); onClose(); }} />
        <Item label={`◇ ${t('ctx.distill')}`}   onClick={() => { onDistill(noteId); onClose(); }} />

        {/* Send-to-pod submenu */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => setPodHover(true)}
          onMouseLeave={() => setPodHover(false)}
        >
          <Item label={`▶ ${t('ctx.sendToPod')}`} onClick={() => setPodHover(v => !v)} />
          {podHover && (
            <div style={{
              position: 'absolute', left: '100%', top: 0,
              width: 120,
              background: 'rgba(2,5,16,0.97)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(0,0,0,0.75)',
              padding: '4px 0',
              zIndex: 10000,
            }}>
              {POD_IDS.map(id => (
                <button
                  key={id}
                  onClick={() => { onSendToPod(noteId, id); onClose(); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '5px 12px',
                    fontFamily: MONO, fontSize: 10,
                    color: POD_COLORS[id],
                    background: 'transparent',
                    border: 'none', cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.background = `${POD_COLORS[id]}18`; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
                >{t(`pod.${id}`)}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '3px 0' }} />
        <Item label={`✦ ${t('ctx.locate')}`}  onClick={() => { onFlash(noteId); onClose(); }} />
        {onConnect && <Item label={`⟷ ${t('ctx.connect')}`} onClick={() => { onConnect(noteId); onClose(); }} />}
        {hasManualPosition && onResetPosition && (
          <Item label={`⊕ ${t('ctx.resetPos')}`} onClick={() => { onResetPosition(noteId); onClose(); }} />
        )}
        {onCreateAnchor && (
          <Item label={`⊞ ${t('ctx.qrAnchor')}`} onClick={() => { onCreateAnchor(noteId); onClose(); }} />
        )}
        {onDelete && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '3px 0' }} />
            <Item label={`✕ ${t('ctx.delete')}`} onClick={() => { onDelete(noteId); onClose(); }} />
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
