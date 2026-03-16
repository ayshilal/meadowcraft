var builder = DistributedApplication.CreateBuilder(args);

// Azure PostgreSQL — connection string from appsettings.json
var postgres = builder.AddConnectionString("selfcaredb");

// API project
var api = builder.AddProject<Projects.SelfCare_Api>("api")
    .WithReference(postgres)
    .WithExternalHttpEndpoints();

// Angular frontend — runs "ng serve" on port 4200
builder.AddNpmApp("frontend", "../../", "start")
    .WithReference(api)
    .WithHttpEndpoint(port: 4200, targetPort: 4200, isProxied: false)
    .WithExternalHttpEndpoints();

builder.Build().Run();
