import { useEffect, useState } from 'react';
import { isiOS, isStandalone } from '../platform.js';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallHint() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    const handler = (e: Event) => { e.preventDefault(); setEvt(e as BeforeInstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', handler as any);
    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  if (isStandalone()) return null;
  if (isiOS()) {
    return (
      <div className="install-hint">
        Tip: open the Share menu and choose <b>Add to Home Screen</b> for the best experience.
      </div>
    );
  }
  if (!evt) return null;
  return (
    <button className="install-button" onClick={async () => { await evt.prompt(); setEvt(null); }}>
      Install app
    </button>
  );
}
