import { apiRequest } from './client';
import type { ChatMessage } from '../types';

export function getChatHistory(token: string) {
  return apiRequest<{ messages: ChatMessage[] }>('/api/chat/history', { token });
}

export function sendChatMessage(token: string, message: string) {
  return apiRequest<{ reply: string }>('/api/chat/message', {
    method: 'POST',
    token,
    body: { message },
  });
}
