import { useEffect, useState } from 'react';
import {
  listChats,
  getChat,
  createChat,
  sendChatMessage,
  analyzeUpload,
} from '../services/apiClient.js';
import ChatThread from '../components/ChatThread.jsx';

// General AI Chat — ChatGPT/Claude style. Opens straight into a ready, empty
// chat (composer focused); a sidebar lists persisted conversations to switch to
// or start a new one. The chat is created on the backend when the first message
// is sent.
const BLANK = { id: null, title: 'New chat', messages: [] };

export default function ChatPage() {
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(BLANK); // ready to type immediately
  const [listError, setListError] = useState('');

  async function refreshChats() {
    try {
      const res = await listChats();
      setChats(res?.chats || []);
    } catch (err) {
      setListError(err?.message || 'Could not load your chats.');
    }
  }

  useEffect(() => {
    refreshChats();
  }, []);

  async function openChat(id) {
    setListError('');
    try {
      const chat = await getChat(id);
      setActive({ id: chat.id, title: chat.title, messages: chat.messages || [] });
    } catch (err) {
      setListError(err?.message || 'Could not open that chat.');
    }
  }

  function startNewChat() {
    setActive({ ...BLANK });
  }

  // Wired into ChatThread; rethrows so the composer preserves the message/file.
  async function handleSend(text, file) {
    if (file) {
      // Attaching a PDF/.txt starts a new chat grounded in that file's content.
      const res = await analyzeUpload(file, { question: text });
      const chat = await getChat(res.chatId);
      setActive({ id: chat.id, title: chat.title, messages: chat.messages || [] });
      refreshChats();
      return;
    }
    const res = active?.id
      ? await sendChatMessage(active.id, { message: text })
      : await createChat({ message: text });
    setActive({ id: res.id, title: res.title, messages: res.messages || [] });
    refreshChats();
  }

  return (
    <div className="chat-fullscreen">
      <aside className="chat-sidebar">
        <button type="button" className="btn-block new-chat-btn" onClick={startNewChat}>
          + New chat
        </button>
        {listError && (
          <p className="error" role="alert">
            {listError}
          </p>
        )}
        <nav className="chat-list" aria-label="Conversations">
          {chats.length === 0 ? (
            <p className="muted chat-list-empty">No conversations yet.</p>
          ) : (
            chats.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chat-list-item${active?.id === c.id ? ' active' : ''}`}
                onClick={() => openChat(c.id)}
                title={c.title || 'Untitled chat'}
              >
                {c.title || 'Untitled chat'}
              </button>
            ))
          )}
        </nav>
      </aside>

      <section className="chat-main">
        <ChatThread
          key={active?.id || 'new'}
          messages={active.messages}
          onSend={handleSend}
          autoFocus
          greeting={{
            title: 'How can I help you study?',
            subtitle:
              'Ask anything, or attach a PDF/.txt with + to chat about its content.',
          }}
        />
      </section>
    </div>
  );
}
