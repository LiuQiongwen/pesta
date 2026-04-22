import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { useDevice } from '@/hooks/useDevice';
import { Settings, User, Languages, LogOut, ChevronDown, Sparkles, Zap, LayoutDashboard, FileArchive, Download, BookOpen, Compass, QrCode, Nfc } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage, useT } from '@/contexts/LanguageContext';

import { useNavigate } from 'react-router-dom';
import { useBilling } from '@/hooks/useBilling';
import { BillingPanel } from '@/components/billing/BillingPanel';
import { ObsidianImportModal } from '@/components/obsidian/ObsidianImportModal';
import { CosmosExportModal } from '@/components/obsidian/CosmosExportModal';
import { WikiCompileModal } from '@/components/wiki/WikiCompileModal';
import { QrScannerSheet } from '@/components/anchors/QrScannerSheet';
import { NfcScannerSheet } from '@/components/anchors/NfcScannerSheet';
import { NfcDesktopInfoSheet } from '@/components/anchors/NfcDesktopInfoSheet';
import { GuideCenterModal } from '@/components/tour/GuideCenterModal';
import { useRenderTracer } from '@/hooks/useRenderTracer';

const MONO = "'IBM Plex Mono','Roboto Mono',monospace";
const INTER = "'Inter',system-ui,sans-serif";
const GREY = '#888fa8';

