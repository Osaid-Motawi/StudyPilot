import { useEffect, useState } from 'react';
import {
  listChats,
  getChat,
  createChat,
  sendChatMessage,
  analyzeUpload,
} from '../services/apiClient.js';

// Shared AI-chat logic for BOTH designs. Owns the conversation list, the active
// conversation, and message sending — including file analysis (attaching a
// PDF/.txt starts a new chat grounded in that file), so "Analysis" is folded in
// here rather than living as a separate page.
const BLANK = { id: null, title: 'New chat', messages: [] };

export function useChatData() {
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(BLANK); // ready to type immediately
  const [listError, setListError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer

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
    setSidebarOpen(false);
    try {
      const chat = await getChat(id);
      setActive({ id: chat.id, title: chat.title, messages: chat.messages || [] });
    } catch (err) {
      setListError(err?.message || 'Could not open that chat.');
    }
  }

  function startNewChat() {
    setActive({ ...BLANK });
    setSidebarOpen(false);
  }

  // Wired into ChatThread; rethrows so the composer preserves the message/file.
  async function handleSend(textValue, fileValue) {
    if (fileValue) {
      const res = await analyzeUpload(fileValue, { question: textValue });
      const chat = await getChat(res.chatId);
      setActive({ id: chat.id, title: chat.title, messages: chat.messages || [] });
      refreshChats();
      return;
    }
    const res = active?.id
      ? await sendChatMessage(active.id, { message: textValue })
      : await createChat({ message: textValue });
    setActive({ id: res.id, title: res.title, messages: res.messages || [] });
    refreshChats();
  }

  return {
    chats,
    active,
    listError,
    sidebarOpen,
    setSidebarOpen,
    openChat,
    startNewChat,
    handleSend,
    refreshChats,
  };
}
