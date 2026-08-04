import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { createExam } from "../../lib/exams";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { QuestionEditor } from "../../components/exam-builder/QuestionEditor";
import { AiGeneratePanel } from "../../components/exam-builder/AiGeneratePanel";
import {
  blankQuestion,
  toCreatePayload,
  type ExamFormValues,
  type QuestionFormValues,
} from "../../components/exam-builder/types";
import { Link } from "react-router-dom";

export function ExamBuilder() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const subjectIdNum = Number(subjectId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const methods = useForm<ExamFormValues>({
    defaultValues: {
      title: "",
      description: "",
      duration_minutes: 30,
      available_from: "",
      available_until: "",
      questions_to_serve: "",
      questions: [blankQuestion()],
    },
  });
  const { register, handleSubmit, control } = methods;
  const questionsArray = useFieldArray({ control, name: "questions" });

  const createMutation = useMutation({
    mutationFn: (values: ExamFormValues) => createExam(toCreatePayload(values, subjectIdNum)),
    onSuccess: (exam) => {
      queryClient.invalidateQueries({ queryKey: ["exams", subjectIdNum] });
      navigate(`/subjects/${subjectIdNum}?examCreated=${exam.id}`);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={`/subjects/${subjectIdNum}`}
        className="flex w-fit items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to subject
      </Link>

      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">New exam</h1>
        <p className="mt-1 text-sm text-ink-muted">Build a practice exam with MCQ, MAQ, match, fill-in-the-blank, and coding questions.</p>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit((values) => createMutation.mutate(values))} className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4">
            <Input label="Title" placeholder="e.g. Arrays & Stacks Quiz" {...register("title", { required: true })} />
            <Textarea label="Description" rows={2} placeholder="Optional" {...register("description")} />
            <Input
              label="Duration (minutes)"
              type="number"
              min="1"
              {...register("duration_minutes", { valueAsNumber: true, required: true, min: 1 })}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Available from (optional)"
                type="datetime-local"
                {...register("available_from")}
              />
              <Input
                label="Available until (optional)"
                type="datetime-local"
                {...register("available_until")}
              />
            </div>
            <p className="-mt-2 text-xs text-ink-faint">Leave both blank for an exam that's always open once published.</p>

            <Input
              label="Questions to serve per student (optional)"
              type="number"
              min="1"
              placeholder={`Leave blank to serve all ${questionsArray.fields.length} written questions`}
              {...register("questions_to_serve", { min: 1 })}
            />
            <p className="-mt-2 text-xs text-ink-faint">
              Write more questions than this number to give each student a random subset in a random order — useful
              so a room full of students isn't all looking at the same question set.
            </p>
          </Card>

          <AiGeneratePanel
            subjectId={subjectIdNum}
            onGenerated={(generated: QuestionFormValues[]) => generated.forEach((q) => questionsArray.append(q))}
          />

          <div className="flex flex-col gap-4">
            {questionsArray.fields.map((field, index) => (
              <QuestionEditor key={field.id} qIndex={index} onRemove={() => questionsArray.remove(index)} />
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={() => questionsArray.append(blankQuestion())}
          >
            <Plus size={16} /> Add question
          </Button>

          {createMutation.isError && <p className="text-sm text-danger">Could not save the exam. Check the fields and try again.</p>}

          <Button type="submit" isLoading={createMutation.isPending} className="w-fit">
            <Save size={16} /> Save exam
          </Button>
        </form>
      </FormProvider>
    </div>
  );
}
