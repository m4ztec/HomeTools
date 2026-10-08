using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HomeTools.API.Services.Irs.Contracts;
using HomeTools.API.Services.Irs.Models;
using HomeTools.API.Services.Irs.Services;
using HomeTools.API.Data;

namespace HomeTools.API.Services.Irs.Controllers;

[ApiController]
[Authorize]
[Route("api/irs/scenarios")]
public sealed class IrsScenariosController(HomeToolsDbContext db, IrsCalculator calculator) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<IrsScenarioDto>>> List()
    {
        var scenarios = await db.IrsScenarios
            .AsNoTracking()
            .Where(scenario => scenario.OwnerId == CurrentUserId())
            .OrderByDescending(scenario => scenario.UpdatedAt)
            .ToListAsync();
        return Ok(scenarios.Select(ToDto).ToArray());
    }

    [HttpPost]
    public async Task<ActionResult<IrsScenarioDto>> Create(SaveIrsScenarioRequest request)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var input = request.Input;
        var scenario = new IrsScenario
        {
            OwnerId = CurrentUserId(),
            Name = request.Name.Trim(),
        };
        Save(scenario, input);
        db.IrsScenarios.Add(scenario);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(List), ToDto(scenario));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<IrsScenarioDto>> Update(Guid id, SaveIrsScenarioRequest request)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var scenario = await db.IrsScenarios
            .SingleOrDefaultAsync(value => value.Id == id && value.OwnerId == CurrentUserId());
        if (scenario is null) return NotFound();

        scenario.Name = request.Name.Trim();
        scenario.UpdatedAt = DateTimeOffset.UtcNow;
        Save(scenario, request.Input);
        await db.SaveChangesAsync();
        return Ok(ToDto(scenario));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var scenario = await db.IrsScenarios
            .SingleOrDefaultAsync(value => value.Id == id && value.OwnerId == CurrentUserId());
        if (scenario is null) return NotFound();
        db.IrsScenarios.Remove(scenario);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private string? Validate(SaveIrsScenarioRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) return "Enter a name for this scenario.";
        return IrsCalculator.Validate(request.Input);
    }

    private void Save(IrsScenario scenario, IrsScenarioInput input)
    {
        scenario.InputJson = JsonSerializer.Serialize(input, JsonOptions);
        scenario.ResultJson = JsonSerializer.Serialize(calculator.Calculate(input), JsonOptions);
        scenario.UpdatedAt = DateTimeOffset.UtcNow;
    }

    private static IrsScenarioDto ToDto(IrsScenario scenario) =>
        new(
            scenario.Id,
            scenario.Name,
            JsonSerializer.Deserialize<IrsScenarioInput>(scenario.InputJson, JsonOptions)
                ?? throw new InvalidOperationException($"IRS scenario {scenario.Id} has invalid input data."),
            JsonSerializer.Deserialize<IrsCalculationResult>(scenario.ResultJson, JsonOptions)
                ?? throw new InvalidOperationException($"IRS scenario {scenario.Id} has invalid result data."),
            scenario.CreatedAt,
            scenario.UpdatedAt);

    private Guid CurrentUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("The authenticated token has no user ID."));
}
