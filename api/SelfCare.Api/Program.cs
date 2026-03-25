using Microsoft.EntityFrameworkCore;
using SelfCare.Api;
using SelfCare.Api.Data;

var builder = WebApplication.CreateBuilder(args);
builder.AddApiServices();

var app = builder.Build();
app.MapApiPipeline();

// Apply migrations and seed reference data on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await SeedData.InitializeAsync(db); // Beauty facts & recommendations only
    // SeedUserDataAsync removed — no more mock products/routines
}

app.Run();
