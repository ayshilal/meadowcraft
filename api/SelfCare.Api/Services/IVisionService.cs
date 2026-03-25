using SelfCare.Api.Models.DTOs;

namespace SelfCare.Api.Services;

public interface IVisionService
{
    Task<ProductIdentification> IdentifyProductAsync(string base64Image, string? clientBarcode = null);
    Task<IngredientAnalysis> AnalyzeIngredientsAsync(string ingredientText);
    Task<HarmonyResult> GetHarmonyScoreAsync(HarmonyRequest request);
    Task<ApothecaryRating> AnalyzeProductByNameAsync(string name, string brand, string? ingredients);
}
