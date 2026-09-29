import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    // Guard against a double click: prompt() rejects if it is called twice in
    // the same page load, which previously surfaced as an unhandled rejection.
    if (!deferredPrompt || isInstalling) return;
    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] install prompt outcome:', outcome);
    } catch (err) {
      console.error('[PWA] install prompt failed:', err);
    } finally {
      setDeferredPrompt(null);
      setIsVisible(false);
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !deferredPrompt) {
    return null;
  }

  return (
    <div className="pwa-install-bar" role="status" aria-live="polite">
      <div className="pwa-install-content">
        <Download size={18} aria-hidden="true" />
        <span>
          Install <strong>CEAZ1 Reachout Nigeria</strong> app for fast offline recording
        </span>
      </div>
      <div className="pwa-install-actions">
        <button onClick={handleInstall} className="pwa-install-btn" disabled={isInstalling}>
          {isInstalling ? 'Installing…' : 'Install App'}
        </button>
        <button onClick={handleDismiss} className="pwa-dismiss-btn" aria-label="Dismiss install prompt">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
