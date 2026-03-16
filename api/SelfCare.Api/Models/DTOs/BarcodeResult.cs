namespace SelfCare.Api.Models.DTOs;

public class BarcodeResult
{
    public string Name { get; set; } = "";
    public string Brand { get; set; } = "";
    public string? Ingredients { get; set; }
    public string? ImageUrl { get; set; }
    public string? Categories { get; set; }
    public string Barcode { get; set; } = "";
}
