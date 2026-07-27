import React, { useState, useRef, useEffect } from 'react';
import { Plus, FolderPlus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ColorPicker from './ColorPicker';
import { Folder, useCreateNote, useCreateFolder, getListNotesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

interface CreateNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  defaultFolderId?: number | null;
  onCreated: (noteId: number) => void;
}

export default function CreateNoteModal({ open, onOpenChange, folders, defaultFolderId, onCreated }: CreateNoteModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState<number | null>(defaultFolderId ?? null);
  const [color, setColor] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const createNote = useCreateNote();
  const createFolder = useCreateFolder();

  useEffect(() => {
    if (open) {
      setTitle('');
      setFolderId(defaultFolderId ?? null);
      setColor(null);
      setNewFolderName('');
      setShowNewFolder(false);
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open, defaultFolderId]);

  const handleCreate = async () => {
    let targetFolderId = folderId;

    if (showNewFolder && newFolderName.trim()) {
      const newFolder = await new Promise<Folder>((resolve, reject) => {
        createFolder.mutate({ data: { name: newFolderName.trim() } }, {
          onSuccess: (f) => resolve(f),
          onError: reject,
        });
      });
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      targetFolderId = newFolder.id;
    }

    createNote.mutate({
      data: {
        title: title.trim() || 'Untitled Note',
        content: '',
        folderId: targetFolderId,
        color: color,
      }
    }, {
      onSuccess: (note) => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        onCreated(note.id);
        onOpenChange(false);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">New Note</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Note title..."
              className="font-serif"
            />
          </div>

          {/* Folder */}
          <div className="space-y-1.5">
            <Label>Folder</Label>
            {!showNewFolder ? (
              <div className="flex gap-2">
                <select
                  value={folderId ?? ''}
                  onChange={(e) => setFolderId(e.target.value ? parseInt(e.target.value) : null)}
                  className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">No folder</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.parentFolderId ? '  └ ' : ''}{f.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewFolder(true)}
                  className="shrink-0"
                >
                  <FolderPlus size={14} className="mr-1" />
                  New
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewFolder(false)}
                  className="shrink-0"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label>Color</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={createNote.isPending || createFolder.isPending}>
            <Plus size={16} className="mr-1.5" />
            Create Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
