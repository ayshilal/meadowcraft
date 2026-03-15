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
import { flowerOutline, mailOutline, lockClosedOutline } from 'ionicons/icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonInput, IonIcon],
})
export class LoginPage {
  email = '';
  password = '';

  constructor(
    private router: Router,
    private toastController: ToastController
  ) {
    addIcons({ flowerOutline, mailOutline, lockClosedOutline });
  }

  async onLogin() {
    const toast = await this.toastController.create({
      message: 'Login coming soon! Entering as guest.',
      duration: 2000,
      position: 'top',
      color: 'primary',
    });
    await toast.present();
    this.router.navigate(['/tabs/home']);
  }

  goToSignup() {
    this.router.navigate(['/signup']);
  }

  skipLogin() {
    this.router.navigate(['/tabs/home']);
  }
}
