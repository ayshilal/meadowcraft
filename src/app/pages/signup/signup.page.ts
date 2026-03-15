import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonInput,
  IonIcon,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  flowerOutline,
  mailOutline,
  lockClosedOutline,
  personOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonInput, IonIcon],
})
export class SignupPage {
  name = '';
  email = '';
  password = '';

  constructor(
    private router: Router,
    private toastController: ToastController
  ) {
    addIcons({ flowerOutline, mailOutline, lockClosedOutline, personOutline });
  }

  async onSignup() {
    const toast = await this.toastController.create({
      message: 'Sign up coming soon! Entering as guest.',
      duration: 2000,
      position: 'top',
      color: 'primary',
    });
    await toast.present();
    this.router.navigate(['/tabs/home']);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
