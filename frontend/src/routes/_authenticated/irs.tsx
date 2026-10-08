import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  irsApi,
  type IrsCalculationResult,
  type IrsFilingStatus,
  type IrsRegion,
  type IrsScenario,
  type IrsScenarioInput,
} from "@/features/irs/api";
import { AppNavbar } from "@/shared/ui/AppNavbar";

export const Route = createFileRoute("/_authenticated/irs")({
  head: () => ({
    meta: [
      { title: "IRS simulator — HomeTools" },
      { name: "description", content: "Save and compare simplified Portuguese IRS estimates." },
    ],
  }),
  component: IrsPage,
});

const emptyInput: IrsScenarioInput = {
  region: "continente",
  filingStatus: "single",
  age: 35,
  spouseAge: 35,
  dependents: 0,
  dependentsUnder3: 0,
  dependentsUnder6: 0,
  disabledTaxpayers: 0,
  disabledDependents: 0,
  employmentIncome: 0,
  spouseEmploymentIncome: 0,
  socialSecurityContributions: 0,
  spouseSocialSecurityContributions: 0,
  calculateSocialSecurity: true,
  selfEmploymentTaxableIncome: 0,
  pensionIncome: 0,
  spousePensionIncome: 0,
  applyYouthTaxRelief: false,
  youthTaxReliefYear: 1,
  dividends: 0,
  interest: 0,
  residentialRent: 0,
  otherRent: 0,
  capitalGains: 0,
  aggregateInvestmentIncome: false,
  aggregateCapitalGains: false,
  generalExpenses: 0,
  healthExpenses: 0,
  educationExpenses: 0,
  housingExpenses: 0,
  careExpenses: 0,
  alimonyPaid: 0,
  invoiceVatExpenses: 0,
  pprContributions: 0,
  spousePprContributions: 0,
  withholdingAndPayments: 0,
};

type NumericField = {
  [Key in keyof IrsScenarioInput]: IrsScenarioInput[Key] extends number ? Key : never;
}[keyof IrsScenarioInput];

const currency = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const moneyFields: { key: NumericField; label: string }[][] = [
  [
    { key: "employmentIncome", label: "Employment income — annual gross" },
    { key: "socialSecurityContributions", label: "Social security paid (manual override)" },
    { key: "selfEmploymentTaxableIncome", label: "Self-employment taxable income" },
    { key: "pensionIncome", label: "Pension income" },
  ],
  [
    { key: "dividends", label: "Dividends" },
    { key: "interest", label: "Bank interest" },
    { key: "capitalGains", label: "Movable capital gains" },
    { key: "residentialRent", label: "Residential rent income" },
    { key: "otherRent", label: "Other rental income" },
  ],
  [
    { key: "generalExpenses", label: "General household expenses" },
    { key: "healthExpenses", label: "Health expenses" },
    { key: "educationExpenses", label: "Education and training" },
    { key: "housingExpenses", label: "Housing rent expenses" },
    { key: "careExpenses", label: "Care home expenses" },
    { key: "alimonyPaid", label: "Alimony paid" },
    { key: "invoiceVatExpenses", label: "Invoice VAT expenses" },
    { key: "pprContributions", label: "PPR contributions" },
    { key: "withholdingAndPayments", label: "Tax withheld and advance payments" },
  ],
];

function IrsPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const {
    data: scenarios = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["irs-scenarios"],
    queryFn: irsApi.scenarios,
  });
  const [name, setName] = useState("IRS 2026");
  const [input, setInput] = useState<IrsScenarioInput>(emptyInput);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<IrsCalculationResult | null>(null);
  const [dirty, setDirty] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      selectedId
        ? irsApi.updateScenario(selectedId, name, input)
        : irsApi.createScenario(name, input),
    onSuccess: (scenario) => {
      setSelectedId(scenario.id);
      setInput(scenario.input);
      setResult(scenario.result);
      setDirty(false);
      void queryClient.invalidateQueries({ queryKey: ["irs-scenarios"] });
      toast.success("Scenario calculated and saved");
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: irsApi.deleteScenario,
    onSuccess: (_, id) => {
      if (selectedId === id) {
        setSelectedId(null);
        setResult(null);
        setDirty(true);
      }
      void queryClient.invalidateQueries({ queryKey: ["irs-scenarios"] });
      toast.success("Scenario deleted");
    },
    onError: (error) => toast.error(error.message),
  });

  function changeNumber(key: NumericField, value: number) {
    setInput((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  function loadScenario(scenario: IrsScenario) {
    setName(scenario.name);
    setInput(scenario.input);
    setSelectedId(scenario.id);
    setResult(scenario.result);
    setDirty(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate();
  }

  return (
    <div className="ambient min-h-screen">
      <main className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <AppNavbar user={user} isAdmin={user.isAdmin} active="irs" />
        <section className="mt-6">
          <h1 className="flex items-center gap-2 text-xl font-semibold leading-none">
            <Calculator className="size-5 text-glow" /> IRS simulator
          </h1>
          <p className="mt-1 text-xs text-mist">2026 income · Portugal</p>
        </section>

        <aside className="glass mt-5 rounded-2xl border border-amber/30 p-4 text-sm text-mist">
          Planning estimate only. This is not official tax advice or a substitute for the Portuguese
          Tax Authority simulator. Tax rules can change; verify your result with the{" "}
          <a
            href="https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/simul_download/Pages/default.aspx"
            target="_blank"
            rel="noreferrer"
            className="text-glow underline underline-offset-2"
          >
            Portal das Finanças
          </a>
          .
        </aside>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <form onSubmit={submit} className="space-y-4">
            <section className="glass space-y-4 rounded-3xl p-5">
              <h2 className="font-semibold">Scenario and household</h2>
              <TextField
                label="Scenario name"
                value={name}
                maxLength={80}
                required
                onChange={setName}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="text-xs text-mist">Tax residence</span>
                  <select
                    className="field mt-1"
                    value={input.region}
                    onChange={(event) => {
                      setInput({ ...input, region: event.target.value as IrsRegion });
                      setDirty(true);
                    }}
                  >
                    <option value="continente">Continente</option>
                    <option value="madeira">Madeira</option>
                    <option value="acores">Açores</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-xs text-mist">Filing status</span>
                  <select
                    className="field mt-1"
                    value={input.filingStatus}
                    onChange={(event) => {
                      const filingStatus = event.target.value as IrsFilingStatus;
                      setInput({
                        ...input,
                        filingStatus,
                        ...(filingStatus === "joint"
                          ? {}
                          : {
                              spouseEmploymentIncome: 0,
                              spouseSocialSecurityContributions: 0,
                              spousePensionIncome: 0,
                              spousePprContributions: 0,
                            }),
                      });
                      setDirty(true);
                    }}
                  >
                    <option value="single">Single / not married</option>
                    <option value="joint">Joint taxation</option>
                    <option value="separate">Married, separate taxation</option>
                    <option value="singleParent">Single-parent household</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <NumberField
                  label="Taxpayer age"
                  field="age"
                  value={input.age}
                  min={18}
                  max={100}
                  onChange={changeNumber}
                />
                {input.filingStatus === "joint" && (
                  <NumberField
                    label="Spouse age"
                    field="spouseAge"
                    value={input.spouseAge}
                    min={18}
                    max={100}
                    onChange={changeNumber}
                  />
                )}
                <NumberField
                  label="Dependents"
                  field="dependents"
                  value={input.dependents}
                  max={20}
                  integer
                  onChange={changeNumber}
                />
                <NumberField
                  label="Dependents under 3"
                  field="dependentsUnder3"
                  value={input.dependentsUnder3}
                  max={20}
                  integer
                  onChange={changeNumber}
                />
                <NumberField
                  label="Dependents under 6"
                  field="dependentsUnder6"
                  value={input.dependentsUnder6}
                  max={20}
                  integer
                  onChange={changeNumber}
                />
                <NumberField
                  label="Disabled taxpayers"
                  field="disabledTaxpayers"
                  value={input.disabledTaxpayers}
                  max={2}
                  integer
                  onChange={changeNumber}
                />
                <NumberField
                  label="Disabled dependents"
                  field="disabledDependents"
                  value={input.disabledDependents}
                  max={20}
                  integer
                  onChange={changeNumber}
                />
              </div>
            </section>

            <section className="glass space-y-4 rounded-3xl p-5">
              <h2 className="font-semibold">Employment and pensions</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <NumberField
                  label="Employment income — annual gross (€)"
                  field="employmentIncome"
                  value={input.employmentIncome}
                  onChange={changeNumber}
                />
                {input.filingStatus === "joint" && (
                  <NumberField
                    label="Spouse employment income (€)"
                    field="spouseEmploymentIncome"
                    value={input.spouseEmploymentIncome}
                    onChange={changeNumber}
                  />
                )}
                <CheckField
                  checked={input.calculateSocialSecurity}
                  label="Estimate employee Social Security at 11%"
                  onChange={(checked) => {
                    setInput({ ...input, calculateSocialSecurity: checked });
                    setDirty(true);
                  }}
                />
                {!input.calculateSocialSecurity && (
                  <>
                    <NumberField
                      label="Social Security contributions (€)"
                      field="socialSecurityContributions"
                      value={input.socialSecurityContributions}
                      onChange={changeNumber}
                    />
                    {input.filingStatus === "joint" && (
                      <NumberField
                        label="Spouse Social Security contributions (€)"
                        field="spouseSocialSecurityContributions"
                        value={input.spouseSocialSecurityContributions}
                        onChange={changeNumber}
                      />
                    )}
                  </>
                )}
                <NumberField
                  label="Self-employment taxable income (€)"
                  field="selfEmploymentTaxableIncome"
                  value={input.selfEmploymentTaxableIncome}
                  onChange={changeNumber}
                />
                <NumberField
                  label="Pension income (€)"
                  field="pensionIncome"
                  value={input.pensionIncome}
                  onChange={changeNumber}
                />
                {input.filingStatus === "joint" && (
                  <NumberField
                    label="Spouse pension income (€)"
                    field="spousePensionIncome"
                    value={input.spousePensionIncome}
                    onChange={changeNumber}
                  />
                )}
              </div>
              <CheckField
                checked={input.applyYouthTaxRelief}
                label="Apply IRS Jovem (taxpayer up to age 35)"
                onChange={(checked) => {
                  setInput({ ...input, applyYouthTaxRelief: checked });
                  setDirty(true);
                }}
              />
              {input.applyYouthTaxRelief && (
                <label className="block max-w-xs text-sm">
                  <span className="text-xs text-mist">Year using IRS Jovem</span>
                  <select
                    className="field mt-1"
                    value={input.youthTaxReliefYear}
                    onChange={(event) =>
                      changeNumber("youthTaxReliefYear", Number(event.target.value))
                    }
                  >
                    {Array.from({ length: 10 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        Year {index + 1}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </section>

            <section className="glass space-y-4 rounded-3xl p-5">
              <h2 className="font-semibold">Investment and rental income</h2>
              <CheckField
                checked={input.aggregateInvestmentIncome}
                label="Aggregate dividends and interest into progressive taxation"
                onChange={(checked) => {
                  setInput({ ...input, aggregateInvestmentIncome: checked });
                  setDirty(true);
                }}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {moneyFields[1]?.map(({ key, label }) => (
                  <NumberField
                    key={key}
                    field={key}
                    label={`${label} (€)`}
                    value={input[key]}
                    onChange={changeNumber}
                  />
                ))}
              </div>
              <CheckField
                checked={input.aggregateCapitalGains}
                label="Aggregate movable capital gains into progressive taxation"
                onChange={(checked) => {
                  setInput({ ...input, aggregateCapitalGains: checked });
                  setDirty(true);
                }}
              />
            </section>

            <section className="glass space-y-4 rounded-3xl p-5">
              <h2 className="font-semibold">Deductible expenses and payments</h2>
              <p className="text-xs text-mist">
                Enter annual eligible expenses, not the deduction amount.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {moneyFields[2]
                  ?.filter(({ key }) => key !== "withholdingAndPayments")
                  .map(({ key, label }) => (
                    <NumberField
                      key={key}
                      field={key}
                      label={`${label} (€)`}
                      value={input[key]}
                      onChange={changeNumber}
                    />
                  ))}
                {input.filingStatus === "joint" && (
                  <NumberField
                    label="Spouse PPR contributions (€)"
                    field="spousePprContributions"
                    value={input.spousePprContributions}
                    onChange={changeNumber}
                  />
                )}
                <NumberField
                  label="Tax withheld and advance payments (€)"
                  field="withholdingAndPayments"
                  value={input.withholdingAndPayments}
                  onChange={changeNumber}
                />
              </div>
            </section>

            <button type="submit" className="btn-glow w-full" disabled={save.isPending}>
              {save.isPending
                ? "Calculating…"
                : selectedId
                  ? "Recalculate and update scenario"
                  : "Calculate and save scenario"}
            </button>
          </form>

          <aside className="space-y-4">
            <section className="glass rounded-3xl p-5">
              <h2 className="text-sm font-semibold">Estimated result</h2>
              {!result || dirty ? (
                <p className="mt-3 text-sm text-mist">
                  {result
                    ? "Inputs changed. Recalculate to refresh this result."
                    : "Save the scenario to calculate its estimate."}
                </p>
              ) : (
                <ResultSummary result={result} />
              )}
            </section>
            <section className="glass rounded-3xl p-5">
              <h2 className="text-sm font-semibold">Saved scenarios</h2>
              {isLoading && <p className="mt-3 text-sm text-mist">Loading…</p>}
              {isError && <p className="mt-3 text-sm text-rose">Could not load saved scenarios.</p>}
              {!isLoading && !isError && scenarios.length === 0 && (
                <p className="mt-3 text-sm text-mist">Your saved scenarios will appear here.</p>
              )}
              <ul className="mt-3 space-y-2">
                {scenarios.map((scenario) => (
                  <li key={scenario.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadScenario(scenario)}
                      className={`min-w-0 flex-1 rounded-lg p-2 text-left text-sm ${
                        selectedId === scenario.id
                          ? "bg-glow/15 text-foreground"
                          : "bg-white/5 text-mist hover:text-foreground"
                      }`}
                    >
                      <span className="block truncate font-medium">{scenario.name}</span>
                      <span className="block text-xs">
                        {scenario.result.refund > 0
                          ? `Refund ${currency.format(scenario.result.refund)}`
                          : `Due ${currency.format(scenario.result.amountDue)}`}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="grid size-9 place-items-center rounded-lg text-mist hover:text-rose"
                      aria-label={`Delete ${scenario.name}`}
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(scenario.id)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function ResultSummary({ result }: { result: IrsCalculationResult }) {
  const balance = result.refund > 0 ? result.refund : result.amountDue;
  return (
    <div className="mt-3 space-y-3">
      <p className={`text-2xl font-semibold ${result.refund > 0 ? "text-mint" : "text-amber"}`}>
        {result.refund > 0
          ? `Refund ${currency.format(balance)}`
          : `Amount due ${currency.format(balance)}`}
      </p>
      <dl className="space-y-2 text-xs">
        <ResultRow label="Gross income" value={result.grossIncome} />
        <ResultRow label="Taxable income" value={result.taxableIncome} />
        <ResultRow label="Progressive tax" value={result.progressiveTax} />
        <ResultRow label="Solidarity surcharge" value={result.solidaritySurcharge} />
        <ResultRow label="Tax deductions" value={result.taxDeductions} />
        <ResultRow label="Personal deductions" value={result.personalDeductions} />
        <ResultRow label="Autonomous tax" value={result.autonomousTax} />
        <ResultRow label="Tax withheld" value={result.withholdingAndPayments} />
        <ResultRow label="Estimated Social Security" value={result.estimatedSocialSecurity} />
      </dl>
      <p className="border-t border-white/10 pt-3 text-xs leading-relaxed text-mist">
        {result.disclaimer}
      </p>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-mist">{label}</dt>
      <dd className="text-right tabular-nums">{currency.format(value)}</dd>
    </div>
  );
}

function TextField({
  label,
  value,
  maxLength,
  required,
  onChange,
}: {
  label: string;
  value: string;
  maxLength: number;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs text-mist">{label}</span>
      <input
        className="field mt-1"
        value={value}
        maxLength={maxLength}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function NumberField({
  label,
  field,
  value,
  onChange,
  min = 0,
  max = 100_000_000,
  integer = false,
}: {
  label: string;
  field: NumericField;
  value: number;
  onChange: (field: NumericField, value: number) => void;
  min?: number;
  max?: number;
  integer?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs text-mist">{label}</span>
      <input
        className="field mt-1"
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        min={min}
        max={max}
        step={integer ? 1 : 0.01}
        value={value}
        onChange={(event) => onChange(field, Number(event.target.value) || 0)}
      />
    </label>
  );
}

function CheckField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-mist">
      <input
        type="checkbox"
        className="size-4 accent-[var(--color-glow)]"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
