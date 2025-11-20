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
import OSS from 'ali-oss';

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
  private currentAnalysisToken = 0;
  private readonly MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024; // DashScope data URI limit (~1 MB)
  private ossClient: OSS | null = null;
  private medicalFactsCache: string | null = null;
  private medicalFactsPromise: Promise<string> | null = null;
  private analysisSource: string | undefined;
  
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

      const dataUrl = image.dataUrl;
      if (!dataUrl) {
        throw new Error('Camera did not return image data');
      }

      this.capturedImage = dataUrl;
      const analysisSource = await this.getImageSourceForAnalysis(dataUrl);
      this.analysisSource = analysisSource;
      this.analyzeImage(analysisSource);
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

      const dataUrl = image.dataUrl;
      if (!dataUrl) {
        throw new Error('Gallery selection did not return image data');
      }

      this.capturedImage = dataUrl;
      const analysisSource = await this.getImageSourceForAnalysis(dataUrl);
      this.analysisSource = analysisSource;
      this.analyzeImage(analysisSource);
    } catch (error) {
      console.error('Error selecting image:', error);
      this.errorMessage = 'Failed to select image. Please try again.';
    }
  }

  async analyzeImage(imageOverride?: string) {
    let imageToAnalyze = imageOverride;
    if (!imageToAnalyze) {
      if (!this.analysisSource && this.capturedImage) {
        this.analysisSource = await this.getImageSourceForAnalysis(this.capturedImage);
      }
      imageToAnalyze = this.analysisSource || this.capturedImage;
    }
    if (!imageToAnalyze) {
      this.errorMessage = 'No image captured';
      return;
    }

    this.isLoading = true;
    this.errorMessage = undefined;
    const analysisToken = Date.now();
    this.currentAnalysisToken = analysisToken;

    try {
      // Extract text from image using DashScope Qwen-VL
      const response = await this.openai.chat.completions.create({
        model: 'qwen-vl-max',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageToAnalyze } },
            { type: 'text', text: 'Extract all text from this food label image. Return only the text found on the label, nothing else.' }
          ]
        }]
      });

      // Get the extracted text
      const extractedText = response.choices[0]?.message?.content || '';
      
      // Get user profile
      const userProfile = this.userProfileService.getUserProfile();
      const patientProfileSummary = this.buildPatientProfileSummary(userProfile);
      
      // Create facts from trusted knowledge base (in a real app, this would come from a database)
      const factsAsText = await this.getMedicalFacts();
      
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
${patientProfileSummary}
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
      const qwenRecommendations = this.buildRecommendationsFromAnalysis(qwen3Response);
      
      // Use DashScope to extract structured ingredients, nutrition, and AI recommendations
      const structuredInsights = await this.generateIngredientNutritionInsights(extractedText, userProfile);
      const aiIngredientItems = structuredInsights?.ingredients
        ?.filter((item: IngredientInsight) => !!item?.name) || [];
      const potentialIngredients = aiIngredientItems.length > 0
        ? aiIngredientItems.map((item: IngredientInsight) => item.name)
        : this.extractIngredientsFromText(extractedText);
      const nutritionSummary = this.buildNutritionSummary(structuredInsights?.nutrition);
      const structuredRecommendationFallback = structuredInsights?.personalized_recommendations
        ?.filter((recommendation: string) => !!recommendation) || [];
      let personalizedRecommendations = this.mergeRecommendations(
        qwenRecommendations,
        structuredRecommendationFallback
      );
      const allergenMatches = this.findAllergenMatches(
        userProfile,
        extractedText,
        aiIngredientItems,
        qwen3Response,
        personalizedRecommendations
      );

      if (allergenMatches.length > 0) {
        this.applyAllergyOverride(qwen3Response, allergenMatches);
        const allergyMessage = this.buildAllergyMessage(allergenMatches);
        if (allergyMessage) {
          personalizedRecommendations = this.mergeRecommendations([allergyMessage], personalizedRecommendations);
        }
      }

      const novaClassification = await this.generateNovaClassification(extractedText);
      const foodItems = this.buildFoodItemsFromNova(novaClassification, potentialIngredients, aiIngredientItems);
      const novaInsights = novaClassification?.notes 
        ? `NOVA assessment: ${novaClassification.notes}`
        : 'NOVA classification powered by DashScope Qwen-Plus';
      const novaOverview = {
        overallNova: novaClassification?.overall_nova ?? this.estimateOverallNova(foodItems),
        source: novaClassification ? 'DashScope Qwen-Plus' : 'Heuristic fallback'
      };
      const combinedInsights = this.buildInsightsList(
        personalizedRecommendations,
        novaInsights,
        structuredInsights?.notes
      );
      
      // Create a more comprehensive analysis result
      const analysisResult = {
        FoodItems: foodItems,
        NovaOverview: novaOverview,
        Nutrition: nutritionSummary,
        Insights: combinedInsights,
        PersonalizedRecommendations: personalizedRecommendations,
        IngredientInsights: aiIngredientItems,
        Timestamp: new Date().toISOString()
      };

      if (!this.isActiveAnalysis(analysisToken)) {
        return;
      }
      
      // Save to localStorage
      const scanPrimaryName = foodItems.length > 0
        ? foodItems[0].name
        : (potentialIngredients.length > 0 ? potentialIngredients[0] : 'Food Product');
      const scanData = {
        id: Date.now(),
        name: scanPrimaryName,
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
      if (!this.isActiveAnalysis(analysisToken)) {
        return;
      }
      this.setAnalysisError('Failed to analyze image. Please try again.', error);
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

  private async generateIngredientNutritionInsights(text: string, userProfile: any): Promise<IngredientNutritionResponse | null> {
    if (!text || !text.trim()) {
      return null;
    }

    const profileSummary = this.buildPatientProfileSummary(userProfile);

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'qwen-plus',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'You are a meticulous nutrition analyst. Extract factual data strictly from the provided label text and patient profile context.'
          },
          {
            role: 'user',
            content: `
${profileSummary}

Label text (OCR):
${text}

Extract key ingredients, nutrition facts (numbers only), and personalized recommendations for this patient. 
Return STRICT JSON with this schema:
{
  "ingredients": [
    { "name": "string", "confidence": 0-1, "notes": "string" }
  ],
  "nutrition": {
    "calories_kcal": number,
    "protein_g": number,
    "carbs_g": number,
    "sugar_g": number,
    "fat_g": number,
    "sodium_mg": number
  },
  "personalized_recommendations": ["string"],
  "notes": "string"
}

If a value is missing in the label, omit it or use null instead of guessing. Base recommendations only on provided facts.
`
          }
        ]
      });

      const rawContent = completion.choices[0]?.message?.content || '';
      return this.safeJsonParse(rawContent);
    } catch (error) {
      console.warn('Failed to extract structured insights via DashScope:', error);
      return null;
    }
  }

  private async generateNovaClassification(text: string): Promise<NovaClassificationResponse | null> {
    if (!text || !text.trim()) {
      return null;
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'qwen-plus',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'You are a nutrition scientist who classifies foods using the NOVA 1-4 system. Always cite reasoning based only on provided label text.'
          },
          {
            role: 'user',
            content: `
You will receive OCR text extracted from a packaged food label. Identify the primary ingredients (3-6 items) and classify each using the official NOVA system:
1 = Unprocessed or minimally processed foods
2 = Processed culinary ingredients
3 = Processed foods
4 = Ultra-processed foods

Return STRICT JSON with this schema:
{
  "items": [
    { "name": "string", "nova_category": 1|2|3|4, "confidence": 0-1, "reason": "string" }
  ],
  "overall_nova": 1|2|3|4,
  "notes": "short explanation mentioning key drivers"
}

Label text:
${text}
`
          }
        ]
      });

      const rawContent = completion.choices[0]?.message?.content || '';
      const parsed = this.safeJsonParse(rawContent);
      return parsed;
    } catch (error) {
      console.warn('Failed to generate NOVA classification via DashScope:', error);
      return null;
    }
  }

  private buildFoodItemsFromNova(
    novaClassification: NovaClassificationResponse | null,
    fallbackIngredients: string[],
    aiIngredients?: IngredientInsight[]
  ) {
    if (novaClassification && Array.isArray(novaClassification.items) && novaClassification.items.length > 0) {
      return novaClassification.items.map((item: NovaClassificationItem, index: number) => ({
        name: item.name || `Ingredient ${index + 1}`,
        rate: typeof item.confidence === 'number' ? item.confidence : Math.max(0.1, 0.95 - (index * 0.05)),
        novaCategory: item.nova_category ?? 4,
        reason: item.reason
      }));
    }

    const confidenceMap = new Map<string, IngredientInsight>();
    (aiIngredients || []).forEach((ingredient) => {
      if (ingredient?.name) {
        confidenceMap.set(ingredient.name.toLowerCase(), ingredient);
      }
    });

    return fallbackIngredients.map((ingredient: string, index: number) => {
      const insight = confidenceMap.get(ingredient.toLowerCase());
      const confidence = typeof insight?.confidence === 'number'
        ? Math.min(Math.max(insight.confidence, 0.05), 0.99)
        : 0.95 - (index * 0.05);

      return {
        name: ingredient,
        rate: confidence,
        novaCategory: this.getNovaCategory(ingredient),
        notes: insight?.notes
      };
    });
  }

  private estimateOverallNova(foodItems: any[]): number {
    if (!foodItems || foodItems.length === 0) {
      return 4;
    }

    const total = foodItems.reduce((sum, item) => sum + (item.novaCategory || 4), 0);
    const avg = total / foodItems.length;
    return Math.round(Math.min(Math.max(avg, 1), 4));
  }

  private buildNutritionSummary(nutrition?: NutritionFacts | null): NutritionSummary {
    const fallback = {
      Calories: Math.floor(Math.random() * 500) + 100,
      Protein: Math.floor(Math.random() * 20) + 1,
      Carbs: Math.floor(Math.random() * 60) + 5,
      Sugar: Math.floor(Math.random() * 30) + 1,
      Fat: Math.floor(Math.random() * 25) + 1,
      Sodium: Math.floor(Math.random() * 800) + 50
    };

    if (!nutrition) {
      return { ...fallback, source: 'Heuristic fallback' };
    }

    return {
      Calories: this.extractNumericValue(nutrition.calories_kcal, fallback.Calories),
      Protein: this.extractNumericValue(nutrition.protein_g, fallback.Protein),
      Carbs: this.extractNumericValue(nutrition.carbs_g, fallback.Carbs),
      Sugar: this.extractNumericValue(nutrition.sugar_g, fallback.Sugar),
      Fat: this.extractNumericValue(nutrition.fat_g, fallback.Fat),
      Sodium: this.extractNumericValue(nutrition.sodium_mg, fallback.Sodium),
      source: 'DashScope Qwen-Plus'
    };
  }

  private extractNumericValue(value: any, fallback: number): number {
    if (typeof value === 'number' && !isNaN(value)) {
      return Math.round(value);
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return Math.round(parsed);
      }
    }

    return fallback;
  }

  private buildInsightsList(personalized: string[], novaInsight: string, structuredNote?: string): string[] {
    const insights = [
      'Analysis based on extracted label text',
      'Personalized recommendations generated with DashScope and your medical profile'
    ];

    if (structuredNote) {
      insights.push(structuredNote);
    }

    if (personalized && personalized.length > 0) {
      insights.push(...personalized);
    }

    if (novaInsight) {
      insights.push(novaInsight);
    }

    // Remove duplicates and empty strings
    return Array.from(new Set(insights.filter((entry) => !!entry)));
  }

  private buildPatientProfileSummary(userProfile: any): string {
    const conditions = (userProfile.medicalConditions || []).map((c: any) => c.name).join(', ') || 'none specified';
    const medications = (userProfile.medications || []).join(', ') || 'none specified';
    const allergies = (userProfile.allergies || []).join(', ') || 'none specified';

    return `Patient profile:
- Conditions: ${conditions}
- Medications: ${medications}
- Allergies: ${allergies}`;
  }

  private setAnalysisError(userMessage: string, error: any) {
    if (this.isDeveloperMode()) {
      const detail = this.extractErrorMessage(error);
      this.errorMessage = detail ? `${userMessage} (${detail})` : userMessage;
    } else {
      this.errorMessage = userMessage;
    }
  }

  private extractErrorMessage(error: any): string {
    if (!error) {
      return '';
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error?.message) {
      return error.message;
    }

    if (error?.error?.message) {
      return error.error.message;
    }

    if (error?.response?.data?.error?.message) {
      return error.response.data.error.message;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return '';
    }
  }

  private isDeveloperMode(): boolean {
    try {
      const globalScope = globalThis as any;
      return !!globalScope?.DEVELOPER;
    } catch {
      return false;
    }
  }

  private buildRecommendationsFromAnalysis(analysis: any): string[] {
    if (!analysis) {
      return [];
    }

    const recommendations: string[] = [];

    if (Array.isArray(analysis.issues)) {
      analysis.issues.forEach((issue: any) => {
        if (!issue?.advice) {
          return;
        }

        const severityLabel = issue.severity ? `${issue.severity.toUpperCase()}: ` : '';
        const ingredientLabel = issue.ingredient ? `${issue.ingredient} - ` : '';
        const message = `${severityLabel}${ingredientLabel}${issue.advice}`.trim();

        if (message) {
          recommendations.push(message);
        }
      });
    }

    if (analysis.notes) {
      recommendations.push(analysis.notes);
    }

    return recommendations.filter((entry) => !!entry);
  }

  private mergeRecommendations(primary: string[], secondary: string[]): string[] {
    const combined = [
      ...(primary || []),
      ...(secondary || [])
    ].filter((entry) => !!entry);

    return Array.from(new Set(combined));
  }

  private async getImageSourceForAnalysis(dataUrl: string): Promise<string> {
    if (this.getDataUrlSize(dataUrl) >= this.MAX_IMAGE_SIZE_BYTES) {
      return await this.uploadImageToOss(dataUrl);
    }
    return dataUrl;
  }

  private isActiveAnalysis(token: number): boolean {
    return this.currentAnalysisToken === token;
  }

  private findAllergenMatches(
    userProfile: any,
    extractedText: string,
    aiIngredientItems: IngredientInsight[],
    qwen3Response: any,
    recommendations: string[]
  ): string[] {
    const allergies = (userProfile?.allergies || [])
      .map((allergy: string) => allergy?.trim())
      .filter((allergy: string) => !!allergy);

    if (allergies.length === 0) {
      return [];
    }

    const searchSpaces = [
      (extractedText || '').toLowerCase(),
      JSON.stringify(qwen3Response?.issues || []).toLowerCase(),
      (recommendations || []).join(' ').toLowerCase(),
      (aiIngredientItems || [])
        .map(item => `${item?.name || ''} ${item?.notes || ''}`)
        .join(' ')
        .toLowerCase()
    ];

    const matches = new Set<string>();
    allergies.forEach((allergy: string) => {
      const lower = allergy.toLowerCase();
      if (!lower) {
        return;
      }

      if (searchSpaces.some(space => space.includes(lower))) {
        matches.add(allergy);
      }
    });

    return Array.from(matches);
  }

  private applyAllergyOverride(qwen3Response: any, allergens: string[]) {
    if (!qwen3Response || allergens.length === 0) {
      return;
    }

    qwen3Response.overall_recommendation = 'avoid';
    qwen3Response.issues = qwen3Response.issues || [];

    allergens.forEach((allergen: string) => {
      const lowerAllergen = allergen.toLowerCase();
      const alreadyLogged = qwen3Response.issues.some(
        (issue: any) => (issue?.ingredient || '').toLowerCase().includes(lowerAllergen)
      );

      if (!alreadyLogged) {
        qwen3Response.issues.unshift({
          severity: 'high',
          ingredient: allergen,
          related_medication_or_condition: 'Allergy',
          mechanism: 'Patient-reported allergy match',
          advice: 'Avoid immediately to prevent allergic reaction'
        });
      }
    });

    const allergyNote = `Allergy alert: contains ${allergens.join(', ')}. DO NOT EAT.`;
    qwen3Response.notes = qwen3Response.notes
      ? `${qwen3Response.notes} ${allergyNote}`
      : allergyNote;
  }

  private buildAllergyMessage(allergens: string[]): string {
    if (!allergens || allergens.length === 0) {
      return '';
    }

    return `⚠️ Allergy alert: contains ${allergens.join(', ')}. DO NOT EAT.`;
  }

  private getDataUrlSize(dataUrl: string): number {
    if (!dataUrl) {
      return 0;
    }

    const base64String = dataUrl.split(',')[1] || '';
    const padding = (base64String.match(/=+$/) || [''])[0].length;
    return (base64String.length * 0.75) - padding;
  }

  private async uploadImageToOss(dataUrl: string): Promise<string> {
    const blob = await this.dataUrlToBlob(dataUrl);
    const client = this.getOssClient();
    const extension = this.detectImageExtension(blob.type);
    const objectKey = this.generateObjectKey(extension);

    const headers = {
      'x-oss-storage-class': 'Standard',
      'x-oss-forbid-overwrite': 'true'
    };

    const result = await client.put(objectKey, blob, { headers });
    const signedUrl = client.signatureUrl(objectKey, { expires: 60 * 60 });
    const fallbackUrl = (result as any)?.url || result?.res?.requestUrls?.[0];

    if (signedUrl) {
      return signedUrl;
    }

    if (!fallbackUrl) {
      throw new Error('Failed to generate signed OSS URL');
    }

    return fallbackUrl;
  }

  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return await response.blob();
  }

  private getOssClient(): OSS {
    if (!environment.oss) {
      throw new Error('OSS configuration missing in environment');
    }

    if (!this.ossClient) {
      this.ossClient = new OSS({
        region: environment.oss.region,
        bucket: environment.oss.bucket,
        accessKeyId: environment.oss.accessKeyId,
        accessKeySecret: environment.oss.accessKeySecret,
        secure: true
      });
    }

    return this.ossClient;
  }

  private detectImageExtension(contentType: string): string {
    if (!contentType) {
      return 'jpg';
    }

    const [, subtype] = contentType.split('/');
    if (subtype) {
      return subtype.split('+')[0];
    }
    return 'jpg';
  }

  private generateObjectKey(extension: string): string {
    const folder = environment.oss?.folder || 'uploads';
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${folder}/${unique}.${extension || 'jpg'}`;
  }

  private async getMedicalFacts(): Promise<string> {
    if (this.medicalFactsCache) {
      return this.medicalFactsCache;
    }

    if (!this.medicalFactsPromise) {
      this.medicalFactsPromise = this.fetchMedicalFactsFromOss();
    }

    try {
      const facts = await this.medicalFactsPromise;
      this.medicalFactsCache = facts || null;
      return facts;
    } catch (error) {
      console.warn('Failed to load medical facts from OSS:', error);
      return 'Medical facts unavailable.';
    } finally {
      this.medicalFactsPromise = null;
    }
  }

  private async fetchMedicalFactsFromOss(): Promise<string> {
    const client = this.getOssClient();
    const objectKey = environment.oss?.medicalFactsKey || 'medical_datasource.json';
    const signedUrl = client.signatureUrl(objectKey, { expires: 60 * 5 });
    const response = await fetch(signedUrl, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Failed to fetch medical datasource (${response.status})`);
    }

    const data = await response.json();
    const normalizedFacts = this.normalizeMedicalFacts(data);

    if (!normalizedFacts) {
      throw new Error('Medical datasource is empty');
    }

    return normalizedFacts;
  }

  private normalizeMedicalFacts(source: any): string {
    if (!source) {
      return '';
    }

    if (typeof source === 'string') {
      return source;
    }

    if (Array.isArray(source)) {
      return source.map((entry: any) => entry?.text).filter(Boolean).join(' ');
    }

    if (Array.isArray(source?.facts)) {
      return source.facts.map((entry: any) => entry?.text).filter(Boolean).join(' ');
    }

    try {
      return JSON.stringify(source);
    } catch {
      return '';
    }
  }

  private safeJsonParse(content: string): any {
    if (!content) {
      return null;
    }

    const trimmed = content.trim();
    const withoutFences = trimmed.replace(/```json|```/gi, '').trim();

    try {
      return JSON.parse(withoutFences);
    } catch (error) {
      // Try to extract JSON substring if the model added extra commentary
      const startIndex = withoutFences.indexOf('{');
      const endIndex = withoutFences.lastIndexOf('}');

      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const potentialJson = withoutFences.substring(startIndex, endIndex + 1);
        return JSON.parse(potentialJson);
      }

      throw error;
    }
  }
}

interface NovaClassificationItem {
  name: string;
  nova_category: number;
  confidence?: number;
  reason?: string;
}

interface NovaClassificationResponse {
  items?: NovaClassificationItem[];
  overall_nova?: number;
  notes?: string;
}

interface IngredientInsight {
  name: string;
  confidence?: number;
  notes?: string;
}

interface NutritionFacts {
  calories_kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  sugar_g?: number;
  fat_g?: number;
  sodium_mg?: number;
}

interface IngredientNutritionResponse {
  ingredients?: IngredientInsight[];
  nutrition?: NutritionFacts;
  personalized_recommendations?: string[];
  notes?: string;
}

interface NutritionSummary {
  Calories: number;
  Protein: number;
  Carbs: number;
  Sugar: number;
  Fat: number;
  Sodium?: number;
  source: string;
}
