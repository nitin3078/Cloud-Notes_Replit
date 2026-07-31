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
    <div className="h-9 shrink-0 bg-amber-100 border-b border-amber-300 flex items-center overflow-hidden">
      <button
        onClick={onOpenPlanner}
        title="Open Planner"
        className="shrink-0 h-full flex items-center px-2.5 hover:bg-amber-200/60 transition-colors text-amber-800"
      >
        <CalendarClock size={13} />
      </button>

      <div className="shrink-0 h-full flex items-stretch text-xs font-semibold">
        <button
          onClick={() => setSelectedDay('today')}
          className={`px-3 transition-colors whitespace-nowrap ${
            selectedDay === 'today' ? 'bg-amber-500 text-white' : 'text-amber-800 hover:bg-amber-200/60'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setSelectedDay('tomorrow')}
          className={`px-3 transition-colors whitespace-nowrap border-l border-amber-300 ${
            selectedDay === 'tomorrow' ? 'bg-amber-500 text-white' : 'text-amber-800 hover:bg-amber-200/60'
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
                  <span key={`${copy}-${item.id}`} className="text-sm text-amber-950 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
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
        className="shrink-0 h-full flex items-center justify-center w-9 hover:bg-amber-200/60 transition-colors text-amber-800"
      >
        {paused ? <Play size={13} /> : <Pause size={13} />}
      </button>
    </div>
  );
}
