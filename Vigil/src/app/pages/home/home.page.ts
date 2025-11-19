import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, NgIf, NgFor } from '@angular/common';
import { UserProfileService } from '../../services/user-profile.service';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonItem, IonIcon, IonLabel, IonButton, IonGrid, IonRow, IonCol, IonList } from '@ionic/angular/standalone';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [DatePipe, NgIf, NgFor, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonItem, IonIcon, IonLabel, IonButton, IonGrid, IonRow, IonCol, IonList],
})
export class HomePage implements OnInit {
  recentScans: any[] = [];
  
  // Use inject() instead of constructor parameter injection
  private router = inject(Router);
  private userProfileService = inject(UserProfileService);

  constructor() {}
  
  ngOnInit() {
    // Load recent scans from localStorage
    this.loadRecentScans();
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
  
  scanFromCamera() {
    // Navigate to camera page with source parameter
    this.router.navigate(['/tabs/camera'], { 
      state: { source: 'camera' } 
    });
  }
  
  scanFromGallery() {
    // Navigate to camera page with source parameter
    this.router.navigate(['/tabs/camera'], { 
      state: { source: 'gallery' } 
    });
  }
  
  viewScan(scan: any) {
    // Navigate to results page with scan data
    this.router.navigate(['/tabs/results'], { 
      state: { 
        analysisResult: scan.analysisResult,
        qwen3Analysis: scan.qwen3Analysis,
        extractedText: scan.extractedText
      } 
    });
  }
}