using System.ComponentModel.DataAnnotations;

namespace HomeTools.API.Services.Irs.Contracts;

public sealed class IrsScenarioInput
{
    [Required, RegularExpression("^(continente|madeira|acores)$")]
    public string Region { get; set; } = "continente";

    [Required, RegularExpression("^(single|joint|separate|singleParent)$")]
    public string FilingStatus { get; set; } = "single";

    [Range(18, 100)]
    public int Age { get; set; } = 35;
    [Range(18, 100)]
    public int SpouseAge { get; set; } = 35;

    [Range(0, 20)] public int Dependents { get; set; }
    [Range(0, 20)] public int DependentsUnder3 { get; set; }
    [Range(0, 20)] public int DependentsUnder6 { get; set; }
    [Range(0, 2)] public int DisabledTaxpayers { get; set; }
    [Range(0, 20)] public int DisabledDependents { get; set; }

    [Range(0, 100_000_000)] public decimal EmploymentIncome { get; set; }
    [Range(0, 100_000_000)] public decimal SpouseEmploymentIncome { get; set; }
    [Range(0, 100_000_000)] public decimal SocialSecurityContributions { get; set; }
    [Range(0, 100_000_000)] public decimal SpouseSocialSecurityContributions { get; set; }
    public bool CalculateSocialSecurity { get; set; }
    [Range(0, 100_000_000)] public decimal SelfEmploymentTaxableIncome { get; set; }
    [Range(0, 100_000_000)] public decimal PensionIncome { get; set; }
    [Range(0, 100_000_000)] public decimal SpousePensionIncome { get; set; }
    public bool ApplyYouthTaxRelief { get; set; }
    [Range(1, 10)] public int YouthTaxReliefYear { get; set; } = 1;

    [Range(0, 100_000_000)] public decimal Dividends { get; set; }
    [Range(0, 100_000_000)] public decimal Interest { get; set; }
    [Range(0, 100_000_000)] public decimal ResidentialRent { get; set; }
    [Range(0, 100_000_000)] public decimal OtherRent { get; set; }
    [Range(0, 100_000_000)] public decimal CapitalGains { get; set; }
    public bool AggregateInvestmentIncome { get; set; }
    public bool AggregateCapitalGains { get; set; }

    [Range(0, 100_000_000)] public decimal GeneralExpenses { get; set; }
    [Range(0, 100_000_000)] public decimal HealthExpenses { get; set; }
    [Range(0, 100_000_000)] public decimal EducationExpenses { get; set; }
    [Range(0, 100_000_000)] public decimal HousingExpenses { get; set; }
    [Range(0, 100_000_000)] public decimal CareExpenses { get; set; }
    [Range(0, 100_000_000)] public decimal AlimonyPaid { get; set; }
    [Range(0, 100_000_000)] public decimal InvoiceVatExpenses { get; set; }
    [Range(0, 100_000_000)] public decimal PprContributions { get; set; }
    [Range(0, 100_000_000)] public decimal SpousePprContributions { get; set; }
    [Range(0, 100_000_000)] public decimal WithholdingAndPayments { get; set; }
}

public sealed record SaveIrsScenarioRequest(
    [Required, StringLength(80, MinimumLength = 1)] string Name,
    [Required] IrsScenarioInput Input);

public sealed record IrsScenarioDto(
    Guid Id,
    string Name,
    IrsScenarioInput Input,
    IrsCalculationResult Result,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record IrsCalculationResult(
    decimal GrossIncome,
    decimal NetAggregatedIncome,
    decimal TaxableIncome,
    decimal ProgressiveTax,
    decimal SolidaritySurcharge,
    decimal PersonalDeductions,
    decimal TaxDeductions,
    decimal AutonomousTax,
    decimal TotalTax,
    decimal WithholdingAndPayments,
    decimal Balance,
    decimal Refund,
    decimal AmountDue,
    decimal EstimatedSocialSecurity,
    string Disclaimer);
