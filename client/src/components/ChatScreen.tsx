import { useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat.js';
import { MessageBubble } from './MessageBubble.js';
import { Composer } from './Composer.js';
import { ConnectionPill } from './ConnectionPill.js';
import { PresenceBar } from './PresenceBar.js';
import { PushBanner } from './PushBanner.js';
import { InstallHint } from './InstallHint.js';
import { api } from '../api.js';
import type { MessagePayload } from '../types.js';
import './ChatScreen.css';

export function ChatScreen({ me }: { me: { name: string; avatar: string } }) {
  const { state, actions } = useChat(me.name);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.messages.length, state.pending.length]);

  async function handlePhoto(file: File) {
    let upload: File = file;
    if (/heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) {
      const heic2any = (await import('heic2any')).default;
      const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
      const merged = Array.isArray(blob) ? blob[0]! : blob;
      upload = new File([merged], file.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' });
    }
    await api.uploadImage(upload, null);
  }

  return (
    <main className="chat">
      <header>
        <PresenceBar connected={state.presence} />
        <PushBanner />
        <InstallHint />
        <ConnectionPill status={state.status} />
      </header>
      <div className="messages" ref={listRef}>
        {state.messages.map(m => (
          <MessageBubble key={m.id} m={m} mine={m.sender_name === me.name} />
        ))}
        {state.pending.map(p => (
          <MessageBubble
            key={p.tempId}
            m={{
              id: -1, created_at: Date.now(),
              sender_name: me.name, sender_avatar: me.avatar as any,
              kind: 'text', body: p.body,
            } as MessagePayload}
            mine={true}
            pending={!p.failed}
            failed={p.failed}
          />
        ))}
        {state.typing && <div className="typing">{state.typing.name} is typing…</div>}
      </div>
      <Composer
        disabled={state.status !== 'online'}
        onSend={actions.sendText}
        onTyping={actions.emitTyping}
        onPickPhoto={handlePhoto}
      />
    </main>
  );
}
