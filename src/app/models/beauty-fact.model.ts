export interface BeautyFact {
  id?: number;
  title: string;
  content: string;
  category: BeautyFactCategory;
  imageUrl?: string;
}

export interface Recommendation {
  id?: number;
  title: string;
  description: string;
  icon?: string;
  category: BeautyFactCategory;
}

export type BeautyFactCategory =
  | 'Skincare Tips'
  | 'Ingredient Spotlight'
  | 'Wellness'
  | 'Daily Habits'
  | 'Nutrition';
