import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, NgIf, NgFor } from '@angular/common';
import { UserProfileService } from '../services/user-profile.service';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonItem, IonIcon, IonLabel, IonToggle, IonButton, IonGrid, IonRow, IonCol, IonList } from '@ionic/angular/standalone';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [DatePipe, NgIf, NgFor, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonItem, IonIcon, IonLabel, IonToggle, IonButton, IonGrid, IonRow, IonCol, IonList],
})
export class Tab1Page implements OnInit {
  recentScans = [
    { id: 1, name: 'Cereal Box', date: new Date() },
    { id: 2, name: 'Protein Bar', date: new Date(Date.now() - 86400000) }
  ];
  isProfileComplete = false;
  
  constructor(
    private router: Router,
    private userProfileService: UserProfileService
  ) {}
  
  ngOnInit() {
    // Check if user profile is complete
    const profile = this.userProfileService.getUserProfile();
    this.isProfileComplete = profile.age > 0 && profile.height > 0 && profile.weight > 0;
  }
  
  scanFromCamera() {
    // Navigate to camera page
    this.router.navigate(['/tabs/camera']);
  }
  
  scanFromGallery() {
    // Navigate to gallery page
    this.router.navigate(['/tabs/camera']);
  }
  
  viewScan(scan: any) {
    // Navigate to results page with scan data
    this.router.navigate(['/tabs/camera']);
  }
}
