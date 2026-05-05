import { describe, it, expect } from 'vitest';
import { Presence } from '../src/socket/presence.js';

const fakeSocket = (id: string, onDisconnect?: () => void, onEmit?: (ev: string, p: any) => void) =>
  ({ id, disconnect: () => onDisconnect?.(), emit: (ev: string, p: any) => onEmit?.(ev, p) } as any);

describe('Presence', () => {
  it('attaches and snapshot dedupes by name', () => {
    const p = new Presence();
    p.attach('s1', fakeSocket('a'), { name: 'Alice', avatar: 'fox' });
    p.attach('s1', fakeSocket('b'), { name: 'Alice', avatar: 'fox' });
    expect(p.snapshot()).toEqual([{ name: 'Alice', avatar: 'fox' }]);
  });

  it('detach removes socket; session disappears when last socket leaves', () => {
    const p = new Presence();
    p.attach('s1', fakeSocket('a'), { name: 'Alice', avatar: 'fox' });
    p.attach('s1', fakeSocket('b'), { name: 'Alice', avatar: 'fox' });
    p.detach('s1', 'a');
    expect(p.snapshot()).toEqual([{ name: 'Alice', avatar: 'fox' }]);
    p.detach('s1', 'b');
    expect(p.snapshot()).toEqual([]);
  });

  it('kick disconnects all sockets for given session ids', () => {
    const p = new Presence();
    let aDc = false, bDc = false;
    p.attach('s1', fakeSocket('a', () => { aDc = true; }), { name: 'P', avatar: 'fox' });
    p.attach('s2', fakeSocket('b', () => { bDc = true; }), { name: 'S', avatar: 'cat' });
    p.kick(['s1']);
    expect(aDc).toBe(true);
    expect(bDc).toBe(false);
    expect(p.snapshot().map(s => s.name)).toEqual(['S']);
  });
});
