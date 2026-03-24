using System.ComponentModel;
using System.Text.Json;
using ModelContextProtocol.Server;
using SelfCare.Api.Services;

namespace SelfCare.Api.Tools;

public class VisionTools(IVisionService visionService)
{
    [McpServerTool(Name = "IdentifyProduct"), Description("Identify a skincare product from a photo. Send a base64-encoded image and receive the product name, brand, category, description, and ingredients.")]
    public async Task<string> IdentifyProduct(
        [Description("Base64-encoded image of the skincare product (JPEG or PNG)")] string base64Image)
    {
        var result = await visionService.IdentifyProductAsync(base64Image);
        return JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true });
    }

    [McpServerTool(Name = "AnalyzeIngredients"), Description("Analyze a skincare ingredient list. Identifies key actives, potential irritants, and skin benefits.")]
    public async Task<string> AnalyzeIngredients(
        [Description("The ingredient list text to analyze (e.g., 'Aqua, Glycerin, Niacinamide, ...')")] string ingredientText)
    {
        var result = await visionService.AnalyzeIngredientsAsync(ingredientText);
        return JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true });
    }
} 
