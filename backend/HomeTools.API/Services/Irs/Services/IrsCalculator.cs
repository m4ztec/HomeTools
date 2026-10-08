using HomeTools.API.Services.Irs.Contracts;

namespace HomeTools.API.Services.Irs.Services;

public sealed class IrsCalculator
{
    private const decimal Ias = 537.13m;
    private const decimal SpecificDeduction = 8.54m * Ias;
    private const decimal YouthReliefIncomeLimit = 55m * Ias;

    private sealed record TaxBracket(decimal UpperLimit, decimal Rate, decimal Abatement);

    private static readonly TaxBracket[] MainlandBrackets =
    [
        new(8342m, 0.125m, 0m),
        new(12587m, 0.157m, 266.94m),
        new(17838m, 0.212m, 959.26m),
        new(23089m, 0.241m, 1476.45m),
        new(29397m, 0.311m, 3092.77m),
        new(43090m, 0.349m, 4209.94m),
        new(46566m, 0.431m, 7743.27m),
        new(86634m, 0.446m, 8441.48m),
        new(decimal.MaxValue, 0.48m, 11387.17m),
    ];

    private static readonly TaxBracket[] IslandBrackets =
    [
        new(8342m, 0.0875m, 0m),
        new(12587m, 0.1099m, 186.86m),
        new(17838m, 0.1484m, 671.48m),
        new(23089m, 0.1687m, 1033.52m),
        new(29397m, 0.2177m, 2164.94m),
        new(43090m, 0.2443m, 2946.96m),
        new(46566m, 0.3017m, 5420.29m),
        new(86634m, 0.3122m, 5909.04m),
        new(decimal.MaxValue, 0.336m, 7971.02m),
    ];

    public IrsCalculationResult Calculate(IrsScenarioInput input)
    {
        var joint = input.FilingStatus == "joint";
        var coefficient = joint ? 2m : 1m;
        var primarySocialSecurity = input.CalculateSocialSecurity
            ? input.EmploymentIncome * 0.11m
            : input.SocialSecurityContributions;
        var spouseSocialSecurity = input.CalculateSocialSecurity
            ? input.SpouseEmploymentIncome * 0.11m
            : input.SpouseSocialSecurityContributions;
        var estimatedSocialSecurity = primarySocialSecurity + spouseSocialSecurity;

        var primaryEmploymentNet = NetOfSpecificDeduction(input.EmploymentIncome, primarySocialSecurity);
        var spouseEmploymentNet = NetOfSpecificDeduction(input.SpouseEmploymentIncome, spouseSocialSecurity);
        var pensionNet = NetOfSpecificDeduction(input.PensionIncome, 0m)
            + NetOfSpecificDeduction(input.SpousePensionIncome, 0m);
        var netAggregatedIncome = primaryEmploymentNet
            + spouseEmploymentNet
            + input.SelfEmploymentTaxableIncome
            + pensionNet;
        var grossIncome = input.EmploymentIncome
            + input.SpouseEmploymentIncome
            + input.SelfEmploymentTaxableIncome
            + input.PensionIncome
            + input.SpousePensionIncome
            + input.Dividends
            + input.Interest
            + input.ResidentialRent
            + input.OtherRent
            + input.CapitalGains;

        var youthExemption = 0m;
        if (input.ApplyYouthTaxRelief && input.Age <= 35)
        {
            var rate = input.YouthTaxReliefYear switch
            {
                1 => 1m,
                2 or 3 or 4 => 0.75m,
                5 or 6 or 7 => 0.5m,
                _ => 0.25m,
            };
            youthExemption = Math.Min(
                YouthReliefIncomeLimit,
                primaryEmploymentNet + input.SelfEmploymentTaxableIncome) * rate;
        }

        var aggregatedCapitalIncome = 0m;
        if (input.AggregateInvestmentIncome)
        {
            aggregatedCapitalIncome += input.Dividends * 0.5m + input.Interest;
        }
        if (input.AggregateCapitalGains)
        {
            aggregatedCapitalIncome += input.CapitalGains;
        }

        var taxableIncome = Math.Max(0m, netAggregatedIncome + aggregatedCapitalIncome - youthExemption);
        var taxablePerPerson = taxableIncome / coefficient;
        var brackets = input.Region == "continente" ? MainlandBrackets : IslandBrackets;
        var progressiveTaxPerPerson = TaxFor(taxablePerPerson, brackets);
        var progressiveTax = progressiveTaxPerPerson * coefficient;
        var solidarityRate = input.Region == "acores" ? (Middle: 0.0175m, Top: 0.035m) : (Middle: 0.025m, Top: 0.05m);
        var solidarity = SolidarityTax(taxablePerPerson, solidarityRate.Middle, solidarityRate.Top) * coefficient;

        var deductions = CalculateDeductions(input, coefficient, taxablePerPerson);
        var autonomousTax = CalculateAutonomousTax(input);
        var totalTax = Math.Max(0m, progressiveTax + solidarity - deductions.Total) + autonomousTax;
        var balance = totalTax - input.WithholdingAndPayments;

        return new IrsCalculationResult(
            Round(grossIncome),
            Round(netAggregatedIncome),
            Round(taxableIncome),
            Round(progressiveTax),
            Round(solidarity),
            Round(deductions.Personal),
            Round(deductions.Tax),
            Round(autonomousTax),
            Round(totalTax),
            Round(input.WithholdingAndPayments),
            Round(balance),
            Round(Math.Max(0m, -balance)),
            Round(Math.Max(0m, balance)),
            Round(estimatedSocialSecurity),
            "Educational estimate only; not official tax advice or a substitute for the Portuguese Tax Authority simulator.");
    }

