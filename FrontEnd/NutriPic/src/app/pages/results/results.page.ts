import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Location, NgIf, NgFor } from '@angular/common';
import { UserProfileService } from '../../services/user-profile.service';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonList, IonItem, IonItemDivider, IonLabel, IonChip, IonIcon, IonNote, IonText, IonButton, IonButtons, IonBackButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-results',
  templateUrl: 'results.page.html',
  styleUrls: ['results.page.scss'],
  imports: [NgIf, NgFor, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonList, IonItem, IonItemDivider, IonLabel, IonChip, IonIcon, IonNote, IonText, IonButton, IonButtons, IonBackButton]
})
export class ResultsPage implements OnInit {
  analysisResult: any;
  
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private userProfileService: UserProfileService
  ) {}

  ngOnInit() {
    // Get the analysis result from navigation state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.analysisResult = navigation.extras.state?.['analysisResult'];
    }
  }
  
  getNovaCategory(item: any): number {
    // Use the NOVA category from the backend response if available
    if (item.novaCategory) {
      return item.novaCategory;
    }
    
    // Default to category 4 if not available
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
    // Get personalized advice based on user profile
    return this.userProfileService.getPersonalizedAdvice(ingredient, novaCategory);
  }
  
  getMedicalWarnings(item: any): string[] {
    // For now, return empty array as we don't have specific warning logic
    // This would be implemented based on medical conditions
    return [];
  }
  
  hasMedicalWarnings(): boolean {
    // For now, return false as we don't have specific warning logic
    return false;
  }
  
  goBack() {
    this.location.back();
  }
}