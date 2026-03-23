using System.Text.Json;
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;
using SelfCare.Api.Models.DTOs;

namespace SelfCare.Api.Services;

public class VisionService(IConfiguration config, ILogger<VisionService> logger) : IVisionService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public async Task<ProductIdentification> IdentifyProductAsync(string base64Image)
    {
        var chatClient = CreateChatClient();

        var messages = new List<ChatMessage>
        {
            new SystemChatMessage("""
                You are a skincare product identification expert. Analyze the image and identify the product.

                Return ONLY valid JSON in this exact format (no markdown, no code fences):
                {
                    "name": "Product Name",
                    "brand": "Brand Name",
                    "category": "one of: Cleanser, Toner, Serum, Moisturizer, SPF, Mask, Exfoliant, Eye Cream, Oil, Other",
                    "description": "Brief description of what this product does",
                    "ingredients": ["ingredient1", "ingredient2"],
                    "confidence": 0.85
                }

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
            return JsonSerializer.Deserialize<ProductIdentification>(responseText, JsonOptions)
                ?? new ProductIdentification { Name = "Unknown Product", Confidence = 0 };
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Failed to parse GPT vision response: {Response}", responseText);
            return new ProductIdentification { Name = "Unknown Product", Description = responseText, Confidence = 0 };
        }
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
