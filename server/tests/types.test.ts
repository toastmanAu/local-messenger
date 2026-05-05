import { describe, it, expect } from 'vitest';
import { AVATAR_SLUGS, type AvatarSlug } from '../src/types.js';

describe('AVATAR_SLUGS', () => {
  it('contains exactly the 8 expected slugs', () => {
    expect([...AVATAR_SLUGS].sort()).toEqual(
      ['bear', 'cat', 'fox', 'frog', 'hedgehog', 'owl', 'penguin', 'raccoon']
    );
  });

  it('AvatarSlug type is a union of those slugs', () => {
    const ok: AvatarSlug = 'fox';
    expect(AVATAR_SLUGS).toContain(ok);
  });
});
