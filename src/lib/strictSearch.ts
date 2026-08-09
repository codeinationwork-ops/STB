import { Product } from '../types';

/**
 * Normalizes queries to handle common clothing terms, hyphens, and plurals.
 */
export function normalizeQuery(query: string): string {
  if (!query) return '';
  let cleaned = query.trim().toLowerCase();

  // Normalize T-Shirt & Tee variations to a single token 'tshirt'
  cleaned = cleaned.replace(/\b(t[\s\-]?shirts?|tees?)\b/gi, 'tshirt');

  return cleaned;
}

/**
 * Prepares product text fields for strict keyword scanning.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  let cleaned = text.toLowerCase();

  // Convert "t-shirt", "t shirt", "t-shirts", "tee", "tees" in product text to "tshirt"
  cleaned = cleaned.replace(/\b(t[\s\-]?shirts?|tees?)\b/gi, 'tshirt');

  return cleaned;
}

/**
 * Strictly checks if a product matches ALL tokens in a search query using word boundaries (\b).
 * Matches across title/name, description, brand, category, and specs.
 */
export function strictKeywordMatch(
  productTitle: string,
  productDescription: string,
  searchQuery: string,
  extraProductText: string = ''
): boolean {
  if (!searchQuery || !searchQuery.trim()) return true;

  const normalizedQuery = normalizeQuery(searchQuery);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  if (queryTokens.length === 0) return true;

  const title = normalizeText(productTitle || '');
  const description = normalizeText(productDescription || '');
  const extra = normalizeText(extraProductText || '');
  const combinedText = `${title} ${description} ${extra}`;

  // STRICT CHECK: Every token in the query MUST exist as an exact word boundary in combinedText
  return queryTokens.every((token) => {
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedToken}\\b`, 'i');
    return regex.test(combinedText);
  });
}

/**
 * Strictly filters an array of products matching ALL query terms in title, description, or metadata.
 */
export function strictProductSearch(products: Product[], searchQuery: string): Product[] {
  if (!searchQuery || !searchQuery.trim()) return products;

  return products.filter((product) => {
    const title = product.name || (product as any).title || '';
    const description = product.description || '';
    const brand = product.brand || '';
    const category = product.category || '';
    const specs = (product.specs || []).map((s) => `${s.label} ${s.value}`).join(' ');

    const extraText = `${brand} ${category} ${specs}`;

    return strictKeywordMatch(title, description, searchQuery, extraText);
  });
}
