import type { CodingLanguage, QuestionInput, QuestionType } from "../../types/api";

export interface CodingTestCaseFormValues {
  input: string;
  expected_output: string;
  is_sample: boolean;
}

export interface QuestionFormValues {
  type: QuestionType;
  question_text: string;
  points: number;
  options: { option_text: string; is_correct: boolean; order: number }[];
  match_pairs: { left_text: string; right_text: string; order: number }[];
  fill_blank_answers_csv: string;
  languages: CodingLanguage[];
  starter_code: Partial<Record<CodingLanguage, string>>;
  test_cases: CodingTestCaseFormValues[];
}

export interface ExamFormValues {
  title: string;
  description: string;
  duration_minutes: number;
  available_from: string;
  available_until: string;
  questions: QuestionFormValues[];
}

export const STARTER_SKELETONS: Record<CodingLanguage, string> = {
  python: "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    # TODO: solve\n    print()\n\nif __name__ == \"__main__\":\n    main()\n",
  java: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // TODO: solve\n    }\n}\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // TODO: solve\n    return 0;\n}\n",
};

export function blankQuestion(): QuestionFormValues {
  return {
    type: "mcq",
    question_text: "",
    points: 1,
    options: [
      { option_text: "", is_correct: true, order: 0 },
      { option_text: "", is_correct: false, order: 1 },
    ],
    match_pairs: [],
    fill_blank_answers_csv: "",
    languages: [],
    starter_code: {},
    test_cases: [{ input: "", expected_output: "", is_sample: true }],
  };
}

export function fromGeneratedQuestion(q: QuestionInput): QuestionFormValues {
  return {
    type: q.type,
    question_text: q.question_text,
    points: q.points,
    options: q.options.map((o, i) => ({ ...o, order: i })),
    match_pairs: q.match_pairs.map((p, i) => ({ ...p, order: i })),
    fill_blank_answers_csv: (q.fill_blank_answers[0]?.accepted_answers ?? []).join(", "),
    languages: q.languages,
    starter_code: q.starter_code,
    test_cases: q.test_cases.map((tc) => ({
      input: tc.input,
      expected_output: tc.expected_output,
      is_sample: tc.is_sample,
    })),
  };
}

export function toCreatePayload(values: ExamFormValues, subjectId: number) {
  return {
    subject_id: subjectId,
    title: values.title,
    description: values.description || null,
    duration_minutes: Number(values.duration_minutes),
    available_from: values.available_from ? new Date(values.available_from).toISOString() : null,
    available_until: values.available_until ? new Date(values.available_until).toISOString() : null,
    questions: values.questions.map((q, order) => ({
      type: q.type,
      question_text: q.question_text,
      order,
      points: Number(q.points),
      options: q.type === "mcq" || q.type === "maq" ? q.options.map((o, i) => ({ ...o, order: i })) : [],
      match_pairs: q.type === "match" ? q.match_pairs.map((p, i) => ({ ...p, order: i })) : [],
      fill_blank_answers:
        q.type === "fill_blank"
          ? [
              {
                blank_index: 0,
                accepted_answers: q.fill_blank_answers_csv
                  .split(",")
                  .map((a) => a.trim())
                  .filter(Boolean),
              },
            ]
          : [],
      languages: q.type === "coding" ? q.languages : [],
      starter_code: q.type === "coding" ? q.starter_code : {},
      test_cases:
        q.type === "coding"
          ? q.test_cases.map((tc, i) => ({ ...tc, order: i }))
          : [],
    })),
  };
}
