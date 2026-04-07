using System.Text.Json;
using Azure;
using Azure.AI.OpenAI;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenAI.Chat;
using SelfCare.Api.Data;
using SelfCare.Api.Models.DTOs;
using SelfCare.Api.Models.Entities;

namespace SelfCare.Api.Controllers;

[ApiController]
[Route("api/routines")]
[Authorize]
public class RoutinesController(AppDbContext db, IConfiguration config) : ControllerBase
{
    private string UserId => User.FindFirst("oid")?.Value
        ?? User.FindFirst("sub")?.Value
        ?? "dev-user"; // Fallback for local dev without B2C

    [HttpGet]
    public async Task<ActionResult<Routine>> Get([FromQuery] string type)
    {
        if (type is not ("Morning" or "Evening"))
            return BadRequest("Type must be 'Morning' or 'Evening'");

        var routine = await db.Routines
            .Include(r => r.Steps.OrderBy(s => s.Order))
                .ThenInclude(s => s.Product)
            .FirstOrDefaultAsync(r => r.UserId == UserId && r.Type == type);

        if (routine is null)
        {
            // Auto-create empty routine for user
            routine = new Routine
            {
                Name = $"{type} Routine",
                Type = type,
                UserId = UserId
            };
            db.Routines.Add(routine);
            await db.SaveChangesAsync();
        }

        return Ok(routine);
    }

    [HttpPost("steps")]
    public async Task<ActionResult<RoutineStep>> AddStep(RoutineStep step)
    {
        // Verify the routine belongs to the user
        var routine = await db.Routines
            .FirstOrDefaultAsync(r => r.Id == step.RoutineId && r.UserId == UserId);

        if (routine is null) return BadRequest("Routine not found");

        // Verify the product belongs to the user
        var product = await db.Products
            .FirstOrDefaultAsync(p => p.Id == step.ProductId && p.UserId == UserId);

        if (product is null) return BadRequest("Product not found");

        db.RoutineSteps.Add(step);
        await db.SaveChangesAsync();

        // Reload with product navigation
        await db.Entry(step).Reference(s => s.Product).LoadAsync();

        return CreatedAtAction(null, step);
    }

