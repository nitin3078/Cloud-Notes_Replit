import React, { useState, useMemo } from 'react';
import { Play, Pause, CalendarClock } from 'lucide-react';
import { useListPlannerEntries } from '@workspace/api-client-react';
import { format, addDays, parseISO, isToday, isTomorrow } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface TaskTickerProps {
  onOpenPlanner: () => void;
}

function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
function tomorrowKey(): string {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd');
}

export default function TaskTicker({ onOpenPlanner }: TaskTickerProps) {
  const { data: entries = [] } = useListPlannerEntries();
  const [paused, setPaused] = useState(false);
  // The date currently shown in the ticker — defaults to today, but can be
  // changed to Tomorrow or any date at all via the calendar picker.
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { hasTodayOrTomorrow, items, selectedDateLabel } = useMemo(() => {
    const tKey = todayKey();
    const tmKey = tomorrowKey();
    const todayItems = entries.filter((e) => e.date === tKey && !e.isDone);
    const tomorrowItems = entries.filter((e) => e.date === tmKey && !e.isDone);
    const selectedItems = entries.filter((e) => e.date === selectedDateKey && !e.isDone);

    const parsed = parseISO(selectedDateKey);
    const label = isToday(parsed) ? 'today' : isTomorrow(parsed) ? 'tomorrow' : format(parsed, 'EEEE, MMM d');

    return {
      hasTodayOrTomorrow: todayItems.length > 0 || tomorrowItems.length > 0,
      items: selectedItems,
      selectedDateLabel: label,
    };
  }, [entries, selectedDateKey]);

  // Nothing to show for today or tomorrow — no point taking up a row at all.
  // (Once shown, you can still browse to any other date via the calendar.)
  if (!hasTodayOrTomorrow) return null;

  const isShowingToday = selectedDateKey === todayKey();
  const isShowingTomorrow = selectedDateKey === tomorrowKey();

  return (
    <div className="h-9 shrink-0 bg-blue-50 border-b border-blue-200 flex items-center overflow-hidden pr-11 font-sans">
      <span className="shrink-0 pl-2 pr-1 text-base select-none" title="Today's tasks">👉</span>

      <button
        onClick={onOpenPlanner}
        title="Open Planner"
        className="shrink-0 h-full flex items-center px-2 hover:bg-blue-100/70 transition-colors text-blue-600"
      >
        <CalendarClock size={13} />
      </button>

      {/* Calendar picker — browse any date's tasks in the ticker, not just Today/Tomorrow */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <button
            title="Pick a date"
            className="shrink-0 h-full flex items-center px-2 border-l border-blue-200 hover:bg-blue-100/70 transition-colors text-blue-600"
          >
            📅
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={parseISO(selectedDateKey)}
            onSelect={(d) => {
              if (d) setSelectedDateKey(format(d, 'yyyy-MM-dd'));
              setCalendarOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <div className="shrink-0 h-full flex items-stretch text-xs font-semibold">
        <button
          onClick={() => setSelectedDateKey(todayKey())}
          className={`px-3 transition-colors whitespace-nowrap border-l border-blue-200 ${
            isShowingToday ? 'bg-blue-100 text-blue-700' : 'text-blue-600 hover:bg-blue-100/70'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setSelectedDateKey(tomorrowKey())}
          className={`px-3 transition-colors whitespace-nowrap border-l border-blue-200 ${
            isShowingTomorrow ? 'bg-blue-100 text-blue-700' : 'text-blue-600 hover:bg-blue-100/70'
          }`}
        >
          Tomorrow
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden h-full">
        {items.length === 0 ? (
          <div className="absolute inset-0 flex items-center px-3 text-sm text-muted-foreground italic">
            Nothing scheduled for {selectedDateLabel}.
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
