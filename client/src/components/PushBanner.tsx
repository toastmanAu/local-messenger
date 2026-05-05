import { useEffect, useState } from 'react';
import { getPushAvailability, subscribePush, type PushAvailability } from '../push.js';
import './PushBanner.css';

export function PushBanner() {
  const [avail, setAvail] = useState<PushAvailability | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { getPushAvailability().then(setAvail); }, []);

  if (!avail || avail === 'subscribed' || avail === 'unsupported') return null;

  if (avail === 'ios-needs-install') {
    return (
      <div className="push-banner">
        <p>📱 To get notifications, tap the <b>Share</b> icon then <b>Add to Home Screen</b>, then re-open from the Home Screen.</p>
      </div>
    );
  }
  if (avail === 'denied') {
    return <div className="push-banner">Notifications are blocked. Enable them in your browser/app settings.</div>;
  }
  return (
    <div className="push-banner">
      <p>Enable notifications so you don't miss messages.</p>
      <button disabled={busy} onClick={async () => {
        setBusy(true);
        try { await subscribePush(); setAvail('subscribed'); }
        catch { /* leave avail unchanged */ }
        finally { setBusy(false); }
      }}>{busy ? 'Enabling…' : 'Enable'}</button>
    </div>
  );
}
