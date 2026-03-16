using SelfCare.Api.Models.DTOs;

namespace SelfCare.Api.Services;

public interface IChatService
{
    Task<ChatResponse> SendMessageAsync(ChatRequest request);
}
