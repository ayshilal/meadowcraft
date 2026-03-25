using System.Text.Json;
using Azure;
using Azure.AI.OpenAI;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using OpenAI.Chat;
using SelfCare.Api.Models.DTOs;

namespace SelfCare.Api.Services;

public class VisionService(IConfiguration config, IHttpClientFactory httpClientFactory, ILogger<VisionService> logger) : IVisionService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public async Task<ProductIdentification> IdentifyProductAsync(string base64Image, string? clientBarcode = null)
    {
        var chatClient = CreateChatClient();

        var messages = new List<ChatMessage>
        {
            new SystemChatMessage("""
                You are a skincare product identification and ingredient analysis expert. Analyze the image, identify the product, and rate its ingredients.

                Return ONLY valid JSON in this exact format (no markdown, no code fences):
                {
                    "name": "Product Name",
                    "brand": "Brand Name",
                    "category": "one of: Cleanser, Toner, Serum, Moisturizer, SPF, Mask, Exfoliant, Eye Cream, Oil, Other",
                    "description": "Brief description of what this product does",
                    "ingredients": ["ingredient1", "ingredient2"],
                    "confidence": 0.85,
                    "imageUrl": "https://example.com/product-image.jpg — a real, publicly accessible product image URL from a major retailer like Sephora, Ulta, Nordstrom, or the brand's official site. Return null if unknown.",
                    "apothecaryRating": {
                        "actives": 75,
                        "purity": 80,
                        "harmony": 0,
                        "grade": "Commendable",
                        "ingredientRatings": [
                            { "name": "Niacinamide", "rating": "beneficial", "note": "Brightening and pore-minimizing" },
                            { "name": "Fragrance", "rating": "caution", "note": "May cause sensitivity" },
                            { "name": "Aqua", "rating": "neutral", "note": "Base solvent" }
                        ]
                    }
                }

                Scoring rules:
                - actives (0-100): Score based on proven active ingredients (retinol, niacinamide, vitamin C, hyaluronic acid, AHAs, BHAs, peptides, ceramides, etc.)
                - purity (0-100): Score based on absence of irritants (deduct for fragrance, alcohol denat, SLS/SLES, parabens, essential oils, dyes)
                - harmony: Always set to 0 (computed separately against user's routine)
                - grade: Based on average of actives + purity:
                  90+ = "Exemplary", 75-89 = "Commendable", 55-74 = "Agreeable", 35-54 = "Questionable", below 35 = "Cautionary"
                - ingredientRatings: Rate EVERY ingredient as "beneficial", "neutral", or "caution" with a short note

                If you can see the ingredient list on the product, include those actual ingredients.
                If you can't read ingredients but recognize the product, list known ingredients from your training data.
                Set confidence between 0.0 and 1.0 based on how certain you are of the identification.
                """),
            new UserChatMessage(
                ChatMessageContentPart.CreateTextPart("Identify this skincare product."),
                ChatMessageContentPart.CreateImagePart(
                    BinaryData.FromBytes(Convert.FromBase64String(base64Image)),
                    "image/jpeg"))
        };

        var completion = await chatClient.CompleteChatAsync(messages, new ChatCompletionOptions
        {
            MaxOutputTokenCount = 1024,
            Temperature = 0.2f
        });

        var responseText = completion.Value.Content[0].Text;

        try
        {
            var result = JsonSerializer.Deserialize<ProductIdentification>(responseText, JsonOptions)
                ?? new ProductIdentification { Name = "Unknown Product", Confidence = 0 };

            // Look up product image: GPT URL → Open Beauty Facts → UPCitemdb → camera capture
            if (result.Confidence > 0.5 && !string.IsNullOrEmpty(result.Name))
            {
                // Collect all candidate image URLs to try
                var candidates = new List<string>();

                // 1. GPT-provided URL
                if (!string.IsNullOrEmpty(result.ImageUrl) && result.ImageUrl.StartsWith("http"))
                {
                    candidates.Add(result.ImageUrl);
                    logger.LogInformation("GPT returned image URL: {Url}", result.ImageUrl);
                }
                result.ImageUrl = null;

                // 2. Open Beauty Facts
                var obfUrl = await LookupBeautyFactsImageAsync(result.Name, result.Brand);
                if (obfUrl != null) candidates.Add(obfUrl);

                // 3. UPCitemdb text search
                var upcUrl = await LookupProductImageAsync(result.Name, result.Brand);
                if (upcUrl != null) candidates.Add(upcUrl);

                // Try each candidate until one successfully uploads to blob
                foreach (var url in candidates)
                {
                    var blobUrl = await UploadExternalImageToBlobAsync(url, result.Name, result.Brand);
                    if (!string.IsNullOrEmpty(blobUrl))
                    {
                        result.ImageUrl = blobUrl;
                        logger.LogInformation("Product image saved from: {Url}", url);
                        break;
                    }
                }

                // Last resort: camera capture
                if (string.IsNullOrEmpty(result.ImageUrl))
                {
                    logger.LogInformation("No external image found, using camera capture for {Name}", result.Name);
                    result.ImageUrl = await UploadBase64ToBlobAsync(base64Image, result.Name, result.Brand);
                }
            }

            return result;
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Failed to parse GPT vision response: {Response}", responseText);
            return new ProductIdentification { Name = "Unknown Product", Description = responseText, Confidence = 0 };
        }
    }

    private async Task<string?> LookupByBarcodeAsync(string barcode)
    {
        try
        {
            var httpClient = httpClientFactory.CreateClient();
            var response = await httpClient.GetAsync($"https://api.upcitemdb.com/prod/trial/lookup?upc={barcode}");

            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("items", out var items) || items.GetArrayLength() == 0)
                return null;

            var firstItem = items[0];
            if (firstItem.TryGetProperty("images", out var images) && images.GetArrayLength() > 0)
            {
                return images[0].GetString();
            }

            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed barcode lookup for {Barcode}", barcode);
            return null;
        }
    }

    private async Task<string?> LookupProductImageAsync(string name, string brand)
    {
        try
        {
            var httpClient = httpClientFactory.CreateClient();
            var query = Uri.EscapeDataString($"{brand} {name}".Trim());
            var response = await httpClient.GetAsync($"https://api.upcitemdb.com/prod/trial/search?s={query}&type=product");

            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("items", out var items) || items.GetArrayLength() == 0)
                return null;

            // Find the best matching item by checking title similarity
            var searchName = name.ToLowerInvariant();
            string? bestImage = null;

            foreach (var item in items.EnumerateArray())
            {
                if (!item.TryGetProperty("images", out var images) || images.GetArrayLength() == 0)
                    continue;

                var title = item.TryGetProperty("title", out var t) ? t.GetString()?.ToLowerInvariant() ?? "" : "";

                // Check if title contains key words from the product name
                var nameWords = searchName.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                    .Where(w => w.Length > 2).ToArray();
                var matchCount = nameWords.Count(w => title.Contains(w));

                if (matchCount >= nameWords.Length / 2 || bestImage == null)
                {
                    bestImage = images[0].GetString();
                    if (matchCount >= nameWords.Length / 2) break; // Good enough match
                }
            }

            return bestImage;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to look up product image for {Name} {Brand}", name, brand);
            return null;
        }
    }

    private async Task<string?> LookupBeautyFactsImageAsync(string name, string brand)
    {
        try
        {
            var httpClient = httpClientFactory.CreateClient();
            var query = Uri.EscapeDataString($"{brand} {name}".Trim());
            var baseUrl = config["OpenBeautyFacts:BaseUrl"] ?? "https://world.openbeautyfacts.org";
            var response = await httpClient.GetAsync($"{baseUrl.TrimEnd('/')}/cgi/search.pl?search_terms={query}&json=1&page_size=5");

            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("products", out var products) || products.GetArrayLength() == 0)
                return null;

            // Find best match with an image
            var searchName = name.ToLowerInvariant();
            foreach (var product in products.EnumerateArray())
            {
                var imageUrl = product.TryGetProperty("image_url", out var img) ? img.GetString() : null;
                if (string.IsNullOrEmpty(imageUrl)) continue;

                var productName = product.TryGetProperty("product_name", out var pn) ? pn.GetString()?.ToLowerInvariant() ?? "" : "";
                var nameWords = searchName.Split(' ', StringSplitOptions.RemoveEmptyEntries).Where(w => w.Length > 2).ToArray();
                var matchCount = nameWords.Count(w => productName.Contains(w));

                if (matchCount >= nameWords.Length / 2 || matchCount >= 1)
                {
                    return imageUrl;
                }
            }

            // Return first product with an image as fallback
            foreach (var product in products.EnumerateArray())
            {
                var imageUrl = product.TryGetProperty("image_url", out var img) ? img.GetString() : null;
                if (!string.IsNullOrEmpty(imageUrl)) return imageUrl;
            }

            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to look up Beauty Facts image for {Name} {Brand}", name, brand);
            return null;
        }
    }

    private async Task<string?> UploadBase64ToBlobAsync(string base64Image, string name, string brand)
    {
        try
        {
            var containerClient = GetBlobContainerClient();
            var blobName = GenerateBlobName(name, brand, "jpg");
            var blobClient = containerClient.GetBlobClient(blobName);

            var imageBytes = Convert.FromBase64String(base64Image);
            using var stream = new MemoryStream(imageBytes);
            await blobClient.UploadAsync(stream, new BlobHttpHeaders { ContentType = "image/jpeg" });

            return blobClient.Uri.ToString();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to upload camera capture to blob for {Name}", name);
            return null;
        }
    }

    private async Task<string?> UploadExternalImageToBlobAsync(string imageUrl, string name, string brand)
    {
        try
        {
            var httpClient = httpClientFactory.CreateClient();
            var imageBytes = await httpClient.GetByteArrayAsync(imageUrl);

            var extension = imageUrl.Contains(".png", StringComparison.OrdinalIgnoreCase) ? "png" : "jpg";
            var contentType = extension == "png" ? "image/png" : "image/jpeg";

            var containerClient = GetBlobContainerClient();
            var blobName = GenerateBlobName(name, brand, extension);
            var blobClient = containerClient.GetBlobClient(blobName);

            using var stream = new MemoryStream(imageBytes);
            await blobClient.UploadAsync(stream, new BlobHttpHeaders { ContentType = contentType });

            return blobClient.Uri.ToString();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to download and upload external image for {Name}", name);
            return null;
        }
    }

    private BlobContainerClient GetBlobContainerClient()
    {
        var connectionString = config["AzureBlobStorage:ConnectionString"]
            ?? throw new InvalidOperationException("AzureBlobStorage:ConnectionString not configured");
        var containerName = config["AzureBlobStorage:ContainerName"] ?? "product-images";
        return new BlobContainerClient(connectionString, containerName);
    }

    private static string GenerateBlobName(string name, string brand, string extension)
    {
        var slug = $"{brand}-{name}"
            .ToLowerInvariant()
            .Replace(' ', '-')
            .Replace("'", "")
            .Replace("\"", "");
        // Remove any non-alphanumeric chars except hyphens
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"[^a-z0-9\-]", "");
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        return $"{slug}-{timestamp}.{extension}";
    }

    public async Task<IngredientAnalysis> AnalyzeIngredientsAsync(string ingredientText)
    {
        var chatClient = CreateChatClient();

        var messages = new List<ChatMessage>
        {
            new SystemChatMessage("""
                You are a skincare ingredient analysis expert. Analyze the provided ingredient list.

                Return ONLY valid JSON in this exact format (no markdown, no code fences):
                {
                    "keyActives": ["Niacinamide - brightening and pore-minimizing", "Hyaluronic Acid - hydration"],
                    "potentialIrritants": ["Fragrance - may cause sensitivity"],
                    "skinBenefits": ["Hydrating", "Anti-aging", "Brightening"],
                    "summary": "A brief 1-2 sentence overall assessment of this product's ingredient list."
                }
                """),
            new UserChatMessage($"Analyze these skincare ingredients:\n\n{ingredientText}")
        };

        var completion = await chatClient.CompleteChatAsync(messages, new ChatCompletionOptions
        {
            MaxOutputTokenCount = 1024,
            Temperature = 0.3f
        });

        var responseText = completion.Value.Content[0].Text;

        try
        {
            return JsonSerializer.Deserialize<IngredientAnalysis>(responseText, JsonOptions)
                ?? new IngredientAnalysis { Summary = responseText };
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Failed to parse ingredient analysis: {Response}", responseText);
            return new IngredientAnalysis { Summary = responseText };
        }
    }

    public async Task<HarmonyResult> GetHarmonyScoreAsync(HarmonyRequest request)
    {
        var chatClient = CreateChatClient();

        var existingList = string.Join("\n", request.ExistingProducts.Select(p =>
            $"  - {p.Name}: {p.Ingredients}"));

        var messages = new List<ChatMessage>
        {
            new SystemChatMessage("""
                You are a skincare routine compatibility expert. Analyze whether a new product's ingredients are compatible with the user's existing routine.

                Return ONLY valid JSON in this exact format (no markdown, no code fences):
                {
                    "harmony": 85,
                    "conflicts": ["Don't layer Vitamin C with Retinol - use in separate routines"],
                    "synergies": ["Hyaluronic Acid pairs well with Niacinamide for enhanced hydration"]
                }

                Scoring rules for harmony (0-100):
                - Start at 80 (baseline compatibility)
                - Deduct 15-25 for each serious conflict (e.g., AHA/BHA with retinol, Vitamin C with niacinamide at high concentrations)
                - Add 5-10 for each beneficial synergy
                - Cap at 0 minimum, 100 maximum
                - If no existing products, return harmony: 100 with empty arrays
                """),
            new UserChatMessage($"""
                New product ingredients: {string.Join(", ", request.ProductIngredients)}

                Existing products in user's routine:
                {existingList}
                """)
        };

        var completion = await chatClient.CompleteChatAsync(messages, new ChatCompletionOptions
        {
            MaxOutputTokenCount = 1024,
            Temperature = 0.3f
        });

        var responseText = completion.Value.Content[0].Text;

        try
        {
            return JsonSerializer.Deserialize<HarmonyResult>(responseText, JsonOptions)
                ?? new HarmonyResult { Harmony = 50 };
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Failed to parse harmony result: {Response}", responseText);
            return new HarmonyResult { Harmony = 50 };
        }
    }

    public async Task<ApothecaryRating> AnalyzeProductByNameAsync(string name, string brand, string? ingredients)
    {
        var chatClient = CreateChatClient();

        var ingredientInfo = !string.IsNullOrWhiteSpace(ingredients)
            ? $"Known ingredients: {ingredients}"
            : "Ingredients not provided — use your training data knowledge of this product.";

        var messages = new List<ChatMessage>
        {
            new SystemChatMessage("""
                You are a skincare ingredient analysis expert. Given a product name and brand, provide an apothecary rating.

                Return ONLY valid JSON in this exact format (no markdown, no code fences):
                {
                    "actives": 75,
                    "purity": 80,
                    "harmony": 0,
                    "grade": "Commendable",
                    "ingredientRatings": [
                        { "name": "Niacinamide", "rating": "beneficial", "note": "Brightening and pore-minimizing" },
                        { "name": "Fragrance", "rating": "caution", "note": "May cause sensitivity" },
                        { "name": "Aqua", "rating": "neutral", "note": "Base solvent" }
                    ]
                }

                Scoring rules:
                - actives (0-100): Score based on proven active ingredients
                - purity (0-100): Score based on absence of irritants
                - harmony: Always set to 0 (computed separately)
                - grade: Based on average of actives + purity:
                  90+ = "Exemplary", 75-89 = "Commendable", 55-74 = "Agreeable", 35-54 = "Questionable", below 35 = "Cautionary"
                - ingredientRatings: Rate key ingredients as "beneficial", "neutral", or "caution"
                """),
            new UserChatMessage($"Product: {brand} {name}\n{ingredientInfo}")
        };

        var completion = await chatClient.CompleteChatAsync(messages, new ChatCompletionOptions
        {
            MaxOutputTokenCount = 1024,
            Temperature = 0.2f
        });

        var responseText = completion.Value.Content[0].Text;

        try
        {
            return JsonSerializer.Deserialize<ApothecaryRating>(responseText, JsonOptions)
                ?? new ApothecaryRating { Grade = "Unknown" };
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Failed to parse product analysis: {Response}", responseText);
            return new ApothecaryRating { Grade = "Unknown" };
        }
    }

    private ChatClient CreateChatClient()
    {
        var endpoint = config["AzureOpenAI:Endpoint"]
            ?? throw new InvalidOperationException("AzureOpenAI:Endpoint not configured");
        var apiKey = config["AzureOpenAI:ApiKey"] ?? "";
        var deploymentName = config["AzureOpenAI:DeploymentName"] ?? "gpt-4.1";

        var client = new AzureOpenAIClient(
            new Uri(endpoint),
            new AzureKeyCredential(apiKey));

        return client.GetChatClient(deploymentName);
    }
}
