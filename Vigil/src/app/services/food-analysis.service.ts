import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FoodItem {
  name: string;
  rate: number;
  novaCategory: number;
}

export interface NutritionData {
  Calories: number;
  Protein: number;
  Carbs: number;
  Sugar: number;
  Fat: number;
}

export interface AnalysisResult {
  FoodItems: FoodItem[];
  Nutrition: NutritionData;
  Insights: string[];
  Timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class FoodAnalysisService {
  private apiUrl = '/api/FoodAnalysis/analyze'; // Adjust based on your backend URL

  // Use inject() instead of constructor parameter injection
  private http = inject(HttpClient);

  constructor() { }

  analyzeFood(imageBlob: Blob): Observable<AnalysisResult> {
    const formData = new FormData();
    formData.append('image', imageBlob, 'food-image.jpg');

    // Don't set Content-Type header, let the browser set it with the boundary
    
    return this.http.post<AnalysisResult>(this.apiUrl, formData);
  }
}