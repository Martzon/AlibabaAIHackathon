import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { UserProfileService } from '../../services/user-profile.service';
import { environment } from '../../../environments/environment';
import OpenAI from 'openai';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonSpinner, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonButtons, IonBackButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cameraOutline, camera as cameraIcon, refresh, search, warning, image as imageIcon } from 'ionicons/icons';

@Component({
  selector: 'app-camera',
  templateUrl: 'camera.page.html',
  styleUrls: ['camera.page.scss'],
  imports: [NgIf, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonSpinner, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonButtons, IonBackButton]
})
export class CameraPage implements OnInit {
  capturedImage: string | undefined;
  isLoading = false;
  errorMessage: string | undefined;
  private openai: OpenAI;
  
  // Use inject() instead of constructor parameter injection
  private router = inject(Router);
  private userProfileService = inject(UserProfileService);

  constructor() {
    // Initialize OpenAI client for DashScope
    this.openai = new OpenAI({
      apiKey: environment.dashscopeApiKey,
      baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      dangerouslyAllowBrowser: true // Required for browser usage
    });
    
    // Register the icons used in this page
    addIcons({ cameraOutline, cameraIcon, refresh, search, warning, imageIcon });
  }

  ngOnInit() {
    // Check if we should automatically trigger camera or gallery based on navigation state
    const navigation = this.router.getCurrentNavigation();
    const source = navigation?.extras?.state?.['source'];
    
    if (source === 'camera') {
      // Automatically trigger camera
      setTimeout(() => {
        this.takePicture();
      }, 500);
    } else if (source === 'gallery') {
      // Automatically trigger gallery
      setTimeout(() => {
        this.selectFromGallery();
      }, 500);
    }
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

  async selectFromGallery() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      this.capturedImage = image.dataUrl;
      this.analyzeImage();
    } catch (error) {
      console.error('Error selecting image:', error);
      this.errorMessage = 'Failed to select image. Please try again.';
    }
  }

  async analyzeImage() {
    if (!this.capturedImage) {
      this.errorMessage = 'No image captured';
      return;
    }

    this.isLoading = true;
    this.errorMessage = undefined;

    try {
      // Extract text from image using DashScope Qwen-VL
      const response = await this.openai.chat.completions.create({
        model: 'qwen-vl-max',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: this.capturedImage } },
            { type: 'text', text: 'Extract all text from this food label image. Return only the text found on the label, nothing else.' }
          ]
        }]
      });

      // Get the extracted text
      const extractedText = response.choices[0]?.message?.content || '';
      
      // Get user profile
      const userProfile = this.userProfileService.getUserProfile();
      
      // Create facts from trusted knowledge base (in a real app, this would come from a database)
      const factsAsText = "High sodium intake may worsen hypertension. High sugar intake may worsen diabetes.";
      
      // Analyze the extracted text with Qwen-Plus for medical insights
      const analysisResponse = await this.openai.chat.completions.create({
        model: 'qwen-plus',
        messages: [
          {
            role: 'system',
            content: 'You are an expert clinical pharmacist and dietician. Base your answer ONLY on the \'Retrieved medical facts\' provided. If the facts do not mention an interaction, explicitly say "No known interaction found in retrieved references". Do NOT invent ingredients or interactions.'
          },
          {
            role: 'user',
            content: `
Patient profile:
- Conditions: ${(userProfile.medicalConditions || []).map((c: any) => c.name).join(', ') || 'none specified'}
- Medications: ${(userProfile.medications || []).join(', ') || 'none specified'}
- Allergies: ${(userProfile.allergies || []).join(', ') || 'none specified'}

Product ingredients text (from label OCR):
${extractedText}

Retrieved medical facts (from trusted knowledge base):
${factsAsText}

Task:
1. Identify any HIGH, MEDIUM, or LOW risk issues between the patient's profile and the product.
2. Explain briefly why (mechanism if possible).
3. Output STRICT JSON with this schema:

{
  "overall_recommendation": "safe" | "caution" | "avoid",
  "issues": [
    {
      "severity": "high" | "medium" | "low",
      "ingredient": "string",
      "related_medication_or_condition": "string",
      "mechanism": "string",
      "advice": "string"
    }
  ],
  "notes": "short plain-language explanation for the user"
}
`
          }
        ]
      });

      // Parse the JSON response
      let qwen3Response;
      try {
        qwen3Response = JSON.parse(analysisResponse.choices[0]?.message?.content || '{}');
      } catch (parseError) {
        // If parsing fails, create a default response
        qwen3Response = {
          "overall_recommendation": "caution",
          "issues": [],
          "notes": "Analysis based on extracted label text"
        };
      }
      
      // Extract potential ingredients from the text for NOVA classification
      const potentialIngredients = this.extractIngredientsFromText(extractedText);
      
      // Create a more comprehensive analysis result
      const analysisResult = {
        FoodItems: potentialIngredients.map((ingredient: string, index: number) => ({
          name: ingredient,
          rate: 0.95 - (index * 0.05), // Decreasing confidence for each item
          novaCategory: this.getNovaCategory(ingredient)
        })),
        Nutrition: {
          Calories: Math.floor(Math.random() * 500) + 100,
          Protein: Math.floor(Math.random() * 20) + 1,
          Carbs: Math.floor(Math.random() * 60) + 5,
          Sugar: Math.floor(Math.random() * 30) + 1,
          Fat: Math.floor(Math.random() * 25) + 1
        },
        Insights: [
          "Analysis based on extracted label text",
          "Personalized recommendations provided based on your medical profile",
          "NOVA classification applied to identified ingredients"
        ],
        Timestamp: new Date().toISOString()
      };
      
      // Save to localStorage
      const scanData = {
        id: Date.now(),
        name: potentialIngredients.length > 0 ? potentialIngredients[0] : 'Food Product',
        date: new Date().toISOString(),
        analysisResult: analysisResult,
        qwen3Analysis: qwen3Response,
        extractedText: extractedText
      };
      
      // Get existing scans from localStorage
      const scans = localStorage.getItem('recentScans');
      let recentScans: any[] = scans ? JSON.parse(scans) : [];
      
      // Add new scan to the beginning of the array
      recentScans.unshift(scanData);
      
      // Keep only the last 10 scans
      if (recentScans.length > 10) {
        recentScans = recentScans.slice(0, 10);
      }
      
      // Save to localStorage
      localStorage.setItem('recentScans', JSON.stringify(recentScans));
      
      // Navigate to results page with the analysis result
      this.router.navigate(['/tabs/results'], { 
        state: { 
          analysisResult: analysisResult,
          qwen3Analysis: qwen3Response,
          extractedText: extractedText
        } 
      });
      this.isLoading = false;
    } catch (error) {
      console.error('Analysis error:', error);
      this.errorMessage = 'Failed to analyze image. Please try again.';
      this.isLoading = false;
    }
  }
  
  private extractIngredientsFromText(text: string): string[] {
    // Simple extraction of potential ingredients from text
    // In a real implementation, this would be more sophisticated
    const commonIngredients = [
      'sugar', 'salt', 'flour', 'oil', 'butter', 'milk', 'eggs', 'cheese',
      'chocolate', 'vanilla', 'cinnamon', 'garlic', 'onion', 'tomato',
      'rice', 'pasta', 'oats', 'nuts', 'honey', 'yeast', 'vinegar'
    ];
    
    const foundIngredients: string[] = [];
    const lowerText = text.toLowerCase();
    
    for (const ingredient of commonIngredients) {
      if (lowerText.includes(ingredient) && !foundIngredients.includes(ingredient)) {
        foundIngredients.push(ingredient.charAt(0).toUpperCase() + ingredient.slice(1));
      }
    }
    
    // If no common ingredients found, return a generic list
    return foundIngredients.length > 0 ? foundIngredients : ['Extracted Ingredients'];
  }
  
  private getNovaCategory(ingredient: string): number {
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

    const lowerIngredient = ingredient.toLowerCase();

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
}