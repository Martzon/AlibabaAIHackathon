using System.Collections.Generic;

namespace NutriPic.Models
{
    public class NutritionData
    {
        public double Calories { get; set; }
        public double Protein { get; set; }
        public double Carbs { get; set; }
        public double Sugar { get; set; }
        public double Fat { get; set; }

        public void Add(FoodNutrition nutrition)
        {
            Calories += nutrition.Calories;
            Protein += nutrition.Protein;
            Carbs += nutrition.Carbs;
            Sugar += nutrition.Sugar;
            Fat += nutrition.Fat;
        }
    }
}