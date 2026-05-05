import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectScreen } from '../components/ConnectScreen.js';

describe('ConnectScreen', () => {
  it('disables Connect until name + avatar + passphrase present', async () => {
    const onConnect = vi.fn().mockResolvedValue(undefined);
    render(<ConnectScreen onConnect={onConnect} />);
    const button = screen.getByRole('button', { name: /connect/i });
    expect(button).toBeDisabled();

    await userEvent.click(screen.getByRole('radio', { name: /fox/i }));
    await userEvent.type(screen.getByLabelText(/your name/i), 'Alice');
    await userEvent.type(screen.getByLabelText(/passphrase/i), 'pw');
    expect(button).not.toBeDisabled();
  });

  it('calls onConnect with the form values', async () => {
    const onConnect = vi.fn().mockResolvedValue(undefined);
    render(<ConnectScreen onConnect={onConnect} />);
    await userEvent.click(screen.getByRole('radio', { name: /owl/i }));
    await userEvent.type(screen.getByLabelText(/your name/i), 'Sam');
    await userEvent.type(screen.getByLabelText(/passphrase/i), 'pw');
    await userEvent.click(screen.getByRole('button', { name: /connect/i }));
    expect(onConnect).toHaveBeenCalledWith({ name: 'Sam', avatar: 'owl', passphrase: 'pw' });
  });
});
