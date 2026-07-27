import React from 'react';
import { format } from 'date-fns';
import { X, Clock, Copy } from 'lucide-react';
import { useListNoteVersions, useRestoreNoteVersionAsCopy, getListNotesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

interface VersionHistoryProps {
  noteId: number;
  onClose: () => void;
  onRestored: (newNoteId: number) => void;
}

export default function VersionHistory({ noteId, onClose, onRestored }: VersionHistoryProps) {
  const queryClient = useQueryClient();
  const { data: versions, isLoading } = useListNoteVersions(noteId);
  const restoreVersion = useRestoreNoteVersionAsCopy();

  const handleRestore = (versionId: number) => {
    restoreVersion.mutate({ id: noteId, versionId }, {
      onSuccess: (newNote) => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        onRestored(newNote.id);
      }
    });
  };

  return (
    <div className="w-80 h-full bg-sidebar border-l border-border shadow-[-8px_0_24px_rgba(44,26,14,0.05)] flex flex-col animate-in slide-in-from-right duration-300 relative z-50">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-sidebar/50">
        <h3 className="font-semibold flex items-center gap-2 text-foreground">
          <Clock size={16} className="text-primary" />
          Version History
        </h3>
        <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-border" />
                <div className="flex-1 space-y-2">
                  <div className="w-24 h-3 bg-muted rounded" />
                  <div className="w-full h-12 bg-muted/50 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : !versions?.length ? (
          <div className="text-center text-sm text-muted-foreground italic font-serif py-8">
            No versions saved yet.
          </div>
        ) : (
          <div className="relative border-l-2 border-border/50 ml-2 pl-4 space-y-6">
            {versions.map((v, i) => (
              <div key={v.id} className="relative group">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary/20 border border-primary z-10 group-hover:bg-primary transition-colors" />
                <div className="text-xs font-semibold text-muted-foreground mb-1">
                  {format(new Date(v.createdAt), "MMM d, h:mm a")}
                  {i === 0 && <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary text-[10px] uppercase">Current</span>}
                </div>
                <div className="bg-card border border-border/50 rounded p-3 text-sm text-card-foreground shadow-sm">
                  <div className="line-clamp-3 opacity-80 leading-relaxed" dangerouslySetInnerHTML={{ __html: v.content || '<em>Empty note</em>' }} />
                  {i !== 0 && (
                    <button
                      onClick={() => handleRestore(v.id)}
                      disabled={restoreVersion.isPending}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-background border border-border text-foreground text-xs rounded hover:bg-muted hover:border-primary/30 transition-all font-medium"
                    >
                      <Copy size={14} />
                      Restore as Copy
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
