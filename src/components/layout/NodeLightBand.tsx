import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import type { HoveredNodeInfo } from '@/components/starmap/KnowledgeStarMap';
import { useLanguage, useT } from '@/contexts/LanguageContext';
import { useRenderTracer } from '@/hooks/useRenderTracer';
import { useDevice } from '@/hooks/useDevice';

const PALETTE_COLORS = ['#00ff66','#66e3ff','#b496ff','#ffa040','#ff64b4','#64a0ff'];
const MONO = "'IBM Plex Mono','Roboto Mono',monospace";
const INTER = "'Inter',system-ui,sans-serif";

interface NodeLightBandProps {
  node: HoveredNodeInfo | null;
  onTagClick?: (tag: string) => void;
  tagFilter?: string | null;
  connectMode?: boolean;
  connectFromTitle?: string;
}

export const NodeLightBand = memo(function NodeLightBand({ node, onTagClick, tagFilter, connectMode, connectFromTitle }: NodeLightBandProps) {
  useRenderTracer('NodeLightBand', { noteId: node?.noteId, tagFilter, connectMode });
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = useT();
  const { isPhone } = useDevice();

  const visible = !!node || !!connectMode;
  const color = node?.clusterIdx != null && node.clusterIdx >= 0
    ? PALETTE_COLORS[node.clusterIdx % PALETTE_COLORS.length]
    : connectMode ? '#ff44ff' : '#666e80';

  const dateStr = node?.createdAt
    ? formatDistanceToNow(new Date(node.createdAt), {
        locale: lang === 'zh' ? zhCN : enUS,
        addSuffix: true,
      })
    : '';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: isPhone ? 'calc(56px + env(safe-area-inset-bottom, 0px))' : 0,
        left: 0,
        right: 0,
        zIndex: 15,
        height: isPhone ? 72 : 88,
        background: 'linear-gradient(to top, rgba(4,5,8,0.96) 0%, rgba(4,5,8,0.75) 60%, rgba(4,5,8,0.0) 100%)',
        backdropFilter: visible ? 'blur(14px)' : 'none',
        WebkitBackdropFilter: visible ? 'blur(14px)' : 'none',
        borderTop: visible ? `1px solid ${color}28` : '1px solid transparent',
        transform: visible ? 'translateY(0) translateZ(0)' : 'translateY(100%) translateZ(0)',
        willChange: 'transform',
        transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1), border-color 0.22s, backdrop-filter 0.22s',
        display: 'flex',
        alignItems: 'center',
        padding: isPhone ? '0 16px' : '0 28px',
        gap: isPhone ? 10 : 18,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Connect mode banner */}
      {connectMode && !node && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em',
            color: '#ff44ff', animation: 'pulse-glow 1.4s ease-in-out infinite',
          }}>
            {t('starmap.connectMode')}
          </div>
          <div style={{ fontFamily: INTER, fontSize: 12, color: 'rgba(220,230,250,0.7)' }}>
            {connectFromTitle
              ? t('starmap.connectFrom').replace('{title}', connectFromTitle)
              : t('starmap.connectStart')}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(180,190,210,0.5)', marginLeft: 'auto' }}>
            {t('starmap.connectEsc')}
          </div>
        </div>
      )}

      {/* Color dot */}
      {node && <>
      <div style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 10px ${color}99`,
        flexShrink: 0,
      }} />

      {/* Title + summary */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: INTER,
          fontSize: 13,
          fontWeight: 600,
          color: '#f0f4ff',
          marginBottom: 3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {node?.title}
        </div>
        {node?.summary && (
          <div style={{
            fontFamily: INTER,
            fontSize: 11,
            color: 'rgba(160,168,185,0.80)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {node.summary.slice(0, 100)}{node.summary.length > 100 ? '…' : ''}
          </div>
        )}
      </div>

      {/* Tags — hidden on very small phones to avoid overflow */}
      {!isPhone && <div style={{ display: 'flex', gap: 5, flexShrink: 0, maxWidth: 200, overflow: 'hidden' }}>
        {(node?.tags || []).slice(0, 3).map(tag => {
          const isActive = tagFilter === tag;
          return (
          <span key={tag}
            onClick={() => onTagClick?.(tag)}
            className={isActive ? 'nlb-tag nlb-tag-active' : 'nlb-tag'}
            style={{
              fontFamily: MONO,
              fontSize: 9,
              color: isActive ? '#fff' : `${color}cc`,
              background: isActive ? `${color}40` : `${color}12`,
              border: `1px solid ${isActive ? `${color}88` : `${color}28`}`,
              padding: '2px 7px',
              borderRadius: 3,
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              cursor: onTagClick ? 'pointer' : 'default',
              transition: 'background 0.15s ease, border-color 0.15s ease',
              boxShadow: isActive ? `0 0 8px ${color}44` : 'none',
            }}
          >#{tag}{isActive ? ' ✕' : ''}</span>
          );
        })}
      </div>}

      {/* Date — hidden on phone */}
      {!isPhone && <div style={{
        fontFamily: MONO,
        fontSize: 10,
        color: 'rgba(100,108,125,0.65)',
        letterSpacing: '0.04em',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}>
        <Clock size={9} />
        {dateStr}
      </div>}

      {/* Open button */}
      {node && (
        <button
          onClick={() => navigate(`/note/${node.noteId}`)}
          className="nlb-open-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontFamily: MONO,
            fontSize: 10,
            color: color,
            background: `${color}10`,
            border: `1px solid ${color}30`,
            borderRadius: 5,
            padding: '6px 12px',
            cursor: 'pointer',
            letterSpacing: '0.04em',
            transition: 'background 0.18s ease, border-color 0.18s ease, transform 0.15s ease',
            flexShrink: 0,
          }}
        >
          {t('starmap.expand')}
          <ArrowRight size={10} />
        </button>
      )}
      </>}

      <style>{`
        .nlb-tag:not(.nlb-tag-active):hover { background: ${color}28 !important; border-color: ${color}55 !important; }
        .nlb-open-btn:hover { background: ${color}20 !important; border-color: ${color}60 !important; transform: translateY(-1px); }
        .nlb-open-btn:active { transform: translateY(0) scale(0.97); }
      `}</style>
    </div>
  );
}, (prev, next) =>
  prev.node?.noteId === next.node?.noteId &&
  prev.tagFilter === next.tagFilter &&
  prev.connectMode === next.connectMode &&
  prev.connectFromTitle === next.connectFromTitle &&
  prev.node?.title === next.node?.title &&
  prev.node?.summary === next.node?.summary
);