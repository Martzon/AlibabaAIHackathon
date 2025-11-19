import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FoodAnalysisService } from '../../services/food-analysis.service';
import { UserProfileService } from '../../services/user-profile.service';
import { environment } from '../../../environments/environment';
import OpenAI from 'openai';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonSpinner, IonText, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-camera',
  templateUrl: 'camera.page.html',
  styleUrls: ['camera.page.scss'],
  imports: [NgIf, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonSpinner, IonText, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent]
})
export class CameraPage {
  capturedImage: string | undefined;
  isLoading = false;
  errorMessage: string | undefined;
  private openai: OpenAI;

  constructor(
    private router: Router,
    private foodAnalysisService: FoodAnalysisService,
    private userProfileService: UserProfileService
  ) {
    // Initialize OpenAI client for DashScope
    this.openai = new OpenAI({
      apiKey: environment.dashscopeApiKey,
      baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      dangerouslyAllowBrowser: true // Required for browser usage
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
      const factsAsText = "Filipinos with Hypertension, Type 2 Diabetes, or Gout on daily maintenance meds ### Fact 1 (severity: HIGH) – Hypertension, heart disease and high sodium - Many processed foods (instant noodles, canned soups, sausages, dried fish, chips, sauces) contain very high sodium (salt) from “sodium chloride”, “monosodium glutamate (MSG)”, “sodium bicarbonate”, “sodium benzoate” and similar additives. - High sodium intake increases blood pressure and can worsen hypertension and heart failure. - Patients on blood pressure medicines (e.g., ACE inhibitors, ARBs, beta-blockers, calcium channel blockers, diuretics) should keep salt intake limited and consistent, not very high. ### Fact 2 (severity: MEDIUM–HIGH) – Hidden sugars in Type 2 Diabetes - Packaged foods and drinks may contain large amounts of sugar under names like “sucrose”, “glucose”, “fructose”, “high-fructose corn syrup”, “corn syrup”, “maltodextrin”, “dextrose”, “honey”, “syrup” and sweetened condensed milk. - Regular intake of these sugars can cause high blood sugar and make diabetes control more difficult, especially for patients taking insulin or oral diabetes medicines (e.g., metformin, sulfonylureas, DPP-4 or SGLT2 inhibitors). - “No added sugar” does not always mean safe; total carbohydrates and serving size still matter. ### Fact 3 (severity: MEDIUM) – Refined carbohydrates and blood sugar spikes - Ingredients like “white rice flour”, “refined wheat flour”, “corn starch” and “tapioca starch” are quickly digested and can raise blood sugar rapidly. - Snacks like biscuits, crackers, instant noodles, bread and cakes with these ingredients can cause large glucose spikes if eaten in big portions, especially in people with diabetes. ### Fact 4 (severity: HIGH) – Gout and purine-rich ingredients - Gout is worsened by high-purine foods. Packaged products may contain purine-rich ingredients such as: - Certain fish and seafood (anchovies, sardines, mackerel), “fish sauce”, “shrimp paste”. - “Yeast extract”, “meat extract”, organ meats (liver), bone broth concentrates. - These ingredients can increase uric acid and trigger gout flares, especially in people already treated for gout (e.g., allopurinol, febuxostat, colchicine). ### Fact 5 (severity: MEDIUM) – Sugar-sweetened beverages and diabetes - Soft drinks, powdered juice mixes, “energy drinks”, milk tea, sweetened coffee and ready-to-drink milk often have high sugar per serving. - Even when labeled “vitamin drink” or “sports drink”, the sugar content can still worsen blood sugar control if used regularly. ### Fact 6 (severity: VARIABLE) – Fats, cholesterol and heart risk - Ingredients like “palm oil”, “coconut oil”, “hydrogenated oil”, “shortening” and “butter fat” may increase intake of saturated or trans fats. - High intake of these fats can worsen cholesterol levels and cardiovascular risk, especially in patients with hypertension, diabetes, or high cholesterol. ### Fact 7 (severity: LOW–MEDIUM) – Sugar alcohols and GI upset - Ingredients such as “sorbitol”, “xylitol”, “mannitol”, “erythritol”, “isomalt” are sugar alcohols often used in “sugar-free” foods. - They usually cause smaller blood sugar rises than sugar, but in higher amounts may cause gas, bloating or diarrhea. ### Fact 8 (severity: GENERAL SAFETY) – Always confirm with a health professional - These facts describe common patterns but do not replace personal medical advice. - Any major change in diet for patients with hypertension, diabetes or gout should be discussed with a doctor or dietitian. Elderly on 3+ daily medicines; high risk of drug–nutrient issues ### Fact 1 (severity: HIGH) – Warfarin and vitamin K–rich foods - Patients taking warfarin (a blood thinner) need stable vitamin K intake. - Ingredients such as “vitamin K”, “phytonadione” or large amounts of leafy greens (often listed in mixed vegetable products) can reduce the effect of warfarin if intake suddenly increases. - The key risk is sudden big changes in vitamin K intake, not small, consistent amounts. Patients should follow their doctor’s or clinic’s advice on diet. ### Fact 2 (severity: HIGH) – Grapefruit and certain medicines - Grapefruit and “grapefruit extract” in drinks or foods can increase blood levels of some medicines processed by CYP3A4, including certain statins (e.g., simvastatin, atorvastatin) and some blood pressure or heart medicines. - This may raise the risk of side effects such as muscle problems with statins. - If a patient is advised to avoid grapefruit, products containing grapefruit should generally be avoided unless their doctor says otherwise. ### Fact 3 (severity: HIGH) – Potassium and heart / blood pressure medicines - Some medicines for blood pressure and heart failure (ACE inhibitors, ARBs, potassium-sparing diuretics like spironolactone) can increase potassium levels. - Foods and supplements labeled “high in potassium” or with “potassium chloride” as a salt substitute can further increase potassium and may be risky in patients with kidney or heart problems. - Very high potassium can affect heart rhythm; patients should follow their doctor’s dietary advice. ### Fact 4 (severity: MEDIUM–HIGH) – Sodium, heart failure and hypertension - Many processed foods for older adults (instant soup, corned beef, tocino, ham, dried fish, instant noodles) contain large amounts of sodium from salt and preservatives. - High sodium intake can worsen blood pressure and cause fluid retention, especially in people taking diuretics or with heart failure. ### Fact 5 (severity: MEDIUM) – NSAIDs and kidney / blood pressure risk - Over-the-counter pain relievers such as ibuprofen, naproxen and some combination cold medicines can affect kidney function and may increase blood pressure, especially when combined with certain blood pressure or kidney medicines. - Polypharmacy patients should be careful with any added “pain relief” or “cold/flu” ingredients in food-like products or supplements and ask their health professional before regular use. ### Fact 6 (severity: MEDIUM) – Calcium, iron and absorption of other meds - Calcium (e.g., “calcium carbonate”) and iron (“ferrous sulfate”, “ferrous fumarate”) can reduce absorption of some medicines if taken at the same time, including certain thyroid medicines (levothyroxine) and some antibiotics. - If a product is rich in calcium or iron, medicine timing instructions from the doctor or pharmacist should be followed (for example: taking medicine on an empty stomach or spacing it away from mineral supplements). ### Fact 7 (severity: MEDIUM) – High-fiber products and medicine absorption - Very high-fiber foods (bran cereals, certain fiber supplements) can slightly reduce absorption of some medicines if taken together. - For elderly patients on many medicines, spacing some drugs away from very high-fiber meals may be recommended by their healthcare provider. ### Fact 8 (severity: GENERAL SAFETY) – Multiple medicines, higher interaction risk - The more medicines an older adult takes, the higher the chance that a food, drink, or supplement can interact with at least one of them. - Any new product taken regularly (daily drink mix, fortified snack, herbal supplement) should be checked with a healthcare professional, especially in patients taking 3 or more medicines. Family members buying groceries for aging parents in the Philippines ### Fact 1 (severity: HIGH) – Instant noodles, canned goods and salty foods - Instant noodles, canned sardines, corned beef, sausages, longganisa, ham, dried fish and many “ulams in a pack” often contain very high levels of salt (sodium). - For parents with high blood pressure, heart failure or kidney disease, frequent intake of very salty foods can worsen their condition and make medicines less effective. ### Fact 2 (severity: HIGH) – Sweetened drinks and snacks for diabetics - Soft drinks, powdered juice, ready-to-drink coffee and milk tea, sweetened yogurt drinks and many biscuits or pastries contain large amounts of sugar. - For parents with Type 2 Diabetes, these can cause large blood sugar spikes and make it harder for maintenance medicines like metformin or insulin to control glucose. ### Fact 3 (severity: MEDIUM–HIGH) – Gout and common Filipino foods - For parents with gout, some common items can trigger attacks: - Sardines, certain canned fish, anchovies, liver spread and organ-meat-based products. - Products with “yeast extract” or “meat extract”. - Regular or heavy intake of these foods can raise uric acid and cause gout flare-ups, even if the parent is taking gout medicine. ### Fact 4 (severity: MEDIUM) – “Healthy” labels that still have sugar or salt - Some products marketed as “fortified”, “for adults”, “for seniors”, or “with vitamins” may still have high sugar, salt or fat. - Caregivers should look beyond the marketing words and check the ingredients and nutrition label (sugar, sodium, total fat) when buying for parents with chronic disease. ### Fact 5 (severity: MEDIUM) – Alcohol and medicines - Alcohol in beverages (beer, wine, spirits, mixed drinks) can interfere with many medicines, including diabetes drugs, blood pressure medicines, and sedatives. - Even cooking wines or strong alcoholic sauces used often may matter for sensitive patients. - If parents are on multiple medicines, alcohol intake should be limited or discussed with their doctor. ### Fact 6 (severity: MEDIUM) – Herbal and “food-supplement” products - Many herbal teas, “food supplements” and “immune boosters” are sold as foods, not as prescription medicines. - Even if labeled as “natural”, these may still interact with maintenance medicines (for blood pressure, blood thinners, diabetes or cholesterol). - Caregivers should avoid regularly giving new herbal products or supplements to parents with many medicines unless a doctor or pharmacist has reviewed them. ### Fact 7 (severity: GENERAL SAFETY) – Remote monitoring and communication - For OFWs or distant caregivers, it is helpful to: - Keep a written or digital list of all the parent’s current medicines and doses. - Share simple guidance: limit very salty foods for hypertension/heart failure, limit very sweet foods and drinks for diabetes, avoid purine-rich foods for gout. - Encourage parents to show new food products or supplements to their healthcare provider during clinic visits. ### Fact 8 (severity: GENERAL REMINDER) - These facts are general patterns, not personalized medical advice. - The safest approach is to use them as a guide for grocery choices and always confirm specific questions with the parent’s doctor or dietitian.";

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
      const qwen3Response = JSON.parse(analysisResponse.choices[0]?.message?.content || '{}');

      // Create a mock analysis result for the food items (in a real app, this would come from actual food recognition)
      const analysisResult = {
        FoodItems: [
          { name: 'Extracted Ingredients', rate: 0.95, novaCategory: 4 }
        ],
        Nutrition: {
          Calories: 0,
          Protein: 0,
          Carbs: 0,
          Sugar: 0,
          Fat: 0
        },
        Insights: ['Analysis based on extracted label text'],
        Timestamp: new Date().toISOString()
      };

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

}