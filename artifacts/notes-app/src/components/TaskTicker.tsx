import React, { useState, useMemo } from 'react';
import { Play, Pause, CalendarClock } from 'lucide-react';
import { useListPlannerEntries } from '@workspace/api-client-react';
import { format, addDays } from 'date-fns';

interface TaskTickerProps {
  onOpenPlanner: () => void;
}

type Day = 'today' | 'tomorrow';

export default function TaskTicker({ onOpenPlanner }: TaskTickerProps) {
  const { data: entries = [] } = useListPlannerEntries();
  const [paused, setPaused] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Day>('today');

  const { todayItems, tomorrowItems } = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const tomorrowKey = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    return {
      todayItems: entries.filter((e) => e.date === todayKey && !e.isDone),
      tomorrowItems: entries.filter((e) => e.date === tomorrowKey && !e.isDone),
    };
  }, [entries]);

  // Nothing to show for either day — no point taking up a row at all.
  if (todayItems.length === 0 && tomorrowItems.length === 0) return null;

  const items = selectedDay === 'today' ? todayItems : tomorrowItems;

  return (
    <div className="h-9 shrink-0 bg-blue-50 border-b border-blue-200 flex items-center overflow-hidden pr-11 font-sans">
      <span className="shrink-0 pl-2 pr-1 text-base select-none" title="Today's tasks">👉</span>
      <button
        onClick={onOpenPlanner}
        title="Open Planner"
        className="shrink-0 h-full flex items-center px-2.5 hover:bg-blue-100/70 transition-colors text-blue-600"
      >
        <CalendarClock size={13} />
      </button>

      <div className="shrink-0 h-full flex items-stretch text-xs font-semibold">
        <button
          onClick={() => setSelectedDay('today')}
          className={`px-3 transition-colors whitespace-nowrap ${
            selectedDay === 'today' ? 'bg-blue-100 text-blue-700' : 'text-blue-600 hover:bg-blue-100/70'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setSelectedDay('tomorrow')}
          className={`px-3 transition-colors whitespace-nowrap border-l border-blue-200 ${
            selectedDay === 'tomorrow' ? 'bg-blue-100 text-blue-700' : 'text-blue-600 hover:bg-blue-100/70'
          }`}
        >
          Tomorrow
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden h-full">
        {items.length === 0 ? (
          <div className="absolute inset-0 flex items-center px-3 text-sm text-muted-foreground italic">
            Nothing scheduled for {selectedDay}.
          </div>
        ) : (
          <div
            className={`absolute inset-y-0 left-0 flex items-center gap-10 whitespace-nowrap ${paused ? '' : 'animate-ticker'}`}
          >
            {/* Rendered twice back-to-back so the loop is seamless — the
                animation scrolls exactly one copy's width, then resets. */}
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center gap-10">
                {items.map((item) => (
                  <span key={`${copy}-${item.id}`} className="text-sm text-blue-900/80 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    {item.task}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setPaused((p) => !p)}
        title={paused ? 'Resume' : 'Pause'}
        className="shrink-0 h-full flex items-center justify-center w-9 hover:bg-blue-100/70 transition-colors text-blue-600"
      >
        {paused ? <Play size={13} /> : <Pause size={13} />}
      </button>
    </div>
  );
}
