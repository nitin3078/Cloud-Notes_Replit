import React, { useState } from 'react';
import {
  Folder as FolderIcon, ChevronRight, ChevronDown, Plus,
  FileText, Pin, PinOff, Trash2, ArrowRight, GripVertical,
  FolderPlus, RotateCcw, Flame, Sparkles, CalendarClock, Search, X, Tag as TagIcon
} from 'lucide-react';
import {
  Folder, Note,
  useListFolders, useCreateFolder, useUpdateFolder, useDeleteFolder,
  useListNotes, useCreateNote,
  useUpdateNote, useMoveNote, useDeleteNote,
  usePinNote, useUnpinNote, useReorderNotes,
  useRestoreNote, usePurgeNote,
  useListTags,
  getListNotesQueryKey, getListTagsQueryKey,
} from '@workspace/api-client-react';
import { useTabs } from '../lib/TabContext';
import { useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { NOTE_COLORS } from '../lib/noteColors';
import ColorPicker from './ColorPicker';
import ThemeSwitcher from './ThemeSwitcher';

import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent,
  ContextMenuSubTrigger, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';

interface SidebarProps {
  selectedFolderId: number | 'all' | 'trash' | 'pinned';
  onSelectFolder: (id: number | 'all' | 'trash' | 'pinned') => void;
  onOpenNote: (note: Note) => void;
  onCreateNote: (defaultFolderId?: number | null) => void;
  onOpenChat: () => void;
  onOpenPlanner: () => void;
  user: any;
  onLogout: () => void;
}

function ColorDot({ color }: { color?: string | null }) {
  if (!color) return null;
  return <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ backgroundColor: color }} />;
}

