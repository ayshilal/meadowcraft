namespace SelfCare.Api.Models.Entities;

public class Routine
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
    public List<RoutineStep> Steps { get; set; } = [];
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string UserId { get; set; } = "";
}
