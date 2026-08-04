export type UserRole = "admin" | "student";

export interface User {
  id: number;
  email: string;
  full_name: string;
  roll_number: string | null;
  section: string | null;
  department: string | null;
  phone_number: string | null;
  location: string | null;
  institution: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Topic {
  id: number;
  subject_id: number;
  name: string;
}

export interface Subject {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  topics: Topic[];
  exam_count: number;
  pdf_count: number;
}

export interface Pdf {
  id: number;
  subject_id: number;
  topic_id: number | null;
  title: string;
  uploaded_by: number;
  uploaded_at: string;
}

// ---------- Exams: shared ----------

export type QuestionType = "mcq" | "maq" | "match" | "fill_blank" | "coding";

export type CodingLanguage = "python" | "java" | "cpp";

export interface ExamSummary {
  id: number;
  subject_id: number;
  topic_id: number | null;
  title: string;
  description: string | null;
  duration_minutes: number;
  questions_to_serve: number | null;
  is_published: boolean;
  available_from: string | null;
  available_until: string | null;
  question_count: number;
}

// ---------- Exams: admin (correct answers included) ----------

export interface QuestionOptionAdmin {
  id: number;
  option_text: string;
  is_correct: boolean;
  order: number;
}

export interface MatchPairAdmin {
  id: number;
  left_text: string;
  right_text: string;
  order: number;
}

export interface FillBlankAnswerAdmin {
  id: number;
  blank_index: number;
  accepted_answers: string[];
}

export interface TestCaseAdmin {
  id: number;
  input: string;
  expected_output: string;
  is_sample: boolean;
  order: number;
}

export interface QuestionAdmin {
  id: number;
  type: QuestionType;
  question_text: string;
  order: number;
  points: number;
  options: QuestionOptionAdmin[];
  match_pairs: MatchPairAdmin[];
  fill_blank_answers: FillBlankAnswerAdmin[];
  languages: CodingLanguage[] | null;
  starter_code: Partial<Record<CodingLanguage, string>> | null;
  test_cases: TestCaseAdmin[];
}

export interface ExamAdmin {
  id: number;
  subject_id: number;
  topic_id: number | null;
  title: string;
  description: string | null;
  duration_minutes: number;
  questions_to_serve: number | null;
  is_published: boolean;
  available_from: string | null;
  available_until: string | null;
  created_by: number;
  created_at: string;
  questions: QuestionAdmin[];
}

// ---------- Exams: create/edit payloads ----------

export interface QuestionOptionInput {
  option_text: string;
  is_correct: boolean;
  order: number;
}

export interface MatchPairInput {
  left_text: string;
  right_text: string;
  order: number;
}

export interface FillBlankAnswerInput {
  blank_index: number;
  accepted_answers: string[];
}

export interface TestCaseInput {
  input: string;
  expected_output: string;
  is_sample: boolean;
  order: number;
}

export interface QuestionInput {
  type: QuestionType;
  question_text: string;
  order: number;
  points: number;
  options: QuestionOptionInput[];
  match_pairs: MatchPairInput[];
  fill_blank_answers: FillBlankAnswerInput[];
  languages: CodingLanguage[];
  starter_code: Partial<Record<CodingLanguage, string>>;
  test_cases: TestCaseInput[];
}

export interface ExamCreateInput {
  subject_id: number;
  topic_id?: number | null;
  title: string;
  description?: string | null;
  duration_minutes: number;
  available_from?: string | null;
  available_until?: string | null;
  questions_to_serve?: number | null;
  questions: QuestionInput[];
}

// ---------- AI-assisted question drafting ----------

export interface GenerateQuestionsInput {
  subject_id: number;
  topic: string;
  question_type: QuestionType;
  count: number;
}

export interface GenerateQuestionsResult {
  questions: QuestionInput[];
  generated_count: number;
  rejected_count: number;
  error: string | null;
}

// ---------- Question reports ----------

export type QuestionReportReason = "wrong_answer" | "unclear_wording" | "typo" | "other";

export interface QuestionReportInput {
  reason: QuestionReportReason;
  comment?: string | null;
  submitted_answer?: Record<string, unknown> | null;
}

export interface QuestionReportResult {
  id: number;
  question_id: number;
  reason: QuestionReportReason;
  comment: string | null;
  created_at: string;
}

// ---------- AI topic / PDF explainer ----------

export interface ExplainExample {
  title: string;
  explanation: string;
}

export interface RelatedLink {
  label: string;
  url: string;
}

export interface TopicExplainInput {
  subject_id: number;
  topic: string;
}

export interface PdfExplainInput {
  pdf_id: number;
}

export interface ExplainResult {
  title: string;
  story: string;
  examples: ExplainExample[];
  related_links: RelatedLink[];
  error: string | null;
}

// ---------- AI mock interview ----------

export interface InterviewQAPair {
  question: string;
  answer: string;
}

export interface InterviewQuestionInput {
  job_role: string;
  history: InterviewQAPair[];
}

export interface InterviewQuestionResult {
  question: string | null;
  error: string | null;
}

export interface InterviewFeedbackInput {
  job_role: string;
  history: InterviewQAPair[];
}

export interface InterviewKeyPoints {
  question: string;
  points: string[];
}

export interface InterviewFeedbackResult {
  overall_feedback: string;
  strengths: string[];
  improvements: string[];
  score: number;
  is_sample: boolean;
  key_points: InterviewKeyPoints[];
  error: string | null;
}

export interface QuestionReportAdmin extends QuestionReportResult {
  question_text: string;
  exam_title: string;
  reported_by: string;
  your_answer: string | null;
  correct_answer: string | null;
}

// ---------- Proctoring ----------

export type ProctorEventType =
  | "tab_switch"
  | "fullscreen_exit"
  | "copy_attempt"
  | "paste_attempt"
  | "webcam_snapshot"
  | "screenshot_attempt"
  | "no_face_detected"
  | "multiple_faces";

export interface ProctorEventInput {
  event_type: ProctorEventType;
  snapshot_base64?: string | null;
}

export interface ProctorSummary {
  attempt_id: number;
  tab_switch_count: number;
  fullscreen_exit_count: number;
  copy_attempt_count: number;
  paste_attempt_count: number;
  webcam_snapshot_count: number;
  screenshot_attempt_count: number;
  no_face_detected_count: number;
  multiple_faces_count: number;
  total_events: number;
}

export interface ProctorEventAdmin {
  id: number;
  event_type: ProctorEventType;
  occurred_at: string;
  has_snapshot: boolean;
}

// ---------- Exams: student-safe (no correct answers) ----------

export interface QuestionOptionSafe {
  id: number;
  option_text: string;
  order: number;
}

export interface MatchItemSafe {
  id: number;
  text: string;
  order: number;
}

export interface TestCaseSample {
  id: number;
  input: string;
  expected_output: string;
}

export interface QuestionSafe {
  id: number;
  type: QuestionType;
  question_text: string;
  order: number;
  points: number;
  options: QuestionOptionSafe[];
  match_left: MatchItemSafe[];
  match_right: MatchItemSafe[];
  blank_count: number;
  languages: CodingLanguage[] | null;
  starter_code: Partial<Record<CodingLanguage, string>> | null;
  sample_test_cases: TestCaseSample[];
  hidden_test_case_count: number;
}

export interface ExamSafe {
  id: number;
  subject_id: number;
  topic_id: number | null;
  title: string;
  description: string | null;
  duration_minutes: number;
  questions_to_serve: number | null;
  is_published: boolean;
  questions: QuestionSafe[];
}

// ---------- Exams: attempts ----------

export type AttemptStatus = "in_progress" | "submitted";

export interface ExamAttempt {
  id: number;
  exam_id: number;
  user_id: number;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  max_score: number | null;
  status: AttemptStatus;
  flagged_question_ids: number[];
  current_index: number;
  saved_answers: AnswerIn[];
}

export interface McqAnswer {
  selected_option_id: number;
}

export interface MaqAnswer {
  selected_option_ids: number[];
}

export interface MatchAnswer {
  pairs: Record<string, number>;
}

export interface FillBlankAnswerPayload {
  blanks: Record<string, string>;
}

export interface CodingAnswer {
  language: CodingLanguage;
  code: string;
}

export type AnswerPayload = McqAnswer | MaqAnswer | MatchAnswer | FillBlankAnswerPayload | CodingAnswer;

export interface AnswerIn {
  question_id: number;
  answer: AnswerPayload;
}

export interface TestCaseRunResult {
  input: string;
  expected_output: string;
  actual_output: string;
  passed: boolean;
  error: string | null;
}

export interface CodingGradedDetail {
  test_case_results: TestCaseRunResult[];
  passed_count: number;
  total_count: number;
}

export interface AttemptAnswerResult {
  question_id: number;
  is_correct: boolean | null;
  points_awarded: number;
  correct_answer: Partial<McqAnswer & MaqAnswer & MatchAnswer & FillBlankAnswerPayload & CodingGradedDetail>;
  submitted_answer: Partial<McqAnswer & MaqAnswer & MatchAnswer & FillBlankAnswerPayload & CodingAnswer>;
}

export interface AttemptResult extends ExamAttempt {
  answers: AttemptAnswerResult[];
}

// ---------- Exam feedback ----------

export interface ExamFeedbackInput {
  rating: number;
  difficulty: string | null;
  comment: string | null;
}

export interface ExamFeedback {
  id: number;
  rating: number;
  difficulty: string | null;
  comment: string | null;
  created_at: string;
}

export interface ExamFeedbackComment {
  rating: number;
  difficulty: string | null;
  comment: string | null;
  submitted_by: string;
  created_at: string;
}

export interface ExamFeedbackSummary {
  total_feedback: number;
  average_rating: number;
  difficulty_counts: Record<string, number>;
  comments: ExamFeedbackComment[];
}

// ---------- Coding: run against sample test cases (ungraded trial run) ----------

export interface RunCodeRequest {
  language: CodingLanguage;
  code: string;
}

export interface RunCodeResult {
  test_case_results: TestCaseRunResult[];
  passed_count: number;
  total_count: number;
}

// ---------- Discussion ----------

export interface DiscussionPost {
  id: number;
  thread_id: number;
  user_id: number;
  author_name: string;
  body: string;
  parent_post_id: number | null;
  image_url: string | null;
  created_at: string;
}

export interface DiscussionThread {
  id: number;
  subject_id: number;
  topic_id: number | null;
  title: string;
  created_by: number;
  author_name: string;
  created_at: string;
  last_activity_at: string;
  post_count: number;
  preview: string;
  is_locked: boolean;
}

export interface DiscussionThreadDetail extends DiscussionThread {
  posts: DiscussionPost[];
}

// ---------- Progress ----------

export interface SubjectProgress {
  subject_id: number;
  subject_name: string;
  attempts: number;
  average_score_pct: number;
}

export interface AttemptHistoryEntry {
  attempt_id: number;
  submitted_at: string;
  score_pct: number;
  exam_title: string;
  subject_name: string;
}

export interface ProgressStats {
  total_attempts: number;
  average_score_pct: number;
  subjects: SubjectProgress[];
  history: AttemptHistoryEntry[];
}

export interface Badge {
  code: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  progress_current: number;
  progress_target: number;
}

export interface StudentProgress {
  user_id: number;
  full_name: string;
  email: string;
  roll_number: string | null;
  total_attempts: number;
  average_score_pct: number;
  last_attempt_at: string | null;
  total_violations: number;
}

export interface StudentAttempt {
  attempt_id: number;
  exam_title: string;
  subject_name: string;
  score: number | null;
  max_score: number | null;
  submitted_at: string | null;
  violation_count: number;
}

// ---------- Admin: user management ----------

export interface UserRoleUpdateInput {
  role: UserRole;
}

export interface UserActiveUpdateInput {
  is_active: boolean;
}

export interface AdminResetPasswordResult {
  temporary_password: string;
}

// ---------- Auth: forgot / reset password ----------

export interface ForgotPasswordInput {
  email: string;
}

// ---------- Discussion: moderation ----------

export interface ThreadLockUpdateInput {
  is_locked: boolean;
}

// ---------- Exams: duplicate + autosave ----------

export interface AutosaveInput {
  answers: AnswerIn[];
  flagged_question_ids: number[];
  current_index: number;
}

// ---------- Notifications ----------

export interface Notification {
  id: number;
  type: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// ---------- Admin: activity log + platform stats ----------

export interface ActivityLogEntry {
  id: number;
  admin_name: string | null;
  action: string;
  target_type: string;
  target_id: number | null;
  detail: string | null;
  created_at: string;
}

export interface ReportedQuestionStat {
  question_id: number;
  question_text: string;
  report_count: number;
}

export interface PlatformStats {
  total_students: number;
  active_students: number;
  total_admins: number;
  total_subjects: number;
  total_exams: number;
  published_exams: number;
  total_pdfs: number;
  total_attempts: number;
  submitted_attempts: number;
  average_score_pct: number;
  total_discussion_threads: number;
  total_discussion_posts: number;
  open_question_reports: number;
  most_reported_questions: ReportedQuestionStat[];
}

// ---------- Daily puzzles ----------

export interface PuzzleTodayItem {
  id: number;
  question_text: string;
  options: string[];
  difficulty: string;
  already_solved: boolean;
  selected_index: number | null;
  correct_index: number | null;
  is_correct: boolean | null;
  explanation: string | null;
}

export interface PuzzleToday {
  puzzles: PuzzleTodayItem[];
  solved_count: number;
  required_count: number;
}

export interface PuzzleAttemptResult {
  is_correct: boolean;
  correct_index: number;
  explanation: string | null;
  solved_count: number;
  required_count: number;
  streak_earned_today: boolean;
  current_streak: number;
  longest_streak: number;
}

export interface PuzzleStreak {
  current_streak: number;
  longest_streak: number;
  total_solved: number;
  total_correct: number;
}

export interface PuzzleAdmin {
  id: number;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  difficulty: string;
  is_active: boolean;
  created_at: string;
}

export interface PuzzleInput {
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  difficulty: string;
}

// ---------- Coding practice (standalone, separate from exams) ----------

export interface CodingProblemListItem {
  id: number;
  title: string;
  difficulty: string;
  tags: string[];
  languages: CodingLanguage[];
  is_solved: boolean;
}

export interface CodingSampleTestCase {
  id: number;
  input: string;
  expected_output: string;
}

export interface CodingProblemDetail {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  tags: string[];
  languages: CodingLanguage[];
  starter_code: Partial<Record<CodingLanguage, string>>;
  sample_test_cases: CodingSampleTestCase[];
  hidden_test_case_count: number;
  is_solved: boolean;
}

export interface CodingRunResult {
  test_case_results: TestCaseRunResult[];
  passed_count: number;
  total_count: number;
}

export interface CodingSubmitResult {
  is_solved: boolean;
  passed_count: number;
  total_count: number;
  test_case_results: TestCaseRunResult[];
}

export interface CodingSubmission {
  id: number;
  language: CodingLanguage;
  passed_count: number;
  total_count: number;
  is_solved: boolean;
  submitted_at: string;
}

export interface CodingProblemAdmin {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  tags: string[];
  languages: CodingLanguage[];
  starter_code: Partial<Record<CodingLanguage, string>>;
  is_published: boolean;
  created_at: string;
  test_cases: { id: number; input: string; expected_output: string; is_sample: boolean }[];
}

export interface CodingProblemInput {
  title: string;
  description: string;
  difficulty: string;
  tags: string[];
  languages: CodingLanguage[];
  starter_code: Partial<Record<CodingLanguage, string>>;
  is_published: boolean;
  test_cases: { input: string; expected_output: string; is_sample: boolean }[];
}

// ---------- Off-campus jobs ----------

export type JobType = "full_time" | "internship" | "part_time";

export interface JobPosting {
  id: number;
  title: string;
  company_name: string;
  job_type: string;
  location: string | null;
  is_remote: boolean;
  description: string;
  min_qualification: string | null;
  package: string | null;
  application_link: string | null;
  application_deadline: string | null;
  created_at: string;
}

export interface JobPostingAdmin extends JobPosting {
  is_active: boolean;
}

export interface JobPostingInput {
  title: string;
  company_name: string;
  job_type: string;
  location: string | null;
  is_remote: boolean;
  description: string;
  min_qualification: string | null;
  package: string | null;
  application_link: string | null;
  application_deadline: string | null;
  is_active: boolean;
}

// ---------- Live competitions ----------

export type CompetitionStatus = "waiting" | "active" | "finished";

export interface CompetitionParticipant {
  id: number;
  user_id: number;
  full_name: string;
  score: number;
}

export interface CompetitionOption {
  id: number;
  option_text: string;
  order: number;
}

export interface CompetitionQuestion {
  id: number;
  question_text: string;
  points: number;
  options: CompetitionOption[];
}

export interface CompetitionState {
  id: number;
  code: string;
  exam_title: string;
  status: CompetitionStatus;
  current_question_index: number;
  total_questions: number;
  time_limit_seconds: number;
  question_started_at: string | null;
  current_question: CompetitionQuestion | null;
  participants: CompetitionParticipant[];
  is_host: boolean;
  my_participant_id: number | null;
  has_answered_current: boolean;
  answered_count: number;
}

export interface CompetitionAnswerResult {
  is_correct: boolean;
  points_awarded: number;
  correct_option_id: number;
}

// ---------- Company interview bank ----------

export interface Company {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  coding_count: number;
  aptitude_count: number;
  technical_count: number;
  is_subscribed: boolean;
}

export interface CompanyAptitudeQuestion {
  id: number;
  company_id: number;
  question_text: string;
  options: string[];
  order: number;
}

export interface CompanyAptitudeAdmin extends CompanyAptitudeQuestion {
  correct_index: number;
  explanation: string | null;
}

export interface CompanyAptitudeAttemptResult {
  is_correct: boolean;
  correct_index: number;
  explanation: string | null;
}

export interface CompanyTechnicalQuestion {
  id: number;
  company_id: number;
  question_text: string;
  key_points: string[];
  order: number;
}

export interface CompanyCodingProblem {
  id: number;
  title: string;
  difficulty: string;
  tags: string[];
}

export interface CompanyInput {
  name: string;
  description?: string | null;
}

export interface CompanyAptitudeInput {
  question_text: string;
  options: string[];
  correct_index: number;
  explanation?: string | null;
  order?: number;
}

export interface CompanyTechnicalInput {
  question_text: string;
  key_points: string[];
  order?: number;
}
