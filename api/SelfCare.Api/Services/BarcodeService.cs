using System.Text.Json;
using SelfCare.Api.Models.DTOs;

namespace SelfCare.Api.Services;

public class BarcodeService(HttpClient httpClient, IConfiguration config) : IBarcodeService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public async Task<BarcodeResult?> LookupAsync(string barcode)
    {
        var baseUrl = config["OpenBeautyFacts:BaseUrl"] ?? "https://world.openbeautyfacts.org/api/v2";
        var response = await httpClient.GetAsync($"{baseUrl}/product/{barcode}.json");

        if (!response.IsSuccessStatusCode)
            return null;

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        if (!root.TryGetProperty("product", out var product))
            return null;

        if (root.TryGetProperty("status", out var status) && status.GetInt32() == 0)
            return null;

        return new BarcodeResult
        {
            Barcode = barcode,
            Name = product.TryGetProperty("product_name", out var name) ? name.GetString() ?? "" : "",
            Brand = product.TryGetProperty("brands", out var brand) ? brand.GetString() ?? "" : "",
            Ingredients = product.TryGetProperty("ingredients_text", out var ingredients) ? ingredients.GetString() : null,
            ImageUrl = product.TryGetProperty("image_url", out var image) ? image.GetString() : null,
            Categories = product.TryGetProperty("categories", out var categories) ? categories.GetString() : null,
        };
    }
}
