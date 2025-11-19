import { Component, OnInit, inject } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FoodAnalysisService } from '../../services/food-analysis.service';
import { AnalysisResult } from '../../services/food-analysis.service';
import { UserProfileService } from '../../services/user-profile.service';
import { finalize } from 'rxjs/operators';
import { NgIf, NgFor } from '@angular/common';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, 
  IonCardTitle, IonCardContent, IonButton, IonIcon, IonSpinner, IonText, 
  IonItem, IonLabel, IonList, IonItemDivider, IonNote, IonChip, IonCardSubtitle
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { camera, refresh, informationCircleOutline, bulbOutline } from 'ionicons/icons';

@Component({
  selector: 'app-medical-analysis',
  templateUrl: './medical-analysis.page.html',
  styleUrls: ['./medical-analysis.page.scss'],
  imports: [
    NgIf, NgFor,
    IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, 
    IonCardTitle, IonCardContent, IonButton, IonIcon, IonSpinner, IonText, 
    IonItem, IonLabel, IonList, IonItemDivider, IonNote, IonChip, IonCardSubtitle
  ]
})
export class MedicalAnalysisPage implements OnInit {
  capturedImage: string | undefined;
  analysisResult: AnalysisResult | undefined;
  isLoading = false;
  errorMessage: string | undefined;

  // Use inject() instead of constructor parameter injection
  private foodAnalysisService = inject(FoodAnalysisService);
  private userProfileService = inject(UserProfileService);

  constructor() {
    // Register the icons used in this page
    addIcons({ camera, refresh, informationCircleOutline, bulbOutline });
  }

  ngOnInit() {
    // Initialize user profile with sample data for demonstration
    this.userProfileService.updateUserProfile({
      age: 45,
      gender: 'male',
      height: 180,
      weight: 85,
      medicalConditions: [
        {
          name: 'Hypertension',
          description: 'High blood pressure condition',
          dietaryRestrictions: ['salt', 'sodium']
        },
        {
          name: 'Diabetes',
          description: 'Type 2 diabetes',
          dietaryRestrictions: ['sugar', 'refined carbs']
        }
      ],
      allergies: ['peanuts', 'shellfish'],
      dietaryPreferences: ['low-carb', 'heart-healthy']
    });
  }

