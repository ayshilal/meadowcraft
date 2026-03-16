using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SelfCare.Api.Data;
using SelfCare.Api.Models.Entities;

namespace SelfCare.Api.Controllers;

[ApiController]
[Route("api/products")]
[Authorize]
public class ProductsController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirst("oid")?.Value
        ?? User.FindFirst("sub")?.Value
        ?? "dev-user"; // Fallback for local dev without B2C

    [HttpGet]
    public async Task<ActionResult<List<Product>>> GetAll()
    {
        var products = await db.Products
            .Where(p => p.UserId == UserId)
            .OrderBy(p => p.CreatedAt)
            .ToListAsync();
        return Ok(products);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Product>> GetById(int id)
    {
        var product = await db.Products
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == UserId);

        if (product is null) return NotFound();
        return Ok(product);
    }

    [HttpPost]
    public async Task<ActionResult<Product>> Create(Product product)
    {
        product.UserId = UserId;
        product.CreatedAt = DateTime.UtcNow;

        db.Products.Add(product);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Product>> Update(int id, Product product)
    {
        var existing = await db.Products
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == UserId);

        if (existing is null) return NotFound();

        existing.Name = product.Name;
        existing.Brand = product.Brand;
        existing.Category = product.Category;
        existing.Description = product.Description;
        existing.Notes = product.Notes;
        existing.ImageUrl = product.ImageUrl;

        await db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await db.Products
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == UserId);

        if (product is null) return NotFound();

        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
