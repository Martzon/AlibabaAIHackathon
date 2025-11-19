import { Injectable } from '@angular/core';

export interface MedicalCondition {
  name: string;
  description: string;
  dietaryRestrictions: string[];
}

export interface UserProfile {
  age: number;
  gender: string;
  height: number; // in cm
  weight: number; // in kg
  medicalConditions: MedicalCondition[];
  allergies: string[];
  dietaryPreferences: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {
  private userProfile: UserProfile = {
    age: 30,
    gender: 'male',
    height: 175,
    weight: 70,
    medicalConditions: [],
    allergies: [],
    dietaryPreferences: []
  };

  constructor() { }

  getUserProfile(): UserProfile {
    return this.userProfile;
  }

  updateUserProfile(profile: Partial<UserProfile>): void {
    this.userProfile = { ...this.userProfile, ...profile };
  }

  addMedicalCondition(condition: MedicalCondition): void {
    this.userProfile.medicalConditions.push(condition);
  }

  removeMedicalCondition(conditionName: string): void {
    this.userProfile.medicalConditions = this.userProfile.medicalConditions.filter(
      condition => condition.name !== conditionName
    );
  }

  addAllergy(allergy: string): void {
    if (!this.userProfile.allergies.includes(allergy)) {
      this.userProfile.allergies.push(allergy);
    }
  }

  removeAllergy(allergy: string): void {
    this.userProfile.allergies = this.userProfile.allergies.filter(a => a !== allergy);
  }

  getPersonalizedAdvice(ingredient: string, novaCategory: number): string[] {
    const advice: string[] = [];
    const lowerIngredient = ingredient.toLowerCase();
    const profile = this.getUserProfile();

    // Check for allergies
    for (const allergy of profile.allergies) {
      if (lowerIngredient.includes(allergy.toLowerCase())) {
        advice.push(`⚠️ ALERT: You have an allergy to ${allergy}. Avoid this product!`);
      }
    }

    // Check for medical conditions
    for (const condition of profile.medicalConditions) {
      for (const restriction of condition.dietaryRestrictions) {
        if (lowerIngredient.includes(restriction.toLowerCase())) {
          advice.push(`⚠️ CAUTION: ${condition.name} restriction - ${restriction} may worsen your condition`);
        }
      }
    }

    // Age-related advice
    if (profile.age > 50) {
      if (lowerIngredient.includes('salt')) {
        advice.push('As an older adult, you should be especially careful with sodium intake');
      }
      
      if (lowerIngredient.includes('sugar')) {
        advice.push('Older adults should monitor sugar intake to maintain stable blood sugar');
      }
    }

    // Weight-related advice
    const bmi = profile.weight / Math.pow(profile.height / 100, 2);
    if (bmi > 25) {
      if (novaCategory >= 3) {
        advice.push('As someone with elevated BMI, consider limiting processed foods');
      }
    }

    return advice;
  }
}