import React, { useState } from 'react';
import { useAuth } from '@workspace/replit-auth-web';
import { TabProvider, useTabs } from '../lib/TabContext';
import Sidebar from '../components/Sidebar';
import TabBar from '../components/TabBar';
import Editor from '../components/Editor';
import VersionHistory from '../components/VersionHistory';
import Login from './Login';
import { Edit3 } from 'lucide-react';

function HomeContent() {
  const { user, logout } = useAuth();
  const [selectedFolderId, setSelectedFolderId] = useState<number | 'all' | 'trash' | 'pinned'>('all');
  const [showHistoryForNoteId, setShowHistoryForNoteId] = useState<number | null>(null);

  const { activeTabId, openTab } = useTabs();

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <Sidebar 
        selectedFolderId={selectedFolderId} 
        onSelectFolder={setSelectedFolderId}
        user={user}
        onLogout={logout}
      />
      
      <div className="flex-1 flex flex-col min-w-0 relative bg-background/50">
        <TabBar selectedFolderId={selectedFolderId} />
        
        {activeTabId ? (
          <Editor 
            key={activeTabId} // Force remount if tab changes, wait actually Editor handles id changes itself, so no need for key to prevent flickering. But wait, `react-quill` sometimes prefers remounting. Let's keep it without key for smoother transitions.
            noteId={activeTabId} 
            onOpenHistory={() => setShowHistoryForNoteId(activeTabId)} 
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
            <div className="w-24 h-24 mb-6 rounded-full bg-sidebar flex items-center justify-center border border-border shadow-inner">
               <Edit3 className="w-10 h-10 text-muted-foreground/50" strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-serif text-foreground font-medium mb-3">Your blank page awaits</h2>
            <p className="text-muted-foreground font-serif italic max-w-sm leading-relaxed">
              Select a note from the sidebar to start writing, or click the + to create a new one.
            </p>
          </div>
        )}

        {/* Version History Panel */}
        {showHistoryForNoteId && (
          <div className="absolute top-0 right-0 bottom-0 z-50 flex">
            {/* Backdrop */}
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
