import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PlayCircle, Plus } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { createCourse, fetchAdminCourses, fetchCourses } from "../lib/courses";
import type { Course, CourseAdmin, CourseInput } from "../types/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Modal } from "../components/ui/Modal";
import { Loader } from "../components/ui/Loader";
import { SearchInput } from "../components/ui/SearchInput";
import { cn } from "../lib/utils";

type FormValues = {
  title: string;
  description: string;
};

const EMPTY_FORM: FormValues = { title: "", description: "" };

function CourseCard({ course, onOpen }: { course: Course | CourseAdmin; onOpen: () => void }) {
  const inactive = "is_active" in course && !course.is_active;
  return (
    <Card
      onClick={onOpen}
      className={cn("flex cursor-pointer flex-col gap-3.5", inactive && "opacity-60")}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent-soft">
          <PlayCircle size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold text-ink">{course.title}</h3>
          <p className="text-xs text-ink-faint">
            {course.video_count} video{course.video_count === 1 ? "" : "s"}
            {inactive && " · Inactive"}
          </p>
        </div>
      </div>
      {course.description && <p className="line-clamp-3 text-sm text-ink-muted">{course.description}</p>}
    </Card>
  );
}

export function Courses() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses", isAdmin],
    queryFn: () => (isAdmin ? fetchAdminCourses() : fetchCourses()),
  });

  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: EMPTY_FORM });

  function toPayload(values: FormValues): CourseInput {
    return { title: values.title, description: values.description.trim() || null, is_active: true };
  }

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => createCourse(toPayload(values)),
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      closeModal();
      navigate(`/courses/${course.id}`);
    },
  });

  function closeModal() {
    setModalOpen(false);
    reset(EMPTY_FORM);
  }

  const filtered = (courses ?? []).filter((c) => {
    const q = search.trim().toLowerCase();
    return !q || c.title.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
            <PlayCircle size={24} className="text-accent-soft" /> Courses
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Video courses built from YouTube links and playlists — watch right here.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setModalOpen(true)} className="w-fit shrink-0 whitespace-nowrap">
            <Plus size={16} /> New course
          </Button>
        )}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search courses..." className="max-w-sm" />

      {isLoading && <Loader className="py-16" label="Loading courses..." />}

      {!isLoading && filtered.length === 0 && (
        <Card className="py-16 text-center text-sm text-ink-muted">
          {courses?.length === 0 ? "No courses yet." : "No courses match your search."}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((course) => (
          <CourseCard key={course.id} course={course} onOpen={() => navigate(`/courses/${course.id}`)} />
        ))}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title="New course" className="max-w-lg">
        <form onSubmit={handleSubmit((values) => createMutation.mutate(values))} className="flex flex-col gap-4">
          <Input label="Course title" {...register("title", { required: true })} />
          <Textarea label="Description" rows={4} {...register("description")} />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create course
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
