import React, { useState } from 'react';
import { useAuth } from '@workspace/replit-auth-web';
import { TabProvider, useTabs } from '../lib/TabContext';
import Sidebar from '../components/Sidebar';
import TabBar from '../components/TabBar';
import Editor from '../components/Editor';
import VersionHistory from '../components/VersionHistory';
import CreateNoteModal from '../components/CreateNoteModal';
import AiChatPanel from '../components/AiChatPanel';
import Planner from '../components/Planner';
import TaskTicker from '../components/TaskTicker';
import Login from './Login';
import { Edit3 } from 'lucide-react';
import { Note, useListFolders } from '@workspace/api-client-react';

function HomeContent() {
  const { user, logout } = useAuth();
  const [selectedFolderId, setSelectedFolderId] = useState<number | 'all' | 'trash' | 'pinned'>('all');
  const [showHistoryForNoteId, setShowHistoryForNoteId] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalDefaultFolderId, setCreateModalDefaultFolderId] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatNoteId, setChatNoteId] = useState<number | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(false);

  const { activeTabId, openTab, unlockedNoteIds } = useTabs();
  const { data: folders = [] } = useListFolders();

  const handleOpenNote = (note: Note) => {
    // If the note is locked and not yet unlocked in this session, open it anyway
    // (Editor will show the lock screen and handle unlock)
    openTab(note.id);
  };

  const handleCreateNote = (defaultFolderId?: number | null) => {
    setCreateModalDefaultFolderId(defaultFolderId ?? null);
    setCreateModalOpen(true);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-background">
      <TaskTicker onOpenPlanner={() => setPlannerOpen(true)} />
      <div className="flex flex-1 w-full overflow-hidden">
      <Sidebar
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
        onOpenNote={handleOpenNote}
        onCreateNote={handleCreateNote}
        onOpenChat={() => { setChatNoteId(null); setChatOpen(true); }}
        onOpenPlanner={() => setPlannerOpen(true)}
        user={user}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col min-w-0 relative bg-background/50">
        {plannerOpen ? (
          <Planner onClose={() => setPlannerOpen(false)} />
        ) : (
          <>
            <TabBar
              selectedFolderId={selectedFolderId}
              onCreateNote={handleCreateNote}
            />

            {activeTabId ? (
              <Editor
                key={activeTabId}
                noteId={activeTabId}
                onOpenHistory={() => setShowHistoryForNoteId(activeTabId)}
                onOpenChat={(noteId) => { setChatNoteId(noteId); setChatOpen(true); }}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
                <div className="w-24 h-24 mb-6 rounded-full bg-sidebar flex items-center justify-center border border-border shadow-inner">
                  <Edit3 className="w-10 h-10 text-muted-foreground/50" strokeWidth={1.5} />
                </div>
                <h2 className="text-3xl font-serif text-foreground font-medium mb-3">Your blank page awaits</h2>
                <p className="text-muted-foreground font-serif italic max-w-sm leading-relaxed">
                  Select a note to start writing, or click{' '}
                  <button
                    onClick={() => handleCreateNote(null)}
                    className="text-primary hover:underline font-medium not-italic"
                  >
                    + New Note
                  </button>
                  .
                </p>
              </div>
            )}
          </>
        )}

        {/* Version History Panel */}
        {showHistoryForNoteId && (
          <div className="absolute top-0 right-0 bottom-0 z-50 flex">
            <div
              className="fixed inset-0 bg-foreground/5 backdrop-blur-[1px] animate-in fade-in duration-300"
              onClick={() => setShowHistoryForNoteId(null)}
            />
            <VersionHistory
              noteId={showHistoryForNoteId}
              onClose={() => setShowHistoryForNoteId(null)}
              onRestored={(newId) => {
                setShowHistoryForNoteId(null);
                openTab(newId);
              }}
            />
          </div>
        )}
      </div>

      {/* AI Chat Panel */}
      {chatOpen && (
        <AiChatPanel noteId={chatNoteId} onClose={() => { setChatOpen(false); setChatNoteId(null); }} />
      )}

      {/* Create Note Modal */}
      <CreateNoteModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        folders={folders}
        defaultFolderId={createModalDefaultFolderId}
        onCreated={(noteId) => {
          openTab(noteId);
          setCreateModalOpen(false);
        }}
      />
      </div>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <div className="animate-pulse w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <TabProvider>
      <HomeContent />
    </TabProvider>
  );
}
