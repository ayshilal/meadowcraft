using SelfCare.Api.Models.DTOs;

namespace SelfCare.Api.Services;

public interface IBarcodeService
{
    Task<BarcodeResult?> LookupAsync(string barcode);
}
