import { Product } from './product.model';

export interface RoutineStep {
  id?: number;
  routineId?: number;
  productId: number;
  product?: Product;
  order: number;
  notes?: string;
}

export interface Routine {
  id?: number;
  name: string;
  type: RoutineType;
  steps: RoutineStep[];
  createdAt?: string;
}

export type RoutineType = 'Morning' | 'Evening';
