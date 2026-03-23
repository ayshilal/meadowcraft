namespace SelfCare.Api.Models.DTOs;

public class IdentifyRequest
{
    public string Image { get; set; } = ""; // base64-encoded image
}

public class ProductIdentification
{
    public string Name { get; set; } = "";
    public string Brand { get; set; } = "";
    public string Category { get; set; } = "Other";
    public string? Description { get; set; }
    public List<string> Ingredients { get; set; } = [];
    public double Confidence { get; set; }
}

public class IngredientAnalysis
{
    public List<string> KeyActives { get; set; } = [];
    public List<string> PotentialIrritants { get; set; } = [];
    public List<string> SkinBenefits { get; set; } = [];
    public string Summary { get; set; } = "";
}
