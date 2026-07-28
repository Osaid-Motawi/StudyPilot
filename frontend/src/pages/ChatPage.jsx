import { Menu } from 'lucide-react';
import { useChatData } from '../hooks/useChatData.js';
import ChatThread from '../components/ChatThread.jsx';

// General AI Chat — ChatGPT/Claude style. Opens straight into a ready, empty
// chat (composer focused); a sidebar lists persisted conversations to switch to
// or start a new one. The chat is created on the backend when the first message
// is sent. All conversation logic lives in the shared useChatData hook (also
// used by the MUI design); this file is only the Classic presentation.
export default function ChatPage() {
  const {
    chats,
    active,
    listError,
    sidebarOpen,
    setSidebarOpen,
    openChat,
    startNewChat,
    handleSend,
  } = useChatData();

  return (
    <div className="chat-fullscreen">
      {sidebarOpen && (
        <div
          className="chat-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`chat-sidebar${sidebarOpen ? ' open' : ''}`}>
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
        <div className="chat-mobile-bar">
          <button
            type="button"
            className="chat-sidebar-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Show conversations"
          >
            <Menu size={16} aria-hidden="true" style={{ verticalAlign: '-3px', marginRight: '0.4rem' }} />
            Chats
          </button>
        </div>
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
