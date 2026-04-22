import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Capacitor native platform init (no-op on web)
async function initCapacitor() {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return;

  const { StatusBar, Style } = await import('@capacitor/status-bar');
  const { Keyboard }         = await import('@capacitor/keyboard');
  const { SplashScreen }     = await import('@capacitor/splash-screen');

  // Dark overlay status bar
  await StatusBar.setStyle({ style: Style.Dark });
  await StatusBar.setBackgroundColor({ color: '#040508' });

  // Keyboard: push content up instead of covering it
  Keyboard.addListener('keyboardWillShow', () => {
    document.documentElement.style.setProperty('--keyboard-height', '1');
  });
  Keyboard.addListener('keyboardWillHide', () => {
    document.documentElement.style.setProperty('--keyboard-height', '0');
  });

  // Hide splash after app is ready
  await SplashScreen.hide({ fadeOutDuration: 300 });
}

initCapacitor().catch(console.error);

createRoot(document.getElementById('root')!).render(<App />);
