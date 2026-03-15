import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { BeautyFact, Recommendation } from '../models/beauty-fact.model';

@Injectable({
  providedIn: 'root',
})
export class DiscoverService {
  private mockFacts: BeautyFact[] = [
    {
      id: 1,
      title: 'The Power of Vitamin C',
      content:
        'Vitamin C is a powerful antioxidant that brightens skin, boosts collagen production, and protects against sun damage. Apply it in the morning before sunscreen for best results.',
      category: 'Ingredient Spotlight',
    },
    {
      id: 2,
      title: 'Why SPF is Non-Negotiable',
      content:
        'UV rays cause 80% of visible skin aging. Wearing SPF 30+ daily prevents wrinkles, dark spots, and skin cancer — even on cloudy days.',
      category: 'Skincare Tips',
    },
    {
      id: 3,
      title: 'Beauty Sleep is Real',
      content:
        'Your skin repairs itself while you sleep. Growth hormone production peaks during deep sleep, boosting cell regeneration and collagen synthesis.',
      category: 'Wellness',
    },
    {
      id: 4,
      title: 'Hydration from Within',
      content:
        'Drinking at least 8 glasses of water daily helps maintain skin elasticity and flush toxins. Add cucumber or lemon for extra antioxidants.',
      category: 'Daily Habits',
    },
    {
      id: 5,
      title: 'The Magic of Retinol',
      content:
        'Retinol accelerates cell turnover, reduces fine lines, and clears pores. Start with a low concentration and always use sunscreen the next day.',
      category: 'Ingredient Spotlight',
    },
    {
      id: 6,
      title: 'Nourish Your Skin with Omega-3',
      content:
        'Omega-3 fatty acids found in salmon, walnuts, and flaxseed strengthen the skin barrier and reduce inflammation for a healthy glow.',
      category: 'Nutrition',
    },
    {
      id: 7,
      title: 'Double Cleansing Method',
      content:
        'Start with an oil-based cleanser to remove makeup and SPF, then follow with a water-based cleanser. This ensures a truly clean canvas for your treatments.',
      category: 'Skincare Tips',
    },
    {
      id: 8,
      title: 'Stress and Your Skin',
      content:
        'Cortisol from stress triggers excess oil production and breakouts. Practice meditation, deep breathing, or gentle exercise to keep your skin calm.',
      category: 'Wellness',
    },
    {
      id: 9,
      title: 'The Benefits of Niacinamide',
      content:
        'Niacinamide (vitamin B3) is a versatile ingredient that minimizes pores, evens skin tone, and strengthens the skin barrier. It pairs well with nearly every active and is gentle enough for sensitive skin. Use it morning and night for best results.',
      category: 'Ingredient Spotlight',
    },
  ];

  private mockRecommendations: Recommendation[] = [
    {
      id: 1,
      title: 'Morning Meditation',
      description:
        'Start your day with 5 minutes of mindfulness. Reduced stress means clearer, more radiant skin.',
      icon: 'sunny-outline',
      category: 'Wellness',
    },
    {
      id: 2,
      title: 'Silk Pillowcase',
      description:
        'Switch to a silk pillowcase to reduce friction on your skin and hair while you sleep.',
      icon: 'moon-outline',
      category: 'Daily Habits',
    },
    {
      id: 3,
      title: 'Weekly Face Mask',
      description:
        'Treat yourself to a hydrating or clay mask once a week for deep nourishment.',
      icon: 'sparkles-outline',
      category: 'Skincare Tips',
    },
    {
      id: 4,
      title: 'Green Tea Benefits',
      description:
        'Replace your afternoon coffee with green tea for powerful polyphenols that fight aging.',
      icon: 'leaf-outline',
      category: 'Nutrition',
    },
    {
      id: 5,
      title: 'Facial Massage',
      description:
        'Spend 2 minutes massaging your face while applying serum to boost circulation and absorption.',
      icon: 'heart-outline',
      category: 'Skincare Tips',
    },
    {
      id: 6,
      title: 'Digital Detox',
      description:
        'Blue light from screens can damage skin. Take 10-minute breaks every hour and use blue light protection.',
      icon: 'phone-portrait-outline',
      category: 'Wellness',
    },
  ];

  constructor(private api: ApiService) {}

  getBeautyFacts(): Observable<BeautyFact[]> {
    return this.api.get<BeautyFact[]>('beauty-facts').pipe(
      catchError(() => of(this.mockFacts))
    );
  }

  getRecommendations(): Observable<Recommendation[]> {
    return this.api.get<Recommendation[]>('recommendations').pipe(
      catchError(() => of(this.mockRecommendations))
    );
  }

  getTipOfTheDay(): BeautyFact {
    const dayIndex = new Date().getDate() % this.mockFacts.length;
    return this.mockFacts[dayIndex];
  }
}
