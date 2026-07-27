import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { X, Plus } from 'lucide-react';
import { useTabs } from '../lib/TabContext';
import { useGetNote, useCreateNote, getGetNoteQueryKey, getListNotesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

const TabItem = ({ id, index }: { id: number; index: number }) => {
  const { data: note } = useGetNote(id, { query: { enabled: !!id, queryKey: getGetNoteQueryKey(id) } });
  const { activeTabId, openTab, closeTab } = useTabs();
  const isActive = activeTabId === id;

  return (
    <Draggable draggableId={`tab-${id}`} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => openTab(id)}
          className={`
            group flex items-center gap-3 px-4 py-2 min-w-[120px] max-w-[200px] 
            rounded-t-lg border-t border-l border-r cursor-pointer transition-all relative
            ${isActive 
              ? 'bg-card border-border text-foreground shadow-sm z-10' 
              : 'bg-sidebar-accent/50 border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
            }
          `}
          style={{
            ...provided.draggableProps.style,
            marginBottom: isActive ? '-1px' : '0', // Paper tab effect
            paddingBottom: isActive ? '9px' : '8px',
          }}
        >
          <span className="truncate flex-1 text-sm font-medium select-none">
            {note?.title || 'Untitled Note'}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); closeTab(id); }}
            className={`p-0.5 rounded transition-colors hover:bg-black/10 shrink-0 ${isActive ? 'opacity-100 text-foreground/50 hover:text-foreground' : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground'}`}
          >
            <X size={14} />
          </button>
          
          {isActive && (
            <div className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-card z-20" />
          )}
        </div>
      )}
    </Draggable>
  );
};

interface TabBarProps {
  selectedFolderId: number | 'all' | 'trash' | 'pinned';
}

export default function TabBar({ selectedFolderId }: TabBarProps) {
  const { openTabs, reorderTabs, openTab } = useTabs();
  const createNote = useCreateNote();
  const queryClient = useQueryClient();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    const newTabs = Array.from(openTabs);
    const [reorderedTab] = newTabs.splice(sourceIndex, 1);
    newTabs.splice(destIndex, 0, reorderedTab);
    reorderTabs(newTabs);
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

  if (openTabs.length === 0) return null;

  return (
    <div className="flex items-end px-2 pt-2 bg-background border-b border-border h-12 overflow-hidden shrink-0">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="tabs" direction="horizontal">
          {(provided) => (
            <div 
              ref={provided.innerRef} 
              {...provided.droppableProps}
              className="flex items-end gap-1 overflow-x-auto no-scrollbar pb-[1px]"
            >
              {openTabs.map((id, index) => (
                <TabItem key={id} id={id} index={index} />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      <button
        onClick={handleCreateNote}
        className="ml-2 mb-2 p-1.5 rounded-full text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors shrink-0"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
