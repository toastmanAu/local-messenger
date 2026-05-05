import { useState } from 'react';
import { AVATAR_SLUGS, type AvatarSlug } from '../types.js';
import './ConnectScreen.css';

export interface ConnectInput {
  name: string;
  avatar: AvatarSlug;
  passphrase: string;
}

export interface ConnectScreenProps {
  onConnect: (input: ConnectInput) => Promise<void>;
}

export function ConnectScreen({ onConnect }: ConnectScreenProps) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<AvatarSlug | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = name.trim().length > 0 && !!avatar && passphrase.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    // Unlock iOS audio for in-tab pings later in the session.
    // Fire and forget: an Audio with no src can hang the play() promise
    // on some browsers until the tab regains focus, which would block
    // the connect call.
    try {
      const audio = new Audio();
      audio.volume = 0;
      void audio.play().catch(() => {});
    } catch { /* ignore */ }
    setBusy(true); setError(null);
    try {
      await onConnect({ name: name.trim(), avatar: avatar!, passphrase });
    } catch (err) {
      setError('Could not connect. Check the passphrase and try again.');
    } finally { setBusy(false); }
  }

  return (
    <form className="connect-screen" onSubmit={submit}>
      <h1>Local Messenger</h1>
      <fieldset className="avatars" aria-label="Pick an avatar">
        <legend>Pick an avatar</legend>
        {AVATAR_SLUGS.map(slug => (
          <label key={slug} className={`avatar-option ${avatar === slug ? 'selected' : ''}`}>
            <input type="radio" name="avatar" value={slug} aria-label={slug}
                   checked={avatar === slug} onChange={() => setAvatar(slug)} />
            <img src={`avatars/${slug}.png`} alt={slug} />
            <span>{slug}</span>
          </label>
        ))}
      </fieldset>
      <label className="field">
        <span>Your name</span>
        <input type="text" autoComplete="off" maxLength={32}
               value={name} onChange={e => setName(e.target.value)} />
      </label>
      <label className="field">
        <span>Room passphrase</span>
        <input type="password" autoComplete="current-password"
               value={passphrase} onChange={e => setPassphrase(e.target.value)} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" disabled={!ready || busy}>
        {busy ? 'Connecting…' : 'Connect'}
      </button>
    </form>
  );
}
