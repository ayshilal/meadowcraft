using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SelfCare.Api.Data;
using SelfCare.Api.Models.Entities;

namespace SelfCare.Api.Controllers;

[ApiController]
[Route("api/beauty-facts")]
public class BeautyFactsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<BeautyFact>>> GetAll()
    {
        var facts = await db.BeautyFacts.ToListAsync();
        return Ok(facts);
    }
}
