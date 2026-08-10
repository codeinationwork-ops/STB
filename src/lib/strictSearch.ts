import { Product } from '../types';

export const FEMALE_CLOTHING_REGEX = /\b(women|womens|women's|female|ladies|lady|girl|girls|woman|woman's|dress|dresses|skirt|skirts|saree|sari|sarees|saris|lehenga|lehengas|choli|dupatta|dupattas|bra|bras|bralette|crop-top|crop top|kurti|kurtis|gown|gowns|bikini|monokini|frock|frocks|blouse|blouses|heels|handbag|handbags|purse|purses|lingerie|kaftan|kaftans|chikankari|palazzo|palazzos|salwar|chaniya|wedges|stilettos|clutch|clutches|corset|corsets|camisole|cami|midi|maxi|maxis|bodycon|nighty|nightgown|babydoll|leggings|jeggings|shrug|shrugs|earrings|earring|necklace|lipstick|scrunchie|scrunchies|anarkali|sharara|gharara|halter|off-shoulder|tube top|peplum|push-up|stockings|hairband|tiara|jumpsuit|makeup)\b/i;

export const MALE_CLOTHING_REGEX = /\b(men|mens|men's|male|guys|guy|gents|gentleman|gentlemen|boy|boys|man|sherwani|boxer|boxers|trunks|briefs|tuxedo|chinos|kurta men|men kurta)\b/i;

/**
 * Classifies gender from product text (title, category, description, specs).
 */
export function classifyGenderFromText(text: string, currentGender?: string): 'Men' | 'Women' {
  const isFemale = FEMALE_CLOTHING_REGEX.test(text);
  const isMale = MALE_CLOTHING_REGEX.test(text);

  if (isFemale && !isMale) return 'Women';
  if (isMale && !isFemale) return 'Men';

  if (currentGender === 'Men' && !isFemale) return 'Men';
  if (currentGender === 'Women' && !isMale) return 'Women';

  if (isFemale) return 'Women';
  if (isMale) return 'Men';

  return 'Men';
}

/**
 * Strictly determines if a product belongs in the Men section.
 * GUARANTEES that female clothing/garments or female-targeted products are NEVER returned.
 */
export function isMaleProduct(p: Partial<Product> & { name?: string; title?: string; category?: string; description?: string; specs?: any[]; gender?: string }): boolean {
  if (!p) return false;
  const name = p.name || (p as any).title || '';
  const category = p.category || '';
  const description = p.description || '';
  const specsText = Array.isArray(p.specs) ? p.specs.map((s) => `${s.label} ${s.value}`).join(' ') : '';
  const text = `${name} ${category} ${description} ${specsText}`.toLowerCase();

  // 1. HARD EXCLUDE: Any female specific keywords or explicitly Women gender
  if (p.gender === 'Women' || FEMALE_CLOTHING_REGEX.test(text)) {
    return false;
  }

  // 2. If explicitly tagged as Men
  if (p.gender === 'Men') {
    return true;
  }

  // 3. Explicit Male keywords match in text
  if (MALE_CLOTHING_REGEX.test(text)) {
    return true;
  }

  // 4. Return true if no female terms are present (default non-female item to Men section)
  return true;
}

/**
 * Strictly determines if a product belongs in the Women section.
 */
export function isFemaleProduct(p: Partial<Product> & { name?: string; title?: string; category?: string; description?: string; specs?: any[]; gender?: string }): boolean {
  if (!p) return false;
  const name = p.name || (p as any).title || '';
  const category = p.category || '';
  const description = p.description || '';
  const specsText = Array.isArray(p.specs) ? p.specs.map((s) => `${s.label} ${s.value}`).join(' ') : '';
  const text = `${name} ${category} ${description} ${specsText}`.toLowerCase();

  const isMale = MALE_CLOTHING_REGEX.test(text);
  const isFemale = FEMALE_CLOTHING_REGEX.test(text);

  // 1. HARD EXCLUDE: Strictly male terms (without female terms) or explicitly Men gender
  if (p.gender === 'Men' || (isMale && !isFemale)) {
    return false;
  }

  // 2. If explicitly tagged as Women
  if (p.gender === 'Women') {
    return true;
  }

  // 3. Explicit Female keywords match
  if (isFemale) {
    return true;
  }

  return false;
}

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
