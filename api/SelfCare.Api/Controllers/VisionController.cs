using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SelfCare.Api.Models.DTOs;
using SelfCare.Api.Services;

namespace SelfCare.Api.Controllers;

[ApiController]
[Route("api/vision")]
[Authorize]
public class VisionController(IVisionService visionService) : ControllerBase
{
    [HttpPost("identify")]
    public async Task<ActionResult<ProductIdentification>> IdentifyProduct([FromBody] IdentifyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Image))
            return BadRequest("Image data is required.");

        var result = await visionService.IdentifyProductAsync(request.Image);
        return Ok(result);
    }

    [HttpPost("analyze-ingredients")]
    public async Task<ActionResult<IngredientAnalysis>> AnalyzeIngredients([FromBody] AnalyzeIngredientsRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Ingredients))
            return BadRequest("Ingredient text is required.");

        var result = await visionService.AnalyzeIngredientsAsync(request.Ingredients);
        return Ok(result);
    }
}

public class AnalyzeIngredientsRequest
{
    public string Ingredients { get; set; } = "";
}
