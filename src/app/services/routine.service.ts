import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Routine, RoutineStep } from '../models/routine.model';

@Injectable({
  providedIn: 'root',
})
export class RoutineService {
  private morningRoutineSubject = new BehaviorSubject<RoutineStep[]>([
    {
      id: 1,
      productId: 1,
      order: 1,
      notes: 'Massage gently for 60 seconds',
      product: {
        id: 1,
        name: 'Gentle Foaming Cleanser',
        brand: 'CeraVe',
        category: 'Cleanser',
      },
    },
    {
      id: 2,
      productId: 5,
      order: 2,
      notes: 'Apply with cotton pad',
      product: {
        id: 5,
        name: 'Rose Water Toner',
        brand: 'Thayers',
        category: 'Toner',
      },
    },
    {
      id: 3,
      productId: 2,
      order: 3,
      notes: 'Pat into damp skin',
      product: {
        id: 2,
        name: 'Hyaluronic Acid Serum',
        brand: 'The Ordinary',
        category: 'Serum',
      },
    },
    {
      id: 4,
      productId: 3,
      order: 4,
      notes: 'Apply evenly',
      product: {
        id: 3,
        name: 'Moisturizing Cream',
        brand: 'La Roche-Posay',
        category: 'Moisturizer',
      },
    },
    {
      id: 5,
      productId: 4,
      order: 5,
      notes: 'Last step, always!',
      product: {
        id: 4,
        name: 'UV Expert SPF 50',
        brand: 'Lancôme',
        category: 'SPF',
      },
    },
  ]);

  private eveningRoutineSubject = new BehaviorSubject<RoutineStep[]>([
    {
      id: 6,
      productId: 1,
      order: 1,
      notes: 'Double cleanse - second wash',
      product: {
        id: 1,
        name: 'Gentle Foaming Cleanser',
        brand: 'CeraVe',
        category: 'Cleanser',
      },
    },
    {
      id: 7,
      productId: 5,
      order: 2,
      notes: 'Prep skin for treatments',
      product: {
        id: 5,
        name: 'Rose Water Toner',
        brand: 'Thayers',
        category: 'Toner',
      },
    },
    {
      id: 8,
      productId: 2,
      order: 3,
      notes: 'Layer generously at night',
      product: {
        id: 2,
        name: 'Hyaluronic Acid Serum',
        brand: 'The Ordinary',
        category: 'Serum',
      },
    },
    {
      id: 9,
      productId: 3,
      order: 4,
      notes: 'Seal in all the goodness',
      product: {
        id: 3,
        name: 'Moisturizing Cream',
        brand: 'La Roche-Posay',
        category: 'Moisturizer',
      },
    },
  ]);

  morningRoutine$ = this.morningRoutineSubject.asObservable();
  eveningRoutine$ = this.eveningRoutineSubject.asObservable();

  constructor(private api: ApiService) {}

  getRoutine(type: 'Morning' | 'Evening'): Observable<Routine> {
    return this.api.get<Routine>(`routines?type=${type}`).pipe(
      catchError(() => {
        const steps =
          type === 'Morning'
            ? this.morningRoutineSubject.value
            : this.eveningRoutineSubject.value;
        return of({ id: 1, name: `${type} Routine`, type, steps });
      })
    );
  }

  addStep(
    type: 'Morning' | 'Evening',
    step: RoutineStep
  ): Observable<RoutineStep> {
    return this.api.post<RoutineStep>('routines/steps', step).pipe(
      tap((newStep) => this.addLocalStep(type, newStep)),
      catchError(() => {
        const newStep = { ...step, id: Date.now() };
        this.addLocalStep(type, newStep);
        return of(newStep);
      })
    );
  }

  removeStep(type: 'Morning' | 'Evening', stepId: number): Observable<void> {
    return this.api.delete<void>(`routines/steps/${stepId}`).pipe(
      tap(() => this.removeLocalStep(type, stepId)),
      catchError(() => {
        this.removeLocalStep(type, stepId);
        return of(undefined as void);
      })
    );
  }

  reorderSteps(
    type: 'Morning' | 'Evening',
    steps: RoutineStep[]
  ): void {
    const reordered = steps.map((s, i) => ({ ...s, order: i + 1 }));
    const subject =
      type === 'Morning'
        ? this.morningRoutineSubject
        : this.eveningRoutineSubject;
    subject.next(reordered);
  }

  private addLocalStep(type: 'Morning' | 'Evening', step: RoutineStep): void {
    const subject =
      type === 'Morning'
        ? this.morningRoutineSubject
        : this.eveningRoutineSubject;
    const current = subject.value;
    subject.next([...current, step]);
  }

  private removeLocalStep(
    type: 'Morning' | 'Evening',
    stepId: number
  ): void {
    const subject =
      type === 'Morning'
        ? this.morningRoutineSubject
        : this.eveningRoutineSubject;
    const current = subject.value.filter((s) => s.id !== stepId);
    subject.next(current);
  }
}
