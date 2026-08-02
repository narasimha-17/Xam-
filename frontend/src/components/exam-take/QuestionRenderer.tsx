import type { AnswerPayload, CodingAnswer, MatchAnswer, QuestionSafe } from "../../types/api";
import { CodingQuestion } from "./CodingQuestion";

interface Props {
  question: QuestionSafe;
  value: AnswerPayload | undefined;
  onChange: (value: AnswerPayload) => void;
}

export function QuestionRenderer({ question, value, onChange }: Props) {
  if (question.type === "coding") {
    return <CodingQuestion question={question} value={value as CodingAnswer} onChange={onChange} />;
  }

  if (question.type === "mcq") {
    const selected = (value as { selected_option_id?: number })?.selected_option_id;
    return (
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => (
          <label
            key={opt.id}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-l-4 border-black/10 border-l-transparent bg-base-soft/40 px-4 py-3 pl-3.5 transition-colors hover:border-accent/40 has-[:checked]:border-accent/60 has-[:checked]:border-l-accent has-[:checked]:bg-accent/10"
          >
            <input
              type="radio"
              name={`q-${question.id}`}
              checked={selected === opt.id}
              onChange={() => onChange({ selected_option_id: opt.id })}
              className="h-4 w-4 accent-accent"
            />
            <span className="text-sm text-ink">{opt.option_text}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "maq") {
    const selectedIds = (value as { selected_option_ids?: number[] })?.selected_option_ids ?? [];
    return (
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => {
          const checked = selectedIds.includes(opt.id);
          return (
            <label
              key={opt.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-l-4 border-black/10 border-l-transparent bg-base-soft/40 px-4 py-3 pl-3.5 transition-colors hover:border-accent/40 has-[:checked]:border-accent/60 has-[:checked]:border-l-accent has-[:checked]:bg-accent/10"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) =>
                  onChange({
                    selected_option_ids: e.target.checked
                      ? [...selectedIds, opt.id]
                      : selectedIds.filter((id) => id !== opt.id),
                  })
                }
                className="h-4 w-4 accent-accent"
              />
              <span className="text-sm text-ink">{opt.option_text}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (question.type === "match") {
    const pairs = (value as MatchAnswer)?.pairs ?? {};
    return (
      <div className="flex flex-col gap-3">
        {question.match_left.map((left) => (
          <div key={left.id} className="flex items-center gap-3">
            <span className="w-1/2 rounded-xl border border-black/10 bg-base-soft/40 px-4 py-2.5 text-sm text-ink">
              {left.text}
            </span>
            <select
              value={pairs[String(left.id)] ?? ""}
              onChange={(e) =>
                onChange({ pairs: { ...pairs, [String(left.id)]: Number(e.target.value) } })
              }
              className="w-1/2 rounded-xl border border-black/10 bg-base-soft/60 px-4 py-2.5 text-sm text-ink outline-none focus:border-accent/60"
            >
              <option value="">Select match...</option>
              {question.match_right.map((right) => (
                <option key={right.id} value={right.id}>
                  {right.text}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  // fill_blank
  const blanks = (value as { blanks?: Record<string, string> })?.blanks ?? {};
  return (
    <input
      type="text"
      value={blanks["0"] ?? ""}
      onChange={(e) => onChange({ blanks: { "0": e.target.value } })}
      placeholder="Type your answer"
      className="w-full rounded-xl border border-black/10 bg-base-soft/60 px-4 py-2.5 text-sm text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
    />
  );
}
