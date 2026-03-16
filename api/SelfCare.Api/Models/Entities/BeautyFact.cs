namespace SelfCare.Api.Models.Entities;

public class BeautyFact
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public string Category { get; set; } = "";
    public string? ImageUrl { get; set; }
}
