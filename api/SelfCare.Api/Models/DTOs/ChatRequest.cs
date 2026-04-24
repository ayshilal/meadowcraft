namespace SelfCare.Api.Models.DTOs;

public class ChatRequest
{
    public string Message { get; set; } = "";
    public string RoutineType { get; set; } = "Morning";
    public List<ChatStepInfo> Steps { get; set; } = [];
    public List<ChatProductInfo> Products { get; set; } = [];
    public List<ChatHistoryMessage> History { get; set; } = [];
}

public class ChatHistoryMessage
{
    public string Role { get; set; } = "";
    public string Content { get; set; } = "";
}

public class ChatProductInfo
{
    public string Name { get; set; } = "";
    public string Brand { get; set; } = "";
    public string Category { get; set; } = "";
    public string? Description { get; set; }
}

public class ChatStepInfo
{
    public string ProductName { get; set; } = "";
    public string Brand { get; set; } = "";
    public string Category { get; set; } = "";
    public string? Notes { get; set; }
}
