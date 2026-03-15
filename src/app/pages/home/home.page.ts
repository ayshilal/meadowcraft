import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  sparklesOutline,
  leafOutline,
  addCircleOutline,
  calendarOutline,
  flowerOutline,
} from 'ionicons/icons';
import { ProductService } from '../../services/product.service';
import { DiscoverService } from '../../services/discover.service';
import { RoutineService } from '../../services/routine.service';
import { ProgressService } from '../../services/progress.service';
import { BeautyFact } from '../../models/beauty-fact.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
  ],
})
export class HomePage implements OnInit {
  greeting = '';
  currentDate = '';
  productCount = 0;
  morningStepCount = 0;
  eveningStepCount = 0;
  tipOfTheDay: BeautyFact | null = null;
  morningDone = 0;
  eveningDone = 0;
  morningStreak = 0;
  eveningStreak = 0;

  constructor(
    private productService: ProductService,
    private discoverService: DiscoverService,
    private routineService: RoutineService,
    private progressService: ProgressService,
    private router: Router
  ) {
    addIcons({
      sparklesOutline,
      leafOutline,
      addCircleOutline,
      calendarOutline,
      flowerOutline,
    });
  }

  ngOnInit() {
    this.setGreeting();
    this.currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    this.productService.products$.subscribe(
      (products) => (this.productCount = products.length)
    );
    this.routineService.morningRoutine$.subscribe(
      (steps) => (this.morningStepCount = steps.length)
    );
    this.routineService.eveningRoutine$.subscribe(
      (steps) => (this.eveningStepCount = steps.length)
    );
    this.tipOfTheDay = this.discoverService.getTipOfTheDay();
    this.loadProgress();
  }

  private loadProgress() {
    this.morningDone = this.progressService.getDoneCount('Morning');
    this.eveningDone = this.progressService.getDoneCount('Evening');
    this.morningStreak = this.progressService.getStreak('Morning');
    this.eveningStreak = this.progressService.getStreak('Evening');
  }

  private setGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Good Morning';
    else if (hour < 17) this.greeting = 'Good Afternoon';
    else this.greeting = 'Good Evening';
  }

  goToProducts() {
    this.router.navigate(['/tabs/products']);
  }

  goToRoutine() {
    this.router.navigate(['/tabs/routine']);
  }

  goToDiscover() {
    this.router.navigate(['/tabs/discover']);
  }
}
