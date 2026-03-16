using Microsoft.EntityFrameworkCore;
using SelfCare.Api.Models.Entities;

namespace SelfCare.Api.Data;

public static class SeedData
{
    public static async Task InitializeAsync(AppDbContext db)
    {
        if (!await db.BeautyFacts.AnyAsync())
        {
            db.BeautyFacts.AddRange(
                new BeautyFact { Title = "The Power of Vitamin C", Content = "Vitamin C is a powerful antioxidant that brightens skin, boosts collagen production, and protects against sun damage. Apply it in the morning before sunscreen for best results.", Category = "Ingredient Spotlight" },
                new BeautyFact { Title = "Why SPF is Non-Negotiable", Content = "UV rays cause 80% of visible skin aging. Wearing SPF 30+ daily prevents wrinkles, dark spots, and skin cancer — even on cloudy days.", Category = "Skincare Tips" },
                new BeautyFact { Title = "Beauty Sleep is Real", Content = "Your skin repairs itself while you sleep. Growth hormone production peaks during deep sleep, boosting cell regeneration and collagen synthesis.", Category = "Wellness" },
                new BeautyFact { Title = "Hydration from Within", Content = "Drinking at least 8 glasses of water daily helps maintain skin elasticity and flush toxins. Add cucumber or lemon for extra antioxidants.", Category = "Daily Habits" },
                new BeautyFact { Title = "The Magic of Retinol", Content = "Retinol accelerates cell turnover, reduces fine lines, and clears pores. Start with a low concentration and always use sunscreen the next day.", Category = "Ingredient Spotlight" },
                new BeautyFact { Title = "Nourish Your Skin with Omega-3", Content = "Omega-3 fatty acids found in salmon, walnuts, and flaxseed strengthen the skin barrier and reduce inflammation for a healthy glow.", Category = "Nutrition" },
                new BeautyFact { Title = "Double Cleansing Method", Content = "Start with an oil-based cleanser to remove makeup and SPF, then follow with a water-based cleanser. This ensures a truly clean canvas for your treatments.", Category = "Skincare Tips" },
                new BeautyFact { Title = "Stress and Your Skin", Content = "Cortisol from stress triggers excess oil production and breakouts. Practice meditation, deep breathing, or gentle exercise to keep your skin calm.", Category = "Wellness" },
                new BeautyFact { Title = "The Benefits of Niacinamide", Content = "Niacinamide (vitamin B3) is a versatile ingredient that minimizes pores, evens skin tone, and strengthens the skin barrier. It pairs well with nearly every active and is gentle enough for sensitive skin. Use it morning and night for best results.", Category = "Ingredient Spotlight" }
            );
        }

        if (!await db.Recommendations.AnyAsync())
        {
            db.Recommendations.AddRange(
                new Recommendation { Title = "Morning Meditation", Description = "Start your day with 5 minutes of mindfulness. Reduced stress means clearer, more radiant skin.", Icon = "sunny-outline", Category = "Wellness" },
                new Recommendation { Title = "Silk Pillowcase", Description = "Switch to a silk pillowcase to reduce friction on your skin and hair while you sleep.", Icon = "moon-outline", Category = "Daily Habits" },
                new Recommendation { Title = "Weekly Face Mask", Description = "Treat yourself to a hydrating or clay mask once a week for deep nourishment.", Icon = "sparkles-outline", Category = "Skincare Tips" },
                new Recommendation { Title = "Green Tea Benefits", Description = "Replace your afternoon coffee with green tea for powerful polyphenols that fight aging.", Icon = "leaf-outline", Category = "Nutrition" },
                new Recommendation { Title = "Facial Massage", Description = "Spend 2 minutes massaging your face while applying serum to boost circulation and absorption.", Icon = "heart-outline", Category = "Skincare Tips" },
                new Recommendation { Title = "Digital Detox", Description = "Blue light from screens can damage skin. Take 10-minute breaks every hour and use blue light protection.", Icon = "phone-portrait-outline", Category = "Wellness" }
            );
        }

        await db.SaveChangesAsync();
    }

