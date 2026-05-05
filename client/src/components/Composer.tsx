import { useState, useRef } from 'react';

export interface ComposerProps {
  disabled: boolean;
  onSend: (body: string) => void;
  onTyping: () => void;
  onPickPhoto: (file: File) => void;
}

export function Composer({ disabled, onSend, onTyping, onPickPhoto }: ComposerProps) {
  const [text, setText] = useState('');
  const fileLib = useRef<HTMLInputElement>(null);
  const fileCam = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) onPickPhoto(f);
  }

  return (
    <form className="composer" onSubmit={submit}>
      <button type="button" className="attach" disabled={disabled} onClick={() => fileLib.current?.click()} aria-label="Attach photo">📎</button>
      <input ref={fileLib} type="file" accept="image/*" hidden onChange={onFileChange} />
      <button type="button" className="attach" disabled={disabled} onClick={() => fileCam.current?.click()} aria-label="Take photo">📷</button>
      <input ref={fileCam} type="file" accept="image/*" capture="environment" hidden onChange={onFileChange} />

      <input
        className="text" type="text" value={text} disabled={disabled}
        onChange={e => { setText(e.target.value); onTyping(); }}
        placeholder="Message…" autoComplete="off"
      />
      <button type="submit" disabled={disabled || !text.trim()} aria-label="Send">Send</button>
    </form>
  );
}
