using Azure;
using Azure.AI.OpenAI;
using Azure.Search.Documents;
using Azure.Search.Documents.Models;
using OpenAI.Chat;
using SelfCare.Api.Models.DTOs;

namespace SelfCare.Api.Services;

public class ChatService : IChatService
{
    private readonly IConfiguration _config;
    private readonly ILogger<ChatService> _logger;

    public ChatService(IConfiguration config, ILogger<ChatService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task<ChatResponse> SendMessageAsync(ChatRequest request)
    {
        var endpoint = _config["AzureOpenAI:Endpoint"];
        var searchEndpoint = _config["AzureAISearch:Endpoint"];

        if (string.IsNullOrEmpty(endpoint))
        {
            _logger.LogWarning("Azure OpenAI not configured, returning mock response");
            return new ChatResponse
            {
                Response = "I'm your AI dermatologist! Azure OpenAI is not configured yet. Please set up your Azure OpenAI connection string to enable AI-powered skincare advice.",
                Sources = []
            };
        }

        // Build system prompt (same persona as the frontend's Anthropic integration)
        var systemPrompt = BuildSystemPrompt(request);

        // RAG: retrieve relevant knowledge from Azure AI Search
        var knowledgeContext = "";
        var sources = new List<string>();
        if (!string.IsNullOrEmpty(searchEndpoint))
        {
            (knowledgeContext, sources) = await RetrieveKnowledgeAsync(searchEndpoint, request.Message);
        }

        if (!string.IsNullOrEmpty(knowledgeContext))
        {
            systemPrompt += $"\n\nRelevant skincare knowledge from our database:\n{knowledgeContext}\n\nAlways cite the sources when using this information.";
        }

        // Call Azure OpenAI
        var apiKey = _config["AzureOpenAI:ApiKey"] ?? "";
        var deploymentName = _config["AzureOpenAI:DeploymentName"] ?? "gpt-41";

        var client = new AzureOpenAIClient(
            new Uri(endpoint),
            new AzureKeyCredential(apiKey));

        var chatClient = client.GetChatClient(deploymentName);

        var messages = new List<ChatMessage> { new SystemChatMessage(systemPrompt) };

        foreach (var msg in request.History)
        {
            if (msg.Role == "user")
                messages.Add(new UserChatMessage(msg.Content));
            else if (msg.Role == "assistant")
                messages.Add(new AssistantChatMessage(msg.Content));
        }

        messages.Add(new UserChatMessage(request.Message));

        var completion = await chatClient.CompleteChatAsync(messages, new ChatCompletionOptions
        {
            MaxOutputTokenCount = 1024,
            Temperature = 0.7f
        });

        var responseText = completion.Value.Content[0].Text;

        return new ChatResponse
        {
            Response = responseText,
            Sources = sources
        };
    }

    private static string BuildSystemPrompt(ChatRequest request)
    {
        var routineContext = "";
        if (request.Steps.Count > 0)
        {
            var stepDetails = string.Join("\n", request.Steps.Select((s, i) =>
                $"  {i + 1}. {s.ProductName} ({s.Brand}) — {s.Category}{(s.Notes != null ? $" — Notes: {s.Notes}" : "")}"));
            routineContext = $"\n\nThe user's current {request.RoutineType} skincare routine:\n{stepDetails}";
        }
        else
        {
            routineContext = $"\n\nThe user has no steps in their {request.RoutineType} routine yet.";
        }

        var productsContext = "";
        if (request.Products.Count > 0)
        {
            var productDetails = string.Join("\n", request.Products.Select(p =>
                $"  - {p.Name} ({p.Brand}) — {p.Category}{(p.Description != null ? $" — {p.Description}" : "")}"));
            productsContext = $"\n\nAll products the user owns:\n{productDetails}\n\nWhen suggesting routine changes, prefer recommending from the user's existing products.";
        }

        return $"""
            You are a friendly, knowledgeable board-certified dermatologist providing personalized skincare advice through a luxury self-care app called "Meadowcraft."

            Your personality:
            - Warm, approachable, and encouraging
            - Evidence-based but accessible — avoid overly clinical jargon
            - Concise responses (2-4 short paragraphs max)
            - When recommending products, suggest categories/ingredients rather than specific brands
            - Always remind users that for serious skin conditions, they should see a dermatologist in person

            You have access to the user's skincare routine and product collection, and should reference them when relevant.{routineContext}{productsContext}
            """;
    }

    private async Task<(string context, List<string> sources)> RetrieveKnowledgeAsync(
        string searchEndpoint, string query)
    {
        try
        {
            var apiKey = _config["AzureAISearch:ApiKey"] ?? "";
            var indexName = _config["AzureAISearch:IndexName"] ?? "skincare-knowledge";

            var searchClient = new SearchClient(
                new Uri(searchEndpoint),
                indexName,
                new AzureKeyCredential(apiKey));

            var searchOptions = new SearchOptions
            {
                Size = 3,
                QueryType = SearchQueryType.Semantic,
                SemanticSearch = new SemanticSearchOptions
                {
                    SemanticConfigurationName = "default"
                }
            };

            var results = await searchClient.SearchAsync<SearchDocument>(query, searchOptions);

            var chunks = new List<string>();
            var sources = new List<string>();

            await foreach (var result in results.Value.GetResultsAsync())
            {
                if (result.Document.TryGetValue("content", out var content))
                {
                    chunks.Add(content?.ToString() ?? "");
                }
                if (result.Document.TryGetValue("title", out var title))
                {
                    sources.Add(title?.ToString() ?? "");
                }
            }

            return (string.Join("\n\n---\n\n", chunks), sources);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Azure AI Search retrieval failed, proceeding without RAG context");
            return ("", []);
        }
    }
}
