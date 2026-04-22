import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage, useT } from '@/contexts/LanguageContext';
import { useDevice } from '@/hooks/useDevice';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  User, Lock, Shield, LogOut, Languages, ChevronLeft,
  Moon, Sun, Zap, Check,
} from 'lucide-react';
import { useTheme } from 'next-themes';

const MONO  = "'IBM Plex Mono','Roboto Mono',monospace";
const INTER = "'Inter',system-ui,sans-serif";

// ── Reusable primitives ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', fontWeight: 700,
      color: 'rgba(100,115,150,0.55)',
      textTransform: 'uppercase',
      padding: '0 0 8px 2px',
    }}>
      {children}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(6,9,18,0.90)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />;
}

function Row({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: '14px 16px',
      ...style,
    }}>
      {children}
    </div>
  );
}

function RowIcon({ icon, label, sublabel }: { icon: React.ReactNode; label: string; sublabel?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: INTER, fontSize: 14, fontWeight: 500, color: 'rgba(220,228,245,0.90)' }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(100,115,150,0.55)', letterSpacing: '0.03em', marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}

// Custom toggle — matches the cosmic dark aesthetic
function CosmosToggle({ checked, onChange, accent = '#b496ff' }: { checked: boolean; onChange: (v: boolean) => void; accent?: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 26, borderRadius: 13, flexShrink: 0,
        background: checked ? `${accent}55` : 'rgba(255,255,255,0.08)',
        border: `1.5px solid ${checked ? accent : 'rgba(255,255,255,0.14)'}`,
        position: 'relative', cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        padding: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: checked ? accent : 'rgba(180,190,210,0.40)',
        position: 'absolute', top: 3,
        left: checked ? 'calc(100% - 22px)' : 3,
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: checked ? `0 0 8px ${accent}88` : 'none',
      }} />
    </button>
  );
}

