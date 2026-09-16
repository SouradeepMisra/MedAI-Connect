import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getChatHistory, sendChatMessage } from '../api/chat';
import { useAuth } from '../context/AuthContext';
import type { ChatMessage } from '../types';

export function ChatPage() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    getChatHistory(token)
      .then(({ messages: fetched }) => setMessages(fetched))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load chat history'))
      .finally(() => setLoadingHistory(false));
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token || !input.trim() || sending) return;

    const outgoing = input.trim();
    setInput('');
    setError(null);
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: outgoing, timestamp: new Date().toISOString() },
    ]);
    setSending(true);

    try {
      const { reply } = await sendChatMessage(token, outgoing);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-73px)] max-w-3xl flex-col px-6 py-6">
      <h1 className="text-2xl font-semibold text-slate-900">AI Symptom Guidance</h1>

      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
        This assistant provides general guidance only and isn't a substitute for professional
        medical advice. If this is a medical emergency, contact emergency services immediately.
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
        {loadingHistory && <p className="text-sm text-slate-500">Loading conversation...</p>}

        {!loadingHistory && messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Describe what you're experiencing and I'll offer some general guidance.
          </p>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                message.role === 'user'
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-800'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your symptoms..."
          maxLength={1000}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
