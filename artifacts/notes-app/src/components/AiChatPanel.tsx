import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, Mic, MicOff, Loader2, PenLine, Check } from 'lucide-react';
import { useGetNote, useUpdateNote, getGetNoteQueryKey, getListNotesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  insertedIntoNote?: boolean;
  /** True when this reply means "not found in your notes" — shows the "search generally?" prompt. */
  noAnswerInNotes?: boolean;
  /** The user's question this reply is answering, needed to resend with allowGeneral. */
  answeringQuestion?: string;
  askedGenerally?: boolean;
}

interface AiChatPanelProps {
  onClose: () => void;
  /** When set, the assistant only answers from this note instead of the whole library. */
  noteId?: number | null;
}

export default function AiChatPanel({ onClose, noteId }: AiChatPanelProps) {
  const queryClient = useQueryClient();
  const { data: note } = useGetNote(noteId ?? 0, { query: { enabled: !!noteId, queryKey: getGetNoteQueryKey(noteId ?? 0) } });
  const updateNote = useUpdateNote();
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const send = async (textOverride?: string, allowGeneral = false) => {
    const text = (textOverride ?? input).trim();
    if (!text || isSending) return;

    // When resending the same question with allowGeneral=true, don't add a
    // duplicate user bubble — the original question is already shown.
    const nextMessages: ChatMessage[] = allowGeneral
      ? messages
      : [...messages, { id: crypto.randomUUID(), role: 'user', content: text }];
    setMessages(nextMessages);
    if (!allowGeneral) setInput('');
    setError(null);
    setIsSending(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: text,
          // Send prior turns so the assistant has conversational context.
          history: nextMessages.slice(0, -1).slice(-10).map(({ role, content }) => ({ role, content })),
          noteId: noteId ?? undefined,
          allowGeneral,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply,
        noAnswerInNotes: !!data.noAnswerInNotes,
        answeringQuestion: text,
        askedGenerally: allowGeneral,
      }]);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const insertIntoNote = (message: ChatMessage) => {
    if (!noteId) return;
    setInsertingId(message.id);
    const signature = `<p><br></p><hr><p><em>✨ Added by AI — ${new Date().toLocaleString()}</em></p>`;
    const body = message.content
      .split(/\n{2,}/)
      .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
      .join('');
    const currentContent = note?.content ?? '';
    const newContent = `${currentContent}${signature}${body}`;

    updateNote.mutate({ id: noteId, data: { content: newContent } }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetNoteQueryKey(noteId), (old: any) =>
          old ? { ...old, content: updated.content, updatedAt: updated.updatedAt } : old
        );
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, insertedIntoNote: true } : m)));
        setInsertingId(null);
      },
      onError: () => setInsertingId(null),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. Try Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) transcript += event.results[i][0].transcript + ' ';
      }
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript).trim());
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  return (
    <div className="w-96 h-full bg-sidebar border-l border-border shadow-[-8px_0_24px_rgba(44,26,14,0.05)] flex flex-col animate-in slide-in-from-right duration-300 relative z-50">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-sidebar/50">
        <h3 className="font-semibold flex items-center gap-2 text-foreground">
          <Sparkles size={16} className="text-primary" />
          Ask your notes
        </h3>
        <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <X size={18} />
        </button>
      </div>

      {noteId && (
        <div className="px-4 py-2 text-xs text-muted-foreground bg-accent/40 border-b border-border/50">
          Answering from this note only — ask it to draft something, then use "Insert into note" to add it.
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isSending && (
          <div className="text-center text-sm text-muted-foreground italic font-serif py-8">
            {noteId
              ? 'Ask me to summarize, rewrite, or add something to this note — I can write it in for you.'
              : 'Ask me anything about your notes — "What did I write about the Q3 budget?" or "Summarize my trip notes."'}
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border/50 text-card-foreground shadow-sm'
              }`}
            >
              {m.content}
            </div>
            {m.role === 'assistant' && m.noAnswerInNotes && (
              <button
                type="button"
                onClick={() => send(m.answeringQuestion, true)}
                disabled={isSending}
                className="mt-1.5 text-xs text-primary hover:underline disabled:opacity-50"
              >
                Search generally instead?
              </button>
            )}
            {m.role === 'assistant' && !m.noAnswerInNotes && noteId && (
              m.insertedIntoNote ? (
                <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Check size={12} className="text-primary" /> Added to note
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => insertIntoNote(m)}
                  disabled={insertingId === m.id}
                  className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {insertingId === m.id ? <Loader2 size={12} className="animate-spin" /> : <PenLine size={12} />}
                  {insertingId === m.id ? 'Writing to note…' : 'Insert into note'}
                </button>
              )
            )}
          </div>
        ))}

        {isSending && (
          <div className="flex justify-start">
            <div className="bg-card border border-border/50 rounded-lg px-3 py-2 text-sm text-muted-foreground flex items-center gap-2 shadow-sm">
              <Loader2 size={14} className="animate-spin" />
              Thinking…
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border/50 bg-sidebar/50">
        <div className="flex items-end gap-2 bg-background border border-input rounded-lg p-2 focus-within:ring-1 focus-within:ring-ring">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none max-h-32 py-1"
          />
          <button
            type="button"
            title={isListening ? 'Stop listening' : 'Voice input'}
            onClick={toggleVoiceInput}
            className={`p-1.5 rounded transition-colors shrink-0 ${
              isListening ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <button
            type="button"
            onClick={() => send()}
            disabled={isSending || !input.trim()}
            title="Send"
            className="p-1.5 rounded bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
