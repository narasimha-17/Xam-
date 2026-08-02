import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  ListChecks,
  Maximize,
  MessageSquareWarning,
  ShieldAlert,
  ShieldCheck,
  Video,
} from "lucide-react";
import { fetchExamForStudent, startAttempt, submitAttempt } from "../lib/exams";
import { logProctorEvent } from "../lib/proctoring";
import {
  detectFaceCount,
  loadFaceDetectionModels,
} from "../lib/faceDetection";
import type { AnswerPayload } from "../types/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Loader, FullPageLoader } from "../components/ui/Loader";
import { QuestionRenderer } from "../components/exam-take/QuestionRenderer";
import { ReportQuestionModal } from "../components/exam-take/ReportQuestionModal";
import { cn, shuffleWithSeed } from "../lib/utils";

const VIOLATION_LIMIT = 5;

function ExamPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="app-backdrop">
        <div className="bg-grid" />
      </div>
      <main className="px-8 py-8">
        <div className="mx-auto max-w-5xl animate-fade-in-up">{children}</div>
      </main>
    </div>
  );
}

export function ExamTake() {
  const { id } = useParams<{ id: string }>();
  const examId = Number(id);
  const navigate = useNavigate();

  const { data: exam, isLoading: examLoading } = useQuery({
    queryKey: ["exam-take", examId],
    queryFn: () => fetchExamForStudent(examId),
    enabled: !Number.isNaN(examId),
  });

  const attemptMutation = useMutation({
    mutationFn: () => startAttempt(examId),
  });
  const startedRef = useRef(false);

  const [examStarted, setExamStarted] = useState(false);

  useEffect(() => {
    if (exam && examStarted && !startedRef.current) {
      startedRef.current = true;
      attemptMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, examStarted]);

  const [answers, setAnswers] = useState<Record<number, AnswerPayload>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(
    new Set(),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);

  function scrollPalette(direction: 1 | -1) {
    paletteRef.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  }

  useEffect(() => {
    const active = paletteRef.current?.querySelector(
      `[data-index="${currentIndex}"]`,
    );
    active?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [currentIndex]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const wasFullscreenRef = useRef(false);
  const handleSubmitRef = useRef<() => void>(() => {});
  const [autoSubmitMessage, setAutoSubmitMessage] = useState<string | null>(null);
  const autoSubmitTriggeredRef = useRef(false);
  const violationCountRef = useRef(0);

  const [proctorConsent, setProctorConsent] = useState(false);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [deviceChecking, setDeviceChecking] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const attachVideoStream = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && mediaStreamRef.current) {
      el.srcObject = mediaStreamRef.current;
    }
  }, []);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micRafRef = useRef<number | null>(null);
  const attemptId = attemptMutation.data?.id;

  const [violationWarning, setViolationWarning] = useState<string | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function warn(message: string) {
    setViolationWarning(message);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    warningTimeoutRef.current = setTimeout(
      () => setViolationWarning(null),
      5000,
    );
  }

  function triggerAutoSubmit(overlayText: string, warnText: string) {
    if (autoSubmitTriggeredRef.current) return;
    autoSubmitTriggeredRef.current = true;
    setAutoSubmitMessage(overlayText);
    setTimeout(() => {
      warn(warnText);
      handleSubmitRef.current();
    }, 2000);
  }

  function registerViolation() {
    violationCountRef.current += 1;
    if (violationCountRef.current >= VIOLATION_LIMIT) {
      triggerAutoSubmit(
        "Too many proctoring violations — submitting your exam…",
        `${VIOLATION_LIMIT} proctoring violations were detected during this attempt — your exam has been submitted automatically.`,
      );
    }
  }

  function stopDeviceCheck() {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (micRafRef.current) cancelAnimationFrame(micRafRef.current);
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    setWebcamActive(false);
    setMicLevel(0);
  }

  async function startDeviceCheck() {
    setDeviceError(null);
    setDeviceChecking(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setWebcamActive(true);

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = audioCtx;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        micRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setDeviceError(
        "Could not access your camera/microphone. Check your browser permissions and try again.",
      );
      setProctorConsent(false);
    } finally {
      setDeviceChecking(false);
    }
  }

  useEffect(() => {
    function handleChange() {
      const now = document.fullscreenElement !== null;
      setIsFullscreen(now);
      if (!now && wasFullscreenRef.current && examStarted && attemptId) {
        logProctorEvent(attemptId, { event_type: "fullscreen_exit" });
        triggerAutoSubmit(
          "Fullscreen exited — submitting your exam…",
          "You exited fullscreen — your exam has been submitted automatically.",
        );
      }
      wasFullscreenRef.current = now;
    }
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, [examStarted, attemptId]);

  useEffect(() => {
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!examStarted || !attemptId) return;
    function handleVisibility() {
      if (document.hidden) {
        logProctorEvent(attemptId!, { event_type: "tab_switch" });
        registerViolation();
        warn("Tab switch detected — this has been recorded.");
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [examStarted, attemptId]);

  const captureSnapshot = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.6);
  }, []);

  useEffect(() => {
    if (!examStarted || !attemptId) return;
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "PrintScreen") {
        logProctorEvent(attemptId!, {
          event_type: "screenshot_attempt",
          snapshot_base64: captureSnapshot(),
        });
        registerViolation();
        warn("Screenshot key detected — this has been recorded.");
      }
    }
    window.addEventListener("keyup", handleKeydown);
    return () => window.removeEventListener("keyup", handleKeydown);
  }, [examStarted, attemptId, captureSnapshot]);

  useEffect(() => {
    if (!examStarted || !attemptId || !mediaStreamRef.current) return;
    const interval = setInterval(() => {
      const dataUrl = captureSnapshot();
      if (!dataUrl) return;
      logProctorEvent(attemptId, {
        event_type: "webcam_snapshot",
        snapshot_base64: dataUrl,
      });
    }, 120_000);
    return () => clearInterval(interval);
  }, [examStarted, attemptId, captureSnapshot]);

  useEffect(() => {
    if (!examStarted || !attemptId || !webcamActive) return;
    let cancelled = false;
    let missedChecks = 0;
    let multiFaceStreak = 0;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    loadFaceDetectionModels()
      .then(() => {
        if (cancelled) return;
        intervalId = setInterval(async () => {
          const video = videoRef.current;
          if (cancelled || !video || video.videoWidth === 0) return;
          const faceCount = await detectFaceCount(video).catch(() => 1); // don't false-flag on detector errors
          if (faceCount === 0) {
            missedChecks += 1;
            multiFaceStreak = 0;
            if (missedChecks === 2) {
              logProctorEvent(attemptId, {
                event_type: "no_face_detected",
                snapshot_base64: captureSnapshot(),
              });
              registerViolation();
              warn("No face detected in frame — this has been recorded.");
            }
          } else if (faceCount > 1) {
            missedChecks = 0;
            multiFaceStreak += 1;
            if (multiFaceStreak === 2) {
              logProctorEvent(attemptId, {
                event_type: "multiple_faces",
                snapshot_base64: captureSnapshot(),
              });
              registerViolation();
              warn("Multiple faces detected in frame — this has been recorded.");
            }
          } else {
            missedChecks = 0;
            multiFaceStreak = 0;
          }
        }, 8_000);
      })
      .catch(() => {
        // model failed to load — skip face detection rather than block the exam
      });

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [examStarted, attemptId, webcamActive, captureSnapshot]);

  async function beginExam() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // fullscreen not available/blocked — continue anyway rather than blocking the student
    }
    // Tear down the pre-flight mic level meter — only the video track is needed during the exam.
    if (micRafRef.current) cancelAnimationFrame(micRafRef.current);
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    mediaStreamRef.current?.getAudioTracks().forEach((t) => t.stop());
    setExamStarted(true);
  }

  function reEnterFullscreen() {
    document.documentElement.requestFullscreen().catch(() => {});
  }

  function handleCopyOrPaste(type: "copy_attempt" | "paste_attempt") {
    return (e: ReactClipboardEvent) => {
      e.preventDefault();
      if (attemptId) logProctorEvent(attemptId, { event_type: type });
      registerViolation();
      warn(
        type === "copy_attempt"
          ? "Copy is disabled during this exam — this has been recorded."
          : "Paste is disabled during this exam — this has been recorded.",
      );
    };
  }

  function toggleMark(questionId: number) {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  const deadline = useMemo(() => {
    if (!attemptMutation.data || !exam) return null;
    return (
      new Date(attemptMutation.data.started_at).getTime() +
      exam.duration_minutes * 60_000
    );
  }, [attemptMutation.data, exam]);

  // Seeded by attempt id so the order is randomized per attempt but stable
  // across re-renders and page refreshes of the same in-progress attempt.
  const shuffledQuestions = useMemo(() => {
    if (!exam) return [];
    return attemptId ? shuffleWithSeed(exam.questions, attemptId) : exam.questions;
  }, [exam, attemptId]);

  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  const submitMutation = useMutation({
    mutationFn: () => {
      const attemptId = attemptMutation.data!.id;
      const payload = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: Number(questionId),
        answer,
      }));
      return submitAttempt(attemptId, payload);
    },
    onSuccess: (result) =>
      navigate(`/exams/attempts/${result.id}`, { replace: true }),
  });

  const handleSubmit = useCallback(() => {
    if (!submitMutation.isPending && !submitMutation.isSuccess)
      submitMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitMutation.isPending, submitMutation.isSuccess]);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const left = deadline - Date.now();
      setRemainingMs(left);
      if (left <= 0) handleSubmit();
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline, handleSubmit]);

  if (examLoading || !exam) {
    return (
      <ExamPageShell>
        <FullPageLoader label="Loading exam..." />
      </ExamPageShell>
    );
  }

  if (!examStarted) {
    return (
      <ExamPageShell>
        <div className="flex min-h-[70vh] items-center justify-center py-8">
          <Card className="flex w-full max-w-xl flex-col gap-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-soft">
                <ShieldCheck size={22} />
              </div>
              <h1 className="font-display text-xl font-semibold text-ink">
                {exam.title}
              </h1>
              <p className="text-sm text-ink-muted">
                {exam.questions.length} questions · {exam.duration_minutes}{" "}
                minutes
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-black/10 bg-base-soft/40 p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <ListChecks size={15} /> Exam instructions
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
                <li>
                  Each question shows its point value; answer as many as you can
                  before time runs out.
                </li>
                <li>
                  Use "Mark for review" to flag questions to revisit before
                  submitting.
                </li>
                <li>
                  You can navigate freely between questions using the palette,
                  Previous, and Next.
                </li>
                <li>
                  The timer starts the moment you click "Begin exam" and
                  auto-submits at zero.
                </li>
                <li>
                  Once submitted, the attempt is final and cannot be retaken or
                  edited.
                </li>
                <li>
                  If you spot a wrong or unclear question, use "Report question"
                  — it won't affect your score.
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-danger/20 bg-danger/5 p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-danger">
                <ShieldCheck size={15} /> Malpractice policy
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
                <li>
                  This exam runs in fullscreen and is proctored for the full
                  duration.
                </li>
                <li>
                  Switching tabs/windows or exiting fullscreen is recorded and
                  shown to your instructor.
                </li>
                <li>
                  Copy and paste inside the exam are blocked; attempts are
                  logged.
                </li>
                <li>
                  Repeated or serious violations may be treated as academic
                  malpractice and reviewed by your instructor.
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-base-soft/40 px-4 py-3">
              <label className="flex w-full cursor-pointer items-start gap-3 text-left">
                <input
                  type="checkbox"
                  checked={proctorConsent}
                  onChange={(e) => {
                    setProctorConsent(e.target.checked);
                    if (e.target.checked) startDeviceCheck();
                    else stopDeviceCheck();
                  }}
                  className="mt-0.5 h-4 w-4 accent-accent"
                />
                <span className="text-sm text-ink-muted">
                  <span className="flex items-center gap-1.5 font-medium text-ink">
                    <Video size={14} /> Allow periodic webcam snapshots
                  </span>
                  Required — this exam needs webcam verification enabled to
                  begin.
                </span>
              </label>

              {deviceChecking && (
                <p className="text-xs text-ink-muted">
                  Checking your camera and microphone...
                </p>
              )}
              {deviceError && (
                <p className="text-xs text-danger">{deviceError}</p>
              )}
              {webcamActive && (
                <div className="flex items-center gap-3">
                  <video
                    ref={attachVideoStream}
                    autoPlay
                    muted
                    playsInline
                    className="h-20 w-28 rounded-lg border border-black/10 object-cover"
                  />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <span className="text-xs font-medium text-ink">
                      Microphone level
                    </span>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
                      <div
                        className="h-full rounded-full bg-success transition-[width] duration-100"
                        style={{ width: `${micLevel}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-faint">
                      Say something to test your mic.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <label className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-black/10 bg-base-soft/40 px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={agreedToPolicy}
                onChange={(e) => setAgreedToPolicy(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-accent"
              />
              <span className="text-sm text-ink">
                I have read the instructions and malpractice policy above and
                agree to follow them.
              </span>
            </label>

            <Button
              onClick={beginExam}
              disabled={!agreedToPolicy || !webcamActive}
              className="w-full"
            >
              <Maximize size={16} /> Begin exam in fullscreen
            </Button>
          </Card>
        </div>
      </ExamPageShell>
    );
  }

  if (attemptMutation.isPending || !attemptMutation.data) {
    return (
      <ExamPageShell>
        <FullPageLoader label="Starting attempt..." />
      </ExamPageShell>
    );
  }

  const question = shuffledQuestions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = shuffledQuestions.length - answeredCount;
  const minutes =
    remainingMs !== null
      ? Math.max(0, Math.floor(remainingMs / 60000))
      : exam.duration_minutes;
  const seconds =
    remainingMs !== null
      ? Math.max(0, Math.floor((remainingMs % 60000) / 1000))
      : 0;
  const lowTime = remainingMs !== null && remainingMs < 60_000;
  const isMarked = question ? markedForReview.has(question.id) : false;

  return (
    <ExamPageShell>
      <div
        className="flex flex-col gap-6"
        onCopy={handleCopyOrPaste("copy_attempt")}
        onPaste={handleCopyOrPaste("paste_attempt")}
        onCut={handleCopyOrPaste("copy_attempt")}
      >
        {!webcamActive && (
          <video
            ref={attachVideoStream}
            autoPlay
            muted
            playsInline
            className="hidden"
          />
        )}
        {violationWarning && (
          <div className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-danger/30 bg-danger px-4 py-2.5 text-sm font-medium text-white shadow-glow-lg">
            <ShieldAlert size={16} /> {violationWarning}
          </div>
        )}
        {autoSubmitMessage && (
          <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-ink/90 backdrop-blur-sm">
            <Loader size="lg" />
            <p className="text-sm font-medium text-white">{autoSubmitMessage}</p>
          </div>
        )}
        {!isFullscreen && (
          <button
            onClick={reEnterFullscreen}
            className="flex items-center justify-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm font-medium text-warning transition-colors hover:bg-warning/15"
          >
            <Maximize size={15} /> You've left fullscreen — click to re-enter
          </button>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-semibold text-ink">
              {exam.title}
            </h1>
            <p className="mt-1 truncate text-sm text-ink-muted">
              Question {currentIndex + 1} of {shuffledQuestions.length} ·{" "}
              {answeredCount} answered
              {markedForReview.size > 0 && ` · ${markedForReview.size} marked`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {webcamActive && (
              <div className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-base-soft/60 p-1">
                <video
                  ref={attachVideoStream}
                  autoPlay
                  muted
                  playsInline
                  className="h-9 w-12 rounded-lg object-cover"
                />
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-danger" />
              </div>
            )}
            <div
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-xl border border-black/10 bg-base-soft/60 px-4 py-2 font-display text-lg font-semibold",
                lowTime ? "border-danger/50 text-danger" : "text-ink",
              )}
            >
              <Clock size={18} />
              {minutes}:{seconds.toString().padStart(2, "0")}
            </div>
            <Button
              onClick={() => setReviewOpen(true)}
              className="whitespace-nowrap"
            >
              <ListChecks size={16} /> Review & submit
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollPalette(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/5 text-ink-muted transition-colors hover:bg-black/10"
            aria-label="Scroll questions left"
          >
            <ChevronLeft size={16} />
          </button>
          <div
            ref={paletteRef}
            className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto scroll-smooth"
          >
            {shuffledQuestions.map((q, i) => (
              <button
                key={q.id}
                data-index={i}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-medium ring-2 ring-transparent transition-colors",
                  i === currentIndex && "ring-accent",
                  answers[q.id]
                    ? "bg-success/20 text-success"
                    : "bg-black/5 text-ink-muted hover:bg-black/10",
                )}
              >
                {i + 1}
                {markedForReview.has(q.id) && (
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-warning ring-2 ring-base" />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => scrollPalette(1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/5 text-ink-muted transition-colors hover:bg-black/10"
            aria-label="Scroll questions right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-faint">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success/60" /> Answered
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-black/15" /> Not
            answered
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-warning" /> Marked
          </span>
        </div>

        {question && (
          <Card className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <p className="text-base font-medium text-ink">
                {question.question_text}
              </p>
              <span className="shrink-0 rounded-full bg-black/5 px-2.5 py-1 text-xs text-ink-faint">
                {question.points} pt{question.points === 1 ? "" : "s"}
              </span>
            </div>
            <QuestionRenderer
              question={question}
              value={answers[question.id]}
              onChange={(value) =>
                setAnswers((prev) => ({ ...prev, [question.id]: value }))
              }
            />
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleMark(question.id)}
                className={cn(
                  "flex w-fit items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isMarked
                    ? "bg-warning/15 text-warning"
                    : "text-ink-muted hover:bg-black/5 hover:text-ink",
                )}
              >
                <Flag size={14} className={isMarked ? "fill-warning" : ""} />
                {isMarked ? "Marked for review" : "Mark for review"}
              </button>
              <button
                onClick={() => setReportOpen(true)}
                className="flex w-fit items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-black/5 hover:text-ink"
              >
                <MessageSquareWarning size={14} />
                Report question
              </button>
            </div>
          </Card>
        )}
        {question && (
          <ReportQuestionModal
            questionId={question.id}
            answer={answers[question.id]}
            open={reportOpen}
            onClose={() => setReportOpen(false)}
          />
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft size={16} /> Previous
          </Button>
          {currentIndex < shuffledQuestions.length - 1 ? (
            <Button
              onClick={() =>
                setCurrentIndex((i) =>
                  Math.min(shuffledQuestions.length - 1, i + 1),
                )
              }
            >
              Next <ChevronRight size={16} />
            </Button>
          ) : (
            <Button onClick={() => setReviewOpen(true)}>
              <CheckCircle2 size={16} /> Submit exam
            </Button>
          )}
        </div>
        {submitMutation.isPending && <Loader label="Submitting..." />}

        <Modal
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          title="Review before submitting"
        >
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 text-sm">
              <span className="text-success">{answeredCount} answered</span>
              <span className="text-ink-muted">
                {unansweredCount} unanswered
              </span>
              {markedForReview.size > 0 && (
                <span className="text-warning">
                  {markedForReview.size} marked
                </span>
              )}
            </div>

            <div className="grid max-h-72 grid-cols-6 gap-2 overflow-y-auto pr-1">
              {shuffledQuestions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIndex(i);
                    setReviewOpen(false);
                  }}
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium",
                    answers[q.id]
                      ? "bg-success/20 text-success"
                      : "bg-black/5 text-ink-muted",
                  )}
                >
                  {i + 1}
                  {markedForReview.has(q.id) && (
                    <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-warning ring-2 ring-base" />
                  )}
                </button>
              ))}
            </div>

            {unansweredCount > 0 && (
              <p className="text-sm text-ink-muted">
                You have {unansweredCount} unanswered question
                {unansweredCount === 1 ? "" : "s"}. You can still submit —
                they'll be scored as incorrect.
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setReviewOpen(false)}>
                Continue exam
              </Button>
              <Button
                onClick={handleSubmit}
                isLoading={submitMutation.isPending}
              >
                <CheckCircle2 size={16} /> Submit exam
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ExamPageShell>
  );
}
