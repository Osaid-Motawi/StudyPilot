'use strict';

const { getDb } = require('../clients/firestoreClient');
const agentClient = require('../clients/agentClient');
const { toIso } = require('../lib/quizModel');

// Number of most-recent turns replayed to the (stateless) agent on each turn.
const HISTORY_LIMIT = 20;

function chatsCol(uid) {
  return getDb().collection('users').doc(uid).collection('chats');
}

/** Derive a short human title from the first user message. */
function deriveTitle(text) {
  const t = String(text || '').trim().replace(/\s+/g, ' ');
  if (!t) return 'New Chat';
  return t.length > 60 ? `${t.slice(0, 57)}...` : t;
}

/**
 * Client-safe conversation shape. Answer material / grounding text is NOT
 * exposed: contextText stays internal to the backend.
 */
function formatChat(chat) {
  return {
    id: chat.id,
    kind: chat.kind,
    title: chat.title,
    messages: (chat.messages || []).map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: toIso(m.createdAt),
    })),
  };
}

/** Compact list-view item for a chat. */
function formatChatListItem(chat) {
  return {
    id: chat.id,
    kind: chat.kind,
    title: chat.title,
    updatedAt: toIso(chat.updatedAt),
  };
}

/** Map stored messages to the agent's {role,content} history (recent window). */
function toAgentHistory(messages) {
  return (messages || [])
    .slice(-HISTORY_LIMIT)
    .map((m) => ({ role: m.role, content: m.content }));
}

/**
 * Create a chat, get the assistant's first reply, and persist under
 * users/{uid}/chats/{chatId}. Used for both general (Part 3) and analysis
 * (Part 4 chat mode) conversations.
 *
 * The agent call happens BEFORE persistence, so an agent failure (502) leaves
 * nothing stored and the user's message is preserved client-side.
 *
 * @param {object} args
 * @param {string} args.uid
 * @param {string} args.message - the first user message.
 * @param {string} [args.kind] - 'general' (default) | 'analysis'.
 * @param {string|null} [args.contextText] - grounding text for analysis chats.
 * @param {string} [args.title]
 */
async function createChat({ uid, message, kind = 'general', contextText = null, title }) {
  const resolvedKind = kind === 'analysis' ? 'analysis' : 'general';
  const content = String(message == null ? '' : message);
  const ctx = resolvedKind === 'analysis' ? String(contextText == null ? '' : contextText) : null;

  const { reply } = await agentClient.chat({
    messages: [{ role: 'user', content }],
    contextText: ctx != null ? ctx : undefined,
  });

  const now = new Date();
  const userMsg = { role: 'user', content, createdAt: now };
  const assistantMsg = { role: 'assistant', content: reply, createdAt: new Date() };

  const ref = chatsCol(uid).doc();
  const chat = {
    id: ref.id,
    ownerId: uid,
    kind: resolvedKind,
    title: title || deriveTitle(content),
    contextText: ctx,
    messages: [userMsg, assistantMsg],
    createdAt: now,
    updatedAt: new Date(),
  };
  await ref.set(chat);
  return formatChat(chat);
}

/**
 * Append a user message to an existing chat, replay recent history to the
 * agent, append the assistant reply, and persist. Returns null if the chat is
 * not owned by uid (route → 404). Agent failure (502) leaves the chat unchanged.
 */
async function appendToChat({ uid, chatId, message }) {
  const ref = chatsCol(uid).doc(chatId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const chat = { id: snap.id, ...snap.data() };
  const existing = Array.isArray(chat.messages) ? chat.messages : [];
  const content = String(message == null ? '' : message);
  const userMsg = { role: 'user', content, createdAt: new Date() };

  const { reply } = await agentClient.chat({
    messages: toAgentHistory([...existing, userMsg]),
    contextText: chat.contextText != null ? chat.contextText : undefined,
  });
  const assistantMsg = { role: 'assistant', content: reply, createdAt: new Date() };

  const updated = {
    ...chat,
    messages: [...existing, userMsg, assistantMsg],
    updatedAt: new Date(),
  };
  await ref.set(updated);
  return formatChat(updated);
}

/** List the user's chats (compact), newest-updated first. */
async function listChats({ uid }) {
  const snap = await chatsCol(uid).get();
  const items = snap.docs.map((d) => formatChatListItem({ id: d.id, ...d.data() }));
  items.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  return items;
}

/** Return one full conversation, or null if not owned by uid. */
async function getChat({ uid, chatId }) {
  const snap = await chatsCol(uid).doc(chatId).get();
  if (!snap.exists) return null;
  return formatChat({ id: snap.id, ...snap.data() });
}

module.exports = {
  createChat,
  appendToChat,
  listChats,
  getChat,
  HISTORY_LIMIT,
};
