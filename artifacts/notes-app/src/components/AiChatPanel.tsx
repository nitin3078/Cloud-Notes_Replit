import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, Mic, MicOff, Loader2 } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AiChatPanelProps {
  onClose: () => void;
  /** When set, the assistant only answers from this note instead of the whole library. */
  noteId?: number | null;
}

export default function AiChatPanel({ onClose, noteId }: AiChatPanelProps) {
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

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isSending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
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
          history: nextMessages.slice(0, -1).slice(-10),
          noteId: noteId ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSending(false);
    }
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
          Answering from this note only
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isSending && (
          <div className="text-center text-sm text-muted-foreground italic font-serif py-8">
            Ask me anything about your notes — "What did I write about the Q3 budget?" or "Summarize my trip notes."
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border/50 text-card-foreground shadow-sm'
              }`}
            >
              {m.content}
            </div>
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
