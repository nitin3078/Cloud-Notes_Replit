import React, { useState, useMemo } from 'react';
import { Play, Pause, ListChecks } from 'lucide-react';
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
  // changed to any date via the calendar picker (Today/Tomorrow included).
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { hasTodayOrTomorrow, items, selectedDateLabel, buttonLabel } = useMemo(() => {
    const tKey = todayKey();
    const tmKey = tomorrowKey();
    const todayItems = entries.filter((e) => e.date === tKey && !e.isDone);
    const tomorrowItems = entries.filter((e) => e.date === tmKey && !e.isDone);
    const selectedItems = entries.filter((e) => e.date === selectedDateKey && !e.isDone);

    const parsed = parseISO(selectedDateKey);
    const isT = isToday(parsed);
    const isTm = isTomorrow(parsed);
    const longLabel = isT ? 'today' : isTm ? 'tomorrow' : format(parsed, 'EEEE, MMM d');
    // The single date-button's own text: short form for Today/Tomorrow,
    // otherwise the actual picked date replaces it entirely.
    const shortLabel = isT ? 'Today' : isTm ? 'Tomorrow' : format(parsed, 'MMM d');

    return {
      hasTodayOrTomorrow: todayItems.length > 0 || tomorrowItems.length > 0,
      items: selectedItems,
      selectedDateLabel: longLabel,
      buttonLabel: shortLabel,
    };
  }, [entries, selectedDateKey]);

  // Nothing to show for today or tomorrow — no point taking up a row at all.
  // (Once shown, you can still browse to any other date via the calendar.)
  if (!hasTodayOrTomorrow) return null;

  const isCustomDate = selectedDateKey !== todayKey() && selectedDateKey !== tomorrowKey();

  return (
    <div className="h-9 shrink-0 bg-blue-50 border-b border-blue-200 flex items-center overflow-hidden pr-11 font-sans">
      <span className="shrink-0 pl-2 pr-1 text-base select-none" title="Today's tasks">👉</span>

      <button
        onClick={onOpenPlanner}
        title="Open Planner"
        className="shrink-0 h-full flex items-center gap-1 px-2 hover:bg-blue-100/70 transition-colors text-blue-600 text-xs font-medium"
      >
        <ListChecks size={13} />
        Planner
      </button>

      {/* Single date control: shows Today / Tomorrow / the picked date —
          clicking it resets back to Today. The calendar icon opens the
          picker to browse to any other date. */}
      <button
        onClick={() => setSelectedDateKey(todayKey())}
        title={isCustomDate ? 'Back to Today' : undefined}
        className="shrink-0 h-full px-3 text-xs font-semibold whitespace-nowrap border-l border-blue-200 bg-blue-100 text-blue-700 transition-colors hover:bg-blue-200/70"
      >
        {buttonLabel}
      </button>

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
