import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useGetNote, useUpdateNote, useSetNotePassword, useRemoveNotePassword, useVerifyNotePassword, getListNotesQueryKey } from '@workspace/api-client-react';
import {
  Bold, Italic, Underline, List, ListOrdered,
  CheckSquare, Code, History, Heading1, Heading2, Heading3,
  Mic, MicOff, CalendarDays, Lock, LockOpen, Palette
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetNoteQueryKey } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import ColorPicker from './ColorPicker';
import LockNoteModal from './LockNoteModal';
import { useTabs } from '../lib/TabContext';

interface EditorProps {
  noteId: number;
  onOpenHistory: () => void;
}

const modules = { toolbar: false };

export default function Editor({ noteId, onOpenHistory }: EditorProps) {
  const queryClient = useQueryClient();
  const { unlockedNoteIds, unlockNote } = useTabs();

  const { data: note, isLoading } = useGetNote(noteId, {
    query: { enabled: !!noteId, queryKey: getGetNoteQueryKey(noteId) },
  });

  const updateNote = useUpdateNote();
  const setNotePassword = useSetNotePassword();
  const removeNotePassword = useRemoveNotePassword();
  const verifyNotePassword = useVerifyNotePassword();
  const updateNoteRef = useRef(updateNote.mutate);
  updateNoteRef.current = updateNote.mutate;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lockModal, setLockModal] = useState<'set' | 'verify' | 'remove' | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const initializedForId = useRef<number | null>(null);
  const lastSaved = useRef({ title: '', content: '' });
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const quillRef = useRef<ReactQuill>(null);
  const [activeFormats, setActiveFormats] = useState<Record<string, any>>({});
  const recognitionRef = useRef<any>(null);

  const isNoteUnlocked = !note?.isLocked || unlockedNoteIds.has(noteId);

  useEffect(() => {
    if (note && initializedForId.current !== note.id) {
      initializedForId.current = note.id;
      setTitle(note.title || '');
      setContent(note.content || '');
      lastSaved.current = { title: note.title || '', content: note.content || '' };
      setHasUnsavedChanges(false);
      setIsSaving(false);
    }
  }, [note, noteId]);

  // Enable spellcheck on Quill's contenteditable
  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (editor?.root) { editor.root.spellcheck = true; }
  }, [isLoading]);

  const saveContent = useCallback((newTitle: string, newContent: string) => {
    if (newTitle === lastSaved.current.title && newContent === lastSaved.current.content) return;
    setIsSaving(true);
    updateNoteRef.current(
      { id: noteId, data: { title: newTitle || 'Untitled', content: newContent } },
      {
        onSuccess: (data) => {
          lastSaved.current = { title: data.title, content: data.content };
          setHasUnsavedChanges(false);
          setIsSaving(false);
          queryClient.setQueryData(getGetNoteQueryKey(noteId), (old: any) =>
            old ? { ...old, title: data.title, content: data.content, updatedAt: data.updatedAt } : old
          );
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        },
        onError: () => setIsSaving(false),
      }
    );
  }, [noteId, queryClient]);

  useEffect(() => {
    if (initializedForId.current !== noteId) return;
    if (title !== lastSaved.current.title || content !== lastSaved.current.content) {
      setHasUnsavedChanges(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveContent(title, content), 2000);
    }
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [title, content, noteId, saveContent]);

  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const handler = () => setActiveFormats(editor.getFormat());
    editor.on('editor-change', handler);
    return () => { editor.off('editor-change', handler); };
  }, []);

  const toggleFormat = (format: string, value: any = true) => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const currentFormat = editor.getFormat()[format];
      editor.format(format, currentFormat === value ? false : value);
      setActiveFormats(editor.getFormat());
    }
  };

  const setHeading = (level: number) => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const current = editor.getFormat().header;
      editor.format('header', current === level ? false : level);
      setActiveFormats(editor.getFormat());
    }
  };

  const insertDateAtCursor = (date: Date | undefined) => {
    if (!date) return;
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const range = editor.getSelection() || { index: Math.max(0, editor.getLength() - 1), length: 0 };
      const dateStr = format(date, 'MMMM d, yyyy');
      editor.insertText(range.index, dateStr, 'user');
      editor.setSelection(range.index + dateStr.length, 0);
    }
    setCalendarOpen(false);
  };

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Try Chrome.');
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
        const editor = quillRef.current?.getEditor();
        if (editor) {
          const range = editor.getSelection() || { index: Math.max(0, editor.getLength() - 1), length: 0 };
          editor.insertText(range.index, transcript, 'user');
          editor.setSelection(range.index + transcript.length, 0);
        }
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleSetPassword = async (password: string) => {
    await new Promise<void>((resolve, reject) => {
      setNotePassword.mutate({ id: noteId, data: { password } }, {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetNoteQueryKey(noteId), (old: any) => old ? { ...old, isLocked: updated.isLocked } : old);
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          resolve();
        },
        onError: reject,
      });
    });
  };

  const handleVerifyPassword = async (password: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      verifyNotePassword.mutate({ id: noteId, data: { password } }, {
        onSuccess: (result) => resolve(result.valid),
        onError: reject,
      });
    });
  };

  const handleRemovePassword = async (_password: string) => {
    await new Promise<void>((resolve, reject) => {
      removeNotePassword.mutate({ id: noteId }, {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetNoteQueryKey(noteId), (old: any) => old ? { ...old, isLocked: updated.isLocked } : old);
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          resolve();
        },
        onError: reject,
      });
    });
  };

  const handleColorChange = (color: string | null) => {
    updateNote.mutate({ id: noteId, data: { color } }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetNoteQueryKey(noteId), (old: any) => old ? { ...old, color: updated.color } : old);
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      }
    });
    setColorPickerOpen(false);
  };

  if (isLoading || initializedForId.current !== noteId) {
    return (
      <div className="flex-1 flex flex-col h-full bg-card rounded-tl-lg border-l border-t border-border animate-in fade-in duration-500">
        <div className="h-14 border-b border-border flex items-center px-4">
          <div className="w-64 h-6 bg-muted rounded animate-pulse" />
        </div>
        <div className="p-12">
          <div className="w-1/2 h-12 bg-muted rounded animate-pulse mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className={`h-4 bg-muted rounded animate-pulse`} style={{ width: `${90 - i * 10}%` }} />)}
          </div>
        </div>
      </div>
    );
  }

  // Locked note screen
  if (note?.isLocked && !isNoteUnlocked) {
    return (
      <div className="flex-1 flex flex-col h-full bg-card rounded-tl-xl border-l border-t border-border overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border border-border">
            <Lock className="w-9 h-9 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-semibold mb-2">{note.title}</h2>
            <p className="text-muted-foreground text-sm font-serif italic">This note is password-protected.</p>
          </div>
          <button
            onClick={() => setLockModal('verify')}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Unlock Note
          </button>
        </div>

        <LockNoteModal
          open={lockModal === 'verify'}
          onOpenChange={(open) => !open && setLockModal(null)}
          mode="verify"
          noteTitle={note.title}
          isLocked={note.isLocked}
          onSetPassword={handleSetPassword}
          onVerifyPassword={handleVerifyPassword}
          onRemovePassword={handleRemovePassword}
          onVerified={() => unlockNote(noteId)}
        />
      </div>
    );
  }

  const ToolbarButton = ({ icon: Icon, active = false, onClick, title }: {
    icon: React.ElementType; active?: boolean; onClick: () => void; title?: string;
  }) => (
    <button title={title} onClick={onClick}
      className={`p-1.5 rounded hover-elevate transition-colors ${active ? 'text-primary bg-primary/10' : 'text-foreground/70 hover:text-foreground hover:bg-muted'}`}>
      <Icon size={18} />
    </button>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-card rounded-tl-xl border-l border-t shadow-[-4px_0_12px_rgba(44,26,14,0.02)] border-border relative z-10 overflow-hidden">
      {/* Toolbar */}
      <div className="h-14 flex-shrink-0 border-b border-border flex items-center justify-between px-4 bg-card/80 backdrop-blur-sm z-20 sticky top-0">
        <div className="flex items-center gap-1 flex-wrap">
          <ToolbarButton icon={Heading1} active={activeFormats.header === 1} onClick={() => setHeading(1)} title="Heading 1" />
          <ToolbarButton icon={Heading2} active={activeFormats.header === 2} onClick={() => setHeading(2)} title="Heading 2" />
          <ToolbarButton icon={Heading3} active={activeFormats.header === 3} onClick={() => setHeading(3)} title="Heading 3" />
          <div className="w-px h-6 bg-border mx-1" />
          <ToolbarButton icon={Bold} active={activeFormats.bold} onClick={() => toggleFormat('bold')} title="Bold" />
          <ToolbarButton icon={Italic} active={activeFormats.italic} onClick={() => toggleFormat('italic')} title="Italic" />
          <ToolbarButton icon={Underline} active={activeFormats.underline} onClick={() => toggleFormat('underline')} title="Underline" />
          <div className="w-px h-6 bg-border mx-1" />
          <ToolbarButton icon={List} active={activeFormats.list === 'bullet'} onClick={() => toggleFormat('list', 'bullet')} title="Bullet list" />
          <ToolbarButton icon={ListOrdered} active={activeFormats.list === 'ordered'} onClick={() => toggleFormat('list', 'ordered')} title="Numbered list" />
          <ToolbarButton icon={CheckSquare} active={activeFormats.list === 'check'} onClick={() => toggleFormat('list', 'check')} title="Checklist" />
          <div className="w-px h-6 bg-border mx-1" />
          <ToolbarButton icon={Code} active={activeFormats.code || activeFormats['code-block']} onClick={() => toggleFormat('code')} title="Code" />

          {/* Calendar date insert */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button title="Insert date" className="p-1.5 rounded transition-colors text-foreground/70 hover:text-foreground hover:bg-muted">
                <CalendarDays size={18} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" onSelect={insertDateAtCursor} initialFocus />
            </PopoverContent>
          </Popover>

          {/* Voice input */}
          <button
            title={isListening ? 'Stop listening' : 'Voice input'}
            onClick={isListening ? stopVoice : startVoice}
            className={`p-1.5 rounded transition-colors ${isListening ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-foreground/70 hover:text-foreground hover:bg-muted'}`}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Save status */}
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <div className={`w-2 h-2 rounded-full transition-colors ${isSaving ? 'bg-amber-500 animate-pulse' : hasUnsavedChanges ? 'bg-amber-400' : 'bg-green-500/50'}`} />
            {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Unsaved' : 'Saved'}
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Color */}
          <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
            <PopoverTrigger asChild>
              <button title="Note color" className="p-1.5 rounded transition-colors text-foreground/70 hover:text-foreground hover:bg-muted flex items-center gap-1">
                <Palette size={16} />
                {note?.color && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: note.color }} />}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="end">
              <p className="text-xs font-medium text-muted-foreground mb-2">Note color</p>
              <ColorPicker value={note?.color} onChange={handleColorChange} />
            </PopoverContent>
          </Popover>

          {/* Lock */}
          <button
            title={note?.isLocked ? 'Remove password' : 'Lock with password'}
            onClick={() => setLockModal(note?.isLocked ? 'remove' : 'set')}
            className="p-1.5 rounded transition-colors text-foreground/70 hover:text-foreground hover:bg-muted"
          >
            {note?.isLocked ? <Lock size={16} className="text-primary" /> : <LockOpen size={16} />}
          </button>

          <div className="w-px h-6 bg-border" />

          {/* History */}
          <button onClick={onOpenHistory}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted rounded transition-colors">
            <History size={16} />
            History
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full relative">
        <div className="max-w-[800px] mx-auto px-12 py-16">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note Title"
            className="w-full text-4xl font-serif font-semibold bg-transparent border-none outline-none focus:ring-0 text-foreground mb-2 placeholder:text-muted-foreground/50"
          />
          {/* Last modified */}
          {note?.updatedAt && (
            <p className="text-xs text-muted-foreground/60 mb-8 font-sans">
              Last edited {format(new Date(note.updatedAt), "MMM d, yyyy 'at' h:mm a")}
              {note.color && (
                <span className="inline-flex items-center gap-1 ml-3">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: note.color }} />
                  <span>Color label</span>
                </span>
              )}
            </p>
          )}
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={content}
            onChange={setContent}
            modules={modules}
            placeholder="Start writing..."
            className="folio-editor"
          />
        </div>
      </div>

      {/* Lock Modal */}
      <LockNoteModal
        open={lockModal !== null && lockModal !== 'verify'}
        onOpenChange={(open) => !open && setLockModal(null)}
        mode={lockModal === 'remove' ? 'remove' : 'set'}
        noteTitle={note?.title}
        isLocked={note?.isLocked}
        onSetPassword={handleSetPassword}
        onVerifyPassword={handleVerifyPassword}
        onRemovePassword={handleRemovePassword}
      />
    </div>
  );
}
