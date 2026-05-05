import { useEffect, useState } from 'react';
import { ConnectScreen, type ConnectInput } from './components/ConnectScreen.js';
import { ChatScreen } from './components/ChatScreen.js';
import { api } from './api.js';

type AppState =
  | { phase: 'loading' }
  | { phase: 'connect' }
  | { phase: 'chat'; me: { name: string; avatar: string } };

export function App() {
  const [state, setState] = useState<AppState>({ phase: 'loading' });

  useEffect(() => {
    api.session()
      .then(s => setState(s ? { phase: 'chat', me: s } : { phase: 'connect' }))
      .catch(() => setState({ phase: 'connect' }));
  }, []);

  async function handleConnect(input: ConnectInput) {
    const res = await api.connect(input);
    setState({ phase: 'chat', me: { name: res.name, avatar: res.avatar } });
  }

  if (state.phase === 'loading') return <main><p>Loading…</p></main>;
  if (state.phase === 'connect') return <ConnectScreen onConnect={handleConnect} />;
  return <ChatScreen me={state.me} />;
}
