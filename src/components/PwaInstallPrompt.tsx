import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaInstallPromptProps {
  isCollapsed?: boolean;
}

export const PwaInstallPrompt: React.FC<PwaInstallPromptProps> = ({ isCollapsed = false }) => {
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

  if (isCollapsed) {
    return (
      <div className="sidebar-pwa-collapsed" title="Install CEAZ1 Reachout Nigeria App for fast offline recording">
        <button
          onClick={handleInstall}
          className="sidebar-pwa-collapsed-btn"
          aria-label="Install App"
        >
          <Download size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="sidebar-pwa-card" role="status" aria-live="polite">
      <div className="sidebar-pwa-header">
        <div className="sidebar-pwa-icon">
          <Smartphone size={16} />
        </div>
        <div className="sidebar-pwa-info">
          <span className="sidebar-pwa-title">Install CEAZ1 App</span>
          <span className="sidebar-pwa-sub">Fast offline recording</span>
        </div>
        <button
          onClick={handleDismiss}
          className="sidebar-pwa-dismiss"
          title="Dismiss install prompt"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
      <button
        onClick={handleInstall}
        className="sidebar-pwa-action-btn"
        disabled={isInstalling}
      >
        <Download size={14} />
        <span>{isInstalling ? 'Installing…' : 'Install App'}</span>
      </button>
    </div>
  );
};
