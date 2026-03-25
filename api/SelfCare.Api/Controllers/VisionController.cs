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

        var result = await visionService.IdentifyProductAsync(request.Image, request.Barcode);
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

    [HttpPost("harmony-score")]
    public async Task<ActionResult<HarmonyResult>> GetHarmonyScore([FromBody] HarmonyRequest request)
    {
        var result = await visionService.GetHarmonyScoreAsync(request);
        return Ok(result);
    }

    [HttpPost("analyze-product")]
    public async Task<ActionResult<ApothecaryRating>> AnalyzeProduct([FromBody] AnalyzeProductRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Product name is required.");

        var result = await visionService.AnalyzeProductByNameAsync(request.Name, request.Brand, request.Ingredients);
        return Ok(result);
    }
}

public class AnalyzeIngredientsRequest
{
    public string Ingredients { get; set; } = "";
}

public class AnalyzeProductRequest
{
    public string Name { get; set; } = "";
    public string Brand { get; set; } = "";
    public string? Ingredients { get; set; }
}
