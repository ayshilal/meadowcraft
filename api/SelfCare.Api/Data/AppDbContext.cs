using Microsoft.EntityFrameworkCore;
using SelfCare.Api.Models.Entities;

namespace SelfCare.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<Routine> Routines => Set<Routine>();
    public DbSet<RoutineStep> RoutineSteps => Set<RoutineStep>();
    public DbSet<BeautyFact> BeautyFacts => Set<BeautyFact>();
    public DbSet<Recommendation> Recommendations => Set<Recommendation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Brand).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Category).HasMaxLength(50).IsRequired();
            entity.Property(e => e.UserId).HasMaxLength(200).IsRequired();
            entity.HasIndex(e => e.UserId);
        });

        modelBuilder.Entity<Routine>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Type).HasMaxLength(20).IsRequired();
            entity.Property(e => e.UserId).HasMaxLength(200).IsRequired();
            entity.HasIndex(e => new { e.UserId, e.Type }).IsUnique();
            entity.HasMany(e => e.Steps)
                .WithOne(s => s.Routine)
                .HasForeignKey(s => s.RoutineId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RoutineStep>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Product)
                .WithMany()
                .HasForeignKey(e => e.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BeautyFact>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.Category).HasMaxLength(50).IsRequired();
        });

        modelBuilder.Entity<Recommendation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).IsRequired();
            entity.Property(e => e.Category).HasMaxLength(50).IsRequired();
        });
    }
}
