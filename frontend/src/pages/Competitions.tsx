import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LogIn, Swords, Users2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { fetchExams } from "../lib/exams";
import { createCompetition, joinCompetition } from "../lib/competitions";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Loader } from "../components/ui/Loader";

export function Competitions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  const [examId, setExamId] = useState<string>("");
  const [timeLimit, setTimeLimit] = useState(20);
  const [code, setCode] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ["exams-all"],
    queryFn: () => fetchExams(),
    enabled: isAdmin,
  });
  const mcqExams = (exams ?? []).filter((e) => e.is_published);

  const createMutation = useMutation({
    mutationFn: () => createCompetition(Number(examId), timeLimit),
    onSuccess: (room) => navigate(`/competitions/${room.id}`),
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Could not create room.";
      setCreateError(message);
    },
  });

  const joinMutation = useMutation({
    mutationFn: () => joinCompetition(code.trim().toUpperCase()),
    onSuccess: (room) => navigate(`/competitions/${room.id}`),
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Could not join room.";
      setJoinError(message);
    },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          <Swords size={24} className="text-accent-soft" /> Live competition
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Kahoot-style live quiz — join a room with a code, or host one from an existing exam's questions.
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
          <LogIn size={16} /> Join with a code
        </h2>
        <div className="flex gap-3">
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setJoinError(null);
            }}
            placeholder="e.g. RFQWTR"
            maxLength={6}
            className="flex-1 uppercase tracking-widest"
          />
          <Button
            onClick={() => joinMutation.mutate()}
            disabled={code.trim().length < 4}
            isLoading={joinMutation.isPending}
          >
            Join
          </Button>
        </div>
        {joinError && <p className="text-sm text-danger">{joinError}</p>}
      </Card>

      {isAdmin && (
        <Card className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
            <Users2 size={16} /> Host a competition
          </h2>
          {examsLoading ? (
            <Loader label="Loading exams..." />
          ) : (
            <>
              <Select value={examId} onChange={(e) => setExamId(e.target.value)}>
                <option value="">Select a published exam...</option>
                {mcqExams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title} ({exam.question_count} questions)
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                label="Seconds per question"
                min={5}
                max={120}
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
              />
              {createError && <p className="text-sm text-danger">{createError}</p>}
              <Button onClick={() => createMutation.mutate()} disabled={!examId} isLoading={createMutation.isPending}>
                Create room
              </Button>
              <p className="text-xs text-ink-faint">
                Only the exam's MCQ questions are used — other question types (MAQ, match, coding, fill-in-the-blank)
                are skipped for live play.
              </p>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
