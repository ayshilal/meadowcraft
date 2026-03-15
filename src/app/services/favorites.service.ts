import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type FavoriteType = 'facts' | 'tips';

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private storageKeys: Record<FavoriteType, string> = {
    facts: 'fav_facts',
    tips: 'fav_tips',
  };

  private favFacts$ = new BehaviorSubject<number[]>(this.load('facts'));
  private favTips$ = new BehaviorSubject<number[]>(this.load('tips'));

  private load(type: FavoriteType): number[] {
    const raw = localStorage.getItem(this.storageKeys[type]);
    return raw ? JSON.parse(raw) : [];
  }

  private save(type: FavoriteType, ids: number[]): void {
    localStorage.setItem(this.storageKeys[type], JSON.stringify(ids));
    if (type === 'facts') {
      this.favFacts$.next(ids);
    } else {
      this.favTips$.next(ids);
    }
  }

  isFavorite(type: FavoriteType, id: number): boolean {
    const ids = type === 'facts' ? this.favFacts$.value : this.favTips$.value;
    return ids.includes(id);
  }

  toggleFavorite(type: FavoriteType, id: number): void {
    const ids = type === 'facts' ? [...this.favFacts$.value] : [...this.favTips$.value];
    const index = ids.indexOf(id);
    if (index > -1) {
      ids.splice(index, 1);
    } else {
      ids.push(id);
    }
    this.save(type, ids);
  }
}
