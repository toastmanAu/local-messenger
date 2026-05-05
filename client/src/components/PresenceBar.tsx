export function PresenceBar({ connected }: { connected: Array<{ name: string; avatar: string }> }) {
  return (
    <div className="presence-bar">
      {connected.map(p => (
        <div key={p.name} className="presence-pill">
          <img src={`avatars/${p.avatar}.png`} alt={p.avatar} />
          <span>{p.name}</span>
        </div>
      ))}
    </div>
  );
}
