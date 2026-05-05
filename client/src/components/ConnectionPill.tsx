export function ConnectionPill({ status }: { status: 'connecting' | 'online' | 'reconnecting' | 'kicked' }) {
  if (status === 'online') return null;
  const label = status === 'connecting' ? 'Connecting…'
              : status === 'reconnecting' ? 'Reconnecting…'
              : 'Signed in elsewhere';
  return <div className={`pill pill-${status}`}>{label}</div>;
}
