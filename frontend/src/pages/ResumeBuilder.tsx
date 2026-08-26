import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Printer, Sparkles, Trash2 } from "lucide-react";
import { fetchAiStatus } from "../lib/ai";
import { fetchMyResume, saveMyResume, scoreMyResume } from "../lib/resume";
import { fetchJobs } from "../lib/jobs";
import type { ResumeInput } from "../types/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Select } from "../components/ui/Select";
import { Loader } from "../components/ui/Loader";
import { cn } from "../lib/utils";

const EMPTY_RESUME: ResumeInput = {
  full_name: "",
  email: "",
  phone: "",
  location: "",
  summary: "",
  education: [],
  experience: [],
  projects: [],
  skills: [],
  certifications: [],
};

function extractErrorMessage(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? fallback;
}

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-500";
  if (score >= 50) return "text-warning";
  return "text-danger";
}

export function ResumeBuilder() {
  const queryClient = useQueryClient();
  const [skillsText, setSkillsText] = useState("");
  const [certsText, setCertsText] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const { data: status } = useQuery({ queryKey: ["ai-status"], queryFn: fetchAiStatus, staleTime: 5 * 60_000 });
  const aiEnabled = status?.enabled === true;

  const { data: resume, isLoading } = useQuery({ queryKey: ["my-resume"], queryFn: fetchMyResume });
  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });

  const { register, control, handleSubmit, reset, watch } = useForm<ResumeInput>({ defaultValues: EMPTY_RESUME });

  useEffect(() => {
    if (resume) {
      reset(resume);
      setSkillsText(resume.skills.join(", "));
      setCertsText(resume.certifications.join(", "));
    }
  }, [resume, reset]);

  const educationArray = useFieldArray({ control, name: "education" });
  const experienceArray = useFieldArray({ control, name: "experience" });
  const projectsArray = useFieldArray({ control, name: "projects" });

  const saveMutation = useMutation({
    mutationFn: (values: ResumeInput) =>
      saveMyResume({
        ...values,
        skills: skillsText.split(",").map((s) => s.trim()).filter(Boolean),
        certifications: certsText.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(["my-resume"], saved);
    },
  });

  const [scoreRequestError, setScoreRequestError] = useState<string | null>(null);
  const scoreMutation = useMutation({
    mutationFn: () => scoreMyResume(selectedJobId ? Number(selectedJobId) : null),
    onSuccess: () => setScoreRequestError(null),
    onError: (err) => setScoreRequestError(extractErrorMessage(err, "Couldn't check the score.")),
  });

  const preview = watch();

  if (isLoading) return <Loader className="py-16" label="Loading your resume..." />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          <FileText size={24} className="text-accent-soft" /> Resume builder
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Build your resume here, then check how well it'd score with an ATS — generally, or against a specific job posting.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-ink">Contact</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Full name" {...register("full_name")} />
              <Input label="Email" {...register("email")} />
              <Input label="Phone" {...register("phone")} />
              <Input label="Location" {...register("location")} />
            </div>
            <Textarea label="Summary" rows={3} {...register("summary")} />
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-ink">Skills & certifications</h2>
            <Input
              label="Skills (comma-separated)"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
            />
            <Input
              label="Certifications (comma-separated)"
              value={certsText}
              onChange={(e) => setCertsText(e.target.value)}
            />
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Education</h2>
              <button
                type="button"
                onClick={() => educationArray.append({ institution: "", degree: "", field: "", start: "", end: "", gpa: "" })}
                className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                <Plus size={13} /> Add
              </button>
            </div>
            {educationArray.fields.map((field, i) => (
              <div key={field.id} className="flex flex-col gap-2 rounded-xl border border-black/10 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-faint">Entry {i + 1}</span>
                  <button type="button" onClick={() => educationArray.remove(i)} className="text-ink-faint hover:text-danger">
                    <Trash2 size={13} />
                  </button>
                </div>
                <Input placeholder="Institution" {...register(`education.${i}.institution`)} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Degree" {...register(`education.${i}.degree`)} />
                  <Input placeholder="Field" {...register(`education.${i}.field`)} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Start" {...register(`education.${i}.start`)} />
                  <Input placeholder="End" {...register(`education.${i}.end`)} />
                  <Input placeholder="GPA" {...register(`education.${i}.gpa`)} />
                </div>
              </div>
            ))}
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Experience</h2>
              <button
                type="button"
                onClick={() => experienceArray.append({ company: "", role: "", start: "", end: "", description: "" })}
                className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                <Plus size={13} /> Add
              </button>
            </div>
            {experienceArray.fields.map((field, i) => (
              <div key={field.id} className="flex flex-col gap-2 rounded-xl border border-black/10 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-faint">Entry {i + 1}</span>
                  <button type="button" onClick={() => experienceArray.remove(i)} className="text-ink-faint hover:text-danger">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Company" {...register(`experience.${i}.company`)} />
                  <Input placeholder="Role" {...register(`experience.${i}.role`)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Start" {...register(`experience.${i}.start`)} />
                  <Input placeholder="End" {...register(`experience.${i}.end`)} />
                </div>
                <Textarea placeholder="Description" rows={2} {...register(`experience.${i}.description`)} />
              </div>
            ))}
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Projects</h2>
              <button
                type="button"
                onClick={() => projectsArray.append({ title: "", description: "", tech_stack: "", link: "" })}
                className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                <Plus size={13} /> Add
              </button>
            </div>
            {projectsArray.fields.map((field, i) => (
              <div key={field.id} className="flex flex-col gap-2 rounded-xl border border-black/10 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-faint">Entry {i + 1}</span>
                  <button type="button" onClick={() => projectsArray.remove(i)} className="text-ink-faint hover:text-danger">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Title" {...register(`projects.${i}.title`)} />
                  <Input placeholder="Tech stack" {...register(`projects.${i}.tech_stack`)} />
                </div>
                <Input placeholder="Link (optional)" {...register(`projects.${i}.link`)} />
                <Textarea placeholder="Description" rows={2} {...register(`projects.${i}.description`)} />
              </div>
            ))}
          </Card>

          <Button type="submit" isLoading={saveMutation.isPending} className="w-fit">
            Save resume
          </Button>
        </form>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-ink">ATS score</h2>
            <Select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
              <option value="">General ATS check</option>
              {jobs?.map((job) => (
                <option key={job.id} value={job.id}>
                  Score against: {job.title} @ {job.company_name}
                </option>
              ))}
            </Select>
            <Button
              onClick={() => scoreMutation.mutate()}
              isLoading={scoreMutation.isPending}
              disabled={!aiEnabled || !resume}
              title={!aiEnabled ? "AI features aren't enabled in this environment." : !resume ? "Save your resume first." : undefined}
              variant="outline"
              className="w-fit"
            >
              <Sparkles size={14} /> Check score
            </Button>
            {scoreRequestError && <p className="text-sm text-danger">{scoreRequestError}</p>}

            {scoreMutation.data && (
              <div className="flex flex-col gap-3 border-t border-black/10 pt-3">
                {scoreMutation.data.error ? (
                  <p className="text-sm text-danger">{scoreMutation.data.error}</p>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className={cn("font-display text-3xl font-bold", scoreColor(scoreMutation.data.score ?? 0))}>
                        {scoreMutation.data.score ?? "—"}
                      </span>
                      <span className="text-sm text-ink-muted">/ 100</span>
                    </div>
                    {scoreMutation.data.feedback.length > 0 && (
                      <ul className="flex flex-col gap-1 text-sm text-ink-muted">
                        {scoreMutation.data.feedback.map((f, i) => (
                          <li key={i}>• {f}</li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {scoreMutation.data.matched_keywords.map((k) => (
                        <span key={k} className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
                          {k}
                        </span>
                      ))}
                      {scoreMutation.data.missing_keywords.map((k) => (
                        <span key={k} className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
                          {k}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Preview</h2>
            <Button variant="outline" onClick={() => window.print()} className="text-sm">
              <Printer size={14} /> Print / Save as PDF
            </Button>
          </div>
          <div id="resume-preview" className="flex flex-col gap-3 rounded-2xl bg-white p-6 text-neutral-900 shadow-sm">
            <div>
              <h3 className="font-display text-xl font-bold">{preview.full_name || "Your name"}</h3>
              <p className="text-xs text-neutral-500">
                {[preview.email, preview.phone, preview.location].filter(Boolean).join(" · ")}
              </p>
            </div>
            {preview.summary && <p className="text-sm">{preview.summary}</p>}
            {skillsText && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-500">Skills</h4>
                <p className="text-sm">{skillsText}</p>
              </div>
            )}
            {preview.education.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-500">Education</h4>
                {preview.education.map((e, i) => (
                  <p key={i} className="text-sm">
                    {e.degree} {e.field} — {e.institution} {e.start && `(${e.start}–${e.end})`}
                  </p>
                ))}
              </div>
            )}
            {preview.experience.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-500">Experience</h4>
                {preview.experience.map((e, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium">
                      {e.role} — {e.company} {e.start && `(${e.start}–${e.end})`}
                    </p>
                    {e.description && <p className="text-neutral-600">{e.description}</p>}
                  </div>
                ))}
              </div>
            )}
            {preview.projects.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-500">Projects</h4>
                {preview.projects.map((p, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium">
                      {p.title} {p.tech_stack && `(${p.tech_stack})`}
                    </p>
                    {p.description && <p className="text-neutral-600">{p.description}</p>}
                  </div>
                ))}
              </div>
            )}
            {certsText && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-500">Certifications</h4>
                <p className="text-sm">{certsText}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #resume-preview, #resume-preview * { visibility: visible; }
          #resume-preview { position: absolute; top: 0; left: 0; width: 100%; box-shadow: none; }
        }
      `}</style>
    </div>
  );
}
