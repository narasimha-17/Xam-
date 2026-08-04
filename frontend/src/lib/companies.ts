import { api } from "./api";
import type {
  Company,
  CompanyAptitudeAdmin,
  CompanyAptitudeAttemptResult,
  CompanyAptitudeInput,
  CompanyAptitudeQuestion,
  CompanyCodingProblem,
  CompanyInput,
  CompanyTechnicalInput,
  CompanyTechnicalQuestion,
} from "../types/api";

export async function fetchCompanies(): Promise<Company[]> {
  const { data } = await api.get<Company[]>("/companies");
  return data;
}

export async function fetchCompany(id: number): Promise<Company> {
  const { data } = await api.get<Company>(`/companies/${id}`);
  return data;
}

export async function subscribeCompany(id: number): Promise<Company> {
  const { data } = await api.post<Company>(`/companies/${id}/subscribe`);
  return data;
}

export async function unsubscribeCompany(id: number): Promise<Company> {
  const { data } = await api.delete<Company>(`/companies/${id}/subscribe`);
  return data;
}

export async function fetchCompanyAptitude(companyId: number): Promise<CompanyAptitudeQuestion[]> {
  const { data } = await api.get<CompanyAptitudeQuestion[]>(`/companies/${companyId}/aptitude`);
  return data;
}

export async function attemptCompanyAptitude(
  questionId: number,
  selectedIndex: number,
): Promise<CompanyAptitudeAttemptResult> {
  const { data } = await api.post<CompanyAptitudeAttemptResult>(`/companies/aptitude/${questionId}/attempt`, {
    selected_index: selectedIndex,
  });
  return data;
}

export async function fetchCompanyTechnical(companyId: number): Promise<CompanyTechnicalQuestion[]> {
  const { data } = await api.get<CompanyTechnicalQuestion[]>(`/companies/${companyId}/technical`);
  return data;
}

export async function fetchCompanyCoding(companyId: number): Promise<CompanyCodingProblem[]> {
  const { data } = await api.get<CompanyCodingProblem[]>(`/companies/${companyId}/coding`);
  return data;
}

// ---------- Admin ----------

export async function createCompany(payload: CompanyInput): Promise<Company> {
  const { data } = await api.post<Company>("/companies/admin", payload);
  return data;
}

export async function updateCompany(id: number, payload: CompanyInput): Promise<Company> {
  const { data } = await api.patch<Company>(`/companies/admin/${id}`, payload);
  return data;
}

export async function toggleCompanyActive(id: number): Promise<Company> {
  const { data } = await api.patch<Company>(`/companies/admin/${id}/toggle-active`);
  return data;
}

export async function deleteCompany(id: number): Promise<void> {
  await api.delete(`/companies/admin/${id}`);
}

export async function createCompanyAptitude(
  companyId: number,
  payload: CompanyAptitudeInput,
): Promise<CompanyAptitudeAdmin> {
  const { data } = await api.post<CompanyAptitudeAdmin>(`/companies/admin/${companyId}/aptitude`, payload);
  return data;
}

export async function updateCompanyAptitude(
  questionId: number,
  payload: CompanyAptitudeInput,
): Promise<CompanyAptitudeAdmin> {
  const { data } = await api.patch<CompanyAptitudeAdmin>(`/companies/admin/aptitude/${questionId}`, payload);
  return data;
}

export async function deleteCompanyAptitude(questionId: number): Promise<void> {
  await api.delete(`/companies/admin/aptitude/${questionId}`);
}

export async function createCompanyTechnical(
  companyId: number,
  payload: CompanyTechnicalInput,
): Promise<CompanyTechnicalQuestion> {
  const { data } = await api.post<CompanyTechnicalQuestion>(`/companies/admin/${companyId}/technical`, payload);
  return data;
}

export async function updateCompanyTechnical(
  questionId: number,
  payload: CompanyTechnicalInput,
): Promise<CompanyTechnicalQuestion> {
  const { data } = await api.patch<CompanyTechnicalQuestion>(`/companies/admin/technical/${questionId}`, payload);
  return data;
}

export async function deleteCompanyTechnical(questionId: number): Promise<void> {
  await api.delete(`/companies/admin/technical/${questionId}`);
}
