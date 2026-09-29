import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

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
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] User response to install prompt:', outcome);
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !deferredPrompt) {
    return null;
  }

  return (
    <div className="pwa-install-bar">
      <div className="pwa-install-content">
        <Download size={18} />
        <span>Install <strong>CEAZ1 Reachout Nigeria</strong> app for fast offline recording</span>
      </div>
      <div className="pwa-install-actions">
        <button onClick={handleInstall} className="pwa-install-btn">
          Install App
        </button>
        <button onClick={handleDismiss} className="pwa-dismiss-btn" aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
