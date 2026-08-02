import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import type { CodingLanguage } from "../../types/api";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { STARTER_SKELETONS, type ExamFormValues } from "./types";

const TYPE_LABELS: Record<ExamFormValues["questions"][number]["type"], string> = {
  mcq: "Multiple choice (single answer)",
  maq: "Multiple choice (multiple answers)",
  match: "Match the following",
  fill_blank: "Fill in the blank",
  coding: "Coding (LeetCode style)",
};

const LANGUAGE_LABELS: Record<CodingLanguage, string> = {
  python: "Python",
  java: "Java",
  cpp: "C++",
};

export function QuestionEditor({ qIndex, onRemove }: { qIndex: number; onRemove: () => void }) {
  const { register, control, watch, setValue } = useFormContext<ExamFormValues>();
  const type = watch(`questions.${qIndex}.type`);

  const optionsArray = useFieldArray({ control, name: `questions.${qIndex}.options` });
  const pairsArray = useFieldArray({ control, name: `questions.${qIndex}.match_pairs` });
  const testCasesArray = useFieldArray({ control, name: `questions.${qIndex}.test_cases` });

  const options = watch(`questions.${qIndex}.options`) ?? [];
  const languages = watch(`questions.${qIndex}.languages`) ?? [];

  function markCorrect(optIndex: number) {
    options.forEach((_, i) => setValue(`questions.${qIndex}.options.${i}.is_correct`, i === optIndex));
  }

  function toggleLanguage(lang: CodingLanguage, checked: boolean) {
    const next = checked ? [...languages, lang] : languages.filter((l) => l !== lang);
    setValue(`questions.${qIndex}.languages`, next);
    if (checked && !watch(`questions.${qIndex}.starter_code.${lang}`)) {
      setValue(`questions.${qIndex}.starter_code.${lang}`, STARTER_SKELETONS[lang]);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-black/10 bg-base-soft/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="mt-2 shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent-soft">
          Q{qIndex + 1}
        </span>
        <div className="flex-1">
          <Input
            placeholder="Question text"
            {...register(`questions.${qIndex}.question_text`, { required: true })}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="mt-2 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select label="Type" {...register(`questions.${qIndex}.type`)}>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input
          label="Points"
          type="number"
          step="0.5"
          min="0.5"
          {...register(`questions.${qIndex}.points`, { valueAsNumber: true, required: true, min: 0.5 })}
        />
      </div>

      {(type === "mcq" || type === "maq") && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Options {type === "mcq" ? "(select the one correct answer)" : "(check all correct answers)"}
          </p>
          {optionsArray.fields.map((field, optIndex) => (
            <div key={field.id} className="flex items-center gap-2">
              <input
                type={type === "mcq" ? "radio" : "checkbox"}
                name={`q${qIndex}-correct`}
                checked={options[optIndex]?.is_correct ?? false}
                onChange={(e) =>
                  type === "mcq"
                    ? markCorrect(optIndex)
                    : setValue(`questions.${qIndex}.options.${optIndex}.is_correct`, e.target.checked)
                }
                className="h-4 w-4 shrink-0 accent-accent"
              />
              <Input
                className="flex-1"
                placeholder={`Option ${optIndex + 1}`}
                {...register(`questions.${qIndex}.options.${optIndex}.option_text`, { required: true })}
              />
              <button
                type="button"
                onClick={() => optionsArray.remove(optIndex)}
                className="rounded-lg p-1.5 text-ink-faint hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            className="w-fit"
            onClick={() => optionsArray.append({ option_text: "", is_correct: false, order: optionsArray.fields.length })}
          >
            <Plus size={14} /> Add option
          </Button>
        </div>
      )}

      {type === "match" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Pairs</p>
          {pairsArray.fields.map((field, pIndex) => (
            <div key={field.id} className="flex items-center gap-2">
              <Input
                className="flex-1"
                placeholder="Left"
                {...register(`questions.${qIndex}.match_pairs.${pIndex}.left_text`, { required: true })}
              />
              <span className="text-ink-faint">↔</span>
              <Input
                className="flex-1"
                placeholder="Right"
                {...register(`questions.${qIndex}.match_pairs.${pIndex}.right_text`, { required: true })}
              />
              <button
                type="button"
                onClick={() => pairsArray.remove(pIndex)}
                className="rounded-lg p-1.5 text-ink-faint hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            className="w-fit"
            onClick={() => pairsArray.append({ left_text: "", right_text: "", order: pairsArray.fields.length })}
          >
            <Plus size={14} /> Add pair
          </Button>
        </div>
      )}

      {type === "fill_blank" && (
        <Input
          label="Accepted answers (comma-separated)"
          placeholder="e.g. stack, Stack"
          {...register(`questions.${qIndex}.fill_blank_answers_csv`, { required: true })}
        />
      )}

      {type === "coding" && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">Allowed languages</p>
            <div className="flex gap-4">
              {(Object.keys(LANGUAGE_LABELS) as CodingLanguage[]).map((lang) => (
                <label key={lang} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={languages.includes(lang)}
                    onChange={(e) => toggleLanguage(lang, e.target.checked)}
                    className="h-4 w-4 accent-accent"
                  />
                  {LANGUAGE_LABELS[lang]}
                </label>
              ))}
            </div>
          </div>

          {languages.map((lang) => (
            <div key={lang} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                {LANGUAGE_LABELS[lang]} starter code
              </label>
              <textarea
                rows={6}
                {...register(`questions.${qIndex}.starter_code.${lang}`)}
                className="w-full rounded-xl border border-black/10 bg-base-soft/60 px-4 py-2.5 font-mono text-sm text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              />
            </div>
          ))}

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Test cases (stdin → expected stdout)
            </p>
            {testCasesArray.fields.map((field, tIndex) => (
              <div key={field.id} className="flex flex-col gap-2 rounded-lg border border-black/10 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Input (stdin)"
                    {...register(`questions.${qIndex}.test_cases.${tIndex}.input`)}
                  />
                  <Input
                    placeholder="Expected output"
                    {...register(`questions.${qIndex}.test_cases.${tIndex}.expected_output`, { required: true })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-ink-muted">
                    <input
                      type="checkbox"
                      {...register(`questions.${qIndex}.test_cases.${tIndex}.is_sample`)}
                      className="h-4 w-4 accent-accent"
                    />
                    Visible to students as a sample
                  </label>
                  <button
                    type="button"
                    onClick={() => testCasesArray.remove(tIndex)}
                    className="rounded-lg p-1.5 text-ink-faint hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              className="w-fit"
              onClick={() => testCasesArray.append({ input: "", expected_output: "", is_sample: false })}
            >
              <Plus size={14} /> Add test case
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
