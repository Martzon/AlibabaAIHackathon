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
  medications: string[];
  dietaryPreferences: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {
  private userProfile: UserProfile = {
    age: 0,
    gender: '',
    height: 0,
    weight: 0,
    medicalConditions: [],
    allergies: [],
    medications: [],
    dietaryPreferences: []
  };

  constructor() {
    // Load user profile from localStorage on initialization
    this.loadProfile();
  }

  getUserProfile(): UserProfile {
    return this.userProfile;
  }

  updateUserProfile(profile: Partial<UserProfile>): void {
    this.userProfile = { ...this.userProfile, ...profile };
    this.saveProfile();
  }

  addMedicalCondition(condition: MedicalCondition): void {
    this.userProfile.medicalConditions.push(condition);
    this.saveProfile();
  }

  removeMedicalCondition(conditionName: string): void {
    this.userProfile.medicalConditions = this.userProfile.medicalConditions.filter(
      condition => condition.name !== conditionName
    );
    this.saveProfile();
  }

  addAllergy(allergy: string): void {
    if (!this.userProfile.allergies.includes(allergy)) {
      this.userProfile.allergies.push(allergy);
      this.saveProfile();
    }
  }

  removeAllergy(allergy: string): void {
    this.userProfile.allergies = this.userProfile.allergies.filter(a => a !== allergy);
    this.saveProfile();
  }

  addMedication(medication: string): void {
    if (!this.userProfile.medications.includes(medication)) {
      this.userProfile.medications.push(medication);
      this.saveProfile();
    }
  }

  removeMedication(medication: string): void {
    this.userProfile.medications = this.userProfile.medications.filter(m => m !== medication);
    this.saveProfile();
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
    if (profile.height > 0 && profile.weight > 0) {
      const bmi = profile.weight / Math.pow(profile.height / 100, 2);
      if (bmi > 25) {
        if (novaCategory >= 3) {
          advice.push('As someone with elevated BMI, consider limiting processed foods');
        }
      }
    }

    return advice;
  }

  private saveProfile(): void {
    localStorage.setItem('userProfile', JSON.stringify(this.userProfile));
  }

  private loadProfile(): void {
    const profile = localStorage.getItem('userProfile');
    if (profile) {
      this.userProfile = JSON.parse(profile);
    }
  }
}