import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface BarcodeResult {
  name: string;
  brand: string;
  ingredients: string | null;
  imageUrl: string | null;
  categories: string | null;
  barcode: string;
}

@Injectable({
  providedIn: 'root',
})
export class BarcodeService {
  constructor(private api: ApiService) {}

  lookup(barcode: string): Observable<BarcodeResult> {
    return this.api.get<BarcodeResult>(`barcode/${barcode}`);
  }
}
