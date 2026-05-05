import { timingSafeEqual } from 'node:crypto';

export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) {
    const filler = Buffer.alloc(ab.length);
    timingSafeEqual(ab, filler);
    return false;
  }
  return timingSafeEqual(ab, bb);
}