// Outline action button
function ActionButton({
  children, onClick, disabled, accent = 'rgba(160,175,210,0.70)',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        height: 36, padding: '0 14px',
        fontFamily: INTER, fontSize: 13, fontWeight: 500,
        color: disabled ? 'rgba(100,115,150,0.40)' : accent,
        background: `${accent}0d`,
        border: `1px solid ${disabled ? 'rgba(255,255,255,0.07)' : `${accent}30`}`,
        borderRadius: 9, cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function Settings() {
  const { user, signOut, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useLanguage();
  const { isPhone } = useDevice();
  const t = useT();

  const [username, setUsername]               = useState('');
  const [loadingUsername, setLoadingUsername] = useState(false);
  const [resetting, setResetting]             = useState(false);
  const [saved, setSaved]                     = useState(false);

  const emailPrefix = user?.email?.split('@')[0] || '';
  const initials    = (user?.email?.charAt(0) || 'U').toUpperCase();

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()
      .then(({ data }) => setUsername(data?.username || user.email?.split('@')[0] || ''));
  }, [user]);

  const handleSaveUsername = async () => {
    if (!user) return;
    setLoadingUsername(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username, updated_at: new Date().toISOString() });
    if (error) toast.error(t('settings.updateError'));
    else {
      toast.success(t('settings.updateSuccess'));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setLoadingUsername(false);
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setResetting(true);
    const { error } = await resetPassword(user.email);
    if (error) toast.error(error.message);
    else toast.success(t('settings.passwordSent'));
    setResetting(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#040508', zIndex: 50,
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      paddingTop: isPhone ? 'env(safe-area-inset-top, 0px)' : 0,
      paddingBottom: isPhone ? 'env(safe-area-inset-bottom, 0px)' : 0,
    }}>
      {/* Subtle radial glow behind everything */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(100,80,200,0.07) 0%, transparent 70%)',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 540, margin: '0 auto',
        padding: isPhone ? '0 16px 40px' : '0 24px 60px',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          height: isPhone ? 52 : 72,
          gap: 8, marginBottom: 4,
        }}>
          {isPhone && (
            <button
              onClick={() => navigate(-1)}
              style={{
                width: 44, height: 44, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(120,160,255,0.85)',
                marginLeft: -10,
              }}
            >
              <ChevronLeft size={22} strokeWidth={2.2} />
            </button>
          )}
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: INTER, fontSize: isPhone ? 20 : 24,
              fontWeight: 700, color: 'rgba(225,232,250,0.95)',
            }}>
              {t('settings.title')}
            </div>
            {!isPhone && (
              <div style={{
                fontFamily: MONO, fontSize: 10, color: 'rgba(90,105,140,0.55)',
                letterSpacing: '0.05em', marginTop: 3,
              }}>
                {t('settings.subtitle')}
              </div>
            )}
          </div>
        </div>

        {/* ── Profile ── */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>{t('settings.section.profile')}</SectionLabel>
          <Card>
            {/* Avatar row */}
            <Row>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(100,80,200,0.60), rgba(80,150,255,0.40))',
                  border: '1.5px solid rgba(180,150,255,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: INTER, fontSize: 18, fontWeight: 700,
                  color: 'rgba(220,228,255,0.90)',
                  boxShadow: '0 0 18px rgba(120,80,200,0.25)',
                }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontFamily: INTER, fontSize: 15, fontWeight: 600, color: 'rgba(220,228,245,0.92)' }}>
                    {username || emailPrefix}
                  </div>
                  <div style={{
                    fontFamily: MONO, fontSize: 10, color: 'rgba(90,105,140,0.60)',
                    letterSpacing: '0.03em', marginTop: 2,
                  }}>
                    {user?.email}
                  </div>
                </div>
              </div>
            </Row>

            <Divider />

            {/* Username edit */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{
                fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em',
                color: 'rgba(100,115,150,0.60)', marginBottom: 8,
              }}>
                {t('settings.username')}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveUsername(); }}
                  placeholder={t('settings.usernamePlaceholder')}
                  style={{
                    flex: 1,
                    height: 40,
                    padding: '0 12px',
                    fontFamily: INTER, fontSize: 14,
                    color: 'rgba(210,225,250,0.90)',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 9, outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(180,150,255,0.40)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                />
                <ActionButton
                  onClick={handleSaveUsername}
                  disabled={loadingUsername}
                  accent={saved ? '#00ff66' : '#b496ff'}
                >
                  {saved ? <><Check size={13} /> {t('settings.saved')}</> : loadingUsername ? '…' : t('settings.save')}
                </ActionButton>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Appearance ── */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>{t('settings.section.appearance')}</SectionLabel>
          <Card>
            {/* Dark mode */}
            <Row>
              <RowIcon
                icon={theme === 'dark'
                  ? <Moon size={16} color="rgba(180,150,255,0.75)" />
                  : <Sun size={16} color="rgba(255,180,64,0.80)" />
                }
                label={t('settings.darkMode')}
                sublabel={t('settings.darkMode.desc')}
              />
              <CosmosToggle
                checked={theme === 'dark'}
                onChange={v => setTheme(v ? 'dark' : 'light')}
                accent="#b496ff"
              />
            </Row>

            <Divider />

            {/* Language */}
            <Row>
              <RowIcon
                icon={<Languages size={16} color="rgba(102,240,255,0.70)" />}
                label={t('settings.language')}
                sublabel={t('settings.language.desc')}
              />
              <div style={{
                display: 'flex', gap: 2,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 8, padding: 3,
              }}>
                {(['zh', 'en'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    style={{
                      padding: '4px 12px', height: 30,
                      fontFamily: MONO, fontSize: 11, fontWeight: 600,
                      letterSpacing: '0.05em',
                      color: lang === l ? '#040508' : 'rgba(140,155,185,0.65)',
                      background: lang === l ? 'rgba(180,150,255,0.90)' : 'transparent',
                      border: 'none', borderRadius: 6,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {l === 'zh' ? t('settings.language.zh') : t('settings.language.en')}
                  </button>
                ))}
              </div>
            </Row>
          </Card>
        </div>

        {/* ── Security ── */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>{t('settings.section.security')}</SectionLabel>
          <Card>
            <Row>
              <RowIcon
                icon={<Lock size={16} color="rgba(255,160,64,0.75)" />}
                label={t('settings.password')}
                sublabel={`${t('settings.password.desc')} ${user?.email ?? ''}`}
              />
              <ActionButton
                onClick={handleResetPassword}
                disabled={resetting}
                accent="#ffa040"
              >
                {resetting ? t('settings.sending') : t('settings.password.send')}
              </ActionButton>
            </Row>
          </Card>
        </div>

        {/* ── Privacy ── */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>{t('settings.section.privacy')}</SectionLabel>
          <Card>
            <div style={{ padding: '14px 16px', display: 'flex', gap: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,255,102,0.08)',
                border: '1px solid rgba(0,255,102,0.18)',
              }}>
                <Shield size={16} color="#00d070" />
              </div>
              <div>
                <div style={{
                  fontFamily: INTER, fontSize: 14, fontWeight: 500,
                  color: 'rgba(220,228,245,0.90)', marginBottom: 4,
                }}>
                  {t('settings.privacy.title')}
                </div>
                <div style={{
                  fontFamily: INTER, fontSize: 12, lineHeight: 1.6,
                  color: 'rgba(100,115,150,0.65)',
                }}>
                  {t('settings.privacy.desc')}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Account ── */}
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>{t('settings.section.account')}</SectionLabel>
          <Card>
            <Row>
              <div>
                <div style={{
                  fontFamily: MONO, fontSize: 9, letterSpacing: '0.07em',
                  color: 'rgba(90,105,140,0.50)', marginBottom: 4,
                }}>
                  {t('settings.email')}
                </div>
                <div style={{ fontFamily: INTER, fontSize: 14, color: 'rgba(200,215,245,0.80)' }}>
                  {user?.email}
                </div>
              </div>
              {/* Credits badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px',
                background: 'rgba(180,150,255,0.08)',
                border: '1px solid rgba(180,150,255,0.18)',
                borderRadius: 8,
              }}>
                <Zap size={11} color="#b496ff" />
                <span style={{ fontFamily: MONO, fontSize: 10, color: '#c4aaff', fontWeight: 600 }}>
                  AI
                </span>
              </div>
            </Row>

            <Divider />

            <Row>
              <div>
                <div style={{
                  fontFamily: MONO, fontSize: 9, letterSpacing: '0.07em',
                  color: 'rgba(90,105,140,0.50)', marginBottom: 4,
                }}>
                  {t('settings.accountId')}
                </div>
                <div style={{
                  fontFamily: MONO, fontSize: 10, letterSpacing: '0.04em',
                  color: 'rgba(130,145,175,0.50)',
                  wordBreak: 'break-all',
                }}>
                  {user?.id}
                </div>
              </div>
            </Row>
          </Card>
        </div>

        {/* ── Sign out ── */}
        <button
          onClick={handleSignOut}
          style={{
            width: '100%', height: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: INTER, fontSize: 15, fontWeight: 500,
            color: 'rgba(210,80,80,0.80)',
            background: 'rgba(200,50,50,0.06)',
            border: '1px solid rgba(200,50,50,0.20)',
            borderRadius: 14, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,50,50,0.12)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,50,50,0.35)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,50,50,0.06)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,50,50,0.20)';
          }}
        >
          <LogOut size={16} />
          {t('settings.signOut')}
        </button>

        {/* Footer */}
        <div style={{
          marginTop: 32, textAlign: 'center',
          fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em',
          color: 'rgba(55,65,88,0.40)',
        }}>
          PESTA · v2.0
        </div>

      </div>
    </div>
  );
}
