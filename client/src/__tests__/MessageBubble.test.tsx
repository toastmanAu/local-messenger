import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../components/MessageBubble.js';
import type { MessagePayload } from '../types.js';

const text = (over: Partial<Extract<MessagePayload, { kind: 'text' }>> = {}): MessagePayload => ({
  id: 1, created_at: 1700000000000,
  sender_name: 'Sam', sender_avatar: 'owl', kind: 'text', body: 'hi', ...over,
});
const image = (over: Partial<Extract<MessagePayload, { kind: 'image' }>> = {}): MessagePayload => ({
  id: 2, created_at: 1700000000000,
  sender_name: 'Alice', sender_avatar: 'fox', kind: 'image', body: 'caption',
  image_url: '/media/2/full', thumb_url: '/media/2/thumb',
  image_width: 400, image_height: 300, image_bytes: 1234, ...over,
});

describe('MessageBubble', () => {
  it('renders text body with linkified URL', () => {
    render(<MessageBubble m={text({ body: 'see https://x.test' })} mine={false} />);
    expect(screen.getByRole('link', { name: 'https://x.test' })).toHaveAttribute('href', 'https://x.test');
  });

  it('renders image with thumb and reserves aspect ratio', () => {
    render(<MessageBubble m={image()} mine={true} />);
    const img = screen.getByAltText(/caption/i) as HTMLImageElement;
    expect(img.src).toContain('/media/2/thumb');
    expect(img.style.aspectRatio).toBe('400 / 300');
  });

  it('applies mine class when mine=true', () => {
    const { container } = render(<MessageBubble m={text()} mine={true} />);
    expect(container.querySelector('.bubble.mine')).toBeTruthy();
  });
});
