import React, { useState } from 'react';
import { 
  Folder as FolderIcon, ChevronRight, ChevronDown, Plus, 
  MoreVertical, FileText, Pin, PinOff, Trash2, ArrowRight,
  GripVertical
} from 'lucide-react';
import { 
  Folder, Note,
  useListFolders, useCreateFolder, 
  useListNotes, useCreateNote,
  useUpdateNote, useMoveNote, useDeleteNote,
  usePinNote, useUnpinNote, useReorderNotes,
  useRestoreNote, usePurgeNote
} from '@workspace/api-client-react';
import { useTabs } from '../lib/TabContext';
import { getListNotesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface SidebarProps {
  selectedFolderId: number | 'all' | 'trash' | 'pinned';
  onSelectFolder: (id: number | 'all' | 'trash' | 'pinned') => void;
  user: any;
  onLogout: () => void;
}

export default function Sidebar({ selectedFolderId, onSelectFolder, user, onLogout }: SidebarProps) {
  const queryClient = useQueryClient();
  const { openTab, activeTabId } = useTabs();
  
  const { data: folders = [] } = useListFolders();
  const { data: notes = [] } = useListNotes({ 
    folderId: typeof selectedFolderId === 'number' ? selectedFolderId : undefined,
    deleted: selectedFolderId === 'trash' ? true : undefined,
  });

  const { data: allNotes = [] } = useListNotes(); // Need all notes for Pinned section

  const [sortBy, setSortBy] = useState<'manual' | 'updatedAt'>('manual');

  const pinnedNotes = allNotes.filter(n => n.isPinned && !n.isDeleted).sort((a, b) => 
    sortBy === 'manual' ? a.sortOrder - b.sortOrder : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const activeNotes = notes.filter(n => !n.isDeleted).sort((a, b) => 
    sortBy === 'manual' ? a.sortOrder - b.sortOrder : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const trashedNotes = notes.filter(n => n.isDeleted).sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const displayNotes = selectedFolderId === 'trash' ? trashedNotes : 
                       selectedFolderId === 'pinned' ? pinnedNotes : activeNotes;

  const createFolder = useCreateFolder();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const pinNote = usePinNote();
  const unpinNote = useUnpinNote();
  const moveNote = useMoveNote();
  const reorderNotes = useReorderNotes();
  const restoreNote = useRestoreNote();
  const purgeNote = usePurgeNote();

  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

  const toggleFolder = (id: number) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateFolder = () => {
    const name = prompt('Folder name:');
    if (name) {
      createFolder.mutate({ data: { name } }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/folders'] })
      });
    }
  };

  const handleCreateNote = () => {
    const folderId = typeof selectedFolderId === 'number' ? selectedFolderId : null;
    createNote.mutate({ data: { title: 'Untitled Note', content: '', folderId } }, {
      onSuccess: (newNote) => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        openTab(newNote.id);
      }
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    // reorder displayNotes
    const items = Array.from(displayNotes);
    const [reorderedItem] = items.splice(sourceIndex, 1);
    items.splice(destIndex, 0, reorderedItem);

    // Update their sortOrder optimistically
    const newItems = items.map((item, index) => ({ id: item.id, sortOrder: index }));
    
    // We update local cache to prevent jumping
    // (A real app would be more careful, but this is fine for UI feel)
    
    reorderNotes.mutate({ data: { items: newItems } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() })
    });
  };

  return (
    <div className="w-72 h-full bg-sidebar flex flex-col border-r border-border text-sidebar-foreground">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border/50">
        <h1 className="font-serif text-2xl font-bold text-foreground tracking-tight">Folio</h1>
        <div className="relative group cursor-pointer" onClick={onLogout}>
          <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm shadow-sm ring-1 ring-border">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="absolute right-0 top-10 w-24 p-2 bg-popover text-popover-foreground shadow-md rounded border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-xs text-center z-50">
            Sign out
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-6">
        
        {/* Navigation Tree */}
        <div className="px-3 space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">Library</div>
          
          <button 
            onClick={() => onSelectFolder('all')}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${selectedFolderId === 'all' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'hover:bg-sidebar-accent/50'}`}
          >
            <FileText size={16} className="text-muted-foreground" />
            All Notes
          </button>
          
          <button 
            onClick={() => onSelectFolder('pinned')}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${selectedFolderId === 'pinned' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'hover:bg-sidebar-accent/50'}`}
          >
            <Pin size={16} className="text-muted-foreground" />
            Pinned
          </button>
          
          <button 
            onClick={() => onSelectFolder('trash')}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${selectedFolderId === 'trash' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'hover:bg-sidebar-accent/50'}`}
          >
            <Trash2 size={16} className="text-muted-foreground" />
            Trash
          </button>
        </div>

        {/* Folders */}
        <div className="px-3 space-y-1">
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Folders</div>
            <button onClick={handleCreateFolder} className="text-muted-foreground hover:text-foreground transition-colors">
              <Plus size={14} />
            </button>
          </div>
          
          {folders.filter(f => !f.parentFolderId).map(folder => {
            const isExpanded = expandedFolders.has(folder.id);
            const subfolders = folders.filter(f => f.parentFolderId === folder.id);
            
            return (
              <div key={folder.id}>
                <div className="flex items-center">
                  {subfolders.length > 0 ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
                      className="p-1 -mr-1 text-muted-foreground hover:text-foreground z-10"
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  ) : (
                    <div className="w-5" />
                  )}
                  <button 
                    onClick={() => onSelectFolder(folder.id)}
                    className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${selectedFolderId === folder.id ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'hover:bg-sidebar-accent/50'}`}
                  >
                    <FolderIcon size={16} className="text-muted-foreground fill-current opacity-20" />
                    <span className="flex-1 text-left truncate">{folder.name}</span>
                  </button>
                </div>
                
                {isExpanded && subfolders.length > 0 && (
                  <div className="ml-6 mt-1 space-y-1 border-l border-border/50 pl-2">
                    {subfolders.map(sub => (
                      <button 
                        key={sub.id}
                        onClick={() => onSelectFolder(sub.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${selectedFolderId === sub.id ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'hover:bg-sidebar-accent/50'}`}
                      >
                        <FolderIcon size={14} className="text-muted-foreground fill-current opacity-20" />
                        <span className="flex-1 text-left truncate">{sub.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Note List Section */}
      <div className="h-1/2 border-t border-border/50 flex flex-col bg-background/50">
        <div className="px-4 py-3 flex items-center justify-between border-b border-border/30 bg-sidebar/50">
          <div className="font-semibold text-sm">
            {selectedFolderId === 'all' ? 'All Notes' :
             selectedFolderId === 'pinned' ? 'Pinned' :
             selectedFolderId === 'trash' ? 'Trash' :
             folders.find(f => f.id === selectedFolderId)?.name || 'Notes'}
          </div>
          <div className="flex items-center gap-1">
            {selectedFolderId !== 'trash' && selectedFolderId !== 'pinned' && (
              <button 
                onClick={() => setSortBy(prev => prev === 'manual' ? 'updatedAt' : 'manual')}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-black/5 transition-colors mr-1"
                title={`Sort: ${sortBy === 'manual' ? 'Manual' : 'Last Updated'}`}
              >
                {sortBy === 'manual' ? 'Manual' : 'Recent'}
              </button>
            )}
            {selectedFolderId !== 'trash' && (
              <button 
                onClick={handleCreateNote}
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
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="notes-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                    {displayNotes.map((note, index) => (
                      <Draggable key={note.id} draggableId={note.id.toString()} index={index} isDragDisabled={selectedFolderId === 'trash' || selectedFolderId === 'all' || sortBy === 'updatedAt'}>
                        {(provided, snapshot) => (
                          <ContextMenu>
                            <ContextMenuTrigger asChild>
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                onClick={() => openTab(note.id)}
                                className={`group flex flex-col p-3 rounded-md cursor-pointer transition-all border ${
                                  activeTabId === note.id 
                                    ? 'bg-card border-primary/20 shadow-sm' 
                                    : snapshot.isDragging ? 'bg-card shadow-lg border-primary/50' : 'bg-transparent border-transparent hover:bg-black/5 hover:border-border/50'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="font-medium text-sm truncate flex-1 leading-tight text-foreground flex items-center gap-1.5 -ml-1">
                                    <div 
                                      className={`opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-muted-foreground transition-opacity cursor-grab active:cursor-grabbing ${sortBy === 'updatedAt' || selectedFolderId === 'all' || selectedFolderId === 'trash' ? 'hidden' : ''}`}
                                      {...provided.dragHandleProps}
                                    >
                                      <GripVertical size={14} />
                                    </div>
                                    <span className={sortBy === 'updatedAt' || selectedFolderId === 'all' || selectedFolderId === 'trash' ? 'ml-1' : ''}>
                                      {note.title || 'Untitled Note'}
                                    </span>
                                  </div>
                                  {note.isPinned && <Pin size={12} className="text-primary opacity-70 shrink-0" />}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed opacity-70 pl-5">
                                  {note.content ? note.content.replace(/<[^>]+>/g, '').substring(0, 80) : 'No content...'}
                                </div>
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-48">
                              {note.isDeleted ? (
                                <>
                                  <ContextMenuItem 
                                    onClick={() => moveNote.mutate({ id: note.id, data: { folderId: note.folderId } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() })})}
                                  >
                                    <ArrowRight size={16} className="mr-2" />
                                    Restore Note
                                  </ContextMenuItem>
                                </>
                              ) : (
                                <>
                                  <ContextMenuItem 
                                    onClick={() => note.isPinned ? unpinNote.mutate({ id: note.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() })}) : pinNote.mutate({ id: note.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() })})}
                                  >
                                    {note.isPinned ? <PinOff size={16} className="mr-2" /> : <Pin size={16} className="mr-2" />}
                                    {note.isPinned ? 'Unpin' : 'Pin Note'}
                                  </ContextMenuItem>
                                  
                                  <ContextMenuSub>
                                    <ContextMenuSubTrigger>
                                      <ArrowRight size={16} className="mr-2" />
                                      Move to...
                                    </ContextMenuSubTrigger>
                                    <ContextMenuSubContent className="w-48">
                                      <ContextMenuItem onClick={() => moveNote.mutate({ id: note.id, data: { folderId: null } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() })})}>
                                        All Notes
                                      </ContextMenuItem>
                                      <ContextMenuSeparator />
                                      {folders.map(f => (
                                        <ContextMenuItem key={f.id} onClick={() => moveNote.mutate({ id: note.id, data: { folderId: f.id } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() })})}>
                                          {f.name}
                                        </ContextMenuItem>
                                      ))}
                                    </ContextMenuSubContent>
                                  </ContextMenuSub>
                                </>
                              )}
                              
                              <ContextMenuSeparator />
                              <ContextMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => deleteNote.mutate({ id: note.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() })})}
                              >
                                <Trash2 size={16} className="mr-2" />
                                Delete
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>
    </div>
  );
}
