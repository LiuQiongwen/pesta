import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { PestaLogo } from '@/components/brand/PestaLogo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Mode = 'login' | 'register' | 'forgot';

export default function Auth() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  // Redirect on login — admin → /admin/orders, regular → /app
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        navigate(data?.is_admin ? '/admin/orders' : '/app');
      });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error(t('auth.validate.email')); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error(t('auth.validate.emailFormat')); return; }
    if (mode !== 'forgot' && !password) { toast.error(t('auth.validate.password')); return; }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) { toast.error(t('auth.error.signIn')); return; }
        navigate('/app');
      } else if (mode === 'register') {
        if (password !== confirmPassword) { toast.error(t('auth.validate.passwordMatch')); return; }
        if (password.length < 6) { toast.error(t('auth.validate.passwordLength')); return; }
        const { data, error } = await signUp(email, password);
        if (error) { toast.error(error.message || t('auth.error.signUp')); return; }
        if (data?.session) {
          toast.success(t('auth.register.success'));
          navigate('/app');
          return;
        }
        toast.success(t('auth.register.successConfirm'));
        setMode('login');
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) { toast.error(error.message); return; }
        toast.success(t('settings.passwordSent'));
        setMode('login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-background" style={{ minHeight: '100svh', overflowY: 'auto' }}>
      {/* Left - Branding Panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-gradient-hero relative overflow-hidden p-12">
        <div className="absolute inset-0 bg-gradient-glow" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <PestaLogo size={36} showName />
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            {t('auth.title.signIn')}<br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              {t('auth.subtitle.signIn')}
            </span>
          </h1>
          <p className="text-sidebar-foreground text-lg leading-relaxed">
            {t('auth.subtitle.signUp')}
          </p>
        </div>
        <div className="relative z-10 mt-auto space-y-4">
          {(['auth.feature.1', 'auth.feature.2', 'auth.feature.3', 'auth.feature.4'] as const).map(key => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-glow flex-shrink-0" />
              <span className="text-sidebar-foreground text-sm">{t(key)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right - Auth Form */}
      <div className="flex flex-col flex-1 items-center justify-center p-8" style={{ paddingTop: 'max(32px, env(safe-area-inset-top, 0px))', paddingBottom: 'max(32px, env(safe-area-inset-bottom, 0px))' }}>
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <PestaLogo size={28} showName />
          </div>

          <div className="mb-8">
            {mode === 'forgot' && (
              <button
                onClick={() => setMode('login')}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> {t('common.back')}
              </button>
            )}
            <h2 className="text-2xl font-bold text-foreground">
              {mode === 'login'
                ? t('auth.title.signIn')
                : mode === 'register'
                ? t('auth.title.signUp')
                : t('auth.forgot.title')}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {mode === 'login'
                ? t('auth.subtitle.signIn')
                : mode === 'register'
                ? t('auth.subtitle.signUp')
                : t('auth.forgot.sub')}
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-11"
              />
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="confirm">{t('auth.confirm.label')}</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="h-11"
                />
              </div>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm text-primary hover:underline"
                >
                  {t('auth.forgot.link')}
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-opacity"
              disabled={loading}
            >
              {loading
                ? '...'
                : mode === 'login'
                ? t('auth.signIn')
                : mode === 'register'
                ? t('auth.signUp')
                : t('auth.forgot.send')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            {mode === 'login' ? (
              <p className="text-sm text-muted-foreground">
                {t('auth.switchToSignUp')}{' '}
                <button onClick={() => setMode('register')} className="text-primary hover:underline font-medium">
                  {t('auth.createOne')}
                </button>
              </p>
            ) : mode === 'register' ? (
              <p className="text-sm text-muted-foreground">
                {t('auth.switchToSignIn')}{' '}
                <button onClick={() => setMode('login')} className="text-primary hover:underline font-medium">
                  {t('auth.signInLink')}
                </button>
              </p>
            ) : null}
          </div>

          {/* Legal links */}
          <div className="mt-5 text-center">
            <p className="text-xs text-muted-foreground/50">
              {mode === 'register' ? t('auth.terms.register') : t('auth.terms.use')}{' '}
              <a href="/terms" target="_blank" rel="noreferrer" className="underline hover:text-muted-foreground transition-colors">{t('auth.terms.service')}</a>
              {' '}{t('auth.terms.and')}{' '}
              <a href="/privacy" target="_blank" rel="noreferrer" className="underline hover:text-muted-foreground transition-colors">{t('auth.terms.privacy')}</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
