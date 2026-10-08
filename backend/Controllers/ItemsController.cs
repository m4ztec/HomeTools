using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pantry.Api.Contracts;
using Pantry.Api.Data;
using Pantry.Api.Models;

namespace Pantry.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/items")]
public sealed class ItemsController(PantryDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ItemDto>>> GetItems(
        [FromQuery] Guid? homeId,
        [FromQuery] string? homeIds)
    {
        var allowedHomeIds = await db.HomeMembers
            .Where(member => member.UserId == CurrentUserId())
            .Select(member => member.HomeId)
            .ToListAsync();
        var query = db.Items.AsNoTracking().Where(item => allowedHomeIds.Contains(item.HomeId));

        if (homeId.HasValue) query = query.Where(item => item.HomeId == homeId.Value);
        if (!string.IsNullOrWhiteSpace(homeIds))
        {
            var requestedIds = homeIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(value => Guid.TryParse(value, out var id) ? id : Guid.Empty)
                .Where(id => id != Guid.Empty)
                .ToArray();
            query = query.Where(item => requestedIds.Contains(item.HomeId));
        }

        var items = await query.OrderBy(item => item.Name).Select(item => ToDto(item)).ToListAsync();
        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<ItemDto>> CreateItem([FromQuery] Guid homeId, ItemInput input)
    {
        if (!await IsMemberAsync(homeId)) return NotFound();
        var invalid = Validate(input.Name, input.Category, input.Unit, input.Price, input.Qty, input.TargetQty);
        if (invalid is not null) return BadRequest(new { message = invalid });

        var item = new Item
        {
            HomeId = homeId,
            Name = input.Name.Trim(),
            Category = input.Category.Trim(),
            Unit = input.Unit.Trim(),
            Price = input.Price,
            Qty = input.Qty,
            TargetQty = input.TargetQty,
            ExpiresAt = input.ExpiresAt,
            CreatedBy = CurrentUserId(),
        };
        db.Items.Add(item);
        await db.SaveChangesAsync();
        return Ok(ToDto(item));
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<ItemDto>> UpdateItem(Guid id, ItemPatch patch)
    {
        var item = await db.Items.SingleOrDefaultAsync(value => value.Id == id);
        if (item is null) return NotFound();
        if (!await IsMemberAsync(item.HomeId)) return NotFound();

        if (patch.Name is not null) item.Name = patch.Name.Trim();
        if (patch.Category is not null) item.Category = patch.Category.Trim();
        if (patch.Unit is not null) item.Unit = patch.Unit.Trim();
        if (patch.Price.HasValue) item.Price = patch.Price.Value;
        if (patch.Qty.HasValue) item.Qty = patch.Qty.Value;
        if (patch.TargetQty.HasValue) item.TargetQty = patch.TargetQty.Value;
        if (patch.ExpiresAt.ValueKind != JsonValueKind.Undefined)
        {
            if (patch.ExpiresAt.ValueKind == JsonValueKind.Null)
            {
                item.ExpiresAt = null;
            }
            else if (patch.ExpiresAt.ValueKind == JsonValueKind.String
                     && DateOnly.TryParse(patch.ExpiresAt.GetString(), out var expiresAt))
            {
                item.ExpiresAt = expiresAt;
            }
            else
            {
                return BadRequest(new { message = "Expiry date must be a valid date or null." });
            }
        }

        var invalid = Validate(item.Name, item.Category, item.Unit, item.Price, item.Qty, item.TargetQty);
        if (invalid is not null) return BadRequest(new { message = invalid });
        item.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(item));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteItem(Guid id)
    {
        var item = await db.Items.SingleOrDefaultAsync(value => value.Id == id);
        if (item is null) return NotFound();
        if (!await IsMemberAsync(item.HomeId)) return NotFound();
        db.Items.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private Guid CurrentUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("The authenticated token has no user ID."));

    private Task<bool> IsMemberAsync(Guid homeId) =>
        db.HomeMembers.AnyAsync(member => member.HomeId == homeId && member.UserId == CurrentUserId());

    private static string? Validate(string name, string category, string unit, decimal price, decimal qty, decimal targetQty)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Length > 120) return "Item name must be between 1 and 120 characters.";
        if (string.IsNullOrWhiteSpace(category) || category.Length > 60) return "Category must be between 1 and 60 characters.";
        if (string.IsNullOrWhiteSpace(unit) || unit.Length > 20) return "Unit must be between 1 and 20 characters.";
        if (price < 0 || price > 99_999_999.99m) return "Price is outside the supported range.";
        if (qty < 0 || qty > 99_999_999.99m || targetQty < 0 || targetQty > 99_999_999.99m)
            return "Quantities must be non-negative and within the supported range.";
        return null;
    }

    private static ItemDto ToDto(Item item) =>
        new(item.Id, item.HomeId, item.Name, item.Category, item.Price, item.Qty, item.TargetQty,
            item.Unit, item.ExpiresAt, item.CreatedBy, item.CreatedAt, item.UpdatedAt);
}
