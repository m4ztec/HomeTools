import { apiRequest } from "@/shared/lib/api-client";

export type IrsRegion = "continente" | "madeira" | "acores";
export type IrsFilingStatus = "single" | "joint" | "separate" | "singleParent";

export type IrsScenarioInput = {
  region: IrsRegion;
  filingStatus: IrsFilingStatus;
  age: number;
  spouseAge: number;
  dependents: number;
  dependentsUnder3: number;
  dependentsUnder6: number;
  disabledTaxpayers: number;
  disabledDependents: number;
  employmentIncome: number;
  spouseEmploymentIncome: number;
  socialSecurityContributions: number;
  spouseSocialSecurityContributions: number;
  calculateSocialSecurity: boolean;
  selfEmploymentTaxableIncome: number;
  pensionIncome: number;
  spousePensionIncome: number;
  applyYouthTaxRelief: boolean;
  youthTaxReliefYear: number;
  dividends: number;
  interest: number;
  residentialRent: number;
  otherRent: number;
  capitalGains: number;
  aggregateInvestmentIncome: boolean;
  aggregateCapitalGains: boolean;
  generalExpenses: number;
  healthExpenses: number;
  educationExpenses: number;
  housingExpenses: number;
  careExpenses: number;
  alimonyPaid: number;
  invoiceVatExpenses: number;
  pprContributions: number;
  spousePprContributions: number;
  withholdingAndPayments: number;
};

export type IrsCalculationResult = {
  grossIncome: number;
  netAggregatedIncome: number;
  taxableIncome: number;
  progressiveTax: number;
  solidaritySurcharge: number;
  personalDeductions: number;
  taxDeductions: number;
  autonomousTax: number;
  totalTax: number;
  withholdingAndPayments: number;
  balance: number;
  refund: number;
  amountDue: number;
  estimatedSocialSecurity: number;
  disclaimer: string;
};

export type IrsScenario = {
  id: string;
  name: string;
  input: IrsScenarioInput;
  result: IrsCalculationResult;
  createdAt: string;
  updatedAt: string;
};

export const irsApi = {
  scenarios: () => apiRequest<IrsScenario[]>("/irs/scenarios"),
  createScenario: (name: string, input: IrsScenarioInput) =>
    apiRequest<IrsScenario>("/irs/scenarios", {
      method: "POST",
      body: JSON.stringify({ name, input }),
    }),
  updateScenario: (id: string, name: string, input: IrsScenarioInput) =>
    apiRequest<IrsScenario>(`/irs/scenarios/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, input }),
    }),
  deleteScenario: (id: string) => apiRequest<void>(`/irs/scenarios/${id}`, { method: "DELETE" }),
};
