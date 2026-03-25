namespace SelfCare.Api.Models.DTOs;

public class IdentifyRequest
{
    public string Image { get; set; } = ""; // base64-encoded image
    public string? Barcode { get; set; }    // optional barcode from client-side scan
}

public class ProductIdentification
{
    public string Name { get; set; } = "";
    public string Brand { get; set; } = "";
    public string Category { get; set; } = "Other";
    public string? Description { get; set; }
    public List<string> Ingredients { get; set; } = [];
    public double Confidence { get; set; }
    public string? ImageUrl { get; set; }
    public string? Barcode { get; set; }
    public ApothecaryRating? ApothecaryRating { get; set; }
}

public class ApothecaryRating
{
    public int Actives { get; set; }
    public int Purity { get; set; }
    public int Harmony { get; set; }
    public string Grade { get; set; } = "";
    public List<IngredientRating> IngredientRatings { get; set; } = [];
}

public class IngredientRating
{
    public string Name { get; set; } = "";
    public string Rating { get; set; } = "";  // "beneficial", "neutral", "caution"
    public string Note { get; set; } = "";
}

public class HarmonyRequest
{
    public List<string> ProductIngredients { get; set; } = [];
    public List<ExistingProductInfo> ExistingProducts { get; set; } = [];
}

public class ExistingProductInfo
{
    public string Name { get; set; } = "";
    public string Ingredients { get; set; } = "";
}

public class HarmonyResult
{
    public int Harmony { get; set; }
    public List<string> Conflicts { get; set; } = [];
    public List<string> Synergies { get; set; } = [];
}

public class IngredientAnalysis
{
    public List<string> KeyActives { get; set; } = [];
    public List<string> PotentialIrritants { get; set; } = [];
    public List<string> SkinBenefits { get; set; } = [];
    public string Summary { get; set; } = "";
}
