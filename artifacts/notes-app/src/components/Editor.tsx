import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useGetNote, useUpdateNote } from '@workspace/api-client-react';
import { 
  Bold, Italic, Underline, List, ListOrdered, 
  CheckSquare, Code, History, Heading1, Heading2, Heading3
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetNoteQueryKey } from '@workspace/api-client-react';

interface EditorProps {
  noteId: number;
  onOpenHistory: () => void;
}

const modules = {
  toolbar: false,
};

export default function Editor({ noteId, onOpenHistory }: EditorProps) {
  const queryClient = useQueryClient();
  const { data: note, isLoading } = useGetNote(noteId, {
    query: { enabled: !!noteId, queryKey: getGetNoteQueryKey(noteId) },
  });

  const updateNote = useUpdateNote();
  const updateNoteRef = useRef(updateNote.mutate);
  updateNoteRef.current = updateNote.mutate;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const initializedForId = useRef<number | null>(null);
  const lastSaved = useRef({ title: '', content: '' });
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const quillRef = useRef<ReactQuill>(null);
  const [activeFormats, setActiveFormats] = useState<Record<string, any>>({});

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
          // Patch cache directly instead of invalidating to prevent refetch loops
          queryClient.setQueryData(getGetNoteQueryKey(noteId), (old: any) => 
            old ? { ...old, title: data.title, content: data.content, updatedAt: data.updatedAt } : old
          );
        },
        onError: () => {
          setIsSaving(false);
        }
      }
    );
  }, [noteId, queryClient]);

  // Debounced save
  useEffect(() => {
    if (initializedForId.current !== noteId) return;
    
    if (title !== lastSaved.current.title || content !== lastSaved.current.content) {
      setHasUnsavedChanges(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      
      saveTimeoutRef.current = setTimeout(() => {
        saveContent(title, content);
      }, 2000);
    }
    
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [title, content, noteId, saveContent]);

  // Update active formats when selection changes
  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const handler = () => {
      setActiveFormats(editor.getFormat());
    };

    editor.on('editor-change', handler);
    return () => {
      editor.off('editor-change', handler);
    };
  }, []);

  const toggleFormat = (format: string, value: any = true) => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const currentFormat = editor.getFormat()[format];
      // Special handling for lists vs headings since they're mutually exclusive
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

  if (isLoading || initializedForId.current !== noteId) {
    return (
      <div className="flex-1 flex flex-col h-full bg-card rounded-tl-lg border-l border-t border-border animate-in fade-in duration-500">
        <div className="h-14 border-b border-border flex items-center px-4">
          <div className="w-64 h-6 bg-muted rounded animate-pulse" />
        </div>
        <div className="p-12">
          <div className="w-1/2 h-12 bg-muted rounded animate-pulse mb-8" />
          <div className="space-y-4">
            <div className="w-full h-4 bg-muted rounded animate-pulse" />
            <div className="w-5/6 h-4 bg-muted rounded animate-pulse" />
            <div className="w-4/6 h-4 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const ToolbarButton = ({ 
    icon: Icon, 
    active = false, 
    onClick 
  }: { 
    icon: React.ElementType, 
    active?: boolean, 
    onClick: () => void 
  }) => (
    <button
      data-testid={`btn-format-${Icon.name}`}
      onClick={onClick}
      className={`p-1.5 rounded hover-elevate transition-colors ${
        active ? 'text-primary bg-primary/10' : 'text-foreground/70 hover:text-foreground hover:bg-muted'
      }`}
    >
      <Icon size={18} />
    </button>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-card rounded-tl-xl border-l border-t shadow-[-4px_0_12px_rgba(44,26,14,0.02)] border-border relative z-10 overflow-hidden">
      {/* Custom Toolbar */}
      <div className="h-14 flex-shrink-0 border-b border-border flex items-center justify-between px-4 bg-card/80 backdrop-blur-sm z-20 sticky top-0">
        <div className="flex items-center gap-1">
          <ToolbarButton icon={Heading1} active={activeFormats.header === 1} onClick={() => setHeading(1)} />
          <ToolbarButton icon={Heading2} active={activeFormats.header === 2} onClick={() => setHeading(2)} />
          <ToolbarButton icon={Heading3} active={activeFormats.header === 3} onClick={() => setHeading(3)} />
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <ToolbarButton icon={Bold} active={activeFormats.bold} onClick={() => toggleFormat('bold')} />
          <ToolbarButton icon={Italic} active={activeFormats.italic} onClick={() => toggleFormat('italic')} />
          <ToolbarButton icon={Underline} active={activeFormats.underline} onClick={() => toggleFormat('underline')} />
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <ToolbarButton icon={List} active={activeFormats.list === 'bullet'} onClick={() => toggleFormat('list', 'bullet')} />
          <ToolbarButton icon={ListOrdered} active={activeFormats.list === 'ordered'} onClick={() => toggleFormat('list', 'ordered')} />
          <ToolbarButton icon={CheckSquare} active={activeFormats.list === 'check'} onClick={() => toggleFormat('list', 'check')} />
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <ToolbarButton icon={Code} active={activeFormats.code || activeFormats['code-block']} onClick={() => toggleFormat('code')} />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <div className={`w-2 h-2 rounded-full transition-colors ${
              isSaving ? 'bg-amber-500 animate-pulse' : 
              hasUnsavedChanges ? 'bg-amber-400' : 'bg-green-500/50'
            }`} />
            {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Unsaved' : 'Saved'}
          </div>
          
          <div className="w-px h-6 bg-border" />
          
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted rounded transition-colors"
          >
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
            className="w-full text-4xl font-serif font-semibold bg-transparent border-none outline-none focus:ring-0 text-foreground mb-8 placeholder:text-muted-foreground/50"
          />
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
    </div>
  );
}
