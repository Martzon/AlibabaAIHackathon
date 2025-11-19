namespace NutriPic.Services;

using System.Threading.Tasks;
using NutriPic.Models;

public class FoodRecognitionService
{
    public FoodRecognitionService()
    {
        // Mock service
    }

    public async Task<object> RecognizeFood(byte[] imageData)
    {
        // Mock implementation - return sample data
        return new
        {
            Data = new
            {
                Elements = new[]
                {
                    new { Name = "Sugar", Rate = 0.85 },
                    new { Name = "Salt", Rate = 0.75 },
                    new { Name = "Flour", Rate = 0.92 }
                }
            }
        };
    }
}