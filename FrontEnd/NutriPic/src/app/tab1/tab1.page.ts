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
  recentScans: any[] = [];
  isProfileComplete = false;
  
  constructor(
    private router: Router,
    private userProfileService: UserProfileService
  ) {}
  
  ngOnInit() {
    // Load recent scans from localStorage
    this.loadRecentScans();
    
    // Check if user profile is complete
    const profile = this.userProfileService.getUserProfile();
    this.isProfileComplete = profile.age > 0 && profile.height > 0 && profile.weight > 0;
  }
  
  loadRecentScans() {
    const scans = localStorage.getItem('recentScans');
    if (scans) {
      this.recentScans = JSON.parse(scans);
    } else {
      // Default recent scans
      this.recentScans = [
        { id: 1, name: 'Cereal Box', date: new Date() },
        { id: 2, name: 'Protein Bar', date: new Date(Date.now() - 86400000) }
      ];
    }
  }
  
  saveRecentScan(scan: any) {
    // Add new scan to the beginning of the array
    this.recentScans.unshift(scan);
    
    // Keep only the last 10 scans
    if (this.recentScans.length > 10) {
      this.recentScans = this.recentScans.slice(0, 10);
    }
    
    // Save to localStorage
    localStorage.setItem('recentScans', JSON.stringify(this.recentScans));
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