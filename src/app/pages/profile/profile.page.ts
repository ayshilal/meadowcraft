import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personCircleOutline,
  notificationsOutline,
  colorPaletteOutline,
  informationCircleOutline,
  logOutOutline,
  chevronForwardOutline,
  heartOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
  ],
})
export class ProfilePage {
  userName = 'Beauty Enthusiast';
  userEmail = 'hello@elegantlux.com';

  constructor(private toastController: ToastController) {
    addIcons({
      personCircleOutline,
      notificationsOutline,
      colorPaletteOutline,
      informationCircleOutline,
      logOutOutline,
      chevronForwardOutline,
      heartOutline,
      shieldCheckmarkOutline,
    });
  }

  async showComingSoon() {
    const toast = await this.toastController.create({
      message: 'Coming soon! This feature is under development.',
      duration: 2000,
      position: 'top',
      color: 'primary',
    });
    await toast.present();
  }
}
