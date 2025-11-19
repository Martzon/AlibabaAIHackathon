import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FoodAnalysisService } from '../../services/food-analysis.service';
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

  constructor(
    private router: Router,
    private foodAnalysisService: FoodAnalysisService
  ) {}

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

  analyzeImage() {
    if (!this.capturedImage) {
      this.errorMessage = 'No image captured';
      return;
    }

    this.isLoading = true;
    this.errorMessage = undefined;

    // Convert data URL to blob
    fetch(this.capturedImage)
      .then(response => response.blob())
      .then(blob => {
        // Send to backend for analysis
        this.foodAnalysisService.analyzeFood(blob)
          .subscribe({
            next: (result) => {
              // Navigate to results page with the analysis result
              this.router.navigate(['/tabs/results'], { state: { analysisResult: result } });
              this.isLoading = false;
            },
            error: (error) => {
              console.error('Analysis error:', error);
              this.errorMessage = 'Failed to analyze image. Please try again.';
              this.isLoading = false;
            }
          });
      })
      .catch(error => {
        console.error('Error converting image:', error);
        this.errorMessage = 'Failed to process image. Please try again.';
        this.isLoading = false;
      });
  }
}