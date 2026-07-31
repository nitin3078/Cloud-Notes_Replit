import React, { useState, useMemo } from 'react';
import { Play, Pause, CalendarClock } from 'lucide-react';
import { useListPlannerEntries } from '@workspace/api-client-react';
import { format } from 'date-fns';

interface TaskTickerProps {
  onOpenPlanner: () => void;
}

export default function TaskTicker({ onOpenPlanner }: TaskTickerProps) {
  const { data: entries = [] } = useListPlannerEntries();
  const [paused, setPaused] = useState(false);

  const todayItems = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    return entries.filter((e) => e.date === todayKey && !e.isDone);
  }, [entries]);

  if (todayItems.length === 0) return null;

  return (
    <div className="h-9 shrink-0 bg-primary/10 border-b border-primary/20 flex items-center overflow-hidden">
      <button
        onClick={onOpenPlanner}
        title="Open Planner"
        className="shrink-0 h-full flex items-center gap-1.5 px-3 bg-primary/15 hover:bg-primary/25 transition-colors text-primary text-xs font-semibold whitespace-nowrap"
      >
        <CalendarClock size={13} />
        Today
      </button>

      <div className="flex-1 relative overflow-hidden h-full">
        <div
          className={`absolute inset-y-0 left-0 flex items-center gap-10 whitespace-nowrap ${paused ? '' : 'animate-ticker'}`}
        >
          {/* Rendered twice back-to-back so the loop is seamless — the
              animation scrolls exactly one copy's width, then resets. */}
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-10">
              {todayItems.map((item) => (
                <span key={`${copy}-${item.id}`} className="text-sm text-foreground/80 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {item.task}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setPaused((p) => !p)}
        title={paused ? 'Resume' : 'Pause'}
        className="shrink-0 h-full flex items-center justify-center w-9 hover:bg-primary/15 transition-colors text-primary"
      >
        {paused ? <Play size={13} /> : <Pause size={13} />}
      </button>
    </div>
  );
}
