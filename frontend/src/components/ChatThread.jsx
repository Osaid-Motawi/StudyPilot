import { useState, useRef, useEffect } from 'react';
import { Plus, X, Paperclip } from 'lucide-react';

// Reusable conversation view: a scrolling message list + a composer.
// Used by the general AI Chat and the analysis chat.
//
// Props:
//   messages   : array<{ role: 'user' | 'assistant', content: string }>
//   onSend     : async (text) => void — parent sends to the backend; on reject
//                ChatThread shows a retryable error and KEEPS the typed text.
//   disabled   : optional; disables the composer
//   placeholder: optional composer placeholder
//   autoFocus  : optional; focus the composer on mount
//   greeting   : optional { title, subtitle } shown when there are no messages
export default function ChatThread({
  messages = [],
  onSend,
  disabled = false,
  placeholder = 'Message your study companion…',
  autoFocus = false,
  greeting = null,
}) {
  const [draft, setDraft] = useState('');
  const [file, setFile] = useState(null); // optional PDF/.txt attachment
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { message, retryable }
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSend(text, file);
      setDraft(''); // clear only on success
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError({
        message: err?.message || 'Could not send your message. Please try again.',
        retryable: Boolean(err?.retryable),
      });
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    send();
  }

  // Enter sends; Shift+Enter inserts a newline (ChatGPT/Claude behaviour).
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const empty = messages.length === 0 && !busy;

  const errorBox = error && (
    <div className="error" role="alert">
      <p>{error.message}</p>
      {error.retryable && (
        <button type="button" onClick={send} disabled={busy}>
          Retry
        </button>
      )}
    </div>
  );

  const composer = (
    <div className="chat-composer-box">
      {file && (
        <div className="chat-attachment">
          <span className="chat-attachment-name">
            <Paperclip size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '0.35rem' }} />
            {file.name}
          </span>
          <button
            type="button"
            className="chat-attachment-remove"
            aria-label="Remove attachment"
            onClick={() => {
              setFile(null);
              if (fileRef.current) fileRef.current.value = '';
            }}
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      )}
      <form className="chat-composer" onSubmit={handleSubmit}>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          hidden
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <textarea
          ref={inputRef}
          rows={1}
          aria-label="Message"
          placeholder={file ? 'Ask a question about the attached file…' : placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || busy}
        />
        <div className="chat-composer-actions">
          <button
            type="button"
            className="chat-attach-btn"
            aria-label="Attach a PDF or text file"
            title="Attach a PDF or .txt file"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || busy}
          >
            <Plus size={22} aria-hidden="true" />
          </button>
          <button type="submit" disabled={disabled || busy || !draft.trim()}>
            {busy ? '…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );

  // Empty state (Claude-style): centered greeting + composer in the middle.
  if (empty && greeting) {
    return (
      <div className="chat-thread">
        <div className="chat-empty-state">
          <div className="chat-greeting">
            <div className="brand-mark" aria-hidden="true">
              SP
            </div>
            <h2>{greeting.title}</h2>
            {greeting.subtitle && <p className="muted">{greeting.subtitle}</p>}
          </div>
          <div className="chat-composer-wrap centered">
            {errorBox}
            {composer}
          </div>
        </div>
      </div>
    );
  }

  // Conversation view: messages fill, composer pinned at the bottom.
  return (
    <div className="chat-thread">
      <div className="chat-messages" ref={listRef}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-msg chat-msg-${m.role === 'user' ? 'user' : 'assistant'}`}
          >
            {m.role !== 'user' && (
              <span className="chat-avatar" aria-hidden="true">
                SP
              </span>
            )}
            <div className="chat-bubble">{m.content}</div>
          </div>
        ))}
        {busy && (
          <div className="chat-msg chat-msg-assistant">
            <span className="chat-avatar" aria-hidden="true">
              SP
            </span>
            <div className="chat-bubble chat-typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      <div className="chat-composer-wrap">
        {errorBox}
        {composer}
      </div>
    </div>
  );
}