    public static string? Validate(IrsScenarioInput input)
    {
        if (input.DependentsUnder3 > input.Dependents
            || input.DependentsUnder6 > input.Dependents
            || input.DisabledDependents > input.Dependents)
        {
            return "Dependent age and disability counts cannot exceed the total number of dependents.";
        }
        if (input.FilingStatus != "joint" && input.DisabledTaxpayers > 1)
        {
            return "A non-joint return can include at most one disabled taxpayer.";
        }
        if (input.FilingStatus != "joint"
            && (input.SpouseEmploymentIncome > 0
                || input.SpouseSocialSecurityContributions > 0
                || input.SpousePensionIncome > 0
                || input.SpousePprContributions > 0))
        {
            return "Spouse income and PPR fields require joint taxation.";
        }
        return null;
    }

    private static decimal NetOfSpecificDeduction(decimal gross, decimal contributions) =>
        Math.Max(0m, gross - Math.Max(SpecificDeduction, contributions));

    private static decimal TaxFor(decimal income, TaxBracket[] brackets)
    {
        var bracket = brackets.First(value => income <= value.UpperLimit);
        return Math.Max(0m, income * bracket.Rate - bracket.Abatement);
    }

    private static decimal SolidarityTax(decimal income, decimal middleRate, decimal topRate)
    {
        var middle = Math.Max(0m, Math.Min(income, 250_000m) - 80_000m) * middleRate;
        var top = Math.Max(0m, income - 250_000m) * topRate;
        return middle + top;
    }

    private static (decimal Tax, decimal Personal, decimal Total) CalculateDeductions(
        IrsScenarioInput input,
        decimal coefficient,
        decimal taxablePerPerson)
    {
        var general = input.FilingStatus == "singleParent"
            ? Deduction(input.GeneralExpenses, 0.45m, 335m)
            : Deduction(input.GeneralExpenses, 0.35m, 250m) * coefficient;
        var taxDeductions = general
            + Deduction(input.HealthExpenses, 0.15m, 1000m) * coefficient
            + Deduction(input.EducationExpenses, 0.30m, 800m) * coefficient
            + Deduction(input.HousingExpenses, 0.15m, 900m) * coefficient
            + Deduction(input.CareExpenses, 0.25m, 403.75m) * coefficient
            + input.AlimonyPaid * 0.20m
            + Deduction(input.InvoiceVatExpenses, 0.15m, 250m) * coefficient
            + PprDeduction(input.PprContributions, input.Age)
            + (input.FilingStatus == "joint" ? PprDeduction(input.SpousePprContributions, input.SpouseAge) : 0m);

        var deductionLimit = taxablePerPerson <= 8342m
            ? decimal.MaxValue
            : taxablePerPerson > 80_000m
                ? 1000m
                : 1000m + 1500m * (80_000m - taxablePerPerson) / (80_000m - 8342m);
        if (input.Dependents >= 3)
        {
            deductionLimit *= 1m + 0.05m * input.Dependents;
        }

        var limitedTaxDeductions = Math.Min(taxDeductions, deductionLimit);
        var personalDeductions = CalculateDependentDeduction(input.Dependents, input.DependentsUnder3, input.DependentsUnder6)
            + input.DisabledTaxpayers * 4m * Ias
            + input.DisabledDependents * 2.5m * Ias;
        return (limitedTaxDeductions, personalDeductions, limitedTaxDeductions + personalDeductions);
    }

    private static decimal Deduction(decimal expenses, decimal percentage, decimal maximum) =>
        Math.Min(expenses * percentage, maximum);

    private static decimal PprDeduction(decimal contribution, int age)
    {
        var maximum = age < 35 ? 400m : age <= 50 ? 350m : 300m;
        return Math.Min(contribution * 0.20m, maximum);
    }

    private static decimal CalculateDependentDeduction(int count, int under3, int under6)
    {
        var total = 0m;
        for (var index = 0; index < count; index++)
        {
            total += index == 0 && under3 > 0
                ? 726m
                : index > 0 && under6 >= index
                    ? 900m
                    : 600m;
        }
        return total;
    }

    private static decimal CalculateAutonomousTax(IrsScenarioInput input)
    {
        var capitalRate = input.Region == "acores" ? 0.196m : 0.28m;
        var tax = 0m;
        if (!input.AggregateInvestmentIncome)
        {
            tax += (input.Dividends + input.Interest) * capitalRate;
        }
        if (!input.AggregateCapitalGains)
        {
            tax += input.CapitalGains * capitalRate;
        }
        tax += input.ResidentialRent * 0.25m + input.OtherRent * 0.28m;
        return tax;
    }

    private static decimal Round(decimal amount) =>
        decimal.Round(amount, 2, MidpointRounding.AwayFromZero);
}
