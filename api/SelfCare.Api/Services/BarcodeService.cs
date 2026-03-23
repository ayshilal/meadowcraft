using System.Text.Json;
using SelfCare.Api.Models.DTOs;

namespace SelfCare.Api.Services;

public class BarcodeService(HttpClient httpClient, ILogger<BarcodeService> logger) : IBarcodeService
{
    public async Task<BarcodeResult?> LookupAsync(string barcode)
    {
        // Try UPCitemdb first (better data, broader coverage)
        var result = await TryUpcItemDb(barcode);
        if (result is not null)
            return result;

        // Fallback to OpenBeautyFacts (community-driven, has ingredients)
        result = await TryOpenBeautyFacts(barcode);
        if (result is not null)
            return result;

        return null;
    }

    private async Task<BarcodeResult?> TryUpcItemDb(string barcode)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get,
                $"https://api.upcitemdb.com/prod/trial/lookup?upc={barcode}");
            request.Headers.Add("Accept", "application/json");

            var response = await httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
                return null;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("items", out var items) || items.GetArrayLength() == 0)
                return null;

            var item = items[0];

            var name = item.TryGetProperty("title", out var titleEl) ? titleEl.GetString() ?? "" : "";
            var brand = item.TryGetProperty("brand", out var brandEl) ? brandEl.GetString() ?? "" : "";
            var category = item.TryGetProperty("category", out var catEl) ? catEl.GetString() : null;
            var description = item.TryGetProperty("description", out var descEl) ? descEl.GetString() : null;

            // Get first image from the images array
            string? imageUrl = null;
            if (item.TryGetProperty("images", out var images) && images.GetArrayLength() > 0)
            {
                imageUrl = images[0].GetString();
            }

            return new BarcodeResult
            {
                Barcode = barcode,
                Name = CleanProductName(name, brand),
                Brand = brand,
                Ingredients = description,
                ImageUrl = imageUrl,
                Categories = category,
            };
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "UPCitemdb lookup failed for barcode {Barcode}", barcode);
            return null;
        }
    }

    private async Task<BarcodeResult?> TryOpenBeautyFacts(string barcode)
    {
        try
        {
            var response = await httpClient.GetAsync(
                $"https://world.openbeautyfacts.org/api/v2/product/{barcode}.json");

            if (!response.IsSuccessStatusCode)
                return null;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("product", out var product))
                return null;

            if (root.TryGetProperty("status", out var status) && status.GetInt32() == 0)
                return null;

            var name = product.TryGetProperty("product_name", out var nameEl) ? nameEl.GetString() ?? "" : "";
            var brand = product.TryGetProperty("brands", out var brandEl) ? brandEl.GetString() ?? "" : "";

            return new BarcodeResult
            {
                Barcode = barcode,
                Name = CleanProductName(name, brand),
                Brand = brand,
                Ingredients = product.TryGetProperty("ingredients_text", out var ingredients) ? ingredients.GetString() : null,
                ImageUrl = product.TryGetProperty("image_url", out var image) ? image.GetString() : null,
                Categories = product.TryGetProperty("categories", out var categories) ? categories.GetString() : null,
            };
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "OpenBeautyFacts lookup failed for barcode {Barcode}", barcode);
            return null;
        }
    }

    /// <summary>
    /// Clean up product names — remove brand prefix if duplicated, trim size info, etc.
    /// </summary>
    private static string CleanProductName(string name, string brand)
    {
        if (string.IsNullOrWhiteSpace(name))
            return name;

        // Remove brand name from beginning of product name (common in UPCitemdb)
        if (!string.IsNullOrWhiteSpace(brand) &&
            name.StartsWith(brand, StringComparison.OrdinalIgnoreCase))
        {
            name = name[brand.Length..].TrimStart(' ', '-', ',');
        }

        // Trim trailing size info like "30 x 5ml", "200ml", "50g"
        name = System.Text.RegularExpressions.Regex.Replace(
            name, @"\s*\d+\s*x?\s*\d*\s*(ml|g|oz|fl\.?\s*oz|l)\s*$",
            "", System.Text.RegularExpressions.RegexOptions.IgnoreCase).Trim();

        return name;
    }
}
