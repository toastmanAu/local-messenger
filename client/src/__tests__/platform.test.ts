import { describe, it, expect, vi } from 'vitest';
import { isiOS, isStandalone } from '../platform.js';

describe('platform', () => {
  it('detects iOS by UA', () => {
    Object.defineProperty(window.navigator, 'userAgent', { value: 'iPhone', configurable: true });
    expect(isiOS()).toBe(true);
    Object.defineProperty(window.navigator, 'userAgent', { value: 'Linux', configurable: true });
    expect(isiOS()).toBe(false);
  });

  it('detects standalone via display-mode media query', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true } as any));
    expect(isStandalone()).toBe(true);
  });
});
