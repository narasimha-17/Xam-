import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Power, Puzzle as PuzzleIcon, Trash2 } from "lucide-react";
import {
  createPuzzle,
  deletePuzzle,
  fetchAdminPuzzles,
  togglePuzzleActive,
  updatePuzzle,
} from "../../lib/puzzles";
import type { PuzzleAdmin as PuzzleAdminType } from "../../types/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Loader } from "../../components/ui/Loader";
import { cn } from "../../lib/utils";

interface PuzzleFormValues {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_index: number;
  explanation: string;
  difficulty: string;
}

function toFormValues(p?: PuzzleAdminType | null): PuzzleFormValues {
  return {
    question_text: p?.question_text ?? "",
    option_a: p?.options[0] ?? "",
    option_b: p?.options[1] ?? "",
    option_c: p?.options[2] ?? "",
    option_d: p?.options[3] ?? "",
    correct_index: p?.correct_index ?? 0,
    explanation: p?.explanation ?? "",
    difficulty: p?.difficulty ?? "medium",
  };
}

export function PuzzleAdmin() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PuzzleAdminType | null>(null);
  const [puzzleToDelete, setPuzzleToDelete] = useState<PuzzleAdminType | null>(null);

  const { data: puzzles, isLoading } = useQuery({ queryKey: ["puzzles-admin"], queryFn: fetchAdminPuzzles });

  const { register, handleSubmit, reset } = useForm<PuzzleFormValues>({ defaultValues: toFormValues() });

  function openCreate() {
    setEditing(null);
    reset(toFormValues());
    setModalOpen(true);
  }

  function openEdit(p: PuzzleAdminType) {
    setEditing(p);
    reset(toFormValues(p));
    setModalOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (values: PuzzleFormValues) => {
      const payload = {
        question_text: values.question_text,
        options: [values.option_a, values.option_b, values.option_c, values.option_d].filter(Boolean),
        correct_index: Number(values.correct_index),
        explanation: values.explanation || null,
        difficulty: values.difficulty,
      };
      return editing ? updatePuzzle(editing.id, payload) : createPuzzle(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["puzzles-admin"] });
      setModalOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => togglePuzzleActive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["puzzles-admin"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePuzzle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["puzzles-admin"] });
      setPuzzleToDelete(null);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
            <PuzzleIcon size={24} className="text-accent-soft" /> Puzzle bank
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Manage the riddle/logic/math questions used for the daily puzzle streak.
          </p>
        </div>
        <Button onClick={openCreate} className="w-fit shrink-0">
          <Plus size={16} /> Add puzzle
        </Button>
      </div>

      {isLoading && <Loader className="py-16" label="Loading puzzles..." />}
      {!isLoading && puzzles?.length === 0 && (
        <Card className="py-16 text-center text-sm text-ink-muted">No puzzles yet.</Card>
      )}

      <div className="flex flex-col gap-3">
        {puzzles?.map((p) => (
          <Card key={p.id} className={cn("flex items-start justify-between gap-4", !p.is_active && "opacity-60")}>
            <button className="flex-1 text-left" onClick={() => openEdit(p)}>
              <p className="text-sm font-medium text-ink">{p.question_text}</p>
              <div className="mt-1 flex items-center gap-3 text-xs text-ink-faint">
                <span className="rounded-full bg-accent/10 px-2 py-0.5 capitalize text-accent-soft">
                  {p.difficulty}
                </span>
                {!p.is_active && <span className="text-warning">Inactive</span>}
              </div>
            </button>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => toggleMutation.mutate(p.id)}
                className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-accent/10 hover:text-accent-soft"
                aria-label={p.is_active ? "Deactivate" : "Activate"}
                title={p.is_active ? "Deactivate" : "Activate"}
              >
                <Power size={16} />
              </button>
              <button
                onClick={() => setPuzzleToDelete(p)}
                className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger"
                aria-label={`Delete puzzle`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit puzzle" : "Add puzzle"}>
        <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} className="flex flex-col gap-3">
          <Textarea placeholder="Question text" rows={2} {...register("question_text", { required: true })} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Option A" {...register("option_a", { required: true })} />
            <Input placeholder="Option B" {...register("option_b", { required: true })} />
            <Input placeholder="Option C" {...register("option_c")} />
            <Input placeholder="Option D" {...register("option_d")} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-ink-muted">Correct option index (0-based):</label>
            <input
              type="number"
              min={0}
              max={3}
              className="w-16 rounded-lg border border-black/10 px-2 py-1 text-sm"
              {...register("correct_index", { valueAsNumber: true })}
            />
          </div>
          <Select label="Difficulty" {...register("difficulty")}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
          <Textarea placeholder="Explanation (optional)" rows={2} {...register("explanation")} />
          <Button type="submit" isLoading={saveMutation.isPending} className="w-full">
            {editing ? "Save changes" : "Add puzzle"}
          </Button>
        </form>
      </Modal>

      <Modal open={puzzleToDelete !== null} onClose={() => setPuzzleToDelete(null)} title="Delete puzzle?">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            This will permanently delete this puzzle and any students' past attempts on it. This can't be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setPuzzleToDelete(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => puzzleToDelete && deleteMutation.mutate(puzzleToDelete.id)}
              isLoading={deleteMutation.isPending}
              className="bg-danger hover:bg-danger/90"
            >
              <Trash2 size={15} /> Delete puzzle
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
