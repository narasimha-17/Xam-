import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Bot,
  Briefcase,
  Info,
  ListChecks,
  Mic,
  MicOff,
  ThumbsUp,
  TrendingUp,
  Volume2,
} from "lucide-react";
import { fetchAiStatus, fetchInterviewFeedback, fetchInterviewQuestion } from "../lib/ai";
import type { InterviewFeedbackResult, InterviewQAPair } from "../types/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Loader, FullPageLoader } from "../components/ui/Loader";
import { cn } from "../lib/utils";

const QUESTION_COUNT = 5;

function extractErrorMessage(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? fallback;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function speak(text: string, onStart: () => void, onEnd: () => void) {
  if (!("speechSynthesis" in window)) {
    onEnd();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.onstart = onStart;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
}

function XipeAvatar({ isSpeaking, isListening }: { isSpeaking: boolean; isListening: boolean }) {
  const label = isSpeaking ? "Speaking..." : isListening ? "Listening..." : "Waiting for your answer";
  return (
    <Card className="flex w-full shrink-0 flex-col items-center justify-center gap-4 py-10 md:w-56">
      <div className="relative flex h-28 w-28 items-center justify-center">
        {isSpeaking && (
          <>
            <span className="absolute inset-0 rounded-full bg-accent/25 animate-pulse-glow" />
            <span
              className="absolute inset-[-10px] rounded-full border-2 border-accent/30 animate-pulse-glow"
              style={{ animationDelay: "0.3s" }}
            />
          </>
        )}
        {isListening && <span className="absolute inset-0 rounded-full bg-accent-soft/25 animate-pulse-glow" />}
        <div
          className={cn(
            "relative flex h-24 w-24 items-center justify-center rounded-full text-white shadow-glow transition-colors duration-300",
            isSpeaking ? "bg-accent" : isListening ? "bg-accent-soft" : "bg-ink/70",
          )}
        >
          <Bot size={42} strokeWidth={1.5} />
        </div>
      </div>
      <div className="text-center">
        <p className="font-display text-sm font-semibold text-ink">Xipe</p>
        <p className="mt-0.5 text-xs text-ink-muted">{label}</p>
      </div>
    </Card>
  );
}

export function MockInterview() {
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["ai-status"],
    queryFn: fetchAiStatus,
    staleTime: 5 * 60_000,
  });

  const [jobRole, setJobRole] = useState("");
  const [stage, setStage] = useState<"setup" | "interview" | "feedback">("setup");
  const [history, setHistory] = useState<InterviewQAPair[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isFetchingQuestion, setIsFetchingQuestion] = useState(false);
  const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);
  const [feedback, setFeedback] = useState<InterviewFeedbackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechSupported = typeof window !== "undefined" && getSpeechRecognitionCtor() !== null;

  const loadQuestion = useCallback(async (nextHistory: InterviewQAPair[]) => {
    setIsFetchingQuestion(true);
    setError(null);
    try {
      const result = await fetchInterviewQuestion({ job_role: jobRole.trim(), history: nextHistory });
      if (result.error || !result.question) {
        setError(result.error ?? "Xipe couldn't come up with a question. Try again.");
        return;
      }
      setCurrentQuestion(result.question);
      speak(
        result.question,
        () => setIsSpeaking(true),
        () => setIsSpeaking(false),
      );
    } catch (err) {
      setError(extractErrorMessage(err, "Could not reach Xipe. Try again."));
    } finally {
      setIsFetchingQuestion(false);
    }
  }, [jobRole]);

  async function handleStart() {
    if (!jobRole.trim()) return;
    setHistory([]);
    setFeedback(null);
    setStage("interview");
    await loadQuestion([]);
  }

  function startRecording() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
      }
      if (finalText) {
        setTranscript((prev) => (prev ? `${prev} ${finalText}` : finalText).trim());
      }
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    setIsRecording(true);
    recognition.start();
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }

  async function finishInterview(finalHistory: InterviewQAPair[]) {
    setStage("feedback");
    setIsFetchingFeedback(true);
    setError(null);
    try {
      const result = await fetchInterviewFeedback({ job_role: jobRole.trim(), history: finalHistory });
      if (result.error) {
        setError(result.error);
        return;
      }
      setFeedback(result);
    } catch (err) {
      setError(extractErrorMessage(err, "Could not reach Xipe. Try again."));
    } finally {
      setIsFetchingFeedback(false);
    }
  }

  async function handleSubmitAnswer() {
    if (!currentQuestion || !transcript.trim()) return;
    const nextHistory = [...history, { question: currentQuestion, answer: transcript.trim() }];
    setHistory(nextHistory);
    setTranscript("");
    setCurrentQuestion(null);
    if (nextHistory.length >= QUESTION_COUNT) {
      await finishInterview(nextHistory);
    } else {
      await loadQuestion(nextHistory);
    }
  }

  function handleRestart() {
    setStage("setup");
    setJobRole("");
    setHistory([]);
    setCurrentQuestion(null);
    setTranscript("");
    setFeedback(null);
    setError(null);
  }

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  if (statusLoading) return <FullPageLoader label="Loading..." />;

  const aiDisabled = status?.enabled === false;
  const marqueeText =
    "This is a mock / demo experience — curated sample questions, not live AI grading. The full AI-powered mock interview launches in Version 2.";

  return (
    <div className={cn("mx-auto flex flex-col gap-6", stage === "interview" ? "max-w-4xl" : "max-w-2xl")}>
      <div className="overflow-hidden rounded-full border border-accent/20 bg-accent/10">
        <div className="flex w-max animate-marquee whitespace-nowrap py-1.5">
          {[0, 1].map((i) => (
            <span key={i} className="flex items-center px-4 text-xs font-medium text-accent-dim">
              {marqueeText}
              <span className="mx-4 text-accent-soft" aria-hidden="true">
                &bull;
              </span>
            </span>
          ))}
        </div>
      </div>

      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          <Briefcase size={24} className="text-accent-soft" /> AI mock interview
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Practice a {QUESTION_COUNT}-question voice interview for any job role, with feedback from Xipe at the end.
        </p>
      </div>

      {stage === "setup" && (
        <Card className="flex flex-col gap-4">
          {aiDisabled && (
            <div className="flex gap-2.5 rounded-xl border border-accent/20 bg-accent/5 p-3 text-sm text-ink-muted">
              <Info size={16} className="mt-0.5 shrink-0 text-accent-soft" />
              <p>
                Full AI-generated interviews aren't available in this environment. Try{" "}
                <span className="font-medium text-ink">"AI/ML Engineer"</span> for a fully working sample interview
                with curated questions and a self-review guide at the end.
              </p>
            </div>
          )}
          <Input
            label="Job role"
            placeholder="e.g. AI/ML Engineer, Backend Engineer, Data Scientist"
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value)}
          />
          {!speechSupported && (
            <p className="text-xs text-warning">
              Your browser doesn't support voice recognition — you can still type your answers instead.
            </p>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button onClick={handleStart} disabled={!jobRole.trim()} className="w-fit">
            Start interview
          </Button>
        </Card>
      )}

      {stage === "interview" && (
        <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
          <XipeAvatar isSpeaking={isSpeaking} isListening={isRecording} />

          <Card className="flex flex-1 flex-col gap-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              Question {history.length + 1} of {QUESTION_COUNT}
            </p>

            {isFetchingQuestion && <Loader label="Xipe is preparing your next question..." />}

            {currentQuestion && !isFetchingQuestion && (
              <>
                <div
                  className={cn(
                    "flex items-start gap-2 rounded-xl border p-4 transition-colors",
                    isSpeaking ? "border-accent/30 bg-accent/5" : "border-black/10 bg-base-soft/60",
                  )}
                >
                  <Volume2
                    size={16}
                    className={cn("mt-0.5 shrink-0", isSpeaking ? "text-accent" : "text-accent-soft")}
                  />
                  <p className="text-sm font-medium text-ink">{currentQuestion}</p>
                </div>

                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={speechSupported ? "Click record and speak your answer, or type it here..." : "Type your answer..."}
                  rows={5}
                  className="w-full rounded-xl border border-black/10 bg-base-soft/60 px-4 py-3 text-sm text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                />

                <div className="flex items-center gap-2">
                  {speechSupported && (
                    <Button
                      type="button"
                      variant={isRecording ? "outline" : "primary"}
                      onClick={isRecording ? stopRecording : startRecording}
                    >
                      {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                      {isRecording ? "Stop recording" : "Record answer"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleSubmitAnswer}
                    disabled={!transcript.trim()}
                    className={speechSupported ? "" : "w-fit"}
                  >
                    {history.length + 1 === QUESTION_COUNT ? "Finish interview" : "Submit answer"}
                  </Button>
                </div>
              </>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}
          </Card>
        </div>
      )}

      {stage === "feedback" && (
        <Card className="flex flex-col gap-4">
          {isFetchingFeedback && <Loader label="Xipe is reviewing your interview..." />}

          {error && !isFetchingFeedback && <p className="text-sm text-danger">{error}</p>}

          {feedback && !isFetchingFeedback && !error && (
            <>
              {feedback.is_sample ? (
                <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent-soft w-fit">
                  <ListChecks size={13} /> Sample feedback — self-review, not AI-graded
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent-soft">
                    <Award size={22} />
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold text-ink">{feedback.score} / 10</p>
                    <p className="text-xs text-ink-muted">Overall interview score</p>
                  </div>
                </div>
              )}

              <p className="text-sm text-ink-muted">{feedback.overall_feedback}</p>

              {feedback.strengths.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    <ThumbsUp size={13} /> Strengths
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
                    {feedback.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.improvements.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    <TrendingUp size={13} /> Areas to improve
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
                    {feedback.improvements.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.key_points.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    <ListChecks size={13} /> What a strong answer would cover
                  </h3>
                  {feedback.key_points.map((kp, i) => (
                    <div key={i} className="rounded-xl border border-black/10 bg-base-soft/40 p-3">
                      <p className="text-sm font-medium text-ink">{kp.question}</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
                        {kp.points.map((p, pi) => (
                          <li key={pi}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <Button variant="outline" onClick={handleRestart} className="w-fit">
            Start a new interview
          </Button>
        </Card>
      )}
    </div>
  );
}