    public static async Task SeedUserDataAsync(AppDbContext db, string userId)
    {
        // Seed default products for a new user
        if (!await db.Products.AnyAsync(p => p.UserId == userId))
        {
            db.Products.AddRange(
                new Product { Name = "Gentle Foaming Cleanser", Brand = "CeraVe", Category = "Cleanser", Description = "A gentle, hydrating cleanser for all skin types.", UserId = userId },
                new Product { Name = "Hyaluronic Acid Serum", Brand = "The Ordinary", Category = "Serum", Description = "Intense hydration with pure hyaluronic acid.", UserId = userId },
                new Product { Name = "Moisturizing Cream", Brand = "La Roche-Posay", Category = "Moisturizer", Description = "Rich moisturizer for dry to very dry skin.", UserId = userId },
                new Product { Name = "UV Expert SPF 50", Brand = "Lancôme", Category = "SPF", Description = "Lightweight sunscreen with broad-spectrum protection.", UserId = userId },
                new Product { Name = "Rose Water Toner", Brand = "Thayers", Category = "Toner", Description = "Alcohol-free witch hazel toner with rose petal.", UserId = userId }
            );
            await db.SaveChangesAsync();
        }

        // Get products by name for routine step references
        var products = await db.Products.Where(p => p.UserId == userId).ToListAsync();
        if (products.Count < 5) return;

        var cleanser = products.First(p => p.Category == "Cleanser");
        var toner = products.First(p => p.Category == "Toner");
        var serum = products.First(p => p.Category == "Serum");
        var moisturizer = products.First(p => p.Category == "Moisturizer");
        var spf = products.First(p => p.Category == "SPF");

        // Seed morning routine
        var morningRoutine = await db.Routines
            .FirstOrDefaultAsync(r => r.UserId == userId && r.Type == "Morning");
        if (morningRoutine is null)
        {
            morningRoutine = new Routine { Name = "Morning Routine", Type = "Morning", UserId = userId };
            db.Routines.Add(morningRoutine);
            await db.SaveChangesAsync();
        }

        if (!await db.RoutineSteps.AnyAsync(s => s.RoutineId == morningRoutine.Id))
        {
            db.RoutineSteps.AddRange(
                new RoutineStep { RoutineId = morningRoutine.Id, ProductId = cleanser.Id, Order = 1, Notes = "Massage gently for 60 seconds" },
                new RoutineStep { RoutineId = morningRoutine.Id, ProductId = toner.Id, Order = 2, Notes = "Apply with cotton pad" },
                new RoutineStep { RoutineId = morningRoutine.Id, ProductId = serum.Id, Order = 3, Notes = "Pat into damp skin" },
                new RoutineStep { RoutineId = morningRoutine.Id, ProductId = moisturizer.Id, Order = 4, Notes = "Apply evenly" },
                new RoutineStep { RoutineId = morningRoutine.Id, ProductId = spf.Id, Order = 5, Notes = "Last step, always!" }
            );
            await db.SaveChangesAsync();
        }

        // Seed evening routine
        var eveningRoutine = await db.Routines
            .FirstOrDefaultAsync(r => r.UserId == userId && r.Type == "Evening");
        if (eveningRoutine is null)
        {
            eveningRoutine = new Routine { Name = "Evening Routine", Type = "Evening", UserId = userId };
            db.Routines.Add(eveningRoutine);
            await db.SaveChangesAsync();
        }

        if (!await db.RoutineSteps.AnyAsync(s => s.RoutineId == eveningRoutine.Id))
        {
            db.RoutineSteps.AddRange(
                new RoutineStep { RoutineId = eveningRoutine.Id, ProductId = cleanser.Id, Order = 1, Notes = "Double cleanse - second wash" },
                new RoutineStep { RoutineId = eveningRoutine.Id, ProductId = toner.Id, Order = 2, Notes = "Prep skin for treatments" },
                new RoutineStep { RoutineId = eveningRoutine.Id, ProductId = serum.Id, Order = 3, Notes = "Layer generously at night" },
                new RoutineStep { RoutineId = eveningRoutine.Id, ProductId = moisturizer.Id, Order = 4, Notes = "Seal in all the goodness" }
            );
            await db.SaveChangesAsync();
        }
    }
}
