import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private productsSubject = new BehaviorSubject<Product[]>([]);
  products$ = this.productsSubject.asObservable();

  private mockProducts: Product[] = [
    {
      id: 1,
      name: 'Gentle Foaming Cleanser',
      brand: 'CeraVe',
      category: 'Cleanser',
      description: 'A gentle, hydrating cleanser for all skin types.',
      imageUrl: 'assets/illustrations/products/cerave-cleanser.svg',
    },
    {
      id: 2,
      name: 'Hyaluronic Acid Serum',
      brand: 'The Ordinary',
      category: 'Serum',
      description: 'Intense hydration with pure hyaluronic acid.',
      imageUrl: 'assets/illustrations/products/ordinary-serum.svg',
    },
    {
      id: 3,
      name: 'Moisturizing Cream',
      brand: 'La Roche-Posay',
      category: 'Moisturizer',
      description: 'Rich moisturizer for dry to very dry skin.',
      imageUrl: 'assets/illustrations/products/laroche-moisturizer.svg',
    },
    {
      id: 4,
      name: 'UV Expert SPF 50',
      brand: 'Lancôme',
      category: 'SPF',
      description: 'Lightweight sunscreen with broad-spectrum protection.',
      imageUrl: 'assets/illustrations/products/lancome-spf.svg',
    },
    {
      id: 5,
      name: 'Rose Water Toner',
      brand: 'Thayers',
      category: 'Toner',
      description: 'Alcohol-free witch hazel toner with rose petal.',
      imageUrl: 'assets/illustrations/products/thayers-toner.svg',
    },
  ];

  constructor(private api: ApiService) {
    this.loadProducts();
  }

  loadProducts(): void {
    this.api.get<Product[]>('products').pipe(
      tap((products) => products.forEach(p => this.hydrateRating(p))),
      catchError(() => of(this.mockProducts))
    ).subscribe((products) => this.productsSubject.next(products));
  }

  getProducts(): Observable<Product[]> {
    return this.api.get<Product[]>('products').pipe(
      tap((products) => {
        products.forEach(p => this.hydrateRating(p));
        this.productsSubject.next(products);
      }),
      catchError(() => {
        this.productsSubject.next(this.mockProducts);
        return of(this.mockProducts);
      })
    );
  }

  private hydrateRating(product: Product): void {
    if (product.apothecaryRatingJson && !product.apothecaryRating) {
      try {
        product.apothecaryRating = JSON.parse(product.apothecaryRatingJson);
      } catch { /* ignore parse errors */ }
    }
  }

  getProduct(id: number): Observable<Product> {
    return this.api.get<Product>(`products/${id}`).pipe(
      catchError(() => {
        const found = this.productsSubject.value.find((p) => p.id === id);
        return of(found || this.mockProducts[0]);
      })
    );
  }

  addProduct(product: Product): Observable<Product> {
    return this.api.post<Product>('products', product).pipe(
      tap((newProduct) => {
        const current = this.productsSubject.value;
        this.productsSubject.next([...current, newProduct]);
      }),
      catchError(() => {
        const newProduct = {
          ...product,
          id: Date.now(),
          createdAt: new Date().toISOString(),
        };
        const current = this.productsSubject.value;
        this.productsSubject.next([...current, newProduct]);
        return of(newProduct);
      })
    );
  }

  updateProduct(id: number, product: Product): Observable<Product> {
    return this.api.put<Product>(`products/${id}`, product).pipe(
      tap((updated) => {
        const current = this.productsSubject.value;
        const index = current.findIndex((p) => p.id === id);
        if (index !== -1) {
          current[index] = updated;
          this.productsSubject.next([...current]);
        }
      }),
      catchError(() => {
        const current = this.productsSubject.value;
        const index = current.findIndex((p) => p.id === id);
        if (index !== -1) {
          current[index] = { ...product, id };
          this.productsSubject.next([...current]);
        }
        return of({ ...product, id });
      })
    );
  }

  deleteProduct(id: number): Observable<void> {
    return this.api.delete<void>(`products/${id}`).pipe(
      tap(() => {
        const current = this.productsSubject.value.filter((p) => p.id !== id);
        this.productsSubject.next(current);
      }),
      catchError(() => {
        const current = this.productsSubject.value.filter((p) => p.id !== id);
        this.productsSubject.next(current);
        return of(undefined as void);
      })
    );
  }
}