export const SettingsCapsule = memo(function SettingsCapsule() {
  useRenderTracer('SettingsCapsule', {});
  const [open,         setOpen]         = useState(false);
  const [billingOpen,  setBillingOpen]  = useState(false);
  const [obsidianOpen, setObsidianOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [wikiOpen, setWikiOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [nfcScanOpen, setNfcScanOpen] = useState(false);
  const [nfcInfoOpen, setNfcInfoOpen] = useState(false);
  const nfcSupported = typeof window !== 'undefined' && 'NDEFReader' in window;
  const [isAdmin,      setIsAdmin]      = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { isPhone } = useDevice();
  const { user, signOut } = useAuth();
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const t = useT();
  const billing = useBilling(user?.id);

  // Check admin status once user is loaded
  // Primary check: email exact match (instant, no async)
  // Secondary check: DB is_admin flag
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    if (user.email === 'test@test.com') { setIsAdmin(true); return; }
    import('@/integrations/supabase/client').then(({ supabase }) => {
      supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
        .then(({ data }) => setIsAdmin(!!data?.is_admin));
    });
  }, [user?.id]);

  // Close dropdown on outside click / touch
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('touchstart', handle);
    };
  }, [open]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const username = user?.email?.split('@')[0] ?? '—';

  const planLabel = billing.plan === 'pro'  ? 'Pro'
                  : billing.plan === 'team' ? 'Team'
                  : 'Free';
  const planAccent = billing.plan === 'pro'  ? '#b496ff'
                   : billing.plan === 'team' ? '#ffa040'
                   : '#888fa8';

  return (
    <>
      <div
        ref={ref}
        style={{
          position: 'fixed',
          top:   'max(clamp(12px, 1.5vh, 22px), env(safe-area-inset-top, 0px))',
          right: 'max(clamp(12px, 1.5vw, 22px), env(safe-area-inset-right, 0px))',
          zIndex: 40,
        }}
      >
        {/* Gear trigger */}
        <button
          onClick={() => setOpen(o => !o)}
          title="Settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            minHeight: 44,
            minWidth: 44,
            padding: 'clamp(5px,0.5vh,8px) clamp(8px,0.8vw,12px)',
            background: open ? 'rgba(136,143,168,0.14)' : 'rgba(5,7,12,0.72)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${open ? 'rgba(136,143,168,0.35)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            if (!open) {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(136,143,168,0.09)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(136,143,168,0.22)';
            }
          }}
          onMouseLeave={e => {
            if (!open) {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(5,7,12,0.72)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
            }
          }}
        >
          <Settings size={12} color={open ? GREY : 'rgba(100,108,130,0.65)'} />
          <span style={{
            fontFamily: MONO, fontSize: 'clamp(8px, 0.75vw, 10px)', letterSpacing: '0.06em',
            color: open ? GREY : 'rgba(90,100,125,0.55)',
          }}>
            {username}
          </span>
          <ChevronDown
            size={9}
            color={open ? GREY : 'rgba(80,90,115,0.45)'}
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
          />
        </button>

        {/* Dropdown panel */}
        {open && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: isPhone ? 'min(290px, calc(100vw - 24px))' : 'clamp(230px, 22vw, 290px)',
            maxHeight: isPhone ? 'calc(100svh - 80px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))' : 'calc(100svh - 80px)',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            background: 'rgba(5,7,12,0.97)',
            backdropFilter: 'blur(24px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
            border: '1px solid rgba(136,143,168,0.22)',
            borderRadius: 10,
            boxShadow: '0 0 0 1px rgba(136,143,168,0.08), 0 16px 48px rgba(0,0,0,0.80)',
            animation: 'toolbox-in 0.15s cubic-bezier(0.16,1,0.3,1)',
          }}>

            {/* User block */}
            <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'rgba(136,143,168,0.12)',
                  border: '1px solid rgba(136,143,168,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <User size={13} color={GREY} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: INTER, fontSize: 12, fontWeight: 600, color: 'rgba(220,228,245,0.90)' }}>
                    {username}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(80,90,115,0.60)', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email}
                  </div>
                </div>
                {/* Plan badge */}
                <div style={{
                  padding: '2px 7px', borderRadius: 4, flexShrink: 0,
                  fontFamily: MONO, fontSize: 7.5, letterSpacing: '0.06em', fontWeight: 600,
                  color: planAccent,
                  background: `${planAccent}20`,
                  border: `1px solid ${planAccent}35`,
                }}>
                  {planLabel}
                </div>
              </div>

              {/* Credits row */}
              <div style={{
                marginTop: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '5px 8px',
                background: 'rgba(180,150,255,0.06)',
                border: '1px solid rgba(180,150,255,0.14)',
                borderRadius: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Zap size={9} color="#b496ff" />
                  <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(160,145,210,0.75)', letterSpacing: '0.04em' }}>
                    AI Credits
                  </span>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 10, color: '#c4aaff', fontWeight: 600 }}>
                  {billing.loading ? '…' : billing.credits.toLocaleString()}
                </span>
              </div>
            </div>

            <div style={{ padding: '4px 6px' }}>
              {/* Subscription & Credits */}
              <button
                onClick={() => { setOpen(false); setBillingOpen(true); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 6,
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', transition: 'background 0.12s', textAlign: 'left',
                  marginBottom: 1,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(180,150,255,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <Sparkles size={12} color="rgba(180,150,255,0.75)" />
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: INTER, fontSize: 11, color: 'rgba(195,180,240,0.85)', fontWeight: 600 }}>
                    {t('capsule.billing')}
                  </span>
                  {billing.plan === 'free' && (
                    <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(140,150,180,0.50)', letterSpacing: '0.04em', marginTop: 1 }}>
                      {t('capsule.billing.sub')}
                    </div>
                  )}
                </div>
                <div style={{
                  fontFamily: MONO, fontSize: 8,
                  color: planAccent, background: `${planAccent}18`,
                  border: `1px solid ${planAccent}30`,
                  borderRadius: 4, padding: '2px 6px',
                }}>
                  {planLabel}
                </div>
              </button>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '3px 0' }} />

              {/* Obsidian Import */}
              <button
                onClick={() => { setOpen(false); setObsidianOpen(true); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 6,
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', transition: 'background 0.12s', textAlign: 'left',
                  marginBottom: 1,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(168,85,247,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <FileArchive size={12} color="rgba(168,85,247,0.75)" />
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: INTER, fontSize: 11, color: 'rgba(195,170,255,0.85)', fontWeight: 600 }}>
                    {t('capsule.import')}
                  </span>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(140,150,180,0.50)', letterSpacing: '0.04em', marginTop: 1 }}>
                    {t('capsule.import.sub')}
                  </div>
                </div>
              </button>

              {/* Cosmos Export */}
              <button
                onClick={() => { setOpen(false); setExportOpen(true); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 6,
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', transition: 'background 0.12s', textAlign: 'left',
                  marginBottom: 1,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(168,85,247,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <Download size={12} color="rgba(168,85,247,0.75)" />
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: INTER, fontSize: 11, color: 'rgba(195,170,255,0.85)', fontWeight: 600 }}>
                    {t('capsule.export')}
                  </span>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(140,150,180,0.50)', letterSpacing: '0.04em', marginTop: 1 }}>
                    {t('capsule.export.sub')}
                  </div>
                </div>
              </button>

              {/* Wiki Compile */}
              <button
                onClick={() => { setOpen(false); setWikiOpen(true); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 6,
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', transition: 'background 0.12s', textAlign: 'left',
                  marginBottom: 1,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <BookOpen size={12} color="rgba(16,185,129,0.75)" />
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: INTER, fontSize: 11, color: 'rgba(16,185,129,0.85)', fontWeight: 600 }}>
                    {t('capsule.wiki')}
                  </span>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(140,150,180,0.50)', letterSpacing: '0.04em', marginTop: 1 }}>
                    {t('capsule.wiki.sub')}
                  </div>
                </div>
              </button>

              {/* Guide Center */}
              <button
                onClick={() => { setOpen(false); setGuideOpen(true); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 6,
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', transition: 'background 0.12s', textAlign: 'left',
                  marginBottom: 1,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(102,240,255,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <Compass size={12} color="rgba(102,240,255,0.75)" />
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: INTER, fontSize: 11, color: 'rgba(102,240,255,0.85)', fontWeight: 600 }}>
                    {t('capsule.guide')}
                  </span>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(140,150,180,0.50)', letterSpacing: '0.04em', marginTop: 1 }}>
                    {t('capsule.guide.sub')}
                  </div>
                </div>
              </button>

              {/* QR anchor scan */}
              <button
                onClick={() => { setScannerOpen(true); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 12px',
                  fontFamily: INTER, background: 'transparent', border: 'none',
                  cursor: 'pointer', borderRadius: 4, transition: 'background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(102,240,255,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <QrCode size={12} color="rgba(102,240,255,0.75)" />
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: INTER, fontSize: 11, color: 'rgba(102,240,255,0.85)', fontWeight: 600 }}>
                    {t('capsule.qr')}
                  </span>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(140,150,180,0.50)', letterSpacing: '0.04em', marginTop: 1 }}>
                    {t('capsule.qr.sub')}
                  </div>
                </div>
              </button>

              {/* NFC anchor */}
              <button
                onClick={() => {
                  if (nfcSupported) { setNfcScanOpen(true); } else { setNfcInfoOpen(true); }
                  setOpen(false);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 12px',
                  fontFamily: INTER, background: 'transparent', border: 'none',
                  cursor: 'pointer', borderRadius: 4, transition: 'background 0.15s',
                  opacity: nfcSupported ? 1 : 0.65,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(180,150,255,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <Nfc size={12} color="rgba(180,150,255,0.75)" />
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: INTER, fontSize: 11, color: 'rgba(180,150,255,0.85)', fontWeight: 600 }}>
                    {t('capsule.nfc')}
                  </span>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(140,150,180,0.50)', letterSpacing: '0.04em', marginTop: 1 }}>
                    {nfcSupported ? t('capsule.nfc.sub.on') : t('capsule.nfc.sub.off')}
                  </div>
                </div>
              </button>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '3px 0' }} />
              {isAdmin && (
                <>
                  <div style={{
                    margin: '4px 4px 2px',
                    padding: '11px 12px 12px',
                    borderRadius: 8,
                    background: 'rgba(102,240,255,0.05)',
                    border: '1px solid rgba(102,240,255,0.18)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LayoutDashboard size={12} color="#66f0ff" />
                        <span style={{ fontFamily: INTER, fontSize: 11, fontWeight: 700, color: 'rgba(102,240,255,0.95)' }}>
                          {t('capsule.admin.title')}
                        </span>
                      </div>
                      <span style={{
                        fontFamily: MONO, fontSize: 7, letterSpacing: '0.07em', fontWeight: 700,
                        color: '#66f0ff', background: 'rgba(102,240,255,0.15)',
                        border: '1px solid rgba(102,240,255,0.30)',
                        borderRadius: 3, padding: '2px 6px',
                      }}>
                        {t('capsule.admin.badge')}
                      </span>
                    </div>
                    <div style={{ fontFamily: INTER, fontSize: 10, color: 'rgba(140,200,215,0.65)', lineHeight: 1.45, marginBottom: 9 }}>
                      {t('capsule.admin.desc')}
                    </div>
                    <button
                      onClick={() => { setOpen(false); navigate('/admin'); }}
                      style={{
                        width: '100%', padding: '7px 10px',
                        fontFamily: INTER, fontSize: 11, fontWeight: 700,
                        color: '#040b10',
                        background: 'linear-gradient(135deg, rgba(102,240,255,0.90), rgba(180,150,255,0.75))',
                        border: 'none', borderRadius: 6,
                        cursor: 'pointer', transition: 'opacity 0.12s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                    >
                      {t('capsule.admin.cta')}
                    </button>
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '6px 0 3px' }} />
                </>
              )}

              {/* Language */}
              <div style={rowStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Languages size={12} color="rgba(140,150,175,0.55)" />
                  <span style={{ fontFamily: INTER, fontSize: 11, color: 'rgba(180,190,215,0.75)' }}>
                    {t('settings.language') || '界面语言'}
                  </span>
                </div>
                <button
                  onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                  style={{
                    fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em',
                    color: GREY,
                    background: 'rgba(136,143,168,0.10)',
                    border: '1px solid rgba(136,143,168,0.22)',
                    borderRadius: 5, padding: '3px 10px',
                    cursor: 'pointer', transition: 'all 0.12s',
                  }}
                >
                  {lang === 'zh' ? 'EN' : '中'}
                </button>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '3px 0' }} />

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 6,
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', transition: 'background 0.12s', textAlign: 'left',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,64,64,0.07)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <LogOut size={12} color="rgba(210,70,70,0.65)" />
                <span style={{ fontFamily: INTER, fontSize: 11, color: 'rgba(195,75,75,0.75)' }}>
                  {t('sidebar.signOut') || '退出登录'}
                </span>
              </button>
            </div>

            {/* Footer */}
            <div style={{ padding: '5px 14px 8px', fontFamily: MONO, fontSize: 8, color: 'rgba(55,65,88,0.50)', letterSpacing: '0.05em' }}>
              PESTA · v2.0
            </div>
          </div>
        )}
      </div>

      {/* Billing Panel (portal-style, renders at fixed position) */}
      {billingOpen && <BillingPanel onClose={() => setBillingOpen(false)} />}

      {/* Obsidian Import Modal */}
      <ObsidianImportModal open={obsidianOpen} onClose={() => setObsidianOpen(false)} />
      <CosmosExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
      <WikiCompileModal open={wikiOpen} onClose={() => setWikiOpen(false)} />
      {guideOpen && <GuideCenterModal onClose={() => setGuideOpen(false)} />}
      {scannerOpen && <QrScannerSheet open={scannerOpen} onClose={() => setScannerOpen(false)} />}
      {nfcScanOpen && <NfcScannerSheet open={nfcScanOpen} onClose={() => setNfcScanOpen(false)} />}
      <NfcDesktopInfoSheet open={nfcInfoOpen} onClose={() => setNfcInfoOpen(false)} />
    </>
  );
});

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '7px 10px',
};
