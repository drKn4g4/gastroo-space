export type SearchResultType = 'member' | 'booking' | 'menuItem' | 'ingredient' | 'guest' | 'promotion';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  meta?: string;
  raw: Record<string, unknown>;
}
