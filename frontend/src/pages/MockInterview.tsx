import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Briefcase, Mic, MicOff, ThumbsUp, TrendingUp, Volume2 } from "lucide-react";
import { fetchAiStatus, fetchInterviewFeedback, fetchInterviewQuestion } from "../lib/ai";
import type { InterviewFeedbackResult, InterviewQAPair } from "../types/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { ComingSoon } from "../components/ui/ComingSoon";
import { Loader, FullPageLoader } from "../components/ui/Loader";

const QUESTION_COUNT = 5;

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
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
      speak(result.question);
    } catch {
      setError("Could not reach Xipe. Try again.");
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
    } catch {
      setError("Could not reach Xipe. Try again.");
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

  if (status?.enabled === false) {
    return (
      <div className="mx-auto max-w-2xl">
        <ComingSoon
          title="Coming soon"
          description="AI mock interviews aren't available in this environment yet — it's on the way in a future release."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
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
          <Input
            label="Job role"
            placeholder="e.g. Backend Engineer, Data Scientist, Product Manager"
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
        <Card className="flex flex-col gap-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
            Question {history.length + 1} of {QUESTION_COUNT}
          </p>

          {isFetchingQuestion && <Loader label="Xipe is preparing your next question..." />}

          {currentQuestion && !isFetchingQuestion && (
            <>
              <div className="flex items-start gap-2 rounded-xl border border-black/10 bg-base-soft/60 p-4">
                <Volume2 size={16} className="mt-0.5 shrink-0 text-accent-soft" />
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
      )}

      {stage === "feedback" && (
        <Card className="flex flex-col gap-4">
          {isFetchingFeedback && <Loader label="Xipe is reviewing your interview..." />}

          {error && !isFetchingFeedback && <p className="text-sm text-danger">{error}</p>}

          {feedback && !isFetchingFeedback && !error && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent-soft">
                  <Award size={22} />
                </div>
                <div>
                  <p className="font-display text-lg font-semibold text-ink">{feedback.score} / 10</p>
                  <p className="text-xs text-ink-muted">Overall interview score</p>
                </div>
              </div>

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
