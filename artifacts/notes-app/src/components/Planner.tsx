import React, { useMemo, useState } from 'react';
import { format, isToday, isBefore, startOfDay, parseISO } from 'date-fns';
import { Plus, Trash2, Check, CalendarClock, X } from 'lucide-react';
import {
  useListPlannerEntries, useCreatePlannerEntry, useUpdatePlannerEntry, useDeletePlannerEntry,
  getListPlannerEntriesQueryKey, PlannerEntry,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface PlannerProps {
  onClose: () => void;
}

function toDateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export default function Planner({ onClose }: PlannerProps) {
  const queryClient = useQueryClient();
  const { data: entries = [], isLoading } = useListPlannerEntries();
  const createEntry = useCreatePlannerEntry();
  const updateEntry = useUpdatePlannerEntry();
  const deleteEntry = useDeletePlannerEntry();

  const [newDate, setNewDate] = useState<Date>(new Date());
  const [newTask, setNewTask] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListPlannerEntriesQueryKey() });

  // Group entries by date. Only dates that actually have entries appear here
  // — there's no placeholder row for every day of the next several months.
  const groups = useMemo(() => {
    const map = new Map<string, PlannerEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.date) ?? [];
      list.push(entry);
      map.set(entry.date, list);
    }
    return Array.from(map.entries())
      .map(([date, items]) => ({ date, items }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries]);

  const today = startOfDay(new Date());
  // "Up next": today's group if it exists, otherwise the nearest future group.
  const upNextIndex = groups.findIndex((g) => !isBefore(parseISO(g.date), today));
  const upNext = upNextIndex >= 0 ? groups[upNextIndex] : null;
  const restGroups = groups.filter((_, i) => i !== upNextIndex);

  const handleAdd = () => {
    const task = newTask.trim();
    if (!task) return;
    createEntry.mutate({ data: { date: toDateKey(newDate), task } }, { onSuccess: () => { invalidate(); setNewTask(''); } });
  };

  const handleToggleDone = (entry: PlannerEntry) => {
    updateEntry.mutate({ id: entry.id, data: { isDone: !entry.isDone } }, { onSuccess: invalidate });
  };

  const handleDelete = (entry: PlannerEntry) => {
    deleteEntry.mutate({ id: entry.id }, { onSuccess: invalidate });
  };

  const renderGroup = (date: string, items: PlannerEntry[], highlighted: boolean) => (
    <div
      key={date}
      className={`rounded-lg border p-4 ${highlighted ? 'border-primary/40 bg-primary/5 shadow-sm' : 'border-border/60 bg-card'}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {highlighted && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
            {isToday(parseISO(date)) ? 'Today' : 'Up next'}
          </span>
        )}
        <h3 className="font-serif font-semibold text-foreground">
          {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
        </h3>
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((entry) => (
          <li key={entry.id} className="group flex items-center gap-2 py-1">
            <button
              type="button"
              onClick={() => handleToggleDone(entry)}
              className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                entry.isDone ? 'bg-primary border-primary' : 'border-border hover:border-primary/60'
              }`}
            >
              {entry.isDone && <Check size={11} className="text-primary-foreground" />}
            </button>
            <span className={`flex-1 text-sm ${entry.isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {entry.task}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(entry)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-opacity shrink-0"
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-card rounded-tl-xl border-l border-t shadow-[-4px_0_12px_rgba(44,26,14,0.02)] border-border relative z-10 overflow-hidden">
      <div className="h-14 flex-shrink-0 border-b border-border flex items-center justify-between px-4 bg-card/80 backdrop-blur-sm">
        <h2 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
          <CalendarClock size={18} className="text-primary" />
          Planner
        </h2>
        <button onClick={onClose} className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-10">
          {/* Add task */}
          <div className="flex items-center gap-2 mb-8 bg-background border border-input rounded-lg p-2 focus-within:ring-1 focus-within:ring-ring">
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="shrink-0 text-sm font-medium px-3 py-1.5 rounded-md bg-muted hover:bg-muted/70 text-foreground transition-colors whitespace-nowrap"
                >
                  {format(newDate, 'MMM d, yyyy')}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={(d) => { if (d) setNewDate(d); setDatePickerOpen(false); }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Add a task for this date…"
              className="flex-1 bg-transparent text-sm outline-none px-1"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newTask.trim() || createEntry.isPending}
              title="Add"
              className="shrink-0 p-1.5 rounded bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          {isLoading && (
            <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
          )}

          {!isLoading && groups.length === 0 && (
            <p className="text-sm text-muted-foreground italic font-serif text-center py-8">
              Nothing on the planner yet. Pick a date above and add your first task.
            </p>
          )}

          <div className="flex flex-col gap-4">
            {upNext && renderGroup(upNext.date, upNext.items, true)}
            {restGroups.map((g) => renderGroup(g.date, g.items, false))}
          </div>
        </div>
      </div>
    </div>
  );
}
