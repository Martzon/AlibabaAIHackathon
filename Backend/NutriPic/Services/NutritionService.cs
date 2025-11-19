using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using NutriPic.Models;

namespace NutriPic.Services
{
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

        public async Task<List<FoodItem>> GetFoodItemsWithNova(dynamic recognitionResult)
        {
            var foodItems = new List<FoodItem>();
            
            foreach (var element in recognitionResult.Data.Elements)
            {
                var foodItem = new FoodItem
                {
                    Name = element.Name,
                    Rate = element.Rate,
                    NovaCategory = GetNovaCategory(element.Name)
                };
                
                foodItems.Add(foodItem);
            }
            
            return foodItems;
        }

        public async Task<NutritionData> GetNutritionInfo(dynamic recognitionResult)
        {
            var detectedFoods = new List<string>();
            foreach (var element in recognitionResult.Data.Elements)
            {
                detectedFoods.Add((string)element.Name);
            }
            
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
        
        private int GetNovaCategory(string ingredient)
        {
            // NOVA classification logic based on keywords
            // Category 1: Unprocessed or minimally processed foods
            var nova1Ingredients = new List<string>
            {
                "apple", "banana", "orange", "grape", "strawberry", "blueberry",
                "broccoli", "carrot", "spinach", "kale", "lettuce", "cucumber",
                "tomato", "onion", "garlic", "ginger", "potato", "sweet potato",
                "chicken", "beef", "pork", "fish", "salmon", "tuna", "egg",
                "milk", "water", "rice", "quinoa", "oat", "barley"
            };
            
            // Category 2: Processed culinary ingredients
            var nova2Ingredients = new List<string>
            {
                "salt", "pepper", "vinegar", "oil", "olive oil", "coconut oil",
                "butter", "honey", "maple syrup", "yeast", "baking powder",
                "cinnamon", "basil", "oregano", "thyme", "rosemary"
            };
            
            // Category 3: Processed foods
            var nova3Ingredients = new List<string>
            {
                "bread", "cheese", "yogurt", "canned", "pickled", "smoked",
                "roasted", "salted", "sugar", "flour", "pasta", "cereal"
            };
            
            // Category 4: Ultra-processed foods
            var nova4Ingredients = new List<string>
            {
                "preservative", "emulsifier", "artificial", "coloring", "flavoring",
                "sweetener", "hydrogenated", "high fructose", "msg", "additive",
                "soda", "cookie", "cracker", "chip", "candy", "chocolate",
                "processed meat", "hot dog", "sausage", "bacon", "deli meat",
                "instant", "frozen meal", "fast food", "energy drink"
            };

            var lowerIngredient = ingredient.ToLower();

            // Check for NOVA 4 ingredients first (most restrictive)
            if (nova4Ingredients.Any(item => lowerIngredient.Contains(item)))
            {
                return 4;
            }
            
            // Check for NOVA 3 ingredients
            if (nova3Ingredients.Any(item => lowerIngredient.Contains(item)))
            {
                return 3;
            }
            
            // Check for NOVA 2 ingredients
            if (nova2Ingredients.Any(item => lowerIngredient.Contains(item)))
            {
                return 2;
            }
            
            // Check for NOVA 1 ingredients
            if (nova1Ingredients.Any(item => lowerIngredient.Contains(item)))
            {
                return 1;
            }
            
            // Default to NOVA 4 for unknown ultra-processed items
            return 4;
        }
    }
}