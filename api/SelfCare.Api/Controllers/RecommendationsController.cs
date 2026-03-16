using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SelfCare.Api.Data;
using SelfCare.Api.Models.Entities;

namespace SelfCare.Api.Controllers;

[ApiController]
[Route("api/recommendations")]
public class RecommendationsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<Recommendation>>> GetAll()
    {
        var recommendations = await db.Recommendations.ToListAsync();
        return Ok(recommendations);
    }
}
