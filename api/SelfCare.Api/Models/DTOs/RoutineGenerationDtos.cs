namespace SelfCare.Api.Models.DTOs;

public class GenerateRoutineRequest
{
    public List<ChatProductInfo> Products { get; set; } = [];
    public string? SkinType { get; set; }
    public string? SkinConcerns { get; set; }
}

public class GeneratedRoutine
{
    public List<GeneratedStep> MorningSteps { get; set; } = [];
    public List<GeneratedStep> EveningSteps { get; set; } = [];
    public Dictionary<string, DaySchedule>? WeeklySchedule { get; set; }
    public string Explanation { get; set; } = "";
}

public class DaySchedule
{
    public List<string> Morning { get; set; } = [];
    public List<string> Evening { get; set; } = [];
}

public class GeneratedStep
{
    public int Order { get; set; }
    public string ProductName { get; set; } = "";
    public string Brand { get; set; } = "";
    public string Category { get; set; } = "";
    public string Notes { get; set; } = "";
    public string Reasoning { get; set; } = "";
}
