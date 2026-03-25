import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Routine, RoutineStep } from '../models/routine.model';

export interface GeneratedStep {
  order: number;
  productName: string;
  brand: string;
  category: string;
  notes: string;
  reasoning: string;
}

export interface DaySchedule {
  morning: string[];
  evening: string[];
}

export interface GeneratedRoutine {
  morningSteps: GeneratedStep[];
  eveningSteps: GeneratedStep[];
  weeklySchedule?: { [day: string]: DaySchedule };
  explanation: string;
}

export interface GenerateRoutineRequest {
  products: { name: string; brand: string; category: string; description?: string }[];
  skinType?: string;
  skinConcerns?: string;
}

@Injectable({
  providedIn: 'root',
})
export class RoutineService {
  private morningRoutineSubject = new BehaviorSubject<RoutineStep[]>([]);
  private eveningRoutineSubject = new BehaviorSubject<RoutineStep[]>([]);
  private morningLoaded = false;
  private eveningLoaded = false;

  morningRoutine$ = this.morningRoutineSubject.asObservable();
  eveningRoutine$ = this.eveningRoutineSubject.asObservable();

  constructor(private api: ApiService) {}

  loadRoutine(type: 'Morning' | 'Evening'): void {
    this.api.get<Routine>(`routines?type=${type}`).pipe(
      catchError(() => of({ id: 0, name: `${type} Routine`, type, steps: [] } as Routine))
    ).subscribe((routine) => {
      const steps = (routine.steps || []).sort((a, b) => a.order - b.order);
      if (type === 'Morning') {
        this.morningRoutineSubject.next(steps);
        this.morningLoaded = true;
      } else {
        this.eveningRoutineSubject.next(steps);
        this.eveningLoaded = true;
      }
    });
  }

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

  generateRoutine(request: GenerateRoutineRequest): Observable<GeneratedRoutine> {
    return this.api.post<GeneratedRoutine>('routines/generate', request);
  }

  applyGeneratedRoutine(routine: GeneratedRoutine): Observable<void> {
    return this.api.post<void>('routines/apply', routine).pipe(
      tap(() => {
        // Reload both routines from API
        this.loadRoutine('Morning');
        this.loadRoutine('Evening');
      })
    );
  }
}
