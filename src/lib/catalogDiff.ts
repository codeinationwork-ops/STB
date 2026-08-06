import { Product } from "../types";

export interface CatalogDiffResult {
  newProducts: Product[];
  updatedProducts: Product[];
  unchangedCount: number;
  priceChangesCount: number;
  stockChangesCount: number;
  totalChanges: number;
}

/**
 * Compares existing DB products with newly crawled products.
 * Identifies new items, price changes, and stock availability updates.
 */
export const calculateCatalogDiff = (
  existingProducts: Product[],
  newlyCrawledProducts: Product[]
): CatalogDiffResult => {
  // Map existing products by ID for O(1) fast lookup
  const existingMap = new Map<string, Product>();
  existingProducts.forEach((p) => {
    if (p.id) existingMap.set(p.id, p);
  });

  const newProducts: Product[] = [];
  const updatedProducts: Product[] = [];
  let unchangedCount = 0;
  let priceChangesCount = 0;
  let stockChangesCount = 0;

  newlyCrawledProducts.forEach((newProd) => {
    const existingProd = existingMap.get(newProd.id);

    if (!existingProd) {
      // Item does not exist in DB -> NEW PRODUCT
      newProducts.push(newProd);
    } else {
      // Item exists -> Check for differences
      const existingPrice = existingProd.directPrice ?? (existingProd as any).pricing?.direct_price ?? 0;
      const newPrice = newProd.directPrice ?? (newProd as any).pricing?.direct_price ?? 0;
      const priceChanged = Math.abs(existingPrice - newPrice) > 1;

      const existingInStock = (existingProd.stockLeft ?? 10) > 0;
      const newInStock = (newProd.stockLeft ?? 10) > 0;
      const stockChanged = existingInStock !== newInStock;

      const nameChanged = existingProd.name !== newProd.name;

      if (priceChanged || stockChanged || nameChanged) {
        if (priceChanged) priceChangesCount++;
        if (stockChanged) stockChangesCount++;

        // Merge updated fields while retaining existing metadata
        updatedProducts.push({
          ...existingProd,
          ...newProd,
          lastUpdated: new Date().toISOString(),
        });
      } else {
        unchangedCount++;
      }
    }
  });

  const totalChanges = newProducts.length + updatedProducts.length;

  return {
    newProducts,
    updatedProducts,
    unchangedCount,
    priceChangesCount,
    stockChangesCount,
    totalChanges,
  };
};