export default function Sidebar({ selectedFolderId, onSelectFolder, onOpenNote, onCreateNote, onOpenChat, onOpenPlanner, user, onLogout }: SidebarProps) {
  const queryClient = useQueryClient();
  const { activeTabId, unlockedNoteIds } = useTabs();

  const { data: folders = [] } = useListFolders();
  const { data: notes = [] } = useListNotes({
    folderId: typeof selectedFolderId === 'number' ? selectedFolderId : undefined,
    deleted: selectedFolderId === 'trash' ? true : undefined,
  });
  const { data: allNotes = [] } = useListNotes();

  const [sortBy, setSortBy] = useState<'manual' | 'updatedAt'>('manual');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const { data: tags = [] } = useListTags();

  const selectFolder = (id: number | 'all' | 'trash' | 'pinned') => {
    setSelectedTag(null);
    onSelectFolder(id);
  };
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [colorPickerNoteId, setColorPickerNoteId] = useState<number | null>(null);

  const pinnedNotes = allNotes.filter(n => n.isPinned && !n.isDeleted).sort((a, b) =>
    sortBy === 'manual' ? a.sortOrder - b.sortOrder : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const activeNotes = notes.filter(n => !n.isDeleted).sort((a, b) =>
    sortBy === 'manual' ? a.sortOrder - b.sortOrder : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const trashedNotes = notes.filter(n => n.isDeleted).sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const taggedNotes = selectedTag
    ? allNotes.filter((n) => !n.isDeleted && (n.tags ?? []).includes(selectedTag))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    : [];
  const displayNotes = selectedTag ? taggedNotes :
    selectedFolderId === 'trash' ? trashedNotes :
    selectedFolderId === 'pinned' ? pinnedNotes : activeNotes;

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;
  const searchResults = isSearching
    ? allNotes.filter((n) => {
        if (n.isDeleted) return false;
        const isUnlockedForDisplay = !n.isLocked || unlockedNoteIds.has(n.id);
        const titleMatch = (n.title || '').toLowerCase().includes(trimmedQuery);
        // Locked notes are only searchable by title — never by content —
        // matching the same privacy rule as the sidebar previews.
        const contentMatch = isUnlockedForDisplay && n.content
          ? n.content.replace(/<[^>]+>/g, ' ').toLowerCase().includes(trimmedQuery)
          : false;
        return titleMatch || contentMatch;
      }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    : [];

  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const pinNote = usePinNote();
  const unpinNote = useUnpinNote();
  const moveNote = useMoveNote();
  const reorderNotes = useReorderNotes();
  const restoreNote = useRestoreNote();
  const purgeNote = usePurgeNote();

  const invalidateNotes = () => queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
  const invalidateFolders = () => queryClient.invalidateQueries({ queryKey: ['/api/folders'] });

  const toggleFolder = (id: number) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCreateFolder = (parentFolderId?: number) => {
    const name = prompt(parentFolderId ? 'Subfolder name:' : 'Folder name:');
    if (name?.trim()) {
      createFolder.mutate({ data: { name: name.trim(), parentFolderId: parentFolderId ?? null } }, {
        onSuccess: () => {
          invalidateFolders();
          if (parentFolderId) {
            setExpandedFolders(prev => new Set([...prev, parentFolderId]));
          }
        }
      });
    }
  };

  const startRename = (folder: Folder) => {
    setRenamingFolderId(folder.id);
    setRenameValue(folder.name);
  };

  const submitRename = (folderId: number) => {
    if (renameValue.trim()) {
      updateFolder.mutate({ id: folderId, data: { name: renameValue.trim() } }, {
        onSuccess: invalidateFolders
      });
    }
    setRenamingFolderId(null);
  };

  const handleDeleteFolder = (folderId: number) => {
    if (confirm('Delete this folder? Notes inside will not be deleted.')) {
      deleteFolder.mutate({ id: folderId }, { onSuccess: invalidateFolders });
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { droppableId: destId } = result.destination;

    // Dropped onto a folder (or "All Notes" / library root) in the tree — move it there.
    if (destId.startsWith('folder-')) {
      const noteId = parseInt(result.draggableId, 10);
      const target = destId.replace('folder-', '');
      const targetFolderId = target === 'all' ? null : parseInt(target, 10);
      moveNote.mutate({ id: noteId, data: { folderId: targetFolderId } }, { onSuccess: invalidateNotes });
      return;
    }

    // Otherwise, reordering within the current note list. Skip while viewing "All
    // Notes" — dragging there is only meant for moving notes into a folder, since
    // sortOrder reordering across mixed folders isn't a coherent operation.
    if (selectedFolderId === 'all') return;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;
    const items = Array.from(displayNotes);
    const [reorderedItem] = items.splice(sourceIndex, 1);
    items.splice(destIndex, 0, reorderedItem);
    const newItems = items.map((item, index) => ({ id: item.id, sortOrder: index }));
    reorderNotes.mutate({ data: { items: newItems } }, { onSuccess: invalidateNotes });
  };

  const handleSetColor = (noteId: number, color: string | null) => {
    updateNote.mutate({ id: noteId, data: { color } }, { onSuccess: invalidateNotes });
    setColorPickerNoteId(null);
  };

  const rootFolders = folders.filter(f => !f.parentFolderId);

  return (
    <div className="w-72 h-full bg-sidebar flex flex-col border-r border-border text-sidebar-foreground">
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border/50">
        <h1 className="font-serif text-2xl font-bold text-foreground tracking-tight">Folio</h1>
        <div className="flex items-center gap-1">
          <ThemeSwitcher />
          <div className="relative group cursor-pointer" onClick={onLogout}>
            <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm shadow-sm ring-1 ring-border">
              {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </div>
            <div className="absolute right-0 top-10 w-24 p-2 bg-popover text-popover-foreground shadow-md rounded border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-xs text-center z-50">
              Sign out
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 pt-3 flex flex-col gap-2">
        <button
          onClick={onOpenChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors border border-primary/20"
        >
          <Sparkles size={16} />
          Ask your notes
        </button>
        <button
          onClick={onOpenPlanner}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-sidebar-accent/50 transition-colors border border-transparent"
        >
          <CalendarClock size={16} className="text-muted-foreground" />
          Planner
        </button>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes…"
            className="w-full h-9 rounded-md border border-input bg-background pl-8 pr-8 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {isSearching ? (
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-2">
            {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
          </div>
          {searchResults.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground italic font-serif">No notes match "{searchQuery}".</div>
          ) : (
            <div className="space-y-1">
              {searchResults.map((note) => {
                const locked = note.isLocked && !unlockedNoteIds.has(note.id);
                const preview = locked
                  ? 'This note is password-protected.'
                  : note.content ? note.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 90) || 'No content yet.' : 'No content yet.';
                return (
                  <div
                    key={note.id}
                    onClick={() => { onOpenNote(note); setSearchQuery(''); }}
                    className={`flex flex-col p-3 rounded-md cursor-pointer transition-colors border ${
                      activeTabId === note.id ? 'bg-card border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-sidebar-accent/60 hover:border-border/60'
                    }`}
                    style={note.color ? { borderLeftColor: note.color, borderLeftWidth: '3px' } : {}}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate flex items-center gap-1.5">
                        <ColorDot color={note.color} />
                        {note.title || 'Untitled Note'}
                      </span>
                      {note.isLocked && <span className="text-muted-foreground/60 text-xs shrink-0">🔒</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-1 opacity-70">{preview}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
      <>
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-6 min-h-0">
        {/* Navigation */}
        <div className="px-3 space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">Library</div>
          {[
            { id: 'all' as const, icon: FileText, label: 'All Notes' },
            { id: 'pinned' as const, icon: Pin, label: 'Pinned' },
            { id: 'trash' as const, icon: Trash2, label: 'Trash' },
          ].map(({ id, icon: Icon, label }) => (
            id === 'all' ? (
              <Droppable key={id} droppableId="folder-all" isDropDisabled={false}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    <button
                      onClick={() => selectFolder(id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border ${
                        snapshot.isDraggingOver ? 'bg-primary/10 border-primary/40' :
                        selectedFolderId === id ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium border-transparent' :
                        'hover:bg-sidebar-accent/50 border-transparent'
                      }`}
                    >
                      <Icon size={16} className="text-muted-foreground" />
                      {label}
                    </button>
                    <div className="hidden">{provided.placeholder}</div>
                  </div>
                )}
              </Droppable>
            ) : (
              <button
                key={id}
                onClick={() => selectFolder(id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${selectedFolderId === id ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'hover:bg-sidebar-accent/50'}`}
              >
                <Icon size={16} className="text-muted-foreground" />
                {label}
              </button>
            )
          ))}
        </div>

        {/* Folders */}
        <div className="px-3 space-y-1">
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Folders</div>
            <button onClick={() => handleCreateFolder()} className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted">
              <Plus size={14} />
            </button>
          </div>

          {rootFolders.map(folder => {
            const isExpanded = expandedFolders.has(folder.id);
            const subfolders = folders.filter(f => f.parentFolderId === folder.id);

            return (
              <div key={folder.id}>
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <div className="flex items-center">
                      {subfolders.length > 0 ? (
                        <button onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
                          className="p-1 -mr-1 text-muted-foreground hover:text-foreground z-10">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      ) : <div className="w-5" />}

                      {renamingFolderId === folder.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onBlur={() => submitRename(folder.id)}
                          onKeyDown={e => { if (e.key === 'Enter') submitRename(folder.id); if (e.key === 'Escape') setRenamingFolderId(null); }}
                          className="flex-1 px-2 py-1 text-sm bg-background border border-primary rounded outline-none"
                        />
                      ) : (
                        <Droppable droppableId={`folder-${folder.id}`} isDropDisabled={false}>
                          {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1">
                              <button
                                onClick={() => selectFolder(folder.id)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border ${
                                  snapshot.isDraggingOver ? 'bg-primary/10 border-primary/40' :
                                  selectedFolderId === folder.id ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium border-transparent' :
                                  'hover:bg-sidebar-accent/50 border-transparent'
                                }`}
                              >
                                <FolderIcon size={16} className="text-muted-foreground fill-current opacity-20" />
                                <span className="flex-1 text-left truncate">{folder.name}</span>
                              </button>
                              <div className="hidden">{provided.placeholder}</div>
                            </div>
                          )}
                        </Droppable>
                      )}
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-48">
                    <ContextMenuItem onClick={() => handleCreateFolder(folder.id)}>
                      <FolderPlus size={14} className="mr-2" /> New Subfolder
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => onCreateNote(folder.id)}>
                      <Plus size={14} className="mr-2" /> New Note Here
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => startRename(folder)}>
                      Rename
                    </ContextMenuItem>
                    <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteFolder(folder.id)}>
                      <Trash2 size={14} className="mr-2" /> Delete Folder
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>

                {isExpanded && subfolders.length > 0 && (
                  <div className="ml-6 mt-1 space-y-1 border-l border-border/50 pl-2">
                    {subfolders.map(sub => (
                      <ContextMenu key={sub.id}>
                        <ContextMenuTrigger asChild>
                          <Droppable droppableId={`folder-${sub.id}`} isDropDisabled={false}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.droppableProps}>
                                <button
                                  onClick={() => selectFolder(sub.id)}
                                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border ${
                                    snapshot.isDraggingOver ? 'bg-primary/10 border-primary/40' :
                                    selectedFolderId === sub.id ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium border-transparent' :
                                    'hover:bg-sidebar-accent/50 border-transparent'
                                  }`}
                                >
                                  <FolderIcon size={14} className="text-muted-foreground fill-current opacity-20" />
                                  <span className="flex-1 text-left truncate">{sub.name}</span>
                                </button>
                                <div className="hidden">{provided.placeholder}</div>
                              </div>
                            )}
                          </Droppable>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-48">
                          <ContextMenuItem onClick={() => onCreateNote(sub.id)}>
                            <Plus size={14} className="mr-2" /> New Note Here
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem onClick={() => startRename(sub)}>Rename</ContextMenuItem>
                          <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteFolder(sub.id)}>
                            <Trash2 size={14} className="mr-2" /> Delete
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="px-3 space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">Tags</div>
            <div className="flex flex-wrap gap-1.5 px-2">
              {tags.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === t.name ? null : t.name)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors border ${
                    selectedTag === t.name
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-sidebar-accent/40 text-foreground/80 border-transparent hover:bg-sidebar-accent/70'
                  }`}
                >
                  #{t.name}
                  <span className="opacity-60">{t.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Note List */}
      <div className="h-[38%] shrink-0 border-t border-border/50 flex flex-col bg-background/50">
        <div className="px-4 py-3 flex items-center justify-between border-b border-border/30 bg-sidebar/50">
          <div className="font-semibold text-sm">
            {selectedTag ? `#${selectedTag}` :
              selectedFolderId === 'all' ? 'All Notes' :
              selectedFolderId === 'pinned' ? 'Pinned' :
              selectedFolderId === 'trash' ? 'Trash' :
              folders.find(f => f.id === selectedFolderId)?.name || 'Notes'}
          </div>
          <div className="flex items-center gap-1">
            {selectedFolderId !== 'trash' && selectedFolderId !== 'pinned' && (
              <button
                onClick={() => setSortBy(prev => prev === 'manual' ? 'updatedAt' : 'manual')}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-black/5 transition-colors mr-1"
              >
                {sortBy === 'manual' ? 'Manual' : 'Recent'}
              </button>
            )}
            {selectedFolderId !== 'trash' && (
              <button
                onClick={() => onCreateNote(typeof selectedFolderId === 'number' ? selectedFolderId : null)}
                className="text-primary hover:text-primary-foreground hover:bg-primary p-1 rounded transition-colors"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {displayNotes.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground italic font-serif">
              {selectedFolderId === 'trash' ? 'Trash is empty.' : 'No notes here.'}
            </div>
          ) : (
            <Droppable droppableId="notes-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                    {displayNotes.map((note, index) => {
                      const isDragDisabled = selectedFolderId === 'trash' || sortBy === 'updatedAt';
                      const isUnlockedForDisplay = !note.isLocked || unlockedNoteIds.has(note.id);
                      const previewText = !isUnlockedForDisplay
                        ? 'This note is password-protected.'
                        : note.content
                        ? note.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'No content yet.'
                        : 'No content yet.';
                      return (
                        <Draggable key={note.id} draggableId={note.id.toString()} index={index} isDragDisabled={isDragDisabled}>
                          {(provided, snapshot) => (
                            <ContextMenu>
                              <ContextMenuTrigger asChild>
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...(!isDragDisabled ? provided.dragHandleProps : {})}
                                  onClick={() => onOpenNote(note)}
                                  className={`relative group flex flex-col p-3 rounded-md cursor-pointer transition-colors border ${
                                    activeTabId === note.id
                                      ? 'bg-card border-primary/20 shadow-sm'
                                      : snapshot.isDragging
                                      ? 'bg-card shadow-lg border-primary/50'
                                      : 'bg-transparent border-transparent hover:bg-sidebar-accent/60 hover:border-border/60'
                                  }`}
                                  style={note.color ? { borderLeftColor: note.color, borderLeftWidth: '3px' } : {}}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="font-medium text-sm truncate flex-1 leading-tight text-foreground flex items-center gap-1.5 -ml-1">
                                      {!isDragDisabled && (
                                        <div className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 transition-opacity pointer-events-none">
                                          <GripVertical size={14} />
                                        </div>
                                      )}
                                      <ColorDot color={note.color} />
                                      <span className={!isDragDisabled ? '' : 'ml-1'}>{note.title || 'Untitled Note'}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {note.isLocked && <span className="text-muted-foreground/60 text-xs">🔒</span>}
                                      {note.isPinned && <Pin size={12} className="text-primary opacity-70" />}
                                    </div>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed opacity-70 pl-5">
                                    {!isUnlockedForDisplay
                                      ? '🔒 Locked'
                                      : note.content ? note.content.replace(/<[^>]+>/g, '').substring(0, 80) : 'No content...'}
                                  </div>

                                  {/* Hover preview — plain CSS, no JS pointer listeners, so it can't
                                      interfere with @hello-pangea/dnd's own pointer-based drag sensor
                                      the way a Radix Tooltip (which dismisses on pointerdown) can. */}
                                  {!snapshot.isDragging && (
                                    <div className="hidden group-hover:block absolute left-full top-0 ml-2 z-50 w-64 max-h-64 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md px-3 py-2 pointer-events-none">
                                      <p className="font-semibold font-serif mb-1 text-sm">{note.title || 'Untitled Note'}</p>
                                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{previewText}</p>
                                    </div>
                                  )}
                                </div>
                              </ContextMenuTrigger>

                              <ContextMenuContent className="w-52">
                                {note.isDeleted ? (
                                  <>
                                    <ContextMenuItem onClick={() => restoreNote.mutate({ id: note.id }, { onSuccess: invalidateNotes })}>
                                      <RotateCcw size={14} className="mr-2" /> Restore Note
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => {
                                        if (confirm('Permanently delete this note?')) {
                                          purgeNote.mutate({ id: note.id }, { onSuccess: invalidateNotes });
                                        }
                                      }}
                                    >
                                      <Flame size={14} className="mr-2" /> Delete Forever
                                    </ContextMenuItem>
                                  </>
                                ) : (
                                  <>
                                    <ContextMenuItem onClick={() => {
                                      note.isPinned
                                        ? unpinNote.mutate({ id: note.id }, { onSuccess: invalidateNotes })
                                        : pinNote.mutate({ id: note.id }, { onSuccess: invalidateNotes });
                                    }}>
                                      {note.isPinned ? <><PinOff size={14} className="mr-2" /> Unpin</> : <><Pin size={14} className="mr-2" /> Pin Note</>}
                                    </ContextMenuItem>

                                    {/* Color submenu */}
                                    <ContextMenuSub>
                                      <ContextMenuSubTrigger>
                                        <ColorDot color={note.color} />
                                        <span className="ml-2">Set Color</span>
                                      </ContextMenuSubTrigger>
                                      <ContextMenuSubContent className="p-2 w-auto">
                                        <div className="flex gap-1.5 flex-wrap max-w-[160px]">
                                          {NOTE_COLORS.map(c => (
                                            <button
                                              key={c.value ?? 'none'}
                                              title={c.label}
                                              onClick={() => handleSetColor(note.id, c.value)}
                                              className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${note.color === c.value ? 'border-foreground/60 scale-110' : 'border-transparent'}`}
                                              style={{ backgroundColor: c.dot }}
                                            />
                                          ))}
                                        </div>
                                      </ContextMenuSubContent>
                                    </ContextMenuSub>

                                    <ContextMenuSub>
                                      <ContextMenuSubTrigger>
                                        <ArrowRight size={14} className="mr-2" /> Move to...
                                      </ContextMenuSubTrigger>
                                      <ContextMenuSubContent className="w-48">
                                        <ContextMenuItem onClick={() => moveNote.mutate({ id: note.id, data: { folderId: null } }, { onSuccess: invalidateNotes })}>
                                          All Notes
                                        </ContextMenuItem>
                                        <ContextMenuSeparator />
                                        {folders.map(f => (
                                          <ContextMenuItem key={f.id} onClick={() => moveNote.mutate({ id: note.id, data: { folderId: f.id } }, { onSuccess: invalidateNotes })}>
                                            {f.parentFolderId ? '  └ ' : ''}{f.name}
                                          </ContextMenuItem>
                                        ))}
                                      </ContextMenuSubContent>
                                    </ContextMenuSub>

                                    <ContextMenuSeparator />
                                    <ContextMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => deleteNote.mutate({ id: note.id }, { onSuccess: invalidateNotes })}
                                    >
                                      <Trash2 size={14} className="mr-2" /> Move to Trash
                                    </ContextMenuItem>
                                  </>
                                )}
                              </ContextMenuContent>
                            </ContextMenu>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
          )}
        </div>
      </div>
      </>
      )}
    </DragDropContext>
    </div>
  );
}
