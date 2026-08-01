import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Folder as FolderIcon, ChevronRight, ChevronDown, Plus,
  Pin, PinOff, Trash2, ArrowRight, GripVertical,
  FolderPlus, RotateCcw, Flame, Sparkles, CalendarClock, Search, X, Lock,
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
import { htmlToPlainText } from '../lib/htmlToPlainText';
import ThemeSwitcher from './ThemeSwitcher';

import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent,
  ContextMenuSubTrigger, ContextMenuTrigger,
} from '@/components/ui/context-menu';

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

  const { data: folders = [], isLoading: foldersLoading } = useListFolders();
  const { data: allNotes = [] } = useListNotes();
  const { data: tags = [] } = useListTags();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [trashExpanded, setTrashExpanded] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // Hover preview is rendered via a portal at fixed screen coordinates
  // (captured on mouseenter) rather than a CSS-only absolute box, since the
  // sidebar is narrow and a same-context absolute box gets clipped by its
  // own scroll container — invisible even though hover itself still works.
  const [hoverPreview, setHoverPreview] = useState<{ noteId: number; top: number; left: number } | null>(null);

  const activeAllNotes = allNotes.filter((n) => !n.isDeleted).sort((a, b) => a.sortOrder - b.sortOrder);
  const trashedNotes = allNotes.filter((n) => n.isDeleted).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const pinnedNotes = activeAllNotes.filter((n) => n.isPinned);

  // Group active notes by folder (null = unfiled, sits at the tree root)
  // for the unified folder+notes tree.
  const notesByFolder = new Map<number | null, Note[]>();
  for (const n of activeAllNotes) {
    const key = n.folderId ?? null;
    if (!notesByFolder.has(key)) notesByFolder.set(key, []);
    notesByFolder.get(key)!.push(n);
  }

  const taggedNotes = selectedTag
    ? activeAllNotes.filter((n) => (n.tags ?? []).includes(selectedTag))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    : [];

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
          ? htmlToPlainText(n.content).toLowerCase().includes(trimmedQuery)
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
    setExpandedFolders((prev) => {
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
          if (parentFolderId) setExpandedFolders((prev) => new Set([...prev, parentFolderId]));
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
      updateFolder.mutate({ id: folderId, data: { name: renameValue.trim() } }, { onSuccess: invalidateFolders });
    }
    setRenamingFolderId(null);
  };

  const handleDeleteFolder = (folderId: number) => {
    if (confirm('Delete this folder? Notes inside will not be deleted.')) {
      deleteFolder.mutate({ id: folderId }, { onSuccess: invalidateFolders });
    }
  };

  const handleSetColor = (noteId: number, color: string | null) => {
    updateNote.mutate({ id: noteId, data: { color } }, { onSuccess: invalidateNotes });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { droppableId: destId } = result.destination;

    // Dropped onto a folder (or "All Notes" root) header — move it there.
    if (destId.startsWith('folder-')) {
      const noteId = parseInt(result.draggableId, 10);
      const target = destId.replace('folder-', '');
      const targetFolderId = target === 'all' ? null : parseInt(target, 10);
      moveNote.mutate({ id: noteId, data: { folderId: targetFolderId } }, { onSuccess: invalidateNotes });
      return;
    }

    // Otherwise, reordering within one folder's own note group (or the
    // unfiled/root group) — scoped per group, not a single global list.
    if (destId.startsWith('notes-in-')) {
      const groupKey = destId.replace('notes-in-', '');
      const folderId = groupKey === 'root' ? null : parseInt(groupKey, 10);
      const group = notesByFolder.get(folderId) ?? [];
      const sourceIndex = result.source.index;
      const destIndex = result.destination.index;
      if (sourceIndex === destIndex) return;
      const items = Array.from(group);
      const [moved] = items.splice(sourceIndex, 1);
      items.splice(destIndex, 0, moved);
      const newItems = items.map((item, index) => ({ id: item.id, sortOrder: index }));
      reorderNotes.mutate({ data: { items: newItems } }, { onSuccess: invalidateNotes });
    }
  };

  const rootFolders = folders.filter((f) => !f.parentFolderId);

  // A single note row — used for root-level notes, folder-nested notes, and
  // trash rows alike, so drag/context-menu/hover-preview behavior stays
  // identical everywhere a note appears.
  function renderNoteRow(note: Note, index: number, depth: number, isDragDisabled: boolean) {
    const isUnlockedForDisplay = !note.isLocked || unlockedNoteIds.has(note.id);
    const previewText = !isUnlockedForDisplay
      ? 'This note is password-protected.'
      : note.content ? htmlToPlainText(note.content) || 'No content yet.' : 'No content yet.';
    const previewLine = !isUnlockedForDisplay
      ? '🔒 Locked'
      : note.content ? htmlToPlainText(note.content).substring(0, 60) : '';

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
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoverPreview({ noteId: note.id, top: rect.top, left: rect.right + 8 });
                }}
                onMouseLeave={() => setHoverPreview((cur) => (cur?.noteId === note.id ? null : cur))}
                style={{ paddingLeft: `${depth * 18 + 8}px`, ...(note.color ? { borderLeftColor: note.color, borderLeftWidth: '3px' } : {}) }}
                className={`relative group flex flex-col pr-2 py-1.5 rounded-md cursor-pointer transition-colors border ${
                  activeTabId === note.id
                    ? 'bg-primary/10 border-l-2 border-primary'
                    : snapshot.isDragging
                    ? 'bg-card shadow-lg border-primary/50'
                    : 'bg-transparent border-transparent hover:bg-sidebar-accent/60'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {!isDragDisabled && (
                    <GripVertical size={12} className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 shrink-0 transition-opacity" />
                  )}
                  <ColorDot color={note.color} />
                  <span className={`text-sm truncate flex-1 ${activeTabId === note.id ? 'font-semibold text-foreground' : 'text-foreground/90'}`}>
                    {note.title || 'Untitled Note'}
                  </span>
                  {note.isLocked && <Lock size={11} className="text-muted-foreground/60 shrink-0" />}
                  {note.isPinned && <Pin size={11} className="text-primary opacity-70 shrink-0" />}
                </div>
                {previewLine && (
                  <div className="text-xs text-muted-foreground truncate opacity-70 mt-0.5" style={{ paddingLeft: !isDragDisabled ? '18px' : '0' }}>
                    {previewLine}
                  </div>
                )}
              </div>
            </ContextMenuTrigger>

            {!snapshot.isDragging && hoverPreview?.noteId === note.id && createPortal(
              <div
                className="fixed z-50 w-64 max-h-64 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md px-3 py-2 pointer-events-none"
                style={{ top: hoverPreview.top, left: hoverPreview.left }}
              >
                <p className="font-semibold font-serif mb-1 text-sm">{note.title || 'Untitled Note'}</p>
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{previewText}</p>
              </div>,
              document.body
            )}

            <ContextMenuContent className="w-52">
              {note.isDeleted ? (
                <>
                  <ContextMenuItem onClick={() => restoreNote.mutate({ id: note.id }, { onSuccess: invalidateNotes })}>
                    <RotateCcw size={14} className="mr-2" /> Restore Note
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => { if (confirm('Permanently delete this note?')) purgeNote.mutate({ id: note.id }, { onSuccess: invalidateNotes }); }}
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

                  <ContextMenuSub>
                    <ContextMenuSubTrigger>
                      <ColorDot color={note.color} />
                      <span className="ml-2">Set Color</span>
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="p-2 w-auto">
                      <div className="flex gap-1.5 flex-wrap max-w-[160px]">
                        {NOTE_COLORS.map((c) => (
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
                      {folders.map((f) => (
                        <ContextMenuItem key={f.id} onClick={() => moveNote.mutate({ id: note.id, data: { folderId: f.id } }, { onSuccess: invalidateNotes })}>
                          {f.parentFolderId ? '  └ ' : ''}{f.name}
                        </ContextMenuItem>
                      ))}
                    </ContextMenuSubContent>
                  </ContextMenuSub>

                  <ContextMenuSeparator />
                  <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteNote.mutate({ id: note.id }, { onSuccess: invalidateNotes })}>
                    <Trash2 size={14} className="mr-2" /> Move to Trash
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuContent>
          </ContextMenu>
        )}
      </Draggable>
    );
  }

  // A folder node — renders its own row, then (if expanded) its subfolders
  // recursively followed by its own direct notes, all indented by depth.
  function renderFolderNode(folder: Folder, depth: number): React.ReactNode {
    const isExpanded = expandedFolders.has(folder.id);
    const subfolders = folders.filter((f) => f.parentFolderId === folder.id);
    const folderNotes = notesByFolder.get(folder.id) ?? [];
    const hasChildren = subfolders.length > 0 || folderNotes.length > 0;

    return (
      <div key={folder.id}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="flex items-center" style={{ paddingLeft: `${depth * 18}px` }}>
              <button
                onClick={() => hasChildren && toggleFolder(folder.id)}
                className="p-1 -mr-0.5 text-muted-foreground hover:text-foreground shrink-0"
              >
                {hasChildren ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="block w-3.5" />}
              </button>

              {renamingFolderId === folder.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => submitRename(folder.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitRename(folder.id); if (e.key === 'Escape') setRenamingFolderId(null); }}
                  className="flex-1 px-2 py-1 text-sm bg-background border border-primary rounded outline-none"
                />
              ) : (
                <Droppable droppableId={`folder-${folder.id}`} isDropDisabled={false}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1">
                      <button
                        onClick={() => toggleFolder(folder.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                          snapshot.isDraggingOver ? 'bg-primary/10 border-primary/40' : 'hover:bg-sidebar-accent/50 border-transparent'
                        }`}
                      >
                        <FolderIcon size={14} className="text-muted-foreground fill-current opacity-20 shrink-0" />
                        <span className="flex-1 text-left truncate">{folder.name}</span>
                        {folderNotes.length > 0 && <span className="text-xs text-muted-foreground shrink-0">{folderNotes.length}</span>}
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
            <ContextMenuItem onClick={() => startRename(folder)}>Rename</ContextMenuItem>
            <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteFolder(folder.id)}>
              <Trash2 size={14} className="mr-2" /> Delete Folder
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {isExpanded && (
          <>
            {subfolders.map((sub) => renderFolderNode(sub, depth + 1))}
            {folderNotes.length > 0 && (
              <Droppable droppableId={`notes-in-${folder.id}`}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    {folderNotes.map((note, i) => renderNoteRow(note, i, depth + 1, false))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}
          </>
        )}
      </div>
    );
  }

  const rootNotes = notesByFolder.get(null) ?? [];

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
            <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
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
      </div>

      {isSearching ? (
        <div className="flex-1 overflow-y-auto overscroll-contain p-2 min-h-0">
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
                  : note.content ? htmlToPlainText(note.content).substring(0, 90) || 'No content yet.' : 'No content yet.';
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
      <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 flex flex-col">
      <div className="py-4 flex flex-col gap-5">
        {/* Pinned — capped at ~3 visible rows, scrolls beyond that */}
        {pinnedNotes.length > 0 && (
          <div className="px-3 space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1.5">
              Pinned · {pinnedNotes.length}
            </div>
            <div className={`space-y-0.5 ${pinnedNotes.length > 3 ? 'max-h-[102px] overflow-y-auto' : ''}`}>
              {pinnedNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => onOpenNote(note)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors truncate ${
                    activeTabId === note.id ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'hover:bg-sidebar-accent/50'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                  <span className="truncate">{note.title || 'Untitled Note'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="px-3 space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">Tags</div>
            <div className={`flex flex-wrap gap-1.5 px-2 ${tags.length > 10 ? 'max-h-24 overflow-y-auto' : ''}`}>
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

        {/* Tag-filtered results, if a tag is selected */}
        {selectedTag && (
          <div className="px-3 space-y-1">
            <div className="flex items-center justify-between px-1 mb-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">#{selectedTag} · {taggedNotes.length}</div>
              <button onClick={() => setSelectedTag(null)} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
                <X size={12} />
              </button>
            </div>
            {taggedNotes.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground italic">No notes with this tag.</p>
            ) : (
              taggedNotes.map((note, i) => renderNoteRow(note, i, 0, true))
            )}
          </div>
        )}

        {/* All Notes + Folders — one unified tree: folders and their notes
            nested together, always visible (no separate collapsed view). */}
        {!selectedTag && (
          <div className="px-3 space-y-1">
            <div className="flex items-center justify-between px-1 mb-1">
              <Droppable droppableId="folder-all" isDropDisabled={false}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1">
                    <div className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${
                      snapshot.isDraggingOver ? 'bg-primary/10' : ''
                    }`}>
                      <span className="text-muted-foreground">All Notes · {activeAllNotes.length}</span>
                    </div>
                    <div className="hidden">{provided.placeholder}</div>
                  </div>
                )}
              </Droppable>
              <button onClick={() => handleCreateFolder()} title="New folder" className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted">
                <Plus size={14} />
              </button>
            </div>

            {foldersLoading && (
              <div className="space-y-1.5 px-1 py-1 pl-4 animate-pulse">
                <div className="h-6 rounded bg-sidebar-accent/40 w-5/6" />
                <div className="h-6 rounded bg-sidebar-accent/40 w-2/3" />
              </div>
            )}

            <div className="space-y-0.5">
              {rootFolders.map((folder) => renderFolderNode(folder, 0))}

              {rootNotes.length > 0 && (
                <Droppable droppableId="notes-in-root">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {rootNotes.map((note, i) => renderNoteRow(note, i, 0, false))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              )}

              {activeAllNotes.length === 0 && !foldersLoading && (
                <p className="px-2 py-2 text-xs text-muted-foreground italic">No notes yet — click + above to add a folder, or create a note.</p>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
      )}

      {/* Trash — a fixed footer, always visible, never part of the main
          scroll. Click to expand a small scrollable list of trashed notes
          right above it, without taking space from the tree above. */}
      <div className="shrink-0 border-t border-border/40 bg-sidebar">
        {trashExpanded && (
          <div className="max-h-40 overflow-y-auto overscroll-contain px-2 pt-2 space-y-0.5">
            {trashedNotes.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground italic">Trash is empty.</p>
            ) : (
              trashedNotes.map((note, i) => renderNoteRow(note, i, 0, true))
            )}
          </div>
        )}
        <div className="px-3 py-2">
          <button
            onClick={() => setTrashExpanded((v) => !v)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
          >
            <Trash2 size={14} />
            Trash
            {trashedNotes.length > 0 && <span className="text-xs opacity-60">{trashedNotes.length}</span>}
            {trashExpanded ? <ChevronDown size={13} className="ml-auto" /> : <ChevronRight size={13} className="ml-auto" />}
          </button>
        </div>
      </div>
    </DragDropContext>
    </div>
  );
}
