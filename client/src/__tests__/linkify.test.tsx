import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Linkified } from '../lib/linkify.js';

describe('Linkified', () => {
  it('renders plain text unchanged', () => {
    render(<Linkified text="hello world" />);
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });

  it('linkifies http(s) URLs with target=_blank rel=noopener', () => {
    render(<Linkified text="check https://example.com/x?y=1 ok" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/x?y=1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('handles multiple URLs', () => {
    render(<Linkified text="a https://a.com b https://b.com c" />);
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
});
