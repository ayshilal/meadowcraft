# Meadowcraft

A luxury self-care and skincare routine app with an AI dermatologist chatbot, built with Angular/Ionic and .NET Aspire.

## Features

- **Skincare Routines** — Build and manage morning and evening routines with drag-and-drop reordering
- **Product Collection** — Track your skincare products with barcode scanning via Open Beauty Facts
- **AI Dermatologist** — Chat with an AI-powered skincare advisor (Azure OpenAI GPT-4.1) that knows your products and routine
- **RAG Knowledge Base** — AI responses enriched with curated skincare knowledge via Azure AI Search
- **Discover** — Browse skincare articles and tips

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 19, Ionic 8, SCSS (William Morris Arts & Crafts theme) |
| Backend | .NET 9, ASP.NET Core Web API |
| Orchestration | .NET Aspire 9.2 |
| Database | Azure PostgreSQL (Flexible Server) |
| AI | Azure OpenAI (GPT-4.1), Azure AI Search (semantic/RAG) |
| Auth | Azure AD B2C (optional — app works without it) |
| Hosting | Azure Static Web Apps (frontend), Azure App Service F1 (API) |

## Project Structure

```
meadowcraft/
├── src/                          # Angular/Ionic frontend
│   ├── app/
│   │   ├── pages/                # Home, Routine, Products, Discover, Profile
│   │   ├── services/             # API, AI Chat, Products, Routines
│   │   └── models/               # TypeScript interfaces
│   └── environments/             # Dev and prod API URLs
├── api/                          # .NET backend
│   ├── SelfCare.Api/             # ASP.NET Core Web API
│   │   ├── Controllers/          # Products, Routines, Chat, BeautyFacts
│   │   ├── Services/             # ChatService (OpenAI + RAG), BarcodeService
│   │   ├── Models/               # Entities and DTOs
│   │   └── Data/                 # EF Core DbContext
│   ├── SelfCare.AppHost/         # .NET Aspire orchestration
│   └── SelfCare.ServiceDefaults/ # Shared Aspire config
└── src/staticwebapp.config.json  # Azure SWA routing config
```

## Getting Started

### Prerequisites

- Node.js 20+
- .NET 9 SDK
- Azure PostgreSQL database

### Frontend

```bash
npm install
npx ng serve
```

App runs at `http://localhost:4200`.

### Backend

1. Copy `api/SelfCare.Api/appsettings.Template.json` to `appsettings.json` and fill in your credentials
2. Copy `api/SelfCare.AppHost/appsettings.Template.json` to `appsettings.json` and fill in your connection string

```bash
cd api/SelfCare.AppHost
dotnet run
```

This starts the Aspire dashboard with the API and frontend.

Or run the API standalone:

```bash
cd api/SelfCare.Api
dotnet run
```

API runs at `https://localhost:5000`.

## Deployment

### API (Azure App Service)

```bash
cd api/SelfCare.Api
dotnet publish -c Release -o ./publish
# Windows:
powershell -Command "Compress-Archive -Path './publish/*' -DestinationPath './deploy.zip' -Force"
az webapp deploy --name <app-name> --resource-group <rg-name> --src-path ./deploy.zip --type zip
```

### Frontend (Azure Static Web Apps)

```bash
npx ng build --configuration production
swa deploy ./www --deployment-token "<token>" --env production
```

## Environment Variables (App Service)

Set these in Azure App Service Configuration:

- `ConnectionStrings__selfcaredb` — PostgreSQL connection string
- `AzureOpenAI__Endpoint` — Azure OpenAI endpoint URL
- `AzureOpenAI__ApiKey` — Azure OpenAI API key
- `AzureOpenAI__DeploymentName` — Model deployment name (e.g., `gpt-4.1`)
