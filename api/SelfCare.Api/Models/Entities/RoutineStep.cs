namespace SelfCare.Api.Models.Entities;

public class RoutineStep
{
    public int Id { get; set; }
    public int RoutineId { get; set; }
    public Routine Routine { get; set; } = null!;
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int Order { get; set; }
    public string? Notes { get; set; }
}
