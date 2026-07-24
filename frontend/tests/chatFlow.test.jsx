import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// US3: sending a message appends the assistant reply. apiClient is mocked — no
// real backend or Firebase.
vi.mock('../src/services/apiClient.js', () => ({
  listChats: vi.fn().mockResolvedValue({ chats: [] }),
  getChat: vi.fn(),
  createChat: vi.fn().mockResolvedValue({
    id: 'c1',
    title: 'Study help',
    messages: [
      { role: 'user', content: 'Explain mitosis' },
      {
        role: 'assistant',
        content: 'Mitosis is how a cell divides into two identical cells.',
      },
    ],
  }),
  sendChatMessage: vi.fn(),
}));

import ChatPage from '../src/pages/ChatPage.jsx';
import { createChat } from '../src/services/apiClient.js';

describe('chat flow: send -> reply renders', () => {
  it('starts a new chat, sends a message, and shows the assistant reply', async () => {
    const user = userEvent.setup();
    render(<ChatPage />);

    await user.click(await screen.findByRole('button', { name: /new chat/i }));

    const composer = screen.getByLabelText('Message');
    await user.type(composer, 'Explain mitosis');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    // Assistant reply renders in the thread.
    await screen.findByText(/Mitosis is how a cell divides/i);
    expect(screen.getByText('Explain mitosis')).toBeInTheDocument();
    expect(createChat).toHaveBeenCalledWith({ message: 'Explain mitosis' });

    // Composer is cleared after a successful send.
    expect(screen.getByLabelText('Message')).toHaveValue('');
  });
});
