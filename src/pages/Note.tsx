import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotes';
import { useMemoryWake } from '@/hooks/useMemoryWake';
import { useT, useLanguage } from '@/contexts/LanguageContext';
import { useDevice } from '@/hooks/useDevice';
import { Note as NoteType } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { exportMarkdown, exportPDF, exportWord } from '@/lib/export';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import KnowledgeZoom from '@/components/note/KnowledgeZoom';
import PerspectiveSwitch from '@/components/note/PerspectiveSwitch';
import MemoryWakePanel from '@/components/layout/MemoryWakePanel';
import {
  ArrowLeft, Edit2, Save, Download, MapPin,
  FileText, Copy, Check, X, Sparkles,
  AlignLeft, Brain, BarChart3, Network, FlaskConical,
  ZoomIn, Repeat2, MoreHorizontal, ChevronLeft
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

type TabId = 'summary' | 'analysis' | 'report' | 'mindmap';

// ── Mind map helpers ──────────────────────────────────────────────────────
interface MindNode { id: string; label: string; children?: MindNode[] }
interface MindMapData { root?: string; nodes?: MindNode[] }

const NODE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

function buildFlow(data: MindMapData) {
  const rfNodes: {
    id: string; data: { label: string };
    position: { x: number; y: number };
    style: React.CSSProperties;
  }[] = [];
  const rfEdges: {
    id: string; source: string; target: string; style: React.CSSProperties;
  }[] = [];

  rfNodes.push({
    id: 'root',
    data: { label: data.root || 'Topic' },
    position: { x: 0, y: 0 },
    style: {
      background: '#6366f1', color: '#fff', border: 'none',
      borderRadius: 12, fontWeight: 700, fontSize: 14,
      padding: '10px 18px', minWidth: 120, textAlign: 'center' as const,
    },
  });

  (data.nodes || []).forEach((node, i) => {
    const col = NODE_COLORS[(i + 1) % NODE_COLORS.length];
    const x = (i - (data.nodes!.length - 1) / 2) * 240;
    rfNodes.push({
      id: node.id, data: { label: node.label }, position: { x, y: 120 },
      style: {
        background: col, color: '#fff', border: 'none',
        borderRadius: 8, fontSize: 13, padding: '8px 14px',
        minWidth: 100, textAlign: 'center' as const,
      },
    });
    rfEdges.push({ id: `root-${node.id}`, source: 'root', target: node.id, style: { stroke: col, strokeWidth: 2 } });

    (node.children || []).forEach((child, j) => {
      rfNodes.push({
        id: child.id, data: { label: child.label }, position: { x, y: 240 + j * 80 },
        style: {
          background: '#1e293b', color: '#e2e8f0', border: `1px solid ${col}40`,
          borderRadius: 6, fontSize: 12, padding: '6px 12px',
          minWidth: 90, textAlign: 'center' as const,
        },
      });
      rfEdges.push({ id: `${node.id}-${child.id}`, source: node.id, target: child.id, style: { stroke: col, strokeWidth: 1.5 } });
    });
  });
  return { rfNodes, rfEdges };
}

// ── Desktop MarkdownPanel ────────────────────────────────────────────────
function MarkdownPanel({
  fieldKey, content, noteId, onSaved, reportRef, updateNote,
}: {
  fieldKey: keyof NoteType;
  content: string;
  noteId: string;
  onSaved: (key: keyof NoteType, val: string) => void;
  reportRef?: React.RefObject<HTMLDivElement | null>;
  updateNote: (id: string, updates: Partial<NoteType>) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const t = useT();

  useEffect(() => { setDraft(content); }, [content]);

  const handleSave = async () => {
    setSaving(true);
    await updateNote(noteId, { [fieldKey]: draft, is_edited: true });
    onSaved(fieldKey, draft);
    setSaving(false);
    setEditing(false);
    toast.success(t('note.saved'));
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editing ? draft : content);
    setCopied(true);
    toast.success(t('common.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-2 border-b border-border bg-card/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1.5 text-xs">
              <Edit2 className="w-3 h-3" />{t('common.edit')}
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setDraft(content); setEditing(false); }} className="gap-1.5 text-xs">
                <X className="w-3 h-3" />{t('common.cancel')}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs bg-gradient-primary hover:opacity-90">
                <Save className="w-3 h-3" />{saving ? t('common.saving') : t('common.save')}
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {editing && <span className="text-xs text-muted-foreground tabular-nums">{draft.length} {t('note.charCount')}</span>}
          <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
            {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
            {copied ? t('common.copied') : t('common.copy')}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {editing ? (
          <div className="h-full p-4">
            <Textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="h-full font-mono text-sm resize-none bg-card min-h-[500px]"
            />
          </div>
        ) : (
          <div ref={reportRef} className="max-w-3xl mx-auto px-6 py-8">
            <div className="prose-ping">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content || `*${t('common.noContent')}*`}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mobile MarkdownPanel ────────────────────────────────────────────────
function MobileMarkdownPanel({
  fieldKey, content, noteId, onSaved, updateNote,
}: {
  fieldKey: keyof NoteType;
  content: string;
  noteId: string;
  onSaved: (key: keyof NoteType, val: string) => void;
  updateNote: (id: string, updates: Partial<NoteType>) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = useT();

  useEffect(() => { setDraft(content); }, [content]);

  // Focus textarea after entering edit mode
  useEffect(() => {
    if (editing) {
      // Small delay so the layout has settled before keyboard appears
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [editing]);

  const handleSave = async () => {
    setSaving(true);
    await updateNote(noteId, { [fieldKey]: draft, is_edited: true });
    onSaved(fieldKey, draft);
    setSaving(false);
    setEditing(false);
    toast.success(t('note.saved'));
  };

  const handleCancel = () => {
    setDraft(content);
    setEditing(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    toast.success(t('common.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  if (editing) {
    return (
      // Full-screen edit overlay — keyboard-aware via Capacitor resize body
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#040508',
      }}>
        {/* Edit header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px',
          height: 52,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}>
          <button
            onClick={handleCancel}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 44, padding: '0 4px',
              fontFamily: "'Inter',system-ui,sans-serif",
              fontSize: 16, color: 'rgba(120,160,255,0.85)',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            {t('common.cancel')}
          </button>

          <span style={{
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: 11, color: 'rgba(160,175,200,0.50)',
          }}>
            {draft.length} {t('note.chars')}
          </span>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              height: 36, padding: '0 16px',
              fontFamily: "'Inter',system-ui,sans-serif",
              fontSize: 15, fontWeight: 600,
              color: saving ? 'rgba(255,255,255,0.3)' : '#040508',
              background: saving ? 'rgba(0,255,102,0.2)' : '#00ff66',
              border: 'none', borderRadius: 10, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {saving ? t('note.saving') : t('common.save')}
          </button>
        </div>

        {/* Textarea — 16px font prevents iOS auto-zoom */}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          style={{
            flex: 1,
            width: '100%',
            padding: '16px',
            fontFamily: "'IBM Plex Mono','Roboto Mono',monospace",
            fontSize: 16,
            lineHeight: 1.65,
            color: 'rgba(210,225,250,0.90)',
            background: '#040508',
            border: 'none',
            outline: 'none',
            resize: 'none',
            WebkitUserSelect: 'auto',
            userSelect: 'auto',
            // Let body resize handle the keyboard gap
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck={false}
        />
      </div>
    );
  }

  // Read mode
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Action row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        gap: 8, padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            height: 36, padding: '0 12px',
            fontFamily: "'Inter',system-ui,sans-serif",
            fontSize: 13, color: copied ? '#00ff66' : 'rgba(160,175,210,0.70)',
            background: copied ? 'rgba(0,255,102,0.08)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${copied ? 'rgba(0,255,102,0.25)' : 'rgba(255,255,255,0.10)'}`,
            borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? t('note.copied') : t('common.copy')}
        </button>

        <button
          onClick={() => setEditing(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            height: 36, padding: '0 14px',
            fontFamily: "'Inter',system-ui,sans-serif",
            fontSize: 13, fontWeight: 500,
            color: 'rgba(220,230,255,0.85)',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, cursor: 'pointer',
          }}
        >
          <Edit2 size={14} /> {t('common.edit')}
        </button>
      </div>

      {/* Markdown content */}
      <div style={{
        flex: 1, overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px 16px 32px',
      }}>
        {content ? (
          <div className="prose-ping" style={{ fontSize: 15, lineHeight: 1.75 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : (
          <p style={{
            fontFamily: "'Inter',system-ui,sans-serif",
            fontSize: 14, color: 'rgba(140,155,185,0.50)',
            textAlign: 'center', marginTop: 48,
          }}>
            {t('common.noContent')}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function Note() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getNote, updateNote, notes: allNotes } = useNotes(user?.id);
  const navigate = useNavigate();
  const { items: wakeItems, loading: wakeLoading, checkForNote, dismiss: dismissWake } = useMemoryWake(user?.id);
  const t = useT();
  const { lang } = useLanguage();
  const { isPhone } = useDevice();

  const tabs: { id: TabId; label: string; icon: typeof FileText; desc: string }[] = [
    { id: 'summary',  label: t('note.tab.summary'),  icon: AlignLeft, desc: t('note.tab.summary.desc') },
    { id: 'analysis', label: t('note.tab.analysis'), icon: Brain,     desc: t('note.tab.analysis.desc') },
    { id: 'report',   label: t('note.tab.report'),   icon: BarChart3, desc: t('note.tab.report.desc') },
    { id: 'mindmap',  label: t('note.tab.mindmap'),  icon: Network,   desc: t('note.tab.mindmap.desc') },
  ];

  const [note, setNote]           = useState<NoteType | null>(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [mindmapView, setMindmapView] = useState<'visual' | 'text'>('visual');
  const [showZoom, setShowZoom]   = useState(false);
  const [showPersp, setShowPersp] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    getNote(id).then(n => {
      setNote(n);
      if (n?.mindmap_data) {
        const { rfNodes, rfEdges } = buildFlow(n.mindmap_data as MindMapData);
        setNodes(rfNodes);
        setEdges(rfEdges);
      }
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!note || !allNotes?.length) return;
    checkForNote(
      { id: note.id, title: note.title||'', summary: note.summary, tags: note.tags||[] },
      allNotes.map(n => ({ id:n.id, title:n.title||'', summary:n.summary||null, tags:n.tags||[], created_at:n.created_at||'' }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id, allNotes?.length]);

  const relatedNotes = useMemo(() => {
    if (!note || !allNotes?.length) return [];
    const tags = new Set(note.tags || []);
    return allNotes
      .filter(n => n.id !== note.id && (n.tags||[]).some((t: string) => tags.has(t)))
      .slice(0, 5)
      .map(n => ({ id:n.id, title:n.title||'', summary:n.summary||null, content_markdown:n.content_markdown||null, tags:n.tags||[] }));
  }, [note, allNotes]);

  const handleSaved = useCallback((key: keyof NoteType, val: string) => {
    setNote(prev => prev ? { ...prev, [key]: val, is_edited: true } : prev);
  }, []);

  const handleExport = (fmt: 'md' | 'pdf' | 'word') => {
    if (!note) return;
    const activeContent =
      activeTab === 'summary'  ? (note.summary_markdown  || '') :
      activeTab === 'analysis' ? (note.analysis_markdown || '') :
      activeTab === 'mindmap'  ? (note.mindmap_markdown  || '') :
      (note.content_markdown || '');
    if (fmt === 'md')   exportMarkdown(activeContent, note.title || '笔记');
    if (fmt === 'pdf')  exportPDF(reportRef.current, note.title || '笔记');
    if (fmt === 'word') exportWord(activeContent, note.title || '笔记');
  };

  // ── Loading / not-found states ──────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary mx-auto flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground text-sm">{t('note.loading')}</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">{t('note.notFound')}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>{t('note.backToLibrary')}</Button>
      </div>
    );
  }

  // ── Mobile layout ─────────────────────────────────────────────────────
  if (isPhone) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: '#040508',
        display: 'flex', flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        // bottom padding handled per-section
        overflow: 'hidden',
      }}>

        {/* iOS-style navigation bar */}
        <div style={{
          display: 'flex', alignItems: 'center',
          height: 52, flexShrink: 0,
          padding: '0 8px 0 4px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(4,5,8,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          gap: 4,
        }}>
          {/* Back button — large touch target, iOS chevron style */}
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex', alignItems: 'center',
              height: 44, padding: '0 8px 0 4px',
              fontFamily: "'Inter',system-ui,sans-serif",
              fontSize: 17, color: 'rgba(120,160,255,0.90)',
              background: 'none', border: 'none', cursor: 'pointer',
              gap: 2, flexShrink: 0,
            }}
          >
            <ChevronLeft size={22} strokeWidth={2.2} />
          </button>

          {/* Title block */}
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div style={{
              fontFamily: "'Inter',system-ui,sans-serif",
              fontSize: 16, fontWeight: 600,
              color: 'rgba(230,238,255,0.95)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {note.title || t('common.untitled')}
            </div>
            {note.is_edited && (
              <div style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 9, color: '#00d070', marginTop: 1,
              }}>
                {t('note.edited')}
              </div>
            )}
          </div>

          {/* Actions overflow menu */}
          <button
            onClick={() => setShowActions(true)}
            style={{
              width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(160,175,210,0.80)', flexShrink: 0,
            }}
          >
            <MoreHorizontal size={22} />
          </button>
        </div>

        {/* Horizontally scrollable tab bar */}
        <div style={{
          display: 'flex', alignItems: 'stretch',
          overflowX: 'auto', flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(4,5,8,0.80)',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>
          <style>{`.note-tabs::-webkit-scrollbar { display: none; }`}</style>
          {tabs.map(({ id: tid, label, icon: Icon }) => {
            const isActive = activeTab === tid;
            return (
              <button
                key={tid}
                onClick={() => setActiveTab(tid)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0 16px',
                  height: 46, flexShrink: 0,
                  fontFamily: "'Inter',system-ui,sans-serif",
                  fontSize: 14, fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#a78bfa' : 'rgba(130,145,175,0.65)',
                  background: 'none', border: 'none',
                  borderBottom: `2px solid ${isActive ? '#a78bfa' : 'transparent'}`,
                  cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'summary' && (
            <MobileMarkdownPanel
              fieldKey="summary_markdown"
              content={note.summary_markdown || ''}
              noteId={note.id}
              onSaved={handleSaved}
              updateNote={updateNote}
            />
          )}

          {activeTab === 'analysis' && (
            <MobileMarkdownPanel
              fieldKey="analysis_markdown"
              content={note.analysis_markdown || ''}
              noteId={note.id}
              onSaved={handleSaved}
              updateNote={updateNote}
            />
          )}

          {activeTab === 'report' && (
            <MobileMarkdownPanel
              fieldKey="content_markdown"
              content={note.content_markdown || ''}
              noteId={note.id}
              onSaved={handleSaved}
              updateNote={updateNote}
            />
          )}

          {activeTab === 'mindmap' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Sub-tabs */}
              <div style={{
                display: 'flex', gap: 8, padding: '10px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                flexShrink: 0,
              }}>
                {(['visual', 'text'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setMindmapView(v)}
                    style={{
                      padding: '6px 16px', height: 36,
                      fontFamily: "'Inter',system-ui,sans-serif",
                      fontSize: 13, fontWeight: 500,
                      color: mindmapView === v ? '#fff' : 'rgba(130,145,175,0.65)',
                      background: mindmapView === v ? '#6366f1' : 'rgba(255,255,255,0.05)',
                      border: 'none', borderRadius: 20, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {v === 'visual' ? t('note.mindmap.visual') : t('note.mindmap.text')}
                  </button>
                ))}
              </div>

              {mindmapView === 'visual' ? (
                <div style={{ flex: 1 }}>
                  {nodes.length > 0 ? (
                    <ReactFlow
                      nodes={nodes} edges={edges}
                      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                      fitView fitViewOptions={{ padding: 0.3 }}
                    >
                      <Background color="hsl(var(--border))" gap={20} />
                      <Controls />
                    </ReactFlow>
                  ) : (
                    <div style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      height: '100%', gap: 12,
                    }}>
                      <MapPin size={40} color="rgba(100,115,145,0.30)" />
                      <p style={{
                        fontFamily: "'Inter',system-ui,sans-serif",
                        fontSize: 14, color: 'rgba(130,145,175,0.50)',
                      }}>{t('note.mindmap.noData')}</p>
                    </div>
                  )}
                </div>
              ) : (
                <MobileMarkdownPanel
                  fieldKey="mindmap_markdown"
                  content={note.mindmap_markdown || ''}
                  noteId={note.id}
                  onSaved={handleSaved}
                  updateNote={updateNote}
                />
              )}
            </div>
          )}
        </div>

        {/* Safe area bottom spacer */}
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)', flexShrink: 0 }} />

        {/* Actions bottom sheet (replaces dropdown menu) */}
        <Sheet open={showActions} onOpenChange={setShowActions}>
          <SheetContent side="bottom" style={{
            background: 'rgba(4,5,8,0.98)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '20px 20px 0 0',
            paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))',
          }}>
            <SheetHeader style={{ paddingBottom: 8 }}>
              <SheetTitle style={{
                fontFamily: "'Inter',system-ui,sans-serif",
                fontSize: 14, color: 'rgba(160,175,210,0.60)',
                fontWeight: 400,
              }}>
                {note.title || t('common.untitled')}
              </SheetTitle>
            </SheetHeader>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
              {/* Distill */}
              <MobileActionRow
                icon={<FlaskConical size={18} color="#00d070" />}
                label={`${t('note.distill')} — ${t('note.distill.desc')}`}
                accent="#00d070"
                onClick={() => { setShowActions(false); navigate(`/distiller?noteId=${note.id}`); }}
              />
              {/* Knowledge Zoom */}
              <MobileActionRow
                icon={<ZoomIn size={18} color="#66e3ff" />}
                label={`${t('note.zoom')} — ${t('note.zoom.desc')}`}
                accent="#66e3ff"
                onClick={() => { setShowActions(false); setShowZoom(v => !v); setShowPersp(false); }}
              />
              {/* Perspective Switch */}
              <MobileActionRow
                icon={<Repeat2 size={18} color="#b49cff" />}
                label={`${t('note.lens')} — ${t('note.lens.desc')}`}
                accent="#b49cff"
                onClick={() => { setShowActions(false); setShowPersp(v => !v); setShowZoom(false); }}
              />

              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />

              {/* Export options */}
              <MobileActionRow
                icon={<Download size={18} color="rgba(160,175,210,0.70)" />}
                label={t('note.export.markdown')}
                accent="rgba(160,175,210,0.70)"
                onClick={() => { setShowActions(false); handleExport('md'); }}
              />
              <MobileActionRow
                icon={<Download size={18} color="rgba(160,175,210,0.70)" />}
                label={t('note.export.pdfLabel')}
                accent="rgba(160,175,210,0.70)"
                onClick={() => { setShowActions(false); handleExport('pdf'); }}
              />
              <MobileActionRow
                icon={<Download size={18} color="rgba(160,175,210,0.70)" />}
                label={t('note.export.wordLabel')}
                accent="rgba(160,175,210,0.70)"
                onClick={() => { setShowActions(false); handleExport('word'); }}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Side panels */}
        {showZoom && (
          <KnowledgeZoom
            note={{ id: note.id, title: note.title||'', summary: note.summary||null, content_markdown: note.content_markdown||null, tags: note.tags||[] }}
            relatedNotes={relatedNotes}
            onClose={() => setShowZoom(false)}
          />
        )}
        {showPersp && (
          <PerspectiveSwitch
            noteTitle={note.title || ''}
            noteContent={note.content_markdown || note.summary || ''}
            onClose={() => setShowPersp(false)}
          />
        )}
        <MemoryWakePanel items={wakeItems} loading={wakeLoading} onDismiss={dismissWake} />
      </div>
    );
  }

  // ── Desktop layout (unchanged) ─────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#040508', overflow: 'hidden' }}>
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/60 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-semibold text-foreground text-base truncate">{note.title || t('common.untitled')}</h1>
            <p className="text-xs text-muted-foreground">
              {note.created_at ? format(new Date(note.created_at), 'PPP', { locale: lang === 'zh' ? zhCN : enUS }) : ''}
              {note.is_edited && <span className="ml-2 text-primary">{t('note.edited')}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden md:flex items-center gap-1.5">
            {(note.tags || []).slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
          <Button
            variant="outline" size="sm"
            className="gap-1.5 border-[rgba(0,255,102,0.25)] text-[#00d070] hover:bg-[rgba(0,255,102,0.08)] hover:border-[rgba(0,255,102,0.45)]"
            onClick={() => navigate(`/distiller?noteId=${note.id}`)}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('note.distill')}</span>
          </Button>
          <Button
            variant="outline" size="sm"
            className="gap-1.5 border-[rgba(102,227,255,0.20)] text-[#66e3ff] hover:bg-[rgba(102,227,255,0.07)] hover:border-[rgba(102,227,255,0.40)]"
            onClick={() => { setShowZoom(v => !v); setShowPersp(false); }}
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('note.zoom')}</span>
          </Button>
          <Button
            variant="outline" size="sm"
            className="gap-1.5 border-[rgba(180,156,255,0.20)] text-[#b49cff] hover:bg-[rgba(180,156,255,0.07)] hover:border-[rgba(180,156,255,0.40)]"
            onClick={() => { setShowPersp(v => !v); setShowZoom(false); }}
          >
            <Repeat2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('note.lens')}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('common.export')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('md')}>{t('note.export.md')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>{t('note.export.pdf')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('word')}>{t('note.export.word')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-0.5 px-6 pt-3 pb-0 border-b border-border bg-card/20 flex-shrink-0">
        {tabs.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setActiveTab(tid)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 -mb-px',
              activeTab === tid
                ? 'text-primary border-primary bg-primary/5'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/40'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'summary' && (
          <MarkdownPanel fieldKey="summary_markdown" content={note.summary_markdown || ''} noteId={note.id} onSaved={handleSaved} updateNote={updateNote} />
        )}
        {activeTab === 'analysis' && (
          <MarkdownPanel fieldKey="analysis_markdown" content={note.analysis_markdown || ''} noteId={note.id} onSaved={handleSaved} updateNote={updateNote} />
        )}
        {activeTab === 'report' && (
          <MarkdownPanel fieldKey="content_markdown" content={note.content_markdown || ''} noteId={note.id} onSaved={handleSaved} reportRef={reportRef} updateNote={updateNote} />
        )}
        {activeTab === 'mindmap' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-6 py-2 border-b border-border bg-card/40 flex-shrink-0">
              {(['visual', 'text'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setMindmapView(v)}
                  className={cn(
                    'px-3 py-1 text-xs rounded-full font-medium transition-colors',
                    mindmapView === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {v === 'visual' ? t('note.mindmap.visual') : t('note.mindmap.text')}
                </button>
              ))}
            </div>
            {mindmapView === 'visual' ? (
              <div className="flex-1" style={{ minHeight: 400 }}>
                {nodes.length > 0 ? (
                  <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView fitViewOptions={{ padding: 0.3 }}>
                    <Background color="hsl(var(--border))" gap={20} />
                    <Controls />
                    <MiniMap nodeStrokeWidth={3} />
                  </ReactFlow>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                    <MapPin className="w-10 h-10 opacity-30" />
                    <p>{t('note.mindmap.noData')}</p>
                  </div>
                )}
              </div>
            ) : (
              <MarkdownPanel fieldKey="mindmap_markdown" content={note.mindmap_markdown || ''} noteId={note.id} onSaved={handleSaved} updateNote={updateNote} />
            )}
          </div>
        )}
      </div>

      {/* ── Side panels ── */}
      {showZoom && (
        <KnowledgeZoom
          note={{ id: note.id, title: note.title||'', summary: note.summary||null, content_markdown: note.content_markdown||null, tags: note.tags||[] }}
          relatedNotes={relatedNotes}
          onClose={() => setShowZoom(false)}
        />
      )}
      {showPersp && (
        <PerspectiveSwitch
          noteTitle={note.title || ''}
          noteContent={note.content_markdown || note.summary || ''}
          onClose={() => setShowPersp(false)}
        />
      )}
      <MemoryWakePanel items={wakeItems} loading={wakeLoading} onDismiss={dismissWake} />
    </div>
    </div>
  );
}

// ── Helper: mobile action row ──────────────────────────────────────────
function MobileActionRow({
  icon, label, accent, onClick,
}: { icon: React.ReactNode; label: string; accent: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        width: '100%', padding: '14px 16px',
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: 15, color: accent,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, cursor: 'pointer',
        transition: 'background 0.12s',
        textAlign: 'left',
        minHeight: 52,
      }}
    >
      {icon}
      {label}
    </button>
  );
}
