using Microsoft.AspNetCore.Authentication.JwtBearer;
using SelfCare.Api.Data;
using SelfCare.Api.Services;

namespace SelfCare.Api;

public static class DependencyInjection
{
    public static WebApplicationBuilder AddApiServices(this WebApplicationBuilder builder)
    {
        // Aspire service defaults (OpenTelemetry, health checks, resilience)
        builder.AddServiceDefaults();

        // PostgreSQL via Aspire — connection string injected by AppHost
        builder.AddNpgsqlDbContext<AppDbContext>("selfcaredb");

        // Authentication — Azure AD B2C (bypass if not configured)
        var authority = builder.Configuration["AzureAdB2C:Authority"] ?? "";
        var b2cConfigured = !string.IsNullOrEmpty(authority) && !authority.Contains("{tenant}");

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                if (b2cConfigured)
                {
                    options.Authority = authority;
                    options.Audience = builder.Configuration["AzureAdB2C:ClientId"];
                    options.TokenValidationParameters.ValidateIssuer = true;
                }
                else
                {
                    // B2C not configured yet — allow anonymous
                    options.RequireHttpsMetadata = false;
                    options.TokenValidationParameters.ValidateIssuer = false;
                    options.TokenValidationParameters.ValidateAudience = false;
                    options.TokenValidationParameters.ValidateLifetime = false;
                    options.TokenValidationParameters.RequireSignedTokens = false;
                    options.TokenValidationParameters.SignatureValidator =
                        (token, parameters) => new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(token);
                }
            });

        // Without B2C, add fallback auth policy that allows anonymous
        if (!b2cConfigured)
        {
            builder.Services.AddAuthorization(options =>
            {
                options.DefaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
                    .RequireAssertion(_ => true)
                    .Build();
            });
        }

        // Services
        builder.Services.AddHttpClient<IBarcodeService, BarcodeService>();
        builder.Services.AddScoped<IChatService, ChatService>();

        // CORS — allow Angular dev server, Ionic, and production
        var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? ["http://localhost:4200", "http://localhost:8100", "https://localhost:4200"];
        builder.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
                policy.WithOrigins(corsOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod());
        });

        builder.Services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.ReferenceHandler =
                    System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
            });

        builder.Services.AddOpenApi();

        return builder;
    }

    public static WebApplication MapApiPipeline(this WebApplication app)
    {
        // Aspire health check endpoints
        app.MapDefaultEndpoints();

        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
        }

        app.UseHttpsRedirection();
        app.UseCors();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();

        return app;
    }
}
