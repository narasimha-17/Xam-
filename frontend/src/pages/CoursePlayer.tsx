import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, PlayCircle, Trash2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import {
  createCourseVideo,
  deleteCourse,
  deleteCourseVideo,
  fetchCourse,
  updateCourse,
  updateCourseVideo,
} from "../lib/courses";
import { parseYoutubeUrl, youtubeEmbedUrl } from "../lib/youtube";
import type { CourseVideo } from "../types/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Modal } from "../components/ui/Modal";
import { Loader } from "../components/ui/Loader";
import { cn } from "../lib/utils";

type VideoFormValues = { title: string; youtube_url: string };
const EMPTY_VIDEO_FORM: VideoFormValues = { title: "", youtube_url: "" };

type CourseFormValues = { title: string; description: string; is_active: boolean };

export function CoursePlayer() {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => fetchCourse(courseId),
  });

  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [editingVideoId, setEditingVideoId] = useState<number | null>(null);
  const [videoFormOpen, setVideoFormOpen] = useState(false);
  const [videoUrlError, setVideoUrlError] = useState<string | null>(null);
  const [courseModalOpen, setCourseModalOpen] = useState(false);

  useEffect(() => {
    if (course && course.videos.length > 0 && selectedVideoId === null) {
      setSelectedVideoId(course.videos[0].id);
    }
  }, [course, selectedVideoId]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["course", courseId] });

  const { register: registerVideo, handleSubmit: handleSubmitVideo, reset: resetVideo } = useForm<VideoFormValues>({
    defaultValues: EMPTY_VIDEO_FORM,
  });

  const createVideoMutation = useMutation({
    mutationFn: (values: VideoFormValues) =>
      createCourseVideo(courseId, { title: values.title, youtube_url: values.youtube_url, order: course?.videos.length ?? 0 }),
    onSuccess: (video) => {
      invalidate();
      setSelectedVideoId(video.id);
      closeVideoForm();
    },
  });

  const updateVideoMutation = useMutation({
    mutationFn: (values: VideoFormValues) =>
      updateCourseVideo(editingVideoId as number, {
        title: values.title,
        youtube_url: values.youtube_url,
        order: course?.videos.find((v) => v.id === editingVideoId)?.order ?? 0,
      }),
    onSuccess: () => {
      invalidate();
      closeVideoForm();
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: (videoId: number) => deleteCourseVideo(videoId),
    onSuccess: (_data, videoId) => {
      invalidate();
      if (selectedVideoId === videoId) setSelectedVideoId(null);
    },
  });

  const { register: registerCourse, handleSubmit: handleSubmitCourse, reset: resetCourse } = useForm<CourseFormValues>();

  const updateCourseMutation = useMutation({
    mutationFn: (values: CourseFormValues) =>
      updateCourse(courseId, { title: values.title, description: values.description.trim() || null, is_active: values.is_active }),
    onSuccess: () => {
      invalidate();
      setCourseModalOpen(false);
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: () => deleteCourse(courseId),
    onSuccess: () => navigate("/courses"),
  });

  function openVideoForm(video?: CourseVideo) {
    setVideoUrlError(null);
    if (video) {
      setEditingVideoId(video.id);
      resetVideo({ title: video.title, youtube_url: video.youtube_url });
    } else {
      setEditingVideoId(null);
      resetVideo(EMPTY_VIDEO_FORM);
    }
    setVideoFormOpen(true);
  }

  function closeVideoForm() {
    setVideoFormOpen(false);
    setEditingVideoId(null);
    setVideoUrlError(null);
    resetVideo(EMPTY_VIDEO_FORM);
  }

  function onSubmitVideo(values: VideoFormValues) {
    if (!parseYoutubeUrl(values.youtube_url)) {
      setVideoUrlError("That doesn't look like a valid YouTube video or playlist URL.");
      return;
    }
    if (editingVideoId !== null) updateVideoMutation.mutate(values);
    else createVideoMutation.mutate(values);
  }

  function openCourseEdit() {
    if (!course) return;
    resetCourse({ title: course.title, description: course.description ?? "", is_active: course.is_active });
    setCourseModalOpen(true);
  }

  if (isLoading) return <Loader className="py-16" label="Loading course..." />;
  if (!course) {
    return (
      <Card className="py-16 text-center text-sm text-ink-muted">
        Course not found. <Link to="/courses" className="text-accent hover:underline">Back to courses</Link>
      </Card>
    );
  }

  const selectedVideo = course.videos.find((v) => v.id === selectedVideoId) ?? null;
  const parsedSelected = selectedVideo ? parseYoutubeUrl(selectedVideo.youtube_url) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/courses" className="flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
          <ArrowLeft size={16} /> Back to courses
        </Link>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={openCourseEdit}>
              <Pencil size={14} /> Edit course
            </Button>
            <Button
              variant="outline"
              className="text-danger hover:bg-danger/10"
              onClick={() => {
                if (confirm(`Delete "${course.title}" and all its videos?`)) deleteCourseMutation.mutate();
              }}
            >
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        )}
      </div>

      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{course.title}</h1>
        {course.description && <p className="mt-1 text-sm text-ink-muted">{course.description}</p>}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex flex-1 flex-col gap-3">
          {parsedSelected ? (
            <iframe
              key={selectedVideo!.id}
              src={youtubeEmbedUrl(parsedSelected)}
              title={selectedVideo!.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full rounded-2xl border border-black/10"
            />
          ) : (
            <Card className="flex aspect-video w-full items-center justify-center text-sm text-ink-muted">
              {course.videos.length === 0 ? "No videos in this course yet." : "Select a video to start watching."}
            </Card>
          )}
          {selectedVideo && <p className="font-display text-lg font-semibold text-ink">{selectedVideo.title}</p>}
        </div>

        <Card className="flex w-full shrink-0 flex-col gap-2 p-3 lg:w-80">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-ink">Videos</h2>
            {isAdmin && (
              <button onClick={() => openVideoForm()} className="text-ink-faint hover:text-ink" aria-label="Add video">
                <Plus size={16} />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {course.videos.map((video, i) => (
              <div
                key={video.id}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-2 py-2 text-sm transition-colors",
                  selectedVideoId === video.id ? "bg-accent/10 text-ink" : "text-ink-muted hover:bg-black/5",
                )}
              >
                <button onClick={() => setSelectedVideoId(video.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <PlayCircle size={15} className="shrink-0 text-accent-soft" />
                  <span className="truncate">
                    {i + 1}. {video.title}
                  </span>
                </button>
                {isAdmin && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => openVideoForm(video)} className="text-ink-faint hover:text-ink">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => deleteVideoMutation.mutate(video.id)} className="text-ink-faint hover:text-danger">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {course.videos.length === 0 && <p className="px-2 py-4 text-center text-xs text-ink-faint">No videos yet.</p>}
          </div>
        </Card>
      </div>

      <Modal open={videoFormOpen} onClose={closeVideoForm} title={editingVideoId ? "Edit video" : "Add video"} className="max-w-lg">
        <form onSubmit={handleSubmitVideo(onSubmitVideo)} className="flex flex-col gap-4">
          <Input label="Video title" {...registerVideo("title", { required: true })} />
          <Input
            label="YouTube video or playlist URL"
            placeholder="https://www.youtube.com/watch?v=... or .../playlist?list=..."
            {...registerVideo("youtube_url", { required: true })}
          />
          {videoUrlError && <p className="text-sm text-danger">{videoUrlError}</p>}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeVideoForm}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createVideoMutation.isPending || updateVideoMutation.isPending}>
              {editingVideoId ? "Save changes" : "Add video"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={courseModalOpen} onClose={() => setCourseModalOpen(false)} title="Edit course" className="max-w-lg">
        <form onSubmit={handleSubmitCourse((values) => updateCourseMutation.mutate(values))} className="flex flex-col gap-4">
          <Input label="Course title" {...registerCourse("title", { required: true })} />
          <Textarea label="Description" rows={4} {...registerCourse("description")} />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" className="h-4 w-4 accent-accent" {...registerCourse("is_active")} />
            Active (visible to students)
          </label>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setCourseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateCourseMutation.isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
