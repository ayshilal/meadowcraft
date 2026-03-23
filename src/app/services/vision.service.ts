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

  identifyProduct(base64Image: string): Observable<ProductIdentification> {
    return this.api.post<ProductIdentification>('vision/identify', { image: base64Image });
  }

  analyzeIngredients(ingredients: string): Observable<IngredientAnalysis> {
    return this.api.post<IngredientAnalysis>('vision/analyze-ingredients', { ingredients });
  }
}
