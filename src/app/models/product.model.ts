import { ApothecaryRating } from '../services/vision.service';

export interface Product {
  id?: number;
  name: string;
  brand: string;
  category: ProductCategory;
  description?: string;
  notes?: string;
  imageUrl?: string;
  createdAt?: string;
  apothecaryRating?: ApothecaryRating;
  apothecaryRatingJson?: string; // JSON string for DB persistence
}

export type ProductCategory =
  | 'Cleanser'
  | 'Toner'
  | 'Serum'
  | 'Moisturizer'
  | 'SPF'
  | 'Mask'
  | 'Exfoliant'
  | 'Eye Cream'
  | 'Oil'
  | 'Other';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Cleanser',
  'Toner',
  'Serum',
  'Moisturizer',
  'SPF',
  'Mask',
  'Exfoliant',
  'Eye Cream',
  'Oil',
  'Other',
];