  async takePicture() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      this.capturedImage = image.dataUrl;
      this.analyzeImage();
    } catch (error) {
      console.error('Error taking picture:', error);
      this.errorMessage = 'Failed to capture image. Please try again.';
    }
  }

  analyzeImage() {
    if (!this.capturedImage) {
      this.errorMessage = 'No image captured';
      return;
    }

    this.isLoading = true;
    this.errorMessage = undefined;

    // Convert data URL to blob
    fetch(this.capturedImage)
      .then(response => response.blob())
      .then(blob => {
        // Send to backend for analysis
        this.foodAnalysisService.analyzeFood(blob)
          .pipe(
            finalize(() => this.isLoading = false)
          )
          .subscribe({
            next: (result: AnalysisResult) => {
              this.analysisResult = result;
            },
            error: (error: any) => {
              console.error('Analysis error:', error);
              this.errorMessage = 'Failed to analyze image. Please try again.';
            }
          });
      })
      .catch((error: any) => {
        console.error('Error converting image:', error);
        this.errorMessage = 'Failed to process image. Please try again.';
        this.isLoading = false;
      });
  }

  getNovaCategory(item: any): number {
    // Use the NOVA category from the backend response if available
    if (item.novaCategory) {
      return item.novaCategory;
    }
    
    // Fallback to client-side classification if needed
    // NOVA classification logic based on keywords
    // Category 1: Unprocessed or minimally processed foods
    const nova1Ingredients = [
      'apple', 'banana', 'orange', 'grape', 'strawberry', 'blueberry',
      'broccoli', 'carrot', 'spinach', 'kale', 'lettuce', 'cucumber',
      'tomato', 'onion', 'garlic', 'ginger', 'potato', 'sweet potato',
      'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'egg',
      'milk', 'water', 'rice', 'quinoa', 'oat', 'barley'
    ];
    
    // Category 2: Processed culinary ingredients
    const nova2Ingredients = [
      'salt', 'pepper', 'vinegar', 'oil', 'olive oil', 'coconut oil',
      'butter', 'honey', 'maple syrup', 'yeast', 'baking powder',
      'cinnamon', 'basil', 'oregano', 'thyme', 'rosemary'
    ];
    
    // Category 3: Processed foods
    const nova3Ingredients = [
      'bread', 'cheese', 'yogurt', 'canned', 'pickled', 'smoked',
      'roasted', 'salted', 'sugar', 'flour', 'pasta', 'cereal'
    ];
    
    // Category 4: Ultra-processed foods
    const nova4Ingredients = [
      'preservative', 'emulsifier', 'artificial', 'coloring', 'flavoring',
      'sweetener', 'hydrogenated', 'high fructose', 'msg', 'additive',
      'soda', 'cookie', 'cracker', 'chip', 'candy', 'chocolate',
      'processed meat', 'hot dog', 'sausage', 'bacon', 'deli meat',
      'instant', 'frozen meal', 'fast food', 'energy drink'
    ];

    const lowerIngredient = item.name.toLowerCase();

    // Check for NOVA 4 ingredients first (most restrictive)
    if (nova4Ingredients.some(item => lowerIngredient.includes(item))) {
      return 4;
    }
    
    // Check for NOVA 3 ingredients
    if (nova3Ingredients.some(item => lowerIngredient.includes(item))) {
      return 3;
    }
    
    // Check for NOVA 2 ingredients
    if (nova2Ingredients.some(item => lowerIngredient.includes(item))) {
      return 2;
    }
    
    // Check for NOVA 1 ingredients
    if (nova1Ingredients.some(item => lowerIngredient.includes(item))) {
      return 1;
    }
    
    // Default to NOVA 4 for unknown ultra-processed items
    return 4;
  }

  getNovaDescription(category: number): string {
    switch (category) {
      case 1: return 'Unprocessed or minimally processed foods';
      case 2: return 'Processed culinary ingredients';
      case 3: return 'Processed foods';
      case 4: return 'Ultra-processed foods';
      default: return 'Unknown category';
    }
  }

  getMedicalAdvice(ingredient: string, novaCategory: number): string[] {
    // Combine general medical advice with personalized user profile advice
    const generalAdvice: string[] = [];
    
    const lowerIngredient = ingredient.toLowerCase();
    
    // General NOVA category advice
    switch (novaCategory) {
      case 1:
        generalAdvice.push('Unprocessed foods are the healthiest choice for most people');
        break;
      case 2:
        generalAdvice.push('Processed culinary ingredients can enhance flavor while maintaining nutritional value');
        break;
      case 3:
        generalAdvice.push('Processed foods should be consumed in moderation');
        break;
      case 4:
        generalAdvice.push('Ultra-processed foods are associated with increased risk of chronic diseases');
        generalAdvice.push('Consider replacing with less processed alternatives when possible');
        break;
    }
    
    // Specific ingredient advice
    if (lowerIngredient.includes('sugar') || lowerIngredient.includes('syrup')) {
      generalAdvice.push('High sugar intake may worsen diabetes and contribute to weight gain');
      generalAdvice.push('Excessive sugar consumption is linked to tooth decay');
    }
    
    if (lowerIngredient.includes('salt')) {
      generalAdvice.push('High sodium intake may increase blood pressure');
      generalAdvice.push('People with hypertension should limit salt intake');
    }
    
    if (lowerIngredient.includes('oil') || lowerIngredient.includes('fat')) {
      generalAdvice.push('Saturated and trans fats may increase risk of heart disease');
      generalAdvice.push('Choose unsaturated fats like olive oil when possible');
    }
    
    if (lowerIngredient.includes('preservative') || lowerIngredient.includes('additive')) {
      generalAdvice.push('Some food additives may cause allergic reactions in sensitive individuals');
    }
    
    if (lowerIngredient.includes('flour') || lowerIngredient.includes('bread')) {
      generalAdvice.push('Refined flour can cause blood sugar spikes');
      generalAdvice.push('Consider whole grain alternatives for better nutrition');
    }
    
    // Get personalized advice based on user profile
    const personalizedAdvice = this.userProfileService.getPersonalizedAdvice(ingredient, novaCategory);
    
    // Combine general and personalized advice
    const allAdvice = [...generalAdvice, ...personalizedAdvice];
    
    return allAdvice.length > 0 ? allAdvice : ['No specific concerns identified for this ingredient'];
  }
}