import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ProductIdentification {
  name: string;
  brand: string;
  category: string;
  description: string | null;
  ingredients: string[];
  confidence: number;
  imageUrl?: string;
  capturedImageUrl?: string;
  apothecaryRating?: ApothecaryRating;
}

export interface ApothecaryRating {
  actives: number;
  purity: number;
  harmony: number;
  grade: string;
  ingredientRatings: IngredientRatingItem[];
}

export interface IngredientRatingItem {
  name: string;
  rating: 'beneficial' | 'neutral' | 'caution';
  note: string;
}

export interface HarmonyRequest {
  productIngredients: string[];
  existingProducts: { name: string; ingredients: string }[];
}

export interface HarmonyResult {
  harmony: number;
  conflicts: string[];
  synergies: string[];
}

export interface IngredientAnalysis {
  keyActives: string[];
  potentialIrritants: string[];
  skinBenefits: string[];
  summary: string;
}

@Injectable({
  providedIn: 'root',
})
export class VisionService {
  constructor(private api: ApiService) {}

  identifyProduct(base64Image: string, barcode?: string | null): Observable<ProductIdentification> {
    return this.api.post<ProductIdentification>('vision/identify', { image: base64Image, barcode: barcode || null });
  }

  analyzeIngredients(ingredients: string): Observable<IngredientAnalysis> {
    return this.api.post<IngredientAnalysis>('vision/analyze-ingredients', { ingredients });
  }

  getHarmonyScore(request: HarmonyRequest): Observable<HarmonyResult> {
    return this.api.post<HarmonyResult>('vision/harmony-score', request);
  }

  analyzeProduct(name: string, brand: string, ingredients?: string): Observable<ApothecaryRating> {
    return this.api.post<ApothecaryRating>('vision/analyze-product', { name, brand, ingredients });
  }
}
