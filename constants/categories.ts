export interface CategoryDef {
  key: 'business' | 'personal' | 'medical' | 'charity';
  label: string;
  color: string;
}

export const categories: CategoryDef[] = [
  { key: 'business', label: 'Business', color: '#1976D2' },
  { key: 'personal', label: 'Personal', color: '#FF9800' },
  { key: 'medical', label: 'Medical', color: '#9C27B0' },
  { key: 'charity', label: 'Charity', color: '#4CAF50' },
];
