using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace HomeTools.API.Services.Irs.Contracts;

public enum IrsRegion
{
    Continente,
    Madeira,
    Acores,
}

public enum IrsFilingStatus
{
    Single,
    Joint,
    Separate,
    SingleParent,
}

[JsonConverter(typeof(IrsYouthTaxReliefYearJsonConverter))]
public enum IrsYouthTaxReliefYear
{
    Year1 = 1,
    Year2,
    Year3,
    Year4,
    Year5,
    Year6,
    Year7,
    Year8,
    Year9,
    Year10,
}

public sealed class IrsYouthTaxReliefYearJsonConverter : JsonConverter<IrsYouthTaxReliefYear>
{
    public override IrsYouthTaxReliefYear Read(
        ref Utf8JsonReader reader,
        Type typeToConvert,
        JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String
            && Enum.TryParse<IrsYouthTaxReliefYear>(reader.GetString(), out var parsed)
            && Enum.IsDefined(parsed))
        {
            return parsed;
        }

        if (reader.TokenType == JsonTokenType.Number
            && reader.TryGetInt32(out var legacyValue)
            && Enum.IsDefined((IrsYouthTaxReliefYear)legacyValue))
        {
            return (IrsYouthTaxReliefYear)legacyValue;
        }

        throw new JsonException("Youth tax relief year must be Year1 through Year10.");
    }

    public override void Write(
        Utf8JsonWriter writer,
        IrsYouthTaxReliefYear value,
        JsonSerializerOptions options) =>
        writer.WriteStringValue(value.ToString());
}

public sealed class IrsScenarioInput
{
    public IrsRegion Region { get; set; } = IrsRegion.Continente;

    public IrsFilingStatus FilingStatus { get; set; } = IrsFilingStatus.Single;

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
    public IrsYouthTaxReliefYear YouthTaxReliefYear { get; set; } = IrsYouthTaxReliefYear.Year1;

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
