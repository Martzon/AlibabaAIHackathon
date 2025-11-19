import { Component, OnInit } from '@angular/core';
import { UserProfileService, UserProfile, MedicalCondition } from '../../services/user-profile.service';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonButton, IonList, IonChip, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.page.html',
  styleUrls: ['./user-profile.page.scss'],
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonButton, IonList, IonChip, IonIcon]
})
export class UserProfilePage implements OnInit {
  profile: UserProfile;
  newCondition: MedicalCondition = {
    name: '',
    description: '',
    dietaryRestrictions: []
  };
  newAllergy: string = '';
  newRestriction: string = '';

  commonConditions = [
    { name: 'Diabetes', description: 'A group of metabolic disorders characterized by high blood sugar', dietaryRestrictions: ['sugar', 'refined carbs'] },
    { name: 'Hypertension', description: 'High blood pressure', dietaryRestrictions: ['salt', 'sodium'] },
    { name: 'Heart Disease', description: 'Various conditions affecting the heart', dietaryRestrictions: ['saturated fat', 'cholesterol'] },
    { name: 'Celiac Disease', description: 'Autoimmune disorder triggered by gluten', dietaryRestrictions: ['gluten', 'wheat', 'barley', 'rye'] },
    { name: 'Obesity', description: 'Excess body weight with high BMI', dietaryRestrictions: ['sugar', 'processed foods'] }
  ];

  constructor(private userProfileService: UserProfileService) {
    this.profile = this.userProfileService.getUserProfile();
  }

  ngOnInit() {
  }

  saveProfile() {
    this.userProfileService.updateUserProfile(this.profile);
  }

  addCondition() {
    if (this.newCondition.name) {
      this.userProfileService.addMedicalCondition(this.newCondition);
      this.newCondition = {
        name: '',
        description: '',
        dietaryRestrictions: []
      };
    }
  }

  removeCondition(conditionName: string) {
    this.userProfileService.removeMedicalCondition(conditionName);
  }

  addAllergy() {
    if (this.newAllergy) {
      this.userProfileService.addAllergy(this.newAllergy);
      this.newAllergy = '';
    }
  }

  removeAllergy(allergy: string) {
    this.userProfileService.removeAllergy(allergy);
  }

  addRestriction() {
    if (this.newRestriction && this.newCondition.name) {
      if (!this.newCondition.dietaryRestrictions) {
        this.newCondition.dietaryRestrictions = [];
      }
      this.newCondition.dietaryRestrictions.push(this.newRestriction);
      this.newRestriction = '';
    }
  }

  removeRestriction(index: number) {
    if (this.newCondition.dietaryRestrictions) {
      this.newCondition.dietaryRestrictions.splice(index, 1);
    }
  }

  selectCommonCondition(condition: any) {
    this.newCondition = { ...condition };
  }
}