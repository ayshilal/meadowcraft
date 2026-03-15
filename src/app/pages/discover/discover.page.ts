import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonGrid,
  IonRow,
  IonCol,
  IonModal,
  IonButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  sparklesOutline,
  heartOutline,
  heart,
  leafOutline,
  sunnyOutline,
  moonOutline,
  flowerOutline,
  bulbOutline,
  ribbonOutline,
  closeOutline,
} from 'ionicons/icons';
import { DiscoverService } from '../../services/discover.service';
import { FavoritesService } from '../../services/favorites.service';
import { BeautyFact, Recommendation } from '../../models/beauty-fact.model';

@Component({
  selector: 'app-discover',
  templateUrl: './discover.page.html',
  styleUrls: ['./discover.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonIcon,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    IonGrid,
    IonRow,
    IonCol,
    IonModal,
    IonButton,
    IonButtons,
  ],
})
export class DiscoverPage implements OnInit {
  selectedTab = 'facts';
  beautyFacts: BeautyFact[] = [];
  recommendations: Recommendation[] = [];

  // Detail modal
  isDetailOpen = false;
  detailType: 'facts' | 'tips' = 'facts';
  detailItem: BeautyFact | Recommendation | null = null;
  detailIndex = 0;

  constructor(
    private discoverService: DiscoverService,
    private favoritesService: FavoritesService,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      sparklesOutline,
      heartOutline,
      heart,
      leafOutline,
      sunnyOutline,
      moonOutline,
      flowerOutline,
      bulbOutline,
      ribbonOutline,
      closeOutline,
    });
  }

  ngOnInit() {
    this.discoverService
      .getBeautyFacts()
      .subscribe((facts) => {
        this.beautyFacts = facts;
        this.cdr.detectChanges();
      });
    this.discoverService
      .getRecommendations()
      .subscribe((recs) => {
        this.recommendations = recs;
        this.cdr.detectChanges();
      });
  }

  onTabChange(event: any) {
    this.selectedTab = event.detail.value;
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'Skincare Tips': '#d4a0a0',
      'Ingredient Spotlight': '#c27ba0',
      Wellness: '#a0c4d4',
      'Daily Habits': '#a0d4b4',
      Nutrition: '#d4c4a0',
    };
    return colors[category] || '#d4a0a0';
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'Skincare Tips': 'sparkles-outline',
      'Ingredient Spotlight': 'bulb-outline',
      Wellness: 'heart-outline',
      'Daily Habits': 'sunny-outline',
      Nutrition: 'leaf-outline',
    };
    return icons[category] || 'sparkles-outline';
  }

  getFactImage(index: number): string {
    const images = [
      'assets/images/morris/wandle.jpg',
      'assets/images/morris/strawberry-thief.jpg',
      'assets/images/morris/honeysuckle.jpg',
      'assets/images/morris/willow-bough.jpg',
      'assets/images/morris/snakeshead.jpg',
      'assets/images/morris/fruit.jpg',
      'assets/images/morris/evenlode.jpg',
      'assets/images/morris/medway.jpg',
    ];
    return images[index % images.length];
  }

  getTipImage(index: number): string {
    const images = [
      'assets/images/morris/kennet.jpg',
      'assets/images/morris/wandle.jpg',
      'assets/images/morris/windrush.jpg',
      'assets/images/morris/lodden.jpg',
      'assets/images/morris/larkspur.jpg',
      'assets/images/morris/honeysuckle-met.jpg',
    ];
    return images[index % images.length];
  }

  getFactBannerImage(): string {
    return 'assets/images/morris/pimpernel.jpg';
  }

  getTipBannerImage(): string {
    return 'assets/images/morris/kennet.jpg';
  }

  // Detail modal
  openDetail(item: BeautyFact | Recommendation, index: number, type: 'facts' | 'tips') {
    this.detailItem = item;
    this.detailIndex = index;
    this.detailType = type;
    this.isDetailOpen = true;
  }

  closeDetail() {
    this.isDetailOpen = false;
  }

  getDetailImage(): string {
    return this.detailType === 'facts'
      ? this.getFactImage(this.detailIndex)
      : this.getTipImage(this.detailIndex);
  }

  getDetailContent(): string {
    if (!this.detailItem) return '';
    return 'content' in this.detailItem
      ? this.detailItem.content
      : this.detailItem.description;
  }

  // Favorites
  isFavorite(type: 'facts' | 'tips', id: number | undefined): boolean {
    if (!id) return false;
    return this.favoritesService.isFavorite(type, id);
  }

  toggleFavorite(type: 'facts' | 'tips', id: number | undefined, event?: Event) {
    if (event) event.stopPropagation();
    if (!id) return;
    this.favoritesService.toggleFavorite(type, id);
  }
}
