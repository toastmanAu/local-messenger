import type { MessagePayload } from '../types.js';
import { Linkified } from '../lib/linkify.js';
import './MessageBubble.css';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
  const hhmm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (sameDay) return hhmm;
  const dm = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${dm} ${hhmm}`;
}

export interface MessageBubbleProps {
  m: MessagePayload;
  mine: boolean;
  pending?: boolean;
  failed?: boolean;
}

export function MessageBubble({ m, mine, pending, failed }: MessageBubbleProps) {
  const cls = `bubble ${mine ? 'mine' : 'other'}${pending ? ' pending' : ''}${failed ? ' failed' : ''}`;
  return (
    <div className={cls}>
      {!mine && <img className="avatar" src={`${import.meta.env.BASE_URL}avatars/${m.sender_avatar}.png`} alt={m.sender_avatar} />}
      <div className="bubble-body">
        {!mine && <div className="who">{m.sender_name}</div>}
        {m.kind === 'text'
          ? <p className="text"><Linkified text={m.body} /></p>
          : (
            <a href={m.image_url} target="_blank" rel="noopener noreferrer">
              <img
                src={m.thumb_url}
                alt={m.body ?? 'photo'}
                style={{ aspectRatio: `${m.image_width} / ${m.image_height}`, width: '100%', maxWidth: 320 }}
              />
              {m.body ? <p className="caption"><Linkified text={m.body} /></p> : null}
            </a>
          )}
        <div className="meta">
          <time dateTime={new Date(m.created_at).toISOString()} title={new Date(m.created_at).toLocaleString()}>
            {formatTime(m.created_at)}
          </time>
          {pending && <span> · sending…</span>}
          {failed && <span> · failed — tap to retry</span>}
        </div>
      </div>
    </div>
  );
}
