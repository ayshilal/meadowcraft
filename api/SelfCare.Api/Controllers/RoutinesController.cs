using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SelfCare.Api.Data;
using SelfCare.Api.Models.Entities;

namespace SelfCare.Api.Controllers;

[ApiController]
[Route("api/routines")]
[Authorize]
public class RoutinesController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirst("oid")?.Value
        ?? User.FindFirst("sub")?.Value
        ?? "dev-user"; // Fallback for local dev without B2C

    [HttpGet]
    public async Task<ActionResult<Routine>> Get([FromQuery] string type)
    {
        if (type is not ("Morning" or "Evening"))
            return BadRequest("Type must be 'Morning' or 'Evening'");

        var routine = await db.Routines
            .Include(r => r.Steps.OrderBy(s => s.Order))
                .ThenInclude(s => s.Product)
            .FirstOrDefaultAsync(r => r.UserId == UserId && r.Type == type);

        if (routine is null)
        {
            // Auto-create empty routine for user
            routine = new Routine
            {
                Name = $"{type} Routine",
                Type = type,
                UserId = UserId
            };
            db.Routines.Add(routine);
            await db.SaveChangesAsync();
        }

        return Ok(routine);
    }

    [HttpPost("steps")]
    public async Task<ActionResult<RoutineStep>> AddStep(RoutineStep step)
    {
        // Verify the routine belongs to the user
        var routine = await db.Routines
            .FirstOrDefaultAsync(r => r.Id == step.RoutineId && r.UserId == UserId);

        if (routine is null) return BadRequest("Routine not found");

        // Verify the product belongs to the user
        var product = await db.Products
            .FirstOrDefaultAsync(p => p.Id == step.ProductId && p.UserId == UserId);

        if (product is null) return BadRequest("Product not found");

        db.RoutineSteps.Add(step);
        await db.SaveChangesAsync();

        // Reload with product navigation
        await db.Entry(step).Reference(s => s.Product).LoadAsync();

        return CreatedAtAction(null, step);
    }

    [HttpDelete("steps/{stepId}")]
    public async Task<IActionResult> RemoveStep(int stepId)
    {
        var step = await db.RoutineSteps
            .Include(s => s.Routine)
            .FirstOrDefaultAsync(s => s.Id == stepId);

        if (step is null) return NotFound();
        if (step.Routine.UserId != UserId) return Forbid();

        db.RoutineSteps.Remove(step);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
