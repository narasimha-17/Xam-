import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Power, Trash2 } from "lucide-react";
import {
  createCompany,
  createCompanyAptitude,
  createCompanyTechnical,
  deleteCompany,
  deleteCompanyAptitude,
  deleteCompanyTechnical,
  fetchCompanies,
  fetchCompanyAptitude,
  fetchCompanyTechnical,
  toggleCompanyActive,
} from "../../lib/companies";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Loader } from "../../components/ui/Loader";
import { cn } from "../../lib/utils";

interface CompanyFormValues {
  name: string;
  description: string;
}

interface AptitudeFormValues {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_index: number;
  explanation: string;
}

interface TechnicalFormValues {
  question_text: string;
  key_points_csv: string;
}

export function CompanyAdmin() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: companies, isLoading } = useQuery({ queryKey: ["companies"], queryFn: fetchCompanies });
  const selected = companies?.find((c) => c.id === selectedId) ?? null;

  const { register, handleSubmit, reset, formState } = useForm<CompanyFormValues>();
  const createCompanyMutation = useMutation({
    mutationFn: (values: CompanyFormValues) => createCompany({ name: values.name, description: values.description || null }),
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      reset();
      setSelectedId(company.id);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: number) => toggleCompanyActive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: (id: number) => deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setSelectedId(null);
    },
  });

  const { data: aptitude } = useQuery({
    queryKey: ["company-aptitude-admin", selectedId],
    queryFn: () => fetchCompanyAptitude(selectedId as number),
    enabled: selectedId !== null,
  });
  const { data: technical } = useQuery({
    queryKey: ["company-technical-admin", selectedId],
    queryFn: () => fetchCompanyTechnical(selectedId as number),
    enabled: selectedId !== null,
  });

  const { register: registerAptitude, handleSubmit: handleSubmitAptitude, reset: resetAptitude } =
    useForm<AptitudeFormValues>({ defaultValues: { correct_index: 0 } });
  const addAptitudeMutation = useMutation({
    mutationFn: (values: AptitudeFormValues) =>
      createCompanyAptitude(selectedId as number, {
        question_text: values.question_text,
        options: [values.option_a, values.option_b, values.option_c, values.option_d].filter(Boolean),
        correct_index: Number(values.correct_index),
        explanation: values.explanation || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-aptitude-admin", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      resetAptitude();
    },
  });
  const deleteAptitudeMutation = useMutation({
    mutationFn: (id: number) => deleteCompanyAptitude(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-aptitude-admin", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  const { register: registerTechnical, handleSubmit: handleSubmitTechnical, reset: resetTechnical } =
    useForm<TechnicalFormValues>();
  const addTechnicalMutation = useMutation({
    mutationFn: (values: TechnicalFormValues) =>
      createCompanyTechnical(selectedId as number, {
        question_text: values.question_text,
        key_points: values.key_points_csv
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-technical-admin", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      resetTechnical();
    },
  });
  const deleteTechnicalMutation = useMutation({
    mutationFn: (id: number) => deleteCompanyTechnical(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-technical-admin", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          <Building2 size={24} className="text-accent-soft" /> Company interview bank
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Manage companies and their aptitude/technical questions. Coding problems are tagged to a company from the
          coding-problem editor.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <Card className="flex w-full shrink-0 flex-col gap-3 lg:w-72">
          <h2 className="text-sm font-semibold text-ink">Companies</h2>
          {isLoading && <Loader label="Loading..." />}
          <div className="flex flex-col gap-1">
            {companies?.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                  selectedId === c.id ? "bg-accent/10 text-ink" : "text-ink-muted hover:bg-black/5",
                  !c.is_active && "opacity-50",
                )}
              >
                <span className="truncate font-medium">{c.name}</span>
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSubmit((values) => createCompanyMutation.mutate(values))}
            className="flex flex-col gap-2 border-t border-black/10 pt-3"
          >
            <Input placeholder="Company name" {...register("name", { required: true })} />
            <Textarea placeholder="Description (optional)" rows={2} {...register("description")} />
            <Button type="submit" isLoading={createCompanyMutation.isPending} disabled={!formState.isValid} className="w-full text-sm">
              <Plus size={14} /> Add company
            </Button>
          </form>
        </Card>

        {selected && (
          <div className="flex flex-1 flex-col gap-4">
            <Card className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">{selected.name}</h2>
                <p className="text-xs text-ink-faint">
                  {selected.coding_count} coding &middot; {selected.aptitude_count} aptitude &middot;{" "}
                  {selected.technical_count} technical
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => toggleActiveMutation.mutate(selected.id)}>
                  <Power size={14} /> {selected.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="outline"
                  className="text-danger hover:bg-danger/10"
                  onClick={() => deleteCompanyMutation.mutate(selected.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>

            <Card className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-ink">Aptitude questions</h3>
              {aptitude?.map((q) => (
                <div key={q.id} className="flex items-start justify-between gap-3 rounded-xl border border-black/10 p-3">
                  <p className="text-sm text-ink">{q.question_text}</p>
                  <button onClick={() => deleteAptitudeMutation.mutate(q.id)} className="shrink-0 text-ink-faint hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <form
                onSubmit={handleSubmitAptitude((values) => addAptitudeMutation.mutate(values))}
                className="flex flex-col gap-2 border-t border-black/10 pt-3"
              >
                <Textarea placeholder="Question text" rows={2} {...registerAptitude("question_text", { required: true })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Option A" {...registerAptitude("option_a", { required: true })} />
                  <Input placeholder="Option B" {...registerAptitude("option_b", { required: true })} />
                  <Input placeholder="Option C" {...registerAptitude("option_c")} />
                  <Input placeholder="Option D" {...registerAptitude("option_d")} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-ink-muted">Correct option index (0-based):</label>
                  <input
                    type="number"
                    min={0}
                    max={3}
                    className="w-16 rounded-lg border border-black/10 px-2 py-1 text-sm"
                    {...registerAptitude("correct_index", { valueAsNumber: true })}
                  />
                </div>
                <Textarea placeholder="Explanation (optional)" rows={2} {...registerAptitude("explanation")} />
                <Button type="submit" isLoading={addAptitudeMutation.isPending} className="w-fit text-sm">
                  <Plus size={14} /> Add aptitude question
                </Button>
              </form>
            </Card>

            <Card className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-ink">Technical questions</h3>
              {technical?.map((q) => (
                <div key={q.id} className="flex items-start justify-between gap-3 rounded-xl border border-black/10 p-3">
                  <div>
                    <p className="text-sm text-ink">{q.question_text}</p>
                    <ul className="mt-1 list-disc pl-5 text-xs text-ink-muted">
                      {q.key_points.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                  <button onClick={() => deleteTechnicalMutation.mutate(q.id)} className="shrink-0 text-ink-faint hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <form
                onSubmit={handleSubmitTechnical((values) => addTechnicalMutation.mutate(values))}
                className="flex flex-col gap-2 border-t border-black/10 pt-3"
              >
                <Textarea placeholder="Question text" rows={2} {...registerTechnical("question_text", { required: true })} />
                <Textarea
                  placeholder={"Key points a strong answer covers, one per line"}
                  rows={3}
                  {...registerTechnical("key_points_csv", { required: true })}
                />
                <Button type="submit" isLoading={addTechnicalMutation.isPending} className="w-fit text-sm">
                  <Plus size={14} /> Add technical question
                </Button>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
