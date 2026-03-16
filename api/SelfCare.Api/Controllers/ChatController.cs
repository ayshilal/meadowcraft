using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SelfCare.Api.Models.DTOs;
using SelfCare.Api.Services;

namespace SelfCare.Api.Controllers;

[ApiController]
[Route("api/chat")]
[Authorize]
public class ChatController(IChatService chatService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ChatResponse>> SendMessage(ChatRequest request)
    {
        var response = await chatService.SendMessageAsync(request);
        return Ok(response);
    }
}