    [HttpDelete("steps/{stepId}")]
    public async Task<IActionResult> RemoveStep(int stepId)
    {
        var step = await db.RoutineSteps
            .Include(s => s.Routine)
            .FirstOrDefaultAsync(s => s.Id == stepId);

        if (step is null) return NotFound();
        if (step.Routine.UserId != UserId) return Forbid();

        db.RoutineSteps.Remove(step);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("generate")]
    public async Task<ActionResult<GeneratedRoutine>> Generate(GenerateRoutineRequest request)
    {
        var endpoint = config["AzureOpenAI:Endpoint"];
        var apiKey = config["AzureOpenAI:ApiKey"] ?? "";
        var deploymentName = config["AzureOpenAI:DeploymentName"] ?? "gpt-4.1";

        if (string.IsNullOrEmpty(endpoint))
            return BadRequest("Azure OpenAI not configured");

        var productList = string.Join("\n", request.Products.Select(p =>
            $"- {p.Name} ({p.Brand}) — Category: {p.Category}{(p.Description != null ? $" — Ingredients: {p.Description}" : "")}"));

        var systemPrompt = $@"You are an expert dermatologist and skincare routine architect.
The user owns these skincare products:
{productList}

{(request.SkinType != null ? $"Skin type: {request.SkinType}" : "")}
{(request.SkinConcerns != null ? $"Skin concerns: {request.SkinConcerns}" : "")}

Create an optimal morning AND evening skincare routine using ONLY the products listed above.

Rules:
- Include as many of the user's products as possible across both routines. The user bought these products and wants to use them. Only skip a product if it genuinely conflicts with another or has no place in a skincare routine.
- Order products correctly: cleanser → toner → serum/treatment → eye cream → moisturizer → SPF (morning only)
- Evening can include exfoliants, retinol, heavier treatments
- Distribute products across morning and evening — a product doesn't need to be in both, but it should appear in at least one
- For each step, explain WHY it goes in that position
- Add practical notes (e.g., ""Apply to damp skin"", ""Wait 1 minute before next step"")
- Products like retinol, exfoliants, AHAs/BHAs, and masks should NOT be used daily. Create a weekly schedule showing which days they are used vs skipped.

Return ONLY valid JSON in this exact format:
{{
  ""morningSteps"": [
    {{ ""order"": 1, ""productName"": ""exact name"", ""brand"": ""brand"", ""category"": ""category"", ""notes"": ""practical tip"", ""reasoning"": ""why this order"" }}
  ],
  ""eveningSteps"": [
    {{ ""order"": 1, ""productName"": ""exact name"", ""brand"": ""brand"", ""category"": ""category"", ""notes"": ""practical tip"", ""reasoning"": ""why this order"" }}
  ],
  ""weeklySchedule"": {{
    ""monday"": {{ ""morning"": [""product name 1"", ""product name 2""], ""evening"": [""product name 1"", ""product name 2""] }},
    ""tuesday"": {{ ""morning"": [...], ""evening"": [...] }},
    ""wednesday"": {{ ""morning"": [...], ""evening"": [...] }},
    ""thursday"": {{ ""morning"": [...], ""evening"": [...] }},
    ""friday"": {{ ""morning"": [...], ""evening"": [...] }},
    ""saturday"": {{ ""morning"": [...], ""evening"": [...] }},
    ""sunday"": {{ ""morning"": [...], ""evening"": [...] }}
  }},
  ""explanation"": ""1-2 sentence overall summary of the routine strategy including weekly variation notes""
}}";

        var client = new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));
        var chatClient = client.GetChatClient(deploymentName);

        var messages = new List<ChatMessage>
        {
            new SystemChatMessage(systemPrompt),
            new UserChatMessage("Please create my optimal skincare routine from my products.")
        };

        var completion = await chatClient.CompleteChatAsync(messages, new ChatCompletionOptions
        {
            Temperature = 0.3f,
            ResponseFormat = ChatResponseFormat.CreateJsonObjectFormat(),
        });

        var responseText = completion.Value.Content[0].Text;

        // Clean up markdown fences if GPT wraps in ```json
        responseText = responseText.Trim();
        if (responseText.StartsWith("```"))
        {
            var firstNewline = responseText.IndexOf('\n');
            if (firstNewline > 0) responseText = responseText[(firstNewline + 1)..];
            if (responseText.EndsWith("```")) responseText = responseText[..^3];
            responseText = responseText.Trim();
        }

        // Remove JS-style comments that GPT sometimes adds (// ...)
        responseText = System.Text.RegularExpressions.Regex.Replace(
            responseText, @"//[^\n]*", "");

        try
        {
            var result = JsonSerializer.Deserialize<GeneratedRoutine>(responseText, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                AllowTrailingCommas = true,
                ReadCommentHandling = JsonCommentHandling.Skip,
            });

            if (result is null || (result.MorningSteps.Count == 0 && result.EveningSteps.Count == 0))
            {
                return Ok(new GeneratedRoutine { Explanation = "AI could not generate a routine. Please try again." });
            }

            return Ok(result);
        }
        catch (JsonException ex)
        {
            // Log the raw response for debugging
            Console.WriteLine($"JSON parse error: {ex.Message}");
            Console.WriteLine($"Raw response: {responseText[..Math.Min(200, responseText.Length)]}");
            return Ok(new GeneratedRoutine { Explanation = "Something went wrong parsing the AI response. Please try again." });
        }
    }

    [HttpPost("apply")]
    public async Task<ActionResult> ApplyGeneratedRoutine([FromBody] GeneratedRoutine routine)
    {
        // Get user's products for matching
        var userProducts = await db.Products
            .Where(p => p.UserId == UserId)
            .ToListAsync();

        // Process both morning and evening
        foreach (var (type, steps) in new[] { ("Morning", routine.MorningSteps), ("Evening", routine.EveningSteps) })
        {
            // Get or create routine
            var dbRoutine = await db.Routines
                .Include(r => r.Steps)
                .FirstOrDefaultAsync(r => r.UserId == UserId && r.Type == type);

            if (dbRoutine is null)
            {
                dbRoutine = new Routine { Name = $"{type} Routine", Type = type, UserId = UserId };
                db.Routines.Add(dbRoutine);
                await db.SaveChangesAsync();
            }

            // Clear existing steps
            db.RoutineSteps.RemoveRange(dbRoutine.Steps);

            // Add new steps
            foreach (var step in steps)
            {
                // Match product by name (case-insensitive)
                var product = userProducts.FirstOrDefault(p =>
                    p.Name.Equals(step.ProductName, StringComparison.OrdinalIgnoreCase)) ??
                    userProducts.FirstOrDefault(p =>
                    p.Name.Contains(step.ProductName, StringComparison.OrdinalIgnoreCase) ||
                    step.ProductName.Contains(p.Name, StringComparison.OrdinalIgnoreCase));

                if (product != null)
                {
                    db.RoutineSteps.Add(new RoutineStep
                    {
                        RoutineId = dbRoutine.Id,
                        ProductId = product.Id,
                        Order = step.Order,
                        Notes = step.Notes,
                    });
                }
            }

            await db.SaveChangesAsync();
        }

        return Ok();
    }
}
