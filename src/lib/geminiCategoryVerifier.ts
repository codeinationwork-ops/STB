import { Product } from '../types';

export interface CategoryVerificationResult {
  id: string;
  isMatch: boolean;
  confidence: number;
  reasoning: string;
}

// In-memory cache for category verification results: `${productId}:::${category}` -> verification result
const verificationCache = new Map<string, CategoryVerificationResult>();

export const getAICachedVerification = (productId: string, category: string): CategoryVerificationResult | undefined => {
  if (!category || category === 'All') return undefined;
  const key = `${productId}:::${category.toLowerCase()}`;
  return verificationCache.get(key);
};

export const verifyProductsWithGeminiAI = async (
  category: string,
  products: Product[]
): Promise<Map<string, CategoryVerificationResult>> => {
  const resultMap = new Map<string, CategoryVerificationResult>();
  if (!category || category === 'All' || !products || products.length === 0) {
    return resultMap;
  }

  // Check cached items first
  const unverified = products.filter((p) => {
    const key = `${p.id}:::${category.toLowerCase()}`;
    if (verificationCache.has(key)) {
      resultMap.set(p.id, verificationCache.get(key)!);
      return false;
    }
    return true;
  });

  if (unverified.length === 0) {
    return resultMap;
  }

  try {
    const payload = {
      category,
      products: unverified.slice(0, 25).map((p) => ({
        id: p.id,
        name: p.name,
        title: p.name,
        description: p.description || '',
        category: p.category || '',
        specs: p.specs || []
      }))
    };

    const res = await fetch('/api/gemini/verify-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.verifications)) {
        data.verifications.forEach((v: CategoryVerificationResult) => {
          const key = `${v.id}:::${category.toLowerCase()}`;
          const itemRes: CategoryVerificationResult = {
            id: String(v.id),
            isMatch: Boolean(v.isMatch),
            confidence: typeof v.confidence === 'number' ? v.confidence : 0.9,
            reasoning: v.reasoning || `Gemini AI verified product fits ${category}.`
          };
          verificationCache.set(key, itemRes);
          resultMap.set(String(v.id), itemRes);
        });
      }
    }
  } catch (err) {
    console.warn('Gemini Category Verifier error:', err);
  }

  return resultMap;
};
