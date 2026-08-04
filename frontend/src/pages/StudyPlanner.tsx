import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock, FileClock, Plus, Trash2 } from "lucide-react";
import { createStudyEvent, deleteStudyEvent, fetchStudyEvents } from "../lib/studyEvents";
import { fetchExams } from "../lib/exams";
import { fetchSubjects } from "../lib/subjects";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Textarea } from "../components/ui/Textarea";
import { Modal } from "../components/ui/Modal";
import { Loader } from "../components/ui/Loader";

interface EventFormValues {
  title: string;
  subject_id: string;
  event_date: string;
  start_time: string;
  notes: string;
}

function todayStr(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function StudyPlanner() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: events, isLoading } = useQuery({ queryKey: ["study-events"], queryFn: () => fetchStudyEvents() });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const { data: exams } = useQuery({ queryKey: ["exams-all"], queryFn: () => fetchExams() });

  const { register, handleSubmit, reset, formState } = useForm<EventFormValues>({
    defaultValues: { event_date: todayStr() },
  });

  const createMutation = useMutation({
    mutationFn: (values: EventFormValues) =>
      createStudyEvent({
        title: values.title,
        subject_id: values.subject_id ? Number(values.subject_id) : null,
        event_date: values.event_date,
        start_time: values.start_time || null,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-events"] });
      setModalOpen(false);
      reset({ event_date: todayStr() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStudyEvent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["study-events"] }),
  });

  const upcomingExamWindows = useMemo(() => {
    const now = Date.now();
    return (exams ?? []).filter((e) => {
      if (!e.available_from && !e.available_until) return false;
      const until = e.available_until ? new Date(e.available_until).getTime() : Infinity;
      return until >= now;
    });
  }, [exams]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const e of events ?? []) {
      const list = map.get(e.event_date) ?? [];
      list.push(e);
      map.set(e.event_date, list as NonNullable<typeof events>);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
            <CalendarDays size={24} className="text-accent-soft" /> Study planner
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Schedule study sessions and see upcoming exam windows in one place.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Add session
        </Button>
      </div>

      {upcomingExamWindows.length > 0 && (
        <Card className="flex flex-col gap-3">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            <FileClock size={13} /> Upcoming exam windows
          </h2>
          {upcomingExamWindows.map((exam) => (
            <div key={exam.id} className="flex items-center justify-between gap-3 rounded-xl border border-black/10 p-3">
              <p className="text-sm font-medium text-ink">{exam.title}</p>
              <p className="shrink-0 text-xs text-ink-faint">
                {exam.available_from && `from ${new Date(exam.available_from).toLocaleDateString()}`}
                {exam.available_until && ` until ${new Date(exam.available_until).toLocaleDateString()}`}
              </p>
            </div>
          ))}
        </Card>
      )}

      {isLoading && <Loader className="py-16" label="Loading your planner..." />}

      {!isLoading && eventsByDate.length === 0 && (
        <Card className="py-16 text-center text-sm text-ink-muted">
          No study sessions scheduled yet — add one to get started.
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {eventsByDate.map(([dateStr, dayEvents]) => (
          <div key={dateStr} className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
              {dateStr === todayStr() && <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-accent-soft">Today</span>}
            </p>
            {dayEvents?.map((event) => (
              <Card key={event.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  {event.start_time && (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-ink-faint">
                      <Clock size={12} /> {event.start_time.slice(0, 5)}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-medium text-ink">{event.title}</p>
                    <p className="text-xs text-ink-faint">
                      {event.subject_name && <>{event.subject_name}</>}
                      {event.notes && <>{event.subject_name ? " — " : ""}{event.notes}</>}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(event.id)}
                  className="shrink-0 rounded-lg p-1.5 text-ink-faint hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </Card>
            ))}
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add study session">
        <form onSubmit={handleSubmit((values) => createMutation.mutate(values))} className="flex flex-col gap-4">
          <Input label="Title" placeholder="e.g. Revise Operating Systems" {...register("title", { required: true })} />
          {subjects && subjects.length > 0 && (
            <Select label="Subject (optional)" {...register("subject_id")}>
              <option value="">No specific subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" {...register("event_date", { required: true })} />
            <Input label="Time (optional)" type="time" {...register("start_time")} />
          </div>
          <Textarea label="Notes (optional)" rows={2} {...register("notes")} />
          <Button type="submit" isLoading={createMutation.isPending} disabled={!formState.isValid} className="w-full">
            Add to planner
          </Button>
        </form>
      </Modal>
    </div>
  );
}
