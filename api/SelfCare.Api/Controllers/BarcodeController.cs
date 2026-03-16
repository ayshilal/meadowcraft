using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SelfCare.Api.Models.DTOs;
using SelfCare.Api.Services;

namespace SelfCare.Api.Controllers;

[ApiController]
[Route("api/barcode")]
[Authorize]
public class BarcodeController(IBarcodeService barcodeService) : ControllerBase
{
    [HttpGet("{code}")]
    public async Task<ActionResult<BarcodeResult>> Lookup(string code)
    {
        var result = await barcodeService.LookupAsync(code);
        if (result is null) return NotFound();
        return Ok(result);
    }
}
