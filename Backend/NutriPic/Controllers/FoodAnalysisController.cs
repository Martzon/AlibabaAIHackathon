using Microsoft.AspNetCore.Mvc;
using NutriPic.Services;
using NutriPic.Models;

namespace NutriPic.Controllers
{
    // Controllers/FoodAnalysisController.cs
    [ApiController]
    [Route("api/[controller]")]
    public class FoodAnalysisController : ControllerBase
    {
        private readonly FoodRecognitionService _foodService;
        private readonly NutritionService _nutritionService;

        public FoodAnalysisController(FoodRecognitionService foodService, NutritionService nutritionService)
        {
            _foodService = foodService;
            _nutritionService = nutritionService;
        }

        [HttpPost("analyze")]
        public async Task<IActionResult> AnalyzeFood([FromForm] IFormFile image)
        {
            try
            {
                // 1. Validate image
                if (image == null || image.Length == 0)
                    return BadRequest("No image provided");

                // 2. Convert image to byte array
                using var memoryStream = new MemoryStream();
                await image.CopyToAsync(memoryStream);
                var imageBytes = memoryStream.ToArray();

                // 3. Recognize food using Alibaba Cloud
                var recognitionResult = await _foodService.RecognizeFood(imageBytes);

                // 4. Get food items with NOVA categories
                var foodItems = await _nutritionService.GetFoodItemsWithNova(recognitionResult);

                // 5. Get nutrition data
                var nutritionData = await _nutritionService.GetNutritionInfo(recognitionResult);

                // 6. Generate insights
                var insights = _nutritionService.GenerateInsights(nutritionData);

                return Ok(new
                {
                    FoodItems = foodItems,
                    Nutrition = nutritionData,
                    Insights = insights,
                    Timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Analysis failed: {ex.Message}");
            }
        }
    }
}
