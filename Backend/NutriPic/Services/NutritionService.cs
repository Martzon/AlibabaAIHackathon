namespace NutriPic.Services;

// Services/NutritionService.cs
public class NutritionService
{
    private readonly Dictionary<string, FoodNutrition> _nutritionDatabase;

    public NutritionService()
    {
        // Initialize with common foods (expand for hackathon)
        _nutritionDatabase = new Dictionary<string, FoodNutrition>
        {
            ["apple"] = new FoodNutrition { Calories = 95, Protein = 0.5, Carbs = 25, Sugar = 19, Fat = 0.3 },
            ["pizza"] = new FoodNutrition { Calories = 285, Protein = 12, Carbs = 36, Sugar = 3, Fat = 10 },
            ["salad"] = new FoodNutrition { Calories = 150, Protein = 4, Carbs = 10, Sugar = 4, Fat = 12 },
            ["burger"] = new FoodNutrition { Calories = 354, Protein = 25, Carbs = 35, Sugar = 7, Fat = 15 }
        };
    }

    public async Task<NutritionData> GetNutritionInfo(RecognizeFoodResponse recognitionResult)
    {
        var detectedFoods = recognitionResult.Data.Elements.Select(e => e.Name).ToList();
        var nutrition = new NutritionData();

        foreach (var food in detectedFoods)
        {
            if (_nutritionDatabase.ContainsKey(food.ToLower()))
            {
                nutrition.Add(_nutritionDatabase[food.ToLower()]);
            }
        }

        return nutrition;
    }

    public List<string> GenerateInsights(NutritionData nutrition)
    {
        var insights = new List<string>();

        if (nutrition.Sugar > 20)
            insights.Add("High sugar content - May cause energy crash later");

        if (nutrition.Protein > 15)
            insights.Add("Good protein source for muscle maintenance");

        if (nutrition.Calories > 400)
            insights.Add("High-calorie meal - Consider smaller portions");

        if (nutrition.Calories < 200)
            insights.Add("Light meal - Good for weight management");

        // Weekly projection
        var weeklyCalories = nutrition.Calories * 7;
        if (weeklyCalories > 14000) // ~2000 cal/day maintenance
            insights.Add($"If eaten daily: Potential weight gain of ~{((weeklyCalories - 14000) / 7700):F1} kg per week");

        return insights;
    }
}