using SelfCare.Api.Models.DTOs;

namespace SelfCare.Api.Services;

public interface IVisionService
{
    Task<ProductIdentification> IdentifyProductAsync(string base64Image);
    Task<IngredientAnalysis> AnalyzeIngredientsAsync(string ingredientText);
}
